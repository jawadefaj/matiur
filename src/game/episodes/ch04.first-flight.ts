// CHAPTER 4: Risalpur: First Flight (flight). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { flight } from '../../mechanics/flight';

export default defineEpisode({
  id: 'ch04',
  number: 4,
  kind: 'playable',
  mode: 'flight',
  title: t('ch04.title'),
  date: t('ch04.date'),
  place: t('ch04.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch03' } to unlock in order
  steps: [
    video('intro', { src: clip('ch04_first_flight_intro', 15), fallback: [t('ch04.blurb')] }, { title: t('ch04.title') }),
    // TODO: the Risalpur tutorial flight does not exist yet; sortie 1 stands in.
    flight.level('play', { sortie: 1 }, { title: t('ch04.title') }),
    video('outro', { src: clip('ch04_first_flight_outro', 15), fallback: [t('ch04.blurb')] }, { title: t('ch04.title') }),
  ],
});
