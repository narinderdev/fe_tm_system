import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, take } from 'rxjs/operators';

import { Loader } from '../loader/loader';
import { ApiTechnician, TechnicianService } from '../../services/technician.service';

@Component({
  standalone: true,
  selector: 'app-view-technician',
  templateUrl: './view-technician.html',
  styleUrls: ['./view-technician.css'],
  imports: [CommonModule, Loader]
})
export class ViewTechnicianComponent implements OnInit {
  technicianId?: string;
  technician?: ApiTechnician;
  loading = false;
  error?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly technicianService: TechnicianService,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.technicianId = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (!this.technicianId) {
      this.error = 'Missing technician id.';
      return;
    }
    this.loadTechnician(this.technicianId);
  }

  goBack(): void {
    this.router.navigate(['/tm-system', 'technicians']);
  }

  formatText(value?: string | number | null): string {
    const parsed = String(value ?? '').trim();
    return parsed.length ? parsed : '-';
  }

  formatEnum(value?: string | null): string {
    const parsed = String(value ?? '').trim();
    if (!parsed) {
      return '-';
    }
    return parsed
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  initials(): string {
    const first = String(this.technician?.firstName ?? '').trim().charAt(0);
    const last = String(this.technician?.lastName ?? '').trim().charAt(0);
    const joined = `${first}${last}`.toUpperCase().trim();
    return joined || 'T';
  }

  statusClass(value?: string | null): string {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'AVAILABLE') {
      return 'status-available';
    }
    if (normalized === 'WORKING') {
      return 'status-working';
    }
    if (normalized === 'ON_LEAVE') {
      return 'status-on-leave';
    }
    return 'status-default';
  }

  private loadTechnician(id: string): void {
    this.loading = true;
    this.error = undefined;
    this.technicianService
      .fetchTechnicianById(id)
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
        next: (res) => {
          this.zone.run(() => {
            this.technician = res?.data ?? res;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Unable to load technician details.';
            this.cdr.detectChanges();
          });
        }
      });
  }
}
