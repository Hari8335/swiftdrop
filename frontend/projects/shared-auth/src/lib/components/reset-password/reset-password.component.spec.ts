import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceMock: {
    verifyResetCode: jest.Mock;
    resetPassword: jest.Mock;
    changeInitialPassword: jest.Mock;
    setSession: jest.Mock;
    userRole: jest.Mock;
  };
  let router: Router;

  const createComponentWithToken = async (token: string | null) => {
    authServiceMock = {
      verifyResetCode: jest.fn(),
      resetPassword: jest.fn(),
      changeInitialPassword: jest.fn(),
      forgotPassword: jest.fn(),
      setSession: jest.fn(),
      userRole: jest.fn().mockReturnValue('CUSTOMER'),
    };

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => (token ? 'user@example.com' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    fixture.detectChanges();
  };

  describe('with reset email', () => {
    beforeEach(async () => {
      await createComponentWithToken('123456');
    });

    it('should initialize with email and invalid empty forms', () => {
      expect(component.missingEmail()).toBe(false);
      expect(component.email()).toBe('user@example.com');
      expect(component.codeForm.valid).toBe(false);
      expect(component.resetForm.valid).toBe(false);
    });

    it('should verify a six-digit code before showing the password form', () => {
      authServiceMock.verifyResetCode.mockReturnValue(of({ message: 'Reset code verified.' }));
      component.codeForm.setValue({ token: '123456' });

      component.verifyCode();

      expect(authServiceMock.verifyResetCode).toHaveBeenCalledWith({
        email: 'user@example.com',
        token: '123456',
      });
      expect(component.codeVerified()).toBe(true);
      expect(component.token()).toBe('123456');
    });

    it('should validate password length and required fields', () => {
      const newPwd = component.resetForm.get('newPassword');
      const confirmPwd = component.resetForm.get('confirmPassword');

      newPwd?.setValue('short');
      confirmPwd?.setValue('short');
      expect(newPwd?.hasError('minlength')).toBe(true);
      expect(component.resetForm.valid).toBe(false);

      newPwd?.setValue('ValidP@ssword123');
      confirmPwd?.setValue('ValidP@ssword123');
      expect(component.resetForm.valid).toBe(true);
    });

    it('should show minimum 8 characters error while typing and suitable warning on next step', () => {
      const newPwd = component.resetForm.get('newPassword');

      // User typing password (< 8 chars)
      component.onPasswordFocus();
      newPwd?.setValue('abc');
      newPwd?.markAsDirty();
      expect(component.getPasswordErrorMessage()).toBe('Password must be at least 8 characters');

      // User types 8 chars without uppercase/number/special, still focused (typing)
      newPwd?.setValue('abcdefgh');
      expect(component.getPasswordErrorMessage()).toBeNull();

      // User moves to next step (blurs or focuses confirm password)
      component.onPasswordBlur();
      expect(component.getPasswordErrorMessage()).toBe(
        'Password must contain at least one uppercase letter, one number, and one special character'
      );

      // User types uppercase and number, missing special char
      newPwd?.setValue('Abcdefgh1');
      expect(component.getPasswordErrorMessage()).toBe(
        'Password must contain at least one special character'
      );

      // User satisfies all rules
      newPwd?.setValue('Abcdefgh1!');
      expect(component.getPasswordErrorMessage()).toBeNull();
    });

    it('should flag password mismatch when passwords differ', () => {
      component.resetForm.setValue({
        newPassword: 'PasswordOne1!',
        confirmPassword: 'PasswordTwo2!',
      });
      component.resetForm.get('confirmPassword')?.markAsDirty();
      expect(component.hasMismatchError()).toBe(true);
      expect(component.resetForm.valid).toBe(false);
    });

    it('should toggle password visibility signals', () => {
      expect(component.showPassword()).toBe(false);
      component.toggleShowPassword();
      expect(component.showPassword()).toBe(true);

      expect(component.showConfirmPassword()).toBe(false);
      component.toggleShowConfirmPassword();
      expect(component.showConfirmPassword()).toBe(true);
    });

    it('should submit successfully and navigate to the role portal', () => {
      component.codeVerified.set(true);
      component.token.set('123456');
      const response = {
        message: 'Password has been successfully reset.',
        accessToken: 'reset-token',
        user: { id: '1', email: 'user@example.com', fullName: 'User', role: 'CUSTOMER' },
      };
      authServiceMock.resetPassword.mockReturnValue(of(response));

      component.resetForm.setValue({
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

      component.onSubmit();

      expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        token: '123456',
        newPassword: 'BrandNewPassword123!',
      });
      expect(component.isLoading()).toBe(false);
      expect(component.isSuccess()).toBe(true);
      expect(component.successMessage()).toBe(response.message);

      expect(authServiceMock.setSession).toHaveBeenCalledWith('reset-token', response.user);
      expect(router.navigate).toHaveBeenCalledWith(['/customer']);
    });

    it('should change a merchant initial password and navigate to the merchant portal', () => {
      component.firstLogin.set(true);
      authServiceMock.userRole.mockReturnValue('MERCHANT');
      authServiceMock.changeInitialPassword.mockReturnValue(of({
        message: 'Password updated successfully.',
      }));
      component.resetForm.setValue({
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

      component.onSubmit();

      expect(authServiceMock.changeInitialPassword).toHaveBeenCalledWith('BrandNewPassword123!');
      expect(router.navigate).toHaveBeenCalledWith(['/merchant']);
    });

    it('should display error message on 400 Invalid/Expired token', () => {
      authServiceMock.resetPassword.mockReturnValue(
        throwError(() => ({
          status: 400,
          error: { code: 'INVALID_RESET_TOKEN', message: 'Code is expired' },
        }))
      );

      component.codeVerified.set(true);
      component.token.set('123456');
      component.resetForm.setValue({
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

      component.onSubmit();

      expect(component.isLoading()).toBe(false);
      expect(component.isSuccess()).toBe(false);
      expect(component.errorMessage()).toBe('Code is expired');
    });

    it('should call forgotPassword on resendCode and update status', () => {
      authServiceMock.forgotPassword.mockReturnValue(of({ message: 'Code resent.' }));

      component.resendCode();

      expect(authServiceMock.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(component.isResending()).toBe(false);
      expect(component.resendSuccessMessage()).toBe('Code resent.');
    });
  });

  describe('with missing email', () => {
    beforeEach(async () => {
      await createComponentWithToken(null);
    });

    it('should set missingEmail signal to true', () => {
      expect(component.missingEmail()).toBe(true);
      expect(component.token()).toBeNull();
    });
  });
});
