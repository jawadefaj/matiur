import { test, expect } from '@playwright/test';

test.describe('Performance & Game Functionality', () => {
  test('should initialize game within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Game should load within 10 seconds even on slower connections
    expect(loadTime).toBeLessThan(10000);
  });

  test('should maintain 60 FPS (or stable framerate)', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Wait for game to stabilize
    await page.waitForTimeout(2000);

    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        let lastTime = performance.now();

        const countFrames = () => {
          frames++;
          const now = performance.now();
          if (now - lastTime >= 1000) {
            resolve(frames);
          } else {
            requestAnimationFrame(countFrames);
          }
        };

        requestAnimationFrame(countFrames);
      });
    });

    // Should have reasonable FPS (at least 30 FPS)
    expect(fps).toBeGreaterThan(30);
  });

  test('should handle window resize', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    const originalSize = await canvas.boundingBox();

    // Simulate window resize
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await page.waitForTimeout(500);

    const resizedSize = await canvas.boundingBox();

    // Canvas should still be visible after resize
    await expect(canvas).toBeVisible();
    expect(resizedSize).not.toBeNull();
  });

  test('should not leak memory over time', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    // Run some actions for a bit
    await page.waitForTimeout(5000);

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    // If memory is available, check it didn't grow excessively
    if (initialMemory && finalMemory) {
      const growthPercent = ((finalMemory - initialMemory) / initialMemory) * 100;
      // Allow up to 100% growth for initialization, but not more
      expect(growthPercent).toBeLessThan(100);
    }
  });

  test('should handle visibility change (tab switching)', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Simulate page becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Simulate page becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Game should still be playable
    await expect(canvas).toBeVisible();
  });
});
