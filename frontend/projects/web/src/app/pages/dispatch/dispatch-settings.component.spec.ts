import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from 'shared-auth';
import { DispatchSettingsComponent } from './dispatch-settings.component';
import { DispatchNotificationsService } from './dispatch-notifications.service';

describe('DispatchSettingsComponent', () => {
  let fixture: ComponentFixture<DispatchSettingsComponent>;
  let component: DispatchSettingsComponent;
  const authStub = {
    currentUser: signal({ id: 'u1', fullName: 'Dinesh Perera', email: 'd@swiftdrop.lk', phoneNumber: '0771234567', role: 'DISPATCHER' }),
    updateProfile: jest.fn(),
  };
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    jest.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DispatchSettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: authStub }],
    }).compileComponents();
    fixture = TestBed.createComponent(DispatchSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows dispatcher sections instead of the customer address book', () => {
    const labels = Array.from(el().querySelectorAll('[id^="settings-nav-"]')).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Personal information', 'Security', 'Notifications']);
    expect(el().querySelector('#dispatch-settings-name')?.textContent).toContain('Dinesh Perera');
  });

  it('keeps the profile read-only until Edit profile, then saves it', () => {
    expect((el().querySelector('#dispatch-profile-fullname') as HTMLInputElement).readOnly).toBe(true);

    authStub.updateProfile.mockReturnValue(of({}));
    component.startEditing();
    component.fullName = 'Dinesh K. Perera';
    component.saveProfile();

    expect(authStub.updateProfile).toHaveBeenCalledWith({ fullName: 'Dinesh K. Perera', phoneNumber: '0771234567', email: 'd@swiftdrop.lk' });
    expect(component.saved()).toBe(true);
    expect(component.isEditing()).toBe(false);
  });

  it('shows the backend error when saving fails', () => {
    authStub.updateProfile.mockReturnValue(throwError(() => ({ error: { message: 'Email already in use' } })));
    component.startEditing();
    component.saveProfile();
    expect(component.error()).toBe('Email already in use');
  });

  it('updates pop-up alert preferences', () => {
    const alerts = TestBed.inject(DispatchNotificationsService);
    component.selectSection('notifications');
    fixture.detectChanges();
    const toggle = el().querySelector('#pref-failed-alerts') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(alerts.prefs().failedAlerts).toBe(false);
    expect(alerts.prefs().queueAlerts).toBe(true);
  });

  it('reuses the change-password flow in Security', () => {
    component.selectSection('security');
    fixture.detectChanges();
    expect(el().querySelector('app-customer-change-password')).toBeTruthy();
  });
});
