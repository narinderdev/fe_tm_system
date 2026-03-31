import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class MfaChallengeGuard implements CanActivate {
  private readonly isBrowser: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  canActivate(): boolean | UrlTree {
    if (!this.isBrowser) {
      return true;
    }

    const context = this.authService.getMfaChallengeContext();
    if (!context?.mfaToken) {
      return this.router.parseUrl('/login');
    }

    return true;
  }
}