# Cutscene scripts

In-engine cutscenes as JSON, played by `cutscene(...)` steps in the episode files
(`src/game/episodes/`). A script is found by its file name:
`ep2_beat_1.json` plays for `cutscene('beat-1', { script: 'ep2_beat_1' })`.
There's no list to edit. Until the file exists, the step shows its `placeholder` lines.

The format is the one in the GDD, §6.9:

```json
{
  "id": "ep2_beat_1",
  "shots": [
    { "type": "wide", "map": "flight_line", "camera": { "from": [120, 300], "to": [180, 200], "ms": 4000 } },
    { "type": "line", "speaker": "Crew Chief", "text": "Fuelled and rearmed, sir." },
    { "type": "line", "speaker": "matiur", "text_key": "ep2_b1_l2" }
  ]
}
```

For now only `line` shots are shown, in a dialogue box: tap for the next line,
hold to skip. A `text_key` is shown as it is until a text table exists. The
other shot types (`wide`, `closeup`, `sfx` and so on) are skipped. The full
cutscene player will be a mechanic in `src/mechanics/cutscene/` and will replace
the placeholder player in `src/core/scenes/CutsceneScene.ts`. No episode file
needs to change for that.

Try one with `npm run dev` and `?play=cutscene&script=ep2_beat_1`.
