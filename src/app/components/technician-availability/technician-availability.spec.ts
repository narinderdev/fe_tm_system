import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TechnicianService } from '../../services/technician.service';
import { TechnicianAvailabilityComponent } from './technician-availability';

describe('TechnicianAvailabilityComponent', () => {
  const paramMap$ = new BehaviorSubject(convertToParamMap({ id: '42' }));

  const technicianServiceMock = {
    fetchTechnicianMonthlyAvailability: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    technicianServiceMock.fetchTechnicianMonthlyAvailability.mockReset();
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [TechnicianAvailabilityComponent],
      providers: [
        provideRouter([]),
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$.asObservable() }
        }
      ]
    }).compileComponents();
  });

  it('loads monthly availability and generates calendar', () => {
    technicianServiceMock.fetchTechnicianMonthlyAvailability.mockReturnValue(
      of({
        data: {
          technicianName: 'Avery Chen',
          availability: [
            {
              date: '2026-03-01',
              status: 'AVAILABLE',
              busyWindows: [],
              freeWindows: [{ start: '09:00', end: '17:00' }]
            },
            {
              date: '2026-03-02',
              status: 'WORKING',
              busyWindows: [{ start: '10:00', end: '15:00' }],
              freeWindows: []
            }
          ]
        }
      })
    );

    const fixture = TestBed.createComponent(TechnicianAvailabilityComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(technicianServiceMock.fetchTechnicianMonthlyAvailability).toHaveBeenCalledWith(42, 31);
    expect(component.days.length).toBe(2);
    expect(component.calendarDays.length).toBeGreaterThan(0);
    expect(component.getMonthYear()).toBe('March 2026');
    expect(component.formatWindow({ start: '09:00', end: '17:00' })).toBe('9:00am - 5:00pm');
  });

  it('navigates back to technicians list', () => {
    technicianServiceMock.fetchTechnicianMonthlyAvailability.mockReturnValue(of({ data: { availability: [] } }));
    const fixture = TestBed.createComponent(TechnicianAvailabilityComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/tm-system', 'technicians']);
  });
});
