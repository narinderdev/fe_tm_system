import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on',
    headless: process.env.HEADLESS === 'false' ? false : true,
    launchOptions: {
      slowMo: Number(process.env.SLOWMO || 0)
    },
    video: 'on',
    screenshot: 'on'
  },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  webServer: {
    command: 'npm run start -- --host 0.0.0.0 --port 4200',
    url: 'http://localhost:4200/login',
    reuseExistingServer: true,
    timeout: 120000
  }
});
