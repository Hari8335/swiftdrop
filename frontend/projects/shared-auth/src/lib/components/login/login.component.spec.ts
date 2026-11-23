import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthResponse } from '../../models/auth.models';
import { provideRouter } from '@angular/router';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: {
    login: jest.Mock;
    loginWithGoogle: jest.Mock;
  };
  let router: Router;

  const mockAuthResponse: AuthResponse = {
    accessToken: 'test-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'usr-1',
      email: 'test@swiftdrop.lk',
      fullName: 'Test User',
      role: 'CUSTOMER',
      merchantId: null,
    },
  };

  beforeEach(async () => {
    authServiceMock = {
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      logout: jest.fn().mockReturnValue(of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    fixture.detectChanges();
  });

  it('should initialize with empty form and invalid state', () => {
    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should validate email format and required password', () => {
    const emailControl = component.loginForm.get('email');
    const passwordControl = component.loginForm.get('password');

    emailControl?.setValue('invalid-email');
    passwordControl?.setValue('');
    expect(emailControl?.valid).toBe(false);
    expect(component.loginForm.valid).toBe(false);

    emailControl?.setValue('valid@swiftdrop.lk');
    passwordControl?.setValue('Password123!');
    expect(emailControl?.valid).toBe(true);
    expect(passwordControl?.valid).toBe(true);
    expect(component.loginForm.valid).toBe(true);
  });

  it('should toggle password visibility from hidden to visible and back', () => {
    const passwordInput = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;

    expect(passwordInput.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    toggle.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');

    toggle.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
  });

  it('should navigate to user role route on successful login', () => {
    authServiceMock.login.mockReturnValue(of(mockAuthResponse));

    component.loginForm.setValue({
      email: 'test@swiftdrop.lk',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'test@swiftdrop.lk',
      password: 'Password123!',
      role: 'CUSTOMER',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/customer']);
    expect(component.errorMessage()).toBeNull();
    expect(component.isLoading()).toBe(false);
  });

  it('should reject login and show error message when account role does not match selected portal tab', () => {
    // User tries to log in with CUSTOMER credentials on MERCHANT portal tab
    authServiceMock.login.mockReturnValue(of({
      ...mockAuthResponse,
      user: { ...mockAuthResponse.user, role: 'CUSTOMER' },
    }));
    component.selectRole('MERCHANT');
    component.loginForm.setValue({
      email: 'customer@swiftdrop.lk',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'customer@swiftdrop.lk',
      password: 'Password123!',
      role: 'MERCHANT',
    });
    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('This account is registered as customer');
  });

  it('should route first-time merchant login to password setup', () => {
    authServiceMock.login.mockReturnValue(of({
      ...mockAuthResponse,
      mustChangePassword: true,
      user: { ...mockAuthResponse.user, email: 'merchant@example.com', role: 'MERCHANT' },
    }));
    component.selectRole('MERCHANT');
    component.loginForm.setValue({
      email: 'merchant@example.com',
      password: '123456',
    });

    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/reset-password'], {
      queryParams: { email: 'merchant@example.com', firstLogin: 'true', role: 'MERCHANT' },
    });
  });

  it('should navigate a successful Courier login to the Courier portal', () => {
    authServiceMock.login.mockReturnValue(of({
      ...mockAuthResponse,
      user: { ...mockAuthResponse.user, role: 'COURIER' },
    }));
    component.selectRole('COURIER');
    component.loginForm.setValue({
      email: 'courier@swiftdrop.lk',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/courier']);
  });

  it('should display error message on 401 Unauthorized', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 401 })));

    component.loginForm.setValue({
      email: 'test@swiftdrop.lk',
      password: 'WrongPassword!',
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Invalid email or password');
    expect(component.isLoading()).toBe(false);
  });

  it('should display locked account message on 423 Locked', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 423 })));

    component.loginForm.setValue({
      email: 'test@swiftdrop.lk',
      password: 'WrongPassword!',
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('temporarily locked');
    expect(component.isLoading()).toBe(false);
  });

  it('should display disabled account message on 403 Forbidden', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 403 })));

    component.loginForm.setValue({
      email: 'disabled@swiftdrop.lk',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Your account has been disabled by admin');
    expect(component.isLoading()).toBe(false);
  });

  it('should display rate limit message on 429 Too Many Requests', () => {
    authServiceMock.login.mockReturnValue(throwError(() => ({ status: 429 })));

    component.loginForm.setValue({
      email: 'spammer@swiftdrop.lk',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Too many login attempts');
    expect(component.isLoading()).toBe(false);
  });

  it('should trigger loginWithGoogle with selected role when Google sign in button is clicked', () => {
    component.selectRole('DISPATCHER');
    component.onGoogleLogin();
    expect(authServiceMock.loginWithGoogle).toHaveBeenCalledWith('DISPATCHER');
  });

  it('should display error message when no_dispatcher_account error queryParam is present', () => {
    (component as any).route = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => (key === 'error' ? 'no_dispatcher_account' : key === 'role' ? 'DISPATCHER' : null),
        },
      },
    };
    component.ngOnInit();
    expect(component.selectedRole()).toBe('DISPATCHER');
    expect(component.errorMessage()).toContain('No Dispatcher account found for this Google email');
  });

  it('should display error message when no_courier_account error queryParam is present', () => {
    (component as any).route = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => (key === 'error' ? 'no_courier_account' : key === 'role' ? 'COURIER' : null),
        },
      },
    };
    component.ngOnInit();
    expect(component.selectedRole()).toBe('COURIER');
    expect(component.errorMessage()).toContain('No Courier account found for this Google email');
  });

  it('should display error message when no_merchant_account error queryParam is present and clear URL', () => {
    const replaceSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    (component as any).route = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => (key === 'error' ? 'no_merchant_account' : key === 'role' ? 'MERCHANT' : null),
        },
      },
    };
    component.ngOnInit();
    expect(component.selectedRole()).toBe('MERCHANT');
    expect(component.errorMessage()).toContain('No approved Merchant account found for this Google email. Signup first for admin approval.');
    expect(replaceSpy).toHaveBeenCalledWith({}, '', '/login?role=MERCHANT');
    replaceSpy.mockRestore();
  });

  it('should clear email and password inputs when switching role tab', () => {
    component.selectRole('CUSTOMER');
    component.loginForm.setValue({
      email: 'nirukshith@gmail.com',
      password: 'MyPassword123!',
    });
    expect(component.loginForm.value.email).toBe('nirukshith@gmail.com');
    expect(component.loginForm.value.password).toBe('MyPassword123!');

    // Switch to COURIER
    component.selectRole('COURIER');
    expect(component.selectedRole()).toBe('COURIER');
    expect(component.loginForm.value.email).toBe('');
    expect(component.loginForm.value.password).toBe('');
  });

  it('should display error message if loginWithGoogle throws', () => {
    authServiceMock.loginWithGoogle.mockImplementation(() => {
      throw new Error('Navigation failed');
    });

    component.onGoogleLogin();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Unable to initiate Google sign-in');
  });

  it('should render top bar with Customer, Merchant, and Sign In navigation links', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('.nav-links a');
    expect(navLinks.length).toBe(3);
    expect(navLinks[0].textContent.trim()).toBe('Join as Customer');
    expect(navLinks[1].textContent.trim()).toBe('Join as Merchant');
    expect(fixture.nativeElement.querySelectorAll('.said-chip').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.store-badge')).toBeNull();
    expect(navLinks[2].textContent.trim()).toBe('Sign In');
  });

  it('should support switching between 5 roles and pre-filling sample credentials', () => {
    const roleTabs = fixture.nativeElement.querySelectorAll('.role-tab');
    expect(roleTabs.length).toBe(5);

    // Default is CUSTOMER
    expect(component.selectedRole()).toBe('CUSTOMER');

    // Switch to MERCHANT
    component.selectRole('MERCHANT');
    fixture.detectChanges();
    expect(component.selectedRole()).toBe('MERCHANT');
    component.useSampleCredentials('MERCHANT');
    expect(component.loginForm.get('email')?.value).toBe('merchant@swiftdrop.lk');

    // Switch to ADMIN
    component.selectRole('ADMIN');
    fixture.detectChanges();
    expect(component.selectedRole()).toBe('ADMIN');
    component.useSampleCredentials('ADMIN');
    expect(component.loginForm.get('email')?.value).toBe('admin@swiftdrop.lk');

    // Switch to DISPATCHER
    component.selectRole('DISPATCHER');
    fixture.detectChanges();
    expect(component.selectedRole()).toBe('DISPATCHER');
    component.useSampleCredentials('DISPATCHER');
    expect(component.loginForm.get('email')?.value).toBe('dispatcher@swiftdrop.lk');

    // Switch to COURIER
    component.selectRole('COURIER');
    fixture.detectChanges();
    expect(component.selectedRole()).toBe('COURIER');
    component.useSampleCredentials('COURIER');
    expect(component.loginForm.get('email')?.value).toBe('courier@swiftdrop.lk');
    expect(component.loginForm.get('password')?.value).toBe('Password123!');
  });

  describe('shared layout and per-role guidance', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const pick = (role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | 'DISPATCHER' | 'COURIER') => {
      component.selectRole(role);
      fixture.detectChanges();
    };

    it('renders inside the shared auth layout with Sign In highlighted', () => {
      const shell = el().querySelector('lib-auth-shell');
      expect(shell).toBeTruthy();
      expect(shell?.querySelector('.nav-pill')?.textContent?.trim()).toBe('Sign In');
      expect(shell?.querySelector('.auth-card form')).toBeTruthy();
    });

    it('explains how each role gets its account', () => {
      expect(el().querySelector('.hero-headline')?.textContent).toContain('Welcome back');

      pick('MERCHANT');
      expect(el().querySelector('.hero-lede')?.textContent).toContain('temporary password from your approval email');

      for (const role of ['COURIER', 'DISPATCHER'] as const) {
        pick(role);
        expect(el().querySelector('.hero-lede')?.textContent).toContain('created by your SwiftDrop administrator');
      }

      pick('ADMIN');
      expect(el().querySelector('.hero-badge')?.textContent).toContain('Admin sign-in');
    });

    it('offers Google sign-in on all role tabs except Admin', () => {
      expect(el().querySelector('.google-btn')).toBeTruthy();
      for (const role of ['MERCHANT', 'DISPATCHER', 'COURIER'] as const) {
        pick(role);
        expect(el().querySelector('.google-btn')).toBeTruthy();
      }
      pick('ADMIN');
      expect(el().querySelector('.google-btn')).toBeNull();
    });

    it('tells staff that their accounts come from an administrator instead of offering sign-up', () => {
      pick('COURIER');
      const footer = el().querySelector('.auth-footer')?.textContent ?? '';
      expect(footer).toContain('Courier accounts are created by your SwiftDrop administrator');
      expect(el().querySelector('.auth-footer a[href="/register"]')).toBeNull();

      pick('MERCHANT');
      expect(el().querySelector('.auth-footer a[href="/merchant-registration"]')).toBeTruthy();
    });

    it('does not show the sample-credentials shortcut', () => {
      expect(component.showSampleCredentials).toBe(false);
      expect(el().querySelector('.sample-link')).toBeNull();
    });
  });
});
