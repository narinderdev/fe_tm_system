import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface InviteUserPayload {
  firstName: string;
  lastName: string;
  email: string;
}

export interface SetPasswordPayload {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  inviteUser(payload: InviteUserPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/invitations/technicians`, payload, { headers: this.buildHeaders() });
  }

  setPassword(payload: SetPasswordPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/invitations/set-password`, payload, { headers: this.buildHeaders() });
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }
}
