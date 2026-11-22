import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from 'shared-auth';
import { CustomerToastService } from './customer-toast.service';
import { CustomerChangePasswordComponent } from './customer-change-password.component';

describe('CustomerChangePasswordComponent', () => {
  let fixture: ComponentFixture<CustomerChangePasswordComponent>;
  let component: CustomerChangePasswordComponent;
  const auth = {
    forgotPassword: jest.fn(),
    verifyResetCode: jest.fn(),
    resetPassword: jest.fn(),
    setSession: jest.fn(),
  };
  const el = () => fixture.nativeElement as HTMLElement;
  const type = (selector: string, value: string) => {
    const input = el().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const click = (selector: string) => {
    el().querySelector<HTMLButtonElement>(selector)!.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    await TestBed.configureTestingModule({
      imports: [CustomerChangePasswordComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('email', 'Kamal@Example.com');
    fixture.detectChanges();
  });

  it('emails a code, verifies it and sets the new password without leaving the page', () => {
    auth.forgotPassword.mockReturnValue(of({ message: 'sent' }));
    auth.verifyResetCode.mockReturnValue(of({ message: 'ok' }));
    const user = { id: 'u1', email: 'kamal@example.com' };
    auth.resetPassword.mockReturnValue(of({ message: 'done', accessToken: 'new-token', user }));

    click('#send-password-code-btn');
    expect(auth.forgotPassword).toHaveBeenCalledWith({ email: 'kamal@example.com' });
    expect(component.step()).toBe('code');
    const toasts = TestBed.inject(CustomerToastService);
    expect(toasts.toasts().at(-1)).toMatchObject({ kind: 'success', title: 'Verification code sent' });

    type('#password-code', '123456');
    click('#verify-password-code-btn');
    expect(auth.verifyResetCode).toHaveBeenCalledWith({ email: 'kamal@example.com', token: '123456' });
    expect(component.step()).toBe('password');

    type('#new-password', 'NewPass1!');
    type('#confirm-password', 'NewPass1!');
    click('#save-password-btn');

    expect(auth.resetPassword).toHaveBeenCalledWith({ email: 'kamal@example.com', token: '123456', newPassword: 'NewPass1!' });
    expect(auth.setSession).toHaveBeenCalledWith('new-token', user);
    // Confirmed with a toast, and the form goes back to its first step.
    expect(toasts.toasts().at(-1)).toMatchObject({ kind: 'success', title: 'Password updated' });
    expect(component.step()).toBe('start');
  });

  it('shows the error and stays on the code step when the code is wrong', () => {
    auth.forgotPassword.mockReturnValue(of({ message: 'sent' }));
    auth.verifyResetCode.mockReturnValue(throwError(() => ({ error: { message: 'Invalid code' } })));

    click('#send-password-code-btn');
    type('#password-code', '000000');
    click('#verify-password-code-btn');

    expect(component.step()).toBe('code');
    expect(el().querySelector('[role="alert"]')!.textContent).toContain('Invalid code');
  });

  it('does not allow a weak or mismatched password', () => {
    auth.forgotPassword.mockReturnValue(of({ message: 'sent' }));
    auth.verifyResetCode.mockReturnValue(of({ message: 'ok' }));
    click('#send-password-code-btn');
    type('#password-code', '123456');
    click('#verify-password-code-btn');

    type('#new-password', 'weak');
    type('#confirm-password', 'other');

    expect(el().querySelector<HTMLButtonElement>('#save-password-btn')!.disabled).toBe(true);
  });
});
