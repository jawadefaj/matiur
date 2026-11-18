// A one-file build of the game (`npm run build:single`): the game's code and
// every image are inlined into dist-single/, so the game can be shared as a
// single HTML page. Phaser still comes from the CDN via the import map.
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

export default mergeConfig(
  base,
  defineConfig({
    publicDir: false,
    build: {
      outDir: 'dist-single',
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
    },
  }),
);
