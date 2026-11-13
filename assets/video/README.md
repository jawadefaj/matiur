# Videos

Video files for `video(...)` steps in the episode files (`src/game/episodes/`).
A file is found by its name: `ep2_intro.mp4` plays for `video('intro', { src: 'ep2_intro' })`.
There's no list to edit. Until the file exists, the step shows its `fallback` text.

## Rules

- **Name:** `<episode>_<what>.mp4`, for example `ep2_intro.mp4`, `ep5_outro.mp4`.
- **Size:** keep each clip **20 MB or less**. GitHub warns at 50 MB and refuses files over 100 MB, and phones download every clip they play.
- **Format:** MP4, H.264 (Main profile, level 4.0 or lower), `yuv420p`, AAC audio, with `+faststart` so playback starts before the download ends. This plays on iPhone Safari and Android Chrome.
- **Shape:** portrait 720 × 1280 fills the screen. Other shapes are letterboxed (`fit: 'contain'`) or cropped (`fit: 'cover'`).
- **Pixel art:** scale it up with nearest-neighbour **before** encoding, so the pixels stay sharp.
- **Speech:** the game is in Bangla and English (build spec §11). Prefer clips without spoken lines, or burn in subtitles.

## Encoding recipe (ffmpeg)

```bash
ffmpeg -i source.mov \
  -vf "scale=720:1280:flags=neighbor,format=yuv420p" \
  -c:v libx264 -profile:v main -level 4.0 -crf 23 -preset slow \
  -c:a aac -b:a 128k -movflags +faststart \
  ep2_intro.mp4
```

Raise `-crf` (to 26–28) if the file is over 20 MB.

## Trying a video

`npm run dev`, then open `?play=video&src=ep2_intro` to play just that clip.

## Note on the design documents

The GDD (§6.2, §6.10) plans cutscenes as in-engine scenes, not video. The game
manager supports both, chosen per step: in-engine `cutscene(...)` steps for
beats next to gameplay, and `video(...)` steps where a film fits better (an
intro or an outro, for example).
