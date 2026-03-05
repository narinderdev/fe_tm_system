import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkOrderService } from '../../services/work-order.service';
import { TmWorkOrderViewComponent } from './tm-work-order-view';

describe('TmWorkOrderViewComponent', () => {
  const workOrderServiceMock = {
    fetchWorkOrderById: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    workOrderServiceMock.fetchWorkOrderById.mockReset();
    workOrderServiceMock.fetchWorkOrderById.mockReturnValue(of({ data: { id: 77 } }));
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [TmWorkOrderViewComponent],
      providers: [
        provideRouter([]),
        { provide: WorkOrderService, useValue: workOrderServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '77' })
            }
          }
        }
      ]
    }).compileComponents();
  });

  it('loads work order detail and computes labels', () => {
    workOrderServiceMock.fetchWorkOrderById.mockReturnValue(
      of({
        data: {
          id: 77,
          workOrderId: 'WO-77',
          woTitle: 'Generator repair',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          assignedTechnicianName: 'Taylor Reed',
          targetCompletionDate: '2026-02-28',
          checkLogs: [
            {
              technicianName: 'Taylor Reed',
              checkInAt: '2026-02-28T09:00:00.000Z',
              checkOutAt: '2026-02-28T17:00:00.000Z'
            }
          ]
        }
      })
    );

    const fixture = TestBed.createComponent(TmWorkOrderViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(workOrderServiceMock.fetchWorkOrderById).toHaveBeenCalledWith('77');
    expect(component.workOrder?.workOrderId).toBe('WO-77');
    expect(component.priorityLabel).toBe('High');
    expect(component.statusLabel).toBe('In Progress');
    expect(component.assignedToLabel).toBe('Taylor Reed');
    expect(component.logDays.length).toBeGreaterThan(0);
  });

  it('navigates back to work orders', () => {
    const fixture = TestBed.createComponent(TmWorkOrderViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/tm-system', 'work-orders']);
  });
});
