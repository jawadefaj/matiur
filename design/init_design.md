# Build spec — Wings of Freedom: The Legend of Matiur Rahman

Build-facing companion to the [Game Design Document](<Game Design Document - Wings of Freedom.md>) (**rev 3.1, five-episode structure**). The GDD is the source of truth for story, structure, tone and history. This file turns it into engineering decisions: tech stack, systems, tuning, HUD, code layout and save data.

**When this file and the GDD disagree, the GDD wins.** Fix this file.

"GDD §x" below points to a section of the GDD.

---

## 1. The game in brief

A mobile-first, portrait, pixel-art game about Flt Lt Matiur Rahman (1941–1971), Bir Shreshtho, told in five episodes and about 30 minutes long (GDD §0).

| # | Episode | Type | Length | Built on |
|---|---|---|---|---|
| 1 | Son of Dhaka (1941–1963) | Cutscene | 2–3 min | Cutscene player |
| 2 | Sabre Skies (Sept 1965) | Playable: top-down jet action, F-86 | 8–12 min | Flight engine |
| 3 | A Home and a Homeland (1968–Aug 1971) | Cutscene | 2–3 min | Cutscene player |
| 4 | Bluebird (20 Aug 1971) | Playable: stealth → boarding → low-level flight | 8–12 min | Stealth scene + flight engine |
| 5 | Homecoming (1971–2006) | Cutscene | 2–3 min + credits | Cutscene player |

So the build is three main pieces of tech: a **cutscene player**, a **flight engine** shared by Episode 2 and Episode 4 Phase 3, and a **top-down stealth scene** for Episode 4 Phase 1.

**Pillars** (GDD §0): respect over spectacle; story and play share one world; Episode 2 teaches Episode 4; learn by playing (an archive card after every episode).

---

## 2. Platform and tech

| Item | Decision |
|---|---|
| Engine | Phaser 4 (HTML5), TypeScript, Vite |
| Primary target | Mobile browser, **portrait** |
| Secondary target | Desktop browser, letterboxed portrait |
| Base resolution | 360 × 640 logical, integer-scaled, scale mode `FIT`, `pixelArt: true`, `roundPixels: true` |
| Tile size | 16 × 16 px |
| Input | Touch first; keyboard and gamepad mapped on desktop |
| Save | localStorage (see §10) |
| Wrapper (later) | Capacitor for Android/iOS if the web build lands well |

**Flight orientation:** both flight sections (Episode 2, Episode 4 Phase 3) are vertical-scrolling and top-down: terrain scrolls down, the aircraft sits in the lower third. Never ask the player to rotate to landscape.

**Cutscenes are in-engine** (GDD §6.2). No video files. The cutscene player reads JSON (GDD §6.9) and uses the same tilesets, sprites and portraits as gameplay.

---

## 3. Tone and sensitivity: build checklist

Full rules are in GDD §7. These are the ones that touch code and content:

- No kill counter and no per-kill score anywhere. Episode 2 scores objectives only.
- Enemy aircraft hit in Episode 2 trail smoke and break off. No explosion or debris effects.
- No reward sound, score pop or haptic "win" when Minhas loses control share in Episode 4.
- Operation Searchlight and the genocide: radio, sound and aftermath only. Bhairab combat is shown as outcomes.
- Episode 4 ends with a cut to white and silence. No crash or explosion assets are made for it.
- Real family members: no invented dialogue about the hijack decision. The daughters do not speak.
- Fictional composite NPCs are labelled in the credits (GDD §2.3).
- The alternate scenario, if it ships, shows a "this is fiction" label every time it loads.
- Bangla and English from day one. No hard-coded strings in code.

---

## 4. Art pipeline

The style rules are in GDD §6.3 (the style bible). Build-side requirements:

- **Master palette** in `assets/palette/master.hex` (~48 colours). A script in `tools/` fails on any image with off-palette colours (GDD §6.9).
- **One pixel scale everywhere.** No smooth scaling, no mixed-resolution art. Aircraft use 16 pre-drawn rotation frames, never runtime rotation.
- **Style test first:** one Episode 2 gameplay screen next to one Episode 3 close-up panel, on a phone, before full production.
- **Model sheets before scenes:** Matiur (five ages), Milly, Minhas, and the four Bhairab trainees.

### 4.1 Seed colours for the master palette

Carried over from the earlier per-act palette and mapped onto GDD §6.5 (colour by era):

| Colour | Hex | Used in |
|---|---|---|
| Ochre sand | `#D9A441` | Ep 1 Sargodha, Ep 2 plains |
| Deep green | `#3E6B35` | Ep 1 and 3 Ramnagar / Bhairab |
| Slate grey | `#55575A` | Ep 3 and 4 Masroor |
| Searchlight yellow | `#F2D43D` | Vision cones, UI highlights |

### 4.2 Period accuracy checklist

Must **not** appear before the 2006 scenes: CCTV cameras, solar panels, satellite dishes, glowing sci-fi tech, modern pickup trucks, modern camo patterns, plastic water tanks.

Should appear: Willys-type jeeps, Bedford/Dodge-style trucks, F-86F Sabres, T-33A trainers, rotary-dial phones, teleprinters, valve radios, paper flight logs, sentry dogs, PAF roundels of the era.

### 4.3 Mockups

Four pixel-art mockups (`IMG-20261104-WA0004/5/6/11.jpg`) shaped the earlier version of this spec but are **not in this repo**. Add them to `design/images-assets/` or drop this table.

| Mockup | Shows | Use now | Changes needed |
|---|---|---|---|
| WA0005 | Desert airfield, F-86 Sabres, Quonset hangars, watchtowers | Ep 1 Mauripur (1963) shot; reference for Ep 2 flight-line beats | Add a parked T-33. Peshawar is not desert, so retint for Ep 2. Drop the XP bar, crate and star icons (the game has no XP or loot). |
| WA0004 | Riverine jungle camp, boats, bamboo huts, camouflage nets | Ep 3 Bhairab camp wide shots | Remove the solar panels and satellite dish. |
| WA0006 | Grey military base, barbed wire, sandbags, truck park, vision cones, stealth HUD | Ep 4 Phase 1 (Masroor) and Ep 3 Masroor shots | Replace CCTV with human sentries. Phase 1 is late morning, so cones are guards' line of sight, not searchlights. |
| WA0011 | Desert base-builder ("Shelter HQ") | Not used | The game no longer has a management mode. |

---

## 5. Flow and unlocks

```
Title (with content note)
  → Ep 1 Son of Dhaka            cutscene
  → Ep 2 Sabre Skies             sorties 1 → 2 → 3
  → Ep 3 A Home and a Homeland   cutscene
  → Ep 4 Bluebird                Phase 1 → Phase 2 → Phase 3
  → Ep 5 Homecoming              cutscene + credits
  → Post-game: Episode select · Archive · Alternate scenario (only if it ships)
```

- Every episode opens with the shared title card (number, title, date, place) and closes with an archive card (GDD §6.7).
- Episodes unlock in order on first play, then can be replayed from the episode-select screen.
- Cutscene → gameplay hand-off has no screen change: the last shot is the gameplay framing and the HUD slides in (GDD §6.7).

---

## 6. Episode build specs

### 6.1 Cutscene episodes (1, 3, 5) and in-episode beats

- Played by `CutsceneScene` from JSON files in `src/data/cutscenes/` (format: GDD §6.9).
- Shot types (GDD §6.4): **wide** (tile map + scripted camera), **medium** (side-on stage with parallax), **close-up** (portrait panel with small loops).
- Step types the format needs: `wide`, `medium`, `closeup`, `line` (dialogue by text key), `sfx`, `music`, `titlecard`, `wait`, `fade` (including fade to white), `dissolveToPhoto`.
- Controls: tap to advance a line, hold to skip the scene.
- Scene lists and timings are in GDD §3 (Episode 1, 3 and 5 tables). Shots run 3–8 s, scenes 15–40 s.
- Episode 5's last shot dissolves the pixel-art grave into a real photo. It is the only real photo outside archive cards (GDD §6.8).
- The same player runs the 10–15 s beats between Episode 2 sorties and the short story beats inside Episode 4.

### 6.2 Episode 2 — Sabre Skies (flight engine)

Top-down, vertical-scrolling. Terrain scrolls down; the Sabre sits in the lower third.

**Controls**
- **Drag anywhere:** steer. The jet follows the finger's movement, not its position.
- **Throttle slider** on the right edge: speed and fuel burn.
- **Guns:** fire automatically when a target is inside the gunsight cone. Settings option: hold-to-fire.
- **Pull button:** tighter turn, raises G.

**Systems** (starting values, all in `tuning.json`)

| System | Rule |
|---|---|
| G-meter | 0–7 G. Above 5.5 G for 2 s: greyout (screen desaturates, controls soften by 50%). 7 G for over 1 s: blackout, sortie restarts. |
| Fuel | Drains with throttle. Tight in sortie 3. |
| Airframe damage | 3 pips. Each lost pip worsens handling. |
| Wingman ("Sherdil Two") | Scripted radio calls: threats, context, tutorial prompts. |

**Sorties**

| # | Sortie | Length | Goal | Teaches |
|---|---|---|---|---|
| 1 | Scramble (tutorial) | 2–3 min | Take off, join formation, finish the patrol | Steering, throttle, formation |
| 2 | Intercept | 3–4 min | Stop intruders before the base; keep the slower friendly formation safe | Gunsight, G, priorities |
| 3 | Low and home | 3–4 min | Damaged and low on fuel: stay under 100 ft through valleys and plains, then land | Low-level flying for Ep 4; fuel and damage |

Score comes from objectives only: base protected, escort safe, route flown, aircraft landed. Enemy types: Hunter, Gnat, Mystère, Vampire, Canberra. Sortie 3 uses the same altitude gauge as Episode 4 Phase 3.

**Decisions made in the Episode 2 mechanics build** (not in the GDD; revisit in playtests):
- **Altitude control at low level:** the GDD gives no altitude control. In low-level flight, PULL climbs and letting go sinks; at altitude, PULL tightens the turn. Episode 4 Phase 3 should reuse this.
- **Camera:** the jet keeps a heading and can turn freely (16 baked frames). The camera looks ahead along the heading, so when flying north the jet sits in the lower third as the GDD asks.
- **Steering:** floating stick. The jet turns toward the drag direction, and the stick base follows a long drag.
- **Hit grace:** after losing an airframe pip, the player is immune for 2 s, so one burst can't take all three.
- **Enemy fire:** enemies hold fire on head-on passes and often break away after a burst. Each enemy fighter has about 50 s of combat fuel, then leaves for home, which counts as turned back. This prevents endless turning fights.
- **Landing assist:** lined up and under 210 kt on short final, the jet holds about 10 ft until over the runway.
- **Checkpoint restarts** pause on a "tap to continue" card.

### 6.3 Episode 4 — Bluebird

Three phases, 8–12 minutes in total (GDD §3, option A).

**Phase 1 — Morning at Masroor (2–3 min): social stealth**
- Top-down 3/4 on the Masroor tileset (the same tileset as Episodes 1 and 3, in its 1971 look).
- Matiur is allowed on the base, so the goal is to **look normal**, not to hide.
- **Suspicion (0–100):** rises when he is seen somewhere unusual, running, or carrying the wrong item.
- **Vision cones** on guards and officers. Standing in a cone raises Suspicion faster; it is not an instant fail.
- **Cover actions:** inspect an aircraft, check a clipboard, talk to ground crew. Doing one while watched slows the Suspicion rise (start at −60%).
- Guards follow fixed, readable patrol loops. Each has a name and small habits.
- **Clock** in the HUD, about 11:10 → 11:30 (timeline unconfirmed, GDD §9). Reach the signal point on the taxiway inside the window.
- **Fail:** Suspicion full (stopped and questioned) or window missed. Restart from the checkpoint.

**Phase 2 — Bluebird (~1 min): boarding**
- A few timing prompts: signal the T-33, approach, climb into the rear seat, canopy closes.
- Minhas has one or two short, plain lines. He is confused and polite, not hostile.
- Build the prompts on the same `RhythmPrompt` system as Phase 3.

**Phase 3 — Radar Horizon (5–7 min): low-level flight + cockpit struggle**
- Same flight engine as Episode 2, now a T-33 over desert and salt flats toward Thatta.
- **Altitude band:** stay between 30 and 100 ft.
  - Above 100 ft, a radar icon fills. When full, interceptors scramble; get low again before they arrive or restart from the last checkpoint.
  - Below 30 ft, terrain warnings sound. Hitting a dune, ridge or power line restarts from the last checkpoint.
- **Cockpit inset** at the bottom of the screen shows both men's hands on the linked controls.
- **Control share (−100 Minhas to +100 Matiur):** when Minhas fights for the stick, the meter drifts toward his side and his inputs blend in (nose-down bias, rolls). The player wins it back with **rhythm prompts** (timed taps in a ring), never button-mashing.
- **Radio call:** at a scripted point Minhas reaches the radio. It cannot be prevented.
- **Ending (fixed by history):** reaching the end of the route triggers it. The struggle peaks, the music drops out, then a cut to white and silence. Performance changes only the archive card's wording ("He held the aircraft level for …").

**Alternate scenario** (post-game, only if it ships): the player reaches the border. Labelled as fiction every time it loads.

---

## 7. Systems and tuning

| System | Used in | Range / start values | Saved? |
|---|---|---|---|
| G-meter | Ep 2 (Ep 4 Phase 3: open, see §13) | 0–7 G; greyout > 5.5 G for 2 s; blackout at 7 G for > 1 s | No |
| Fuel | Ep 2 | Per sortie | No |
| Airframe damage | Ep 2 | 3 pips | No |
| Altitude band | Ep 2 sortie 3, Ep 4 Phase 3 | Gauge 0–500 ft; target 30–100 ft | No |
| Radar fill | Ep 4 Phase 3 | 0–100 | No |
| Suspicion | Ep 4 Phase 1 | 0–100 | No |
| Clock | Ep 4 Phase 1 | ~11:10 → 11:30 | No |
| Control share | Ep 4 Phase 3 | −100 to +100 | No |
| Level-flight time | Ep 4 Phase 3 | Seconds | Yes (archive card wording) |

All numbers are starting values. Keep them in `src/data/tuning.json`, not in code.

There are **no story branches**, so no choices carry between episodes.

---

## 8. HUD and UI

**Shared rules**
- Panels at the top and bottom only; the middle of the screen stays clear.
- Minimum touch target 44 px (physical).
- One pixel font with Bangla and English. This needs a custom or licensed Bangla pixel font; budget for it early.
- One dialogue-box frame, one title-card template and one archive-card frame across all episodes (GDD §6.3, §6.7).
- One settings button per screen.

| Screen | Top bar | Bottom bar |
|---|---|---|
| Cutscenes (Ep 1, 3, 5) | None | Dialogue box, hold-to-skip hint |
| Ep 2 | Fuel, G-meter, damage pips, objective | Pull button, pause (throttle slider on the right edge) |
| Ep 4 Phase 1 | Clock, Suspicion bar | Move stick, cover action |
| Ep 4 Phase 2 | None | Timing prompt |
| Ep 4 Phase 3 | Altitude gauge, radar fill, route progress | Cockpit inset, control-share meter, rhythm ring |

Route progress, not distance to the border: the real crash distance is unconfirmed (GDD §9).

---

## 9. Audio

One main theme (flute or solo voice) recurs in every episode, arranged differently each time (GDD §6.7).

| Episode | Layers |
|---|---|
| 1 | Theme in a warm arrangement; Dhaka street and river ambience; a light brass march motif at Risalpur |
| 2 | Jet whine layered with wind; wingman radio chatter |
| 3 | River ambience and rain; radio broadcasts in the style of Swadhin Bangla Betar Kendra (cleared or recreated audio only); distant aircraft on 14 April; at Masroor, sparse strings, office fans, typewriters |
| 4 | Phase 1: distant engine run-ups and a ticking-clock layer that tightens near the window. Phase 3: engine roar, cockpit breathing, radio static; music drops out before the cut to white |
| 5 | Silence after the white; the theme on solo voice or flute in a Bangla folk register |

---

## 10. Code and data layout

Built so far (Episode 2 mechanics). The simulation is plain TypeScript with no Phaser, so it runs in tests:

```
src/
  main.ts  config.ts  save.ts
  data/      tuning.json  tuning.ts
  systems/
    math.ts
    flight/    FlightModel.ts  GMeter.ts  Fuel.ts  Damage.ts  LowLevel.ts (altitude band, radar, terrain)
    combat/    Guns.ts (bullets, lead-computing sight)
    ai/        AI.ts (enemy fighters, bombers, escorted friendlies, Sherdil Two)
    radio/     Radio.ts
  sim/       World.ts  types.ts        // aircraft, bullets, events; steps at 60 Hz
  sortie/    Sortie.ts  Sortie1Scramble.ts  Sortie2Intercept.ts  Sortie3LowAndHome.ts  terrain.ts
  scenes/    BootScene.ts  MenuScene.ts  FlightScene.ts (renders the sim)  UIScene.ts (HUD + touch)
  gfx/       pixelArt.ts  textures.ts  // placeholder art generated at boot
  ui/        widgets.ts
tests/       systems.test.ts  sorties.test.ts (bot pilots fly every sortie)
```

Still planned for later episodes:

```
src/
  scenes/
    TitleScene.ts  EpisodeSelectScene.ts
    CutsceneScene.ts        // plays src/data/cutscenes/*.json (Ep 1, 3, 5 and in-episode beats)
    Ep4MasroorScene.ts      // Phase 1: stealth
    Ep4BoardingScene.ts     // Phase 2: boarding
    Ep4FlightScene.ts       // Phase 3: T-33 on the shared flight engine
    ArchiveScene.ts  AltScenarioScene.ts
  systems/
    stealth/   Suspicion.ts  VisionCone.ts  PatrolLoop.ts
    cockpit/   ControlShare.ts  RhythmPrompt.ts
    cutscene/  CutscenePlayer.ts
  data/
    dialogue.en.json  dialogue.bn.json  archive.json
    cutscenes/   ep1_01_dhaka.json  ...
assets/
  palette/master.hex
  tilesets/  sprites/  portraits/  ui/  audio/  fonts/
  archive/                  // real photos, used only in archive cards
tools/
  check-palette.ts          // fails on off-palette colours
```

**Save shape** (localStorage)

```json
{
  "version": 1,
  "unlockedEpisodes": [1, 2, 3, 4],
  "checkpoint": { "episode": 4, "phase": 3, "id": "corridor_cp2" },
  "ep2": { "sortiesCleared": [1, 2, 3] },
  "ep4": { "cleared": true, "levelSeconds": 214 },
  "archiveCards": ["ep1_dhaka_1941", "ep2_sabre_1965"],
  "settings": {
    "lang": "bn",
    "textSize": 1,
    "textSpeed": 2,
    "haptics": true,
    "assist": 0,
    "holdToFire": false,
    "patternCones": false
  }
}
```

---

## 11. Accessibility

- An "assist" slider for rhythm and timing windows (wider windows, slower control-share drift).
- Colour-blind-safe vision cones: a pattern-fill option as well as colour.
- Subtitles on every line; text-size options; Bangla and English.
- Hold-to-fire option in Episode 2 (auto-fire is the default).
- Pause anywhere, including Episode 4 Phase 3.
- Hold to skip any cutscene.
- Content note on the title screen covering war themes and the historical death of both pilots.

---

## 12. Milestones (GDD §8)

1. Style test, master palette and the palette-check script.
2. Episode 2 vertical slice: one sortie with full controls. This builds the flight engine.
3. Episode 4 Phase 3 on the same engine: altitude band and control share. This proves the climax works.
4. Cutscene player and Episode 3.
5. Episode 4 Phases 1–2, Episode 1, Episode 5.
6. Bangla localisation, accessibility, external historical review.

---

## 13. Open questions

Historical fact-checks are tracked in GDD §9. Build-side questions:

- Does the G-meter apply to the T-33 in Episode 4 Phase 3, or only to the Sabre in Episode 2?
- Low-level altitude control (PULL climbs, letting go sinks): keep it for Episode 4, or give altitude its own control?
- Logical height: the build stretches from 360 × 640 up to 360 × 800 to fill tall phones (§2 says 360 × 640). Keep it, or letterbox?
- Sound: the mechanics build has no audio yet.
- Items in Episode 4 Phase 1: the GDD says carrying "the wrong item" raises Suspicion but doesn't list items. The earlier spec had ID card, clipboard, toolkit and torch. Confirm or cut.
- Bangla pixel font: custom or licensed?
- Mockup images: add them to the repo or drop §4.3.
- Carried over from GDD §9: does the alternate scenario ship; keep or cut light interaction in Episode 3; monetisation (recommended none, and no ads in Episodes 4–5 under any model).

---

## 14. Removed from the earlier version of this file

The earlier version followed GDD rev 2.4. GDD rev 3.1 replaced these parts:

- Illustrated-slide prologue, five playable acts and a 60–90 min runtime → five episodes (two playable), about 30 minutes.
- Phaser 3 → Phaser 4.
- Act I hub walk and ring-gate training sorties → Episode 2's 1965 wartime sorties.
- Act II camp management (resources, ambush placement, armory/caches branch) → the Bhairab camp is now part of the Episode 3 cutscene.
- Multi-day stealth in Act III, Composure pips, Family Safety meter and reputation → Episode 4 Phase 1 is a single morning.
- All story branches and cross-act flags (`reputation`, `act2_branch`, `act3_branch`, `familySafety`).
- Distance-to-border counter → route progress.
