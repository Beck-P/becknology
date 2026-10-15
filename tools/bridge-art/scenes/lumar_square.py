"""Lumar Market Square — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/lumar_square.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-square

The town square at night: the tavern, inn, bakery and apothecary along the
north side, the smithy to the west, the bell tower and the fishmonger to
the east, the fountain in the middle, lantern posts, the bulletin board,
the captain's statue, carts and crates — and the cliff trail down to the
harbour.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-square.json')

k = Kit(26, 18, margin_top=1.5, margin_bottom=0.5, seed=181)

# footprints (x0, r0, x1, r1) the cobbles skip; chimney tops for the engine's smoke
FOOT = []
SMOKE = []
C = math.cos(math.radians(45))


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 0.65) * C, 3)])


def built(x0, r0, x1, r1):
    FOOT.append((x0, r0, x1, r1))


# ---- north side ---------------------------------------------------------------------------------
smoke(W.house(k, 0.2, 3.1, 1.0, 4.6, wall_h=2.0, roof=W.ROOF_SLATE, wall='#b8a888', door_x=1.65,
        windows=[(0.75, 0.85), (2.55, 0.85)], windows_up=[(1.65, 1.5)], chimney=0.8), 0.8)
built(0.2, 1.0, 3.1, 4.6)
smoke(W.house(k, 3.4, 7.6, 1.0, 5.0, wall_h=2.3, rise=1.4, roof=W.ROOF_GREEN, door_x=5.5, windows=[(4.2, 0.9), (6.8, 0.9)],
        windows_up=[(4.2, 1.7), (5.5, 1.75), (6.8, 1.7)], chimney=4.1, sign=(7.45, 1.75, 'mug'), lanterns=(4.85, 6.15)), 4.1)
built(3.4, 1.0, 7.6, 5.0)
smoke(W.house(k, 9.2, 13.8, 1.0, 5.0, wall_h=2.3, rise=1.4, roof=W.ROOF_SLATE, wall='#c8c0b0', door_x=11.5,
        windows=[(10.0, 0.9), (12.9, 0.9)], windows_up=[(10.0, 1.7), (11.5, 1.75), (12.9, 1.7)], chimney=13.2,
        sign=(13.65, 1.75, 'bed'), lanterns=(10.85, 12.15)), 13.2)
built(9.2, 1.0, 13.8, 5.0)
smoke(W.house(k, 14.3, 17.1, 1.6, 5.0, wall_h=2.0, rise=1.1, roof=W.ROOF_RED, wall='#e0d0b0', door_x=15.5,
        windows=[(16.5, 0.9)], windows_up=[(15.7, 1.5)], chimney=16.5, sign=(14.45, 1.6, 'bread')), 16.5)
built(14.3, 1.6, 17.1, 5.0)
W.house(k, 17.9, 21.1, 1.4, 5.0, wall_h=2.1, rise=1.2, roof=W.ROOF_PURPLE, wall='#5a5068', door_x=19.5,
        windows=[(18.6, 0.9), (20.4, 0.9)], windows_up=[(19.5, 1.6)], sign=(20.95, 1.6, 'bottle'), stone=True)
built(17.9, 1.4, 21.1, 5.0)
smoke(W.house(k, 21.6, 25.8, 0.8, 4.4, wall_h=2.0, roof=W.ROOF_GREEN, wall='#a89878', door_x=24.9,
        windows=[(22.5, 0.85), (23.7, 0.85)], windows_up=[(23.7, 1.5)], chimney=22.3, sign=(25.65, 1.6, 'compass')), 22.3)
built(21.6, 0.8, 25.8, 4.4)

# ---- west: the smithy -------------------------------------------------------------------------------
# (shallow, so its roof doesn't hide the lane to the cottage door behind it)
smoke(W.house(k, 1.0, 5.0, 7.4, 10.0, wall_h=2.1, rise=1.0, roof=W.ROOF_SLATE, wall='#6e675c', door_x=3.5,
        windows=[(2.0, 0.9)], chimney=4.3, sign=(1.15, 1.6, 'anvil'), stone=True), 4.3)
built(1.0, 7.4, 5.0, 10.0)
A.anvil(k, 1.7, 10.6, glowing_blade=False)       # anvil and barrel flank the door, its front kept clear
A.barrel(k, 4.6, 10.5, tone=A.WOOD_D)
k.point_light(4.3, 10.0, 0.6, '#ff7a30', 10, radius=0.3, group='flicker')   # forge glow under the door

# ---- east: bell tower, fishmonger -----------------------------------------------------------------------
W.bell_tower(k, 23.0, 8.0)
built(22.2, 6.4, 23.8, 8.0)
W.market_stall(k, 18.6, 20.9, 9.15, 9.85, goods='fish')
k.solid(21, 9, 22, 10)                   # the fishmonger, beside the stall
W.planter(k, 20.1, 21.0, 5.6)

# ---- the square -------------------------------------------------------------------------------------
W.fountain(k, 12.0, 8.55)
built(11.0, 7.7, 13.0, 9.4)
for (x, r) in ((9.5, 6.5), (2.5, 13.5), (21.5, 13.5), (16.5, 6.5)):
    W.lantern_post(k, x, r)
W.cart(k, 22.9, 11.6)                    # the handcart, parked by the fish stall
for (x, r) in ((17.15, 11.05), (17.75, 11.15)):
    A.crate(k, x, r, s=0.55, tone=A.WOOD_L, contents='apples' if x < 17.5 else None)
A.barrel(k, 18.6, 11.35)                 # the merchant's stock in one row, the lane past it open
k.solid(17, 11, 19, 12)
W.bulletin_board(k, 18.0, 15.5)          # by the harbour steps, out of the way up to the fountain
W.statue(k, 8.5, 14.5)
k.solid(7, 11, 8, 12)                    # the passerby
k.solid(16, 11, 17, 12)                  # the merchant
W.planter(k, 12.3, 13.5, 5.6)
W.planter(k, 9.3, 10.6, 5.6, flowers=('#e0e0f0', '#a0c0e0'))

# ---- the trail down to the harbour --------------------------------------------------------------------
W.stone_steps(k, 13.0, 15.0, 16.0, 18.0)
built(12.7, 16.0, 15.3, 18.0)
for x in (12.4, 15.6):
    W.lantern_post(k, x, 15.5, energy=30)

# ---- trees, benches, bunting -------------------------------------------------------------------------
BEDS = [(0.9, 11.6), (24.7, 11.2), (1.0, 15.9), (24.8, 15.9), (20.3, 16.4), (5.0, 16.4)]
for (x, r) in BEDS:
    W.tree_bed(k, x, r)
    W.tree(k, x, r, h=k.rng.uniform(2.4, 2.9), lean=k.rng.uniform(-0.12, 0.12),
           tone=k.rng.choice(('#2e5434', '#34583a', '#2a4e3a')))
W.bench(k, 14.3, 15.5, 10.9)
W.bench(k, 8.3, 9.5, 10.9)
W.bunting(k, (9.5, 6.5, 2.0), (16.5, 6.5, 2.0), sag=0.4)
W.bunting(k, (16.5, 6.5, 2.0), (21.5, 13.5, 2.0), sag=0.45)

# ---- the fountain plaza: rings of pale paving round the basin ----------------------------------------
FX, FR, PLAZA = 12.0, 8.55, 2.2
band, R = 0.38, 1.02
while R < PLAZA - 0.05:
    Rm = R + band / 2
    n = max(8, int(2 * math.pi * Rm / 0.42))
    off = k.rng.uniform(0, 2 * math.pi)
    for i in range(n):
        a0, a1 = off + 2 * math.pi * (i + 0.06) / n, off + 2 * math.pi * (i + 0.94) / n
        k.bar(FX + math.cos(a0) * Rm, FR + math.sin(a0) * Rm, FX + math.cos(a1) * Rm, FR + math.sin(a1) * Rm, -0.05,
              k.rng.uniform(0.0, 0.012), band - 0.05, (W.shade(W.STONE, k.rng.uniform(0.72, 0.86)), 0.14), 'plaza_stone',
              bevel=0.015)
    R += band


def skip(x, r):
    if math.hypot(x - FX, r - FR) < PLAZA + 0.1:
        return True
    if any(math.hypot(x - bx, r - br) < 0.62 for bx, br in BEDS):
        return True
    return any(a - 0.1 <= x <= c + 0.1 and b - 0.1 <= r <= d + 0.1 for a, b, c, d in FOOT)


W.cobbles(k, 0, 0, 26, 18, skip=skip)

# ---- night light ----------------------------------------------------------------------------------------
k.area_light(13.0, 12.0, 12.0, '#8090c8', 900, 26.0, rot=(math.radians(-35), 0, 0))     # moonlight
for (x, r) in ((12.0, 10.5), (6.0, 7.0), (19.0, 7.0), (12.0, 15.0)):
    k.point_light(x, r, 2.8, '#ffc890', 30, radius=1.0)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=128,
         world_light=('#2a3450', 0.75))

k.solid(0, 0, 26, 1)                    # the strip behind the houses
k.solid(18, 8, 21, 9)                   # behind the fish stall
k.solid(22, 5, 24, 6)                   # behind the bell tower
k.solid(1, 6, 5, 7)                     # behind the smithy
for (c, r) in ((0, 10), (0, 14), (1, 14), (5, 14), (20, 14), (24, 14), (17, 14), (18, 14)):
    k.solid(c, r, c + 1, r + 1)         # under tree crowns / behind the bulletin board
apply_world(WORLD, k, (0, 0, 25, 17), scene_id='lumar-square', moves={
    'COTTAGE': (1, 4), "CARTOGRAPHER'S HOUSE": (24, 4), 'TAVERN': (5, 4), 'INN': (11, 4), 'BAKERY': (15, 4), 'APOTHECARY': (19, 4), 'SMITHY': (3, 9),
    'FISHMONGER': [(19, 9), (21, 9)], 'FOUNTAIN': (11, 8), 'BULLETIN BOARD': (17, 15), 'PASSERBY': (7, 11), 'MERCHANT': (16, 11),
    'HARBOR': [(13, 17), (14, 17)]},
    actors=[{'sheet': 'npc-fishmonger', 'x': 21, 'y': 9, 'facing': 'left'},
            {'sheet': 'npc-passerby', 'x': 7, 'y': 11, 'facing': 'left'},
            {'sheet': 'npc-townsman', 'x': 16, 'y': 11, 'facing': 'down'}],
    scene_extra={'backdrop': True, 'smoke': SMOKE,
                 'fountain': {'x': 12.0, 'r': 8.55, 'spoutZ': 1.42, 'basinZ': 0.46}})
print('square done')
