# Level 2 — Bluebird (plan)

The 20 August 1971 level, built from the art in [assets/sprites/original/](../assets/sprites/original/).
It is the GDD's **Episode 4, Bluebird** ([GDD §3](Game%20Design%20Document%20-%20Wings%20of%20Freedom.md#episode-4--bluebird-20-august-1971--playable)), reshaped into seven parts: three cinematics and four playable sections.

| # | Part | Kind | Where on the base | Length | Step id |
|---|---|---|---|---|---|
| 2.1 | Prologue | Cinematic | Whole base | 4:00 | `prologue-1`, `prologue-2` |
| 2.2 | The Schedule | Stealth (on foot) | Residential East → East Ramp | 2–3 min | `schedule` |
| 2.3 | The Dispensary | Stealth (on foot) | Residential East → Hospital | 2–3 min | `dispensary` |
| 2.4 | Morning | Cinematic | Residential East, East Dispersal | 2:00 | `morning` |
| 2.5 | Intercept | Timed stealth (on foot) | East Ramp → runway, 1,800 m mark | 1–2 min | `intercept` |
| 2.6 | Bluebird | Cinematic | Runway, take-off | 2:00 | `boarding` |
| 2.7 | Radar Horizon | Low-level flight | East of Karachi | ~1 min | `radar-horizon` |

**Total:** about 15–17 minutes, 8 of them cinematic. The GDD aims for 8–12 minutes per playable episode, so the cinematics are where to trim if the level feels long. Every cinematic can be skipped (hold to skip).

---

## 1. The map

![Routes, guards and the intercept point](level-2-routes.jpg)

Drawn on [airport-level-map-clean.jpeg](../assets/sprites/original/airport-level-map-clean.jpeg). The labelled copy gives the place names.

**One walk map for all three on-foot parts.** 2.2, 2.3 and 2.5 all happen in the same corner of the base: master-map x 600–1220, y 430–900. It is built once, as the GDD asks (§6.2), and each part uses different guards, a different start and a different goal.

**Scale**
- The runway with overruns is 3,387 m and about 600 px on the master map, so **1 map px ≈ 5.65 m**.
- The walk map is that region at **4×**: 2,480 × 1,880 world px. A house becomes about 64 × 48 px, roughly four characters wide.
- Distances shown to the player (Bluebird's metre counter, the 1,800 m mark) use **1 world px ≈ 1.41 m**. Sprites are drawn at readable sizes, not true scale, as on the Episode 2 flight line.
- Walls and zones are written in master-map pixels and multiplied by 4 in code. Anyone can then read a coordinate straight off the map image and put it in the level.

---

## 2. What each uploaded image becomes

All uploads are JPEGs without transparency, drawn at high resolution. The sprite rules ([assets/sprites/README.md](../assets/sprites/README.md)) need PNGs with alpha at 1 image pixel = 1 game pixel. Each gameplay use needs a cut-out and a redraw at game size. A plain downscale turns JPEG noise into mush.

### Base map and theme

| File | What it actually shows | Use |
|---|---|---|
| `airport-level-map-clean` | The whole base, top-down pixel art | Layout source for the walk map. In 2.1, the "planning" shot: the map on Matiur's desk. |
| `airport-level-map-labeled` | Same, with English place names baked in | Design reference only. In-game labels are drawn by the engine on the clean map so they can be shown in Bangla too. |
| `airport-tileset-golden-warm` | Crisp pixel art, short midday shadows; matches the master map | **Master style.** Gameplay art and the daylight intercept (2.5, ~11:30 **[verify]**). Night versions for 2.2 and 2.3 are a tint of the same art. |
| `airport-tileset-brown-hangar` | Painterly, weathered roofs, long low-sun shadows | Colour reference for the dawn shots in 2.1 and 2.4. |
| `airport-tileset-orange-lighting` | 3D low-poly render, not pixel art | Lighting reference only. Using it in-game would mix styles (GDD §6.10). |
| `airport-tileset-green-border` | Pixel art, heavier outlines, round-roofed hangars | Alternate; not used. |
| `airport-tileset-grey-shadow` | Flat pixel art, dark cracked apron | Alternate; not used. |

**Gap:** all five theme images show the west and centre of the base (tower, shelter apron, Admin/HQ, fuel tanks). The playable parts are on the **east** side. The theme images work for the cinematics' establishing shots, but the east-side gameplay art (Residential East, East Ramp, Hospital, East Dispersal, the runway's east half) has to be made in the golden-warm style, using the master map as the layout.

### Characters and the aircraft

| File | Contents | Becomes |
|---|---|---|
| `character-matiur-turnaround` | Service dress (front, side, back, salute) and flight suit (front, side, back, helmet under arm) | Walk sheets `walk_matiur_uniform` (2.2, 2.3, 2.5) and `walk_matiur_flightsuit` (cinematics). The **salute** is the SIGNAL pose in 2.5; the **helmet** pose is the boarding in 2.6. The sheet has standing poses only: each direction needs two walking frames, and the side view faces right only (mirrored for left). |
| `character-matiur-frontface` | Portraits in both outfits: neutral, stern, worried, smiling, sunglasses up | Dialogue-box portraits in the on-foot parts; close-ups in the cinematics. |
| `character-rashid-both-outfits` | Khaki uniform and flight suit (front, side, back, reading a card), plus eight portraits | Rashid in 2.4 (reading his flight card at East Dispersal) and 2.6 (in the cockpit, confused, then alarmed). His portraits suit the cockpit inset if 2.7 gets one later. |
| `vehicle-paf-plane-sprite` | T-33 from above, nose up, PAF markings, tip tanks | `walk_t33` (~100 px, like `sabre_parked`) taxiing in 2.5; `flight_t33` (~19 × 19 px; the Sabre is 17 × 21) in 2.7. |

**Not uploaded yet, but needed:** guard walk sheets (at least two looks), Milly and the daughters for the 2.1 home scene, and a desert ground tile for 2.7.

---

## 3. The parts

### 2.1 Prologue — 4:00, video

Two clips of 2:00 each (`ep4_prologue_1`, `ep4_prologue_2`). A single 4-minute clip under the 20 MB limit would need about 650 kbit/s. Two clips also let a player who quits halfway resume at the second.

| Time | Shot | Source |
|---|---|---|
| 0:00–0:25 | Title. Masroor at dawn: slow pan over the shelter apron and tower. | golden-warm, graded like brown-hangar |
| 0:25–1:05 | Karachi, May 1971. Matiur walks past officers who watch him. Their vision cones show faintly, which introduces the mechanic. | matiur-turnaround (service dress) |
| 1:05–1:50 | Grounded, under watch **[verify: Flight Safety Officer]**. Close-up at his desk. | matiur-frontface |
| 1:50–2:50 | **The plan.** The base map on his desk. His finger goes home → East Ramp → Hospital → East Dispersal → runway, and each name appears as he passes it. This teaches the level's geography before the player walks it. | airport-level-map-clean, engine-drawn labels |
| 2:50–3:30 | Evening at home in Residential East with his family. No dialogue about the decision (GDD §7). | needs Milly and daughters art |
| 3:30–4:00 | Night. Patrol torches sweep the streets. The camera settles on the exact framing where 2.2 starts (GDD §6.7). | golden-warm, night tint |

### 2.2 The Schedule — night stealth

- **Start:** Matiur's house in Residential East. **Goal:** the flight-line office on the south edge of East Ramp.
- **The item:** tomorrow's flight schedule. Taking it is a 1.5-second hold. Being seen during the hold fills detection twice as fast.
- **Reveal:** a short dialogue box reads the line that matters: *Bluebird, P/O Rashid Minhas, solo, East Dispersal, 11:30* **[verify time]**. This sets up 2.5.
- **Guards (5):** a patrol on the road north of the houses; a patrol on the north–south road by the ramp; a sentry at the ramp corner, standing and sweeping; the east-wall watchtower, with a narrow, long cone that sweeps; an airman walking between the parked jets.
- **Cover:** houses, trees, parked vehicles, and the dark.
- **Caught:** "Halt! Who goes there?" and RETRY. The part is short, so it restarts from the beginning; no mid-level checkpoints.

### 2.3 The Dispensary — night stealth

- **Start:** home again. **Goal:** the hospital dispensary. **Item:** chloroform **[verify against sources before scripting]**.
- **New idea:** an **interior**. The hospital corridor and dispensary are wall blocks, like the crew room in [FlightLine.ts](../src/mechanics/walk/levels/FlightLine.ts). Cones are short indoors, but walls cut them, so it plays as close-quarters timing rather than open ground.
- **Guards (4):** a patrol on the south road; a sentry at the hospital door; a duty orderly walking the corridor; the watchtower again.

### 2.4 Morning — 2:00, video (`ep4_morning`)

Dawn turns to late morning. Matiur leaves home in uniform. At East Dispersal, Rashid in his flight suit reads his flight card (the pose is on his sheet) while ground crew finish. The tower clears Bluebird to taxi. On East Ramp, Matiur checks his watch. The T-33 starts to roll, and the shot cuts to 2.5's framing.

### 2.5 Intercept — timed stealth, daylight

- **Player:** Matiur on foot, starting on East Ramp.
- **Bluebird:** the T-33 follows a fixed route from its revetment at East Dispersal, along the taxiway, onto the runway at about 1,150 m, then west along the runway. A HUD counter shows its distance ("BLUEBIRD 1,240 m") with a bar and a tick at 1,800 m. Its path is drawn as a dashed line.
- **Goal:** stand in the intercept circle (1,800 m along the route) when Bluebird gets there, then tap **SIGNAL** (the salute pose). That ends the part.
- **Too early:** waiting is fine while hidden. The paved pad just south of the mark is cover. The runway itself is open ground, and a sentry at the North Facility faces it, so standing there too long gets him seen.
- **Too late:** Bluebird passes the mark: "Bluebird is lining up." RETRY.
- **Guards (2):** the North Facility sentry, and an airman by the diagonal-runway crossing. Daylight gives every cone a longer range than at night (set per level).
- **Run:** hold RUN to move 1.6× faster. A running man is seen at 1.5× the range and detection fills twice as fast.
- **Numbers to start tuning from:** 1,800 m = 1,274 world px. At 40 px/s Bluebird reaches the mark in about 32 s. Matiur's straight line is about 880 px: 17 s walking, 25–30 s with detours.

### 2.6 Bluebird — 2:00, video (`ep4_boarding`)

Matiur signals and Bluebird stops. The canopy opens. Rashid is confused and polite: one or two plain lines (GDD Phase 2). Matiur climbs into the rear seat (the helmet pose) and the canopy closes. Take-off, a turn east, then down low. The last frame is 2.7's top-down framing.

Later, if wanted: the GDD's interactive version, with timing prompts for signal, approach, climb in.

### 2.7 Radar Horizon — about 1 minute of flight

Built on Episode 2's Sortie 3 ([Sortie3LowAndHome.ts](../src/mechanics/flight/sortie/Sortie3LowAndHome.ts)), which already has everything the brief asks for.

- **Stay low:** the existing [LowLevel](../src/mechanics/flight/systems/flight/LowLevel.ts) band is 30–100 ft. Above 100 ft the radar fills; when full, interceptors arrive in 8 s unless he gets low again. Hitting a dune, a ridge or a power line is a crash.
- **New:** the T-33 instead of the Sabre; desert, dunes, salt flats and power lines east of Karachi; no guns; no landing.
- **Checkpoints** at 20 s and 40 s. A crash or an intercept restarts from the last one, as in Sortie 3.
- **At about 30 s:** Rashid's radio call to Masroor. It is scripted and cannot be prevented (GDD).
- **Optional:** Rashid pulling on the linked controls, as a small nose-down drift that grows over the minute. This is a light version of the GDD's control-share meter, without its rhythm prompts.
- **At 60 s of flight** (`durationS` in tuning): the controls go heavy, the music drops out, and the screen cuts to white and silence. The step reports **complete**, never failed, with stats for the archive card (time under 100 ft, radar contacts).
- **About "the plane crashes":** the GDD (§3, §7) says the final moments are not shown: no crash, no explosion, a cut to white. This plan follows that; the archive card tells what happened. See the open questions if you want the crash shown.

Then the archive card closes the level.

---

## 4. Vision cones (new walk-mechanic system)

Each guard is configured in the level file. Your "vision radius" is the cone's width (`angle`, in degrees) and "distance" is its reach (`range`, in world px):

```ts
w.addGuard({
  id: 'ramp-sentry', name: 'Havildar Aslam', look: 'walk_guard',
  x: m(900), y: m(698),          // m() = master-map px × 4
  patrol: [],                    // empty: stands still
  vision: { angle: 90, range: 70 },
  scan: { arc: 60, period: 4 },  // sweeps ±30° every 4 s while standing
});
```

**Behaviour**
- The cone points where the guard is looking. The look direction turns smoothly toward where he walks (`turnRate`), not snapped to the sprite's four facings, so the cone visibly swings round corners.
- **Seen** = the player is within `range`, within `angle / 2` of the look direction, and no solid block is in the way. Line of sight is tested along the nav grid.
- **Detection** (0 to 1, per guard) fills while seen: faster up close, twice as fast while running or taking an item. It drains when out of sight.
- **States:** calm (white cone) → **suspicious** at 0.4 (yellow; he stops and turns to where he last saw something) → **caught** at 1.0 (red; the part fails).
- **Drawing:** about 24 rays per cone, cut off at walls, filled translucent.

**Defaults** in `src/mechanics/walk/tuning.json`, under a new `stealth` block, overridable per guard and per level:

| Key | Start value | Meaning |
|---|---|---|
| `angle` | 70 | Cone width, degrees |
| `range` | 90 | Reach, world px (about 125 m) |
| `turnRate` | 180 | How fast the look direction turns, degrees/s |
| `fill` / `drain` | 1.2 / 0.4 | Detection per second while seen / unseen |
| `nearBoost` | 1.5 | Extra fill at point-blank range |
| `suspicious` | 0.4 | Detection level for the yellow state |
| `runSpeed` / `runRange` / `runFill` | 1.6 / 1.5 / 2 | Running: speed, how much further he is seen, how much faster detection fills |
| `nightRange` | 0.7 | Range multiplier in the night parts |

**Tests** (Phaser-free, like [walk.test.ts](../tests/mechanics/walk/walk.test.ts)): inside and outside the cone, behind a wall, out of range, fill and drain timing, the cone turning with a patrol, running making detection faster.

---

## 5. Build order

| # | Work | Where | Size |
|---|---|---|---|
| 1 | Stealth simulation: guards, cones, line of sight, detection, run, timed pickups. Phaser-free, with tests. | `src/mechanics/walk/stealth.ts`, `WalkWorld.ts` | M |
| 2 | Drawing and HUD: cones, detection meter, caught card with RETRY (`host.retry()`), RUN button, hold-to-take prompt. `WalkLevel` gains a `failed` status. | `WalkScene.ts`, `WalkLevel.ts` | M |
| 3 | Map: a background-image layer under the blocks, a night tint, and a `MasroorEast` base class with collision traced from the master map. Until the art exists, the blocks draw as placeholders, as today. | `src/mechanics/walk/levels/` | M |
| 4 | The three levels: `masroor-schedule`, `masroor-hospital`, `masroor-intercept`, registered in `levels/index.ts`. | `src/mechanics/walk/levels/` | M |
| 5 | Taxiing Bluebird for 2.5: a vehicle that follows a fixed line at a set speed and reports metres travelled. | `WalkWorld.ts` | S |
| 6 | Flight: a `t33` aircraft kind, a desert terrain generator, and Sortie 4 "Radar Horizon" (sortie numbers become 1–4). | `src/mechanics/flight/` | M |
| 7 | The episode file, with video steps that show fallback text until the clips exist. | `src/game/episodes/ep4.bluebird.ts` | S |
| 8 | Art pass (section 2) and the three video clips. | `assets/` | L |

Steps 1–7 make the whole level playable end to end with placeholder art. Each part can be tried on its own with `?play=walk&map=masroor-schedule` or `?play=flight&sortie=4`.

### Episode file sketch

```ts
// src/game/episodes/ep4.bluebird.ts
export default defineEpisode({
  id: 'ep4',
  number: 4,
  kind: 'playable',
  title: 'Bluebird',
  date: '20 August 1971',
  place: 'PAF Base Masroor, Karachi',
  unlock: { after: 'ep2' },
  notes: [
    'ON FOOT',
    'Stay out of the guards\' cones',
    'Hold RUN: faster, but easier to spot',
    '',
    'IN THE AIR',
    'Under 100 ft, above the ground',
    '',
    'Content note: depicts the events of 20 August 1971.',
  ],
  steps: [
    video('prologue-1', { src: 'ep4_prologue_1', fallback: ['Karachi, May 1971.', 'PAF Base Masroor.'] }),
    video('prologue-2', { src: 'ep4_prologue_2', fallback: ['He studies the base.', 'Night falls on Residential East.'] }),
    walk.level('schedule', { map: 'masroor-schedule' }),
    walk.level('dispensary', { map: 'masroor-hospital' }),
    video('morning', { src: 'ep4_morning', fallback: ['20 August 1971.', 'Bluebird is on the schedule.'] }),
    walk.level('intercept', { map: 'masroor-intercept' }),
    video('boarding', { src: 'ep4_boarding', fallback: ['Bluebird stops on the runway.', 'Matiur climbs into the rear seat.'] }),
    flight.level('radar-horizon', { sortie: 4 }),
    archiveCard('archive', {
      cardId: 'ep4_bluebird',
      heading: 'Bluebird',
      date: '20 August 1971',
      text: '[Placeholder] Sourced paragraph.\n\nHe held the aircraft under 100 ft for {radar-horizon.lowTime}.',
    }),
  ],
});
```

Step ids are save keys: settle them before release.

---

## 6. History and tone checks

- **Rashid Minhas** (the GDD's spelling; the upload is named `rashid-minhaj`) is an opponent, not a villain (GDD §2.1): plain, polite lines; no reward sound when he struggles.
- **The ending** is a cut to white, not a crash (GDD §7). 2.7 always ends as *complete*.
- **Dramatised:** the night visits in 2.2 and 2.3. The GDD only says he studied flight schedules. **Chloroform** needs a source before it is scripted.
- **Historically** he stopped the aircraft on the **taxiway** (GDD §1.7). The plan puts the 1,800 m mark on the runway, because the taxi route only reaches about 1,150 m. See the open questions.
- **Getting caught** means being questioned and sent back. No violence in the stealth parts.
- **The family** in 2.1: shown with dignity, no invented dialogue about the decision.

## 7. Open questions

1. **The 1,800 m mark.** Measured from East Dispersal along Bluebird's route, it falls on the runway just west of where the diagonal runway joins (this plan). Measured from the runway's east end, it falls about 1 km further west, roughly level with the control tower. Either way Bluebird must still be taxiing: a jet 1,800 m into its take-off run is already near flying speed. A shorter number, around 1,000 m, would put the stop on the taxiway, as it happened.
2. **Night for 2.2 and 2.3?** Recommended: it explains why an officer has to sneak on his own base, and torch beams make the cones read naturally. The cost is a tint pass and a change from the GDD's daytime "look normal" stealth.
3. **Video or in-engine cinematics?** Video steps work today and show fallback text until the clips exist. The GDD (§6.2) prefers in-engine cutscenes, but the cutscene player that would need is not built yet (the current one shows dialogue lines only).
4. **Show the crash in 2.7?** The plan follows the GDD's cut to white.
5. **Numbering.** This is "Level 2" in your brief but Episode 4 in the GDD and the code (Episode 2 is Sabre Skies). The plan uses `ep4`. Renumbering is easy now and hard after release, because ids are save keys.
