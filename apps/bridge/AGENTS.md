# Bridge — agent instructions (Codex, Claude Code, etc.)

> **Scope: this file applies to `apps/bridge/` only.** Do not apply these art-direction or prompt rules to any other Becknology app (aether-seas, cipher-room, hub, etc.).

If you are an agent making art or editing visuals for the bridge game, read **`apps/bridge/CLAUDE.md`** first — the source of truth for its look (*North star*, *Live light*, *Making a new place*, the detail standard, palettes, engine integration).

The look (since October 2026, Beck's pick from Look Book 2): **our own little 3D model world, finished like toys, in soft light.** Places, props and people are the game's own Blender models (`tools/bridge-art/`: `scenekit.py`, the `assets_*.py` kits, `characters.py`) rendered at 32 px a tile through the 45° camera, then finished by `scene_post.py` in the toy style — flat light bands, cool shadows and warm lights, strong lines between things — and relit live outdoors by `js/litscene.js` (the sun crossing the sky, seasons, weather, water that mirrors its banks). People have simple drawn faces and a Stardew-style face portrait when you talk to them.

## Quick rules

- **Build new art in Blender in the game's kit** — scenes in `tools/bridge-art/scenes/`, the richer house kit `assets_house.py`, the reference dioramas in `tools/bridge-art/dioramas/` as the bar. No new AI-painted PNGs: `PNG-PROMPTS.md` is legacy, kept only for touching up the PNGs still in the game.
- **One camera.** Everything through scenekit's orthographic 45° camera, on the 32 px-per-tile grid.
- **Give places shape and life:** shaped land, layered vegetation, small life at the human scale; ponds sunk into the land, never a circle in a field.
- **Anything with a day gets live light** (`cycle=` in `k.render`); check it at dawn, noon, golden hour and night and in each season (`BridgeLit._force`).
- **Name parts so the finish reads them:** the ground (`floor_*`, `path`, `grass`, `cobbles`…) gets no lines inside it, roofs (`roof_*`) only at their edges.
- **Code-drawn things** (creatures, crops, effects) sit with the toy finish: flat tones, a dark outline, whole pixels.
- **Don't paint detail inside windows / lantern flames** — those are animation hooks; leave a flat shape.
- **Lighting is per world** — a `lighting` block in the world JSON (see `js/lighting.js`) for worlds that aren't scenes.

## Working on the bridge

The bridge app lives at `apps/bridge/` (with a convenience symlink at the repo root: `bridge/ -> apps/bridge/`). Routing is configured in the repo's `vercel.json`. See the repo-root `CLAUDE.md` for monorepo conventions.

Becknology works directly on `main` — no feature branches.
