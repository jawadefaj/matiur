# Wings of Freedom: The Legend of Matiur Rahman

**Game Design Document & Historical Master Specification**

| Project Genre | Historical Subject | Engine Target | Document Revision |
|---|---|---|---|
| Episodic Narrative / Top-Down Jet Action | Flt. Lt. Matiur Rahman (1941–1971) | HTML5 / Phaser 4, mobile portrait first | 3.1 (Five-Episode Structure) |

> **How to read this document.** Items marked **[verify]** are facts that published sources disagree on or that we have not yet confirmed. Resolve them before writing final scripts. See §9.

---

## 0. The Game in One Page

The game tells Matiur Rahman's life in **five episodes**. Episodes 1, 3 and 5 are story episodes, built mostly from cutscenes. Episodes 2 and 4 are playable.

| # | Episode | Years | Type | Target length |
|---|---|---|---|---|
| 1 | **Son of Dhaka** | 1941–1963 | Cutscene episode | 2–3 min |
| 2 | **Sabre Skies** | September 1965 | Playable: top-down jet action, F-86 Sabre | 8–12 min |
| 3 | **A Home and a Homeland** | 1968–August 1971 | Cutscene episode | 2–3 min |
| 4 | **Bluebird** | 20 August 1971 | Playable: infiltration + low-level flight with cockpit struggle | 8–12 min |
| 5 | **Homecoming** | 1971–2006 | Cutscene episode | 2–3 min |

**Total:** about 30 minutes (22–33 min). This is a small, focused game.

**Length rules**
- Every cutscene episode is **2–3 minutes**. Scenes run 15–40 seconds; individual shots 3–8 seconds. Dialogue is short; images do most of the work.
- Every playable episode is **8–12 minutes** on a first play, including short in-engine story beats.

**Design pillars**

1. **Respect over spectacle.** History fixes the ending. The playable parts build tension and understanding, not a power fantasy.
2. **Story and play share one world.** Cutscenes use the same pixel art, characters and locations as the playable episodes (see §6).
3. **Episode 2 teaches Episode 4.** The flying skills and controls learned in the Sabre are the ones the player needs on 20 August 1971.
4. **Learn by playing.** Every episode ends with an archive card (photo, date, short sourced paragraph).

---

## 1. Detailed Historical Background & Context

### 1.1 Early life (1941–1961)

Matiur Rahman was born in Dhaka, East Bengal, in 1941. Sources give his birth date as **29 October 1941** or **29 November 1941** **[verify]** [1][5]. Banglapedia places his birth at the family house on Agha Sadeq Road, Dhaka [1]. His family's ancestral home was the village of **Ramnagar** in Raipura Upazila, Narsingdi [5].

He studied at **Dhaka Collegiate School** and then moved more than 1,500 km west to the **Pakistan Air Force Public School, Sargodha**, where he completed his schooling [1][5]. Boarding school in West Pakistan, far from his family and language, was common for Bengali boys aiming for a military career, and it shaped him early.

### 1.2 Becoming a fighter pilot (1961–1965)

On **15 August 1961** he joined the PAF Academy (then the PAF College) at **Risalpur** [5]. He was commissioned as a Pilot Officer in **June 1963** (22 June per Wikipedia), from the **36th GD(P) Course** [1][5].

His first posting was to **No. 2 Squadron at PAF Base Mauripur**, Karachi. Mauripur was later renamed **Masroor**, the same base he would take off from on 20 August 1971 [5]. There he completed jet conversion on the **Lockheed T-33** (scoring 75.66%), then fighter conversion on the **North American F-86 Sabre** (81%) [5]. He was then posted to **No. 19 Squadron at Peshawar** as a jet fighter pilot [1][5].

### 1.3 The 1965 war

The Indo-Pakistani War of 1965 was fought largely in September 1965. PAF Sabre squadrons, including No. 19 Squadron at Peshawar, flew air defence, escort and ground-attack sorties. Sources list Matiur Rahman as a veteran of this war [5], but **his specific missions are not documented in the sources we have [verify]**. Episode 2 is therefore built from *representative* Sabre sorties of the period. It does not claim specific kills or missions for him.

### 1.4 Instructor, husband, father (1965–1970)

After the war he rose to **Flight Lieutenant** and became an **instructor pilot**. By 1971 he was serving at PAF Base Masroor, Karachi [5]. He married **Milly Rahman** (also spelled Mili or Milia) in **1968** **[verify year]**. They had two daughters, **Mahin** and **Tuhin** [5].

### 1.5 1971: Leave, Operation Searchlight, and the Bhairab camp

At the end of **January 1971** he travelled to Dhaka with his family on two months' leave [5]. East Pakistan was in political crisis after the Awami League's election victory and the delay in transferring power.

On the night of **25 March 1971** the Pakistan Army launched **Operation Searchlight**, the start of the genocide in East Pakistan. Matiur was staying at **Ramnagar** at the time [5]. Moved by the killings, he organised local youth and set up a **training camp at Bhairab** for Bengalis who wanted to join the Mukti Bahini, teaching weapons handling and tactics [1][5]. Banglapedia says he also **took part in a battle against the Pakistan Army at Bhairab** [1].

On **14 April 1971** the PAF bombed his camp, but he had expected the attack and had already moved it, saving the trainees [5]. He returned to Dhaka on **23 April** and to Karachi on **9 May 1971** with his family [5]. Banglapedia says he went back under pressure from relatives [1].

One account says that during this period he also helped the family of Group Captain Taher Quddus escape on a Royal Saudi Air Force C-130 bound for Riyadh **[verify: single, weak source]** [5].

### 1.6 Masroor under suspicion (May–August 1971)

Back in Karachi, Bengali officers were treated with suspicion. According to the original GDD, he was **grounded and reassigned as a Flight Safety Officer** at Masroor **[verify]** [4]. Wikipedia describes him as an instructor pilot at Masroor in 1971 [5]. Working under watch, he planned to take a jet across the border to India and join the Bengali liberation forces.

### 1.7 20 August 1971

On the morning of **20 August 1971** **[verify time: ~11:30 AM]**, **Pilot Officer Rashid Minhas**, a 20-year-old newly commissioned officer, was taxiing a **Lockheed T-33** (callsign *Bluebird*; *Bluebird 166* per the original GDD **[verify]**) for his second solo flight [1][5].

Matiur stopped the aircraft on the taxiway, climbed into the rear (instructor's) seat and took control. He took off and turned towards the Indian border at very low altitude to stay under radar [5]. Minhas radioed Masroor that he was being hijacked and fought for control through the T-33's linked dual controls [5]. The aircraft crashed near **Thatta**, Sindh, inside Pakistan, short of the border. Both pilots were killed [1][5]. The distance to the border is given variously **[verify: original GDD says 35 km; no confirmed figure]**.

Accounts of the final moments differ: one says the canopy was jettisoned and Matiur's body was found some distance from the wreck [5]. Banglapedia says Matiur's body was found but Minhas's was not [1]. **The game does not depict these details** (see §7).

### 1.8 Aftermath

- **Rashid Minhas** was awarded the **Nishan-e-Haider**, Pakistan's highest military honour.
- **Matiur Rahman** was buried in the **fourth-class employees' graveyard at Masroor** [1][5].
- After independence, Bangladesh awarded him the **Bir Shreshtho**, its highest gallantry award [1][5]. He is one of seven Bir Shreshtho recipients.
- What happened to **Milly and the daughters** in Karachi after 20 August, and how they returned to Bangladesh, needs a sourced account **[verify]**. Milly Rahman later co-wrote and acted in the 2007 film *Ostittey Amar Desh* about him [5].

### 1.9 Homecoming (2006)

After years of requests by the family and the Bangladesh government, Pakistan returned his remains. They were flown to Dhaka on **24 June 2006** and buried with full military honours at the **Martyred Intellectuals' Graveyard, Mirpur, Dhaka** on **25 June 2006** [1][5][6][7].

### 1.10 Legacy

- **BAF Base Bir Shreshtho Matiur Rahman**, Jessore [5].
- A Bangladesh Air Force trophy for the best flying-training performance bears his name [5].
- Stadiums, cadet college dining halls and a staff college research prize are named after him [5].
- Dramatisations: the docudrama *Ognibolaka* and the film *Ostittey Amar Desh* (2007) [5].

---

## 2. Characters

### 2.1 Main characters

#### Flight Lt. Matiur Rahman — Protagonist
Calm, precise and good at teaching. He says little and shows what he intends through action. He appears at five ages, each needing its own sprite and portrait:

| Age / look | Episodes |
|---|---|
| Boy in Dhaka / Ramnagar (~8–12) | 1 |
| Cadet at Sargodha / Risalpur (~16–21) | 1 |
| Young fighter pilot, F-86 era (~24) | 2 |
| Husband, instructor, camp organiser (~27–29) | 3 |
| Flight Lieutenant at Masroor, 20 Aug 1971 (~29) | 4 |

#### Milly Rahman — Supporting character (wife)
Appears in Episode 3 (marriage, family life, 1971) and Episode 5 (as an older woman at the 2006 funeral). She is a real person, so she is shown with dignity: through gesture, letters and silence. **Do not invent dialogue in which she discusses the hijack decision.** Her name's spelling (Milly / Mili / Milia) needs confirming **[verify]**, ideally with the family.

#### Pilot Officer Rashid Minhas — Opposing character (Episode 4)
A 20-year-old trainee on his second solo flight, doing his duty. He is a national hero in Pakistan (Nishan-e-Haider). **He is an opponent, not a villain.** No sneering lines, no "enemy" styling, no reward sounds when he loses control. The cockpit struggle should read as a tragedy for both men.

### 2.2 Real people in minor, mostly non-speaking roles

| Person | Episodes | Notes |
|---|---|---|
| Daughters Mahin and Tuhin | 3, 5 | Infants in Ep 3, adults in Ep 5. Non-speaking. |
| His parents | 1 | Names to confirm **[verify]**. Unnamed until then. |

### 2.3 NPCs (fictional composites)

These characters are invented to carry scenes. The credits must label them as composites. Names below are placeholders.

| NPC | Episode | Role |
|---|---|---|
| Hasan, school friend at Sargodha | 1 | Another Bengali boy far from home; shows the homesickness and friendship. |
| Flight instructor at Risalpur | 1 | Strict, fair; gives Matiur his first solo. |
| Wingman, "Sherdil Two" | 2 | Voice on the radio in every sortie; teaches formation and calls threats. |
| Squadron commander | 2 | Mission briefings. |
| Crew chief (ground crew) | 2 | Prepares the Sabre; gives a human moment before and after each sortie. |
| **Bhairab camp trainees** | 3 | The heart of Episode 3: **Rafiq** (college student, eager, untrained), **Karim** (boatman, knows the rivers), **Jabbar** (former East Pakistan Rifles soldier, knows rifles), **Nurul** (teenager, too young to fight, insists on helping). |
| Village elder and a mother who feeds the camp | 3 | Show the community behind the camp. |
| Masroor guards and officers | 4 | Patrol routines and vision cones. Each guard has a name and small habits. |
| Control tower voice | 4 | Heard on the radio during the flight. |
| Honour guard, crowd, journalist | 5 | 2006 funeral. |

---

## 3. Episode Specifications

### Episode 1 — Son of Dhaka (1941–1963) · Cutscene episode

**Purpose:** introduce Matiur and the places that will matter later. Let the player see the T-33 and the F-86 before they ever fly one.

**Length:** 2–3 minutes.

| Scene | Time | Content | Reused later in |
|---|---|---|---|
| 1.1 Dhaka, 1941 | ~15 s | Agha Sadeq Road house. Title card: date of birth. | Ep 3 (Dhaka scenes) |
| 1.2 Boyhood | ~30 s | Dhaka Collegiate School; a visit to Ramnagar: river, boats, paddy fields. A plane passes overhead and the boy looks up *(dramatised)*. | Ep 3 (Ramnagar, Bhairab) |
| 1.3 Sargodha | ~25 s | PAF Public School. Homesickness, a letter home, friendship with Hasan. | — |
| 1.4 Risalpur, 15 Aug 1961 | ~20 s | Academy drill, first training flights. | — |
| 1.5 Mauripur, 1963 | ~30 s | Commissioning (36th GD(P)). First posting to No. 2 Squadron, Karachi. He climbs into a **T-33** for the first time. | **Ep 4: same base, same aircraft type** |
| 1.6 Peshawar | ~20 s | Converts to the **F-86 Sabre**, joins No. 19 Squadron. Ends looking at the Sabre on the flight line. | Leads directly into Ep 2 |

**Interaction:** tap to advance, hold to skip. The archive card at the end can be opened for more detail.

### Episode 2 — Sabre Skies (September 1965) · Playable

**Length:** 8–12 minutes.

**Genre:** top-down, vertical-scrolling jet action (portrait screen). The terrain scrolls down and the Sabre sits in the lower third.

**Setting:** PAF Base Peshawar and the skies over the Punjab border, September 1965.

**Controls (touch)**
- **Drag anywhere:** steer (the jet follows the finger's movement, not its position).
- **Throttle slider** on the right edge: speed and fuel use.
- **Guns:** fire automatically when a target is inside the gunsight cone (option: hold-to-fire).
- **Pull button:** tighter turn, raises G.

**Systems** (kept small for a short episode)
- **G-meter (0–7 G):** above 5.5 G for 2 s the screen greys and controls soften. 7 G for over 1 s is a blackout and the sortie restarts.
- **Fuel:** drains with throttle. Matters most in sortie 3.
- **Airframe damage:** 3 pips. Damage affects handling.
- **Wingman:** radio calls warn of threats and give context.

**Sorties (in order)**

| # | Sortie | Time | Teaches |
|---|---|---|---|
| 1 | **Scramble.** Take off, join formation with the wingman, short patrol. Doubles as the tutorial. | 2–3 min | Steering, throttle, formation |
| 2 | **Intercept.** Stop intruders before they reach the base while protecting a slower friendly formation. | 3–4 min | Gunsight, G-management, priorities |
| 3 | **Low and home.** Damaged and low on fuel, fly back under 100 ft through valleys and over plains, then land. | 3–4 min | **Low-level flying, the exact skill needed in Ep 4**; fuel and damage |

**Tone rules for Episode 2**
- No kill counter. Score comes from objectives (base protected, escort safe, route flown, aircraft landed).
- Hit enemy aircraft trail smoke and break off; they do not explode in a burst of debris.
- Enemy aircraft types should be period-accurate (Hunter, Gnat, Mystère, Vampire, Canberra) but not demonised. The episode is about airmanship and duty, not national hatred. This matters especially for a Bangladeshi audience, given India's role in 1971.
- Do not claim specific missions or victories for Matiur until they are sourced **[verify]**.

**Between sorties:** 10–15 second in-engine beats at the flight line (crew chief, wingman, a letter from home), in the same style as the cutscene episodes.

### Episode 3 — A Home and a Homeland (1968 – August 1971) · Cutscene episode

**Purpose:** show what he had to lose and why he chose to act anyway.

**Length:** 2–3 minutes. This episode covers the most history, so each beat is a few shots at most.

| Scene | Time | Content |
|---|---|---|
| 3.1 Wedding, 1968 | ~20 s | Bengali wedding in Dhaka. Milly introduced. Warm, colourful, quiet. |
| 3.2 Karachi home | ~20 s | Officers' quarters; Mahin and Tuhin as babies. He is now an instructor. |
| 3.3 Leave and 25 March 1971 | ~30 s | Back in Dhaka and Ramnagar; tension on the radio. Operation Searchlight shown only through **radio broadcasts, distant sound and the next morning's aftermath**, never as on-screen killing. |
| 3.4 The Bhairab camp | ~35 s | He trains volunteers: one short shot each of Rafiq, Karim, Jabbar and Nurul. Drill, weapons handling, a river crossing. |
| 3.5 14 April 1971 | ~20 s | PAF aircraft bomb the old camp site. He had moved the camp in time. He watches his own air force attack his people. |
| 3.6 Masroor under watch | ~30 s | Title card: back in Karachi, 9 May. Grounded and watched; he studies flight schedules. A quiet last evening with his family. Ends at dawn, 20 August. |

### Episode 4 — Bluebird (20 August 1971) · Playable

#### 4.1 Options considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Three-phase operation (recommended)** | Top-down infiltration on the tarmac → short boarding sequence → top-down low-level flight with a cockpit-struggle meter | Reuses Episode 2's flight engine and camera; same art style; fits portrait mobile; the player uses skills learned in Ep 2 | Most content of the three |
| B. Cockpit only | First-person view of the T-33 cockpit and instruments, the struggle shown through stick, hands and canopy | Very intimate | New camera and art pipeline; breaks visual consistency; hard in pixel art at phone size |
| C. Planning board + short flight | Puzzle-style planning (schedules, routes, timings), then a short scripted flight | Cheap; thoughtful | Weak climax; the flight feels like a cutscene |

#### 4.2 Recommended design: three phases

**Length:** 8–12 minutes in total.

**Phase 1 — Morning at Masroor (2–3 min): top-down social stealth**
- Matiur is allowed on the base, so the aim is to **look normal**, not to hide.
- Guards and officers have **vision cones**. Being seen somewhere unusual, running or carrying the wrong item raises a **Suspicion** bar.
- **Cover actions:** inspect an aircraft, check a clipboard, talk to ground crew. Doing one while watched slows Suspicion.
- **Clock** in the HUD (about 11:10 → 11:30 **[verify timeline]**). Reach the signal point on the taxiway in the time window.
- **Fail:** stopped and questioned (Suspicion full) or missing the window. Restart from a checkpoint.

**Phase 2 — Bluebird (about 1 min): the boarding**
- Flag down the taxiing T-33 for a "safety check".
- A few timing prompts: signal, approach, climb into the rear seat, canopy closes.
- Minhas has one or two short, plain lines. He is confused and polite, not hostile.

**Phase 3 — Radar Horizon (5–7 min): low-level flight + cockpit struggle**
- Same top-down flight engine as Episode 2, now in a T-33 over desert and salt flats toward Thatta.
- **Altitude band:** stay between 30 and 100 ft.
  - Above 100 ft, a radar icon fills. When full, interceptors are scrambled and the player must drop low again before they arrive (failing restarts from the last checkpoint).
  - Below 30 ft, terrain warnings sound; hitting a dune, ridge or power line restarts from the last checkpoint.
- **Cockpit inset** at the bottom of the screen shows both men's hands on the linked controls.
- **Control-share meter:** when Minhas fights for the stick, the aircraft's inputs drift toward his (nose-down, rolls). The player regains control with **rhythm prompts** (timed taps in a ring), not button-mashing. Mashing feels frantic and slightly comic on a phone; rhythm keeps it tense and dignified.
- **Radio call:** at a scripted moment, Minhas reaches the radio. This cannot be prevented.

**Ending (fixed by history)**
- Reaching the end of the route triggers the historical ending. Player skill decides *whether* they get there and how steady the flight was, never the outcome.
- The struggle peaks, the music drops out, and the screen **cuts to white and silence**. No crash, no explosion.
- Performance only changes the wording of the archive card ("He held the aircraft level for …").

**Optional, post-game:** an *alternate scenario* in which the player reaches the border. If it ships, it must be labelled as fiction every time it loads. Whether it ships at all is an open question (§9).

### Episode 5 — Homecoming (1971–2006) · Cutscene episode

**Length:** 2–3 minutes, plus credits.

| Scene | Time | Content |
|---|---|---|
| 5.1 From white | ~15 s | Text over white: 20 August 1971, both pilots killed near Thatta. |
| 5.2 Two graves, two countries | ~25 s | Matiur buried in the fourth-class employees' graveyard at Masroor. Minhas honoured with the Nishan-e-Haider. Shown with equal quiet. |
| 5.3 Thirty-five years | ~30 s | Independence; the Bir Shreshtho award. Milly and the daughters' return **[verify how and when]**. The daughters grow up; the family keeps asking for him to come home. |
| 5.4 Karachi → Dhaka, June 2006 | ~25 s | Handover ceremony in Karachi. On 24 June the coffin, under the Bangladesh flag, arrives in Dhaka. |
| 5.5 Mirpur, 25 June 2006 | ~35 s | Burial with full military honours at the Martyred Intellectuals' Graveyard. Milly and the daughters present. Salute, then silence. |
| 5.6 Archive | ~20 s | The pixel-art grave **dissolves into a real photograph** of the grave: the one deliberate break from the art style (§6.8). A few real archive photos, then credits. |

---

## 4. Locations & Environments

| Location | Episodes | Environment | Key assets |
|---|---|---|---|
| Dhaka, Agha Sadeq Road (1940s–60s) | 1, 3 | Old Dhaka lanes, family house, rickshaws | House exterior/interior, street tiles |
| Ramnagar village, Narsingdi | 1, 3 | River, boats, paddy, bamboo, village homes | River and village tileset |
| PAF Public School, Sargodha | 1 | Dry plains, school buildings | Small set |
| PAF Academy, Risalpur | 1 | Parade ground, training aircraft | Small set |
| **PAF Base Mauripur / Masroor, Karachi** | 1, 3, **4** | Desert airfield, hangars, officers' quarters, Flight Safety Office, taxiway | **Built once, used three times** (1963 look and 1971 look) |
| PAF Base Peshawar + Punjab border skies | 2 | Airfield, mountains to the north, plains, rivers, villages from above | Scrolling flight terrain set |
| Bhairab training camp | 3 | Riverbank, hidden clearing, river crossings | Camp tileset |
| Flight corridor to Thatta | 4 | Low desert, dunes, salt flats, power lines | Scrolling flight terrain set (shares tiles with Ep 2) |
| Dhaka airport, 2006 | 5 | Tarmac, honour guard, coffin | Modern-era set |
| Martyred Intellectuals' Graveyard, Mirpur | 5 | Graves, trees, crowd | Final set |

---

## 5. Aircraft

| Aircraft | Role in game | Episodes |
|---|---|---|
| North American **F-86F Sabre** | Player aircraft | 1 (seen), 2 (flown) |
| Lockheed **T-33A Shooting Star** | First jet he trained on; *Bluebird* | 1 (seen), 3 (seen), 4 (flown) |
| Period enemy types (Hunter, Gnat, Mystère, Vampire, Canberra) | Ep 2 opponents | 2 |
| PAF aircraft over Bhairab | 14 April 1971 bombing (seen from the ground) | 3 |

Reference photos are in [images-assets/](images-assets/).

---

## 6. Art Direction & Visual Consistency Plan

### 6.1 The problem

Episodes 1, 3 and 5 are story-heavy. Episodes 2 and 4 are top-down gameplay. If the cutscenes are made with different tools (pre-rendered video, painted illustrations, 3D), they will look like a different game and the switches between story and play will feel jarring.

### 6.2 The core decision: one world, built once

**All cutscenes are made in-engine (Phaser 4) from the same pixel-art assets as the gameplay.** No pre-rendered video.

This means:
- The same Matiur sprite walks through Episode 3's camp and Episode 4's tarmac.
- The same Masroor tileset is the base in 1963 (Ep 1), 1971 (Ep 3) and on 20 August (Ep 4).
- The same F-86 and T-33 sprites appear in cutscenes and gameplay.
- Story and play files are smaller and easier to edit (cutscenes are data, not video files; see §6.9).

### 6.3 Fixed style rules (the style bible)

| Rule | Value |
|---|---|
| Base resolution | 360 × 640 logical, portrait, integer-scaled |
| Pixel scale | **One art pixel is the same size everywhere.** Never mix high-res and low-res art, and never smooth-scale sprites. |
| Tiles | 16 × 16 px |
| Camera for gameplay | Top-down 3/4 |
| Outlines | 1 px dark outline on characters and vehicles; none on terrain |
| Light direction | Always top-left |
| Character proportions | Gameplay sprites ~24 px tall; close-up portraits drawn at the same pixel scale (not upscaled) |
| Palette | One **master palette** (~48 colours) for the whole game; each episode uses a subset (§6.5) |
| Animation | Characters 8–10 fps, aircraft rotation pre-drawn (16 directions), no smooth rotation |
| Text and UI | One pixel font with Bangla and English support; one dialogue-box frame used in every episode |

### 6.4 Three shot types for cutscenes

| Shot | What it is | Example |
|---|---|---|
| **Wide** | The gameplay view itself: top-down 3/4 tiles and sprites, with a scripted camera | Matiur walks across the Bhairab camp |
| **Medium** | A side-on "stage" scene drawn at the same pixel scale, with parallax layers | The wedding; the cockpit |
| **Close-up** | A character portrait panel (head and shoulders) with small animations: blinking, breathing, wind, rain, cigarette smoke | Milly at the window; Minhas's face in the cockpit |

Movement comes from camera pans, parallax and small looping animations, like a motion comic. This is much cheaper than full animation and looks consistent.

### 6.5 Colour by era (all from the master palette)

| Episode | Era | Grade | Feeling |
|---|---|---|---|
| 1 | 1941–1963 | Warm sepia, soft yellows | Memory, childhood |
| 2 | 1965 | Bright sky blue, ochre plains, aluminium | Confidence, speed |
| 3 | 1968 → 1971 | Starts warm (wedding reds, greens), turns grey-green monsoon, then slate grey at Masroor | Joy turning to dread |
| 4 | 20 August 1971 | Harsh white sun, dust tan, warning red | Heat, pressure, finality |
| 5 | 1971 → 2006 | White, then cool muted blues and greens, flag green and red as the only strong colours | Mourning, dignity, homecoming |

### 6.6 Shared assets across episodes

| Asset | Ep 1 | Ep 2 | Ep 3 | Ep 4 | Ep 5 |
|---|:-:|:-:|:-:|:-:|:-:|
| Matiur sprites and portraits | ● | ● | ● | ● | |
| Milly sprites and portraits | | | ● | | ● |
| F-86 Sabre sprite | ● | ● | | | |
| T-33 sprite | ● | | ● | ● | |
| Masroor / Mauripur tileset | ● | | ● | ● | ● (2006 handover) |
| Ramnagar / river tileset | ● | | ● | | |
| Flight terrain tiles | | ● | | ● | |
| Dialogue box, title cards, archive cards | ● | ● | ● | ● | ● |

### 6.7 Seamless transitions between story and play

- **Cutscene → gameplay:** the cutscene ends on a wide shot that is exactly the gameplay framing. The HUD slides in and control is handed to the player with no screen change.
- **Gameplay → cutscene:** the HUD slides out and the camera moves into a medium or close-up shot.
- **Episode bookends:** every episode opens with the same title-card template (episode number, title, date, place) and closes with an archive card.
- **Audio as glue:** one main musical theme (flute or solo voice) recurs in every episode, arranged differently each time.

### 6.8 Real photographs

Real archive photos appear **only inside archive cards**, in a fixed museum-style frame, never in scenes. This keeps the game world consistent and makes the history feel distinct from the dramatisation.

**The one exception** is the final shot of Episode 5: the pixel-art grave at Mirpur dissolves into a real photograph of it. Because it is the only break, it carries weight.

### 6.9 Production pipeline

1. **Style test first.** Before full production, make one Episode 2 gameplay screen and one Episode 3 close-up panel. Put them side by side on a phone. If they don't look like the same game, fix the bible before making more art.
2. **Palette file in the repo** (for example `assets/palette/master.hex`), plus a small script that flags any image using off-palette colours.
3. **Model sheets** for Matiur (all five ages), Milly, Minhas and the four trainees before any scene is drawn.
4. **One art lead** does a final pass on every asset, including outsourced or AI-assisted art, which must be redrawn to the palette and pixel grid.
5. **Cutscenes as data.** A simple cutscene player reads JSON, so writers can edit scenes without touching code:

```json
{
  "id": "ep3_06_bombing",
  "shots": [
    { "type": "wide", "map": "bhairab_camp", "camera": { "from": [120, 300], "to": [180, 200], "ms": 4000 } },
    { "type": "sfx", "key": "aircraft_distant" },
    { "type": "closeup", "portrait": "matiur_1971_looking_up", "ms": 2500 },
    { "type": "line", "speaker": "matiur", "text_key": "ep3_06_l1" }
  ]
}
```

### 6.10 Avoid

- Pre-rendered or HD video cutscenes.
- Mixed pixel sizes or smooth-scaled sprites.
- Anachronisms (CCTV, solar panels, satellite dishes, modern vehicles before 2006).
- Different UI frames or fonts in different episodes.

---

## 7. Tone & Sensitivity Rules

- **Rashid Minhas is an opponent, not a villain** (see §2.1).
- **No gamified killing.** No kill counters anywhere. In Episode 2, enemies break off when hit. Bhairab camp combat is shown through outcomes, not on-screen shooting.
- **The genocide** is shown through radio, sound and aftermath, never as playable violence.
- **The final moments of 20 August** are not depicted: cut to white. Disputed details (canopy, bodies) are never shown.
- **The family** are real people: dignified depiction, no invented dialogue about the hijack decision. Seek family consent before release if possible.
- **Fictional composites** are labelled in the credits.
- Ship with **Bangla and English** from day one.

---

## 8. Production Order (suggested)

1. **Style test** (§6.9) and master palette.
2. **Episode 2 vertical slice:** one sortie, full controls. This builds the flight engine.
3. **Episode 4 Phase 3** on the same engine: altitude band and control-share meter. This proves the emotional climax works.
4. **Cutscene player** and Episode 3 (it introduces Episode 4's base).
5. Episode 4 Phases 1–2, Episode 1, Episode 5.
6. Bangla localisation, accessibility, external historical review.

---

## 9. Fact-Check & Open Questions

| Item | Status |
|---|---|
| Birth date: 29 Oct vs 29 Nov 1941 | Sources disagree (Wikipedia vs Banglapedia) |
| Birthplace: Agha Sadeq Road, Dhaka (paternal house) vs maternal house | Sources disagree |
| Commissioning date: 22 or 23 June 1963 | Minor; Wikipedia says 22 June |
| Role and missions in the 1965 war | Not documented in sources so far |
| Marriage year 1968 | Not confirmed in sources so far |
| Wife's name spelling: Milly / Mili / Milia | Confirm with family or primary sources |
| Battle at Bhairab (Banglapedia) vs camp only (Wikipedia) | Sources differ |
| Taher Quddus family escape | Single, weak source |
| Grounded / Flight Safety Officer vs instructor pilot in 1971 | Sources differ |
| Callsign "Bluebird" vs "Bluebird 166" | Banglapedia says "Bluebird" only |
| Time of the hijack (~11:30 AM) | Not confirmed |
| Crash distance from the border | No confirmed figure |
| What happened to Milly and the daughters after 20 August 1971 | Needs a source |
| Date of the Bir Shreshtho award | Needs a source |
| Reference 4 (PAF Masroor logs) | Probably not publicly accessible. Locate it or remove it, along with claims that depend on it. |
| Reference 3 volume title | Check against the published series |

**Design questions still open**
- Does the alternate-scenario mode in Episode 4 ship at all?
- Light interaction in Episode 3: keep or cut?
- Monetisation: recommended none (premium or free), and no ads in Episodes 4–5 under any model.

---

## 10. Historical Sources & References

1. **National Encyclopedia of Bangladesh (Banglapedia):** *Rahman, Birsrestha Matiur.* Asiatic Society of Bangladesh. <https://en.banglapedia.org/index.php/Rahman%2C_Birsrestha_Matiur>
2. **Ministry of Liberation War Affairs, Government of Bangladesh (2006):** *Official State Repatriation Dossier of Bir Shreshtho Matiur Rahman.* Records detailing the June 2006 repatriation of remains from Karachi to Dhaka. **[verify]**
3. **Official History of the Bangladesh Liberation War (1971):** Volume 10: *Air Operations and Resistance behind Enemy Lines.* Department of Military History, Ministry of Defence. **[verify title]**
4. **PAF Base Masroor Security Logs & Flight Telemetry Archive (August 1971):** Flight records pertaining to T-33 *Bluebird 166*. **[verify: likely not publicly accessible]**
5. **Wikipedia:** *Matiur Rahman (Bir Sreshtho).* <https://en.wikipedia.org/wiki/Matiur_Rahman_(Bir_Sreshtho)>. Use as a pointer to its cited sources, not as a final source.
6. **bdnews24 (2006):** *Long-awaited homecoming of Birsreshtha Matiur.* <https://bdnews24.com/bangladesh/long-awaited-homecoming-of-birsreshtha-matiur-1st-ld>
7. **Dawn (2006):** *Rahman's remains returned to BD.* <https://www.dawn.com/news/amp/198494>
8. **Milly Rahman (ed.), *Bir Shreshtho Matiur Smarak Grantho* (2005).** Memorial volume. Likely the best family-side source; not yet consulted.
