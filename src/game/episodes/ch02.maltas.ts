// CHAPTER 2: Sargodha: The Maltas (stealth). Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'ch02',
  number: 2,
  kind: 'playable',
  mode: 'stealth',
  title: t('ch02.title'),
  date: t('ch02.date'),
  place: t('ch02.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch01' } to unlock in order
  steps: [
    video('intro', { src: clip('ch02_maltas_intro', 15), fallback: [t('ch02.blurb')] }, { title: t('ch02.title') }),
    // TODO: the Sargodha orchard map (stealth tutorial) does not exist yet; this stands in.
    walk.level('play', { map: 'masroor-schedule' }, { title: t('ch02.title') }),
    video('outro', { src: clip('ch02_maltas_outro', 15), fallback: [t('ch02.blurb')] }, { title: t('ch02.title') }),
  ],
});
