# Wings of Freedom: The Legend of Matiur Rahman

A mobile-first, pixel-art game about Flt Lt Matiur Rahman, Bir Shreshtho. Design docs are in [design/](design/):
the [Game Design Document](<design/Game Design Document - Wings of Freedom.md>) (rev 3.1, the source of truth) and
the [build spec](design/init_design.md).

**Current state:** Episode 2 *Sabre Skies* mechanics build. It has three playable sorties with placeholder art and no sound.

| Sortie | What it covers |
|---|---|
| 1. Scramble | Take-off, steering, throttle, joining formation, a short patrol |
| 2. Intercept | Gunsight, G, turning back bombers, protecting Bulldog flight |
| 3. Low and Home | Under-100-ft flying, radar, fuel, landing |

## Run it

Needs Node 20+.

```bash
npm install
npm run dev
```

Open the `Network:` address it prints (for example `http://192.168.0.196:5173`) on your phone. The phone must be on the same Wi-Fi.
If the phone can't connect, Windows Firewall is probably blocking Node on a *Public* network. Set the Wi-Fi network to *Private*, or allow Node.js through the firewall.

`?sortie=1`, `?sortie=2` or `?sortie=3` on the URL jumps straight into a sortie.

```bash
npm test          # unit tests + bot pilots that fly every sortie
npm run build     # static build in dist/ (Phaser loads from the jsDelivr CDN)
```

## Controls

| Phone | Desktop | Does |
|---|---|---|
| Drag anywhere | Arrow keys | Steer: the jet turns toward the drag |
| THROTTLE slider (right edge) | W / S | Speed and fuel burn |
| PULL | Space | Tighter turn and more G. In sortie 3 it climbs. |
| (automatic) | | Guns fire when the sight is on a target. Set GUNS: HOLD for a FIRE button. |
| II | P / Esc | Pause |

## Tuning

Every gameplay number is in [src/data/tuning.json](src/data/tuning.json): speeds, G limits, fuel burn, damage, guns, AI and the low-level band.
