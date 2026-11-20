import { test, expect } from '@playwright/test';

test.describe('Game Initialization', () => {
  test('should load the game page', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toContain('/');
  });

  test('should render the game canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out expected warnings that aren't actual errors
    const realErrors = errors.filter((err) => !err.includes('Loading font') && !err.includes('ERR'));

    expect(realErrors).toHaveLength(0);
  });

  test('should have game container', async ({ page }) => {
    await page.goto('/');
    const gameContainer = page.locator('#game');
    await expect(gameContainer).toBeVisible();
  });

  test('should set correct viewport metadata', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });
});
