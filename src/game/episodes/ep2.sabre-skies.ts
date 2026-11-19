// THE GAME SCRIPT, part 2: Level 1, Sabre Skies (id 'ep2', kept for saves), as a list of steps played
// in order. Each step is a video, a mechanic level, a cutscene or a card.
// Step ids are save keys: don't rename them once released (sortie-1..3 also
// carry over progress from the old save).
import { archiveCard, cutscene, defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { flight } from '../../mechanics/flight';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'ep2',
  number: 1,
  kind: 'playable',
  title: t('ep2.title'),
  date: t('ep2.date'),
  place: t('ep2.place'),
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
    video('intro', { src: 'ep2_intro', fallback: [t('ep2.intro.1'), t('ep2.intro.2')] }),
    walk.level('flight-line', { map: 'flightline' }),
    flight.level('sortie-1', { sortie: 1 }),
    // Between-sortie beats (GDD §3, Episode 2): in-engine scenes at the flight
    // line. Placeholder lines until src/data/cutscenes/ep2_beat_*.json are written.
    cutscene('beat-1', {
      script: 'ep2_beat_1',
      placeholder: [
        { speaker: t('who.crewChief'), text: t('ep2.beat1.1') },
        { text: t('ep2.beat1.2') },
      ],
    }),
    flight.level('sortie-2', { sortie: 2 }),
    cutscene('beat-2', {
      script: 'ep2_beat_2',
      placeholder: [{ text: t('ep2.beat2.1') }],
    }),
    flight.level('sortie-3', { sortie: 3 }),
    archiveCard('archive', {
      cardId: 'ep2_sabre_skies',
      heading: t('ep2.title'),
      date: t('ep2.date'),
      text: t('ep2.archive.text'),
    }),
  ],
});
