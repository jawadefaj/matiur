// Vite settings for the dev server (`npm run dev`), the preview server
// (`npm run preview`) and the static build in dist/ (`npm run build`).
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from any folder or static host.
  base: './',
  // assets/public/ holds the app icon and web-app manifest. Vite serves these
  // files at the site root and copies them unchanged into dist/. Nothing else
  // in assets/ goes into the build.
  publicDir: 'assets/public',
  server: {
    // Listen on the LAN so a phone on the same Wi-Fi can open the dev server.
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2022',
    // Phaser comes from the CDN via the import map in index.html, so the
    // build holds only this project's code. Left unminified to stay readable.
    minify: false,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      external: ['phaser'],
    },
  },
});
