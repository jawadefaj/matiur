// CHAPTER 1: Childhood in Dhaka (cinematic). Step ids are save keys: don't rename them once released.
import { archiveCard, defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';

export default defineEpisode({
  id: 'ch01',
  number: 1,
  kind: 'story',
  mode: 'cinematic',
  title: t('ch01.title'),
  date: t('ch01.date'),
  place: t('ch01.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch00' } to unlock in order
  steps: [
    video('film', { src: clip('ch01_childhood', 60), fallback: [t('ch01.blurb')] }, { title: t('ch01.title') }),
    archiveCard('archive', { cardId: 'ch01_childhood', heading: t('ch01.title'), date: t('ch01.date'), text: t('ch01.blurb') }),
  ],
});
