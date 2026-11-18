// THE GAME SCRIPT: Level 2, Bluebird (20 August 1971), the stealth level.
// Plan: design/Level 2 - Bluebird.md. It opens with a video that carries the
// story on from Level 1. First version: the videos show their fallback text
// until the clips exist, the on-foot parts use still images, and 2.7 (the
// low-level flight) is not built yet.
// Step ids are save keys: don't rename them once released.
import { archiveCard, defineEpisode, video } from '../../core/define';
import { walk } from '../../mechanics/walk';

export default defineEpisode({
  id: 'level2',
  number: 2,
  kind: 'playable',
  title: 'Bluebird',
  date: '20 August 1971',
  place: 'PAF Base Masroor, Karachi',
  unlock: 'always', // becomes { after: 'ep2' } (Level 1) once playtesting is done
  notes: [
    'ON FOOT',
    'Arrow keys / WASD or drag: walk',
    "Stay out of the guards' torch beams",
    'Space / E: signal, talk, read on',
    '',
    'Content note: depicts the events of 20 August 1971.',
  ],
  steps: [
    video('prologue-1', {
      src: 'level2_prologue_1',
      fallback: ['1965 becomes 1968.', 'A wedding in Dhaka. A home in Karachi.', '1971: Bhairab. Then Karachi again, 9 May.'],
    }),
    video('prologue-2', {
      src: 'level2_prologue_2',
      fallback: ['PAF Base Masroor. He is watched.', 'He studies the base.', 'Night falls on Residential East.'],
    }),
    walk.level('schedule', { map: 'masroor-schedule' }),
    walk.level('dispensary', { map: 'masroor-hospital' }),
    video('morning', { src: 'level2_morning', fallback: ['20 August 1971.', 'Bluebird is on the schedule.'] }),
    walk.level('intercept', { map: 'masroor-intercept' }),
    video('boarding', {
      src: 'level2_boarding',
      fallback: ['Bluebird stops on the taxiway.', 'Matiur climbs into the rear seat.', '[Next: Radar Horizon, not built yet]'],
    }),
    archiveCard('archive', {
      cardId: 'level2_bluebird',
      heading: 'Bluebird',
      date: '20 August 1971',
      text: '[Placeholder] A photo, the date and a short sourced paragraph go here.',
    }),
  ],
});
