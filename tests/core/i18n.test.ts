// src/data/strings.xml holds every word the player sees. These checks catch
// the usual slips when it is edited: a missing or misspelled id, a {name}
// dropped from a translation, or English left in the code.
import { describe, expect, it } from 'vitest';
import { STRINGS, localDigits, parseStrings, t } from '../../src/core/i18n';

const SOURCES = import.meta.glob<string>('/src/**/*.ts', { query: '?raw', import: 'default', eager: true });

/** Every literal id passed to t('...') in the game's code. */
function usedIds(): Map<string, string> {
  const used = new Map<string, string>();
  for (const [file, text] of Object.entries(SOURCES)) {
    for (const m of text.matchAll(/\bt\(\s*'([^']+)'/g)) used.set(m[1], file);
  }
  return used;
}

const placeholders = (s: string) => [...s.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();

describe('strings.xml', () => {
  it('parses, with a font and some strings', () => {
    expect(STRINGS.entries.size).toBeGreaterThan(200);
    expect(STRINGS.font.family).not.toBe('');
    expect(STRINGS.font.scale).toBeGreaterThan(0);
  });

  it('has every id the code asks for', () => {
    const missing = [...usedIds()].filter(([id]) => !STRINGS.entries.has(id)).map(([id, f]) => `${id} (${f})`);
    expect(missing).toEqual([]);
  });

  it('has no ids the code never uses', () => {
    // An id counts as used if it appears quoted anywhere, e.g. t(done ? 'a' : 'b').
    const all = Object.values(SOURCES).join('\n');
    expect([...STRINGS.entries.keys()].filter((id) => !all.includes(`'${id}'`))).toEqual([]);
  });

  it('keeps every {name} of the English in each translation', () => {
    const bad = [...STRINGS.entries]
      .filter(([, e]) => e.en && placeholders(e.en).join() !== placeholders(e.text).join())
      .map(([id, e]) => `${id}: English has {${placeholders(e.en)}}, text has {${placeholders(e.text)}}`);
    expect(bad).toEqual([]);
  });

  it('fills in parameters and leaves unknown ones', () => {
    expect(t('menu.level', { n: 2, title: 'X' })).toContain('X');
    expect(t('ep2.archive.text')).toContain('{sortie-3.time}');
    expect(t('no.such.id')).toBe('[no.such.id]');
  });

  it('decodes entities, line breaks and comments, and refuses a repeated id', () => {
    const s = parseStrings(`<strings lang="bn"><!-- <s id="gone">x</s> --><s id="a" en="A &amp; B">ক &amp; খ\\nগ</s></strings>`);
    expect(s.entries.get('a')).toEqual({ text: 'ক & খ\nগ', en: 'A & B' });
    expect(s.entries.has('gone')).toBe(false);
    expect(() => parseStrings('<s id="a">1</s><s id="a">2</s>')).toThrow(/twice/);
  });

  it('writes digits the way the XML asks', () => {
    expect(localDigits('11:30')).toBe(STRINGS.digits === 'bangla' ? '১১:৩০' : '11:30');
  });

  it('leaves no English text in the scenes', () => {
    // Text drawn by txt(), a Button label or setText that is a plain English literal.
    const re = /(?:txt\([^,]+,[^,]+,[^,]+,\s*|new Button\((?:[^,]+,){5}\s*|setText\(|setLabel\()['`]([A-Za-z][^'`]*[A-Za-z][^'`]*)['`]/g;
    // Dev-only screens and symbols, not words.
    const allowed = new Set(['GAME DEFINITION PROBLEMS', 'II']);
    const bad = Object.entries(SOURCES).flatMap(([f, text]) =>
      [...text.matchAll(re)].filter((m) => !allowed.has(m[1])).map((m) => `${f}: ${m[1]}`),
    );
    expect(bad).toEqual([]);
  });
});
