// CHAPTER 5: 1967: Dogfight and Crash (flight). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { flight } from '../../mechanics/flight';

export default defineEpisode({
  id: 'ch05',
  number: 5,
  kind: 'playable',
  mode: 'flight',
  title: t('ch05.title'),
  date: t('ch05.date'),
  place: t('ch05.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch04' } to unlock in order
  steps: [
    video('intro', { src: clip('ch05_dogfight_1967_intro', 15), fallback: [t('ch05.blurb')] }, { title: t('ch05.title') }),
    // TODO: the 1967 dogfight, engine failure, eject and parachute do not exist yet; sortie 2 stands in.
    flight.level('play', { sortie: 2 }, { title: t('ch05.title') }),
    video('outro', { src: clip('ch05_dogfight_1967_outro', 15), fallback: [t('ch05.blurb')] }, { title: t('ch05.title') }),
  ],
});
