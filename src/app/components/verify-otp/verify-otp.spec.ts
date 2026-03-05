import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth.service';
import { VerifyOtpComponent } from './verify-otp';

describe('VerifyOtpComponent', () => {
  const authServiceMock = {
    verifySignup: vi.fn()
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  };

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authServiceMock.verifySignup.mockReset();
    toastrMock.success.mockReset();
    toastrMock.error.mockReset();
    toastrMock.warning.mockReset();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [VerifyOtpComponent],
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

  function createComponent(): VerifyOtpComponent {
    const fixture = TestBed.createComponent(VerifyOtpComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads email from query params', () => {
    const component = createComponent();
    expect(component.email).toBe('user@example.com');
  });

  it('shows validation error for invalid OTP', () => {
    const component = createComponent();
    component.otpDigits.splice(0, 6, '1', '2', '3', '', '', '');

    component.verifyOtp();

    expect(toastrMock.error).toHaveBeenCalledWith('Please enter a valid 6-digit OTP.');
    expect(authServiceMock.verifySignup).not.toHaveBeenCalled();
  });

  it('verifies OTP, clears signup cache, and navigates to login on success', () => {
    localStorage.setItem('signupUserId', '101');
    localStorage.setItem('signupEmail', 'user@example.com');
    const component = createComponent();
    component.otpDigits.splice(0, 6, '1', '2', '3', '4', '5', '6');
    authServiceMock.verifySignup.mockReturnValue(of({ statusCode: 200, message: 'Verified' }));

    component.verifyOtp();

    expect(authServiceMock.verifySignup).toHaveBeenCalledWith({
      email: 'user@example.com',
      otp: '123456'
    });
    expect(toastrMock.success).toHaveBeenCalledWith('Verified');
    expect(localStorage.getItem('signupUserId')).toBeNull();
    expect(localStorage.getItem('signupEmail')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows API error message when verification fails', () => {
    const component = createComponent();
    component.otpDigits.splice(0, 6, '1', '2', '3', '4', '5', '6');
    authServiceMock.verifySignup.mockReturnValue(
      throwError(() => ({ error: { message: 'OTP expired' } }))
    );

    component.verifyOtp();

    expect(toastrMock.error).toHaveBeenCalledWith('OTP expired');
  });
});
