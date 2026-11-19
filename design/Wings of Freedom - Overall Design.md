# Wings of Freedom: The Legend of Matiur Rahman
## Overall Game Design

**Game Design Document & Historical Master Specification**

| Project Genre | Historical Subject | Engine Target | Document Revision |
|---|---|---|---|
| Two-Level Narrative / Top-Down Jet Action & Stealth | Flt. Lt. Matiur Rahman (1941–1971) | HTML5 / Phaser 4, mobile portrait first | 4.0 (Two-Level Structure) |

> **How to read this document.** Items marked **[verify]** are facts that published sources disagree on or that we have not yet confirmed. Resolve them before writing final scripts. See §9. For detailed level specifications, see [Level 1 - Sabre Skies.md](Level%201%20-%20Sabre%20Skies.md) and [Level 2 - Bluebird.md](Level%202%20-%20Bluebird.md).

---

## 0. The Game in One Page

The game tells Matiur Rahman's life in **two levels**. Each level opens with a video that carries the story; the video at the start of Level 2 connects it to Level 1. The story that earlier drafts gave to three separate cutscene episodes is now told in these videos.

| Level | Title | Years | Opens with | Play | Target length |
|---|---|---|---|---|---|
| 1 | **Sabre Skies** | 1941–1965 | Video: *Son of Dhaka* (1941–1963) | Top-down jet action, F-86 Sabre, September 1965 | 2–3 min video + 8–12 min play |
| 2 | **Bluebird** | 1968 – 20 August 1971 | Video: the bridge from Level 1 (1968 – May 1971), then *Under watch* (Masroor) | **Night stealth** on foot at PAF Base Masroor, the taxiway intercept, then low-level flight in the T-33 | 4 min video + about 8–10 min play and in-level cinematics |
| — | *Homecoming* | 1971–2006 | Closing video after Level 2 | — | 2–3 min |

**Total:** about 30 minutes. This is a small, focused game. See [Level 1 - Sabre Skies.md](Level%201%20-%20Sabre%20Skies.md) and [Level 2 - Bluebird.md](Level%202%20-%20Bluebird.md) for detailed level plans.

**Length rules**
- Story videos run **2–4 minutes** per level. Scenes run 15–40 seconds; individual shots 3–8 seconds. Dialogue is short; images do most of the work.
- Each level has **8–12 minutes** of play on a first play, including short story beats inside the level.

**Design pillars**

1. **Respect over spectacle.** History fixes the ending. The playable parts build tension and understanding, not a power fantasy.
2. **Story and play share one world.** Videos and cutscenes use the same pixel art, characters and locations as the levels.
3. **Level 1 teaches Level 2.** The low-level flying learned in the Sabre is the skill the player needs on 20 August 1971.
4. **Learn by playing.** Every level ends with an archive card (photo, date, short sourced paragraph).

---

## 1. Detailed Historical Background & Context

### 1.1 Early life (1941–1961)

Matiur Rahman was born in Dhaka, East Bengal, in 1941. Sources give his birth date as **29 October 1941** or **29 November 1941** **[verify]** [1][5]. Banglapedia places his birth at the family house on Agha Sadeq Road, Dhaka [1]. His family's ancestral home was the village of **Ramnagar** in Raipura Upazila, Narsingdi [5].

He studied at **Dhaka Collegiate School** and then moved more than 1,500 km west to the **Pakistan Air Force Public School, Sargodha**, where he completed his schooling [1][5]. Boarding school in West Pakistan, far from his family and language, was common for Bengali boys aiming for a military career, and it shaped him early.

### 1.2 Becoming a fighter pilot (1961–1965)

On **15 August 1961** he joined the PAF Academy (then the PAF College) at **Risalpur** [5]. He was commissioned as a Pilot Officer in **June 1963** (22 June per Wikipedia), from the **36th GD(P) Course** [1][5].

His first posting was to **No. 2 Squadron at PAF Base Mauripur**, Karachi. Mauripur was later renamed **Masroor**, the same base he would take off from on 20 August 1971 [5]. There he completed jet conversion on the **Lockheed T-33** (scoring 75.66%), then fighter conversion on the **North American F-86 Sabre** (81%) [5]. He was then posted to **No. 19 Squadron at Peshawar** as a jet fighter pilot [1][5].

### 1.3 The 1965 war

The Indo-Pakistani War of 1965 was fought largely in September 1965. PAF Sabre squadrons, including No. 19 Squadron at Peshawar, flew air defence, escort and ground-attack sorties. Sources list Matiur Rahman as a veteran of this war [5], but **his specific missions are not documented in the sources we have [verify]**. Level 1 is therefore built from *representative* Sabre sorties of the period. It does not claim specific kills or missions for him.

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

Accounts of the final moments differ: one says the canopy was jettisoned and Matiur's body was found some distance from the wreck [5]. Banglapedia says Matiur's body was found but Minhas's was not [1]. **The game does not depict these details**.

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

| Age / look | Where |
|---|---|
| Boy in Dhaka / Ramnagar (~8–12) | Level 1 opening video |
| Cadet at Sargodha / Risalpur (~16–21) | Level 1 opening video |
| Young fighter pilot, F-86 era (~24) | Level 1 |
| Husband, instructor, camp organiser (~27–29) | Level 2 opening video |
| Flight Lieutenant at Masroor, 20 Aug 1971 (~29) | Level 2 |

#### Milly Rahman — Supporting character (wife)
Appears in Level 2's opening video (marriage, family life, 1971), the family evening in Level 2, and the closing video (as an older woman at the 2006 funeral). She is a real person, so she is shown with dignity: through gesture, letters and silence. **Do not invent dialogue in which she discusses the hijack decision.** Her name's spelling (Milly / Mili / Milia) needs confirming **[verify]**, ideally with the family.

#### Pilot Officer Rashid Minhas — Opposing character (Level 2)
A 20-year-old trainee on his second solo flight, doing his duty. He is a national hero in Pakistan (Nishan-e-Haider). **He is an opponent, not a villain.** No sneering lines, no "enemy" styling, no reward sounds when he loses control. The cockpit struggle should read as a tragedy for both men.

### 2.2 Real people in minor, mostly non-speaking roles

| Person | Where | Notes |
|---|---|---|
| Daughters Mahin and Tuhin | Level 2 video, closing video | Infants in Level 2's video, adults in the closing video. Non-speaking. |
| His parents | Level 1 video | Names to confirm **[verify]**. Unnamed until then. |

### 2.3 NPCs (fictional composites)

These characters are invented to carry scenes. The credits must label them as composites. Names below are placeholders.

| NPC | Where | Role |
|---|---|---|
| Hasan, school friend at Sargodha | L1 video | Another Bengali boy far from home; shows the homesickness and friendship. |
| Flight instructor at Risalpur | L1 video | Strict, fair; gives Matiur his first solo. |
| Wingman, "Sherdil Two" | Level 1 | Voice on the radio in every sortie; teaches formation and calls threats. |
| Squadron commander | Level 1 | Mission briefings. |
| Crew chief (ground crew) | Level 1 | Prepares the Sabre; gives a human moment before and after each sortie. |
| **Bhairab camp trainees** | L2 video | The heart of Level 2's opening video: **Rafiq** (college student, eager, untrained), **Karim** (boatman, knows the rivers), **Jabbar** (former East Pakistan Rifles soldier, knows rifles), **Nurul** (teenager, too young to fight, insists on helping). |
| Village elder and a mother who feeds the camp | L2 video | Show the community behind the camp. |
| Masroor guards and officers | Level 2 | Night patrols with torches and vision cones. Each guard has a name and small habits. |
| Control tower voice | Level 2 | Heard on the radio during the flight. |
| Honour guard, crowd, journalist | Closing video | 2006 funeral. |

---

## 3. Locations & Environments

| Location | Where | Environment | Key assets |
|---|---|---|---|
| Dhaka, Agha Sadeq Road (1940s–60s) | L1 video, L2 video | Old Dhaka lanes, family house, rickshaws | House exterior/interior, street tiles |
| Ramnagar village, Narsingdi | L1 video, L2 video | River, boats, paddy, bamboo, village homes | River and village tileset |
| PAF Public School, Sargodha | L1 video | Dry plains, school buildings | Small set |
| PAF Academy, Risalpur | L1 video | Parade ground, training aircraft | Small set |
| **PAF Base Mauripur / Masroor, Karachi** | L1 video, L2 video, **Level 2** | Desert airfield, hangars, officers' quarters (Residential East), hospital, flight-line office, taxiway | **Built once, used three times** (1963 look, 1971 day look, 1971 **night** look) |
| PAF Base Peshawar + Punjab border skies | Level 1 | Airfield, mountains to the north, plains, rivers, villages from above | Scrolling flight terrain set |
| Bhairab training camp | L2 video | Riverbank, hidden clearing, river crossings | Camp tileset |
| Flight corridor to Thatta | Level 2 | Low desert, dunes, salt flats, power lines | Scrolling flight terrain set (shares tiles with Level 1) |
| Dhaka airport, 2006 | Closing video | Tarmac, honour guard, coffin | Modern-era set |
| Martyred Intellectuals' Graveyard, Mirpur | Closing video | Graves, trees, crowd | Final set |

---

## 4. Aircraft

| Aircraft | Role in game | Where |
|---|---|---|
| North American **F-86F Sabre** | Player aircraft | L1 video (seen), Level 1 (flown) |
| Lockheed **T-33A Shooting Star** | First jet he trained on; *Bluebird* | L1 video (seen), Level 2 (taxiing, then flown) |
| Period enemy types (Hunter, Gnat, Mystère, Vampire, Canberra) | Level 1 opponents | Level 1 |
| PAF aircraft over Bhairab | 14 April 1971 bombing (seen from the ground) | L2 video |

Reference photos are in [assets/reference/](../assets/reference/) (see [assets/README.md](../assets/README.md)).

---

## 5. Art Direction & Visual Consistency Plan

### 5.1 The problem

The level videos are story-heavy; the levels are top-down gameplay. If the videos are made with different tools or styles (HD footage, painted illustrations, 3D), they will look like a different game and the switches between story and play will feel jarring.

### 5.2 The core decision: one world, built once

**All story scenes are made from the same pixel-art assets as the gameplay.** The level videos (Level 2 opens with one) are allowed, but they are rendered from the game's own art, at its pixel scale, so they look like the game. Short beats inside a level stay in-engine (Phaser 4) and are data.

This means:
- The same Matiur sprite walks through the Bhairab camp in Level 2's video and the Masroor streets in Level 2.
- The same Masroor tileset is the base in 1963 (Level 1 video), 1971 (Level 2 video), at night (Level 2 stealth) and on 20 August.
- The same F-86 and T-33 sprites appear in cutscenes and gameplay.
- In-level beats are smaller and easier to edit (they are data, not video files).

### 5.3 Fixed style rules (the style bible)

| Rule | Value |
|---|---|
| Base resolution | 360 × 640 logical, portrait, integer-scaled |
| Pixel scale | **One art pixel is the same size everywhere.** Never mix high-res and low-res art, and never smooth-scale sprites. |
| Tiles | 16 × 16 px |
| Camera for gameplay | Top-down 3/4 |
| Outlines | 1 px dark outline on characters and vehicles; none on terrain |
| Light direction | Always top-left |
| Character proportions | Gameplay sprites ~24 px tall; close-up portraits drawn at the same pixel scale (not upscaled) |
| Palette | One **master palette** (~48 colours) for the whole game; each level uses a subset |
| Animation | Characters 8–10 fps, aircraft rotation pre-drawn (16 directions), no smooth rotation |
| Text and UI | One pixel font with Bangla and English support; one dialogue-box frame used in every level |

### 5.4 Three shot types for cutscenes

| Shot | What it is | Example |
|---|---|---|
| **Wide** | The gameplay view itself: top-down 3/4 tiles and sprites, with a scripted camera | Matiur walks across the Bhairab camp |
| **Medium** | A side-on "stage" scene drawn at the same pixel scale, with parallax layers | The wedding; the cockpit |
| **Close-up** | A character portrait panel (head and shoulders) with small animations: blinking, breathing, wind, rain, cigarette smoke | Milly at the window; Minhas's face in the cockpit |

Movement comes from camera pans, parallax and small looping animations, like a motion comic. This is much cheaper than full animation and looks consistent.

### 5.5 Colour by era (all from the master palette)

| Part | Era | Grade | Feeling |
|---|---|---|---|
| Level 1 video | 1941–1963 | Warm sepia, soft yellows | Memory, childhood |
| Level 1 | 1965 | Bright sky blue, ochre plains, aluminium | Confidence, speed |
| Level 2 video | 1968 → 1971 | Starts warm (wedding reds, greens), turns grey-green monsoon, then slate grey at Masroor | Joy turning to dread |
| Level 2, night stealth | Nights before 20 August 1971 | Deep blue-grey base, warm torch light as the only bright colour | Secrecy, risk |
| Level 2, 20 August | 20 August 1971 | Harsh white sun, dust tan, warning red | Heat, pressure, finality |
| Closing video | 1971 → 2006 | White, then cool muted blues and greens, flag green and red as the only strong colours | Mourning, dignity, homecoming |

### 5.6 Shared assets across levels

| Asset | L1 video | Level 1 | L2 video | Level 2 | Closing |
|---|:-:|:-:|:-:|:-:|:-:|
| Matiur sprites and portraits | ● | ● | ● | ● | |
| Milly sprites and portraits | | | ● | | ● |
| F-86 Sabre sprite | ● | ● | | | |
| T-33 sprite | ● | | ● | ● | |
| Masroor / Mauripur tileset | ● | | ● | ● | ● (2006 handover) |
| Ramnagar / river tileset | ● | | ● | | |
| Flight terrain tiles | | ● | | ● | |
| Dialogue box, title cards, archive cards | ● | ● | ● | ● | ● |

### 5.7 Seamless transitions between story and play

- **Cutscene → gameplay:** the cutscene ends on a wide shot that is exactly the gameplay framing. The HUD slides in and control is handed to the player with no screen change.
- **Gameplay → cutscene:** the HUD slides out and the camera moves into a medium or close-up shot.
- **Level bookends:** every level opens with the same title-card template (level number, title, date, place) and its video, and closes with an archive card. Level 1's last frame is the first frame of Level 2's video.
- **Audio as glue:** one main musical theme (flute or solo voice) recurs in every level and video, arranged differently each time.

### 5.8 Real photographs

Real archive photos appear **only inside archive cards**, in a fixed museum-style frame, never in scenes. This keeps the game world consistent and makes the history feel distinct from the dramatisation.

**The one exception** is the final shot of the closing video: the pixel-art grave at Mirpur dissolves into a real photograph of it. Because it is the only break, it carries weight.

### 5.9 Production pipeline

1. **Style test first.** Before full production, make one Level 1 gameplay screen and one Level 2 video close-up panel. Put them side by side on a phone. If they don't look like the same game, fix the bible before making more art.
2. **Palette file in the repo** (for example `assets/palette/master.hex`), plus a small script that flags any image using off-palette colours.
3. **Model sheets** for Matiur (all five ages), Milly, Minhas and the four trainees before any scene is drawn.
4. **One art lead** does a final pass on every asset, including outsourced or AI-assisted art, which must be redrawn to the palette and pixel grid.
5. **Cutscenes as data.** A simple cutscene player reads JSON, so writers can edit scenes without touching code.

### 5.10 Avoid

- Video in a different style from the game (HD footage, painted, 3D). Level videos are rendered from the game's own pixel art.
- Mixed pixel sizes or smooth-scaled sprites.
- Anachronisms (CCTV, solar panels, satellite dishes, modern vehicles before 2006).
- Different UI frames or fonts in different levels.

---

## 6. Tone & Sensitivity Rules

- **Rashid Minhas is an opponent, not a villain**.
- **No gamified killing.** No kill counters anywhere. In Level 1, enemies break off when hit. Getting caught in Level 2's stealth means being questioned, never violence. Bhairab camp combat is shown through outcomes, not on-screen shooting.
- **The genocide** is shown through radio, sound and aftermath, never as playable violence.
- **The final moments of 20 August** are not depicted: cut to white. Disputed details (canopy, bodies) are never shown.
- **The family** are real people: dignified depiction, no invented dialogue about the hijack decision. Seek family consent before release if possible.
- **Fictional composites** are labelled in the credits.
- Ship with **Bangla and English** from day one.

---

## 7. Production Order (suggested)

1. **Style test** and master palette.
2. **Level 1 vertical slice:** one sortie, full controls. This builds the flight engine. *(Done.)*
3. **Level 2 stealth system:** vision cones, detection, night, then the three on-foot parts on one Masroor walk map.
4. **Level 2 Radar Horizon** on the same flight engine, in the T-33.
5. **Level videos:** Level 2's opening video first (it joins the two levels), then Level 1's, then the closing video.
6. Bangla localisation, accessibility, external historical review.

---

## 8. Fact-Check & Open Questions

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
- Does the alternate-scenario mode in Level 2 ship at all?
- Monetisation: recommended none (premium or free), and no ads in Level 2 or the closing video under any model.

---

## 9. Historical Sources & References

1. **National Encyclopedia of Bangladesh (Banglapedia):** *Rahman, Birsrestha Matiur.* Asiatic Society of Bangladesh. <https://en.banglapedia.org/index.php/Rahman%2C_Birsrestha_Matiur>
2. **Ministry of Liberation War Affairs, Government of Bangladesh (2006):** *Official State Repatriation Dossier of Bir Shreshtho Matiur Rahman.* Records detailing the June 2006 repatriation of remains from Karachi to Dhaka. **[verify]**
3. **Official History of the Bangladesh Liberation War (1971):** Volume 10: *Air Operations and Resistance behind Enemy Lines.* Department of Military History, Ministry of Defence. **[verify title]**
4. **PAF Base Masroor Security Logs & Flight Telemetry Archive (August 1971):** Flight records pertaining to T-33 *Bluebird 166*. **[verify: likely not publicly accessible]**
5. **Wikipedia:** *Matiur Rahman (Bir Sreshtho).* <https://en.wikipedia.org/wiki/Matiur_Rahman_(Bir_Sreshtho)>. Use as a pointer to its cited sources, not as a final source.
6. **bdnews24 (2006):** *Long-awaited homecoming of Birsreshtha Matiur.* <https://bdnews24.com/bangladesh/long-awaited-homecoming-of-birsreshtha-matiur-1st-ld>
7. **Dawn (2006):** *Rahman's remains returned to BD.* <https://www.dawn.com/news/amp/198494>
8. **Milly Rahman (ed.), *Bir Shreshtho Matiur Smarak Grantho* (2005).** Memorial volume. Likely the best family-side source; not yet consulted.
