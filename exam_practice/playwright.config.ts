import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4177', ...devices['Desktop Chrome'], screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://127.0.0.1:4177', reuseExistingServer: !process.env.CI },
});
