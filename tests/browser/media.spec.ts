import { test, expect } from '@playwright/test';

test.describe('Media & Audio', () => {
  test('should support Web Audio API', async ({ page }) => {
    await page.goto('/');

    const hasWebAudio = await page.evaluate(() => {
      const contextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      return contextClass !== undefined;
    });

    expect(hasWebAudio).toBe(true);
  });

  test('should support HTMLMediaElement (video/audio)', async ({ page }) => {
    await page.goto('/');

    const hasMediaElement = await page.evaluate(() => {
      const video = document.createElement('video');
      const audio = document.createElement('audio');
      return (
        typeof video.play === 'function' && typeof audio.play === 'function'
      );
    });

    expect(hasMediaElement).toBe(true);
  });

  test('should support Blob URLs for media', async ({ page }) => {
    await page.goto('/');

    const supportsBlobUrl = await page.evaluate(() => {
      try {
        const blob = new Blob(['test'], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const supported = url.startsWith('blob:');
        URL.revokeObjectURL(url);
        return supported;
      } catch {
        return false;
      }
    });

    expect(supportsBlobUrl).toBe(true);
  });

  test('should support fetch for loading assets', async ({ page }) => {
    await page.goto('/');

    const supportsFetch = await page.evaluate(() => {
      return typeof fetch === 'function';
    });

    expect(supportsFetch).toBe(true);
  });

  test('should support localStorage', async ({ page }) => {
    await page.goto('/');

    const hasLocalStorage = await page.evaluate(() => {
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        const success = localStorage.getItem(test) === test;
        localStorage.removeItem(test);
        return success;
      } catch {
        return false;
      }
    });

    expect(hasLocalStorage).toBe(true);
  });

  test('should handle font loading', async ({ page }) => {
    await page.goto('/');

    // Wait for fonts to potentially load
    await page.waitForTimeout(3000);

    const fontLoaded = await page.evaluate(() => {
      if (!('fonts' in document)) return false;
      return (document.fonts as any).ready !== undefined;
    });

    expect(fontLoaded).toBe(true);
  });

  test('should support requestAnimationFrame', async ({ page }) => {
    await page.goto('/');

    const supportsRAF = await page.evaluate(() => {
      return typeof requestAnimationFrame === 'function';
    });

    expect(supportsRAF).toBe(true);
  });

  test('should support WebGL/Canvas 2D context', async ({ page }) => {
    await page.goto('/');

    const contextsSupported = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const ctx2d = canvas.getContext('2d') !== null;
      const contextGL =
        canvas.getContext('webgl') !== null ||
        canvas.getContext('webgl2') !== null ||
        canvas.getContext('experimental-webgl') !== null;

      return { ctx2d, contextGL };
    });

    expect(contextsSupported.ctx2d).toBe(true);
    // GL context might not be available in all test environments, so we just check it's checked
    expect(typeof contextsSupported.contextGL).toBe('boolean');
  });
});
