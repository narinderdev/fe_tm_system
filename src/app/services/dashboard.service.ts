import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: DashboardData;
}

export interface TechnicianDashboardResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: TechnicianDashboardData;
}

export interface SecurityDashboardResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: SecurityDashboardData;
}

export interface BudgetDashboardResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: BudgetDashboardData;
}

export interface BudgetDashboardData {
  workOrders?: BudgetWorkOrder[];
  totalEstimatedBudget?: number;
  totalActualBudget?: number;
  totalVarianceAmount?: number;
  totalVariancePercentage?: number;
  startDate?: string;
  endDate?: string;
}

export interface BudgetWorkOrder {
  id?: number;
  workOrderId?: string;
  workOrderNumber?: string;
  title?: string;
  status?: string;
  assetDbId?: number;
  assetId?: string;
  assetName?: string;
  estimatedLaborHours?: number;
  estimatedLaborCost?: number;
  estimatedMaterialCost?: number;
  estimatedBudget?: number;
  actualLaborHours?: number;
  actualLaborCost?: number;
  actualMaterialCost?: number;
  actualBudget?: number;
  varianceAmount?: number;
  variancePercentage?: number;
}

export interface SecurityDashboardData {
  thisWeek?: SecurityDashboardPeriodData;
  thisMonth?: SecurityDashboardPeriodData;
  thisYear?: SecurityDashboardPeriodData;
}

export interface SecurityDashboardPeriodData {
  period?: string;
  kpiSummary?: {
    newUsersAdded?: number;
    usersRemovedOrDisabled?: number;
    newRolesAdded?: number;
    roleChanges?: number;
    permissionChanges?: number;
  };
  recentUserActivity?: Array<{
    actionType?: string;
    targetUserName?: string;
    performedBy?: string;
    dateTime?: string;
    details?: string;
    status?: string;
  }>;
  rolePermissionChanges?: Array<{
    actionType?: string;
    roleName?: string;
    roleId?: number;
    performedBy?: string;
    dateTime?: string;
    addedPermissions?: string[];
    removedPermissions?: string[];
    details?: string;
  }>;
  securityLog?: Array<{
    eventType?: string;
    category?: string;
    targetType?: string;
    performedBy?: string;
    dateTime?: string;
    result?: string;
    targetName?: string;
    details?: string;
  }>;
}

export interface TechnicianDashboardData {
  totalTechnicians?: number;
  total_technicians?: number;
  availableToday?: number;
  available_today?: number;
  onLeave?: number;
  on_leave?: number;
  workOrders?: number;
  work_orders?: number;
  recentActivities?: TechnicianActivity[];
  recent_activities?: TechnicianActivity[];
}

export interface TechnicianActivity {
  technician?: string;
  technicianName?: string;
  name?: string;
  activity?: string;
  action?: string;
  title?: string;
  time?: string;
  timeAgo?: string;
  timestamp?: string;
  status?: string;
  state?: string;
}

export interface DashboardData {
  maintenance_cost_summary?: MaintenanceCostSummary;
  metadata?: DashboardMetadata;
  recent_work_orders?: RecentWorkOrder[];
  new_service_requests?: RecentServiceRequest[];
  summary_metrics?: SummaryMetrics;
  work_orders_by_status?: WorkOrdersByStatus;
  requests_not_accepted_count?: number;
}

export interface DashboardMetadata {
  generated_at?: string | null;
  data_freshness?: string | null;
}

export interface MaintenanceCostSummary {
  period?: string;
  data?: Array<MaintenanceCostDataPoint>;
}

export interface MaintenanceCostDataPoint {
  cost?: number;
  currency?: string;
  month?: string;
  unit?: string;
}

export interface SummaryMetrics {
  active_material_requisitions?: SummaryMetric;
  active_work_orders?: SummaryMetric;
  critical_assets_down?: SummaryMetric;
  open_service_requests?: SummaryMetric;
  requests_not_accepted_count?: SummaryMetric;
}

export interface SummaryMetric {
  change_direction?: string | null;
  change_percentage?: number | null;
  comparison_period?: string | null;
  count?: number;
}

export interface WorkOrdersByStatus {
  completed?: number;
  in_progress?: number;
  new?: number;
  total?: number;
}

export interface RecentWorkOrder {
  asset?: string | null;
  due_date?: string | null;
  priority?: string | null;
  status?: string | null;
  technician?: string | null;
  title?: string | null;
  wo_id?: string | null;
  wo_db_id?: number | null;
}

export interface RecentServiceRequest {
  asset?: string | null;
  priority?: string | null;
  status?: string | null;
  title?: string | null;
  requester?: string | null;
  request_date?: string | null;
  sr_id?: string | null;
  sr_db_id?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/api/dashboard`;
  private readonly securityDashboardUrl = `${environment.apiUrl}/api/security-dashboard`;

  constructor(private http: HttpClient) {}

  fetchDashboard(): Observable<DashboardApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<DashboardApiResponse>(this.apiUrl, { headers });
  }

  fetchTechnicianDashboard(): Observable<TechnicianDashboardResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<TechnicianDashboardResponse>(`${this.apiUrl}/technicians`, { headers });
  }

  fetchSecurityDashboard(period: string = 'THIS_WEEK', limit: number = 20): Observable<SecurityDashboardResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    const params = new HttpParams()
      .set('period', period)
      .set('limit', String(limit));
    return this.http.get<SecurityDashboardResponse>(this.securityDashboardUrl, { headers, params });
  }

  fetchWorkOrderBudget(filters?: {
    assetId?: string;
    workOrderId?: string;
    period?: string;
  }): Observable<BudgetDashboardResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    let params = new HttpParams();
    if (filters?.assetId?.trim()) {
      params = params.set('assetId', filters.assetId.trim());
    }
    if (filters?.workOrderId?.trim()) {
      params = params.set('workOrderId', filters.workOrderId.trim());
    }
    params = params.set('period', filters?.period?.trim() || 'THIS_MONTH');

    return this.http.get<BudgetDashboardResponse>(`${environment.apiUrl}/api/reports/work-orders/budget`, {
      headers,
      params
    });
  }
}
