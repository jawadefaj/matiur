// Every word the player sees comes from src/data/strings.xml, looked up by id
// with t(). The XML also sets the font and the digits. Phaser-free, so tests
// and descriptors can import it.
import xml from '../data/strings.xml?raw';

export interface StringEntry {
  /** The text the game shows. */
  text: string;
  /** The original English, for reference only. */
  en: string;
}

export interface Strings {
  lang: string;
  font: { family: string; weight: number; scale: number };
  digits: 'bangla' | 'latin';
  entries: Map<string, StringEntry>;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** XML entities and the `\n` escape to plain text. */
function decode(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_m, e: string) => {
      if (e[0] !== '#') return ENTITIES[e.toLowerCase()];
      return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    })
    .replace(/\\n/g, '\n');
}

function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = decode(m[2]);
  return out;
}

/** Parse the strings file. Throws on a repeated id, so a copy-paste slip shows up at once. */
export function parseStrings(source: string): Strings {
  const body = source.replace(/<!--[\s\S]*?-->/g, '');
  const root = attrs(/<strings\b([^>]*)>/.exec(body)?.[1] ?? '');
  const f = attrs(/<font\b([^>]*)\/?>/.exec(body)?.[1] ?? '');
  const digits = /<digits>\s*(\w+)\s*<\/digits>/.exec(body)?.[1] === 'latin' ? 'latin' : 'bangla';
  const entries = new Map<string, StringEntry>();
  for (const m of body.matchAll(/<s\b([^>]*)>([\s\S]*?)<\/s>/g)) {
    const a = attrs(m[1]);
    if (!a.id) throw new Error(`strings.xml: an <s> has no id: ${m[0].slice(0, 80)}`);
    if (entries.has(a.id)) throw new Error(`strings.xml: id "${a.id}" is used twice`);
    entries.set(a.id, { text: decode(m[2].trim()), en: a.en ?? '' });
  }
  return {
    lang: root.lang ?? 'bn',
    font: {
      family: f.family || 'Noto Sans Bengali',
      weight: Number(f.weight) || 400,
      scale: Number(f.scale) || 1,
    },
    digits,
    entries,
  };
}

export const STRINGS = parseStrings(xml);

/** Font for all game text: the XML's family, then any Bengali font the device has. */
export const FONT = `"${STRINGS.font.family}", "Noto Sans Bengali", "Hind Siliguri", sans-serif`;
export const FONT_WEIGHT = STRINGS.font.weight;
/** Every text size is multiplied by this (the layout was made for an 8 px pixel font). */
export const FONT_SCALE = STRINGS.font.scale;

/**
 * The text for `id`, with each {name} replaced by params[name]. A {name} with
 * no param is left as it is (the archive card fills {step.stat} later).
 * An unknown id shows as [id], so a missing line is easy to spot in the game.
 */
export function t(id: string, params: Record<string, string | number> = {}): string {
  const e = STRINGS.entries.get(id);
  if (!e) {
    console.warn(`strings.xml has no id "${id}"`);
    return `[${id}]`;
  }
  return e.text.replace(/\{([^}]+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Western digits to Bangla ones when the XML asks for them. txt() runs every game text through this. */
export function localDigits(s: string): string {
  return STRINGS.digits === 'bangla' ? s.replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)]) : s;
}
