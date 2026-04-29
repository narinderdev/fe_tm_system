import { test, expect } from '@playwright/test';

const apiBase = '**/api';

const dashboardPayload = {
  statusCode: 200,
  data: {
    totalTechnicians: 3,
    availableToday: 1,
    onLeave: 0,
    workOrders: 5,
    recentActivities: []
  }
};

const techniciansPayload = {
  data: {
    technicians: [
      {
        id: 101,
        technicianId: 'TECH-000001',
        firstName: 'Vivek',
        lastName: 'Jandrotia',
        phoneNumber: '8219325453',
        email: 'tech@example.com',
        teamName: 'Team Alpha',
        workStatus: 'AVAILABLE',
        workShift: 'DAY'
      }
    ],
    totalElements: 1,
    size: 10,
    page: 0
  }
};

const teamsPayload = {
  data: {
    teams: [
      {
        id: 5,
        teamName: 'Team Alpha',
        teamLeaderName: 'Lead One',
        technicians: [{}, {}, {}]
      }
    ],
    totalElements: 1,
    size: 10,
    page: 0
  }
};

const workOrdersPayload = {
  data: {
    workOrders: [
      {
        id: 77,
        workOrderId: 'WO-20260121-5099',
        woTitle: 'PM: reergv',
        descriptionScope: 'Preventive maintenance',
        assignedTechnicianName: 'Unassigned',
        priority: 'MEDIUM',
        status: 'APPROVED',
        targetCompletionDate: '2026-01-16'
      }
    ],
    totalElements: 1,
    size: 10,
    page: 0
  }
};

const holidaysPayload = {
  data: {
    holidays: [
      {
        id: 2,
        holidayName: 'Test Holiday',
        holidayType: 'COMPANY',
        holidayDate: '2026-02-06',
        notes: 'note'
      }
    ]
  }
};

const timesheetListPayload = {
  data: [
    {
      id: 12,
      period_start_date: '2026-02-09',
      period_end_date: '2026-02-22',
      view_type: 'BY_WEEK',
      timesheet_rows: [
        { hours: 8 },
        { hours: 2 }
      ]
    }
  ]
};

const timesheetDetailPayload = {
  data: {
    id: 12,
    period_start_date: '2026-02-09',
    period_end_date: '2026-02-22',
    view_type: 'BY_WEEK',
    totalWorked: 8,
    totalNonWorked: 2,
    totalPremium: 0,
    timesheet_rows: [
      {
        date: '2026-02-09',
        day_of_week: 'MONDAY',
        pay_code: 'REGULAR',
        hours: 8,
        daily_total: 8,
        department: 'Operations',
        account: 'None',
        project: 'Site inspection',
        comment: 'Completed',
        is_deleted: false
      },
      {
        date: '2026-02-10',
        day_of_week: 'TUESDAY',
        pay_code: 'PTO',
        hours: 2,
        daily_total: 2,
        department: 'Operations',
        account: 'None',
        project: '',
        comment: 'Medical appointment',
        is_deleted: false
      }
    ]
  }
};

test.describe('Login page', () => {
  test('renders source login UI elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('img.auth-logo')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });
});

test.describe('TM module', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'playwright-token');
      localStorage.setItem('technicianId', '42');
    });

    await page.route(`${apiBase}/dashboard/technicians**`, (route) =>
      route.fulfill({ json: dashboardPayload })
    );
    await page.route(`${apiBase}/technicians/leaves**`, (route) =>
      route.fulfill({ json: { data: { leaves: [] } } })
    );
    await page.route(`${apiBase}/technicians**`, (route) => route.fulfill({ json: techniciansPayload }));
    await page.route(`${apiBase}/technician-teams**`, (route) => route.fulfill({ json: teamsPayload }));
    await page.route(`${apiBase}/work-orders**`, (route) => route.fulfill({ json: workOrdersPayload }));
    await page.route(`${apiBase}/holidays**`, (route) => route.fulfill({ json: holidaysPayload }));
    await page.route(`${apiBase}/timesheets**`, (route) => {
      const request = route.request();
      const url = request.url();

      if (request.method() === 'POST') {
        route.fulfill({ json: { statusCode: 200, data: { id: 12 } } });
        return;
      }

      if (/\/api\/timesheets\/\d+/.test(url)) {
        route.fulfill({ json: timesheetDetailPayload });
        return;
      }

      route.fulfill({ json: timesheetListPayload });
    });
  });

  test('dashboard shows metrics', async ({ page }) => {
    await page.goto('/tm-system/dashboard');
    await expect(page.getByText('Total Technicians').first()).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
    await expect(page.getByText('Work Orders').first()).toBeVisible();
  });

  test('technician list renders rows', async ({ page }) => {
    await page.goto('/tm-system/technicians');
    await expect(page.getByText('TECH-000001')).toBeVisible();
    await expect(page.getByText('Vivek')).toBeVisible();
  });

  test('teams tab renders rows', async ({ page }) => {
    await page.goto('/tm-system/teams');
    await expect(page.getByText('Team Alpha')).toBeVisible();
    await expect(page.getByText('Lead One')).toBeVisible();
  });

  test('work orders tab renders rows', async ({ page }) => {
    await page.goto('/tm-system/work-orders');
    await expect(page.getByText('WO-20260121-5099')).toBeVisible();
    await expect(page.getByText('Approved')).toBeVisible();
  });

  test('holidays list renders rows', async ({ page }) => {
    await page.goto('/tm-system/leaves');
    await page.getByRole('button', { name: 'Holidays', exact: true }).click();
    await expect(page.getByText('Test Holiday')).toBeVisible();
    await expect(page.getByText('COMPANY')).toBeVisible();
  });

  test('timesheet list tab renders rows', async ({ page }) => {
    await page.goto('/tm-system/time-sheet');
    await expect(page.getByRole('button', { name: 'Create timesheet' })).toBeVisible();
    await expect(page.getByText('#12')).toBeVisible();
    await expect(page.getByText('Bi-Weekly')).toBeVisible();
    await expect(page.getByText('10.00')).toBeVisible();
  });

  test('timesheet create form submits payload for approval', async ({ page }) => {
    let submittedPayload: any;
    await page.route(`${apiBase}/timesheets`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({ json: { statusCode: 200, data: { id: 88 } } });
    });

    await page.goto('/tm-system/time-sheet');
    await page.getByRole('button', { name: 'Create timesheet' }).click();

    const rows = page.locator('table.timesheet-table tbody tr');
    await rows.nth(0).locator('input[type="number"]').fill('8');
    await rows.nth(1).locator('select').nth(0).selectOption('PTO');
    await rows.nth(1).locator('input[type="number"]').fill('2');

    await expect(page.locator('.timesheet-total-line strong')).toHaveText('10.00');
    await expect(page.getByRole('button', { name: 'Submit for Approval' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit for Approval' }).click();

    await expect.poll(() => submittedPayload).toBeTruthy();
    expect(submittedPayload.technician_id).toBe(42);
    expect(submittedPayload.view_type).toBe('BY_WEEK');
    expect(submittedPayload.totalWorked).toBe(8);
    expect(submittedPayload.totalNonWorked).toBe(2);
    expect(submittedPayload.totalPremium).toBe(0);
    expect(Array.isArray(submittedPayload.timesheet_rows)).toBeTruthy();
    expect(submittedPayload.timesheet_rows.length).toBeGreaterThan(0);
    expect(submittedPayload.timesheet_rows.filter((row: any) => Number(row.hours) > 0).length).toBe(2);
    await expect(page.getByRole('button', { name: 'Create timesheet' })).toBeVisible();
  });

  test('timesheet detail page opens from list', async ({ page }) => {
    await page.goto('/tm-system/time-sheet');
    await page.getByRole('button', { name: 'View timesheet' }).first().click();
    await expect(page).toHaveURL(/\/tm-system\/time-sheet\/12$/);
    await expect(page.getByRole('heading', { name: 'Timesheet #12' })).toBeVisible();
    await expect(page.getByText('Site inspection')).toBeVisible();
    await expect(page.getByText('Medical appointment')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export as Excel' })).toBeVisible();
    await expect(page.getByText('Total Hours').locator('..').locator('strong')).toHaveText('10.00');
  });
});
