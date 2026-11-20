# Wings of Freedom — Final Gameplay Design

The whole game is **2D top-down**. There are two playable mechanics: **stealth** and **flight**. Everything else is told through cinematics.

## Game flow

| # | Chapter | Mode |
|---|---|---|
| 1 | Childhood in Dhaka | Cinematic |
| 2 | Sargodha: stealing maltas | Stealth (tutorial) |
| 3 | Sargodha: the friend is freed | Cinematic |
| 4 | Risalpur: first flight | Flight (tutorial) |
| 5 | 1967: dogfight, crash, parachute | Flight |
| 6 | 1971: Dhaka and Ramnagar | Cinematic |
| 7 | Masroor base: flight schedule | Stealth |
| 8 | Masroor base: runway layout | Stealth |
| 9 | Air Force hospital: chloroform | Stealth |
| 10 | 20 August: stopping the T-33 | Short interaction, then cinematic |
| 11 | 20 August: the last flight | Flight |
| 12 | Family, liberation, Bir Sreshtho | Cinematic |

---

## Stealth (2D top-down)

### Controls
- **Virtual joystick** (left) to move.
- **Crouch** button: slower and silent.
- **Action** button: **pick up** and **read document** only.

### Systems
- **Auto-hide:** walking into cover (bush, crate, parked jeep, hangar shadow, cupboard) hides Matiur automatically. He fades or darkens on screen.
- **Vision cones:** white, then yellow, then red. Red means caught; the level restarts from a checkpoint.
- **Noise:** running shows a ring that alerts guards inside it. Crouching makes no ring.
- **No killing, no disguise.**

### Art notes
- Vision cones are transparent triangles drawn on the ground.
- Building and hangar shadows are dark ground patches and count as cover.
- Cupboards and crates hide him fully; shadows hide him only while crouching.

### Levels
1. **Sargodha orchard (tutorial).** Matiur and his friends sneak in at night and steal maltas while avoiding the watchmen. Teaches joystick, crouch, auto-hide, cones and noise. Ends with a scripted moment where one friend is spotted and caught. The rescue plays as a cinematic.
2. **Masroor: flight schedule.** Reach the operations office and read the schedule to learn when the student pilot flies solo.
3. **Masroor: runway layout.** Reach the map or control room and read the runway and taxiway layout.
4. **Air Force hospital: chloroform.** Get into the pharmacy, pick up the chloroform and leave. Nurses and orderlies walk set routes.

### 20 August: stopping the T-33
- No stealth. A short drive to the taxiway, then one tap at the right moment to step out and signal the plane to stop.
- The conversation, the chloroform and Matiur climbing in play as a cinematic.

---

## Flight (2D top-down)

### Controls
- **Throttle slider** (left), with a lock.
- **Climb / Dive** buttons (left, above the throttle).
- **Touch drag** (right) to turn left or right.
- **No action button.** Engine start and gear are automatic.

### Showing height in top-down view
- The plane's **shadow** moves away from the plane and shrinks as it climbs.
- The **plane sprite** grows slightly when high.
- An **altitude bar** on the HUD.
- **Clouds** pass under the plane at high altitude.

### Flight rules
- **Too slow:** the plane shakes and loses height on its own (stall).
- **Too fast:** turns become wide and sluggish.
- **Too low:** terrain warning sounds and the shadow merges with the plane.
- **HUD:** speed, altitude bar, warning light. Colours, not numbers.

### Eject
- When the engine fails, an **EJECT** button appears. The game keeps running at normal speed.
- If the player doesn't tap it within a few seconds, Matiur ejects automatically.

---

## Flight levels

### Risalpur: first flight (tutorial)
The instructor guides each step over the radio:
1. Throttle up and take off.
2. Climb and watch the shadow move away.
3. Turn through rings.
4. Stall on purpose, then add throttle to recover.
5. Fly low over the field.
6. Land by following runway lights.

### 1967: dogfight and crash
1. **Dogfight.** Chase the friend's plane. Terrain changes from fields to hills to desert; the opponent turns, dives and climbs harder as the level goes on. Optional lock-on circle, to be tested in prototype.
2. **Engine failure.** Scripted at a fixed point, not caused by the player. Smoke, warnings, throttle stops working. Player glides away from a village toward open desert.
3. **Eject.** Button appears; automatic eject if not pressed.
4. **Parachute.** Short drift with the wind toward a clear landing spot. Village cinematic follows.

### 20 August: the last flight
1. **Takeoff** right after the cinematic.
2. **Low flight to the border.** Stay low or a radar bar fills. Hills and dunes get harder. Short on-screen lines show the radio, Minhas waking and Matiur's thoughts.
3. **The struggle.** Steering pulls to one side and height drops on its own. The player fights to keep the plane level while a distance-to-border bar fills. The crash is fixed; fade to cinematic.

---

## Making the forced crashes work
- **Hint the outcome early** through the chapter title or an opening line, so it feels like history, not failure.
- **Never blame the player.** Normal crashes restart the level; these crashes play out as story.
- **Show the effort at the end,** e.g. how far he flew toward the border.
- **Shift music and controls** at the turning point so players feel the change from winning to holding on.

## Open decisions
- Lock-on in the dogfight: keep or drop after prototyping.
- Minhas's on-screen lines: what and how much.
