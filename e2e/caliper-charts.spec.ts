import { test, expect } from '@playwright/test';

test.describe('Charts Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(5).click();
  });

  test('should display charts panel', async ({ page }) => {
    await expect(page.locator('.charts-panel')).toBeVisible();
  });
});

test.describe('Dashboard Charts Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display dashboard charts', async ({ page }) => {
    await expect(page.locator('.dashboard-charts')).toBeVisible();
  });
});
