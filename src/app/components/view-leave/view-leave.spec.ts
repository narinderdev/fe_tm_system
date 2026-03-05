import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TechnicianService } from '../../services/technician.service';
import { ViewLeaveComponent } from './view-leave';

describe('ViewLeaveComponent', () => {
  const technicianServiceMock = {
    fetchTechnicianLeaves: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    technicianServiceMock.fetchTechnicianLeaves.mockReset();
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [ViewLeaveComponent],
      providers: [
        provideRouter([]),
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ technicianId: '42', leaveId: '13' })
            }
          }
        }
      ]
    }).compileComponents();
  });

  it('loads and selects leave by route ids', () => {
    technicianServiceMock.fetchTechnicianLeaves.mockReturnValue(
      of({
        data: {
          leaves: [
            { id: 11, reason: 'Old leave' },
            { id: 13, technicianName: 'Avery Chen', reason: 'Family event', status: 'approved' }
          ]
        }
      })
    );

    const fixture = TestBed.createComponent(ViewLeaveComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(technicianServiceMock.fetchTechnicianLeaves).toHaveBeenCalledWith('42');
    expect(component.leave?.id).toBe(13);
    expect(component.leave?.reason).toBe('Family event');
    expect(component.error).toBeUndefined();
  });

  it('navigates back to leaves list', () => {
    technicianServiceMock.fetchTechnicianLeaves.mockReturnValue(of({ data: { leaves: [] } }));
    const fixture = TestBed.createComponent(ViewLeaveComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/tm-system', 'leaves']);
  });
});
