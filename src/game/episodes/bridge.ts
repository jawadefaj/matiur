// BRIDGE EPISODE: Transitional video between Level 1 (Sabre Skies) and Level 2 (Bluebird).
// A short cinematic episode that connects the 1965 war to the 1971 crisis and the final flight.
// Step ids are save keys: don't rename them once released.
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';

export default defineEpisode({
  id: 'bridge',
  number: 1.5,
  kind: 'cinematic',
  title: t('bridge.title'),
  date: t('bridge.date'),
  place: t('bridge.place'),
  unlock: { after: 'ep2' }, // Unlocked after Level 1
  notes: ['A bridge between the wars.'],
  steps: [
    video('bridge-video', {
      src: 'bridge_1965_to_1971',
      fallback: [
        t('bridge.line1'),
        t('bridge.line2'),
        t('bridge.line3'),
      ],
    }),
  ],
});
