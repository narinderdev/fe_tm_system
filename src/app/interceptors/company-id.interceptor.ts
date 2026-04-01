import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable()
export class CompanyIdInterceptor implements HttpInterceptor {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isBrowser) {
      return next.handle(req);
    }

    const url = (req.url || '').toLowerCase();
    if (url.includes('/auth')) {
      return next.handle(req);
    }

    if (req.params.has('companyId')) {
      return next.handle(req);
    }

    const companyId = this.resolveSelectedCompanyId();

    if (!companyId) {
      return next.handle(req);
    }

    const normalizedApiUrl = String(environment.apiUrl ?? '').trim();
    const isApiCall = normalizedApiUrl ? req.url.startsWith(normalizedApiUrl) : true;
    if (!isApiCall) {
      return next.handle(req);
    }

    const companyReq = req.clone({
      params: req.params.set('companyId', companyId)
    });

    return next.handle(companyReq);
  }

  private resolveSelectedCompanyId(): string {
    const selectedId = String(localStorage.getItem('selectedCompanyId') ?? '').trim();
    if (selectedId) {
      return selectedId;
    }

    // Backward-compatibility for sessions created before selectedCompanyId existed.
    const selectedNumber = String(localStorage.getItem('selectedCompanyNumber') ?? '').trim();
    const selectedLegalName = String(localStorage.getItem('selectedCompanyLegalName') ?? '').trim();
    const selectedTradeName = String(localStorage.getItem('selectedCompanyTradeName') ?? '').trim();
    const rawCompanies = String(localStorage.getItem('userCompanies') ?? '').trim();
    if (!rawCompanies) {
      return '';
    }

    try {
      const parsed = JSON.parse(rawCompanies);
      if (!Array.isArray(parsed)) {
        return '';
      }

      const matched = parsed.find((company: any) =>
        String(company?.company_number ?? company?.companyNumber ?? '').trim() === selectedNumber
        && (
          (!!selectedLegalName
            && String(
              company?.company_legal_name ?? company?.companyLegalName ?? company?.company_legalName ?? company?.legal_name ?? ''
            ).trim() === selectedLegalName)
          || String(company?.company_trade_name ?? company?.companyTradeName ?? company?.trade_name ?? '').trim() === selectedTradeName
        )
      );
      const matchedId = String(matched?.id ?? '').trim();
      if (!matchedId) {
        return '';
      }

      localStorage.setItem('selectedCompanyId', matchedId);
      return matchedId;
    } catch {
      return '';
    }
  }
}
