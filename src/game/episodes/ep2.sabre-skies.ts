// THE GAME SCRIPT, part 2: Level 1, Sabre Skies (id 'ep2', kept for saves), as a list of steps played
// in order. Each step is a video, a mechanic level, a cutscene or a card.
// Step ids are save keys: don't rename them once released (sortie-1..3 also
// carry over progress from the old save).
import { archiveCard, defineEpisode, video } from '../../core/define';
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
    // 1.1: Opening video — learn who Matiur is
    video('opening', { src: 'ep2_opening', fallback: [t('ep2.intro.1'), t('ep2.intro.2')] }),
    // 1.2: First flight line scene (30 seconds)
    video('flight-line', { src: 'ep2_flight_line', fallback: [t('ep2.beat1.1'), t('ep2.beat1.2')] }),

    // 2.1: Sortie 1 (Scramble)
    flight.level('sortie-1', { sortie: 1 }),
    // 2.2: 15-second beat between sorties
    video('between-1', { src: 'ep2_between_1', fallback: [t('ep2.beat1.1')] }),
    // 2.3: That night, the orange raid (stealth on foot, a rehearsal for Level 2)
    walk.level('orange-raid', { map: 'orchard' }),

    // 3: Sortie 2 (Intercept)
    flight.level('sortie-2', { sortie: 2 }),

    // 4.1: Before final sortie — setup for low-level flight
    video('pre-sortie-3', { src: 'ep2_pre_sortie_3', fallback: [t('ep2.beat2.1')] }),
    // 4.2: 30-second mission briefing video
    video('mission-3', { src: 'ep2_mission_3', fallback: [t('ep2.beat2.1')] }),

    // 4.3: Sortie 3 (Low and Home)
    flight.level('sortie-3', { sortie: 3 }),

    // 4.4: 15-second post-sortie beat
    video('after-sortie-3', { src: 'ep2_after_sortie_3', fallback: [t('ep2.beat2.1')] }),

    archiveCard('archive', {
      cardId: 'ep2_sabre_skies',
      heading: t('ep2.title'),
      date: t('ep2.date'),
      text: t('ep2.archive.text'),
    }),
  ],
});
