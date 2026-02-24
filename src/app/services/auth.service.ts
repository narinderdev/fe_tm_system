import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface LoginPayload {
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

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<LoginResponse>(this.apiUrl, payload, { headers });
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

  sendEmailMfaCodeForEmail(payload: SendEmailMfaCodePayload): Observable<ApiResponse> {
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
