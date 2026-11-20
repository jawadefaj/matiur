// CHAPTER 12: Family, Liberation, Bir Sreshtho (cinematic). Step ids are save keys: don't rename them once released.
import { archiveCard, defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';

export default defineEpisode({
  id: 'ch12',
  number: 12,
  kind: 'story',
  mode: 'cinematic',
  title: t('ch12.title'),
  date: t('ch12.date'),
  place: t('ch12.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch11' } to unlock in order
  steps: [
    video('film', { src: clip('ch12_bir_sreshtho', 60), fallback: [t('ch12.blurb')] }, { title: t('ch12.title') }),
    archiveCard('archive', { cardId: 'ch12_bir_sreshtho', heading: t('ch12.title'), date: t('ch12.date'), text: t('ch12.blurb') }),
  ],
});
