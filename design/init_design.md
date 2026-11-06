# design.md — Wings of Freedom: The Legend of Matiur Rahman

Working design spec derived from *Game Design Document – Wings of Freedom* (rev 2.4) and the four pixel-art mockups in the project folder. This file is the build-facing source of truth: when the GDD and this file disagree, this file wins, and open conflicts are listed in §14.

---

## 1. Pitch

A five-act, mobile-first pixel-art game about Flight Lieutenant Matiur Rahman (1941–1971), Bir Shreshtho. Each act uses a different play style matched to a stage of his life: flight training, organising resistance, living under surveillance, the tarmac approach, and the final low-level flight in T-33 *Bluebird 166* on 20 August 1971.

**Design pillars**

1. **Respect over spectacle.** The ending is fixed by history. Mechanics build tension and understanding, not power fantasy.
2. **One mechanic per act, done well.** Each act is a short, self-contained game (8–15 min) with its own controls and HUD.
3. **Choices carry cost.** Branches in Acts II and III change difficulty and narrative texture, never the historical outcome.
4. **Learn by playing.** Every act ends with a short archive card (photo, date, sourced paragraph) so players leave knowing the real story.

---

## 2. Platform and tech

| Item | Decision |
|---|---|
| Engine | Phaser 3 (HTML5), TypeScript, Vite |
| Primary target | Mobile browser, **portrait** (all four mockups are ~9:16) |
| Secondary target | Desktop browser, letterboxed portrait |
| Base resolution | 360 × 640 logical, integer-scaled (pixel art), `Phaser.Scale.FIT`, `pixelArt: true`, `roundPixels: true` |
| Tile size | 16 × 16 px |
| Input | Touch first (virtual stick + buttons); keyboard/gamepad mapped on desktop |
| Save | localStorage, one slot per act + global flags (see §11) |
| Wrapper (later) | Capacitor for Android/iOS if web build lands well |

**Orientation exception:** Acts I and V are flight sections. Side-scrolling flight in portrait wastes the screen, so these acts use **vertical-scrolling top-down flight** (terrain scrolls down, aircraft near bottom third). Do not force a rotate-to-landscape prompt mid-game.

---

## 3. Tone and sensitivity rules

These apply to every scene, line of dialogue, and marketing asset.

- **Rashid Minhas is an opponent, not a villain.** He is a 20-year-old trainee doing his duty and is himself honoured in Pakistan (Nishan-e-Haider). No sneering dialogue, no "enemy" portrait styling, no reward chimes when he loses control input. The cockpit struggle should read as tragic for both men.
- **No gamified killing.** Act II ambushes resolve abstractly (outcome cards, not on-screen shooting of individuals). No kill counters anywhere.
- **Operation Searchlight and the genocide** are shown through aftermath, radio broadcasts, and testimony-style text, never as playable violence.
- **The family** (wife and two young daughters) are real people. Keep depictions dignified and avoid invented dialogue that puts words in their mouths about the hijack decision; prefer gesture, letters, and silence. Get family consent before release if at all possible.
- **Alternate scenario mode** (post-game) must be labelled on-screen as fiction every time it loads.
- Ship with Bangla and English from day one. Proper nouns follow Bangla-preferred romanisation.

---

## 4. Art direction

**Style:** top-down 3/4 pixel art, 16 px tiles, chunky dark outlines, warm desaturated palettes, HUD panels framed in dark olive/gunmetal with rounded pixel corners (as in the mockups).

### 4.1 Mockup reference

| File | Shows | Use for | Notes |
|---|---|---|---|
| `IMG-20261104-WA0005.jpg` | Desert airfield, runway, five F-86 Sabres, Quonset hangars, watchtowers. HUD: crate, hearts, fuel can, gear, star, fuel and XP bars | **Act I hub** (PAF Sargodha) | Good fit. Add a T-33 parked on the apron as foreshadowing. |
| `IMG-20261104-WA0004.jpg` | Riverine jungle camp, boats, bamboo huts, camouflage nets, barracks tents, watchtower. Resource bar | **Act II** (Ramanagar camp, Narsingdi) | Strong fit. Remove solar panels and satellite dish from the central building (anachronistic). |
| `IMG-20261104-WA0006.jpg` | Grey military base, barbed wire, sandbags, truck park, searchlight FOV cones. HUD: hearts, detection eye, alert meter, item bar (ID card, pliers, wrench, flashlight), radar | **Acts III–IV** (PAF Masroor) | Strong fit for stealth. Replace CCTV cameras with human sentries and searchlights (see §4.2). |
| `IMG-20261104-WA0011.jpg` | Desert "Shelter HQ" base builder: power plant, wood mill, research lab, shop, food farm | **Not used as-is** | Reads post-apocalyptic, not 1971. Either drop, or reuse layout only as a reference for the Act II management UI. |

### 4.2 Period accuracy checklist (1961–1971)

Must **not** appear: CCTV cameras, solar panels, satellite dishes, glowing sci-fi tech, modern pickup trucks, modern camo patterns, plastic water tanks.

Should appear: Willys-type jeeps, Bedford/Dodge-style trucks, F-86F Sabres (Act I), T-33A trainer (Acts IV–V), rotary-dial phones, teleprinters, valve radios, paper flight logs, searchlights, sentry dogs, PAF roundels of the era.

### 4.3 Palette per act

| Act | Base | Accent | Mood |
|---|---|---|---|
| I Sargodha | Ochre sand `#D9A441` | Sky blue, aluminium | Optimism, discipline |
| II Ramanagar | Deep green `#3E6B35` | River teal, mud brown | Urgency, community |
| III–IV Masroor | Slate grey `#55575A` | Searchlight yellow `#F2D43D` | Surveillance, dread |
| V Corridor | Salt-flat white, dust tan | Warning red | Heat, finality |

---

## 5. Game structure

```
Title → Prologue (Dhaka, 1941 → 1961, illustrated slides)
  → Act I   Cadet of Sargodha        (flight + hub)
  → Act II  Seeds of Resistance      (camp management)
  → Act III Shadows Over Masroor     (social stealth)
  → Act IV  Operation Bluebird       (timing infiltration)
  → Act V   Radar Horizon            (low-level flight + cockpit struggle)
  → Epilogue (Thatta, 2006 repatriation, Bir Shreshtho)
  → Archive (unlocked cards) / Alternate Scenario (post-game)
```

Acts unlock linearly on first play, then are freely replayable from an act-select map. Target total playtime: 60–90 minutes.

---

## 6. Act specifications

### Act I — Cadet of Sargodha (1961–1965)

**Mode:** hub walk + vertical-scrolling flight sorties.
**Hub:** mockup WA0005. Walk the flight line, talk to instructors and fellow cadets, pick a sortie at the operations hut.

**Flight controls**
- Drag left/right: roll (lateral movement).
- Throttle slider on right edge: speed.
- Tap-hold "pull" button: tighten turn, raises G.

**Systems**
- **Ring gates:** fly through gates in sequence. Score = gates hit × time bonus.
- **G-meter:** 0–7 G. Above 5.5 G for > 2 s triggers greyout (screen desaturates, controls dampen 50%). 7 G for > 1 s = blackout, sortie failed.
- **Fuel:** drains with throttle; landing is required to pass.

**Sorties (in order):** formation basics → ring-gate course → low-level navigation → mock dogfight against an instructor Sabre (scored by tail position time, no shooting).

**Narrative choices:** 3–4 dialogue beats with peers that set a hidden `reputation` value (Steady / Bold / Mentor). This only changes later dialogue lines (people at Masroor remember him differently).

**Teaches for Act V:** low-altitude control, throttle feel, G-awareness.

### Act II — Seeds of Resistance (March 1971)

**Mode:** light camp management + tactical planning on a map.
**Map:** mockup WA0004 (Ramanagar camp).

**Resources** (top bar, period-appropriate replacements for the mockup's food/water/wood/energy/cash):

| Resource | Source | Spent on |
|---|---|---|
| Rice / food | Villagers, river boats | Feeding trainees |
| Recruits | Village visits | Training squads |
| Rifles / ammo | Armory raid or caches | Equipping squads |
| Morale | Training, news on radio | Squad effectiveness |
| Secrecy | Starts high | Lost by risky actions; low secrecy triggers patrol sweeps |

**Loop (one in-game day per turn, 8–10 turns):**
1. Assign recruits to training, scouting, or supply runs.
2. Place up to 3 ambush points and 2 lookout posts on the map.
3. End turn: a patrol sweep moves along roads/river; outcomes resolve as illustrated cards.

**Branch (turn 4):**
- **Raid police armory:** +ammo (high), −secrecy (large), chance of losing recruits. Sets `act2_branch = "armory"`.
- **Secure covert caches:** +ammo (low), secrecy preserved. Sets `act2_branch = "caches"`.

**End state:** recalled to West Pakistan (May 1971). Act ends regardless of score; score feeds the epilogue card ("the fighters you trained…").
**Carries forward:** `act2_branch` sets starting **Suspicion** in Act III (armory = 30, caches = 10).

### Act III — Shadows Over Masroor (May–August 1971)

**Mode:** top-down social stealth across several days.
**Map:** mockup WA0006, plus interiors (Flight Safety Office, records room, officers' quarters).

**Player status:** grounded, reassigned as Flight Safety Officer. He is *allowed* in many places, so stealth is about **looking normal**, not hiding.

**Core systems**
- **Suspicion (0–100):** global. Rises when seen in restricted areas, carrying out-of-role items, running, or failing dialogue checks. Decays slowly while doing legitimate duties. At 100: day ends early, a "watched" debuff is applied next day (more guards follow him).
- **Vision cones:** guards and searchlights (yellow cones, as mockup). Inside a cone, the eye icon fills; full eye = Suspicion spike, not instant failure.
- **Cover activities:** clipboard inspection, inspecting an aircraft, chatting with staff. Performing one in view lowers cone fill rate by 60%.
- **Hearts** in the mockup HUD become **Composure** (4 pips): lost on failed checks, restored overnight. 0 Composure = forced to go home for the day.
- **Items:** ID card, flight safety clipboard, toolkit, torch. Each unlocks specific doors or cover activities.

**Objectives (across 5–7 in-game days):** learn the T-33 solo schedule from flight logs, learn taxiway "Delta" timings, identify the trainee rostered on 20 August, keep family plans on track.

**Family Safety Meter (0–100):** separate bar shown only at home scenes.

**Branch (final evening):**
- **Delay to secure family's escape:** one extra day, Suspicion starts the next act +20, Family Safety +40. Sets `act3_branch = "delay"`.
- **Act immediately:** Suspicion unchanged, Family Safety unchanged. Sets `act3_branch = "immediate"`.

> Historical note: his wife and daughters were in Karachi at the time and were detained afterwards. Whatever the meter shows, the epilogue text must reflect what actually happened to them. The meter shapes tension and Act IV difficulty, not the historical record.

### Act IV — Operation Bluebird (20 Aug 1971, ~11:30)

**Mode:** single-attempt timing infiltration on the tarmac.
**Map:** zoomed section of Masroor, taxiway "Delta", T-33 staging area.

**Mechanics**
- Real-time clock in HUD (11:20 → 11:35).
- Guards, fuel bowser, ground crew follow fixed, readable loops (telegraph each loop once before the run starts).
- The T-33 begins taxiing at a fixed time; the player must reach the signal point on "Delta" in the window to flag it down for a "safety check".
- Starting Suspicion and patrol density come from Acts II–III.

**Fail:** being stopped and questioned (Suspicion 100) or missing the window. Retry restarts the act (the "single attempt" is narrative framing, not a hard lock; a hard lock would be hostile on mobile).

### Act V — Radar Horizon (20 Aug 1971, ~11:45)

**Mode:** vertical-scrolling low-level flight with a split control system.

**Flight layer**
- Altitude band shown as a vertical gauge. Target: 30–100 ft.
- Above 100 ft: radar sweep icon fills; full = radar contact, adds an intercept timer (does not end the run).
- Below 30 ft: terrain proximity warnings; collision with dunes, power lines, or salt-flat ridges = crash (retry from checkpoint).
- Distance-to-border counter.

**Cockpit layer (the struggle)**
- A **control-share meter** across the screen. When Minhas fights for the stick, the meter drifts toward his side and the aircraft's inputs blend with his (pitch-down bias, rolls).
- Player reclaims control with **rhythm prompts** (timed taps in a ring), not raw button mashing. Mashing reads as frantic and slightly comic on touch screens; a rhythm mechanic keeps it tense and dignified.
- Radio alert attempts appear as a separate prompt; missing it is recorded but doesn't change the outcome.

**Outcome:** the historical ending plays on every first clear, regardless of performance. Performance only changes how long the player keeps the aircraft level and what the final archive card says about the flight. The crash is shown as a cut to white and silence, never as an explosion set piece.

**Post-game unlock:** Alternate Scenario (clearly labelled fiction) where the player can reach the border. Keep it short and contemplative.

---

## 7. Cross-act systems summary

| System | Acts | Range | Persists? |
|---|---|---|---|
| Reputation | I → III dialogue | Steady / Bold / Mentor | Yes |
| G-meter | I, V | 0–7 G | No |
| Resources | II | per table | No |
| Secrecy | II | 0–100 | Feeds Act III Suspicion |
| Suspicion | III, IV | 0–100 | III → IV |
| Composure | III, IV | 4 pips | No |
| Family Safety | III | 0–100 | Feeds Act IV patrol density and epilogue tone |
| Altitude / radar | V | 0–500 ft | No |
| Control share | V | −100 to +100 | No |

All numbers above are starting values. Keep them in `src/data/tuning.json`, not in code.

---

## 8. Characters

| Character | Role | Notes |
|---|---|---|
| Flt Lt Matiur Rahman | Player | Calm, precise, teacherly. Few words; shows intent through action. |
| His wife | Narrative anchor, Act III | Commonly spelled **Milly Rahman** in Bangladeshi sources (GDD says "Milia"; confirm, see §14). |
| Their two daughters | Act III home scenes | Infants; non-speaking. |
| Plt Off Rashid Minhas | Act V | 20-year-old trainee. Portray with dignity (see §3). |
| Masroor security staff | Acts III–IV | Sentries, intelligence officers, radar operators. Individual names and small routines make them human. |
| Sargodha instructors and cadets | Act I | Establish reputation and camaraderie. |
| Ramanagar villagers and recruits | Act II | Named recruits with one-line backstories; losing one is felt. |

---

## 9. HUD and UI

Shared rules: panels at top and bottom only, playfield clear in the middle; minimum touch target 44 px (physical); all text in a pixel font that supports Bangla (needs a custom or licensed Bangla pixel font, budget for this early).

| Act | Top bar | Bottom bar |
|---|---|---|
| I | Fuel, G-meter, score | Throttle, pull button, pause |
| II | Food, recruits, ammo, morale, secrecy | End turn, map tools, menu |
| III | Composure pips, eye (detection), Suspicion bar, day/time | Items (4 slots), cover action, minimap |
| IV | Clock, Suspicion bar | Move stick, cover action |
| V | Altitude gauge, radar fill, distance | Control-share meter, rhythm ring |

Remove duplicate settings gears from the mockups (WA0004 and WA0011 show two).

---

## 10. Audio

- Act I: brass-light march motifs, jet whine layered with wind.
- Act II: river ambience, rain, village radio carrying Swadhin Bangla Betar Kendra–style broadcasts (use cleared or recreated audio only).
- Act III: sparse strings, distant engine run-ups, office fans, typewriters.
- Act IV: ticking clock layer that tightens near the window.
- Act V: engine roar, cockpit breathing, radio static; music drops out in the final 20 seconds.
- Epilogue: solo voice or flute, Bangla folk register.

---

## 11. Data and code layout

```
src/
  main.ts
  scenes/
    BootScene.ts  PreloadScene.ts  TitleScene.ts  PrologueScene.ts
    ActSelectScene.ts
    Act1HubScene.ts  Act1FlightScene.ts
    Act2CampScene.ts
    Act3MasroorScene.ts  Act3InteriorScene.ts
    Act4TarmacScene.ts
    Act5CorridorScene.ts
    EpilogueScene.ts  ArchiveScene.ts  AltScenarioScene.ts
    UIScene.ts               // runs in parallel, owns HUD
  systems/
    Suspicion.ts  VisionCone.ts  GMeter.ts  ControlShare.ts  Resources.ts
  data/
    tuning.json  dialogue.en.json  dialogue.bn.json  archive.json
assets/
  tilesets/  sprites/  ui/  audio/  fonts/
```

**Save shape**

```json
{
  "version": 1,
  "unlockedActs": [1, 2, 3],
  "flags": {
    "reputation": "Mentor",
    "act2_branch": "caches",
    "act3_branch": "delay",
    "familySafety": 70
  },
  "archiveCards": ["dhaka-1941", "sargodha-1961"],
  "settings": { "lang": "bn", "haptics": true, "textSpeed": 2 }
}
```

---

## 12. Accessibility

- Rhythm and timing windows have an "assist" slider (wider windows, slower drift).
- Colour-blind safe vision cones (pattern fill option in addition to yellow).
- Full subtitle and text-size options; Bangla and English.
- Pause anywhere, including Act V.
- Content note on the title screen describing war themes and the historical death of both pilots.

---

## 13. Milestones

1. **Vertical slice:** Act III one day (stealth, Suspicion, vision cones, UI scene) on mobile web.
2. Act V prototype (altitude band + control-share) to prove the emotional climax works.
3. Acts I and II.
4. Act IV, prologue, epilogue, archive.
5. Bangla localisation pass, accessibility, historical review by an external reader.

---

## 14. Open questions and fact-check before ship

Internal inconsistencies in the GDD:
- **Crash distance:** §1 says "35 kilometers short of the border", Map 4 says a "35-mile flight path". Pick one sourced figure and use it everywhere.
- **Commissioning year:** GDD says 1963. Some sources give 1961. Verify against Banglapedia.
- **Wife's name:** GDD "Milia"; most published sources use "Milly". Confirm with the family or primary sources.
- **Time of hijack:** GDD uses 11:30 (Act IV) and 11:45 (Act V). Confirm the sourced timeline.

Sources to verify exist and are citable:
- Reference 4, "PAF Base Masroor Security Logs & Flight Telemetry Archive", is not a publicly accessible source as far as I know. Either locate it or remove it and avoid claims that depend on it (radar tracking, telemetry).
- Reference 3's volume title should be checked against the actual published series.

Design decisions still open:
- Keep or cut the WA0011 base-builder concept.
- Whether the Alternate Scenario ships at all, given sensitivity.
- Monetisation: recommended none (premium or free), no ads during Acts IV–V under any model.
