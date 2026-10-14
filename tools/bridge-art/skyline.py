"""Arcadia's skyline, rendered as backdrop layers for the District (bpy).

  BVENV/bin/python tools/bridge-art/skyline.py RENDER_DIR [far mid low]
  python3 tools/bridge-art/cine_post.py RENDER_DIR apps/bridge/assets/backdrops/arcadia

Same 45° orthographic look as the scenes, at fewer pixels per tile the
farther a layer is: `far` (a wall of mega-towers fading into smog), `mid`
(nearer towers with holo-ad screens — anchors ad<N>_a/_b mark their
corners for js/skyline.js to fill with animation — blade signs and sky
bridges) and `low` (the city below the walkway's railing: roofs, skylights,
streets of light). js/skyline.js scrolls them at different speeds.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cinekit import CineKit       # noqa: E402
import assets_city as Y           # noqa: E402

OUT = sys.argv[1]
ONLY = set(sys.argv[2:])


def light(k):
    k.sun((0.25, -0.35, -0.9), '#9a80e0', 1.4)        # violet sky glow on the roofs
    k.sun((0.1, -0.7, 0.4), '#ff50a8', 0.7)           # magenta glow from the streets below, up the facades


def far():
    W = 150
    k = CineKit((0, W, -4, 0.6, 0, 42), elev=45, ppt=7, seed=31)
    rng = random.Random(31)
    x = -1.0
    while x < W:
        w = rng.uniform(2.0, 5.5)
        h = rng.choice((rng.uniform(10, 22), rng.uniform(18, 30), rng.uniform(28, 40)))
        rf = rng.uniform(-1.6, 0.0)
        ads = [(0.15, 0.85, 0.55, 0.8)] if rng.random() < 0.12 and w > 3 else []
        Y.tower(k, x, x + w, rf, h, depth=1.0, tiers=rng.choice((1, 2, 2, 3)), win=(0.3, 0.38), lit=rng.uniform(0.2, 0.4),
                crown=rng.choice(('antenna', 'antenna', 'spire', 'halo')), ads=ads, detail=0.6, rng=rng)
        x += w + rng.uniform(-0.4, 0.6)
    light(k)
    k.render(os.path.join(OUT, 'far'), light_states={'full': {}}, light_samples=24, world_light=('#2a1c50', 0.9))


def mid():
    W = 104
    k = CineKit((0, W, -3, 1.2, 0, 32), elev=45, ppt=12, seed=47)
    rng = random.Random(47)
    x = 0.0
    tops = []
    while x < W:
        w = rng.uniform(3.0, 7.0)
        h = rng.uniform(9, 28)
        rf = rng.uniform(-0.8, 0.4)
        ads = []
        if rng.random() < 0.45 and w > 3.5:
            ads = [rng.choice(((0.12, 0.88, 0.5, 0.82), (0.2, 0.8, 0.3, 0.75), (0.1, 0.55, 0.6, 0.9)))]
        top = Y.tower(k, x, x + w, rf, h, depth=1.2, tiers=rng.choice((1, 2, 3)), win=(0.34, 0.42), lit=rng.uniform(0.3, 0.55),
                      crown=rng.choice(('antenna', 'spire', 'pad', 'halo', 'antenna')), ads=ads, rng=rng)
        if rng.random() < 0.45:
            Y.blade_sign(k, x + w + 0.05, rf, rng.uniform(2.0, h * 0.4), rng.uniform(2.5, 4.5), rng.choice(Y.NEON),
                         glyphs=rng.randint(3, 6), rng=rng)
        tops.append((x, x + w, rf, top))
        x += w + rng.uniform(0.6, 1.6)
    for (a, b) in zip(tops, tops[1:]):        # sky bridges between neighbours
        if rng.random() < 0.4:
            z = rng.uniform(4, min(a[3], b[3]) * 0.8)
            Y.sky_bridge(k, a[1], b[0], min(a[2], b[2]) - 0.2, z, rng.choice(Y.NEON))
    light(k)
    k.render(os.path.join(OUT, 'mid'), light_states={'full': {}}, light_samples=32, world_light=('#2a1c50', 0.8))


def low():
    W = 96
    k = CineKit((0, W, 0, 16, -4.2, 1.5), elev=45, ppt=10, seed=53)
    Y.roofscape(k, 0, W, 0.5, 16, rng=random.Random(53), top=0.8)
    light(k)
    k.render(os.path.join(OUT, 'low'), light_states={'full': {}}, light_samples=24, world_light=('#2a1c50', 0.9))


for name, fn in (('far', far), ('mid', mid), ('low', low)):
    if not ONLY or name in ONLY:
        fn()
        print(name, 'rendered')
