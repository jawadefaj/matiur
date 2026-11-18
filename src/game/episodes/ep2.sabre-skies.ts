// THE GAME SCRIPT, part 2: Episode 2, Sabre Skies, as a list of steps played
// in order. Each step is a video, a mechanic level, a cutscene or a card.
// Step ids are save keys: don't rename them once released (sortie-1..3 also
// carry over progress from the old save).
import { archiveCard, cutscene, defineEpisode, video } from '../../core/define';
import { flight } from '../../mechanics/flight';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'ep2',
  number: 2,
  kind: 'playable',
  title: 'Sabre Skies',
  date: 'September 1965',
  place: 'PAF Station Peshawar',
  unlock: 'always', // becomes { after: 'ep1' } once Episode 1 exists
  // Shown under the chapter list in the menu.
  notes: [
    'HOW TO FLY',
    'Drag anywhere: steer toward the drag',
    'THROTTLE (right edge): speed + fuel',
    'PULL: tighter turn, more G',
    '',
    'Content note: depicts the 1965 air war.',
    'Hit aircraft break off; none explode.',
  ],
  steps: [
    // Plays assets/video/ep2_intro.mp4 once it exists; until then, this text.
    video('intro', { src: 'ep2_intro', fallback: ['September 1965.', 'PAF Station Peshawar.'] }),
    walk.level('flight-line', { map: 'flightline' }),
    flight.level('sortie-1', { sortie: 1 }),
    // Between-sortie beats (GDD §3, Episode 2): in-engine scenes at the flight
    // line. Placeholder lines until src/data/cutscenes/ep2_beat_*.json are written.
    cutscene('beat-1', {
      script: 'ep2_beat_1',
      placeholder: [
        { speaker: 'Crew Chief', text: '[Placeholder] Refuelled and rearmed, sir.' },
        { text: '[Placeholder] Writer pass needed: a short beat at the flight line.' },
      ],
    }),
    flight.level('sortie-2', { sortie: 2 }),
    cutscene('beat-2', {
      script: 'ep2_beat_2',
      placeholder: [{ text: '[Placeholder] Writer pass needed: a letter from home.' }],
    }),
    flight.level('sortie-3', { sortie: 3 }),
    archiveCard('archive', {
      cardId: 'ep2_sabre_skies',
      heading: 'Sabre Skies',
      date: 'September 1965',
      text: '[Placeholder] A photo, the date and a short sourced paragraph go here (GDD §0 rule 4).\n\nYour last sortie: {sortie-3.time}, airframe {sortie-3.airframe}.',
    }),
  ],
});
