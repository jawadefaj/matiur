# Wings of Freedom: The Legend of Matiur Rahman

**Comprehensive Game Design Document & Historical Master Specification**

| Project Genre | Historical Subject | Engine Target | Document Revision |
|---|---|---|---|
| 2D Tactical Narrative / Jet Sim | Flt. Lt. Matiur Rahman (1941–1971) | HTML5 / Phaser Browser Engine | 2.4 (Historical Archive) |

---

## 1. Detailed Historical Background & Context

Flight Lieutenant Matiur Rahman (Service No. 4367) was born on October 29, 1941, in Dhaka, East Pakistan **[1]**. After completing his education at PAF Public School Sargodha, he was commissioned into the Pakistan Air Force (PAF) in 1963 as a fighter pilot **[2]**. Rahman served with distinction during the 1965 Indo-Pakistani War flying F-86 Sabre jets, establishing himself as an exceptional aviator and instructor.

When the Pakistan Armed Forces launched *Operation Searchlight* on March 25, 1971, initiating genocide across East Pakistan, Rahman was on leave in his ancestral village of Ramanagar in Narsingdi **[3]**. Profoundly moved by the atrocities, Rahman organized local youth, established a clandestine training camp, and trained Mukti Bahini freedom fighters in guerilla tactics and weapons handling **[1]**. Recalled to West Pakistan in May 1971, he was grounded due to his Bengali heritage—a common security measure imposed on Bengali personnel—and reassigned as a Flight Safety Officer at PAF Base Masroor (Karachi) **[4]**.

Operating under constant intelligence surveillance, Rahman devised a daring plot: hijack a combat aircraft and fly it to liberated territory or India to support the Mukti Bahini air wing **[3]**. On August 20, 1971, at 11:30 AM, Rahman intercepted a Lockheed T-33 Shooting Star jet trainer (callsign *Bluebird 166*) piloted by trainee Officer Rashid Minhas. Boarding under the pretense of a safety check, Rahman took control of the aircraft and set a course for the Indian border at ultra-low altitude to evade radar **[4]**. A struggle ensued inside the cockpit as Minhas attempted to override controls. The aircraft crashed 35 kilometers short of the border near Thatta, killing both pilots **[2]**. For his supreme sacrifice, Matiur Rahman was posthumously awarded the **Bir Shreshtho**, Bangladesh's highest military honor **[1]**.

---

## 2. Character Dossier & Personal Profiles

### Flight Lt. Matiur Rahman
**Playable Protagonist | PAF Flight Safety Officer**

- **Background:** Veteran F-86 Sabre pilot with master-level flight credentials. Motivated by the 1971 liberation movement.
- **Game Mechanics:** High stealth awareness, flight stability bonus, capable of overriding aircraft controls during Act V QTEs.

### Milia Rahman
**Narrative Anchor | Wife & Confidante**

- **Background:** Lived with Matiur at PAF Masroor alongside their two infant daughters during strict military surveillance.
- **Game Mechanics:** Represents the *Family Danger Index* in Act III. Her covert evacuation choices alter operational alert levels.

### Pilot Officer Rashid Minhas
**Act V Cockpit Antagonist | PAF Trainee Pilot**

- **Background:** 20-year-old trainee pilot executing his solo flight routine aboard T-33 trainer *Bluebird 166* on August 20, 1971.
- **Game Mechanics:** AI antagonist in Act V. Constantly fights for flight stick control, attempts radio alerts, and forces control lockups.

### PAF Airfield Intelligence
**Base Antagonists | Masroor Security Detachment**

- **Background:** Military guards, counter-intelligence officers, and radar operators monitoring Bengali personnel on base.
- **Game Mechanics:** Dynamic Field-of-View (FOV) patrol cones in Act III and IV. Triggers base-wide alarm if suspicious actions occur.

---

## 3. Operational Theater Maps & Level Environments

### Map 1: PAF Station Sargodha (1961–1965)

- **Environment:** Open desert runway, flight line, aerial gunnery range.
- **Objective Zone:** Ring-gate maneuver course and air-to-air dogfight grid. Teaches high-speed throttle management and roll mechanics.

### Map 2: Ramanagar Camp, Narsingdi (March 1971)

- **Environment:** Dense marshlands, river channels, hidden training grounds.
- **Objective Zone:** Police armory infiltration path and guerilla ambush layout. Focuses on supply management and line-of-sight cover.

### Map 3: PAF Base Masroor, Karachi (May–Aug 1971)

- **Environment:** Restricted airfield, officer quarters, tarmac taxiway "Delta".
- **Objective Zone:** Flight Safety Office, radar control room, and T-33 staging area. Features security patrols and camera FOV cones.

### Map 4: Flight Corridor to Thatta (Aug 20, 1971)

- **Environment:** Ultra-low altitude desert terrain, salt flats, Indian border.
- **Objective Zone:** 35-mile flight path staying under 100ft radar altitude while navigating terrain obstacles and cockpit resistance.

---

## 4. 5-Act Interactive Storytelling & Gameplay Systems

| Act | Historical Stage | Core Gameplay Mechanics | Interactive Story Branch |
|---|---|---|---|
| **Act I** | Cadet of Sargodha (1961–1965) | **2D Flight Simulator:** Control jet pitch, throttle, and altitude through aerial ring gates; manage G-force meters. | Dialog choices establish Matiur's military reputation and bond with fellow aviators. |
| **Act II** | Seeds of Resistance (March 1971) | **Resource Management & Tactical Setup:** Distribute weapons, set ambush points, and evade patrol sweeps. | **Branch:** Raid police armory (High Risk/High Ammo) vs. Secure covert caches (Low Risk/Low Ammo). |
| **Act III** | Shadows Over Masroor (May–Aug 1971) | **Top-Down Social Stealth:** Infiltrate administrative offices, study flight logs, avoid guard FOV cones. | **Branch:** Delay hijack to secure family escape vs. Execute immediate hijack (Affects Family Safety Meter). |
| **Act IV** | Operation Bluebird (Aug 20, 11:30 AM) | **Tarmac Infiltration Timing:** Time movement along taxiway "Delta" to intercept T-33 *Bluebird 166* during pre-flight. | Single-attempt execution sequence. Timing errors trigger base security response. |
| **Act V** | Radar Horizon (Aug 20, 11:45 AM) | **Dual-Control Flight & Cockpit QTE:** Maintain flight below 100ft radar ceiling while mashing inputs in a tug-of-war meter. | Unlocks historical ending on first clear; alternate scenario mode unlocked post-game. |

---

## 5. Historical Sources & References

1. **National Encyclopedia of Bangladesh (Banglapedia):** *Rahman, Flight Lieutenant Matiur.* Asiatic Society of Bangladesh. Historical entry on military service, 1971 guerilla training in Narsingdi, and Bir Shreshtho citation.
2. **Ministry of Liberation War Affairs, Government of Bangladesh (2006):** *Official State Repatriation Dossier of Bir Shreshtho Matiur Rahman.* Records detailing the June 2006 repatriation of remains from Karachi to Dhaka.
3. **Official History of the Bangladesh Liberation War (1971):** Volume 10: *Air Operations and Resistance behind Enemy Lines.* Department of Military History, Ministry of Defence.
4. **PAF Base Masroor Security Logs & Flight Telemetry Archive (August 1971):** Flight records pertaining to T-33 Shooting Star *Bluebird 166* departure, radar tracking data, and site recovery reports near Thatta.
