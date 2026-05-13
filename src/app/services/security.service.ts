import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SecurityRoleItem {
  id?: number | string;
  name?: string;
  description?: string;
  status?: string;
  active?: boolean;
}

export interface SecurityUserItem {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  status?: string;
  active?: boolean;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  technicianRole: boolean;
  permissionCodes: string[];
}

export interface PermissionApiItem {
  id?: number;
  code?: string;
  name?: string;
}

export interface PermissionApiObject {
  name?: string;
  permissions?: PermissionApiItem[];
}

export interface PermissionApiClass {
  name?: string;
  objects?: PermissionApiObject[];
}

export interface SecurityReportQuery {
  companyId: number | string;
  role?: string;
  object?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  fetchRoles(companyId: number | string, page = 0, size = 10, search = '', status = ''): Observable<any> {
    let params = new HttpParams()
      .set('companyId', String(companyId))
      .set('page', String(page))
      .set('size', String(size));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (status.trim()) {
      params = params.set('status', status.trim());
    }
    return this.http.get(`${this.baseUrl}/api/roles`, { headers: this.buildHeaders(), params });
  }

  fetchRoleById(id: number | string, companyId: number | string): Observable<any> {
    const params = new HttpParams().set('companyId', String(companyId));
    return this.http.get(`${this.baseUrl}/api/roles/${id}`, { headers: this.buildHeaders(), params });
  }

  createRole(companyId: number | string, payload: CreateRolePayload): Observable<any> {
    const params = new HttpParams().set('companyId', String(companyId));
    return this.http.post(`${this.baseUrl}/api/roles`, payload, { headers: this.buildHeaders(), params });
  }

  fetchUsers(page = 0, size = 10, search = '', status = ''): Observable<any> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (status.trim()) {
      params = params.set('status', status.trim());
    }
    return this.http.get(`${this.baseUrl}/auth/users`, { headers: this.buildHeaders(), params });
  }

  fetchPermissions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/permissions`, { headers: this.buildHeaders() });
  }

  fetchSecurityRoleReport(companyId: number | string): Observable<any> {
    const params = new HttpParams().set('companyId', String(companyId));
    return this.http.get(`${this.baseUrl}/api/reports/security/roles`, { headers: this.buildHeaders(), params });
  }

  fetchSecurityReportByRole(query: SecurityReportQuery): Observable<any> {
    let params = new HttpParams().set('companyId', String(query.companyId));
    if (query.role && query.role !== 'ALL') {
      params = params.set('role', query.role);
    }
    if (query.object && query.object !== 'ALL') {
      params = params.set('object', query.object);
    }
    return this.http.get(`${this.baseUrl}/api/reports/security/roles`, { headers: this.buildHeaders(), params });
  }

  fetchSecurityReportByObject(query: SecurityReportQuery): Observable<any> {
    let params = new HttpParams().set('companyId', String(query.companyId));
    if (query.role && query.role !== 'ALL') {
      params = params.set('role', query.role);
    }
    if (query.object && query.object !== 'ALL') {
      params = params.set('object', query.object);
    }
    return this.http.get(`${this.baseUrl}/api/reports/security/objects`, { headers: this.buildHeaders(), params });
  }

  exportSecurityReport(mode: 'role' | 'object', query: SecurityReportQuery, format: 'csv' | 'excel' | 'pdf' = 'csv'): Observable<Blob> {
    let params = new HttpParams().set('companyId', String(query.companyId));
    if (query.role && query.role !== 'ALL') {
      params = params.set('role', query.role);
    }
    if (query.object && query.object !== 'ALL') {
      params = params.set('object', query.object);
    }
    params = params
      .set('format', String(format).toUpperCase())
      .set('fileType', String(format).toUpperCase());
    const endpoint = mode === 'object'
      ? `${this.baseUrl}/api/reports/security/objects/export`
      : `${this.baseUrl}/api/reports/security/roles/export`;
    return this.http.get(endpoint, { headers: this.buildHeaders(), params, responseType: 'blob' });
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }
}
