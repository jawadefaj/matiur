// Sortie select for the Episode 2 mechanics build.
import Phaser from 'phaser';
import { CSS, EXTRA_H, GAME_H, GAME_W } from '../config';
import { loadSave, updateSettings } from '../save';
import { SORTIE_LIST } from '../sortie';
import { Button, ButtonSet, txt } from '../ui/widgets';

export class MenuScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private buttons = new ButtonSet();
  private ground!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('Menu');
  }

  create(): void {
    // A fresh set each time: Phaser reuses this scene object when the menu reopens.
    this.buttons = new ButtonSet();
    this.ground = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'ground_farmland').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d, 0.55).setOrigin(0);
    this.g = this.add.graphics();
    // Centre the layout vertically on screens taller than 9:16.
    const oy = Math.round(EXTRA_H / 2);

    txt(this, GAME_W / 2, oy + 40, 'WINGS OF FREEDOM', 16, CSS.signal).setOrigin(0.5);
    txt(this, GAME_W / 2, oy + 66, 'EPISODE 2', 8, CSS.dim).setOrigin(0.5);
    txt(this, GAME_W / 2, oy + 82, 'SABRE SKIES', 16, CSS.white).setOrigin(0.5);
    txt(this, GAME_W / 2, oy + 104, 'September 1965 - mechanics build', 8, CSS.dim).setOrigin(0.5);

    const save = loadSave();
    let y = oy + 132;
    for (const s of SORTIE_LIST) {
      const cleared = save.ep2.sortiesCleared.includes(s.num) ? '  [DONE]' : '';
      this.buttons.add(
        new Button(this, 30, y, 300, 44, `SORTIE ${s.num}: ${s.title.toUpperCase()}${cleared}`, () => this.start(s.num), true),
      );
      txt(this, GAME_W / 2, y + 52, s.teaches, 8, CSS.dim).setOrigin(0.5);
      y += 74;
    }

    // Setting toggles. Each tap saves at once; FlightScene reads the guns mode
    // when a sortie starts.
    const guns = this.buttons.add(
      new Button(this, 30, oy + 362, 145, 36, `GUNS: ${save.settings.gunsMode.toUpperCase()}`, () => {
        const next = loadSave().settings.gunsMode === 'auto' ? 'hold' : 'auto';
        updateSettings({ gunsMode: next });
        guns.setLabel(`GUNS: ${next.toUpperCase()}`);
      }),
    );
    const hapt = this.buttons.add(
      new Button(this, 185, oy + 362, 145, 36, `BUZZ: ${save.settings.haptics ? 'ON' : 'OFF'}`, () => {
        const next = !loadSave().settings.haptics;
        updateSettings({ haptics: next });
        hapt.setLabel(`BUZZ: ${next ? 'ON' : 'OFF'}`);
      }),
    );
    if (this.scale.fullscreen.available) {
      this.buttons.add(new Button(this, 30, oy + 406, 300, 36, 'FULL SCREEN', () => this.scale.toggleFullscreen()));
    }

    const help = [
      'HOW TO FLY',
      'Drag anywhere: steer toward the drag',
      'THROTTLE (right edge): speed + fuel',
      'PULL: tighter turn, more G',
      'Guns fire when the sight is on target',
      '',
      'Content note: depicts the 1965 air war.',
      'Hit aircraft break off; none explode.',
    ];
    txt(this, GAME_W / 2, oy + 458, help.join('\n'), 8, CSS.dim).setOrigin(0.5, 0).setAlign('center');

    // ButtonSet does its own hit-testing. Keys 1-3 start a sortie on desktop.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.buttons.pointerDown(p.id, p.x, p.y));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.buttons.pointerUp(p.id, p.x, p.y));
    this.input.keyboard?.on('keydown-ONE', () => this.start(1));
    this.input.keyboard?.on('keydown-TWO', () => this.start(2));
    this.input.keyboard?.on('keydown-THREE', () => this.start(3));
  }

  private start(n: 1 | 2 | 3): void {
    this.scene.start('Flight', { sortie: n });
  }

  update(_t: number, dms: number): void {
    // Drift the ground down the screen at 30 px/s, as if flying north.
    this.ground.tilePositionY -= dms * 0.03;
    // Buttons are drawn into one Graphics, redrawn every frame to show presses.
    this.g.clear();
    this.buttons.draw(this.g);
  }
}
