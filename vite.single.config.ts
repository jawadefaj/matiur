// A one-file build of the game (`npm run build:single`): Phaser, the game's
// code and every image are inlined into dist-single/index.html. That one file
// is the whole game: open it from disk, send it, or host it anywhere. Only
// the pixel font still comes from Google Fonts, and the game waits at most
// 3 s for it, so it also plays offline.
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import base from './vite.config';

// Puts each built script and stylesheet into the HTML page itself, then drops
// the separate files.
function inlineIntoHtml(): Plugin {
  return {
    name: 'inline-into-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'));
      if (!html || html.type !== 'asset') return;
      let page = String(html.source)
        // Phaser is bundled in, so the CDN import map is not needed.
        .replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '')
        .replace(/\s*<!-- Production builds load Phaser from the CDN[^>]*-->/, '');
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === 'chunk' && file.isEntry) {
          const tag = new RegExp(`<script type="module"[^>]*src="[^"]*${escape(name)}"[^>]*></script>`);
          // `</script` inside the code would end the tag early.
          const code = file.code.replace(/<\/script/gi, '<\\/script');
          page = page.replace(tag, () => `<script type="module">\n${code}\n</script>`);
          delete bundle[name];
        } else if (file.type === 'asset' && name.endsWith('.css')) {
          const tag = new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${escape(name)}"[^>]*>`);
          page = page.replace(tag, () => `<style>\n${String(file.source)}\n</style>`);
          delete bundle[name];
        }
      }
      html.source = page;
    },
  };
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const config = mergeConfig(
  base,
  defineConfig({
    publicDir: false,
    plugins: [inlineIntoHtml()],
    build: {
      outDir: 'dist-single',
      minify: true,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
      // One chunk, so there is nothing left to load beside the page.
      rolldownOptions: { output: { codeSplitting: false } },
    },
  }),
);
// mergeConfig concatenates arrays, so the base build's `external: ['phaser']`
// is replaced after merging: here Phaser is bundled from node_modules.
config.build!.rolldownOptions!.external = [];

export default config;
