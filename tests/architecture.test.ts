// Keeps the code layout that lets mechanic branches merge without conflicts:
// core never imports a mechanic or the game, no mechanic imports another, and
// Phaser stays in scene/runtime files so the rest runs in tests.
import { describe, expect, it } from 'vitest';

// Every source file's text, read at build time (no Node APIs needed).
const SOURCES = import.meta.glob<string>('/src/**/*.ts', { query: '?raw', import: 'default', eager: true });

/** Value imports (not `import type`) of a file, resolved to /src/... paths or bare package names. */
function imports(file: string, text: string): string[] {
  const out: string[] = [];
  const re = /^\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  for (const m of text.matchAll(re)) {
    if (m[1]) continue;
    const spec = m[2];
    if (!spec.startsWith('.')) {
      out.push(spec);
      continue;
    }
    const parts = file.split('/').slice(0, -1);
    for (const p of spec.split('/')) {
      if (p === '..') parts.pop();
      else if (p !== '.') parts.push(p);
    }
    out.push(parts.join('/'));
  }
  return out;
}

const area = (p: string): string => {
  const m = /^\/src\/(core|game|mechanics\/[^/]+)/.exec(p);
  return m ? m[1] : p === '/src/main.ts' ? 'main' : 'other';
};

/** Files allowed to import Phaser as a value. */
const PHASER_OK = [
  /^\/src\/core\/scenes\//,
  /^\/src\/core\/ui\//,
  /^\/src\/core\/gfx\/textures\.ts$/,
  /^\/src\/core\/manager\/(GameManager|createGame)\.ts$/,
  /^\/src\/mechanics\/[^/]+\/scenes\//,
  /^\/src\/mechanics\/[^/]+\/runtime\.ts$/,
];

describe('architecture', () => {
  const files = Object.entries(SOURCES);

  it('reads the sources', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('core imports neither mechanics nor the game', () => {
    const bad = files.flatMap(([f, t]) => (area(f) === 'core' ? imports(f, t).filter((i) => /^\/src\/(mechanics|game)\//.test(i)).map((i) => `${f} -> ${i}`) : []));
    expect(bad).toEqual([]);
  });

  it('no mechanic imports another mechanic or the game', () => {
    const bad = files.flatMap(([f, t]) => {
      const a = area(f);
      if (!a.startsWith('mechanics/')) return [];
      return imports(f, t)
        .filter((i) => i.startsWith('/src/') && (area(i) === 'game' || (area(i).startsWith('mechanics/') && area(i) !== a)))
        .map((i) => `${f} -> ${i}`);
    });
    expect(bad).toEqual([]);
  });

  it('only scenes, runtimes and the manager import Phaser', () => {
    const bad = files.filter(([f, t]) => imports(f, t).includes('phaser') && !PHASER_OK.some((r) => r.test(f))).map(([f]) => f);
    expect(bad).toEqual([]);
  });

  it('every mechanic folder has a descriptor (index.ts) and a runtime (runtime.ts)', () => {
    const mechanics = new Set(files.map(([f]) => /^\/src\/mechanics\/([^/]+)\//.exec(f)?.[1]).filter(Boolean));
    for (const m of mechanics) {
      expect(SOURCES[`/src/mechanics/${m}/index.ts`], `${m}/index.ts`).toBeDefined();
      expect(SOURCES[`/src/mechanics/${m}/runtime.ts`], `${m}/runtime.ts`).toBeDefined();
    }
  });
});
