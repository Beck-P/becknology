"""The Singularity — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/singularity.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/singularity

An ancient stone platform floating in the void beside a black hole: glowing
cracks and runes, crystal clusters, an inscribed stone, the pilot's ship at
the gangway. The void (the world's own animated backdrop) shows all round.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_station as T             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'singularity.json')

k = Kit(16, 14, margin_top=1.0, margin_bottom=0.5, margin_x=1.0, seed=171)

CELLS = [(c, 4) for c in range(4, 13)] + [(c, r) for r in range(5, 9) for c in range(3, 13)] + [(c, 9) for c in range(4, 13)]
T.void_platform(k, CELLS)
for (x, r, ang, n) in ((5.0, 5.2, 0.3, 9), (9.5, 8.6, -2.6, 8), (11.2, 5.4, 2.2, 7), (4.2, 8.2, -0.6, 6)):
    pts = [(x, r)]
    a = ang
    for _ in range(n):
        a += k.rng.uniform(-0.8, 0.8)
        x, r = x + math.cos(a) * 0.32, r + math.sin(a) * 0.32
        if not (3.1 < x < 12.9 and 4.1 < r < 9.9):
            break
        pts.append((x, r))
    T.platform_crack(k, pts)
for (c, r) in ((7, 6), (10, 6), (6, 7), (9, 7)):
    T.rune_tile(k, c, r)
for (x, r, s) in ((6.5, 4.5, 1.0), (12.5, 4.5, 0.8), (6.5, 9.5, 0.9), (12.5, 9.5, 1.1)):
    T.crystal_cluster(k, x, r, scale=s)

# an inscribed stone near the south crystals
k.box(4.25, 9.2, 0.0, 4.75, 9.5, 1.1, (T.VOID_STONE[2], 0.16), 'obelisk', bevel=0.03)
k.cone(4.5, 9.35, 1.1, 1.35, 0.25, 0.02, (T.VOID_STONE[2], 0.16), 'obelisk', verts=4)
for i in range(4):
    k.box(4.33, 9.5, 0.3 + i * 0.18, 4.67 - 0.08 * (i % 2), 9.51, 0.33 + i * 0.18, '#1a0c30', 'inscription', emit=('#8060c0', 0.7))
k.solid(4, 9, 5, 10)
k.solid(3, 9, 4, 10)                      # no platform here

# the pilot's ship at the gangway
T.docked_ship(k, 1.2, 4.6, z=0.05, length=3.0)
k.box(1.9, 4.2, -0.06, 3.1, 5.0, 0.0, ('#3a4050', 0.06), 'gangway')
for rr in (4.2, 4.95):
    k.box(1.9, rr, 0.0, 3.1, rr + 0.05, 0.35, '#5a6478', 'gangway_rail')

# drifting rocks in the void
for (x, r, z, s) in ((14.2, 3.2, 2.2, 0.25), (1.2, 9.5, -0.6, 0.3), (8.5, 11.4, -1.2, 0.35), (14.8, 10.5, -0.3, 0.2),
                     (2.6, 2.4, 1.8, 0.18)):
    k.rock(x, r, z, s, s * 0.8, s * 0.7, (T.VOID_STONE[1], 0.16), part='void_rock')

T.singularity(k, 14.6, 6.6, z=1.0, rad=0.48)
k.point_light(8.0, 6.5, 2.8, '#9070d0', 35, radius=1.0)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.6}}, light_samples=128,
         world_light=('#140c24', 0.45))

apply_world(WORLD, k, (3, 4, 12, 9), doors=[(3, 4), (2, 4)], scene_id='singularity', moves={
    'THE SINGULARITY': [(12, 6), (12, 7)], 'SHIP': [(2, 4), (3, 4), (3, 5)], '???': (4, 9)},
    scene_extra={'backdrop': True, 'flicker': {'mode': 'pulse'}})
print('singularity done')
