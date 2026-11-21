import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CustomerComponent } from './customer.component';
import { CustomerAddress, CustomerParcel, QuoteResponse } from './customer/customer.model';
import { CustomerService } from './customer/customer.service';

describe('CustomerComponent', () => {
  let component: CustomerComponent;
  let fixture: ComponentFixture<CustomerComponent>;
  let customerService: CustomerService;

  const mockQuote: QuoteResponse = {
    currency: 'LKR',
    totalFee: 850.0,
    breakdown: {
      dropoffZoneBaseFee: 350.0,
      weightBandCharge: 250.0,
      sizeCharge: 250.0,
    },
    pickupZone: 'Western',
    dropoffZone: 'Central',
  };

  const mockCreatedParcel: CustomerParcel = {
    id: 'pcl-real-uuid-1234',
    trackingNumber: 'SD-20261105-H7K9N2',
    status: 'CREATED',
    pickupAddress: {
      line1: '142 Havelock Road',
      city: 'Colombo 05',
      district: 'Colombo',
      postalCode: '00500',
    },
    dropoffAddress: {
      line1: '88 Kandy Road',
      city: 'Kadugannawa',
      district: 'Kandy',
      postalCode: '20300',
    },
    weightKg: 2.5,
    size: 'MEDIUM',
    fee: 850.0,
    attemptCount: 0,
    recipientName: 'Kamal Silva',
    recipientPhone: '+94771234567',
    notes: 'Please ring bell',
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerComponent],
      providers: [
        CustomerService,
        provideRouter([{ path: 'customer', component: CustomerComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerComponent);
    component = fixture.componentInstance;
    customerService = TestBed.inject(CustomerService);

    const addresses: CustomerAddress[] = [{
      id: 'address-1',
      customerId: 'customer-1',
      label: 'Home',
      line1: '142 Havelock Road',
      line2: null,
      city: 'Colombo 05',
      district: 'Colombo',
      postalCode: '00500',
      isDefault: true,
    }];
    const deliveredParcel = { ...mockCreatedParcel, id: 'delivered-1', status: 'DELIVERED' as const };
    const parcels = [mockCreatedParcel, deliveredParcel];
    jest.spyOn(customerService, 'listAddresses').mockImplementation(() => of([...addresses]));
    jest.spyOn(customerService, 'listParcels').mockImplementation((status) =>
      of({
        content: status === 'DELIVERED' ? [deliveredParcel] : [...parcels],
        totalElements: status === 'DELIVERED' ? 1 : parcels.length,
        totalPages: 1,
        page: 0,
        size: 20,
      })
    );
    jest.spyOn(customerService, 'createAddress').mockImplementation((request) => {
      const saved = { ...request, id: 'address-new', customerId: 'customer-1' };
      addresses.push(saved);
      return of(saved);
    });
    jest.spyOn(customerService, 'setDefaultAddress').mockReturnValue(of(addresses[0]));
    jest.spyOn(customerService, 'deleteAddress').mockImplementation((id) => {
      const index = addresses.findIndex((address) => address.id === id);
      addresses.splice(index, 1);
      return of(undefined);
    });
    jest.spyOn(customerService, 'cancelParcel').mockImplementation((id) => {
      const index = parcels.findIndex((parcel) => parcel.id === id);
      const cancelled = { ...parcels[index], status: 'CANCELLED' as const };
      parcels[index] = cancelled;
      return of(cancelled);
    });

    // Spy on getFeeQuote and createParcel by default
    jest.spyOn(customerService, 'getFeeQuote').mockReturnValue(of(mockQuote));
    jest.spyOn(customerService, 'createParcel').mockReturnValue(of(mockCreatedParcel));

    fixture.detectChanges();
  });

  it('should create the customer component', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial parcels and addresses', fakeAsync(() => {
    tick(100);
    expect(component.parcels().length).toBeGreaterThan(0);
    expect(component.addresses().length).toBeGreaterThan(0);
  }));

  it('should switch tabs between deliveries, wizard, and addresses', () => {
    expect(component.activeTab()).toBe('deliveries');

    component.activeTab.set('wizard');
    expect(component.activeTab()).toBe('wizard');

    component.activeTab.set('addresses');
    expect(component.activeTab()).toBe('addresses');
  });

  it('should filter parcels by status', fakeAsync(() => {
    component.selectedStatusFilter.set('DELIVERED');
    component.loadParcels();
    tick(100);

    expect(component.parcels().every((p) => p.status === 'DELIVERED')).toBe(true);
  }));

  it('should retain parcel pagination and request the selected page', fakeAsync(() => {
    const listParcels = customerService.listParcels as jest.Mock;
    listParcels.mockImplementation((status: string | undefined, page = 0) => of({
      content: page === 0 ? [mockCreatedParcel] : [],
      totalElements: 21,
      totalPages: 2,
      page,
      size: 20,
    }));

    component.loadParcels();
    tick(100);
    expect(component.parcelPage().totalElements).toBe(21);
    expect(component.parcelPage().totalPages).toBe(2);

    component.changeParcelPage(1);
    tick(100);
    expect(listParcels).toHaveBeenLastCalledWith(undefined, 1);
    expect(component.parcelPage().page).toBe(1);
    expect(component.parcels()).toEqual([]);
  }));

  it('should navigate through wizard steps with validation and real fee quote integration', fakeAsync(() => {
    component.startNewDelivery();
    expect(component.wizardStep()).toBe(1);
    expect(component.isStep1Valid()).toBe(true);

    component.goToStep(2);
    expect(component.wizardStep()).toBe(2);
    expect(component.isStep2Valid()).toBe(true);

    component.goToStep(3);
    expect(component.wizardStep()).toBe(3);
    tick(50);

    expect(customerService.getFeeQuote).toHaveBeenCalledWith('Colombo', 'Kandy', 2.5, 'MEDIUM');
    expect(component.feePreview()).toBeTruthy();
    expect(component.feePreview()?.totalFee).toBe(850.0);
    expect(component.feePreview()?.breakdown.dropoffZoneBaseFee).toBe(350.0);
    expect(component.feePreview()?.currency).toBe('LKR');

    // Update wizard inputs and verify fee quote re-calculates
    component.wizardData.pickupAddress.district = 'Colombo';
    component.wizardData.dropoffAddress.district = 'Galle';
    component.wizardData.size = 'LARGE';
    component.wizardData.weightKg = 4.0;
    component.updateFeePreview();
    tick(50);

    expect(customerService.getFeeQuote).toHaveBeenCalledWith('Colombo', 'Galle', 4.0, 'LARGE');
  }));

  it('should handle fee quote failure with error state and retry option', fakeAsync(() => {
    jest.spyOn(customerService, 'getFeeQuote').mockReturnValue(
      throwError(() => ({ error: { message: 'Pickup district is not served' }, status: 422 }))
    );

    component.updateFeePreview();
    tick(50);

    expect(component.feePreview()).toBeNull();
    expect(component.isLoadingQuote()).toBe(false);
    expect(component.quoteError()).toContain('Pickup district is not served');

    // Retrying with valid mock quote recovers from error
    jest.spyOn(customerService, 'getFeeQuote').mockReturnValue(of(mockQuote));
    component.updateFeePreview();
    tick(50);

    expect(component.feePreview()).toBeTruthy();
    expect(component.quoteError()).toBeNull();
  }));

  it('shows why the parcel cannot be delivered and offers to change addresses (422)', fakeAsync(() => {
    const reason = "SwiftDrop doesn't deliver to Mullaitivu yet. Please choose a different drop-off district.";
    jest.spyOn(customerService, 'getFeeQuote').mockReturnValue(
      throwError(() => ({ error: { code: 'DROPOFF_DISTRICT_NOT_SERVED', message: reason }, status: 422 }))
    );
    component.startNewDelivery();
    component.goToStep(2);
    component.goToStep(3);
    tick(50);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(component.quoteErrorUnserved()).toBe(true);
    expect(el.querySelector('#quote-error-title')!.textContent).toContain("We can't deliver this parcel");
    expect(el.querySelector('#quote-error-message')!.textContent).toContain(reason);
    expect(el.textContent).not.toContain('Parcel not found');
    expect(el.querySelector('#retry-quote-btn')).toBeNull();

    el.querySelector<HTMLButtonElement>('#change-addresses-btn')!.click();
    expect(component.wizardStep()).toBe(1);
  }));

  it('keeps the retry option for temporary quote failures (503)', fakeAsync(() => {
    jest.spyOn(customerService, 'getFeeQuote').mockReturnValue(
      throwError(() => ({ error: { message: "Delivery pricing isn't set up right now. Please try again later." }, status: 503 }))
    );
    component.startNewDelivery();
    component.goToStep(2);
    component.goToStep(3);
    tick(50);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(component.quoteErrorUnserved()).toBe(false);
    expect(el.querySelector('#quote-error-title')!.textContent).toContain('Quote Calculation Notice');
    expect(el.querySelector('#retry-quote-btn')).not.toBeNull();
    expect(el.querySelector('#change-addresses-btn')).toBeNull();
  }));

  it('should quick-fill address from address book in wizard', fakeAsync(() => {
    tick(100);
    const firstAddr = component.addresses()[0];
    component.selectSavedAddress('pickup', firstAddr.id);

    expect(component.wizardData.pickupAddress.line1).toBe(firstAddr.line1);
    expect(component.wizardData.pickupAddress.district).toBe(firstAddr.district);
  }));

  it('should submit delivery order and receive confirmed tracking number and id', fakeAsync(() => {
    component.startNewDelivery();
    component.goToStep(4);
    tick(50);

    expect(component.orderConfirmed()).toBe(false);
    component.submitDeliveryOrder();
    tick(200);

    expect(customerService.createParcel).toHaveBeenCalledWith(component.wizardData);
    expect(component.orderConfirmed()).toBe(true);
    expect(component.confirmedParcel()).toBeTruthy();
    expect(component.confirmedParcel()?.id).toBe('pcl-real-uuid-1234');
    expect(component.confirmedParcel()?.trackingNumber).toBe('SD-20261105-H7K9N2');
    expect(component.notification()).toContain('booked successfully');
    expect(component.notification()).toContain('SD-20261105-H7K9N2');
  }));

  it('should handle parcel creation failure gracefully', fakeAsync(() => {
    jest.spyOn(customerService, 'createParcel').mockReturnValue(
      throwError(() => ({ error: { message: 'Validation failed on server' }, status: 400 }))
    );

    component.startNewDelivery();
    component.goToStep(4);
    tick(50);

    component.submitDeliveryOrder();
    tick(50);

    expect(component.orderConfirmed()).toBe(false);
    expect(component.isSubmitting()).toBe(false);
    expect(component.notification()).toContain('Validation failed on server');
  }));

  it('should cancel a CREATED parcel', fakeAsync(() => {
    tick(100);
    const createdParcel = component.parcels().find((p) => p.status === 'CREATED');
    if (createdParcel) {
      component.cancelParcel(createdParcel.id);
      tick(100);

      const target = component.parcels().find((p) => p.id === createdParcel.id);
      expect(target?.status).toBe('CANCELLED');
      expect(component.notification()).toContain('cancelled');
    }
  }));

  it('should open and dismiss cancel confirmation modal', fakeAsync(() => {
    tick(100);
    const createdParcel = component.parcels().find((p) => p.status === 'CREATED');
    expect(createdParcel).toBeTruthy();
    if (createdParcel) {
      component.openCancelModal(createdParcel);
      expect(component.parcelToCancel()).toEqual(createdParcel);

      fixture.detectChanges();
      const modalTracking = fixture.nativeElement.querySelector('[data-testid="cancel-modal-tracking-number"]');
      expect(modalTracking?.textContent).toContain(createdParcel.trackingNumber);

      component.closeCancelModal();
      expect(component.parcelToCancel()).toBeNull();
    }
  }));

  it('should cancel parcel upon confirmation in modal', fakeAsync(() => {
    tick(100);
    const createdParcel = component.parcels().find((p) => p.status === 'CREATED');
    expect(createdParcel).toBeTruthy();
    if (createdParcel) {
      component.openCancelModal(createdParcel);
      component.cancellationReason = 'Customer changed mind';
      component.confirmCancelParcel();
      tick(100);

      expect(component.parcelToCancel()).toBeNull();
      const target = component.parcels().find((p) => p.id === createdParcel.id);
      expect(target?.status).toBe('CANCELLED');
      expect(component.notification()).toContain('cancelled');
    }
  }));

  it('should open address modal from deliveries page Add Address button', () => {
    component.activeTab.set('deliveries');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('#hero-add-address-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(component.showAddressModal()).toBe(true);
  });

  it('should add a new address to address book', fakeAsync(() => {
    component.openAddressModal();
    expect(component.showAddressModal()).toBe(true);

    component.newAddressForm = {
      label: 'Beach Villa',
      line1: '40 Galle Road',
      line2: '',
      city: 'Bentota',
      district: 'Galle',
      postalCode: '80500',
      isDefault: false,
    };

    expect(component.isAddressFormValid()).toBe(true);
    component.saveNewAddress();
    tick(100);

    expect(component.showAddressModal()).toBe(false);
    expect(component.addresses().some((a) => a.label === 'Beach Villa')).toBe(true);
    expect(component.notification()).toContain('Beach Villa');
  }));

  it('should set an address as default', fakeAsync(() => {
    tick(100);
    component.setDefaultAddress('address-1');
    tick(100);

    expect(component.notification()).toContain('default address');
  }));

  it('should delete an address from address book', fakeAsync(() => {
    tick(100);
    const countBefore = component.addresses().length;
    const target = component.addresses()[0];

    component.deleteAddress(target.id);
    tick(100);

    expect(component.addresses().length).toBe(countBefore - 1);
    expect(component.addresses().some((a) => a.id === target.id)).toBe(false);
  }));

  it('should execute signOut without error', () => {
    expect(() => component.signOut()).not.toThrow();
  });

  describe('active deliveries summary', () => {
    const summaryText = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.hero-summary-card')!.textContent!.replace(/\s+/g, ' ');

    it('shows 0 and the "no active shipments" message when every parcel is cancelled or delivered', () => {
      component.parcels.set([
        { ...mockCreatedParcel, id: 'c1', status: 'CANCELLED' },
        { ...mockCreatedParcel, id: 'c2', status: 'CANCELLED' },
        { ...mockCreatedParcel, id: 'd1', status: 'DELIVERED' },
      ]);
      fixture.detectChanges();

      expect(component.activeDeliveriesCount()).toBe(0);
      expect(summaryText()).toContain('0 in delivery today');
      expect(summaryText()).toContain('No active shipments');
    });

    it('shows 0 when the customer has no parcels at all', () => {
      component.parcels.set([]);
      expect(component.activeDeliveriesCount()).toBe(0);
    });

    it('counts only parcels that are still moving', () => {
      component.parcels.set([
        { ...mockCreatedParcel, id: 'a', status: 'CREATED' },
        { ...mockCreatedParcel, id: 'b', status: 'PICKED_UP' },
        { ...mockCreatedParcel, id: 'c', status: 'IN_TRANSIT' },
        { ...mockCreatedParcel, id: 'd', status: 'OUT_FOR_DELIVERY' },
        { ...mockCreatedParcel, id: 'e', status: 'CANCELLED' },
        { ...mockCreatedParcel, id: 'f', status: 'DELIVERED' },
      ]);
      expect(component.activeDeliveriesCount()).toBe(4);
    });
  });

  it('logo keeps the customer signed in and returns to My Deliveries', () => {
    component.activeTab.set('settings');
    fixture.detectChanges();
    const logo = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('#customer-home-link')!;

    expect(logo.getAttribute('href')).toBe('/customer');
    logo.click();

    expect(component.activeTab()).toBe('deliveries');
  });

  describe('profile menu', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    it('clicking the name shows no dropdown menu', () => {
      fixture.detectChanges();
      const badge = el().querySelector<HTMLElement>('#profile-badge')!;
      expect(badge.textContent).toContain(component.customerName());

      badge.click();
      fixture.detectChanges();

      expect(el().querySelector('[role="menu"]')).toBeNull();
      expect(component.activeTab()).not.toBe('settings');
      expect(el().querySelector('#logout-confirm-modal')).toBeNull();
    });

    it('sidebar Settings opens the settings profile form', () => {
      fixture.detectChanges();

      el().querySelector<HTMLButtonElement>('#nav-settings-btn')!.click();
      fixture.detectChanges();

      expect(component.activeTab()).toBe('settings');
      expect(el().querySelector('#settings-panel')).not.toBeNull();
      expect(el().querySelector('#settings-profile-form')).not.toBeNull();
    });

    it('Security section changes the password inside the portal', () => {
      component.activeTab.set('settings');
      fixture.detectChanges();

      el().querySelector<HTMLButtonElement>('#settings-nav-security')!.click();
      fixture.detectChanges();

      expect(el().querySelector('#settings-profile-form')).toBeNull();
      expect(el().querySelector('#change-password')).not.toBeNull();
      expect(el().querySelector('a[href="/forgot-password"]')).toBeNull();
    });

    it('Manage address book in settings switches to the address book', () => {
      component.activeTab.set('settings');
      fixture.detectChanges();
      el().querySelector<HTMLButtonElement>('#settings-nav-addresses')!.click();
      fixture.detectChanges();

      el().querySelector<HTMLButtonElement>('#settings-addresses-btn')!.click();

      expect(component.activeTab()).toBe('addresses');
    });

    it('profile fields are read-only until Edit profile is clicked', () => {
      component.openSettings();
      fixture.detectChanges();
      const nameInput = () => el().querySelector<HTMLInputElement>('#edit-profile-fullname')!;

      expect(nameInput().readOnly).toBe(true);
      expect(el().querySelector('#save-profile-btn')).toBeNull();

      el().querySelector<HTMLButtonElement>('#customer-edit-profile-btn')!.click();
      fixture.detectChanges();

      expect(nameInput().readOnly).toBe(false);
      expect(el().querySelector('#save-profile-btn')).not.toBeNull();
      expect(el().querySelector('#customer-edit-profile-btn')).toBeNull();
    });

    it('Cancel discards unsaved profile edits and locks the form again', () => {
      component.openSettings();
      const savedName = component.editProfileFullName;
      fixture.detectChanges();
      el().querySelector<HTMLButtonElement>('#customer-edit-profile-btn')!.click();
      fixture.detectChanges();

      component.editProfileFullName = 'Someone Else';
      el().querySelector<HTMLButtonElement>('#cancel-profile-btn')!.click();
      fixture.detectChanges();

      expect(component.editProfileFullName).toBe(savedName);
      expect(el().querySelector<HTMLInputElement>('#edit-profile-fullname')!.readOnly).toBe(true);
    });

    it('sidebar Settings button opens the settings panel', () => {
      fixture.detectChanges();
      el().querySelector<HTMLButtonElement>('#nav-settings-btn')!.click();
      fixture.detectChanges();

      expect(component.activeTab()).toBe('settings');
      expect(el().querySelector('#settings-panel')).not.toBeNull();
      expect(el().querySelector('#nav-settings-btn')!.classList).toContain('rail-active');
    });

    it('settings menu no longer has a Sign out section', () => {
      component.openSettings();
      fixture.detectChanges();
      expect(el().querySelector('#settings-nav-session')).toBeNull();
      expect(el().querySelector('#settings-logout-btn')).toBeNull();
    });

    it('top bar shows "Signed in as" with the customer name and initials', () => {
      fixture.detectChanges();
      const badge = el().querySelector<HTMLElement>('#profile-badge')!;

      expect(badge.textContent).toContain('Signed in as');
      expect(el().querySelector('#profile-badge-name')!.textContent!.trim()).toBe(component.customerName() || 'Customer');
    });

    it('shows the notification bell in the top bar, not the sidebar', () => {
      fixture.detectChanges();

      expect(el().querySelector('#topbar-notifications app-notification-bell')).not.toBeNull();
      expect(el().querySelector('#customer-sidebar app-notification-bell')).toBeNull();
    });

    it('sidebar footer holds Settings and Log out, and is not hidden on mobile', () => {
      fixture.detectChanges();
      const footer = el().querySelector<HTMLElement>('#customer-sidebar-footer')!;

      expect(footer.classList).not.toContain('hidden');
      expect(footer.querySelector('#nav-settings-btn')).not.toBeNull();
      expect(footer.querySelector('#sidebar-logout-btn')).not.toBeNull();
    });

    it('sidebar Log out asks for confirmation before signing out', () => {
      fixture.detectChanges();
      const signOut = jest.spyOn(component, 'signOut');

      el().querySelector<HTMLButtonElement>('#sidebar-logout-btn')!.click();
      fixture.detectChanges();

      expect(signOut).not.toHaveBeenCalled();
      expect(el().querySelector('#logout-confirm-modal')).not.toBeNull();

      el().querySelector<HTMLButtonElement>('#logout-confirm-btn')!.click();
      fixture.detectChanges();

      expect(signOut).toHaveBeenCalled();
      expect(el().querySelector('#logout-confirm-modal')).toBeNull();
    });

    it('cancelling the logout confirmation keeps the customer signed in', () => {
      fixture.detectChanges();
      const signOut = jest.spyOn(component, 'signOut');

      el().querySelector<HTMLButtonElement>('#sidebar-logout-btn')!.click();
      fixture.detectChanges();
      el().querySelector<HTMLButtonElement>('#logout-cancel-btn')!.click();
      fixture.detectChanges();

      expect(signOut).not.toHaveBeenCalled();
      expect(el().querySelector('#logout-confirm-modal')).toBeNull();
    });

    it('opens the new delivery wizard when navigated with ?tab=wizard', async () => {
      await TestBed.inject(Router).navigateByUrl('/customer?tab=wizard');
      const wizardFixture = TestBed.createComponent(CustomerComponent);
      wizardFixture.componentInstance.ngOnInit();
      expect(wizardFixture.componentInstance.activeTab()).toBe('wizard');
    });

    it('opens the settings tab when navigated with ?tab=settings', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/customer?tab=settings');
      const settingsFixture = TestBed.createComponent(CustomerComponent);
      settingsFixture.componentInstance.ngOnInit();
      expect(settingsFixture.componentInstance.activeTab()).toBe('settings');
    });
  });
});
