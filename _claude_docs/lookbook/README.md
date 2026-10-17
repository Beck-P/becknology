# Becknology Look Book — how a scene is built

Published (private to Beck) at https://claude.ai/artifact/XBv6zdjx4M9oJ2NwEgonG7. To view locally, open `index.html`
in a browser (or `dev.html?id=verdance&time=18.2&season=summer&weather=clear&finish=soft` for one scene). `now/` holds
screenshots of the game on October 17, 2026 for comparison. This is a design reference, not part of the game.

A web page of live, code-drawn pixel-art scenes showing Beck where the Bridge's look could go: **between Stardew Valley
and Octopath Traveler** (hi-res pixel art in a lit world), with **Cast n Chill's water and light**. Every scene responds
to the page's global controls: time of day (0–24 h), season, weather, finish.

Files: `kit.js` (pixel kit, light model, shadows, reflections, weather — read it), `app.js` (renderer, don't edit),
`stage.css`, `dev.html` (renders one scene), `shoot.js` (screenshots), `scenes/*.js` (one file per scene),
`people.js` (characters; replaces the placeholder `LB.person`), `scenes/test.js` (a tiny worked example).

**Don't edit kit.js, app.js, stage.css, dev.html or another worker's file.** Put helpers in your own file (inside its
IIFE). If the kit has a bug or lacks something you need, work round it in your file and say so in your final report.

## Iterating

```
cd <lookbook dir> && NODE_PATH=$(npm root -g) node shoot.js shots <id> 18.2,summer,clear,soft 23,summer,clear,soft 12.5,winter,snow,clean 9,autumn,rain,hd2d
```
Spec = `time,season,weather,finish[,t[,width]]` (t = animation seconds, default 3; width = CSS px, default 1440 =
3× a 480-wide scene). It prints load time, the cost of a full redraw (keep it **under ~80 ms**) and any errors. Look
at the PNGs (Read them), crop and zoom with PIL to check pixels at 2–4×. Iterate until it's genuinely beautiful.

## The scene contract

```js
LB.add({
  id: 'verdance', order: 20, section: 'place',            // section: 'ladder' | 'place' | 'vista' | 'building' | 'people'
  name: 'Millrace Farm', world: 'Verdance',
  blurb: 'One or two plain sentences: what this place is and what it shows.',
  see: ['3–5 short bullets: what to look at', '...'],     // shown under the scene
  build: 'How we would get this into the real game, and roughly how big a job (1–3 plain sentences).',
  now: 'verdance.png',                                      // optional: a screenshot of the game today, in now/
  w: 480, h: 270,                                           // native px (32 px a tile → 15 × 8.4 tiles)
  seasons: [...], seasonNote: 'Always winter on Hoarfell',  // optional: the seasons this place has (default all four)
  weathers: [...],                                          // optional: default clear, rain, snow, fog
  finish: 'clean',                                          // optional: force a finish (the ladder uses this)
  clouds: {alpha, speed} | false, weatherFx: {...} | false, grade: false (rare),
  init(S) {},                     // once: masks, layouts, anything that never changes
  ground(ctx, S, P) {},           // cached per (season, weather, time to the quarter hour, finish): terrain, paths, beds
  shadows(sh, S) {},              // cached: cast shadows of standing things → laid on the ground (see LB.shadows)
  water(ctx, S, P) {},            // every frame, over the ground: water surfaces, reflections, glints, rings
  objects(ctx, S, P) {},          // cached: everything standing (trees, buildings, props), sorted back to front
  live(ctx, S, P) {},             // every frame: people, smoke, birds, flags, falling leaves, sway — anything moving
  emissive(ctx, S, P) {},         // every frame, AFTER the grade: lit windows, lamps, neon — full brightness, also feeds bloom
  lights(S) { return [{x, y, r, c, i, flicker, always, sq}] },   // light pools (on at night unless always)
  after(ctx, S, P) {},            // every frame, after lights: light shafts (LB.rays), overlays that must not be graded
  bloom(ctx, S, P) {},            // optional extra bright things for the bloom layer only (sun disc, glints)
});
```
Frame order: ground(+shadows) → water → objects → live → cloud shadows → weather → **grade** (time-of-day light
multiplied over everything) → emissive → light pools → after. Then the finish: `clean` (pure pixels, hard stepped
light pools), `soft` (+ bloom on emissives/lights, a light vignette — the recommended look), `hd2d` (+ tilt-shift
depth-of-field top and bottom, stronger bloom and vignette — Octopath).

`S` = `{ id, w, h, t (seconds, animate with it), time (hours), season, weather, finish, L (the light: amb, skyTop,
skyHor, night 0..1, day, golden 0..1, sunElev, sunP 0..1 across the day, sun {dx, dy, alpha, color}), night, snow
(1 in winter, 0.5 if snowing otherwise), wet (1 in rain) }`. Cached drawers get a stale `S.t` — never animate there.
Draw daylight colours; the grade makes dusk and night. Use `S.L.skyTop / skyHor` for water's sky reflection and
`S.L.golden` for warm accents.

Kit highlights: `LB.ramp(base, n)` hue-shifted ramps (shadows cool, lights warm), `LB.shade(c, k)`, `LB.mix`,
`LB.rng`, `LB.noise / fbm / hash / bayer`, `LB.paint(ctx)` → `P.rect / px / disc / ellipse / poly / line / blob / dither`,
`LB.sprite(key, w, h, draw, {outline: 'sel'})` cached sprites with sel-out outlines, `LB.blit(ctx, spr, x, y)` (anchor
bottom-centre), `LB.flipX`, `LB.silhouette`, `LB.shadows` (cast/blob/pole), `LB.contact`, `LB.mirror` (reflection
about a shoreline), `LB.ripple`, `LB.maskPoints`, `LB.inMask`, `LB.glints`, `LB.rings`, `LB.cloudShadows`, `LB.fog`,
`LB.weatherFx`, `LB.rays`, `LB.motes` (fireflies, pollen, petals, leaves), `LB.memo(key, fn)`.

Reflections: keep your standing things that should reflect in their own layer (draw them into an offscreen canvas in
`objects`, without shadows), `LB.mirror` it about the shoreline (memo per season + quarter hour), then `LB.ripple` it
through the water mask in `water()`. Order in water(): sky colour/gradient tinted by depth → mirrored things → ripple
highlights, glints, rings, foam at the shore.

People: `LB.person(ctx, x, y, look, {dir, walk, t, seed, sit})` — feet at (x, y). The real sprites (coming from
`people.js`) are about **22 px wide and 44 px tall** (1.4 tiles), lit from the upper left. Looks: farmer, farmer-f,
fisher, sailor, baker, elf, elf-bard, skier, mountaineer, cyber, cyber-b, pilot, child, elder, merchant, guard.
Put one to three people in each place, at least one walking (move x/y with S.t, set walk: true and dir).

## The style (what "between Stardew and Octopath" means here)

- **Camera:** the game's top-down 3/4 view. Ground seen from above; standing things show their front face and most of
  their top (roofs mostly visible, like Stardew). 32 native px a tile. (The vista is the one side-view scene.)
- **Every pixel on purpose.** No per-pixel random speckle over big areas, no stretched noise blobs, no camo. Big
  surfaces are calm: 3–5 tones from a hue-shifted ramp, with texture made of small *clusters* and hand-placed marks
  (grass tufts, pebbles, cracks, petals) scattered by rules — denser at edges and under things, sparse in the open.
- **Shapes first.** Strong, readable silhouettes; detail concentrated at the focal points; quiet areas for the eye.
- **Outlines:** sel-out (a deep shade of the colour it borders, `outline: 'sel'`) round standing things; never inside
  ground textures. Edges between ground materials are organic curves with a 1 px light lip or dark under-edge — never
  tile staircases.
- **Light:** sprites lit from the upper left (top/left faces light, bottom/right in shade, cool shadows, warm lights).
  The kit casts the sun's shadows by the hour. Add contact shadows (`LB.contact`) at the feet of things.
- **Water is a showpiece:** the sky's colour, the mirrored world wobbling, depth bands (light at the shallow edge, deep
  in the middle), a foam or light line at the shore, glints toward the sun, rings when it rains, ice in winter.
- **Seasons:** spring — fresh yellow-greens, blossom, puddles; summer — deep greens, full flowers; autumn — orange, red,
  gold, fallen leaves, some bare branches; winter — snow on the ground, roofs, branches and fences, bare deciduous trees,
  evergreens with snow, frozen water edges. Night: windows and lamps glow (emissive), fireflies in summer.
- **Alive:** something always moves — water, a person, smoke, birds, leaves, flicker, flags.
- **Quality bar:** a screenshot should hold up next to Stardew Valley, Eastward or Octopath at the same zoom. Check every
  combination you support: 4 seasons × dawn/noon/golden/night × clear/rain/snow/fog × clean/soft/hd2d.

## Copy (blurb / see / build)
Plain words for Beck, who isn't an artist or engineer. Short, direct sentences. No jargon without saying what it means,
no em-dash asides, no hype.
