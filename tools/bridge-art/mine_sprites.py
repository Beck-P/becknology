"""Rock sprites for the Rose Mine — every kind of rock you can break, one per tile.

  BVENV/bin/python tools/bridge-art/mine_sprites.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/mine-rocks

Rendered like a scene (the scenes' 45° camera, real light, scene_post's
dithered shading) but with no floor, so each tile of full.png is a sprite on
a transparent ground: js/mine.js cuts them out by KINDS order and draws them
depth-tested in the mine floors. Crystals glow; ore glints.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from scenekit import Kit, shade  # noqa: E402

OUT = sys.argv[1]
KINDS = ['stone_a', 'stone_b', 'stone_c', 'iron_a', 'iron_b', 'silver_a', 'silver_b', 'rose_a', 'rose_b',
         'sapphire_a', 'sapphire_b', 'moon', 'star', 'song', 'ladder', 'rubble', 'heart']
k = Kit(len(KINDS), 1, margin_top=1.6, margin_bottom=0.4, seed=11)
STONE = '#6a5a56'


def boulder(cx, cr, tone, s=0.4, h=0.46, seed=0, pebble=True):
    k.rock(cx, cr, 0.0, s, s * 0.85, h, (tone, 0.22), part='rock', seed=seed)
    if pebble:
        k.rock(cx + 0.27, cr + 0.2, 0.0, s * 0.36, s * 0.3, h * 0.32, (shade(tone, 0.82), 0.22), part='rock', seed=seed + 1)


def on_surface(cx, cr, s, h, rng, front=True):
    """A point on the boulder's visible shell (the half facing the camera)."""
    a = rng.uniform(0.15, math.pi - 0.15) if front else rng.uniform(0, 2 * math.pi)
    e = rng.uniform(0.25, 1.15)
    return (cx + math.cos(a) * s * math.cos(e) * 0.92, cr + math.sin(a) * s * 0.85 * math.cos(e) * 0.92, h * math.sin(e) * 0.95)


def flecks(cx, cr, col, glow, n=8, s=0.4, h=0.46, seed=0, size=0.055):
    rng = random.Random(seed)
    for _ in range(n):
        x, r, z = on_surface(cx, cr, s, h, rng)
        k.blob(x, r, z, size * rng.uniform(0.7, 1.2), size * 0.8, size * 0.6, col, 'fleck',
               emit=(glow, 0.6) if glow else None, rot=(0, 0, rng.uniform(0, 180)), segs=6, smooth=False)


def crystals(cx, cr, dark, glow, n=5, s=0.4, h=0.46, seed=0, size=1.0, light=6):
    rng = random.Random(seed)
    for i in range(n):
        x, r, z = on_surface(cx, cr, s, h, rng)
        L = rng.uniform(0.22, 0.42) * size
        lean = rng.uniform(-0.5, 0.5)
        top = (x + math.sin(lean) * L * 0.5, r + rng.uniform(0.0, 0.12), z + L)
        k.tube((x, r, z - 0.02), top, rng.uniform(0.05, 0.08) * size, dark, 'crystal', rb=0.004,
               emit=(glow, 0.8), verts=6, smooth=False)
    k.point_light(cx, cr + 0.35, h + 0.3, glow, light, radius=0.1)


for i, kind in enumerate(KINDS):
    cx, cr = i + 0.5, 0.55
    if kind.startswith('stone'):
        boulder(cx, cr, shade(STONE, (0.85, 1.0, 1.12)['abc'.index(kind[-1])]), s=0.38 + 0.03 * 'abc'.index(kind[-1]),
                h=0.4 + 0.06 * 'abc'.index(kind[-1]), seed=i * 7)
    elif kind.startswith('iron'):
        boulder(cx, cr, '#6a4a3a', seed=i * 7)
        flecks(cx, cr, '#8a3a1a', None, n=10, seed=i)                          # rust
        flecks(cx, cr, '#3a3a44', None, n=6, seed=i + 50, size=0.065)         # and the iron in it
    elif kind.startswith('silver'):
        boulder(cx, cr, '#7a7880', seed=i * 7)
        flecks(cx, cr, '#e0e8f0', '#a0b0c0', n=9, seed=i, size=0.05)
    elif kind.startswith('rose'):
        boulder(cx, cr, '#5a4a52', seed=i * 7)
        crystals(cx, cr, '#6a1a3a', '#f070b0', n=5 if kind[-1] == 'a' else 7, seed=i, light=5)
    elif kind.startswith('sapphire'):
        boulder(cx, cr, '#4a4a5a', seed=i * 7)
        crystals(cx, cr, '#142a6a', '#4080ff', n=5 if kind[-1] == 'a' else 7, seed=i, light=5)
    elif kind == 'moon':                                                      # a split geode, pearly inside
        boulder(cx, cr, '#5a5868', s=0.42, h=0.5, seed=i * 7)
        k.blob(cx, cr + 0.18, 0.26, 0.24, 0.12, 0.18, '#202030', 'geode_in', segs=12)
        for j in range(9):
            a = j / 9 * 2 * math.pi
            k.blob(cx + math.cos(a) * 0.12, cr + 0.28, 0.26 + math.sin(a) * 0.1, 0.05, 0.04, 0.05, '#c8c8e0', 'moonstone',
                   emit=('#e8e8ff', 0.7), segs=6)
        k.point_light(cx, cr + 0.6, 0.4, '#d0d8ff', 5, radius=0.1)
    elif kind == 'star':                                                      # dark rock full of tiny stars
        boulder(cx, cr, '#2a2830', seed=i * 7)
        flecks(cx, cr, '#fff0c0', '#ffe080', n=14, seed=i, size=0.035)
        k.point_light(cx, cr + 0.5, 0.5, '#ffe0a0', 3, radius=0.1)
    elif kind == 'song':                                                      # the singing crystal
        k.rock(cx, cr, 0.0, 0.36, 0.3, 0.22, ('#3a3048', 0.22), part='rock', seed=i * 7)
        crystals(cx, cr, '#3a1a6a', '#b080ff', n=7, s=0.3, h=0.22, seed=i, size=1.6, light=9)
    elif kind == 'heart':                                                     # the great songstone at the bottom
        k.rock(cx, cr, 0.0, 0.44, 0.38, 0.3, ('#2e2638', 0.22), part='rock', seed=i * 7)
        crystals(cx, cr, '#3a1a6a', '#c090ff', n=11, s=0.36, h=0.3, seed=i, size=2.4, light=14)
    elif kind == 'ladder':                                                    # the way down: a hole and a ladder's head
        k.cyl(cx, cr, -0.02, 0.005, 0.36, '#060404', 'hole', ry=0.3, verts=20)
        for j in range(10):
            a = j / 10 * 2 * math.pi
            k.rock(cx + math.cos(a) * 0.4, cr + math.sin(a) * 0.33, 0.0, 0.09, 0.07, 0.06, (shade(STONE, 0.8), 0.2), part='rim',
                   seed=j + 300)
        for dx in (-0.13, 0.13):
            k.box(cx + dx - 0.025, cr - 0.12, -0.3, cx + dx + 0.025, cr - 0.07, 0.42, ('#5a3a1a', 0.2), 'ladder')
        for z in (0.12, 0.3):
            k.box(cx - 0.13, cr - 0.12, z, cx + 0.13, cr - 0.08, z + 0.03, ('#4a2e14', 0.2), 'ladder')
    elif kind == 'rubble':
        rng = random.Random(i)
        for j in range(6):
            s = rng.uniform(0.06, 0.12)
            k.rock(cx + rng.uniform(-0.3, 0.3), cr + rng.uniform(-0.2, 0.25), 0.0, s, s * 0.8, s * 0.5,
                   (shade(STONE, rng.uniform(0.7, 1.0)), 0.2), part='rubble', seed=j + 400)

k.area_light(len(KINDS) * 0.35, -1.0, 4.0, '#fff0e0', 160, 6.0, rot=(math.radians(-50), math.radians(-20), 0))
k.point_light(len(KINDS) / 2, 2.5, 2.0, '#c0a890', 60, radius=2.0)
k.render(OUT, light_states={'full': {}, 'dim': {}}, light_samples=64, world_light=('#403a40', 0.6))
print('rocks', len(KINDS))
