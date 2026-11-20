// CHAPTER 6: 1971: Dhaka and Ramnagar (cinematic). Step ids are save keys: don't rename them once released.
import { archiveCard, defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';

export default defineEpisode({
  id: 'ch06',
  number: 6,
  kind: 'story',
  mode: 'cinematic',
  title: t('ch06.title'),
  date: t('ch06.date'),
  place: t('ch06.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch05' } to unlock in order
  steps: [
    video('film', { src: clip('ch06_dhaka_ramnagar', 60), fallback: [t('ch06.blurb')] }, { title: t('ch06.title') }),
    archiveCard('archive', { cardId: 'ch06_dhaka_ramnagar', heading: t('ch06.title'), date: t('ch06.date'), text: t('ch06.blurb') }),
  ],
});
