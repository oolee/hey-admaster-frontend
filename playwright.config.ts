import { defineConfig } from '@playwright/test';

/**
 * hey-admaster-frontend E2E（hey-public）
 * 用系统 Edge/Chrome（channel）运行，免下载浏览器。
 * 依赖：后端 7188 + hey-public dev 7668 已在运行。
 */
export default defineConfig({
  testDir: './apps/hey-public/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:7668',
    headless: true,
    channel: 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
