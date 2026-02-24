import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApproveWorkOrderRequest {
  approvedBy: string;
  estimatedLaborHours?: number;
  estimatedMaterialCost?: number;
  approvalNotes?: string;
  laborGlAccount?: string;
  laborUtilityAccount?: string;
  inventoryGlAccount?: string;
  inventoryUtilityAccount?: string;
}

export interface PlannedMaterialPayload {
  inventoryItemId: number;
  quantity: number;
  uom: string;
  notes?: string;
}

export interface ScheduleWorkOrderRequest {
  assignedTechnicianId?: number;
  assignedTeamId?: number;
  plannedStartDate?: string;
  plannedStartTime?: string;
  plannedEndDate?: string;
  plannedEndTime?: string;
  totalDaysRequired?: number;
  totalHoursRequired?: number;
  planner?: string;
  preCheckNotes?: string;
  plannedMaterials?: PlannedMaterialPayload[];
}

export interface StartInProgressRequest {
  technicianId?: number;
  teamId?: number;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
}

export interface CheckInRequest {
  technicianId?: number;
  teamId?: number;
  checkInAt: string;
  notes?: string;
}

export interface CheckOutRequest {
  technicianId?: number;
  teamId?: number;
  checkOutAt: string;
  notes?: string;
}

export interface TeamCheckTechnicianEntry {
  technicianId: number;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
}

export interface TeamCheckRequest {
  teamId: number;
  technicians: TeamCheckTechnicianEntry[];
}

export interface CompleteLaborEntry {
  technicianId?: number;
  laborHours?: number;
  hourlyRate?: number;
  laborDate?: string;
  notes?: string;
}

export interface CompleteMaterialUsed {
  inventoryItemId?: number;
  quantityUsed?: number;
  notes?: string;
}

export interface CompleteWorkOrderRequest {
  actualStartDateTime?: string;
  actualEndDateTime?: string;
  completionNotes?: string;
  failureCause?: string;
  remedyAction?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  laborEntries?: CompleteLaborEntry[];
  materialsUsed?: CompleteMaterialUsed[];
}

export interface CloseWorkOrderRequest {
  supervisorNotes?: string;
}

export interface InvoiceTechnicianRate {
  technicianId: number;
  hourlyRate: number;
}

export interface CreateInvoiceRequest {
  companyName: string;
  companyAddress: string;
  contactName: string;
  contactNumber: string;
  invoiceDate: string;
  dueDate: string;
  currencySymbol: string;
  technicianRates: InvoiceTechnicianRate[];
}

export interface CreateWorkOrderRequest {
  assetId?: number | null;
  assetName?: string;
  assetSerialNumber?: string;
  assetModelNumber?: string;
  assetManufactureDate?: string;
  location?: string;
  workType: string;
  priority: string;
  woTitle: string;
  descriptionScope: string;
  targetCompletionDate: string;
  attachmentUrl?: string;
  workRequestTypeCode?: string;
  workOrderTypeId?: number;
  glAccount?: string;
  utilityAccount?: string;
}

interface WorkOrdersApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    workOrders?: ApiWorkOrder[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    last?: boolean;
  };
}

interface ApiWorkOrder {
  id?: number;
  workOrderId?: string;
  assetId?: string;
  assetName?: string;
  technician?: string;
  assignedTechnician?: string;
  priority?: string;
  woTitle?: string;
  status?: string;
  plannedEndDateTime?: string;
  targetCompletionDate?: string;
}

export interface WorkOrderType {
  id?: number;
  workOrderType?: string;
  defaultGlAccount?: string;
  defaultUtilityAccount?: string;
  costTreatment?: string;
  laborGlAccount?: string;
  laborUtilityAccount?: string;
  inventoryGlAccount?: string;
  inventoryUtilityAccount?: string;
  createAsset?: boolean;
  propertyUnit?: string;
  propertyGroup?: string;
  retirementUnit?: string;
  functionalClass?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkOrderTypeResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    content?: WorkOrderType[];
    totalElements?: number;
    totalPages?: number;
    size?: number;
    number?: number;
  };
}

interface WorkOrderTypeDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: WorkOrderType;
}

interface ApiPlannedMaterial {
  id?: number;
  inventoryItemId?: number;
  itemId?: string;
  itemName?: string;
  quantityPlanned?: number;
  unitCostSnapshot?: number;
  totalCostSnapshot?: number;
  notes?: string;
}

interface ApiLaborEntry {
  id?: number;
  technicianId?: number;
  technicianName?: string;
  laborHours?: number;
  hourlyRate?: number;
  laborCost?: number;
  laborDate?: string;
  notes?: string;
}

interface ApiMaterialUsage {
  id?: number;
  inventoryItemId?: number;
  itemId?: string;
  itemName?: string;
  quantityUsed?: number;
  unitCostSnapshot?: number;
  totalCostSnapshot?: number;
  notes?: string;
}

export interface ApiWorkOrderDetail extends ApiWorkOrder {
  linkedServiceRequestDbId?: number;
  linkedServiceRequestId?: string;
  assetDbId?: number;
  assetSerialNumber?: string;
  assetModelNumber?: string;
  assetManufactureDate?: string;
  location?: string;
  workType?: string;
  workRequestTypeCode?: string;
  workRequestTypeDescription?: string;
  descriptionScope?: string;
  planner?: string;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  assignedTeamId?: number;
  assignedTeamName?: string;
  plannedStartDateTime?: string;
  plannedEndDateTime?: string;
  actualStartDateTime?: string;
  actualEndDateTime?: string;
  targetCompletionDate?: string;
  estimatedLaborHours?: number;
  estimatedLaborCost?: number;
  estimatedMaterialCost?: number;
  estimatedTotalCost?: number;
  actualLaborHours?: number;
  actualWorkingHours?: number;
  actualLaborCost?: number;
  actualMaterialCost?: number;
  actualTotalCost?: number;
  approvalNotes?: string;
  precheckNotes?: string;
  completionNotes?: string;
  failureCause?: string;
  remedyAction?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  supervisorNotes?: string;
  plannedMaterials?: ApiPlannedMaterial[];
  status?: string;
  source?: string;
  laborEntries?: ApiLaborEntry[];
  materialUsages?: ApiMaterialUsage[];
  warrantyLifecycle?: {
    commissioningDate?: string;
    warrantyStart?: string;
    warrantyEnd?: string;
    warrantyProvider?: string;
    serviceContract?: string | null;
    expectedUsefulLifeYears?: number | null;
    plannedReplacementDate?: string;
    lastMaintenanceDate?: string;
    nextPlannedMaintenance?: string;
  };
  notes?: string;
  activities?: Array<{ title?: string; status?: string; dueDate?: string }>;
  scheduledCompletionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  checklistItems?: Array<Record<string, unknown>>;
  checkLogs?: Array<Record<string, unknown>>;
  teamMembers?: Array<{
    email?: string;
    teamLeader?: boolean;
    technicianId?: number;
    technicianName?: string;
  }>;
  workOrderTypeId?: number;
  glAccount?: string;
  utilityAccount?: string;
}

export interface WorkOrderDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiWorkOrderDetail;
}

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService {
  private readonly apiUrl = `${environment.apiUrl}/api/work-orders`;
  private readonly workOrderTypesUrl = `${environment.apiUrl}/api/work-order-types`;

  constructor(private http: HttpClient) {}

  getAvailabilityTimeSlots(payload: {
    startDate: string;
    endDate: string;
    daysRequired: number;
    hoursRequired: number;
    teamId?: number;
    technicianId?: number;
  }): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.post<any>(`${this.apiUrl}/availability/time-slots`, payload, { headers });
  }

  getTechnicianAvailability(
    technicianId: number,
    payload:
      | { startDate: string; endDate: string; daysRequired: number; hoursRequired: number }
      | { fromDate: string; toDate: string; slotMinutes: number }
  ): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.post<any>(`${this.apiUrl}/availability/technician/${technicianId}`, payload, { headers });
  }

  getTeamAvailability(
    teamId: number,
    payload:
      | { startDate: string; endDate: string; daysRequired: number; hoursRequired: number }
      | { fromDate: string; toDate: string; slotMinutes: number }
  ): Observable<any> {
    const headers = new HttpHeaders({ 'ngrok-skip-browser-warning': 'true' });
    return this.http.post<any>(`${this.apiUrl}/availability/team/${teamId}`, payload, { headers });
  }

  fetchWorkOrders(page: number, size: number): Observable<WorkOrdersApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<WorkOrdersApiResponse>(this.apiUrl, { params, headers });
  }

  fetchWorkOrderTypes(page: number, size: number): Observable<WorkOrderTypeResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<WorkOrderTypeResponse>(this.workOrderTypesUrl, { params, headers });
  }

  createWorkOrderType(payload: WorkOrderType): Observable<WorkOrderTypeResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderTypeResponse>(this.workOrderTypesUrl, payload, { headers });
  }

  updateWorkOrderType(id: number | string, payload: WorkOrderType): Observable<WorkOrderTypeResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.patch<WorkOrderTypeResponse>(`${this.workOrderTypesUrl}/${id}`, payload, { headers });
  }

  deleteWorkOrderType(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.delete<void>(`${this.workOrderTypesUrl}/${id}`, { headers });
  }

  fetchWorkOrderTypeById(id: number | string): Observable<WorkOrderTypeDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<WorkOrderTypeDetailResponse>(`${this.workOrderTypesUrl}/${id}`, { headers });
  }

  fetchWorkOrdersForTechnician(
    technicianId: number,
    page: number,
    size: number
  ): Observable<WorkOrdersApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('technicianId', technicianId.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<WorkOrdersApiResponse>(`${this.apiUrl}/assigned-to-technician`, {
      params,
      headers
    });
  }

  fetchWorkOrderById(id: string): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<WorkOrderDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  deleteWorkOrder(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  createWorkOrder(payload: CreateWorkOrderRequest): Observable<unknown> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post(this.apiUrl, payload, { headers });
  }

  updateWorkOrder(id: number | string, payload: CreateWorkOrderRequest): Observable<unknown> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch(`${this.apiUrl}/${id}`, payload, { headers });
  }

  approveWorkOrder(id: number | string, payload: ApproveWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/approve`, payload, { headers });
  }

  scheduleWorkOrder(id: number | string, payload: ScheduleWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/schedule`, payload, { headers });
  }

  startInProgress(id: number | string, payload: StartInProgressRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/in-progress`, payload, { headers });
  }

  checkIn(id: number | string, payload: CheckInRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/check-in`, payload, { headers });
  }

  checkOut(id: number | string, payload: CheckOutRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/check-out`, payload, { headers });
  }

  checkInTeam(id: number | string, payload: TeamCheckRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/team/check-in`, payload, { headers });
  }

  checkOutTeam(id: number | string, payload: TeamCheckRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/team/check-out`, payload, { headers });
  }

  completeWorkOrder(id: number | string, payload: CompleteWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/complete`, payload, { headers });
  }

  closeWorkOrder(id: number | string, payload: CloseWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/close`, payload, { headers });
  }

  createInvoice(id: number | string, payload: CreateInvoiceRequest): Observable<Blob> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(`${this.apiUrl}/${id}/invoice`, payload, {
      headers,
      responseType: 'blob'
    });
  }

  pauseWorkOrder(id: number | string): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/pause`, {}, { headers });
  }

  resumeWorkOrder(id: number | string): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/resume`, {}, { headers });
  }

  pauseWorkOrderTeam(id: number | string): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/team/pause`, {}, { headers });
  }

  resumeWorkOrderTeam(id: number | string): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/team/resume`, {}, { headers });
  }
}

