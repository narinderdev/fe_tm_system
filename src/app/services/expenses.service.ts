import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExpenseListItem {
  id: number;
  date: string;
  expense_code: string;
  description: string;
  amount: number;
  user_id: number;
  user_first_name?: string;
  user_last_name?: string;
  user_name?: string;
  work_order_id?: number;
  status?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateExpensePayload {
  date: string;
  expense_code: string;
  description: string;
  amount: number;
  user_id: number;
  work_order_id: number;
  work_order_name: string;
  work_order_type: string;
  department: string;
  account: string;
  expense_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private readonly apiUrl = `${environment.apiUrl}/api/expenses`;

  constructor(private readonly http: HttpClient) {}

  fetchExpenses(status?: string): Observable<ExpenseListItem[] | { data?: ExpenseListItem[] }> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    let params = new HttpParams();
    const normalizedStatus = String(status ?? '').trim();
    if (normalizedStatus) {
      params = params.set('status', normalizedStatus);
    }

    return this.http.get<ExpenseListItem[] | { data?: ExpenseListItem[] }>(this.apiUrl, { headers, params });
  }

  fetchExpensesByUser(userId: number, status?: string): Observable<ExpenseListItem[] | { data?: ExpenseListItem[] }> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    let params = new HttpParams();
    const normalizedStatus = String(status ?? '').trim();
    if (normalizedStatus) {
      params = params.set('status', normalizedStatus);
    }

    return this.http.get<ExpenseListItem[] | { data?: ExpenseListItem[] }>(`${this.apiUrl}/users/${userId}`, {
      headers,
      params
    });
  }

  fetchExpenseById(id: number | string): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get(`${this.apiUrl}/${id}`, { headers });
  }

  createExpense(payload: CreateExpensePayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(this.apiUrl, payload, { headers });
  }

  approveExpense(id: number | string): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(`${this.apiUrl}/${id}/approve`, {}, { headers });
  }
}
