// CHAPTER 7: Masroor: The Flight Schedule (stealth). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'ch07',
  number: 7,
  kind: 'playable',
  mode: 'stealth',
  title: t('ch07.title'),
  date: t('ch07.date'),
  place: t('ch07.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch06' } to unlock in order
  steps: [
    video('intro', { src: clip('ch07_flight_schedule_intro', 15), fallback: [t('ch07.blurb')] }, { title: t('ch07.title') }),
    walk.level('play', { map: 'masroor-schedule' }, { title: t('ch07.title') }),
    video('outro', { src: clip('ch07_flight_schedule_outro', 15), fallback: [t('ch07.blurb')] }, { title: t('ch07.title') }),
  ],
});
