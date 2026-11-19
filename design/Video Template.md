# Video Template Guide

This guide explains how to create and structure videos in Wings of Freedom.

---

## Overview

Videos in the game are defined in **episode files** (`src/game/episodes/`) using the `video()` function. Every video:
- Has a unique ID within its episode
- References a video file in `assets/video/`
- Has fallback text that displays while the video loads or is not available
- Can be skipped by holding the skip button

---

## Basic Structure

### In an Episode File

```typescript
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';

export default defineEpisode({
  id: 'ep2',
  number: 1,
  kind: 'playable',
  title: t('ep2.title'),
  date: t('ep2.date'),
  place: t('ep2.place'),
  unlock: 'always',
  notes: ['Controls and content warnings here'],
  steps: [
    video('intro', {
      src: 'ep2_intro',           // Video filename (without extension)
      fallback: [
        t('ep2.intro.1'),         // Translated fallback text
        t('ep2.intro.2'),
      ],
    }),
    // ... more steps follow
  ],
});
```

### Video Function Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Unique within the episode; becomes a save key; don't rename once released |
| `src` | string | Video filename in `assets/video/` (no `.mp4` extension) |
| `fallback` | string[] | Text shown while loading or if video unavailable |

---

## Bridge Episode Example

The **bridge episode** (`src/game/episodes/bridge.ts`) is a minimal video-only episode that connects Level 1 to Level 2:

```typescript
export default defineEpisode({
  id: 'bridge',
  number: 1.5,                      // Between Level 1 (1) and Level 2 (2)
  kind: 'cinematic',                // Video-only, no gameplay
  title: t('bridge.title'),
  date: t('bridge.date'),
  place: t('bridge.place'),
  unlock: { after: 'ep2' },         // Unlocks after Level 1
  notes: ['A bridge between the wars.'],
  steps: [
    video('bridge-video', {
      src: 'bridge_1965_to_1971',
      fallback: [
        t('bridge.line1'),
        t('bridge.line2'),
        t('bridge.line3'),
      ],
    }),
  ],
});
```

---

## Adding Strings for Videos

All text is in `src/data/strings.xml`. Add a group for your video:

```xml
<group name="myepisode">
  <s id="myepisode.line1" en="English text">বাংলা পাঠ</s>
  <s id="myepisode.line2" en="Another line">আরও একটি লাইন</s>
</group>
```

Then reference in the fallback:

```typescript
fallback: [
  t('myepisode.line1'),
  t('myepisode.line2'),
]
```

---

## Video File Placement

Place MP4 files in `assets/video/` with names matching the `src` parameter:

```
assets/video/
├── bridge_1965_to_1971.mp4
├── ep2_intro.mp4
├── level2_prologue_1.mp4
├── level2_prologue_2.mp4
├── level2_morning.mp4
└── level2_boarding.mp4
```

**File size limit:** Keep videos under 20 MB to load quickly on mobile. See `assets/video/README.md` for encoding guidelines.

---

## Video Interaction

- **Tap to advance** to the next scene or step
- **Hold to skip** the entire video and move to the next step
- Fallback text auto-advances every 3–4 seconds (simulating video playback)

---

## Episode Flow Example

Level 1 → Bridge → Level 2:

```
ep2 (Sabre Skies)
  ├─ video: intro
  ├─ gameplay: sortie-1
  ├─ cutscene: beat-1
  ├─ gameplay: sortie-2
  ├─ cutscene: beat-2
  ├─ gameplay: sortie-3
  └─ archive card

bridge (Bridge: 1965–1971)
  └─ video: bridge-video

level2 (Bluebird)
  ├─ video: prologue-1
  ├─ video: prologue-2
  ├─ gameplay: schedule (stealth)
  ├─ gameplay: dispensary (stealth)
  ├─ video: morning
  ├─ gameplay: intercept (stealth)
  ├─ video: boarding
  └─ archive card
```

---

## Defining a New Video Episode

### Step 1: Add Strings

```xml
<group name="bridge">
  <s id="bridge.title" en="Homecoming">বাড়ি ফেরা</s>
  <s id="bridge.date" en="1965–1971">১৯৬৫–১৯৭১</s>
  <s id="bridge.place" en="Karachi and Dhaka">করাচি এবং ঢাকা</s>
  <s id="bridge.line1" en="Six years passed.">ছয় বছর কেটে গেল।</s>
</group>
```

### Step 2: Create Episode File

```typescript
// src/game/episodes/bridge.ts
import { defineEpisode, video } from '../../core/define';
import { t } from '../../core/i18n';

export default defineEpisode({
  id: 'bridge',
  number: 1.5,
  kind: 'cinematic',
  title: t('bridge.title'),
  date: t('bridge.date'),
  place: t('bridge.place'),
  unlock: { after: 'ep2' },
  notes: ['A bridge between the wars.'],
  steps: [
    video('bridge-video', {
      src: 'bridge_1965_to_1971',
      fallback: [t('bridge.line1'), t('bridge.line2'), t('bridge.line3')],
    }),
  ],
});
```

### Step 3: Place Video File

Save your video to `assets/video/bridge_1965_to_1971.mp4`

### Step 4: Update Episode Unlocks

If this episode comes between others, update their `unlock` rules:

```typescript
// In level2.bluebird.ts
unlock: { after: 'bridge' }
```

---

## Testing

**During development (no video file yet):**
- The game shows the fallback text instead
- Each fallback line displays for ~3 seconds
- Perfect for iterating on the story while video is being made

**With video file:**
- The video plays immediately
- Fallback is ignored (but keep it—it's a safety net)
- Test on mobile to check load time and playback

**Test commands:**
```bash
npm run dev
# Then navigate to the episode in the game
```

Or jump directly to it:
```
?level=bridge/bridge-video
```

---

## Best Practices

1. **Keep fallback text short.** Each line should be 1–2 sentences.
2. **Match video duration to gameplay pace.** Bridge videos are 1–2 min; opening videos are 2–4 min.
3. **Don't rename step IDs after release.** They're save keys; renaming breaks existing saves.
4. **Test on a real phone.** Desktop feels fast; mobile bandwidth reveals problems.
5. **Lock episode unlock rules after release.** Once players have saves, changing `unlock` can break progress.

---

## Related Files

- **Video encoding:** [assets/video/README.md](../assets/video/README.md)
- **Strings reference:** [src/data/strings.xml](../src/data/strings.xml)
- **Episode template:** `src/game/episodes/bridge.ts`
- **Game manager:** `src/core/manager/GameManager.ts`
