import { test, expect } from '@playwright/test';

test.describe('Campaigns Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(4).click();
  });

  test('should display campaigns panel', async ({ page }) => {
    await expect(page.locator('.campaigns-panel')).toBeVisible();
  });

  test('should have default active status', async ({ page }) => {
    await expect(page.locator('text=/active/i')).toBeVisible();
  });
});

test.describe('Scraper Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(0).click();
  });

  test('should display scraper panel', async ({ page }) => {
    await expect(page.locator('.scraper-panel')).toBeVisible();
  });
});

test.describe('Finder Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(2).click();
  });

  test('should display finder panel', async ({ page }) => {
    await expect(page.locator('.finder-panel')).toBeVisible();
  });
});

test.describe('Validation Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(3).click();
  });

  test('should display validation panel', async ({ page }) => {
    await expect(page.locator('.validation-panel')).toBeVisible();
  });
});

test.describe('Import Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(6).click();
  });

  test('should display import panel', async ({ page }) => {
    await expect(page.locator('.import-panel')).toBeVisible();
  });
});

test.describe('Scoring Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(7).click();
  });

  test('should display scoring panel', async ({ page }) => {
    await expect(page.locator('.score-panel')).toBeVisible();
  });
});

test.describe('Duplicates Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(8).click();
  });

  test('should display duplicates panel', async ({ page }) => {
    await expect(page.locator('.duplicates-panel')).toBeVisible();
  });
});

test.describe('Tools Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('.tabs-list button').nth(9).click();
  });

  test('should display tools panel', async ({ page }) => {
    await expect(page.locator('.tools-panel')).toBeVisible();
  });
});
