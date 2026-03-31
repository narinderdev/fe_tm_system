import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth.service';
import { VerifyAccountComponent } from './verify-account';

describe('VerifyAccountComponent', () => {
  const authServiceMock = {
    verifyLoginEmailOtp: vi.fn()
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  };

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authServiceMock.verifyLoginEmailOtp.mockReset();
    toastrMock.success.mockReset();
    toastrMock.error.mockReset();
    toastrMock.warning.mockReset();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [VerifyAccountComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ email: 'user@example.com' })
            }
          }
        }
      ]
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function createComponent(): VerifyAccountComponent {
    const fixture = TestBed.createComponent(VerifyAccountComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('routes to dashboard when email OTP verifies and MFA is disabled', () => {
    localStorage.setItem('mfaEnabled', 'false');
    authServiceMock.verifyLoginEmailOtp.mockReturnValue(of({ statusCode: 200, message: 'Verified' }));
    const component = createComponent();
    component.otpCode = '123456';

    component.verifyOtp();

    expect(authServiceMock.verifyLoginEmailOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456'
    });
    expect(localStorage.getItem('emailOtpVerified')).toBe('true');
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('routes to verify-authenticator when email OTP verifies and MFA is enabled', () => {
    localStorage.setItem('mfaEnabled', 'true');
    authServiceMock.verifyLoginEmailOtp.mockReturnValue(of({ statusCode: 200, message: 'Verified' }));
    const component = createComponent();
    component.otpCode = '123456';

    component.verifyOtp();

    expect(localStorage.getItem('emailOtpVerified')).toBe('true');
    expect(navigateSpy).toHaveBeenCalledWith(['/verify-authenticator']);
  });

  it('shows validation error for invalid OTP', () => {
    const component = createComponent();
    component.otpCode = '123';

    component.verifyOtp();

    expect(toastrMock.error).toHaveBeenCalledWith('Please enter a valid 6-digit OTP.');
    expect(authServiceMock.verifyLoginEmailOtp).not.toHaveBeenCalled();
  });

  it('shows backend error when OTP verify fails', () => {
    authServiceMock.verifyLoginEmailOtp.mockReturnValue(
      throwError(() => ({ error: { message: 'OTP expired' } }))
    );
    const component = createComponent();
    component.otpCode = '123456';

    component.verifyOtp();

    expect(toastrMock.error).toHaveBeenCalledWith('OTP expired');
  });
});
