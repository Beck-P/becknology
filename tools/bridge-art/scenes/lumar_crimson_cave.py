"""The Dragon's Cave (Crimson Isle) — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/lumar_crimson_cave.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crimson-cave

A cavern lit by lava: the old mine tunnel you came in by (timbers, rails, a
cart), glowing fissures, a molten pool, an old pilot's bones, glowing
mushrooms — and up on its ledge the red dragon, curled around itself with
one eye open, its hoard and its egg below.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_cave as V                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crimson-cave.json')

k = Kit(18, 12, margin_top=1.0, margin_bottom=0.5, seed=71)

POOL = (10.2, 8.5, 1.0, 0.7)
VENTS = [(5.5, 2.6, 0.3, 0.22), (8.5, 4.5, 0.32, 0.24)]

# ---- fissures first, so the floor stones stay off them ------------------------------------
BOUNDS = (2.2, 1.5, 15.8, 9.7)
CRACKS = []
for (x, r, ang, n) in ((9.15, 8.3, 3.3, 14), (11.25, 8.6, -0.3, 10), (10.3, 7.75, -1.8, 9), (5.5, 2.85, 1.6, 12),
                       (8.55, 4.78, 2.0, 10), (8.2, 4.35, -2.7, 8), (5.75, 6.2, 2.6, 9), (12.9, 5.4, 3.0, 7)):
    CRACKS.append(V.wander(k, x, r, n, ang=ang, bounds=BOUNDS))

# ---- floor, walls --------------------------------------------------------------------
V.cave_floor(k, 1.2, 1.0, 16.8, 10.4, holes=[POOL] + VENTS, avoid=CRACKS)
V.rock_wall(k, 0.4, 17.6, 1.0, 2.7, gaps=[(1.85, 3.15, 1.85)])
V.mine_entrance(k, 1.95, 3.05, 1.05)
V.stalactites(k, 0.6, 17.4, 1.15, 2.85, n=24)
V.rock_edge(k, 1.55, 1.6, 10.2)
V.rock_edge(k, 16.45, 5.2, 10.2)
V.rock_row(k, 1.4, 16.8, 10.3)

# gold in the back wall
k.rock(10.4, 1.05, 0.55, 0.62, 0.42, 0.55, ('#4a3a34', 0.2), seed=5)
V.ore_vein(k, 9.95, 10.85, 1.42, 0.25, 0.95)

# ---- the way in: tunnel, rails, cart, timbers ------------------------------------------
V.rails(k, 2.5, 1.0, 9.8)
V.mine_cart(k, 2.5, 7.6)
V.timber_support(k, 3.45, 5.5, 1.6)

# ---- lava ------------------------------------------------------------------------------
V.lava_pool(k, *POOL, energy=120)
for (x, r, rx, ry) in VENTS:
    V.lava_pool(k, x, r, rx, ry, energy=22)
for pts in CRACKS:
    V.lava_crack(k, pts)
    mx, mr = pts[len(pts) // 2]
    k.point_light(mx, mr + 0.2, 0.3, '#ff6a20', 4, radius=0.2, group='flicker')

# ---- rock features -----------------------------------------------------------------------
V.stalagmite(k, 7.5, 1.7, h=1.5)
V.stalagmite(k, 3.55, 4.2, h=1.1, rad=0.24)
V.stalagmite(k, 6.5, 8.5, h=1.3)
V.skeleton(k, 4.55, 8.5)
V.glow_mushrooms(k, 8.5, 5.5)
V.glow_mushrooms(k, 15.4, 9.0, col='#70a0ff')
V.glow_mushrooms(k, 6.1, 1.5)
for _ in range(26):                                   # loose stones
    x, r = k.rng.uniform(3.0, 15.8), k.rng.uniform(1.6, 9.8)
    if ((x - POOL[0]) / POOL[2]) ** 2 + ((r - POOL[1]) / POOL[3]) ** 2 < 1.6:
        continue
    s = k.rng.uniform(0.05, 0.13)
    k.rock(x, r, 0.0, s, s * 0.8, s * 0.6, ('#4a3632', 0.2))

# ---- the lair ------------------------------------------------------------------------------
k.box(12.6, 1.1, -0.05, 16.6, 5.25, 0.5, (V.ROCK_D, 0.22), 'ledge', bevel=0.04)
for i in range(9):                                     # broken lip along the front
    x = 12.7 + i * 0.45
    k.rock(x, 5.2, 0.25, 0.3, 0.2, 0.3, (V.ROCK, 0.2))
for i in range(8):                                     # and the left side
    r = 1.6 + i * 0.5
    k.rock(12.62, r, 0.25, 0.2, 0.3, 0.3, (V.ROCK, 0.2))
k.solid(12, 1, 17, 6)
V.dragon(k, 14.55, 2.75, z0=0.5)
for (a, b) in (((11.3, 4.4, 0.03), (11.7, 4.6, 0.03)), ((10.9, 5.0, 0.03), (11.4, 4.8, 0.03)), ((12.0, 5.7, 0.03), (12.5, 5.8, 0.03))):
    k.tube(a, b, 0.025, V.BONE, 'bone', verts=6)
V.hoard(k, 12.0, 7.0)
k.solid(11, 6, 13, 8)
V.egg_nest(k, 13.6, 7.45)

# ---- light -----------------------------------------------------------------------------------
k.point_light(2.5, 0.6, 1.0, '#7090c0', 18, radius=0.3)          # night air from the tunnel
k.point_light(4.5, 3.4, 2.2, '#a07060', 26, radius=0.6)          # soft fill by the way in
k.point_light(3.6, 7.8, 2.0, '#b06a50', 26, radius=0.6)          # the cart and the bones
k.point_light(13.0, 6.2, 2.4, '#c08060', 22, radius=0.6)         # warm fill over the hoard
k.point_light(14.5, 6.2, 2.0, '#ff8a58', 45, radius=0.6, group='flicker')   # light on the dragon
k.point_light(14.5, 2.2, 3.4, '#c06048', 20, radius=0.6)                       # and its wings

meta = k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}},
                light_samples=128, world_light=('#3a2024', 0.55))

apply_world(WORLD, k, (2, 1, 15, 9), doors=[(2, 1)], scene_id='lumar-crimson-cave', moves={
    'DRAGON': (14, 5), 'HOARD': (11, 6), 'LAVA POOL': (10, 8), 'BONES': (4, 8), 'ORE VEIN': (10, 0),
    'WOODEN SUPPORT': (3, 5), 'GLOW MUSHROOMS': (8, 5), "DRAGON'S EGG": (13, 7)})
print('cave done')
