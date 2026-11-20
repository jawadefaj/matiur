// CHAPTER 9: The Hospital: Chloroform (stealth). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'ch09',
  number: 9,
  kind: 'playable',
  mode: 'stealth',
  title: t('ch09.title'),
  date: t('ch09.date'),
  place: t('ch09.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch08' } to unlock in order
  steps: [
    video('intro', { src: clip('ch09_chloroform_intro', 15), fallback: [t('ch09.blurb')] }, { title: t('ch09.title') }),
    walk.level('play', { map: 'masroor-hospital' }, { title: t('ch09.title') }),
    video('outro', { src: clip('ch09_chloroform_outro', 15), fallback: [t('ch09.blurb')] }, { title: t('ch09.title') }),
  ],
});
