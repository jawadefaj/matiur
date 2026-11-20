// CHAPTER 11: 20 August: The Last Flight (flight). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { flight } from '../../mechanics/flight';

export default defineEpisode({
  id: 'ch11',
  number: 11,
  kind: 'playable',
  mode: 'flight',
  title: t('ch11.title'),
  date: t('ch11.date'),
  place: t('ch11.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch10' } to unlock in order
  steps: [
    video('intro', { src: clip('ch11_last_flight_intro', 15), fallback: [t('ch11.blurb')] }, { title: t('ch11.title') }),
    // TODO: the last flight (radar, the struggle, the fixed crash) does not exist yet; sortie 3 stands in.
    flight.level('play', { sortie: 3 }, { title: t('ch11.title') }),
    video('outro', { src: clip('ch11_last_flight_outro', 15), fallback: [t('ch11.blurb')] }, { title: t('ch11.title') }),
  ],
});
