import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { take, finalize } from 'rxjs/operators';
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

  private loadExpense(id: string): void {
    this.loading = true;
    this.error = undefined;
    this.successMessage = undefined;
    this.expensesService
      .fetchExpenseById(id)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.loading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (res: any) => {
          this.zone.run(() => {
            this.expense = res?.data ?? res;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Unable to load expense details.';
            this.cdr.detectChanges();
          });
        }
      });
  }
}
