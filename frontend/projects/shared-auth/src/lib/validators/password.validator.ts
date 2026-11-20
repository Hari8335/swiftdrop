import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordComplexityValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (!value) {
    return null;
  }

  const errors: ValidationErrors = {};
  if (value.length < 8) {
    errors['minlength'] = { requiredLength: 8, actualLength: value.length };
  }

  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^a-zA-Z0-9]/.test(value);

  if (!hasUpper || !hasNumber || !hasSpecial) {
    errors['complexity'] = {
      missingUpper: !hasUpper,
      missingNumber: !hasNumber,
      missingSpecial: !hasSpecial,
    };
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

export function getPasswordComplexityWarning(value: string | null | undefined): string | null {
  if (!value) return null;

  const missing: string[] = [];
  if (!/[A-Z]/.test(value)) {
    missing.push('one uppercase letter');
  }
  if (!/[0-9]/.test(value)) {
    missing.push('one number');
  }
  if (!/[^a-zA-Z0-9]/.test(value)) {
    missing.push('one special character');
  }

  if (missing.length === 3) {
    return 'Password must contain at least one uppercase letter, one number, and one special character';
  }
  if (missing.length === 2) {
    return `Password must contain at least ${missing[0]} and ${missing[1]}`;
  }
  if (missing.length === 1) {
    return `Password must contain at least ${missing[0]}`;
  }
  return null;
}

