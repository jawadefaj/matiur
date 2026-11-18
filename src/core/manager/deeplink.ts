// Reads the page URL's query string into what the game should open. Pure, so
// every form is unit-tested (tests/core/deeplink.test.ts).
//
//   ?episode=ep2                     Episode 2 from its title card
//   ?level=ep2/sortie-2              that step, then carry on through the episode
//   ?level=ep2/sortie-2&only=1       just that step, then back to the menu
//   ?play=flight&sortie=2            a mechanic on its own: no episode, nothing saved
//   ?play=walk&map=flightline
//   ?play=video&src=ep2_intro        preview a video or a cutscene
//   ?play=cutscene&script=ep2_beat_1
//   ?unlock=all                      dev builds only: open every episode and chapter
//   ?sortie=N, ?walk=flightline      old links, kept for now; same as ?play=...

export type DeepLink =
  | { kind: 'menu' }
  | { kind: 'episode'; episode: string }
  | { kind: 'step'; ref: string; only: boolean }
  /** `what` is a mechanic id, 'video' or 'cutscene'; `params` is the whole query string. */
  | { kind: 'play'; what: string; params: URLSearchParams };

export interface ParsedLink {
  link: DeepLink;
  unlockAll: boolean;
  /** Set when an old link form was used. */
  warning?: string;
}

export function parseDeepLink(search: string): ParsedLink {
  const q = new URLSearchParams(search);
  const unlockAll = q.get('unlock') === 'all';
  const play = q.get('play');
  if (play) return { link: { kind: 'play', what: play, params: q }, unlockAll };
  const level = q.get('level');
  if (level) return { link: { kind: 'step', ref: level, only: isTrue(q.get('only')) }, unlockAll };
  const episode = q.get('episode');
  if (episode) return { link: { kind: 'episode', episode }, unlockAll };
  // Links from before the game manager.
  const sortie = q.get('sortie');
  if (sortie) {
    const params = new URLSearchParams({ play: 'flight', sortie });
    return { link: { kind: 'play', what: 'flight', params }, unlockAll, warning: `?sortie=${sortie} is an old link; use ?play=flight&sortie=${sortie}` };
  }
  const walk = q.get('walk');
  if (walk) {
    const params = new URLSearchParams({ play: 'walk', map: walk });
    return { link: { kind: 'play', what: 'walk', params }, unlockAll, warning: `?walk=${walk} is an old link; use ?play=walk&map=${walk}` };
  }
  return { link: { kind: 'menu' }, unlockAll };
}

function isTrue(v: string | null): boolean {
  return v === '1' || v === 'true' || v === '';
}
