import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private readonly isBrowser: boolean;

  constructor(private router: Router, @Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private isLoggedIn(): boolean {
    if (!this.isBrowser) {
      // On the server we cannot read localStorage; allow navigation and let the browser guard run.
      return true;
    }
    return !!localStorage.getItem('authToken');
  }

  private redirectToLogin(): UrlTree {
    return this.router.parseUrl('/login');
  }

  private redirectToVerifyAccount(): UrlTree {
    const email = this.isBrowser ? String(localStorage.getItem('loginEmail') ?? '').trim().toLowerCase() : '';
    if (email) {
      return this.router.createUrlTree(['/verify-account'], { queryParams: { email } });
    }
    return this.router.parseUrl('/verify-account');
  }

  private redirectToVerifyAuthenticator(): UrlTree {
    return this.router.parseUrl('/authenticator-verify');
  }

  private canAccessExpiredPasswordFlow(url: string): boolean {
    if (!this.isBrowser) {
      return true;
    }
    const isChangePasswordRoute = url.startsWith('/change-password');
    if (!isChangePasswordRoute) {
      return false;
    }
    return localStorage.getItem('passwordExpired') === 'true' && !!localStorage.getItem('loginEmail');
  }

  private canAccessPublicAuthFlow(route: ActivatedRouteSnapshot, url: string): boolean {
    if (!this.isBrowser) {
      return true;
    }
    if (!url.startsWith('/set-password')) {
      return false;
    }
    const email = String(route.queryParamMap.get('email') ?? '').trim().toLowerCase();
    const token = String(route.queryParamMap.get('token') ?? '').trim();
    return !!email && !!token;
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.isBrowser) {
      return true;
    }
    if (this.canAccessPublicAuthFlow(route, state.url)) {
      return true;
    }
    if (this.isLoggedIn()) {
      const emailOtpVerified = localStorage.getItem('emailOtpVerified') === 'true';
      const mfaEnabled = localStorage.getItem('mfaEnabled') === 'true';
      const authenticatorVerified = localStorage.getItem('authenticatorVerified') === 'true';

      if (!emailOtpVerified) {
        return this.redirectToVerifyAccount();
      }

      if (mfaEnabled && !authenticatorVerified) {
        return this.redirectToVerifyAuthenticator();
      }

      return true;
    }
    if (this.canAccessExpiredPasswordFlow(state.url)) {
      return true;
    }
    return this.redirectToLogin();
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.canActivate(route, state);
  }
}