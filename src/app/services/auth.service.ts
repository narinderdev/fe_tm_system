import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  token?: string;
  data?: {
    token?: string;
    [key: string]: unknown;
  };
}

export interface MfaChallengeContext {
  mfaToken: string;
  email?: string;
  userId?: number | string;
  challengeId?: string;
}

export interface ApiResponse<T = unknown> {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: T;
}

export interface VerifyAccountPayload {
  email: string;
  otp: string;
}

export interface VerifySignupPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  newPassword: string;
}

export interface SendEmailMfaCodePayload {
  email: string;
}

export interface VerifyEmailMfaCodePayload {
  email: string;
  code: string;
}

export interface SendLoginEmailOtpPayload {
  email: string;
}

export interface VerifyLoginEmailOtpPayload {
  email: string;
  code: string;
}

export interface MfaSetupResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    secret?: string;
    qrCodeImage?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly mfaChallengeStorageKey = 'mfa_challenge_context';

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<LoginResponse>(this.apiUrl, payload, { headers });
  }

  startLogin(payload: LoginPayload): Observable<LoginResponse> {
    return this.login(payload);
  }

  setMfaChallengeContext(context: MfaChallengeContext): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const normalized: MfaChallengeContext = {
      mfaToken: String(context?.mfaToken ?? '').trim(),
      email: context?.email ? String(context.email).trim().toLowerCase() : undefined,
      userId: context?.userId,
      challengeId: context?.challengeId ? String(context.challengeId).trim() : undefined
    };

    if (!normalized.mfaToken) {
      this.clearMfaChallengeContext();
      return;
    }

    localStorage.setItem(this.mfaChallengeStorageKey, JSON.stringify(normalized));
    localStorage.setItem('mfa_token', normalized.mfaToken);
    localStorage.setItem('mfaEnabled', 'true');
    localStorage.setItem('authenticatorVerified', 'false');
    if (normalized.email) {
      localStorage.setItem('loginEmail', normalized.email);
    }
  }

  getMfaChallengeContext(): MfaChallengeContext | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(this.mfaChallengeStorageKey);
    if (!raw) {
      const tokenFallback = String(localStorage.getItem('mfa_token') ?? '').trim();
      if (!tokenFallback) {
        return null;
      }
      return {
        mfaToken: tokenFallback,
        email: String(localStorage.getItem('loginEmail') ?? '').trim().toLowerCase() || undefined
      };
    }

    try {
      const parsed = JSON.parse(raw) as MfaChallengeContext;
      const mfaToken = String(parsed?.mfaToken ?? '').trim();
      if (!mfaToken) {
        return null;
      }
      return {
        mfaToken,
        email: parsed?.email ? String(parsed.email).trim().toLowerCase() : undefined,
        userId: parsed?.userId,
        challengeId: parsed?.challengeId ? String(parsed.challengeId).trim() : undefined
      };
    } catch {
      return null;
    }
  }

  clearMfaChallengeContext(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(this.mfaChallengeStorageKey);
    localStorage.removeItem('mfa_token');
  }

  logout(token?: string): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/logout`, {}, { headers });
  }

  verifyAccount(payload: VerifyAccountPayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/verify-account`, payload, { headers });
  }

  getMfaSetup(): Observable<MfaSetupResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      ...(this.getAuthHeader() ? { Authorization: this.getAuthHeader() } : {})
    });
    return this.http.get<MfaSetupResponse>(`${environment.apiUrl}/api/mfa/setup`, { headers });
  }

  verifyMfaSetup(code: string): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      ...(this.getAuthHeader() ? { Authorization: this.getAuthHeader() } : {})
    });
    return this.http.post<ApiResponse>(`${environment.apiUrl}/api/mfa/verify-setup`, { code }, { headers });
  }

  disableMfa(code: string): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      ...(this.getAuthHeader() ? { Authorization: this.getAuthHeader() } : {})
    });
    return this.http.post<ApiResponse>(`${environment.apiUrl}/api/mfa/disable`, { code }, { headers });
  }

  sendEmailMfaCode(): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      ...(this.getAuthHeader() ? { Authorization: this.getAuthHeader() } : {})
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/mfa/email/send`, {}, { headers });
  }

  signup(payload: SignupPayload): Observable<ApiResponse<{ id?: number }>> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse<{ id?: number }>>(`${this.apiUrl}/signup`, payload, { headers });
  }

  verifySignup(payload: VerifySignupPayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/signup/verify`, payload, { headers });
  }

  sendEmailMfaCodeForEmail(payload: SendEmailMfaCodePayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/mfa/email/send`, payload, { headers });
  }

  sendLoginEmailOtp(payload: SendLoginEmailOtpPayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/mfa/email/send`, payload, { headers });
  }

  verifyEmailMfaCode(code: string): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      ...(this.getAuthHeader() ? { Authorization: this.getAuthHeader() } : {})
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/mfa/email/verify`, { code }, { headers });
  }

  verifyEmailMfaCodeForEmail(payload: VerifyEmailMfaCodePayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/mfa/email/verify`, payload, { headers });
  }

  verifyLoginEmailOtp(payload: VerifyLoginEmailOtpPayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/mfa/email/verify`, payload, { headers });
  }

  verifyEmailMfaCodePublic(code: string): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/mfa/email/verify`, { code }, { headers });
  }

  verifyLoginMfa(code: string, mfaToken: string): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/login/mfa`, { code, mfa_token: mfaToken }, { headers });
  }

  verifyMfaCode(code: string): Observable<ApiResponse> {
    const context = this.getMfaChallengeContext();
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    const payload: { code: string; mfa_token?: string; user_id?: number | string; challenge_id?: string } = { code };
    if (context?.mfaToken) {
      payload.mfa_token = context.mfaToken;
    }
    if (context?.userId !== undefined && context?.userId !== null) {
      payload.user_id = context.userId;
    }
    if (context?.challengeId) {
      payload.challenge_id = context.challengeId;
    }

    return this.http.post<ApiResponse>(`${this.apiUrl}/login/mfa`, payload, { headers });
  }

  completeLogin(response: any): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const token =
      response?.data?.token ??
      response?.token ??
      response?.data?.authToken ??
      response?.authToken ??
      null;

    if (token) {
      localStorage.setItem('authToken', String(token));
    }

    const role = response?.data?.user?.role ?? response?.data?.role ?? null;
    if (role) {
      localStorage.setItem('userRole', String(role));
    }

    const userId = response?.data?.user?.id ?? response?.data?.userId ?? null;
    if (userId !== null && userId !== undefined && String(userId).trim().length) {
      localStorage.setItem('userId', String(userId));
    }

    localStorage.setItem('emailOtpVerified', 'true');
    localStorage.setItem('mfaEnabled', 'true');
    localStorage.setItem('authenticatorVerified', 'true');
    this.clearMfaChallengeContext();
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/forgot-password`, payload, { headers });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${environment.apiUrl}/users/forgot-password`, payload, { headers });
  }

  private getAuthHeader(): string {
    if (typeof localStorage === 'undefined') return '';
    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('authtoken') ||
      localStorage.getItem('token') ||
      '';
    if (!token) return '';
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
}
