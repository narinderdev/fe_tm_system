import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimesheetRowPayload {
  date: string;
  technician_id: number;
  work_order_id: number;
  day_of_week: string;
  pay_code: string;
  hours: number;
  daily_total: number;
  accounting_unit: string;
  ferc: string;
  activity: string;
  comment: string;
  is_deleted: boolean;
}

export interface TimesheetSubmitPayload {
  period_start_date: string;
  period_end_date: string;
  view_type: string;
  timesheet_rows: TimesheetRowPayload[];
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
}
