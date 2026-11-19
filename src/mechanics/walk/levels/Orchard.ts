// Level 1 on foot: the orange raid. PAF Station Peshawar, September 1965, at
// night between Sortie 1 and Sortie 2. Sherdil Two bets Matiur dinner that he
// can't bring back three oranges from the Station Commander's walled orchard
// without being seen. A light-hearted, dramatised beat (not a sourced event)
// that teaches the stealth rules Level 2 depends on: stay out of the lantern
// and torch beams, use the trees for cover, wait for a patrol to pass.
//
// Drawn from blocks and props like the flight line, no backdrop picture.
import { t } from '../../../core/i18n';
import { WalkLevel, type Block, type BlockStyle } from '../WalkLevel';
import { Stealth, type GuardDef } from '../stealth';
import { tuning } from '../tuning';
import type { Point, WalkEvent, WalkMap, WalkWorld } from '../WalkWorld';

const W = 480;
const H = 800;

/** Matiur's start, outside the billet door, and the zone he must get back to. */
export const BILLET_DOOR: Point = { x: 120, y: 674 };
const BILLET_ZONE = { id: 'billet', x: 98, y: 660, w: 44, h: 28 };

/** The gap in the orchard's west hedge. */
export const HEDGE_GAP = { x: 40, y: 296, w: 10, h: 36 };

/** Tree centres in the orchard: six columns either side of the central path, six rows. */
const COLS = [85, 140, 195, 285, 340, 395];
const ROWS = [200, 260, 320, 380, 440, 500];
export const TREES: Point[] = ROWS.flatMap((y) => COLS.map((x) => ({ x, y })));

/** The three trees with ripe fruit: west (the chowkidar's round), east (by the mali), north (under the verandah). */
export const RIPE: Point[] = [
  { x: 140, y: 320 },
  { x: 340, y: 440 },
  { x: 285, y: 200 },
];

/** How close (world px from the tree's centre) Matiur must be to pick. */
export const PICK_RANGE = 24;
/** Half the solid size of a tree. */
const TREE_R = 7;

const block = (style: BlockStyle, x: number, y: number, w: number, h: number, solid = true): Block => ({ style, x, y, w, h, solid });

/** Patrols and watchers. Ranges are before the night cut (tuning.stealth.nightRange). */
const GUARDS: GuardDef[] = [
  // The chowkidar walks the west half of the orchard with a lantern.
  {
    id: 'chowkidar',
    name: t('who.chowkidar'),
    look: 'walker_chowkidar',
    x: 60,
    y: 545,
    vision: { range: 140 },
    patrol: [
      { x: 60, y: 545 },
      { x: 60, y: 170 },
      { x: 240, y: 170 },
      { x: 240, y: 545 },
    ],
  },
  // The mali sits up by the east hedge, looking across the trees.
  { id: 'mali', name: t('who.mali'), look: 'walker_chowkidar', x: 415, y: 300, facing: 180, scan: { arc: 80, period: 5 } },
  // A sentry on the Station Commander's verandah, sweeping the orchard.
  { id: 'verandah', name: t('who.sentry'), look: 'walker_sentry', x: 240, y: 126, facing: 90, vision: { range: 130 }, scan: { arc: 100, period: 6 } },
  // A patrol on the road between the billets and the orchard.
  {
    id: 'road',
    name: t('who.naikGul'),
    look: 'walker_sentry',
    // Its ends are far from the billet door, so his turn-around sweep misses it.
    x: 20,
    y: 616,
    patrol: [
      { x: 20, y: 616 },
      { x: 460, y: 616 },
    ],
  },
];

export class Orchard extends WalkLevel {
  readonly id = 'orchard';
  readonly title = t('orchard.title');
  readonly place = t('fl.place');
  readonly date = t('orchard.date');

  /** Indexes into RIPE of the trees already picked. */
  readonly picked = new Set<number>();

  constructor() {
    super();
    this.night = true;
    this.groundColor = 0x2c3a26;
    this.doneText = t('orchard.done');
    this.blocks = [
      // The road and the billets south of it.
      block('tarmac', 0, 596, W, 40, false),
      block('floor', 30, 686, 180, 10, false),
      block('wall', 30, 696, 180, 80),
      block('wall', 270, 696, 180, 80),
      // The orchard's hedge: a gate in the south side, a gap in the west.
      block('hedge', 40, 20, 400, 10),
      block('hedge', 40, 20, 10, HEDGE_GAP.y - 20),
      block('hedge', 40, HEDGE_GAP.y + HEDGE_GAP.h, 10, 590 - HEDGE_GAP.y - HEDGE_GAP.h),
      block('hedge', 430, 20, 10, 570),
      block('hedge', 40, 580, 180, 10),
      block('hedge', 260, 580, 180, 10),
      // The Station Commander's bungalow and its verandah, inside the hedge.
      block('floor', 150, 108, 180, 26, false),
      block('wall', 150, 40, 180, 68),
      // The central path through the orchard.
      block('floor', 222, 134, 36, 446, false),
      // Tree trunks and canopies: solid, and they block the beams.
      ...TREES.map((p) => block('hidden', p.x - TREE_R, p.y - TREE_R, TREE_R * 2, TREE_R * 2)),
    ];
    const ripe = new Set(RIPE.map((p) => `${p.x},${p.y}`));
    this.props = TREES.map((p) => ({ key: ripe.has(`${p.x},${p.y}`) ? 'walk_orange_tree' : 'walk_orchard_tree', x: p.x, y: p.y }));
  }

  map(): WalkMap {
    return this.buildMap(W, H, [BILLET_ZONE]);
  }

  setup(w: WalkWorld): void {
    w.addActor({ id: 'player', name: t('who.matiur'), look: 'walker_pilot', ...BILLET_DOOR, facing: 'up' });
    w.addActor({ id: 'two', name: t('who.sherdilTwo'), look: 'walker_wingman', x: 164, y: 674, facing: 'left', talkable: true });
    this.stealth = new Stealth(tuning.stealth.nightRange);
    for (const g of GUARDS) this.stealth.add(w, g);
    this.objectives = [
      { id: 'pick', label: t('orchard.obj.pick', { n: RIPE.length }), state: 'active' },
      { id: 'back', label: t('orchard.obj.back'), state: 'pending' },
    ];
    this.updateMarkers();
    this.updateHint();
    this.say(
      { speaker: t('who.sherdilTwo'), text: t('orchard.two.dare1') },
      { speaker: t('who.sherdilTwo'), text: t('orchard.two.dare2') },
      { speaker: t('who.matiur'), text: t('orchard.matiur.accept') },
    );
  }

  /** The ripe tree in reach that still has fruit, as an index into RIPE, or -1. */
  treeInReach(w: WalkWorld): number {
    const p = w.player;
    return RIPE.findIndex((tr, i) => !this.picked.has(i) && Math.hypot(p.x - tr.x, p.y - tr.y) <= PICK_RANGE);
  }

  actionLabel(w: WalkWorld): string | null {
    return this.obj('pick').state === 'active' && this.treeInReach(w) >= 0 ? t('walk.pick') : null;
  }

  action(w: WalkWorld): boolean {
    if (this.obj('pick').state !== 'active') return false;
    const i = this.treeInReach(w);
    if (i < 0) return false;
    this.picked.add(i);
    w.stop('player');
    w.face('player', RIPE[i].x, RIPE[i].y);
    if (this.picked.size === RIPE.length) {
      this.setObj('pick', 'done');
      this.setObj('back', 'active');
      this.say({ speaker: t('who.matiur'), text: t('orchard.matiur.three') });
    }
    this.updateMarkers();
    this.updateHint();
    return true;
  }

  protected onEvent(w: WalkWorld, e: WalkEvent): void {
    if (e.type === 'talk' && e.target === 'two' && this.obj('back').state !== 'active') {
      this.say({ speaker: t('who.sherdilTwo'), text: t('orchard.two.waiting') });
    } else if (
      ((e.type === 'enteredZone' && e.zone === 'billet') || (e.type === 'talk' && e.target === 'two')) &&
      this.obj('back').state === 'active'
    ) {
      this.setObj('back', 'done');
      this.markers = [];
      this.hint = '';
      w.face('player', w.actor('two').x, w.actor('two').y);
      this.run(
        [
          this.talk(
            { speaker: t('who.sherdilTwo'), text: t('orchard.two.won1') },
            { speaker: t('who.matiur'), text: t('orchard.matiur.won') },
            { speaker: t('who.sherdilTwo'), text: t('orchard.two.won2') },
          ),
          { done: () => (this.complete(), true) },
        ],
        true,
      );
    }
  }

  private updateMarkers(): void {
    this.markers =
      this.obj('pick').state === 'active'
        ? RIPE.filter((_, i) => !this.picked.has(i)).map((p) => ({ x: p.x, y: p.y + 14, label: 'ORANGES' }))
        : [{ x: BILLET_DOOR.x, y: BILLET_DOOR.y, label: 'BILLET' }];
  }

  private updateHint(): void {
    this.hint =
      this.obj('pick').state === 'active'
        ? t('orchard.hint.pick', { n: this.picked.size, total: RIPE.length })
        : t('orchard.hint.back');
  }
}
