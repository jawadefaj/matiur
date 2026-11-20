import { test, expect, devices } from '@playwright/test';

test.describe('Browser Compatibility', () => {
  test('chromium: should load in Chrome/Chromium', async ({ browserName, page }) => {
    test.skip(browserName !== 'chromium', 'Chromium only');
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Check ES2022 compatibility by verifying optional chaining works
    const result = await page.evaluate(() => {
      const obj = { nested: { value: 42 } };
      return obj?.nested?.value;
    });
    expect(result).toBe(42);
  });

  test('firefox: should load in Firefox', async ({ browserName, page }) => {
    test.skip(browserName !== 'firefox', 'Firefox only');
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Verify nullish coalescing
    const result = await page.evaluate(() => {
      const a = null;
      return a ?? 'default';
    });
    expect(result).toBe('default');
  });

  test('webkit: should load in Safari', async ({ browserName, page }) => {
    test.skip(browserName !== 'webkit', 'WebKit only');
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Verify modern array methods
    const result = await page.evaluate(() => {
      return [1, 2, 3].at(-1);
    });
    expect(result).toBe(3);
  });
});

test.describe('Cross-browser Features', () => {
  test('should support ES modules', async ({ page }) => {
    await page.goto('/');
    const moduleScript = await page.locator('script[type="module"]').count();
    expect(moduleScript).toBeGreaterThan(0);
  });

  test('should have canvas with correct context', async ({ page }) => {
    await page.goto('/');

    const hasCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas !== null && canvas.getContext('2d') !== null;
    });

    expect(hasCanvas).toBe(true);
  });

  test('should handle touch events', async ({ page, browserName }) => {
    // WebKit (Safari) may have different touch behavior
    await page.goto('/');

    const canvas = page.locator('canvas');
    const bbox = await canvas.boundingBox();

    if (bbox) {
      await page.touchscreen.tap(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
      // Verify no errors after touch
      const errors = await page.evaluate(() => {
        const result: boolean = (window as any).hasOwnProperty('__touchError');
        return result;
      });
      expect(errors).toBe(false);
    }
  });

  test('should respect safe-area-inset CSS variables', async ({ page }) => {
    await page.goto('/');

    const hasEnv = await page.evaluate(() => {
      const style = window.getComputedStyle(document.querySelector('#game') || document.body);
      const top = style.getPropertyValue('top');
      return top.includes('env') || top === '0px';
    });

    expect(hasEnv).toBe(true);
  });

  test('should disable text selection', async ({ page }) => {
    await page.goto('/');

    const userSelect = await page.evaluate(() => {
      return window.getComputedStyle(document.body).userSelect;
    });

    expect(userSelect).toBe('none');
  });
});
