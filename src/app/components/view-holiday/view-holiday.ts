import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TechnicianService } from '../../services/technician.service';
import { Loader } from '../loader/loader';
import { take, finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-view-holiday',
  templateUrl: './view-holiday.html',
  styleUrls: ['./view-holiday.css'],
  imports: [CommonModule, Loader]
})
export class ViewHolidayComponent implements OnInit {
  holidayId?: string;
  holiday: any;
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
    this.holidayId = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (!this.holidayId) {
      this.error = 'Missing holiday id.';
      return;
    }
    this.loadHoliday(this.holidayId);
  }

  goBack(): void {
    this.router.navigate(['/tm-system', 'leaves']);
  }

  private loadHoliday(id: string): void {
    this.loading = true;
    this.error = undefined;
    this.technicianService.fetchHolidayById(id)
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
            this.holiday = res?.data ?? res;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Unable to load holiday details.';
            this.cdr.detectChanges();
          });
        }
      });
  }
}
