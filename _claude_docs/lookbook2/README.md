# Look Book 2 — the model world, relit

Published (private to Beck) at https://claude.ai/artifact/8aQQzX3EuZ7x4q5xsTyEjx. This folder is the source: the page,
the relight engine (relight.js), the people (chibi.js + sprites/), the dioramas (dioramas/*.py, village/ for the richer
house kit, postcard/ for the side view), and the tools that render and pack them (tools/). The rendered passes
(assets/, ~30 MB) and Blender's raw output aren't kept here; re-render with tools/render.sh (needs bpy 5.2.2) and pack
with tools/pack.py. To view locally after rendering: `python3 -m http.server 8790` here and open index.html.

Beck liked: the light (smooth transitions through the day), the Soft light and HD-2D finishes, shadows moving with the
sun, weather, water (Cast n Chill), the postcard view. Didn't like: hand-drawn people (too realistic), hand-drawn
pieces next to each other (out of place), Stardew's front-on angle. He prefers the game's 3D "little model world"
(cohesive, natural, the 45° angle) and wants it tied together and nicer: more detail, slightly higher res, a bit more
realistic, keeping the charm.

So every scene here is the game's REAL Blender scene (tools/bridge-art/scenes/*.py, unchanged), rendered as passes
and relit live in the page:
1. `tools/render.sh <scene.py> renders/<name> --ts 32,48 --crop <crop> c0 r0 c1 r1 [--crop ...] --samples 24`
   (lookkit.py; at most 3 Blender processes at once; never touches the repo). Crops are 15 × 8.4375 tiles (16:9).
   Options: `--mirror name,name` (parts that act as mirrors in the reflection pass, e.g. a wet street), `--sun 3.0`.
   A scene's build alone can take 5–12 minutes; render all your crops in ONE run.
2. `python3 tools/pack.py renders/<name>/<crop>-<ts> assets/<scene>-<crop>-<ts>` → the page's assets.
3. A scene def: `LB.add(LB.relit.scene({... dirs: {32: 'assets/x-32', 48: 'assets/x-48'}, live(ctx, S, P, G), emissive,
   lights(S, G), after, water, backdrop}))` — see relight.js and scenes/verdance.js.
4. `NODE_PATH=$(npm root -g) node shoot.js shots <id> 18.2,summer,clear,soft,model 22,winter,snow,hd2d,toyhd ...`
   Versions: model (32 px, smooth light) · toy (32 px, toy bands + outlines) · modelhd (48 px smooth) · toyhd (48 px toy).
People: `LB.chibi(ctx, x, y, name, {dir, walk, t, variant: LB.state.chibi || 'round', scale: S.scale, sun: S.L.sun})`
(chibi.js; names: pilot farmer baker fisher elf skier cyber sailor dockhand). Positions in the scene are in native px
of the current version: multiply 32-px positions by S.scale.
Don't edit kit.js, relight.js, app.js, stage.css, dev.html or another worker's files; put overrides in your scene file
and report what the engine should change.

## After the restart (read this)
The machine restarted once; anything in /tmp/.../scratchpad survived, running processes didn't. lookkit.py is
resumable (a crop whose render.json exists is skipped), so re-running the same command only renders what's missing.
Run long jobs with nohup, and any Blender job that isn't lookkit through `tools/slot.sh <command>` so at most three
run at once. Already queued by the lead (don't start them again; wait for them with a background
`while pgrep -f "lookkit.py.*<scene>.py" >/dev/null; do sleep 20; done`): verdance (yard, pond), lumar_harbor (pier,
lighthouse), sylvara (door). Check `ps -o etime,args -C python` before starting a render.
