import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run serve:test -- --port 4321",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /theme-(?:scrollbar|svg-webkit)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: /theme-(?:scrollbar|svg-webkit)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop-scrollbar",
      testMatch: /theme-scrollbar\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 3840, height: 2160 },
        launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
      },
    },
    {
      name: "webkit-theme",
      testMatch: /theme-svg-webkit\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
