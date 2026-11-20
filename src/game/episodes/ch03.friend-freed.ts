// CHAPTER 3: Sargodha: The Friend Is Freed (cinematic). Step ids are save keys: don't rename them once released.
import { archiveCard, defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { clip } from '../clips';

export default defineEpisode({
  id: 'ch03',
  number: 3,
  kind: 'story',
  mode: 'cinematic',
  title: t('ch03.title'),
  date: t('ch03.date'),
  place: t('ch03.place'),
  unlock: 'always', // all chapters are open for now; use { after: 'ch02' } to unlock in order
  steps: [
    video('film', { src: clip('ch03_friend_freed', 60), fallback: [t('ch03.blurb')] }, { title: t('ch03.title') }),
    archiveCard('archive', { cardId: 'ch03_friend_freed', heading: t('ch03.title'), date: t('ch03.date'), text: t('ch03.blurb') }),
  ],
});
