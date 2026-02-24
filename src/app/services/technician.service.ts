import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiTechnician {
  id?: number;
  technicianId?: string;
  badgeNumber?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  technicianType?: string;
  skills?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  status?: string;
  hireDate?: string;
  workShift?: string;
  certifications?: string;
  certificateIssueDate?: string;
  certificateExpiryDate?: string;
  terminationDate?: string;
  technicianPhotoUrl?: string;
  certificateUrl?: string;
  notes?: string;
  teamId?: number;
  teamName?: string;
  teamLeader?: boolean;
  teamMemberships?: Array<{
    teamId?: number;
    teamLeader?: boolean;
    teamName?: string;
    teamLeaderNames?: string[];
  }>;
}

export interface TechnicianListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    technicians?: ApiTechnician[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    last?: boolean;
  };
}

export interface TechnicianTeamMember {
  id?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  technicianType?: string;
  skills?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  status?: string;
  hireDate?: string;
  workShift?: string;
  certifications?: string;
  notes?: string;
  teamId?: number;
  teamName?: string;
  teamLeader?: boolean;
}

export interface TechnicianTeam {
  id?: number;
  teamName?: string;
  teamDescription?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  teamLeaderId?: number | null;
  teamLeaderName?: string;
  technicians?: TechnicianTeamMember[];
}

export interface TechnicianTeamResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    teams?: TechnicianTeam[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    last?: boolean;
  };
}

export interface TechnicianTeamDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: TechnicianTeam;
}

export interface CreateTechnicianPayload {
  technicianId?: string;
  badgeNumber?: string;
  firstName: string;
  lastName: string;
  technicianType: string;
  skills: string;
  phoneNumber: string;
  email: string;
  address: string;
  status: string;
  hireDate: string;
  workShift: string;
  certifications: string;
  certificateIssueDate?: string;
  certificateExpiryDate?: string;
  terminationDate?: string;
  technicianPhotoUrl?: string;
  certificateUrl?: string;
  attachmentUrl?: string;
  notes: string;
  teamId?: number;
  teamLeader?: boolean;
}

export interface CreateTechnicianTeamPayload {
  teamName: string;
  status: string;
  startDate?: string;
  endDate?: string;
  teamDescription?: string;
  notes?: string;
  technicianIds?: number[];
  teamLeaderId?: number | null;
}

export interface TechnicianCreateResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiTechnician;
}

@Injectable({
  providedIn: 'root'
})
export class TechnicianService {
  private readonly apiUrl = `${environment.apiUrl}/api/technicians`;
  private readonly teamsUrl = `${environment.apiUrl}/api/technician-teams`;

  constructor(private readonly http: HttpClient) {}

  fetchTechnicians(page = 0, size = 10): Observable<TechnicianListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<TechnicianListResponse>(this.apiUrl, { params, headers });
  }

  createTechnician(payload: CreateTechnicianPayload): Observable<TechnicianCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<TechnicianCreateResponse>(this.apiUrl, payload, { headers });
  }

  fetchTechnicianById(id: number | string): Observable<TechnicianCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<TechnicianCreateResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  updateTechnician(id: number | string, payload: CreateTechnicianPayload): Observable<TechnicianCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.patch<TechnicianCreateResponse>(`${this.apiUrl}/${id}`, payload, { headers });
  }

  deleteTechnician(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  fetchTechnicianTeams(page = 0, size = 20): Observable<TechnicianTeamResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<TechnicianTeamResponse>(this.teamsUrl, { params, headers });
  }

  fetchTechnicianTeamById(id: number | string): Observable<TechnicianTeamDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<TechnicianTeamDetailResponse>(`${this.teamsUrl}/${id}`, { headers });
  }

  updateTechnicianTeam(id: number | string, payload: CreateTechnicianTeamPayload): Observable<TechnicianTeamDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.patch<TechnicianTeamDetailResponse>(`${this.teamsUrl}/${id}`, payload, { headers });
  }

  deleteTechnicianTeam(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.delete<void>(`${this.teamsUrl}/${id}`, { headers });
  }

  createTechnicianTeam(payload: CreateTechnicianTeamPayload): Observable<TechnicianTeamResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<TechnicianTeamResponse>(this.teamsUrl, payload, { headers });
  }

  fetchTechnicianMonthlyAvailability(technicianId: number | string, days = 31): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    const params = new HttpParams().set('days', days.toString());
    return this.http.get(`${this.apiUrl}/${technicianId}/availability/monthly`, { headers, params });
  }

  createHoliday(payload: { holidayName: string; holidayType: string; holidayDate: string; notes?: string }): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(`${environment.apiUrl}/api/holidays`, payload, { headers });
  }

  fetchHolidays(page = 0, size = 50, startDate?: string, endDate?: string): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    let params = new HttpParams().set('page', page).set('size', size);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get(`${environment.apiUrl}/api/holidays`, { headers, params });
  }

  fetchHolidayById(id: number | string): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.get(`${environment.apiUrl}/api/holidays/${id}`, { headers });
  }

  fetchTechnicianLeaves(technicianId: number | string): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.get(`${environment.apiUrl}/api/technicians/${technicianId}/leaves`, { headers });
  }

  createLeave(
    technicianId: number | string,
    payload: { startDate: string; endDate: string; reason: string; leaveType?: string }
  ): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.post(`${environment.apiUrl}/api/technicians/${technicianId}/leaves`, payload, { headers });
  }

  updateLeave(
    technicianId: number | string,
    leaveId: number | string,
    payload: { startDate: string; endDate: string; reason: string; leaveType?: string }
  ): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.patch(`${environment.apiUrl}/api/technicians/${technicianId}/leaves/${leaveId}`, payload, { headers });
  }

  deleteLeave(technicianId: number | string, leaveId: number | string): Observable<void> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.delete<void>(`${environment.apiUrl}/api/technicians/${technicianId}/leaves/${leaveId}`, { headers });
  }

  updateHoliday(id: number | string, payload: { holidayName: string; holidayType: string; holidayDate: string; notes?: string }): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.patch(`${environment.apiUrl}/api/holidays/${id}`, payload, { headers });
  }

  deleteHoliday(id: number | string): Observable<void> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.delete<void>(`${environment.apiUrl}/api/holidays/${id}`, { headers });
  }

  fetchLeaves(page = 0, size = 50, startDate?: string, endDate?: string): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    let params = new HttpParams().set('page', page).set('size', size);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get(`${environment.apiUrl}/api/technicians/leaves`, { headers, params });
  }
}
