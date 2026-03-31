import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth.service';
import { VerifyAuthenticatorComponent } from './verify-authenticator';

describe('VerifyAuthenticatorComponent', () => {
  const authServiceMock = {
    verifyLoginMfa: vi.fn()
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  };

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authServiceMock.verifyLoginMfa.mockReset();
    toastrMock.success.mockReset();
    toastrMock.error.mockReset();
    toastrMock.warning.mockReset();
    localStorage.clear();
    localStorage.setItem('mfaEnabled', 'true');
    localStorage.setItem('mfa_token', 'temp-mfa-token');

    await TestBed.configureTestingModule({
      imports: [VerifyAuthenticatorComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function createComponent(): VerifyAuthenticatorComponent {
    const fixture = TestBed.createComponent(VerifyAuthenticatorComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('verifies MFA code and stores final auth token', () => {
    authServiceMock.verifyLoginMfa.mockReturnValue(
      of({ statusCode: 200, message: 'MFA verified', data: { token: 'final-auth-token' } })
    );
    const component = createComponent();
    component.otpDigits.splice(0, 6, '1', '2', '3', '4', '5', '6');

    component.verifyOtp();

    expect(authServiceMock.verifyLoginMfa).toHaveBeenCalledWith('123456', 'temp-mfa-token');
    expect(localStorage.getItem('authToken')).toBe('final-auth-token');
    expect(localStorage.getItem('emailOtpVerified')).toBe('true');
    expect(localStorage.getItem('authenticatorVerified')).toBe('true');
    expect(localStorage.getItem('mfa_token')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows validation error for invalid code', () => {
    const component = createComponent();
    component.otpDigits.splice(0, 6, '1', '2', '', '', '', '');

    component.verifyOtp();

    expect(toastrMock.error).toHaveBeenCalledWith('Please enter a valid 6-digit code.');
    expect(authServiceMock.verifyLoginMfa).not.toHaveBeenCalled();
  });

  it('shows backend error when MFA verification fails', () => {
    authServiceMock.verifyLoginMfa.mockReturnValue(
      throwError(() => ({ error: { message: 'Invalid authenticator code' } }))
    );
    const component = createComponent();
    component.otpDigits.splice(0, 6, '1', '2', '3', '4', '5', '6');

    component.verifyOtp();

    expect(toastrMock.error).toHaveBeenCalledWith('Invalid authenticator code');
  });
});
