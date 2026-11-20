// CHAPTER 10: 20 August: Stopping the T-33 (interaction). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'ch10',
  number: 10,
  kind: 'playable',
  mode: 'interaction',
  title: t('ch10.title'),
  date: t('ch10.date'),
  place: t('ch10.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch09' } to unlock in order
  steps: [
    walk.level('play', { map: 'masroor-intercept' }, { title: t('ch10.title') }),
    video('film', { src: clip('ch10_stop_t33', 30), fallback: [t('ch10.blurb')] }, { title: t('ch10.title') }),
  ],
});
