// Flight line, Peshawar, September 1965: the on-foot beat before Sortie 1.
// Matiur gets the brief from Sherdil Two in the crew room, finds the crew
// chief on his rounds by the jet, then walks out to his Sabre. Ends by
// starting Sortie 1 (Scramble).
import { WalkLevel, act, walk, type Block, type BlockStyle } from '../WalkLevel';
import type { WalkEvent, WalkMap, WalkWorld } from '../WalkWorld';

const W = 480;
const H = 760;

/** Player's Sabre (centre of the fuselage) and Sherdil Two's, both nose north. */
export const JET1 = { x: 140, y: 620 };
export const JET2 = { x: 350, y: 620 };

/** Where the pilot climbs in: by the cockpit, left of the nose. */
export const LADDER = { x: JET1.x - 26, y: JET1.y - 22, w: 16, h: 18 };

const block = (style: BlockStyle, x: number, y: number, w: number, h: number, solid = true): Block => ({
  style,
  x,
  y,
  w,
  h,
  solid,
});

/** Collision boxes for a parked Sabre around its centre: fuselage, wings, tailplane. */
function sabreBlocks(cx: number, cy: number): Block[] {
  // The sabre_parked prop draws the jet; these only block.
  return [
    block('hidden', cx - 7, cy - 46, 14, 92),
    block('hidden', cx - 44, cy - 4, 88, 20),
    block('hidden', cx - 18, cy + 32, 36, 10),
  ];
}

export class FlightLine extends WalkLevel {
  readonly id = 'flightline';
  readonly title = 'The Flight Line';
  readonly place = 'PAF Station Peshawar';
  readonly date = 'September 1965';

  constructor() {
    super();
    this.groundColor = 0x7c8a52;
    this.next = { scene: 'Flight', sortie: 1 };
    this.doneText = 'Strapped in. Sherdil flight is ready to scramble.';
    // Ground first, then things on it.
    this.blocks = [
      block('tarmac', 0, 330, W, H - 330, false),
      block('line', 0, 520, W, 2, false),
      // Taxi line marks on the apron.
      block('line', JET1.x - 1, 680, 2, 80, false),
      block('line', JET2.x - 1, 680, 2, 80, false),
      // Crew room: floor, then walls with a door in the south wall.
      block('floor', 40, 60, 170, 150, false),
      block('wall', 40, 60, 170, 6),
      block('wall', 40, 60, 6, 150),
      block('wall', 204, 60, 6, 150),
      block('wall', 40, 204, 64, 6),
      block('wall', 136, 204, 74, 6),
      block('table', 70, 112, 64, 26),
      block('locker', 150, 66, 50, 12),
      block('locker', 46, 66, 12, 36),
      // Hangar to the east (solid, doors face the apron).
      block('hangar', 290, 40, 170, 220),
      // Fuel bowser and stores on the apron.
      block('bowser', 400, 380, 56, 22),
      block('crate', 250, 420, 16, 16),
      block('crate', 268, 424, 14, 14),
      block('crate', 252, 438, 14, 12),
      // A sandbag wall between the two jets.
      block('sandbag', 236, 560, 12, 120),
      ...sabreBlocks(JET1.x, JET1.y),
      ...sabreBlocks(JET2.x, JET2.y),
    ];
    this.props = [
      { key: 'sabre_parked', x: JET1.x, y: JET1.y },
      { key: 'sabre_parked', x: JET2.x, y: JET2.y },
      { key: 'tree', x: 24, y: 250 },
      { key: 'tree', x: 230, y: 120 },
      { key: 'tree', x: 250, y: 290 },
      { key: 'tree', x: 30, y: 30 },
      { key: 'tree', x: 470, y: 300 },
    ];
  }

  map(): WalkMap {
    return this.buildMap(W, H, [{ id: 'ladder', ...LADDER }]);
  }

  setup(w: WalkWorld): void {
    w.addActor({ id: 'player', name: 'Matiur', look: 'walker_pilot', x: 180, y: 180, facing: 'left' });
    w.addActor({ id: 'two', name: 'Sherdil Two', look: 'walker_wingman', x: 102, y: 150, facing: 'up', talkable: true });
    w.addActor({ id: 'chief', name: 'Crew Chief', look: 'walker_crew', x: JET1.x - 60, y: JET1.y - 64, talkable: true, speed: 30 });
    // The crew chief walks round the jet on his checks.
    w.setPatrol('chief', [
      { x: JET1.x - 60, y: JET1.y - 64 },
      { x: JET1.x + 60, y: JET1.y - 64 },
      { x: JET1.x + 60, y: JET1.y + 58 },
      { x: JET1.x - 60, y: JET1.y + 58 },
    ]);

    this.objectives = [
      { id: 'brief', label: 'Get the brief from Sherdil Two', state: 'active' },
      { id: 'chief', label: 'Find your crew chief', state: 'pending' },
      { id: 'jet', label: 'Walk out to your Sabre', state: 'pending' },
    ];
    this.hint = 'Tap Sherdil Two to talk';
    this.markers = [{ x: 0, y: 0, label: 'TWO', actor: 'two' }];
  }

  protected onEvent(w: WalkWorld, e: WalkEvent): void {
    if (e.type === 'talk') {
      if (e.target === 'two') this.talkToTwo();
      else if (e.target === 'chief') this.talkToChief(w);
    } else if (e.type === 'enteredZone' && e.zone === 'ladder' && this.obj('jet').state === 'active') {
      this.reachJet(w);
    }
  }

  private talkToTwo(): void {
    if (this.obj('brief').state !== 'active') {
      this.say({ speaker: 'Sherdil Two', text: 'See you upstairs, One.' });
      return;
    }
    this.setObj('brief', 'done');
    this.setObj('chief', 'active');
    this.hint = 'Find the crew chief by your jet';
    this.markers = [];
    // Two finishes talking, then heads out to his own jet. The player is free meanwhile.
    this.run([
      this.talk(
        { speaker: 'Sherdil Two', text: 'Morning, One. Border patrol, two ships. We climb out north.' },
        { speaker: 'Sherdil Two', text: "Your jet's on the line. Chief has been fussing over it since dawn." },
        { speaker: 'Sherdil Two', text: 'Join on my wing once we\'re up. See you out there.' },
      ),
      act(() => {
        this.markers = [{ x: 0, y: 0, label: 'CHIEF', actor: 'chief' }];
      }),
      walk('two', { x: 120, y: 236 }, { x: JET2.x + 30, y: JET2.y - 30 }),
      act((ww) => ww.face('two', JET2.x, JET2.y)),
    ]);
  }

  private talkToChief(w: WalkWorld): void {
    if (this.obj('brief').state === 'active') {
      this.say({ speaker: 'Crew Chief', text: 'Morning, sir. Sherdil Two was asking for you in the crew room.' });
      return;
    }
    if (this.obj('chief').state !== 'active') {
      this.say({ speaker: 'Crew Chief', text: 'She\'s ready, sir. Bring her back in one piece.' });
      return;
    }
    this.setObj('chief', 'done');
    this.setObj('jet', 'active');
    this.markers = [];
    w.stop('chief');
    this.run([
      this.talk(
        { speaker: 'Crew Chief', text: 'Fuelled, guns loaded, all checks done, sir.' },
        { speaker: 'Crew Chief', text: 'Form 700 is signed. She\'s all yours.' },
      ),
      act(() => {
        this.hint = 'Walk to the ladder by the cockpit';
        this.markers = [{ x: LADDER.x + LADDER.w / 2, y: LADDER.y + LADDER.h / 2, label: 'JET' }];
      }),
      // He goes to stand by the wingtip to see the jet off.
      walk('chief', { x: JET1.x - 60, y: JET1.y + 6 }),
      act((ww) => ww.face('chief', JET1.x, JET1.y)),
    ]);
  }

  private reachJet(w: WalkWorld): void {
    this.setObj('jet', 'done');
    this.markers = [];
    this.hint = '';
    w.face('player', JET1.x, JET1.y);
    this.run(
      [
        this.talk({ speaker: 'Sherdil Two (radio)', text: "Two's strapped in. Ready when you are, One." }),
        act(() => this.complete()),
      ],
      true,
    );
  }
}
