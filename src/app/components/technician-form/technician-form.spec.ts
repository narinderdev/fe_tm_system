import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TechnicianService } from '../../services/technician.service';
import { UserManagementService } from '../../services/user-management.service';
import { TechnicianFormComponent } from './technician-form';

describe('TechnicianFormComponent', () => {
  const technicianServiceMock = {
    fetchTechnicianTeams: vi.fn().mockReturnValue(
      of({ data: { teams: [{ id: 1, teamName: 'Team Alpha' }] } })
    ),
    fetchTechnicianById: vi.fn().mockReturnValue(
      of({
        data: {
          id: 5,
          technicianId: 'TECH-000005',
          firstName: 'Jane',
          lastName: 'Doe',
          technicianType: 'TECHNICIAN',
          teamId: 1,
          address: 'Site B',
          status: 'AVAILABLE'
        }
      })
    ),
    createTechnician: vi.fn().mockReturnValue(of({ data: { id: 10 } })),
    updateTechnician: vi.fn().mockReturnValue(of({ data: { id: 5 } }))
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  };

  const userManagementServiceMock = {
    inviteUser: vi.fn().mockReturnValue(of({ statusCode: 201 }))
  };

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  async function configureRoute(pathId?: string) {
    await TestBed.configureTestingModule({
      imports: [TechnicianFormComponent],
      providers: [
        provideRouter([]),
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: UserManagementService, useValue: userManagementServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(pathId ? { id: pathId } : {})
            }
          }
        }
      ]
    }).compileComponents();
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  }

  beforeEach(() => {
    technicianServiceMock.createTechnician.mockClear();
    technicianServiceMock.updateTechnician.mockClear();
    userManagementServiceMock.inviteUser.mockClear();
    toastrMock.success.mockClear();
    toastrMock.error.mockClear();
  });

  it('blocks submit when required fields are missing', async () => {
    await configureRoute();
    const fixture = TestBed.createComponent(TechnicianFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.submit();

    expect(technicianServiceMock.createTechnician).not.toHaveBeenCalled();
    expect(component.form.invalid).toBe(true);
  });

  it('submits create payload and redirects', async () => {
    await configureRoute();
    const fixture = TestBed.createComponent(TechnicianFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.patchValue({
      firstName: 'John',
      lastName: 'Smith',
      technicianType: 'TECHNICIAN',
      email: 'john.smith@example.com',
      address: 'Site A',
      status: 'AVAILABLE'
    });
    component.submit();

    expect(technicianServiceMock.createTechnician).toHaveBeenCalled();
    expect(userManagementServiceMock.inviteUser).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com'
    });
    expect(toastrMock.success).toHaveBeenCalledWith('Technician invited successfully.');
    expect(navigateSpy).toHaveBeenCalledWith(['/tm-system', 'technicians']);
  });

  it('loads technician in edit mode and updates', async () => {
    await configureRoute('5');
    const fixture = TestBed.createComponent(TechnicianFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(technicianServiceMock.fetchTechnicianById).toHaveBeenCalledWith(5);
    expect(component.form.get('firstName')?.value).toBe('Jane');

    component.form.patchValue({
      address: 'Updated Site'
    });
    component.submit();

    expect(technicianServiceMock.updateTechnician).toHaveBeenCalled();
    expect(toastrMock.success).toHaveBeenCalledWith('Technician updated successfully.');
  });

  it('shows error toast on save failure', async () => {
    technicianServiceMock.createTechnician.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Save failed' } }))
    );
    await configureRoute();
    const fixture = TestBed.createComponent(TechnicianFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.patchValue({
      firstName: 'John',
      lastName: 'Smith',
      technicianType: 'TECHNICIAN',
      email: 'john.smith@example.com',
      address: 'Site A',
      status: 'AVAILABLE'
    });
    component.submit();

    expect(toastrMock.error).toHaveBeenCalledWith('Save failed');
  });
});
