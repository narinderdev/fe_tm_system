import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TechnicianService } from '../../services/technician.service';
import { ViewHolidayComponent } from './view-holiday';

describe('ViewHolidayComponent', () => {
  const technicianServiceMock = {
    fetchHolidayById: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    technicianServiceMock.fetchHolidayById.mockReset();
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [ViewHolidayComponent],
      providers: [
        provideRouter([]),
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '2' })
            }
          }
        }
      ]
    }).compileComponents();
  });

  it('loads holiday details by route id', () => {
    technicianServiceMock.fetchHolidayById.mockReturnValue(
      of({
        data: {
          id: 2,
          holidayName: 'Founders Day',
          holidayType: 'COMPANY',
          holidayDate: '2026-07-02'
        }
      })
    );

    const fixture = TestBed.createComponent(ViewHolidayComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(technicianServiceMock.fetchHolidayById).toHaveBeenCalledWith('2');
    expect(component.holiday?.holidayName).toBe('Founders Day');
    expect(component.error).toBeUndefined();
  });

  it('navigates back to leaves tab', () => {
    technicianServiceMock.fetchHolidayById.mockReturnValue(of({ data: { id: 2 } }));
    const fixture = TestBed.createComponent(ViewHolidayComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/tm-system', 'leaves']);
  });
});
