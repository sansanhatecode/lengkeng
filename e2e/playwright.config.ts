import { defineConfig, devices } from '@playwright/test';

/**
 * Chạy trọn luồng: khách quét QR → gọi món → phục vụ duyệt → bếp → thu ngân đóng bàn.
 * Cần Postgres đang chạy và đã seed (pnpm db:up && pnpm db:migrate && pnpm db:seed).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @lengkeng/api start',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://lengkeng:lengkeng@localhost:5432/lengkeng?schema=public',
        JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-secret-khong-dung-cho-production-123',
        CUSTOMER_URL: 'http://localhost:5173',
        CORS_ORIGINS: 'http://localhost:5173,http://localhost:5174',
        PORT: '3000',
      },
    },
    { command: 'pnpm --filter @lengkeng/customer preview', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: 'pnpm --filter @lengkeng/console preview', url: 'http://localhost:5174', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});
