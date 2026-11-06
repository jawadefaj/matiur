import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from any folder or static host.
  base: './',
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
