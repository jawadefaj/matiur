# Mechanics

A mechanic is a kind of gameplay: `flight/` (top-down jet flying) and `walk/`
(on foot) so far. Each one is a folder here. The game manager finds it
automatically, and episode files (`src/game/episodes/`) use its levels as steps:

```ts
flight.level('sortie-1', { sortie: 1 })
walk.level('flight-line', { map: 'flightline' })
```

## What a mechanic folder needs

| File | What it is | Rules |
|---|---|---|
| `index.ts` | The **descriptor**: the params a level takes, how to check them, the menu label, settings | `export default defineMechanic<Params>({...})`. No Phaser, not even indirectly: tests load it in Node. |
| `runtime.ts` | The **runtime**: Phaser scenes, the entry scene, art | `export default defineRuntime({...})` |
| anything else | Simulation, levels, art, `tuning.json` | Free layout. Keep simulation code Phaser-free so tests can run it. |

The folder name is the mechanic's id: `index.ts` and `runtime.ts` must use the same `id`.

## The contract with the game manager

The manager starts the runtime's `entryScene` with `{ host }` as its scene data.
`host.params` is the level's params from the episode file. The scene never
starts another scene. It talks to the host instead:

| Call | When |
|---|---|
| `host.report({ result: 'complete', stats })` | The level is won. This saves progress. `stats` can be shown on the archive card as `{step-id.key}`. |
| `host.report({ result: 'failed' })` | The level is lost (optional; nothing is saved but stats). |
| `host.advance()` | The player taps NEXT. Label it with `host.upNext?.label`. |
| `host.retry()` | Play the same level again. `host.attempt` counts tries. |
| `host.quit()` | Back to the menu. CONTINUE comes back to this level. |
| `host.setting('key')`, `host.setSetting('key', v)` | Read or change one of this mechanic's saved settings. |

`host.episode` is the episode's number, title, date and place, or null when
the level runs on its own (`?play=<id>&...`). Calls on a host after the manager
has moved on are ignored, so late timers and double taps are harmless.

## Rules that keep branches merging cleanly

- Import only from `src/core/` and your own folder. Never from another mechanic or from `src/game/` ([tests/architecture.test.ts](../../tests/architecture.test.ts) checks this). If two mechanics need the same code, move it to `src/core/` in a separate `core/...` pull request first.
- Scene keys start with the id: `'<id>:Name'`.
- Texture keys should start with the id too (`<id>_name`). Register them in `registerArt(kit)`. A PNG in `assets/sprites/` named after a key replaces its placeholder.
- Gameplay numbers go in your own `tuning.json`.

## Template

```ts
// src/mechanics/example/index.ts
import { defineMechanic } from '../../core/define';

export interface ExampleParams {
  level: 'first' | 'second';
}
const LEVELS = { first: 'The First', second: 'The Second' } as const;

export const example = defineMechanic<ExampleParams>({
  id: 'example',
  parseParams: (q) => (q.get('level') === 'first' || q.get('level') === 'second' ? { level: q.get('level') as ExampleParams['level'] } : null),
  validate: (p) => (p.level in LEVELS ? null : `no level "${p.level}"`),
  describe: (p) => ({ title: LEVELS[p.level], nextLabel: `PLAY: ${LEVELS[p.level].toUpperCase()}` }),
  settings: [], // e.g. [{ key: 'assist', label: 'ASSIST', values: ['on', 'off'], default: 'on' }]
});
export default example;
```

```ts
// src/mechanics/example/runtime.ts
import { defineRuntime } from '../../core/runtime';
import { ExampleScene } from './scenes/ExampleScene';

export default defineRuntime({ id: 'example', scenes: [ExampleScene], entryScene: 'example:Main' });
```

```ts
// src/mechanics/example/scenes/ExampleScene.ts
import Phaser from 'phaser';
import type { StepHost } from '../../../core/contracts';
import type { ExampleParams } from '..';

export class ExampleScene extends Phaser.Scene {
  private host!: StepHost<ExampleParams>;
  constructor() {
    super('example:Main');
  }
  init(data: { host: StepHost<ExampleParams> }): void {
    this.host = data.host;
  }
  create(): void {
    // ...play this.host.params.level; when won:
    //   this.host.report({ result: 'complete' }); then a button calling this.host.advance()
  }
}
```

Then try it alone with `?play=example&level=first`, and add
`example.level('some-id', { level: 'first' })` to an episode file.
