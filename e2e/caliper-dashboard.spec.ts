import { test, expect } from '@playwright/test';

test.describe('Caliper Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should load homepage with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/LeadHarvester/);
  });

  test('should display all tabs in navigation', async ({ page }) => {
    const tabButtons = page.locator('.tabs-list button');
    await expect(tabButtons).toHaveCount(10);
  });

  test('should allow switching to Scraper tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(0).click();
    await expect(page.locator('.tabs-content[value="scraper"]')).toBeVisible();
  });

  test('should allow switching to Leads tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(1).click();
    await expect(page.locator('.tabs-content[value="leads"]')).toBeVisible();
  });

  test('should allow switching to Finder tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(2).click();
    await expect(page.locator('.tabs-content[value="finder"]')).toBeVisible();
  });

  test('should allow switching to Validate tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(3).click();
    await expect(page.locator('.tabs-content[value="validate"]')).toBeVisible();
  });

  test('should allow switching to Campaigns tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(4).click();
    await expect(page.locator('.tabs-content[value="campaigns"]')).toBeVisible();
  });

  test('should allow switching to Charts tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(5).click();
    await expect(page.locator('.tabs-content[value="charts"]')).toBeVisible();
  });

  test('should allow switching to Import tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(6).click();
    await expect(page.locator('.tabs-content[value="import"]')).toBeVisible();
  });

  test('should allow switching to Scoring tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(7).click();
    await expect(page.locator('.tabs-content[value="scoring"]')).toBeVisible();
  });

  test('should allow switching to Duplicates tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(8).click();
    await expect(page.locator('.tabs-content[value="duplicates"]')).toBeVisible();
  });

  test('should allow switching to Tools tab', async ({ page }) => {
    await page.locator('.tabs-list button').nth(9).click();
    await expect(page.locator('.tabs-content[value="tools"]')).toBeVisible();
  });

  test('should display stats cards on dashboard', async ({ page }) => {
    await expect(page.locator('.stats-cards')).toBeVisible();
  });

  test('should have footer with copyright', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('LeadHarvester');
  });
});

test.describe('Leads Table Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(1).click();
  });

  test('should display leads table', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });

  test('should have table headers', async ({ page }) => {
    const headers = await page.$$eval('table thead th', ths =>
      ths.map(th => th.textContent?.trim())
    );
    expect(headers.length).toBeGreaterThan(0);
  });
});
