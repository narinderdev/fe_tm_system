import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'browser' }]
    }).compileComponents();
    guard = TestBed.inject(AuthGuard);
  });

  function run(url: string): boolean | UrlTree {
    const route = {
      queryParamMap: { get: () => null }
    } as unknown as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return guard.canActivate(route, state);
  }

  it('redirects to login when auth token is missing', () => {
    const result = run('/tm-system/dashboard');

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('redirects to verify-account when email otp is not verified', () => {
    localStorage.setItem('authToken', 'token-1');
    localStorage.setItem('loginEmail', 'user@example.com');
    localStorage.setItem('emailOtpVerified', 'false');
    localStorage.setItem('mfaEnabled', 'false');
    localStorage.setItem('authenticatorVerified', 'true');

    const result = run('/tm-system/dashboard');

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('/verify-account');
    expect((result as UrlTree).toString()).toContain('email=user@example.com');
  });

  it('redirects to verify-authenticator when mfa is enabled but not verified', () => {
    localStorage.setItem('authToken', 'token-1');
    localStorage.setItem('emailOtpVerified', 'true');
    localStorage.setItem('mfaEnabled', 'true');
    localStorage.setItem('authenticatorVerified', 'false');

    const result = run('/tm-system/dashboard');

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/verify-authenticator');
  });

  it('allows protected route when all verification steps are complete', () => {
    localStorage.setItem('authToken', 'token-1');
    localStorage.setItem('emailOtpVerified', 'true');
    localStorage.setItem('mfaEnabled', 'true');
    localStorage.setItem('authenticatorVerified', 'true');

    const result = run('/tm-system/dashboard');

    expect(result).toBe(true);
  });
});
