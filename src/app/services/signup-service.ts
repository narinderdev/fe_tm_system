import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from './auth.service';

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignupService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  verifyOtp(payload: VerifyOtpPayload): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/signup/verify`, payload, { headers });
  }
}