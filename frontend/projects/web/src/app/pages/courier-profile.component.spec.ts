import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CourierProfileComponent } from './courier-profile.component';
import { NotificationService } from '../notification/notification.service';

describe('CourierProfileComponent', () => {
  let component: CourierProfileComponent;
  let fixture: ComponentFixture<CourierProfileComponent>;
  let http: HttpTestingController;

  const mockNotificationService = {
    unreadCount: signal(0),
    totalElements: signal(0),
    notifications: signal([]),
    isLoading: signal(false),
    error: signal(null),
    refreshUnreadCount: () => of(0),
    loadNotifications: () => of([]),
    markAsRead: () => of(void 0),
    markAllAsRead: () => of(void 0),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourierProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CourierProfileComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders the authenticated profile after loading', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/courier/me').flush({ userId: 'courier-1', name: 'Kamal Perera', phone: '+94771234567', zone: 'Colombo', availability: true, vehicle: 'MOTORBIKE' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Kamal Perera');
    expect(fixture.nativeElement.textContent).toContain('Colombo');
    expect(fixture.nativeElement.textContent).toContain('Available');
  });

  it('shows a profile loading failure', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/courier/me').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('session has expired');
  });

  it('updates availability only after the server confirms it', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/courier/me').flush({ userId: 'courier-1', name: 'Kamal', phone: null, zone: null, availability: true, vehicle: null });
    component.toggleAvailability();
    const request = http.expectOne('/api/v1/courier/availability');
    expect(component.profile()?.availability).toBe(true);
    request.flush({ userId: 'courier-1', name: 'Kamal', phone: null, zone: null, availability: false, vehicle: null });
    expect(component.profile()?.availability).toBe(false);
  });

  it('switches between profile, duty, and security settings sections', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/courier/me').flush({ userId: 'courier-1', name: 'Kamal Perera', phone: '+94771234567', zone: 'Colombo', availability: true, vehicle: 'MOTORBIKE' });
    fixture.detectChanges();

    // Default section is profile
    expect(component.settingsSection()).toBe('profile');
    expect(fixture.nativeElement.querySelector('#settings-profile-form')).toBeTruthy();

    // Switch to duty section
    const dutyNavBtn = fixture.nativeElement.querySelector('#settings-nav-duty') as HTMLButtonElement;
    dutyNavBtn.click();
    fixture.detectChanges();
    expect(component.settingsSection()).toBe('duty');
    expect(fixture.nativeElement.querySelector('#courier-duty-badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#settings-availability-btn')).toBeTruthy();

    // Switch to security section
    const secNavBtn = fixture.nativeElement.querySelector('#settings-nav-security') as HTMLButtonElement;
    secNavBtn.click();
    fixture.detectChanges();
    expect(component.settingsSection()).toBe('security');
    expect(fixture.nativeElement.querySelector('app-customer-change-password')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#settings-logout-btn')).toBeTruthy();
  });

  it('allows inline editing and cancellation of personal profile details', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/courier/me').flush({ userId: 'courier-1', name: 'Kamal Perera', phone: '+94771234567', zone: 'Colombo', availability: true, vehicle: 'MOTORBIKE' });
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#edit-profile-fullname') as HTMLInputElement;
    expect(nameInput.readOnly).toBe(true);
    expect(fixture.nativeElement.querySelector('#save-profile-btn')).toBeFalsy();

    // Start editing
    const editBtn = fixture.nativeElement.querySelector('#courier-edit-profile-btn') as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    expect(component.isEditingProfile()).toBe(true);
    expect(nameInput.readOnly).toBe(false);
    expect(fixture.nativeElement.querySelector('#save-profile-btn')).toBeTruthy();

    // Cancel editing
    const cancelBtn = fixture.nativeElement.querySelector('#cancel-profile-btn') as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(component.isEditingProfile()).toBe(false);
    expect(nameInput.readOnly).toBe(true);
  });
});
