import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { take, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';
import { ExpensesService } from '../../services/expenses.service';

@Component({
  standalone: true,
  selector: 'app-view-expense',
  templateUrl: './view-expense.html',
  styleUrls: ['./view-expense.css'],
  imports: [CommonModule, Loader]
})
export class ViewExpenseComponent implements OnInit {
  expenseId?: string;
  expense: any;
  loading = false;
  approving = false;
  showApproveDialog = false;
  error?: string;
  successMessage?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly expensesService: ExpensesService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.expenseId = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (!this.expenseId) {
      this.error = 'Missing expense id.';
      return;
    }
    this.loadExpense(this.expenseId);
  }

  goBack(): void {
    this.router.navigate(['/tm-system', 'expenses']);
  }

  displayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const text = String(value).trim();
    return text.length ? text : '-';
  }

  formatAmount(value: unknown): string {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return '-';
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: unknown): string {
    if (!value) {
      return '-';
    }
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return this.displayValue(value);
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  statusClass(value: unknown): string {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    return normalized ? `status-${normalized}` : '';
  }

  isPendingStatus(): boolean {
    return this.statusClass(this.expense?.status) === 'status-pending';
  }

  openApproveDialog(): void {
    if (!this.isPendingStatus() || this.approving) {
      return;
    }
    this.showApproveDialog = true;
  }

  closeApproveDialog(): void {
    if (this.approving) {
      return;
    }
    this.showApproveDialog = false;
  }

  approveExpense(): void {
    if (!this.expenseId || this.approving) {
      return;
    }

    this.approving = true;
    this.successMessage = undefined;
    this.error = undefined;

    this.expensesService
      .approveExpense(this.expenseId)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.approving = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (res: any) => {
          this.zone.run(() => {
            const payload = res?.data ?? res ?? {};
            this.expense = {
              ...this.expense,
              ...payload,
              status: String(payload?.status ?? 'APPROVED')
            };
            this.successMessage = 'Expense approved successfully.';
            this.showApproveDialog = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Unable to approve this expense.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  exportAs(type: 'excel' | 'csv'): void {
    if (type !== 'excel') {
      return;
    }

    if (!this.expense) {
      this.toastr.warning('No expense details available to export.');
      return;
    }

    const metaHeaders = ['Field', 'Value'];
    const metaRows = [
      ['Expense', `#${this.displayValue(this.expense?.id ?? this.expenseId)}`],
      ['Status', this.displayValue(this.expense?.status)],
      ['Technician', this.displayValue(this.expense?.userName || this.expense?.user_name)]
    ];

    const detailHeaders = ['Date', 'Amount', 'Expense Code', 'Work Order', 'Description'];
    const detailRows = [[
      this.formatDate(this.expense?.date),
      this.formatAmount(this.expense?.amount),
      this.displayValue(this.expense?.expenseCode || this.expense?.expense_code),
      this.displayValue(
        this.expense?.workOrderName ||
          this.expense?.work_order_name ||
          this.expense?.workOrderId ||
          this.expense?.work_order_id
      ),
      this.displayValue(this.expense?.description)
    ]];

    const tableData = `
      ${this.buildHtmlTable(metaHeaders, metaRows)}
      <br/>
      ${this.buildHtmlTable(detailHeaders, detailRows)}
    `;
    this.downloadFile(tableData, 'expense-report.xls', 'application/vnd.ms-excel');
  }

  private buildHtmlTable(headers: string[], rows: string[][]): string {
    const head = headers.map((header) => `<th>${this.escapeHtml(header)}</th>`).join('');
    const body = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="mso-number-format:\\@; white-space:nowrap;">${this.escapeHtml(cell)}</td>`
            )
            .join('')}</tr>`
      )
      .join('');

    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  private downloadFile(data: string, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private loadExpense(id: string): void {
    this.loading = true;
    this.error = undefined;
    this.successMessage = undefined;
    this.expensesService
      .fetchExpenseById(id)
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          this.zone.run(() => {
            const payload = this.normalizeExpensePayload(res);
            this.expense = payload;
            if (!payload) {
              this.error = 'Expense details not found.';
            }
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Unable to load expense details.';
            this.loading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private normalizeExpensePayload(response: any): any {
    const root = response?.data ?? response;
    if (!root) {
      return null;
    }

    if (root?.expense && typeof root.expense === 'object') {
      return root.expense;
    }

    if (Array.isArray(root)) {
      return root[0] ?? null;
    }

    if (Array.isArray(root?.expenses)) {
      return root.expenses[0] ?? null;
    }

    return root;
  }
}
