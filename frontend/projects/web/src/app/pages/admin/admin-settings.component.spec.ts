import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from 'shared-auth';
import { AdminSettingsComponent } from './admin-settings.component';
import { CustomerToastService } from '../customer/customer-toast.service';

describe('AdminSettingsComponent', () => {
  let component: AdminSettingsComponent;
  let fixture: ComponentFixture<AdminSettingsComponent>;
  let authService: AuthService;
  let toastService: CustomerToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettingsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSettingsComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(CustomerToastService);
    fixture.detectChanges();
  });

  it('renders admin settings page with current password, new password, and confirmation inputs', () => {
    expect(component).toBeTruthy();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Admin Settings');
    expect(element.textContent).toContain('Change Password');
    expect(element.querySelector('#admin-current-password')).toBeTruthy();
    expect(element.querySelector('#admin-new-password')).toBeTruthy();
    expect(element.querySelector('#admin-confirm-password')).toBeTruthy();
    expect(element.querySelector('#admin-submit-password-btn')).toBeTruthy();
  });

  it('validates that current password is required', () => {
    const currentControl = component.passwordForm.controls.currentPassword;
    expect(currentControl.valid).toBe(false);

    currentControl.setValue('OldPassword123!');
    expect(currentControl.valid).toBe(true);
  });

  it('validates password complexity and confirmation match', () => {
    component.passwordForm.setValue({
      currentPassword: 'OldPassword123!',
      newPassword: 'weak',
      confirmPassword: 'weak',
    });
    fixture.detectChanges();
    expect(component.passwordForm.valid).toBe(false);

    component.passwordForm.setValue({
      currentPassword: 'OldPassword123!',
      newPassword: 'StrongPassword123!',
      confirmPassword: 'MismatchPassword123!',
    });
    fixture.detectChanges();
    expect(component.passwordForm.hasError('passwordMismatch')).toBe(true);

    component.passwordForm.setValue({
      currentPassword: 'OldPassword123!',
      newPassword: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });
    fixture.detectChanges();
    expect(component.passwordForm.valid).toBe(true);
  });

  it('toggles password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.showPassword.set(true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('#admin-current-password') as HTMLInputElement;
    expect(input.type).toBe('text');
  });

  it('successfully updates password and shows success message and toast', () => {
    const changeSpy = jest.spyOn(authService, 'changePassword').mockReturnValue(
      of({ message: 'Password updated successfully.' })
    );
    const toastSpy = jest.spyOn(toastService, 'success');

    component.passwordForm.setValue({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewStrongPassword123!',
      confirmPassword: 'NewStrongPassword123!',
    });
    fixture.detectChanges();

    component.savePassword();
    fixture.detectChanges();

    expect(changeSpy).toHaveBeenCalledWith('OldPassword123!', 'NewStrongPassword123!', component.adminEmail());
    expect(component.success()).toContain('successfully');
    expect(toastSpy).toHaveBeenCalledWith('Password updated', expect.any(String));
  });

  it('displays error message when current password does not match or update fails', () => {
    jest.spyOn(authService, 'changePassword').mockReturnValue(
      throwError(() => ({ error: { message: 'Current password does not match.' } }))
    );

    component.passwordForm.setValue({
      currentPassword: 'WrongOldPassword123!',
      newPassword: 'NewStrongPassword123!',
      confirmPassword: 'NewStrongPassword123!',
    });
    fixture.detectChanges();

    component.savePassword();
    fixture.detectChanges();

    expect(component.error()).toBe('Current password does not match.');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Current password does not match.');
  });
});
