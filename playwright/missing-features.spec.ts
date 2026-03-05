import { test, expect } from '@playwright/test';

test.describe('Auth flows without existing E2E coverage', () => {
  test('sign-up submits valid payload and returns to login', async ({ page }) => {
    let submittedPayload: any;

    await page.route('**/auth/signup', async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        json: { statusCode: 201, message: 'Signup successful' }
      });
    });

    await page.goto('/sign-up');

    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await page.getByPlaceholder('First name').fill('John');
    await page.getByPlaceholder('Last name').fill('Doe');
    await page.getByPlaceholder('Enter your email').fill('USER@Example.com');
    await page.getByPlaceholder('Create password').fill('StrongPassword@1');
    await page.getByPlaceholder('Confirm password').fill('StrongPassword@1');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect.poll(() => submittedPayload).toBeTruthy();
    expect(submittedPayload).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      password: 'StrongPassword@1'
    });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('verify-otp accepts code and redirects to login', async ({ page }) => {
    let submittedPayload: any;

    await page.route('**/auth/signup/verify', async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        json: { statusCode: 200, message: 'Verified' }
      });
    });

    await page.goto('/verify-otp?email=user@example.com');

    await expect(page.getByRole('heading', { name: 'Verify OTP' })).toBeVisible();
    const otpInputs = page.locator('.otp-inputs input');
    await expect(otpInputs).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(String(i + 1));
    }

    await expect.poll(() => submittedPayload).toBeTruthy();
    expect(submittedPayload).toEqual({ email: 'user@example.com', otp: '123456' });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('set-password submits valid payload and redirects to login', async ({ page }) => {
    let submittedPayload: any;

    await page.route('**/api/invitations/set-password', async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        json: { statusCode: 200, message: 'Password set' }
      });
    });

    await page.goto('/set-password?email=invite.user@example.com');

    await expect(page.getByRole('heading', { name: 'Set Password' })).toBeVisible();
    await page.getByPlaceholder('Create password').fill('StrongPassword@1');
    await page.getByPlaceholder('Confirm password').fill('StrongPassword@1');
    await page.getByRole('button', { name: 'Set Password' }).click();

    await expect.poll(() => submittedPayload).toBeTruthy();
    expect(submittedPayload).toEqual({
      email: 'invite.user@example.com',
      password: 'StrongPassword@1'
    });
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Guarded detail routes without existing E2E coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'playwright-token');
    });
  });

  test('work order detail route renders fetched data', async ({ page }) => {
    await page.route('**/api/work-orders/77**', async (route) => {
      await route.fulfill({
        json: {
          statusCode: 200,
          data: {
            id: 77,
            workOrderId: 'WO-77',
            woTitle: 'Generator repair',
            descriptionScope: 'Replace failed relay and test output',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            assignedTechnicianName: 'Taylor Reed',
            targetCompletionDate: '2026-02-28',
            checkLogs: [
              {
                technicianName: 'Taylor Reed',
                checkInAt: '2026-02-28T09:00:00.000Z',
                checkOutAt: '2026-02-28T17:30:00.000Z'
              }
            ]
          }
        }
      });
    });

    await page.goto('/tm-system/work-orders/77');

    await expect(page.getByText('WO-77')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Generator repair' })).toBeVisible();
    await expect(page.getByText('Replace failed relay and test output')).toBeVisible();
    await expect(page.getByText('Taylor Reed').first()).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
  });

  test('leave detail route renders selected leave', async ({ page }) => {
    await page.route('**/api/technicians/42/leaves**', async (route) => {
      await route.fulfill({
        json: {
          statusCode: 200,
          data: {
            leaves: [
              {
                id: 13,
                technicianName: 'Avery Chen',
                fromDate: '2026-03-10',
                toDate: '2026-03-12',
                reason: 'Family event',
                leaveType: 'pto',
                status: 'approved'
              }
            ]
          }
        }
      });
    });

    await page.goto('/tm-system/leaves/42/13');

    await expect(page.getByText('LEAVE 13')).toBeVisible();
    await expect(page.getByText('Avery Chen')).toBeVisible();
    await expect(page.getByText('Family event')).toBeVisible();
    await expect(page.getByText('PTO')).toBeVisible();
    await expect(page.getByText('APPROVED')).toBeVisible();
  });

  test('holiday detail route renders holiday information', async ({ page }) => {
    await page.route('**/api/holidays/2**', async (route) => {
      await route.fulfill({
        json: {
          statusCode: 200,
          data: {
            id: 2,
            holidayName: 'Founders Day',
            holidayType: 'company',
            holidayDate: '2026-07-02',
            notes: 'Office closed',
            createdAt: '2026-01-01T08:00:00.000Z'
          }
        }
      });
    });

    await page.goto('/tm-system/holidays/2');

    await expect(page.getByText('Founders Day')).toBeVisible();
    await expect(page.getByText('COMPANY')).toBeVisible();
    await expect(page.getByText('2026-07-02')).toBeVisible();
    await expect(page.getByText('Office closed')).toBeVisible();
  });

  test('technician availability route renders monthly availability', async ({ page }) => {
    await page.route('**/api/technicians/42/availability/monthly**', async (route) => {
      await route.fulfill({
        json: {
          statusCode: 200,
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
        }
      });
    });

    await page.goto('/tm-system/technicians/42/availability');

    await expect(page.getByRole('heading', { name: 'Calendar / Availability' })).toBeVisible();
    await expect(page.locator('.month-title')).toContainText('March 2026');
    await expect(page.getByText('Available').first()).toBeVisible();
    await expect(page.getByText('Working').first()).toBeVisible();
  });
});
