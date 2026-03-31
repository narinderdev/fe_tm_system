import { PLATFORM_ID } from '@angular/core';
import {
  HttpErrorResponse,
  HttpHandler,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthTokenInterceptor } from './auth-token.interceptor';

describe('AuthTokenInterceptor', () => {
  let interceptor: AuthTokenInterceptor;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'browser' }, AuthTokenInterceptor]
    }).compileComponents();

    interceptor = TestBed.inject(AuthTokenInterceptor);
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function run(request: HttpRequest<unknown>, handler: Partial<HttpHandler>): Observable<unknown> {
    return interceptor.intercept(request, handler as HttpHandler);
  }

  it('skips token injection for public auth endpoints', async () => {
    localStorage.setItem('authToken', 'auth-token');
    const handle = vi.fn((req: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: req })));
    const req = new HttpRequest('POST', '/auth/mfa/email/verify', {});

    const response = await firstValueFrom(run(req, { handle })) as HttpResponse<HttpRequest<unknown>>;
    const forwarded = response.body as HttpRequest<unknown>;

    expect(forwarded.headers.has('Authorization')).toBe(false);
  });

  it('injects bearer token for protected endpoints', async () => {
    localStorage.setItem('authToken', 'auth-token');
    const handle = vi.fn((req: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: req })));
    const req = new HttpRequest('GET', '/api/dashboard', {});

    const response = await firstValueFrom(run(req, { handle })) as HttpResponse<HttpRequest<unknown>>;
    const forwarded = response.body as HttpRequest<unknown>;

    expect(forwarded.headers.get('Authorization')).toBe('Bearer auth-token');
  });

  it('clears auth state and redirects on 403', async () => {
    localStorage.setItem('authToken', 'auth-token');
    localStorage.setItem('mfa_token', 'mfa-token');
    localStorage.setItem('emailOtpVerified', 'true');
    localStorage.setItem('authenticatorVerified', 'true');
    localStorage.setItem('mfaEnabled', 'true');
    localStorage.setItem('loginEmail', 'user@example.com');

    const req = new HttpRequest('GET', '/api/dashboard', {});
    const handle = vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }))
    );

    await expect(firstValueFrom(run(req, { handle }))).rejects.toBeTruthy();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('mfa_token')).toBeNull();
    expect(localStorage.getItem('emailOtpVerified')).toBeNull();
    expect(localStorage.getItem('authenticatorVerified')).toBeNull();
    expect(localStorage.getItem('mfaEnabled')).toBeNull();
    expect(localStorage.getItem('loginEmail')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
