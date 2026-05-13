import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityReportTabComponent } from './security-report-tab';
import { SecurityService } from '../../services/security.service';

describe('SecurityReportTabComponent', () => {
  const securityServiceMock = {
    fetchSecurityReportByRole: vi.fn(),
    fetchSecurityReportByObject: vi.fn(),
    exportSecurityReport: vi.fn()
  };

  const payload = {
    data: [
      {
        role: 'Admin',
        objects: {
          ASSET: ['VIEW', 'CREATE'],
          DASHBOARD: ['VIEW']
        }
      }
    ]
  };

  beforeEach(async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => (key === 'companyId' ? '2' : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    });

    securityServiceMock.fetchSecurityReportByRole.mockReset();
    securityServiceMock.fetchSecurityReportByObject.mockReset();
    securityServiceMock.exportSecurityReport.mockReset();

    securityServiceMock.fetchSecurityReportByRole.mockReturnValue(of(payload));
    securityServiceMock.fetchSecurityReportByObject.mockReturnValue(of(payload));
    securityServiceMock.exportSecurityReport.mockReturnValue(of(new Blob(['a,b'], { type: 'text/csv' })));

    await TestBed.configureTestingModule({
      imports: [SecurityReportTabComponent],
      providers: [{ provide: SecurityService, useValue: securityServiceMock }]
    }).compileComponents();
  });

  it('loads report on init using role mode API', () => {
    const fixture = TestBed.createComponent(SecurityReportTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(securityServiceMock.fetchSecurityReportByRole).toHaveBeenCalled();
    expect(comp.filteredRows.length).toBeGreaterThan(0);
  });

  it('reloads on filter change', () => {
    const fixture = TestBed.createComponent(SecurityReportTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedRole = 'Admin';
    comp.onRoleChange();

    expect(securityServiceMock.fetchSecurityReportByRole).toHaveBeenCalledTimes(2);
  });

  it('switches mode and calls object API', () => {
    const fixture = TestBed.createComponent(SecurityReportTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.setViewMode('object');

    expect(securityServiceMock.fetchSecurityReportByObject).toHaveBeenCalled();
  });

  it('triggers export', () => {
    const fixture = TestBed.createComponent(SecurityReportTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    vi.spyOn<any, any>(comp as any, 'downloadBlob').mockImplementation(() => {});
    vi.spyOn<any, any>(comp as any, 'exportCsvFallback').mockImplementation(() => {});

    comp.exportReport();

    expect(securityServiceMock.exportSecurityReport).toHaveBeenCalled();
  });

  it('handles API error state', () => {
    securityServiceMock.fetchSecurityReportByRole.mockReturnValue(throwError(() => ({ error: { message: 'Report API failed' } })));

    const fixture = TestBed.createComponent(SecurityReportTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.error).toBe('Report API failed');
  });
});
