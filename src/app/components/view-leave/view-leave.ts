import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TechnicianService } from '../../services/technician.service';
import { Loader } from '../loader/loader';
import { finalize, take } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-view-leave',
  templateUrl: './view-leave.html',
  styleUrls: ['./view-leave.css'],
  imports: [CommonModule, Loader]
})
export class ViewLeaveComponent implements OnInit {
  technicianId?: string;
  leaveId?: string;
  leave: any;
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
    this.technicianId = this.route.snapshot.paramMap.get('technicianId') ?? undefined;
    this.leaveId = this.route.snapshot.paramMap.get('leaveId') ?? undefined;

    if (!this.technicianId || !this.leaveId) {
      this.error = 'Missing technician id or leave id.';
      return;
    }

    this.loadLeave(this.technicianId, this.leaveId);
  }

  goBack(): void {
    this.router.navigate(['/tm-system', 'leaves']);
  }

  private loadLeave(technicianId: string, leaveId: string): void {
    this.loading = true;
    this.error = undefined;
    this.technicianService
      .fetchTechnicianLeaves(technicianId)
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
            const list = res?.data?.leaves ?? res?.data?.content ?? res?.data ?? res ?? [];
            const match = (list as any[]).find((l) => (l.id ?? l.leaveId)?.toString() === leaveId.toString());
            this.leave = match ?? list?.[0];
            if (!this.leave) {
              this.error = 'Leave not found.';
            }
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Unable to load leave details.';
            this.cdr.detectChanges();
          });
        }
      });
  }
}
