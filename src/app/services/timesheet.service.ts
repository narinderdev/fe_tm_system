import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimesheetRowPayload {
  date: string;
  day_of_week: string;
  pay_code: string;
  hours: number;
  daily_total: number;
  department: string;
  account: string;
  project: string;
  comment: string;
  is_deleted: boolean;
}

export interface TimesheetDayRowPayload {
  entry_type: string;
  pay_code?: string;
  hours?: number;
  company_number?: string;
  expense_code?: string;
  accounting_unit: string;
  ferc: string;
  activity: string;
  comment: string;
  is_deleted: boolean;
}

export interface TimesheetDayPayload {
  date: string;
  day_of_week: string;
  daily_total: number;
  rows: TimesheetDayRowPayload[];
}

export interface TimesheetSubmitPayload {
  period_start_date: string;
  period_end_date: string;
  view_type: string;
  technician_id: number;
  total_worked: number;
  total_non_worked: number;
  total_premium: number;
  totalWorked?: number;
  totalNonWorked?: number;
  totalPremium?: number;
  timesheet_days?: TimesheetDayPayload[];
  timesheet_rows?: TimesheetRowPayload[];
  save_as_template?: boolean;
}

export interface TimesheetRowResponse {
  id: number;
  date: string;
  technician_id: number;
  work_order_id: number;
  day_of_week: string;
  pay_code: string;
  hours: number;
  daily_total: number;
  department: string;
  account: string;
  project: string;
  comment: string;
  is_deleted: boolean;
}

export interface TimesheetResponse {
  id: number;
  period_start_date: string;
  period_end_date: string;
  view_type: string;
  timesheet_rows: TimesheetRowResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class TimesheetService {
  private readonly apiUrl = `${environment.apiUrl}/api/timesheets`;

  constructor(private readonly http: HttpClient) {}

  submitTimesheet(payload: TimesheetSubmitPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(this.apiUrl, payload, { headers });
  }

  saveTimesheetDraft(technicianId: number, payload: TimesheetSubmitPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    const params = new HttpParams().set('technicianId', String(technicianId));
    return this.http.post(`${this.apiUrl}/drafts`, payload, { headers, params });
  }

  fetchTimesheetById(id: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get(`${this.apiUrl}/${id}`, { headers });
  }

  fetchTimesheets(): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get(this.apiUrl, { headers });
  }

  fetchTimesheetsByTechnician(technicianId: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get(`${this.apiUrl}/technicians/${technicianId}`, { headers });
  }

  fetchRecentEntryByTechnician(technicianId: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get(`${this.apiUrl}/technicians/${technicianId}/recent-entry`, { headers });
  }

  fetchDraftByTechnicianAndPeriod(technicianId: number, periodStartDate: string, periodEndDate: string): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    const query = `period_start_date=${encodeURIComponent(periodStartDate)}&period_end_date=${encodeURIComponent(periodEndDate)}`;
    return this.http.get(`${this.apiUrl}/drafts/technicians/${technicianId}?${query}`, { headers });
  }

  updateTimesheet(id: number, payload: TimesheetSubmitPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.put(`${this.apiUrl}/${id}`, payload, { headers });
  }

  approveTimesheet(id: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(`${this.apiUrl}/${id}/approve`, {}, { headers });
  }

  sendBackTimesheet(id: number, payload: any): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(`${this.apiUrl}/${id}/send-back`, payload, { headers });
  }
}
