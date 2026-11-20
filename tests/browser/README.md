# Cross-Browser Tests

This directory contains Playwright E2E tests that verify the game works correctly across different browsers: **Chrome (Chromium)**, **Firefox**, and **Safari (WebKit)**.

## Test Files

- **game-loads.spec.ts** — Basic game initialization and rendering
  - Game page loads
  - Canvas renders
  - No console errors
  - Game container is visible
  - Viewport metadata is correct

- **browser-specific.spec.ts** — Browser-specific features and ES2022 compatibility
  - Chrome/Chromium tests with optional chaining
  - Firefox tests with nullish coalescing
  - Safari tests with modern array methods
  - Cross-browser touch event handling
  - CSS safe-area-inset support
  - Text selection disabled

- **performance.spec.ts** — Performance and stability tests
  - Game initialization time
  - Frame rate stability (30+ FPS)
  - Window resize handling
  - Memory leak detection
  - Tab visibility changes (pause/resume)

- **media.spec.ts** — Media and audio API support
  - Web Audio API
  - HTML Media Elements (video/audio)
  - Blob URLs
  - Fetch API
  - localStorage
  - Font loading
  - requestAnimationFrame
  - Canvas contexts (2D/WebGL)

## Running Tests

### Install dependencies
```bash
npm install
```

### Run all browser tests
```bash
npm run test:browser
```

### Run tests in UI mode (interactive)
```bash
npm run test:browser:ui
```

### Run tests for specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run specific test file
```bash
npx playwright test tests/browser/game-loads.spec.ts
```

### Generate HTML report
```bash
npm run test:browser
npx playwright show-report
```

## Browser Versions

Playwright tests run with:
- **Chromium** — Latest stable
- **Firefox** — Latest stable
- **WebKit (Safari)** — Latest stable

These versions are automatically downloaded by Playwright.

## CI/CD Integration

The `playwright.config.ts` is set up to run in CI environments:
- Retries failing tests up to 2 times
- Uses a single worker to prevent flakiness
- Captures traces on first retry for debugging
- Generates HTML reports

## Debugging Tests

### Run with debug output
```bash
npx playwright test --debug
```

### Generate trace files for debugging
Traces are automatically captured on first retry and saved in `test-results/`.

### View trace
```bash
npx playwright show-trace test-results/trace.zip
```

### Take screenshots during tests
Add to any test:
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

## Adding New Tests

Create new test files in `tests/browser/` with the `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Your test here
  });
});
```

## Notes

- Tests run against the dev server at `http://localhost:5173`
- The dev server starts automatically when running tests
- Tests use `baseURL` from config, so `page.goto('/')` loads the game
- All browser tests run in parallel for speed (unless in CI)
- HTML reports are generated in `playwright-report/`

## Troubleshooting

### "Port 5173 already in use"
Kill the existing process or change the port in `vite.config.ts`

### Tests timing out
Increase `timeout` in test or use `test.setTimeout()`

### Safari (WebKit) tests fail on Linux
WebKit requires additional dependencies. Install using:
```bash
npx playwright install --with-deps webkit
```

### Canvas not visible in tests
Some headless environments may have Canvas limitations. Use `headed: true` for debugging:
```bash
npx playwright test --headed
```
