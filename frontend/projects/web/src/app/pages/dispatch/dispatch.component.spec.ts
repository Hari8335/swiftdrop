import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DispatchComponent } from './dispatch.component';
import {
  AssignmentResult,
  CourierWorkloadItem,
  DispatchParcelSummary,
  UnassignedParcelsPage,
} from './dispatch.model';
import { DispatchService } from './dispatch.service';
import { DispatchPortalState } from './dispatch-portal.state';
import { DispatchNotificationsService } from './dispatch-notifications.service';

describe('DispatchComponent (Real API Integration)', () => {
  let component: DispatchComponent;
  let fixture: ComponentFixture<DispatchComponent>;
  let dispatchService: jasmine.SpyObj<DispatchService> | any;

  const mockParcels: DispatchParcelSummary[] = [
    {
      parcelId: 'pcl-101',
      trackingNumber: 'SD-20261028-001',
      status: 'CREATED',
      pickupZone: 'ZONE-COLOMBO-NORTH',
      dropoffZone: 'ZONE-COLOMBO-SOUTH',
      pickupAddress: '45 Galle Road, Colombo 03',
      dropoffAddress: '12 Havelock Road, Colombo 05',
      weightKg: 2.5,
      attemptCount: 0,
      failureReason: null,
      createdAt: '2026-10-25T10:00:00Z',
    },
    {
      parcelId: 'pcl-102',
      trackingNumber: 'SD-20261028-002',
      status: 'CREATED',
      pickupZone: 'ZONE-COLOMBO-NORTH',
      dropoffZone: 'ZONE-COLOMBO-NORTH',
      pickupAddress: '100 Union Place, Colombo 02',
      dropoffAddress: '88 Kandy Road, Kiribathgoda',
      weightKg: 1.2,
      attemptCount: 0,
      failureReason: null,
      createdAt: '2026-10-25T11:00:00Z',
    },
  ];

  const mockParcelsPage: UnassignedParcelsPage = {
    content: mockParcels,
    totalElements: 2,
    totalPages: 1,
    page: 0,
    size: 20,
  };

  const mockCouriers: CourierWorkloadItem[] = [
    {
      courierId: 'f8e7d6c5-b4a3-2109-8765-43210fedcba9',
      name: 'Saman Perera',
      phoneNumber: '+94771234567',
      zone: 'ZONE-COLOMBO-NORTH',
      activeCount: 2,
      available: true,
      vehicleType: 'MOTORCYCLE',
    },
    {
      courierId: 'a2b3c4d5-e6f7-4819-9012-34567890abcd',
      name: 'Kamal Silva',
      phoneNumber: '+94772345678',
      zone: 'ZONE-COLOMBO-SOUTH',
      activeCount: 1,
      available: false,
      vehicleType: 'VAN',
    },
  ];

  const mockFailedParcels: DispatchParcelSummary[] = [
    {
      parcelId: 'fail-101',
      trackingNumber: 'SD-FAIL-001',
      status: 'FAILED',
      pickupZone: 'ZONE-COLOMBO-NORTH',
      dropoffZone: 'ZONE-COLOMBO-SOUTH',
      pickupAddress: '10 Main St, Colombo 03',
      dropoffAddress: '20 Hill St, Colombo 05',
      attemptCount: 1,
      failureReason: 'Customer not reachable',
      createdAt: '2026-10-25T10:00:00Z',
    },
  ];

  let dispatchServiceSpy: {
    loadUnassignedParcels: jest.Mock;
    loadCourierWorkload: jest.Mock;
    loadFailedParcels: jest.Mock;
    assignParcel: jest.Mock;
    bulkAssignParcels: jest.Mock;
    requeueParcel: jest.Mock;
    updateCourierAvailability: jest.Mock;
    unassignedParcels: any;
    couriers: any;
    availableCouriers: any;
    unassignedCount: any;
    availableCouriersCount: any;
    totalWorkloadActive: any;
    failedParcels: any;
    totalFailedCount: any;
    isLoadingParcels: any;
    isLoadingCouriers: any;
    isLoadingFailed: any;
    parcelsError: any;
    couriersError: any;
    failedError: any;
    users: any;
  };

  beforeEach(async () => {
    // Create signal functions
    const parcelsSignal = jest.fn(() => mockParcels);
    const couriersSignal = jest.fn(() => mockCouriers);
    const availableCouriersSignal = jest.fn(() => [mockCouriers[0]]);
    const unassignedCountSignal = jest.fn(() => mockParcels.length);
    const availableCouriersCountSignal = jest.fn(() => 1);
    const totalWorkloadActiveSignal = jest.fn(() => 3);
    const failedParcelsSignal = jest.fn(() => mockFailedParcels);
    const totalFailedCountSignal = jest.fn(() => mockFailedParcels.length);
    const isLoadingParcelsSignal = jest.fn(() => false);
    const isLoadingCouriersSignal = jest.fn(() => false);
    const isLoadingFailedSignal = jest.fn(() => false);
    const parcelsErrorSignal = jest.fn(() => null);
    const couriersErrorSignal = jest.fn(() => null);
    const failedErrorSignal = jest.fn(() => null);

    dispatchServiceSpy = {
      loadUnassignedParcels: jest.fn().mockReturnValue(of(mockParcelsPage)),
      loadCourierWorkload: jest.fn().mockReturnValue(of(mockCouriers)),
      loadFailedParcels: jest.fn().mockReturnValue(
        of({
          content: mockFailedParcels,
          totalElements: 1,
          totalPages: 1,
          page: 0,
          size: 20,
        })
      ),
      assignParcel: jest.fn().mockReturnValue(
        of({
          parcelId: 'pcl-101',
          courierId: 'f8e7d6c5-b4a3-2109-8765-43210fedcba9',
          assignedAt: '2026-10-25T12:00:00Z',
          status: 'ASSIGNED',
        } as AssignmentResult)
      ),
      bulkAssignParcels: jest.fn().mockReturnValue(
        of({
          totalRequested: 2,
          successfulCount: 2,
          failedCount: 0,
          results: [
            { parcelId: 'pcl-101', courierId: 'c1', success: true },
            { parcelId: 'pcl-102', courierId: 'c1', success: true },
          ],
        })
      ),
      requeueParcel: jest.fn().mockReturnValue(
        of({
          parcelId: 'fail-101',
          status: 'CREATED',
          attemptCount: 2,
          requeuedAt: '2026-10-25T15:00:00Z',
        })
      ),
      updateCourierAvailability: jest.fn().mockReturnValue(
        of({
          ...mockCouriers[0],
          available: false,
        } as CourierWorkloadItem)
      ),
      unassignedParcels: parcelsSignal,
      couriers: couriersSignal,
      availableCouriers: availableCouriersSignal,
      unassignedCount: unassignedCountSignal,
      availableCouriersCount: availableCouriersCountSignal,
      totalWorkloadActive: totalWorkloadActiveSignal,
      failedParcels: failedParcelsSignal,
      totalFailedCount: totalFailedCountSignal,
      isLoadingParcels: isLoadingParcelsSignal,
      isLoadingCouriers: isLoadingCouriersSignal,
      isLoadingFailed: isLoadingFailedSignal,
      parcelsError: parcelsErrorSignal,
      couriersError: couriersErrorSignal,
      failedError: failedErrorSignal,
      listZones: jest.fn().mockReturnValue(of([])),
      getZones: jest.fn().mockReturnValue(of([])),
      users: jest.fn(() => []),
    };

    await TestBed.configureTestingModule({
      imports: [DispatchComponent, FormsModule],
      providers: [
        { provide: DispatchService, useValue: dispatchServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DispatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create without its own sidebar (navigation lives in DispatchLayoutComponent)', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside')).toBeNull();
    expect(compiled.querySelector('#tab-queue-link')).toBeNull();
  });

  it.each(['queue', 'failed'] as const)('shows %s parcel details as a minimal label/value list', (tab) => {
    component.activeTab.set(tab);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('dl')!.closest('div.rounded-2xl') as HTMLElement;
    const labels = Array.from(card.querySelectorAll('dt')).map((d) => d.textContent?.trim());
    expect(labels).toEqual(expect.arrayContaining(['Route', 'Pickup', 'Drop-off']));
    if (tab === 'failed') expect(labels[0]).toBe('Reason');
    expect(card.innerHTML).not.toMatch(/(emerald|amber|rose)-\d/);
  });

  it('colours the status dot yellow for unassigned and red for failed parcels', () => {
    component.activeTab.set('queue');
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bg-yellow-400')?.parentElement?.textContent).toContain('Unassigned');

    component.activeTab.set('failed');
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bg-red-600')?.parentElement?.textContent).toContain('Failed');
  });

  it('lets the dispatcher search couriers in the assign dialog', () => {
    (dispatchServiceSpy.couriers as any).mockReturnValue([
      { courierId: 'c1', name: 'Saman Perera', phoneNumber: '+94770000001', zone: 'Colombo', activeCount: 1, available: true, vehicleType: 'VAN' },
      { courierId: 'c2', name: 'Kasun Rathnayake', phoneNumber: '+94770000002', zone: 'Kandy', activeCount: 0, available: true },
    ]);
    component.courierSearch.set('leftover');
    component.openAssignModal({ parcelId: 'p1', trackingNumber: 'SD-1', status: 'CREATED', pickupZone: 'Colombo', dropoffZone: 'Kandy', createdAt: '' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#assign-courier-search')).toBeTruthy();
    expect(component.courierSearch()).toBe('');
    expect(component.assignCourierOptions().map((c) => c.courierId)).toEqual(['c1', 'c2']);

    component.courierSearch.set('kandy');
    expect(component.assignCourierOptions().map((c) => c.courierId)).toEqual(['c2']);
    component.courierSearch.set('0001');
    expect(component.assignCourierOptions().map((c) => c.courierId)).toEqual(['c1']);

    component.courierSearch.set('nobody');
    fixture.detectChanges();
    expect(compiled.querySelector('#assign-courier-no-match')).toBeTruthy();
  });

  it.each(['queue', 'workload', 'failed'] as const)('has no Refresh button on the %s page', (tab) => {
    component.activeTab.set(tab);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector(`#refresh-${tab}-btn`)).toBeNull();
    const labels = Array.from(compiled.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels).not.toContain('Refresh');
  });

  it('should render interactive delivery zones and pricing rules buttons on home page', () => {
    component.activeTab.set('home');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#home-delivery-zones-btn')).toBeTruthy();
    expect(compiled.querySelector('#home-pricing-rules-btn')).toBeTruthy();
    expect(compiled.querySelector('#home-online-couriers-btn')).toBeTruthy();
    expect(compiled.querySelector('#home-active-load-btn')).toBeTruthy();
    expect(compiled.querySelector('#home-failed-parcels-btn')).toBeTruthy();
  });

  it('should call loadUnassignedParcels, loadCourierWorkload, and loadFailedParcels on initialization', () => {
    expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenCalled();
    expect(dispatchServiceSpy.loadCourierWorkload).toHaveBeenCalled();
    expect(dispatchServiceSpy.loadFailedParcels).toHaveBeenCalled();
  });

  it('should switch tabs when clicking tab buttons', () => {
    component.activeTab.set('workload');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('workload');

    component.activeTab.set('queue');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('queue');
  });

  it('should select workload tab when route has query param tab=workload', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?tab=workload');

    const queryFixture = TestBed.createComponent(DispatchComponent);
    const queryComponent = queryFixture.componentInstance;
    queryFixture.detectChanges();

    expect(queryComponent.activeTab()).toBe('workload');
  });

  it('should default activeTab to queue when query param tab is missing or invalid', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?tab=other-tab');

    const queryFixture = TestBed.createComponent(DispatchComponent);
    const queryComponent = queryFixture.componentInstance;
    queryFixture.detectChanges();

    expect(queryComponent.activeTab()).toBe('queue');
  });

  it('should filter unassigned parcels by search query', () => {
    component.searchQuery.set('Kiribathgoda');
    let filtered = component.filteredParcels();
    expect(filtered.length).toBe(1);
    expect(filtered[0].dropoffAddress).toContain('Kiribathgoda');

    component.searchQuery.set('SD-20261028-001');
    filtered = component.filteredParcels();
    expect(filtered.length).toBe(1);
    expect(filtered[0].trackingNumber).toBe('SD-20261028-001');

    component.searchQuery.set('XYZ99999');
    filtered = component.filteredParcels();
    expect(filtered.length).toBe(0);

    component.searchQuery.set('');
    filtered = component.filteredParcels();
    expect(filtered.length).toBe(2);
  });

  it('should trigger reload when zone filter changes in queue', () => {
    dispatchServiceSpy.loadUnassignedParcels.mockClear();
    component.onQueueZoneChange('ZONE-COLOMBO-NORTH');
    expect(component.selectedZone()).toBe('ZONE-COLOMBO-NORTH');
    expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenCalledWith('ZONE-COLOMBO-NORTH', undefined, 0, 100);
  });

  describe('queue booking date filter', () => {
    const root = () => fixture.nativeElement as HTMLElement;
    const pickDate = (value: string) => {
      const input = root().querySelector<HTMLInputElement>('#queue-date-filter')!;
      input.value = value;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    beforeEach(() => {
      component.activeTab.set('queue');
      fixture.detectChanges();
      dispatchServiceSpy.loadUnassignedParcels.mockClear();
    });

    it('reloads the queue for the picked booking date', () => {
      pickDate('2026-11-20');

      expect(component.selectedDate()).toBe('2026-11-20');
      expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenLastCalledWith(undefined, '2026-11-20', 0, 100);
    });

    it('combines the date with the zone filter', () => {
      component.onQueueZoneChange('ZONE-COLOMBO-NORTH');
      pickDate('2026-11-20');

      expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenLastCalledWith('ZONE-COLOMBO-NORTH', '2026-11-20', 0, 100);
    });

    it('keeps the date on the periodic refresh', () => {
      pickDate('2026-11-20');
      dispatchServiceSpy.loadUnassignedParcels.mockClear();

      component.performPeriodicSync();

      expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenCalledWith(undefined, '2026-11-20', 0, 100);
    });

    it('clears the selection when the date changes, since the visible parcels change', () => {
      component.selectedParcelIds.set(new Set(['p-1']));

      pickDate('2026-11-20');

      expect(component.selectedParcelIds().size).toBe(0);
    });

    it('the clear button removes the date and reloads every date', () => {
      expect(root().querySelector('#queue-date-clear')).toBeNull();
      pickDate('2026-11-20');

      root().querySelector<HTMLButtonElement>('#queue-date-clear')!.click();
      fixture.detectChanges();

      expect(component.selectedDate()).toBe('');
      expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenLastCalledWith(undefined, undefined, 0, 100);
      expect(root().querySelector('#queue-date-clear')).toBeNull();
    });
  });

  const westernAndCentralZones = () => [
    { id: 'z1', name: 'E2E western', districts: ['Colombo', 'Gampaha'], served: true, baseFeeLkr: 350, createdAt: '', updatedAt: '' },
    { id: 'z2', name: 'E2E central', districts: ['Kandy'], served: true, baseFeeLkr: 450, createdAt: '', updatedAt: '' },
  ];

  it('should filter parcels by real zone name and resolve backend district', () => {
    component.availableZones.set([
      {
        id: 'z1',
        name: 'E2E western',
        districts: ['Colombo'],
        served: true,
        baseFeeLkr: 350,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'z2',
        name: 'E2E central',
        districts: ['Kandy'],
        served: true,
        baseFeeLkr: 450,
        createdAt: '',
        updatedAt: '',
      },
    ]);

    // Configured zones are filtered client-side across all their districts, so the backend
    // gets no single-district zone param; unknown values are passed through unchanged.
    expect(component.resolveBackendDistrict('E2E western')).toBeUndefined();
    expect(component.resolveBackendDistrict('e2e CENTRAL')).toBeUndefined();
    expect(component.resolveBackendDistrict('ZONE-COLOMBO-NORTH')).toBe('ZONE-COLOMBO-NORTH');
    expect(component.resolveBackendDistrict('')).toBeUndefined();

    dispatchServiceSpy.loadUnassignedParcels.mockClear();
    component.onQueueZoneChange('E2E western');
    expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenCalledWith(undefined, undefined, 0, 100);
  });

  it('should match every district of a multi-district zone and nothing outside it', () => {
    component.availableZones.set(westernAndCentralZones());
    const parcel = (id: string, dropoffZone: string): DispatchParcelSummary => ({
      parcelId: id, trackingNumber: id, status: 'CREATED', pickupZone: 'Colombo', dropoffZone, createdAt: '',
    });
    (dispatchServiceSpy.unassignedParcels as any).mockReturnValue([
      parcel('A', 'Colombo'), parcel('B', 'Gampaha'), parcel('C', 'Kandy'), parcel('D', 'Galle'),
    ]);

    component.selectedZone.set('E2E western');
    expect(component.filteredParcels().map((p) => p.trackingNumber)).toEqual(['A', 'B']);

    component.selectedZone.set('E2E central');
    expect(component.filteredParcels().map((p) => p.trackingNumber)).toEqual(['C']);
  });

  it('should use zones from the zones API only, with no hard-coded fallback', () => {
    dispatchServiceSpy.listZones.mockReturnValue(of(westernAndCentralZones()));
    component.loadAvailableZones();
    expect(component.availableZones().map((z) => z.name)).toEqual(['E2E western', 'E2E central']);

    dispatchServiceSpy.listZones.mockReturnValue(throwError(() => new Error('down')));
    component.loadAvailableZones();
    expect(component.availableZones()).toEqual([]);
  });

  it('should clear a zone filter whose zone was deleted on the zones page', () => {
    component.availableZones.set(westernAndCentralZones());
    component.selectedZone.set('E2E central');
    dispatchServiceSpy.listZones.mockReturnValue(of([westernAndCentralZones()[0]]));
    component.loadAvailableZones();
    expect(component.selectedZone()).toBe('');
  });

  it('should share search text with the portal header for the matching page', () => {
    const portal = TestBed.inject(DispatchPortalState);
    portal.page.set('failed');
    portal.setQuery('RECIPIENT');
    expect(component.failedSearchQuery()).toBe('RECIPIENT');
    expect(component.searchQuery()).toBe('');

    component.searchQuery.set('Kandy');
    portal.page.set('queue');
    expect(portal.query()).toBe('Kandy');
  });

  it('should search couriers on the workload page', () => {
    (dispatchServiceSpy.couriers as any).mockReturnValue([
      { courierId: 'c1', name: 'Saman Perera', zone: 'Colombo', activeCount: 1, available: true, vehicleType: 'VAN' },
      { courierId: 'c2', name: 'Kasun Rathnayake', zone: 'Kandy', activeCount: 0, available: false },
    ]);
    component.workloadSearchQuery.set('kasun');
    expect(component.filteredCouriers().map((c) => c.courierId)).toEqual(['c2']);
    component.workloadSearchQuery.set('van');
    expect(component.filteredCouriers().map((c) => c.courierId)).toEqual(['c1']);
  });

  it('should search across queue, failed and couriers on the home page and open a result', () => {
    component.homeSearchQuery.set('SD-20261028-001');
    expect(component.homeResults().queue.length).toBe(1);
    expect(component.homeResultCount()).toBeGreaterThanOrEqual(1);

    component.openSearchResult('queue', 'SD-20261028-001');
    expect(component.activeTab()).toBe('queue');
    expect(component.searchQuery()).toBe('SD-20261028-001');
  });

  it('should filter parcels appropriately between Colombo and Kandy dropoff destinations', () => {
    const colomboParcel: DispatchParcelSummary = {
      parcelId: 'p-col',
      trackingNumber: 'SD-COL-001',
      status: 'CREATED',
      pickupZone: 'Colombo',
      dropoffZone: 'Colombo',
      createdAt: '',
    };
    const kandyParcel: DispatchParcelSummary = {
      parcelId: 'p-kan',
      trackingNumber: 'SD-20261116-KAN001',
      status: 'CREATED',
      pickupZone: 'Colombo',
      dropoffZone: 'Kandy',
      createdAt: '',
    };

    (dispatchServiceSpy.unassignedParcels as any).mockReturnValue([colomboParcel, kandyParcel]);
    component.availableZones.set(westernAndCentralZones());

    component.selectedZone.set('E2E western');
    let filtered = component.filteredParcels();
    expect(filtered.length).toBe(1);
    expect(filtered[0].trackingNumber).toBe('SD-COL-001');

    component.selectedZone.set('E2E central');
    filtered = component.filteredParcels();
    expect(filtered.length).toBe(1);
    expect(filtered[0].trackingNumber).toBe('SD-20261116-KAN001');

    component.selectedZone.set('');
    filtered = component.filteredParcels();
    expect(filtered.length).toBe(2);
  });

  it('should open assign modal and confirm parcel assignment via real API', () => {
    const parcel = mockParcels[0];
    component.openAssignModal(parcel);
    fixture.detectChanges();

    expect(component.selectedParcelForAssign()).toEqual(parcel);
    expect(component.selectedCourierId()).toBe(mockCouriers[0].courierId);

    component.confirmAssignment();
    fixture.detectChanges();

    expect(dispatchServiceSpy.assignParcel).toHaveBeenCalledWith(
      parcel.parcelId,
      mockCouriers[0].courierId
    );
    expect(component.selectedParcelForAssign()).toBeNull();
    expect(component.toastMessage()).toContain('Assignment accepted for parcel SD-20261028-001');
    expect(component.toastType()).toBe('success');
  });

  it('should prevent duplicate assignment submissions when already submitting', () => {
    const parcel = mockParcels[0];
    component.openAssignModal(parcel);
    component.isSubmittingAssignment.set(true);

    component.confirmAssignment();

    expect(dispatchServiceSpy.assignParcel).not.toHaveBeenCalled();
  });

  it('should handle 409 Conflict error on assign and trigger queue refresh', () => {
    dispatchServiceSpy.assignParcel.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Parcel has already been assigned to another courier.' },
      }))
    );
    dispatchServiceSpy.loadUnassignedParcels.mockClear();

    const parcel = mockParcels[0];
    component.openAssignModal(parcel);
    component.confirmAssignment();
    fixture.detectChanges();

    expect(component.isSubmittingAssignment()).toBe(false);
    expect(component.toastType()).toBe('error');
    expect(component.toastMessage()).toContain('already been assigned');
    expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenCalled();
    expect(dispatchServiceSpy.loadCourierWorkload).toHaveBeenCalled();
  });

  it('should toggle courier availability via API', () => {
    const courier = mockCouriers[0];
    component.toggleCourierAvailability(courier);
    fixture.detectChanges();

    expect(dispatchServiceSpy.updateCourierAvailability).toHaveBeenCalledWith(
      courier.courierId,
      false
    );
    expect(component.toastMessage()).toContain('is now Offline');
  });

  it('should show a retry state and an error toast when queue loading fails', () => {
    dispatchServiceSpy.parcelsError = jest.fn(() => 'Network Error');
    // Fresh component so its load-error effect starts out seeing the failure.
    fixture = TestBed.createComponent(DispatchComponent);
    component = fixture.componentInstance;
    component.activeTab.set('queue');
    fixture.detectChanges();
    TestBed.flushEffects();

    const compiled = fixture.nativeElement as HTMLElement;
    const retryBtn = compiled.querySelector('#retry-queue-btn');
    expect(retryBtn).toBeTruthy();
    expect(compiled.textContent).not.toContain('Network Error');
    const toasts = TestBed.inject(DispatchNotificationsService).toasts();
    expect(toasts.at(-1)).toMatchObject({ kind: 'error', title: "Couldn't load the unassigned queue", message: 'Network Error' });

    dispatchServiceSpy.loadUnassignedParcels.mockClear();
    (retryBtn as HTMLButtonElement).click();

    expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenCalled();
  });

  it('should display loading spinner when loading parcels', () => {
    component.activeTab.set('queue');
    dispatchServiceSpy.isLoadingParcels = jest.fn(() => true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading unassigned dispatch queue...');
  });

  describe('Feature A & B: Failed Parcel List & Re-queue', () => {
    it('should switch to failed tab when clicking failed tab button', () => {
      component.activeTab.set('failed');
      fixture.detectChanges();
      expect(component.activeTab()).toBe('failed');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#failed-search-input')).toBeTruthy();
      expect(compiled.querySelector('#failed-zone-filter')).toBeTruthy();
    });

    it('should select failed tab when route has query param tab=failed', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/?tab=failed');

      const queryFixture = TestBed.createComponent(DispatchComponent);
      const queryComponent = queryFixture.componentInstance;
      queryFixture.detectChanges();

      expect(queryComponent.activeTab()).toBe('failed');
    });

    it('should filter failed parcels by search query', () => {
      component.failedSearchQuery.set('reachable');
      const filtered = component.filteredFailedParcels();
      expect(filtered.length).toBe(1);
      expect(filtered[0].trackingNumber).toBe('SD-FAIL-001');

      component.failedSearchQuery.set('nonexistent-query');
      expect(component.filteredFailedParcels().length).toBe(0);
    });

    it('should trigger reload when zone filter changes in failed deliveries tab', () => {
      dispatchServiceSpy.loadFailedParcels.mockClear();
      component.onFailedZoneChange('ZONE-COLOMBO-NORTH');
      expect(component.failedSelectedZone()).toBe('ZONE-COLOMBO-NORTH');
      expect(dispatchServiceSpy.loadFailedParcels).toHaveBeenCalledWith('ZONE-COLOMBO-NORTH', undefined, 0, 100);
    });

    it('should open re-queue modal, accept optional reason, and confirm re-queue via API', () => {
      const failedParcel = mockFailedParcels[0];
      component.openRequeueModal(failedParcel);
      fixture.detectChanges();

      expect(component.selectedParcelForRequeue()).toEqual(failedParcel);
      expect(component.requeueReason()).toBe('');

      component.requeueReason.set('Customer requested redelivery tomorrow');
      component.confirmRequeue();
      fixture.detectChanges();

      expect(dispatchServiceSpy.requeueParcel).toHaveBeenCalledWith(
        failedParcel.parcelId,
        'Customer requested redelivery tomorrow'
      );
      expect(component.selectedParcelForRequeue()).toBeNull();
      expect(component.toastMessage()).toContain('successfully re-queued to CREATED (Attempt #2)!');
      expect(component.toastType()).toBe('success');
    });

    it('should handle re-queue API errors gracefully and refresh failed queue on conflict', () => {
      dispatchServiceSpy.requeueParcel.mockReturnValue(
        throwError(() => ({
          status: 400,
          error: { message: 'Parcel is not in FAILED status' },
        }))
      );
      dispatchServiceSpy.loadFailedParcels.mockClear();

      const failedParcel = mockFailedParcels[0];
      component.openRequeueModal(failedParcel);
      component.confirmRequeue();
      fixture.detectChanges();

      expect(component.isSubmittingRequeue()).toBe(false);
      expect(component.toastType()).toBe('error');
      expect(component.toastMessage()).toContain('Parcel is not in FAILED status');
      expect(dispatchServiceSpy.loadFailedParcels).toHaveBeenCalled();
    });
  });

  describe('Feature C: Bulk Assignment', () => {
    it('should toggle individual parcel selection', () => {
      const p1 = mockParcels[0].parcelId;
      expect(component.isParcelSelected(p1)).toBe(false);

      component.toggleSelectParcel(p1);
      expect(component.isParcelSelected(p1)).toBe(true);

      component.toggleSelectParcel(p1);
      expect(component.isParcelSelected(p1)).toBe(false);
    });

    it('should toggle select all and clear selection', () => {
      expect(component.isAllSelected()).toBe(false);

      component.toggleSelectAll();
      expect(component.selectedParcelIds().size).toBe(mockParcels.length);
      expect(component.isAllSelected()).toBe(true);

      component.toggleSelectAll();
      expect(component.selectedParcelIds().size).toBe(0);
      expect(component.isAllSelected()).toBe(false);
    });

    it('should submit bulk assignment and display outcome modal', () => {
      const p1 = mockParcels[0].parcelId;
      const p2 = mockParcels[1].parcelId;
      component.toggleSelectParcel(p1);
      component.toggleSelectParcel(p2);
      component.bulkCourierId.set('c1');

      component.submitBulkAssign();
      fixture.detectChanges();

      expect(dispatchServiceSpy.bulkAssignParcels).toHaveBeenCalledWith([
        { parcelId: p1, courierId: 'c1' },
        { parcelId: p2, courierId: 'c1' },
      ]);
      expect(component.bulkResult()).toBeTruthy();
      expect(component.bulkResult()?.successfulCount).toBe(2);
      expect(component.selectedParcelIds().size).toBe(0);
      expect(component.toastType()).toBe('success');
    });

    it('should handle bulk assignment API failure', () => {
      dispatchServiceSpy.bulkAssignParcels.mockReturnValue(
        throwError(() => ({ error: { message: 'Bulk assignment network timeout' } }))
      );

      component.toggleSelectParcel(mockParcels[0].parcelId);
      component.bulkCourierId.set('c1');
      component.submitBulkAssign();
      fixture.detectChanges();

      expect(component.isSubmittingBulk()).toBe(false);
      expect(component.toastType()).toBe('error');
      expect(component.toastMessage()).toContain('Bulk assignment network timeout');
    });
  });

  describe('Real-Time Queue Polling Lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start polling on init and refresh active tab data periodically', () => {
      component.startLiveQueuePolling();
      dispatchServiceSpy.loadUnassignedParcels.mockClear();
      dispatchServiceSpy.loadCourierWorkload.mockClear();
      dispatchServiceSpy.loadFailedParcels.mockClear();

      component.activeTab.set('queue');
      jest.advanceTimersByTime(10000);

      expect(dispatchServiceSpy.loadUnassignedParcels).toHaveBeenCalled();
    });

    it('should refresh workload tab data when active tab is workload', () => {
      dispatchServiceSpy.loadCourierWorkload.mockClear();

      component.activeTab.set('workload');
      component.performPeriodicSync();

      expect(dispatchServiceSpy.loadCourierWorkload).toHaveBeenCalled();
    });

    it('should refresh failed tab data when active tab is failed', () => {
      dispatchServiceSpy.loadFailedParcels.mockClear();

      component.activeTab.set('failed');
      component.performPeriodicSync();

      expect(dispatchServiceSpy.loadFailedParcels).toHaveBeenCalled();
    });

    it('should avoid overlapping sync requests if already loading', () => {
      dispatchServiceSpy.loadUnassignedParcels.mockClear();
      dispatchServiceSpy.isLoadingParcels = jest.fn(() => true);

      component.activeTab.set('queue');
      component.performPeriodicSync();

      expect(dispatchServiceSpy.loadUnassignedParcels).not.toHaveBeenCalled();
    });

    it('should stop polling on component destroy', () => {
      component.startLiveQueuePolling();
      expect((component as any).pollIntervalId).not.toBeNull();

      component.ngOnDestroy();
      expect((component as any).pollIntervalId).toBeNull();
    });
  });
});
