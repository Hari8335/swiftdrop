import { FormControl } from '@angular/forms';
import {
  passwordComplexityValidator,
  getPasswordComplexityWarning,
} from './password.validator';

describe('passwordComplexityValidator', () => {
  it('returns null for empty control (defer to required validator)', () => {
    const control = new FormControl('');
    expect(passwordComplexityValidator(control)).toBeNull();
  });

  it('flags error for passwords with fewer than 8 characters', () => {
    const control = new FormControl('Ab1!');
    const result = passwordComplexityValidator(control);
    expect(result).not.toBeNull();
    expect(result?.['minlength']).toBeDefined();
  });

  it('flags error for passwords missing uppercase letter', () => {
    const control = new FormControl('lowercase123!');
    const result = passwordComplexityValidator(control);
    expect(result).not.toBeNull();
    expect(result?.['complexity']?.missingUpper).toBe(true);
    expect(result?.['complexity']?.missingNumber).toBe(false);
    expect(result?.['complexity']?.missingSpecial).toBe(false);
  });

  it('flags error for passwords missing number', () => {
    const control = new FormControl('UpperCaseOnly!');
    const result = passwordComplexityValidator(control);
    expect(result).not.toBeNull();
    expect(result?.['complexity']?.missingNumber).toBe(true);
  });

  it('flags error for passwords missing special character', () => {
    const control = new FormControl('UpperCase123');
    const result = passwordComplexityValidator(control);
    expect(result).not.toBeNull();
    expect(result?.['complexity']?.missingSpecial).toBe(true);
  });

  it('passes for valid passwords meeting all criteria', () => {
    const control = new FormControl('ValidP@ssword123');
    expect(passwordComplexityValidator(control)).toBeNull();
  });
});

describe('getPasswordComplexityWarning', () => {
  it('returns null when all criteria are met', () => {
    expect(getPasswordComplexityWarning('ValidP@ssword123')).toBeNull();
  });

  it('returns suitable warning when missing all three criteria', () => {
    expect(getPasswordComplexityWarning('abcdefgh')).toBe(
      'Password must contain at least one uppercase letter, one number, and one special character'
    );
  });

  it('returns suitable warning when missing uppercase and special character', () => {
    expect(getPasswordComplexityWarning('abcdefgh123')).toBe(
      'Password must contain at least one uppercase letter and one special character'
    );
  });

  it('returns suitable warning when missing number only', () => {
    expect(getPasswordComplexityWarning('Abcdefgh!')).toBe(
      'Password must contain at least one number'
    );
  });

  it('returns suitable warning when missing special character only', () => {
    expect(getPasswordComplexityWarning('Abcdefgh1')).toBe(
      'Password must contain at least one special character'
    );
  });

  it('returns suitable warning when missing uppercase only', () => {
    expect(getPasswordComplexityWarning('abcdefgh1!')).toBe(
      'Password must contain at least one uppercase letter'
    );
  });
});

