// Every URL form the game understands (src/core/manager/deeplink.ts).
import { describe, expect, it } from 'vitest';
import { parseDeepLink } from '../../src/core/manager/deeplink';

describe('parseDeepLink', () => {
  it('opens the menu by default', () => {
    expect(parseDeepLink('').link).toEqual({ kind: 'menu' });
    expect(parseDeepLink('?foo=1').link).toEqual({ kind: 'menu' });
  });

  it('starts an episode or a step', () => {
    expect(parseDeepLink('?episode=ep2').link).toEqual({ kind: 'episode', episode: 'ep2' });
    expect(parseDeepLink('?level=ep2/sortie-2').link).toEqual({ kind: 'step', ref: 'ep2/sortie-2', only: false });
    expect(parseDeepLink('?level=ep2/sortie-2&only=1').link).toEqual({ kind: 'step', ref: 'ep2/sortie-2', only: true });
  });

  it('plays a mechanic, video or cutscene on its own', () => {
    for (const [q, what] of [
      ['?play=flight&sortie=2', 'flight'],
      ['?play=walk&map=flightline', 'walk'],
      ['?play=video&src=ep2_intro', 'video'],
      ['?play=cutscene&script=ep2_beat_1', 'cutscene'],
    ]) {
      const { link } = parseDeepLink(q);
      expect(link.kind).toBe('play');
      if (link.kind === 'play') expect(link.what).toBe(what);
    }
    const { link } = parseDeepLink('?play=flight&sortie=2');
    if (link.kind === 'play') expect(link.params.get('sortie')).toBe('2');
  });

  it('maps the old ?sortie= and ?walk= links, with a warning', () => {
    const s = parseDeepLink('?sortie=3');
    expect(s.warning).toBeTruthy();
    expect(s.link.kind === 'play' && s.link.what === 'flight' && s.link.params.get('sortie')).toBe('3');
    const w = parseDeepLink('?walk=flightline');
    expect(w.link.kind === 'play' && w.link.what === 'walk' && w.link.params.get('map')).toBe('flightline');
  });

  it('reads ?unlock=all alongside any link', () => {
    expect(parseDeepLink('?unlock=all').unlockAll).toBe(true);
    expect(parseDeepLink('?episode=ep2&unlock=all').unlockAll).toBe(true);
    expect(parseDeepLink('?episode=ep2').unlockAll).toBe(false);
  });
});
