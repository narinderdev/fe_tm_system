import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, finalize, of, take, timeout } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import {
  CreateTechnicianPayload,
  TechnicianService
} from '../../services/technician.service';
import { UserManagementService } from '../../services/user-management.service';
import { Loader } from '../loader/loader';

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf']);
const ALLOWED_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const PHONE_NUMBER_REGEX = /^\d\+\d{3}-\d{3}-\d{4}$/;

@Component({
  selector: 'app-technician-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Loader],
  templateUrl: './technician-form.html',
  styleUrls: ['./technician-form.css']
})
export class TechnicianFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  technicianId?: number;
  selectedCompanyLabel = '';
  loading = false;
  submitting = false;
  loadMessage = '';
  private loadGuardTimer?: ReturnType<typeof setTimeout>;

  readonly statusOptions = [
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'WORKING', label: 'Working' },
    { value: 'ON_LEAVE', label: 'On Leave' }
  ];

  readonly roleOptions = [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACT', label: 'Contract' }
  ];

  readonly shiftOptions = [
    { value: 'DAY', label: 'Day Shift' },
    { value: 'NIGHT', label: 'Night Shift' }
  ];

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly technicianService: TechnicianService,
    private readonly userManagementService: UserManagementService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      technicianType: ['', Validators.required],
      address: ['', Validators.required],
      status: ['', Validators.required],
      technicianIdCode: [''],
      badgeNumber: [''],
      phoneNumber: ['', Validators.pattern(PHONE_NUMBER_REGEX)],
      email: ['', Validators.email],
      skills: [''],
      certifications: [''],
      hireDate: [new Date().toISOString().slice(0, 10)],
      workShift: ['DAY'],
      notes: [''],
      certificateIssueDate: [''],
      certificateExpiryDate: [''],
      terminationDate: [''],
      technicianPhotoUrl: [''],
      certificateUrl: ['']
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!idParam;
    this.technicianId = idParam ? Number(idParam) : undefined;
    this.loadSelectedCompanyLabel();
    this.loadPageData();
  }

  ngOnDestroy(): void {
    if (this.loadGuardTimer) {
      clearTimeout(this.loadGuardTimer);
    }
  }

  get title(): string {
    return this.isEditMode ? 'Edit Technician' : 'Invite Technician';
  }

  get submitLabel(): string {
    if (this.submitting) {
      return this.isEditMode ? 'Updating...' : 'Inviting...';
    }
    return this.isEditMode ? 'Update Technician' : 'Invite Technician';
  }

  get showTerminationDate(): boolean {
    return String(this.form.get('technicianType')?.value ?? '').trim().toUpperCase() === 'CONTRACT';
  }

  cancel(): void {
    this.router.navigate(['/tm-system', 'technicians']);
  }

  signOut(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mfa_token');
    localStorage.removeItem('mfaEnabled');
    localStorage.removeItem('emailOtpVerified');
    localStorage.removeItem('authenticatorVerified');
    localStorage.removeItem('loginEmail');
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }

  onFileSelected(event: Event, controlName: 'technicianPhotoUrl' | 'certificateUrl'): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      this.form.get(controlName)?.setValue('');
      return;
    }
    if (!this.isValidUpload(file)) {
      input.value = '';
      this.form.get(controlName)?.setValue('');
      this.toastr.error('Only JPG, PNG, or PDF files up to 5MB are allowed.');
      return;
    }
    this.form.get(controlName)?.setValue(file.name);
  }

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const digits = String(input.value ?? '').replace(/\D/g, '').slice(0, 11);

    if (!digits) {
      this.form.get('phoneNumber')?.setValue('', { emitEvent: false });
      return;
    }

    let masked = digits.slice(0, 1);
    if (digits.length > 1) {
      masked += `+${digits.slice(1, 4)}`;
    }
    if (digits.length > 4) {
      masked += `-${digits.slice(4, 7)}`;
    }
    if (digits.length > 7) {
      masked += `-${digits.slice(7, 11)}`;
    }

    this.form.get('phoneNumber')?.setValue(masked, { emitEvent: false });
  }

  submit(): void {
    if (this.submitting) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    const invitePayload = {
      firstName: String(payload.firstName ?? '').trim(),
      lastName: String(payload.lastName ?? '').trim(),
      email: String(payload.email ?? '').trim().toLowerCase()
    };

    if (!this.isEditMode && !invitePayload.email) {
      this.form.get('email')?.markAsTouched();
      this.toastr.error('Email is required to invite technician.');
      return;
    }

    this.submitting = true;

    if (this.isEditMode && this.technicianId) {
      this.technicianService
        .updateTechnician(this.technicianId, payload)
        .pipe(
          take(1),
          finalize(() => {
            this.submitting = false;
          })
        )
        .subscribe({
          next: () => {
            this.toastr.success('Technician updated successfully.');
            this.router.navigate(['/tm-system', 'technicians']);
          },
          error: (err: any) => {
            this.toastr.error(err?.error?.message || 'Failed to save technician.');
          }
        });
      return;
    }

    this.technicianService
      .createTechnician(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.userManagementService
            .inviteUser(invitePayload)
            .pipe(
              take(1),
              finalize(() => {
                this.submitting = false;
              })
            )
            .subscribe({
              next: () => {
                this.toastr.success('Technician invited successfully.');
                this.router.navigate(['/tm-system', 'technicians']);
              },
              error: (err: any) => {
                this.toastr.error(err?.error?.message || 'Technician created but invite failed.');
              }
            });
        },
        error: (err: any) => {
          this.submitting = false;
          this.toastr.error(err?.error?.message || 'Failed to save technician.');
        }
      });
  }

  private loadPageData(): void {
    this.loading = true;
    this.loadMessage = '';
    this.cdr.detectChanges();
    if (this.loadGuardTimer) {
      clearTimeout(this.loadGuardTimer);
    }
    this.loadGuardTimer = setTimeout(() => {
      this.zone.run(() => {
        this.loading = false;
        this.toastr.error('Loading timed out. Please try again.');
        this.cdr.detectChanges();
      });
    }, 12000);

    const technician$ =
      this.isEditMode && this.technicianId
        ? this.technicianService.fetchTechnicianById(this.technicianId).pipe(
            timeout(10000),
            catchError(() => of({ __loadFailed: true } as any))
          )
        : of(null);

    technician$
      .pipe(
        take(1),
        finalize(() => {
          if (this.loadGuardTimer) {
            clearTimeout(this.loadGuardTimer);
            this.loadGuardTimer = undefined;
          }
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (technicianResponse: any) => {
          if (!technicianResponse) {
            return;
          }
          if ((technicianResponse as any)?.__loadFailed) {
            this.toastr.error('Failed to load technician form data.');
            this.router.navigate(['/tm-system', 'technicians']);
            this.cdr.detectChanges();
            return;
          }

          const tech = technicianResponse?.data ?? technicianResponse;
          this.form.patchValue({
            firstName: tech?.firstName ?? '',
            lastName: tech?.lastName ?? '',
            technicianType: tech?.technicianType ?? '',
            address: tech?.address ?? '',
            status: tech?.status ?? '',
            technicianIdCode: tech?.technicianId ?? '',
            badgeNumber: tech?.badgeNumber ?? '',
            phoneNumber: tech?.phoneNumber ?? '',
            email: tech?.email ?? '',
            skills: tech?.skills ?? '',
            certifications: tech?.certifications ?? '',
            hireDate: tech?.hireDate ?? this.form.get('hireDate')?.value ?? '',
            workShift: tech?.workShift ?? 'DAY',
            notes: tech?.notes ?? '',
            certificateIssueDate: tech?.certificateIssueDate ?? '',
            certificateExpiryDate: tech?.certificateExpiryDate ?? '',
            terminationDate: tech?.terminationDate ?? '',
            technicianPhotoUrl: tech?.technicianPhotoUrl ?? '',
            certificateUrl: tech?.certificateUrl ?? ''
          });
          this.onTechnicianTypeChange();
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Failed to load technician form data.');
          this.cdr.detectChanges();
        }
      });
  }

  private loadSelectedCompanyLabel(): void {
    const legalName = String(localStorage.getItem('selectedCompanyLegalName') ?? '').trim();
    const tradeName = String(localStorage.getItem('selectedCompanyTradeName') ?? '').trim();
    const companyName = legalName || tradeName;
    const companyNumber = String(localStorage.getItem('selectedCompanyNumber') ?? '').trim();
    if (!companyName && !companyNumber) {
      this.selectedCompanyLabel = '';
      return;
    }
    this.selectedCompanyLabel = `${companyName}${companyName && companyNumber ? ' - ' : ''}${companyNumber}`;
  }

  private toPayload(): CreateTechnicianPayload {
    const value = this.form.getRawValue();
    const companyId = this.getSelectedCompanyId();
    return {
      companyId,
      technicianId: value.technicianIdCode || undefined,
      badgeNumber: value.badgeNumber || undefined,
      firstName: String(value.firstName ?? '').trim(),
      lastName: String(value.lastName ?? '').trim(),
      technicianType: String(value.technicianType ?? '').trim().toUpperCase(),
      skills: String(value.skills ?? '').trim(),
      phoneNumber: String(value.phoneNumber ?? '').trim(),
      email: String(value.email ?? '').trim().toLowerCase(),
      address: String(value.address ?? '').trim(),
      status: String(value.status ?? '').trim().toUpperCase(),
      hireDate: String(value.hireDate ?? ''),
      workShift: String(value.workShift ?? '').trim().toUpperCase(),
      certifications: String(value.certifications ?? '').trim(),
      certificateIssueDate: value.certificateIssueDate || undefined,
      certificateExpiryDate: value.certificateExpiryDate || undefined,
      terminationDate: value.terminationDate || undefined,
      technicianPhotoUrl: value.technicianPhotoUrl || undefined,
      certificateUrl: value.certificateUrl || undefined,
      notes: String(value.notes ?? '').trim()
    };
  }

  onTechnicianTypeChange(): void {
    if (!this.showTerminationDate) {
      this.form.get('terminationDate')?.setValue('');
    }
  }

  private isValidUpload(file: File): boolean {
    const extension = String(file.name.split('.').pop() ?? '').trim().toLowerCase();
    const isAllowedExtension = ALLOWED_UPLOAD_EXTENSIONS.has(extension);
    const isAllowedMime = !file.type || ALLOWED_UPLOAD_MIME_TYPES.has(file.type);
    const isAllowedSize = file.size > 0 && file.size <= MAX_UPLOAD_SIZE_BYTES;
    return isAllowedExtension && isAllowedMime && isAllowedSize;
  }

  private getSelectedCompanyId(): number | undefined {
    const raw = String(localStorage.getItem('selectedCompanyId') ?? '').trim();
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
