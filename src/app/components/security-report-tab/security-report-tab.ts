import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, take } from 'rxjs';
import { Loader } from '../loader/loader';
import { SecurityService } from '../../services/security.service';

@Component({
  selector: 'app-security-report-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './security-report-tab.html',
  styleUrls: ['./security-report-tab.css']
})
export class SecurityReportTabComponent implements OnInit {
  loading = false;
  error = '';
  viewMode: 'role' | 'object' = 'role';
  selectedRole = 'ALL';
  selectedObject = 'ALL';
  companyId = '';
  roles: string[] = [];
  objects: string[] = [];
  rows: Array<{
    companyNumber: string;
    role: string;
    object: string;
    actions: Set<string>;
  }> = [];
  filteredRows: Array<{
    companyNumber: string;
    role: string;
    object: string;
    actions: Set<string>;
  }> = [];
  exportMenuOpen = false;
  readonly actionColumns = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'ACCESS', 'EXPORT'];

  constructor(
    private readonly securityService: SecurityService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const companyId = this.resolveCompanyId();
    if (!companyId) {
      this.rows = [];
      this.filteredRows = [];
      this.error = 'Please select a company first.';
      return;
    }
    this.companyId = companyId;

    this.setLoading(true);
    this.error = '';
    const query = {
      companyId,
      role: this.selectedRole,
      object: this.selectedObject
    };
    const request$ = this.viewMode === 'object'
      ? this.securityService.fetchSecurityReportByObject(query)
      : this.securityService.fetchSecurityReportByRole(query);
    request$
      .pipe(
        take(1),
        finalize(() => {
          this.setLoading(false);
        })
      )
      .subscribe({
        next: (res: any) => {
          const raw = res?.data ?? [];
          const list = Array.isArray(raw) ? raw : [];
          const nextRows: Array<{ companyNumber: string; role: string; object: string; actions: Set<string> }> = [];
          list.forEach((item: any) => {
            const role = String(item?.role ?? '-');
            const objectMap = (item?.objects && typeof item.objects === 'object') ? item.objects : {};
            Object.entries(objectMap).forEach(([objectName, actions]) => {
              const value = Array.isArray(actions) ? actions : [];
              nextRows.push({
                companyNumber: String(companyId),
                role,
                object: String(objectName ?? '-'),
                actions: new Set(value.map((a: any) => String(a ?? '').toUpperCase()))
              });
            });
          });
          this.rows = nextRows;
          this.roles = Array.from(new Set(this.rows.map((r) => r.role)));
          this.objects = Array.from(new Set(this.rows.map((r) => r.object)));
          this.applyFilters();
          this.setLoading(false);
        },
        error: (err) => {
          this.rows = [];
          this.filteredRows = [];
          this.error = String(err?.error?.message ?? 'Failed to load security report.');
          this.setLoading(false);
        }
      });
  }

  applyFilters(): void {
    this.filteredRows = this.rows.filter((row) => {
      const roleOk = this.selectedRole === 'ALL' || row.role === this.selectedRole;
      const objectOk = this.selectedObject === 'ALL' || row.object === this.selectedObject;
      return roleOk && objectOk;
    });
  }

  onRoleChange(): void {
    this.load();
  }

  onObjectChange(): void {
    this.load();
  }

  hasAction(row: { actions: Set<string> }, action: string): boolean {
    return row.actions.has(action);
  }

  setViewMode(mode: 'role' | 'object'): void {
    if (this.viewMode === mode) {
      return;
    }
    this.viewMode = mode;
    if (mode === 'role') {
      this.selectedObject = 'ALL';
    } else {
      this.selectedRole = 'ALL';
    }
    this.load();
  }

  formatLabel(value: string): string {
    return String(value ?? '').replace(/_/g, ' ');
  }

  printReport(): void {
    window.print();
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  @HostListener('document:click')
  closeExportMenu(): void {
    this.exportMenuOpen = false;
  }

  exportReport(format: 'csv' | 'excel' | 'pdf' = 'csv'): void {
    this.exportMenuOpen = false;
    const query = {
      companyId: this.companyId || this.resolveCompanyId(),
      role: this.selectedRole,
      object: this.selectedObject
    };

    this.securityService.exportSecurityReport(this.viewMode, query, format)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.exportFallback(format);
            return;
          }
          const ext = this.inferExportExtension(blob.type);
          const name = `security-report-${this.viewMode}.${ext}`;
          this.downloadBlob(blob, name);
        },
        error: () => {
          this.exportFallback(format);
        }
      });
  }

  private resolveCompanyId(): string {
    const selected = String(localStorage.getItem('selectedCompanyId') ?? '').trim();
    if (selected) {
      return selected;
    }
    const fallback = String(localStorage.getItem('companyId') ?? '').trim();
    if (fallback) {
      return fallback;
    }
    const rawUser = String(localStorage.getItem('user') ?? '').trim();
    if (!rawUser) {
      return '';
    }
    try {
      const parsed = JSON.parse(rawUser);
      return String(parsed?.companyId ?? parsed?.company_id ?? '').trim();
    } catch {
      return '';
    }
  }

  private inferExportExtension(contentType: string): 'csv' | 'xlsx' | 'pdf' {
    const value = String(contentType ?? '').toLowerCase();
    if (value.includes('pdf')) {
      return 'pdf';
    }
    if (value.includes('sheet') || value.includes('excel')) {
      return 'xlsx';
    }
    return 'csv';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  private exportFallback(format: 'csv' | 'excel' | 'pdf'): void {
    if (format === 'excel') {
      this.exportExcelFallback();
      return;
    }
    if (format === 'pdf') {
      this.exportPdfFallback();
      return;
    }
    this.exportCsvFallback();
  }

  private exportCsvFallback(): void {
    const headers = ['Company Number', 'Object', 'Role', ...this.actionColumns];
    const rows = this.filteredRows.map((row) => {
      const actionValues = this.actionColumns.map((action) => (this.hasAction(row, action) ? 'Yes' : 'No'));
      return [row.companyNumber, this.formatLabel(row.object), row.role, ...actionValues];
    });
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `security-report-${this.viewMode}.csv`);
  }

  private exportExcelFallback(): void {
    const headers = ['Company Number', 'Object', 'Role', ...this.actionColumns];
    const rows = this.filteredRows.map((row) => {
      const actionValues = this.actionColumns.map((action) => (this.hasAction(row, action) ? 'Yes' : 'No'));
      return [row.companyNumber, this.formatLabel(row.object), row.role, ...actionValues];
    });
    const content = [headers, ...rows]
      .map((r) => r.map((cell) => String(cell ?? '').replace(/\t/g, ' ')).join('\t'))
      .join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    this.downloadBlob(blob, `security-report-${this.viewMode}.xls`);
  }

  private async exportPdfFallback(): Promise<void> {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new jsPDF('l', 'pt', 'a4');
    const head = [['Company Number', 'Object', 'Role', ...this.actionColumns]];
    const body = this.filteredRows.map((row) => {
      const actionValues = this.actionColumns.map((action) => (this.hasAction(row, action) ? 'Yes' : 'No'));
      return [row.companyNumber, this.formatLabel(row.object), row.role, ...actionValues];
    });
    autoTable(doc, { head, body, styles: { fontSize: 8 } });
    doc.save(`security-report-${this.viewMode}.pdf`);
  }

  private setLoading(value: boolean): void {
    this.ngZone.run(() => {
      this.loading = value;
      this.cdr.detectChanges();
    });
  }
}
