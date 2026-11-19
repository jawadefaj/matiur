// THE GAME SCRIPT: Level 2, Bluebird (20 August 1971), the stealth level.
// Plan: design/Level 2 - Bluebird.md. It opens with a video that carries the
// story on from Level 1. First version: the videos show their fallback text
// until the clips exist, the on-foot parts use still images, and 2.7 (the
// low-level flight) is not built yet.
// Step ids are save keys: don't rename them once released.
import { archiveCard, defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'level2',
  number: 2,
  kind: 'playable',
  title: t('level2.title'),
  date: t('level2.date'),
  place: t('level2.place'),
  unlock: 'always', // Dev: unlock all during development
  notes: [
    'ON FOOT',
    'Arrow keys / WASD or drag: walk',
    "Stay out of the guards' torch beams",
    'Space / E: signal, talk, read on',
    '',
    'Content note: depicts the events of 20 August 1971.',
  ],
  steps: [
    // Opening video — 1965–1971 bridge and arrival at Masroor
    video('prologue-1', {
      src: 'level2_prologue_1',
      fallback: [t('level2.prologue1.1'), t('level2.prologue1.2'), t('level2.prologue1.3')],
    }),
    video('prologue-2', {
      src: 'level2_prologue_2',
      fallback: [t('level2.prologue2.1'), t('level2.prologue2.2'), t('level2.prologue2.3')],
    }),

    // 5.1: Flight schedule (stealth gameplay)
    walk.level('schedule', { map: 'masroor-schedule' }),
    // 5.2: 15-second beat after schedule
    video('after-schedule', { src: 'level2_after_schedule', fallback: [t('level2.schedule.1')] }),

    // 6.1: Dispensary (stealth gameplay)
    walk.level('dispensary', { map: 'masroor-hospital' }),
    // 6.2: Video beat
    video('after-dispensary', { src: 'level2_after_dispensary', fallback: [t('level2.dispensary.1')] }),

    // Morning cinematic transition
    video('morning', { src: 'level2_morning', fallback: [t('level2.morning.1'), t('level2.morning.2')] }),

    // 7.1: Stop the aircraft (intercept gameplay)
    walk.level('intercept', { map: 'masroor-intercept' }),
    // 7.2: 1-minute video — boarding and low-level flight
    video('boarding', {
      src: 'level2_boarding',
      fallback: [t('level2.boarding.1'), t('level2.boarding.2'), t('level2.boarding.3')],
    }),

    archiveCard('archive', {
      cardId: 'level2_bluebird',
      heading: t('level2.title'),
      date: t('level2.date'),
      text: t('level2.archive.text'),
    }),
  ],
});
