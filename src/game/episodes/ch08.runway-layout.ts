// CHAPTER 8: Masroor: The Runway Layout (stealth). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'ch08',
  number: 8,
  kind: 'playable',
  mode: 'stealth',
  title: t('ch08.title'),
  date: t('ch08.date'),
  place: t('ch08.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch07' } to unlock in order
  steps: [
    video('intro', { src: clip('ch08_runway_layout_intro', 15), fallback: [t('ch08.blurb')] }, { title: t('ch08.title') }),
    // TODO: the runway-layout map does not exist yet; the schedule map stands in.
    walk.level('play', { map: 'masroor-schedule' }, { title: t('ch08.title') }),
    video('outro', { src: clip('ch08_runway_layout_outro', 15), fallback: [t('ch08.blurb')] }, { title: t('ch08.title') }),
  ],
});
