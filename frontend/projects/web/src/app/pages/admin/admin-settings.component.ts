import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AuthService,
  getPasswordComplexityWarning,
  passwordComplexityValidator,
  passwordMatchValidator,
} from 'shared-auth';
import { CustomerToastService } from '../customer/customer-toast.service';
import { CustomerToastsComponent } from '../customer/customer-toasts.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomerToastsComponent],
  templateUrl: './admin-settings.component.html',
})
export class AdminSettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService, { optional: true });
  private readonly toast = inject(CustomerToastService);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly adminEmail = computed(() => this.authService?.currentUser()?.email || 'admin@swiftdrop.lk');

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.maxLength(128), passwordComplexityValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  passwordWarning(): string | null {
    const control = this.passwordForm.controls.newPassword;
    if (!control.touched && !control.dirty) return null;
    if (control.hasError('minlength')) return 'Password must be at least 8 characters.';
    return getPasswordComplexityWarning(control.value);
  }

  savePassword(): void {
    if (this.passwordForm.invalid || !this.authService) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.success.set(null);

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.authService.changePassword(currentPassword, newPassword, this.adminEmail()).subscribe({
      next: () => {
        this.busy.set(false);
        this.passwordForm.reset();
        this.success.set('Your administrator password has been updated successfully.');
        this.toast.success('Password updated', 'Your administrator password has been updated successfully.');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'Could not update your password. Please check your old password and try again.');
      },
    });
  }
}
