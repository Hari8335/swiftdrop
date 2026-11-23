import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService, User } from 'shared-auth';
import { MerchantSettingsComponent } from './merchant-settings.component';

describe('MerchantSettingsComponent', () => {
  let fixture: ComponentFixture<MerchantSettingsComponent>;
  let component: MerchantSettingsComponent;
  let currentUser: WritableSignal<User | null>;
  let updateProfile: jest.Mock;

  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  async function create(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(MerchantSettingsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('businessName', 'Acme Stores (Pvt) Ltd');
    fixture.componentRef.setInput('status', 'APPROVED');
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    currentUser = signal<User | null>({
      id: 'user-1', role: 'MERCHANT', merchantId: 'merchant-1',
      fullName: 'Alice Perera', email: 'alice@acme.lk', phoneNumber: '+94771234567',
    });
    updateProfile = jest.fn().mockReturnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [MerchantSettingsComponent],
      providers: [{ provide: AuthService, useValue: { currentUser, updateProfile, forgotPassword: jest.fn() } }],
    }).compileComponents();
  });

  it('shows only the merchant-relevant sections: Personal information and Security', async () => {
    await create();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('nav[aria-label="Settings sections"] button'))
      .map((button) => (button as HTMLElement).textContent?.trim());
    expect(labels).toEqual(['Personal information', 'Security']);
  });

  it('shows the registered business read-only with its status, and the account holder details', async () => {
    await create();
    expect(el('#merchant-settings-business-name')?.textContent).toContain('Acme Stores (Pvt) Ltd');
    expect(el('#merchant-settings-status')?.textContent).toContain('Approved');
    expect(component.isEditing()).toBe(false);
    expect(component.fullName).toBe('Alice Perera');
    expect(component.email).toBe('alice@acme.lk');
    expect(component.phone).toBe('+94771234567');
    expect((el('#merchant-settings-email') as HTMLInputElement).readOnly).toBe(true);
    expect(el('#merchant-settings-save-btn')).toBeNull();
  });

  it('opens straight into edit mode when requested, and cancel discards unsaved edits', async () => {
    await create({ startInEditMode: true });
    expect(component.isEditing()).toBe(true);
    expect((el('#merchant-settings-email') as HTMLInputElement).readOnly).toBe(false);

    component.fullName = 'Someone Else';
    (el('#merchant-settings-cancel-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.isEditing()).toBe(false);
    expect(component.fullName).toBe('Alice Perera');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('saves trimmed details and emits profileSaved', async () => {
    await create();
    const saved = jest.fn();
    component.profileSaved.subscribe(saved);
    (el('#merchant-settings-edit-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    component.fullName = '  Alice P  ';
    component.email = ' alice.p@acme.lk ';
    component.phone = '   ';
    component.saveProfile();

    expect(updateProfile).toHaveBeenCalledWith({ fullName: 'Alice P', phoneNumber: undefined, email: 'alice.p@acme.lk' });
    expect(saved).toHaveBeenCalledTimes(1);
    expect(component.isEditing()).toBe(false);
  });

  it('keeps the form open, shows the error and emits profileSaveFailed when saving fails', async () => {
    updateProfile.mockReturnValue(throwError(() => ({ error: { message: 'Email already in use' } })));
    await create({ startInEditMode: true });
    const failed = jest.fn();
    component.profileSaveFailed.subscribe(failed);

    component.saveProfile();
    fixture.detectChanges();

    expect(failed).toHaveBeenCalledWith('Email already in use');
    expect(component.isEditing()).toBe(true);
    expect(el('#merchant-settings-error')?.textContent).toContain('Email already in use');
  });

  it('never saves a blank name or email', async () => {
    await create({ startInEditMode: true });
    component.email = '  ';
    component.saveProfile();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('shows the email fallback only as a placeholder, never as a form value', async () => {
    currentUser.set({ id: 'user-2', role: 'MERCHANT', fullName: '', email: '' });
    await create({ emailFallback: 'Loading email...' });
    const email = el('#merchant-settings-email') as HTMLInputElement;
    expect(component.email).toBe('');
    expect(email.placeholder).toBe('Loading email...');
  });

  it('shows the change-password flow under Security', async () => {
    await create();
    (el('#merchant-settings-nav-security') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el('app-customer-change-password')).toBeTruthy();
    expect(el('#merchant-settings-form')).toBeNull();
  });
});
