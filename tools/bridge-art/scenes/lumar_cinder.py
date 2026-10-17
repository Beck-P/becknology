"""Cinder Key — the pirate port in the Crimson Sea (world id "lumar-cinder").

  BVENV/bin/python tools/bridge-art/scenes/lumar_cinder.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-cinder

A volcano island south of Crimson Reach, and at its foot Tortuga — what the pirates call the town round its cove, after
an old song. The cove is a graveyard of ships: a galleon on her side in the shallows, a mast standing out of the water,
a hull turned keel-up on the east beach for the fence to trade under. Round the cove's head a boardwalk quay on piles
and a town knocked together from ship's timbers under red and black roofs: the Salt Rat (the rogues' tavern), the
harbourmistress's shed, Vesper Quick's counter under the upturned hull, the pirates' slip on the west arm with a raider
in frame, a battery of old guns at the mouth, a gibbet on the point. Behind the town the land climbs through ash palms
and red pines to the volcano's flank (the trail up, js/crimson.js), and on the east headland the stormwatch tower keeps
its flags for the squalls.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import bpy                             # noqa: E402
import bmesh                           # noqa: E402
from scenekit import Kit, S, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_house as HK              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_yard as Y                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-cinder'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 56, 42
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=9091)
rng = k.rng
C45 = math.cos(math.radians(45))
EMBER = '#ff5a24'

# ---- the island's shape: a volcano with a cove bitten out of its south side ------------------------------------------
LOBES = [(28, 16, 23, 12.5), (10.5, 26, 7.5, 9.5), (45.5, 25, 8, 9.5), (49.5, 15, 5.5, 6)]
land = I.mask(COLS, ROWS, LOBES, seed=93, amp=0.14)
COVE = (28.0, 33.6, 13.5, 8.6)                    # the cove: an ellipse of water, open to the south


def in_cove(x, r):
    cx, cr, rx, ry = COVE
    return ((x - cx) / rx) ** 2 + ((r - cr) / ry) ** 2 + 0.06 * I.n2(x, r, 0.3, 5) < 1.0


land = {(c, r) for (c, r) in land if not in_cove(c + 0.5, r + 0.5)}
land = I.flood(land, (28, 16))
QUAY = 25                                          # the boardwalk's front edge (cells up to it are the town)
land = {(c, r) for (c, r) in land if not (19 <= c <= 37 and r > QUAY)}
land |= {(c, r) for c in range(19, 38) for r in range(22, QUAY + 1)}


def volcano_foot(x):
    """The row where the volcano's flank stops being walkable (the trail's notch is level ground)."""
    return 8.6 + 1.6 * I.n2(x, 0, 0.16, 31) + 0.5 * I.n2(x, 0, 0.5, 32) + 0.04 * (x - 28) ** 2 / 9


TRAIL = (37.0, float(math.floor(volcano_foot(37.5) + 0.5)))   # the trail up the volcano: its foot, where you set off up it
CRATER = (28.0, 3.2, 2.7)                           # the crater: its centre and its rim's radius
VOLC = {(c, r) for (c, r) in land if 8 <= c <= 47 and r + 0.5 < volcano_foot(c + 0.5)}
VOLC |= {(c, r) for c in range(10, 46) for r in range(0, 4) if r + 0.5 < volcano_foot(c + 0.5)
         and math.hypot((c + 0.5 - CRATER[0]) / 1.0, (r + 0.5 - CRATER[1]) * 1.25) < 17.5}
land |= VOLC
walk = land - VOLC
# what's sea within two and a half tiles: the sand line
SEA_NEAR = {}
for (c, r) in land:
    best = 9.0
    for dc in range(-3, 4):
        for dr in range(-3, 4):
            if (c + dc, r + dr) not in land:
                best = min(best, math.hypot(dc, dr))
    SEA_NEAR[(c, r)] = best


def sea_dist(x, r):
    """How far (tiles) a point is from the nearest cell of sea, so the cone comes down to the water and not to a cut."""
    best = 3.5
    c0, r0 = int(math.floor(x)), int(math.floor(r))
    for dc in range(-3, 4):
        for dr in range(-3, 4):
            q = (c0 + dc, r0 + dr)
            if q in land:
                continue
            dx = max(q[0] - x, x - (q[0] + 1), 0.0)
            dy = max(q[1] - r, r - (q[1] + 1), 0.0)
            best = min(best, math.hypot(dx, dy))
    return best


def vheight(x, r):
    """The volcano: a cone rising to the crater's rim off the top of the map, a bowl in the rim, nothing below its foot."""
    cx, cr, rim = CRATER
    d = math.hypot(x - cx, (r - cr) * 1.25)
    above = volcano_foot(x) - r
    if above <= 0:
        return 0.0
    if d < rim:                                         # the bowl inside the rim, down to the lava
        h = 5.6 - 1.4 * I.smooth(rim, rim * 0.45, d)
    else:
        h = max(0.0, 5.6 - 0.42 * (d - rim) - 0.004 * (d - rim) ** 2)
    h += 0.18 * I.n2(x, r, 0.7, 95) + 0.08 * I.n2(x, r, 2.1, 96)
    return max(0.0, h * I.smooth(0.0, 2.2, above) * I.smooth(0.2, 3.2, sea_dist(x, r)))

PX = 28                                            # your pier: from the boardwalk out into the cove
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 6)]
SHIP_R = QUAY + 6
FJ, FLEN = (47, 31), 5                             # the fishing jetty: south off the east arm
FJET = I.jetty_cells(FJ, FLEN, 's')

TAVERN = (17.8, 22.4, 17.2, 21.4, 20.1)            # x0, x1, r_back, r_front, door x
HARBOUR_SHED = (30.4, 33.2, 19.4, 21.6, 31.8)
FENCE = (39.0, 43.6, 21.6)                         # the upturned hull: x0, x1, its open (south) side
STORM = (50.0, 15.0)                               # the stormwatch tower on the east headland
SLIP = (10.8, 13.6, 27.0, 33.6)                    # the pirates' slip on the west arm, into the cove
GIBBET = (6.2, 23.0)
BATTERY = [(15.6, 31.6), (41.2, 30.4)]

# ---- paths ---------------------------------------------------------------------------------------------------------------
PATHS = [
    [(PX + 0.5, QUAY - 1.0), (PX + 0.5, 19.0), (30.0, 15.5), (33.5, 12.0), (TRAIL[0] + 0.5, TRAIL[1] + 0.5)],
    [(14.0, 23.6), (19.0, 23.6), (38.0, 23.6), (43.0, 24.2), (46.5, 26.5), (FJ[0] + 0.5, FJ[1] - 0.5)],
    [(14.0, 23.6), (12.0, 25.5), (12.2, SLIP[2])],
    [(12.0, 25.5), (8.0, 24.0), (GIBBET[0] + 0.8, GIBBET[1] + 0.8)],
    [(43.0, 24.2), (46.0, 20.5), (STORM[0] - 0.2, STORM[1] + 2.2)],
    [(PX + 0.5, 19.0), (22.0, 15.0), (17.0, 13.0)],
]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    p = pd(x, r) + 0.18 * I.n2(x, r, 1.6, 3)
    if r > 21.6 and 18.6 < x < 38.4:
        return 'boards' if r > 22.0 else 'path'
    if p < 0.5:
        return 'path'
    if p < 0.7 and I.n2(x, r, 2.2, 5) > 0:
        return 'path_edge'
    wob = 0.3 * I.n2(x, r, 0.5, 7) + 0.15 * I.n2(x, r, 1.7, 17)
    fv = volcano_foot(x)
    if r < fv + 2.6 + wob * 2:                            # ash and cinders on the volcano's skirts
        return 'cinders' if I.n2(x, r, 0.9, 61) > -0.1 else 'ash'
    m = I.n2(x, r, 0.35, 11) + 0.4 * I.n2(x, r, 1.4, 12)
    if SEA_NEAR.get((int(x), int(r)), 9) + 0.6 * wob < 2.4:   # sand only along the water
        return 'sand' if m > -0.45 else 'sand_dark'
    return 'grass' if m > -0.1 else ('moor' if m > -0.5 else 'grass_dark')


ALB = {'path': ('#6e5a4c', 0.3), 'path_edge': ('#5e4a40', 0.3), 'boards': ('#5a3e28', 0.3), 'ash': ('#3a3234', 0.35),
       'cinders': ('#2a2224', 0.4), 'sand': ('#6e5850', 0.25), 'sand_dark': ('#5e4a44', 0.25),
       'grass': ('#4e3a2a', 0.3), 'grass_dark': ('#3e2e24', 0.3), 'moor': ('#5a2e2a', 0.3)}
I.ground(k, walk, material, ALB)


def vmaterial(x, r):
    """The cone's skin: rock and cinder in rough bands round it, lava in the gullies down from the rim, crust at the top."""
    h = vheight(x, r)
    if h < 0.05:
        return 'g:' + material(x, r)
    cx, cr, rim = CRATER
    d = math.hypot(x - cx, (r - cr) * 1.25)
    if d < rim * 0.42:
        return 'lava'
    if d < rim * 0.95:
        return 'crust'
    a = math.atan2(r - cr, x - cx)
    gully = abs(math.sin(a * 6 + 1.6 * I.n2(x, r, 0.18, 97) + 0.5 * I.n2(x, r, 0.6, 101)))
    if gully < 0.06 + 0.03 * I.n2(x, r, 0.9, 102) and d < 4 + 9 * (0.5 + 0.5 * I.n2(a * 3, 0, 0.7, 98)):
        return 'lava'
    band = int(h * 2.2 + 0.7 * I.n2(x, r, 0.3, 99)) % 3
    return ('rock', 'cinder', 'scree')[band] if I.n2(x, r, 1.3, 100) > -0.45 else 'ashfall'


VALB = {'rock': ('#3e3236', 0.25), 'cinder': ('#2a2022', 0.35), 'scree': ('#4a3c3a', 0.3), 'ashfall': ('#5a5050', 0.35),
        'crust': ('#1e1414', 0.3)}
VALB.update({'g:' + key: a for key, a in ALB.items()})
_vf = {}
for (c, r) in VOLC:
    for j in range(8):
        for i in range(8):
            a = (c * 8 + i, r * 8 + j)
            _vf.setdefault(vmaterial(c + (i + 0.5) / 8, r + (j + 0.5) / 8), []).append((a, (a[0] + 1, a[1]), (a[0] + 1, a[1] + 1), (a[0], a[1] + 1)))
_vh = {}


def _vz(p):
    if p not in _vh:
        _vh[p] = vheight(p[0] / 8, p[1] / 8)
    return _vh[p]


I._mesh(k, {key: f for key, f in _vf.items() if key != 'lava'}, lambda p: (p[0] / 8, p[1] / 8, _vz(p) - 0.004), VALB, 'volcano')
lava = _vf.get('lava', [])
if lava:                                               # the lava, glowing: its own mesh, emissive
    bm = bmesh.new()
    vm = {}
    for f in lava:
        vs = []
        for p in f:
            if p not in vm:
                vm[p] = bm.verts.new((p[0] / 8, -p[1] / 8 * S, _vz(p) + 0.01))
            vs.append(vm[p])
        bm.faces.new(vs)
    me = bpy.data.meshes.new('lava')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('lava', me)
    k.scene.collection.objects.link(o)
    k._finish(o, ('#6a1808', 0.4), 'lava_flow', emit=(EMBER, 1.6))
terrain = C.coast(k, land, ground=(material, ALB), palette='crimson', grass='#4e3a2a', rock='#3a3034', seed=97, beachiness=0.1,
                  beach_bias=lambda x, r: 0.8 * I.smooth(24.0, 29.0, r) - 0.6 * I.smooth(20.0, 14.0, r),
                  keep_clear=[(PX - 0.6, QUAY - 0.4, PX + 1.6, SHIP_R + 0.4), (PX - 3.0, SHIP_R - 0.4, PX + 5.6, SHIP_R + 2.0),
                              (FJ[0] - 0.6, FJ[1] - 0.6, FJ[0] + 1.6, FJ[1] + FLEN + 1.6), (SLIP[0] - 0.4, SLIP[2], SLIP[1] + 0.4, SLIP[3] + 0.6)],
                  sheer=[(18.6, QUAY + 0.6, 37.4, QUAY + 1.6, 1.6)])

# ---- the volcano: the crater's glow, smoke off it, the trail's steps up its flank -----------------------------------------
SMOKE = []
cx_, cr_, rim_ = CRATER
k.point_light(cx_, cr_ + 0.4, 5.6, EMBER, 120, radius=1.6, group='flicker')        # the crater, glowing over the lip
for (x, r) in ((16.5, 6.5), (37.0, 5.0), (24.0, 8.0), (31.5, 7.0)):                  # the lava in the gullies
    k.point_light(x, r, vheight(x, r) + 0.5, EMBER, 10, radius=0.4, group='flicker')
for (x, r) in ((cx_ - 0.6, cr_), (cx_ + 0.8, cr_ + 0.3)):
    SMOKE.append([x, round(r - 6.4 * C45, 3)])
for i in range(7):                                    # steps cut into the cinder, up from the trail's foot
    r = TRAIL[1] + 0.5 - i * 0.62
    z = max(0.0, vheight(TRAIL[0] + 0.5, r) - 0.02)
    k.box(TRAIL[0] - 0.3, r - 0.28, z - 0.08, TRAIL[0] + 1.3, r + 0.28, z + 0.05, (shade('#4a3c34', rng.uniform(0.9, 1.1)), 0.2),
          'trail_step', bevel=0.02)
for i in range(5):
    for s_ in (-1, 1):
        x, r = TRAIL[0] + 0.5 + s_ * 1.0, TRAIL[1] + 0.6 - i * 0.85
        z = max(0.0, vheight(x, r))
        k.cyl(x, r, z - 0.05, z + 0.6, 0.035, (A.WOOD_D, 0.14), 'rope_post', verts=6)
V.signpost(k, TRAIL[0] - 0.9, TRAIL[1] + 1.6, [('THE CRATER', 'e', 1.55)])
k.solid(TRAIL[0] - 1.1, TRAIL[1] + 1.3, TRAIL[0] - 0.7, TRAIL[1] + 1.9)

# ---- the town: houses of ship's timber under red and black roofs ------------------------------------------------------------
HK.install()
ROOFS = ('#7a2a22', '#3a2a2a', '#5a2a2a', '#2e2a2e', '#8a3a24')
WALLS = ('#c8b494', '#b89a7a', '#a8907a', '#d0bc9c', '#8a7a68')


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 1.05) * C45, 3)])


x0, x1, rb, rf, dx = TAVERN                        # the Salt Rat: two storeys, a gallery, a rat on its sign
smoke(W.house(k, x0, x1, rb, rf, wall_h=2.3, rise=1.3, roof='#3a2a2a', wall='#a8907a', door_x=dx,
              windows=[(x0 + 0.8, 0.8), (x1 - 0.8, 0.8)], windows_up=[(x0 + 0.9, 1.8), (x1 - 0.9, 1.8)], chimney=x1 - 0.6,
              sign=(x1 - 0.2, 1.85, 'mug'), lanterns=(dx - 0.6, dx + 0.6)), x1 - 0.6)
V.board_sign(k, 'THE SALT RAT', 'Rye-Regular', (x0 + x1) / 2, rf + 0.02, 2.55, size=0.2, board='#2a1a14', ink='#f0c070')
for (bx, br) in ((x1 + 0.4, rf + 0.4), (x1 + 0.85, rf + 0.5), (x1 + 0.6, rf + 0.95)):
    A.barrel(k, bx, br, h=0.7, radius=0.26, tone=rng.choice((A.WOOD, shade(A.WOOD, 0.8))))
k.solid(x1 + 0.1, rf + 0.1, x1 + 1.1, rf + 1.2)
x0, x1, rb, rf, dx = HARBOUR_SHED                  # the harbourmistress's shed on the boardwalk
smoke(W.house(k, x0, x1, rb, rf, wall_h=1.8, rise=1.0, roof='#7a2a22', wall='#b89a7a', door_x=dx,
              windows=[(x0 + 0.6, 0.8)], chimney=x0 + 0.5), x0 + 0.5)
V.board_sign(k, 'HARBOUR', 'IMFellEnglishSC-Regular', (x0 + x1) / 2, rf + 0.02, 2.05, size=0.15, board='#2a1a14', ink='#e8d8b0')
HOUSES = [
    (12.4, 15.6, 18.0, 20.4, 14.0), (23.6, 26.6, 17.4, 20.2, 25.1), (34.4, 37.6, 17.8, 20.6, 36.0),
    (14.8, 17.6, 13.4, 15.8, 16.2), (23.0, 25.8, 12.8, 15.0, 24.4), (40.6, 43.4, 15.0, 17.4, 42.0),
]
for i, (x0, x1, rb, rf, dx) in enumerate(HOUSES):
    ch = x1 - 0.6 if i % 2 else x0 + 0.6
    smoke(W.house(k, x0, x1, rb, rf, wall_h=rng.choice((1.7, 1.9, 2.0)), rise=1.0, roof=ROOFS[i % len(ROOFS)], wall=WALLS[i % len(WALLS)],
                  door_x=dx, windows=[(x0 + 0.65 if dx > (x0 + x1) / 2 else x1 - 0.65, 0.8)], chimney=ch), ch)
# patched walls: planks of old hull nailed over the plaster here and there, a porthole for a window
for (x0, x1, rb, rf, dx) in HOUSES[:3]:
    px = x0 + 0.35 if dx > (x0 + x1) / 2 else x1 - 1.0
    for j in range(4):
        k.box(px, rf + 0.01, 0.5 + j * 0.17, px + 0.65, rf + 0.05, 0.64 + j * 0.17, (shade('#5a3e28', rng.uniform(0.8, 1.15)), 0.2), 'patch_plank')

# the boardwalk quay on piles along the cove's head, a rail at its edge, bollards, lamps
for x in [19.0 + i * 1.3 for i in range(15)]:
    k.cyl(x, QUAY + 0.95, -0.9, 0.0, 0.1, (A.WOOD_DD, 0.2), 'pile', verts=8)
for x in [19.2 + i * 0.6 for i in range(31)]:
    if abs(x - PX - 0.5) < 0.9:
        continue
    k.cyl(x, QUAY + 0.9, 0.0, 0.55, 0.03, A.WOOD_D, 'rail_post', verts=6)
k.cyl_x(19.2, PX - 0.4, QUAY + 0.9, 0.55, 0.03, 0.03, (A.WOOD, 0.14), 'rail', verts=6)
k.cyl_x(PX + 1.4, 37.6, QUAY + 0.9, 0.55, 0.03, 0.03, (A.WOOD, 0.14), 'rail', verts=6)
for bx in (22.4, 26.2, 31.4, 35.2):
    k.cyl(bx, QUAY + 0.55, 0.0, 0.42, 0.13, ('#2e2a2a', 0.12), 'bollard', verts=12)
    k.solid_post(bx, QUAY + 0.55)
for lx in (20.4, 33.4):
    W.lantern_post(k, lx, QUAY + 0.5, energy=26)
W.lantern_post(k, PX + 1.3, QUAY - 1.4, energy=26)

# ---- your pier, out into the cove ------------------------------------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.6, SHIP_R + 0.0, z=0.02)
for x in (PX - 0.15, PX + 1.15):
    W.silver_post(k, x, QUAY + 3.0)

# ---- the wrecks: a galleon on her side, a mast out of the water, a hull keel-up for the fence ---------------------------------
n0, l0 = len(k.parts), len(k.lights)
W.galleon(k, 16.8, 23.6, 31.4, beam=1.5, masts=0.8, waterline=False, hull='#2a1a12', paint='#3a1418', sail='#7a6a5a',
          flag='#1a1414', wreck=True)
C.sink(k, n0, C.WZ - 0.35, l0)
I.tilt(k, n0, (20.2, 31.4, C.WZ - 0.3), roll=-24, pitch=-6, lights_since=l0)
MX, MR = 36.6, 32.6                                  # a mast standing out of the water, a yard across it, a rag of sail
k.tube((MX, MR, C.WZ - 0.4), (MX + 0.25, MR - 0.1, 3.0), 0.09, ('#3a2a1e', 0.2), 'wreck_mast', verts=8)
k.tube((MX - 0.7, MR + 0.1, 2.3), (MX + 1.0, MR - 0.15, 2.5), 0.05, ('#3a2a1e', 0.2), 'wreck_yard', verts=6)
k.poly([(MX - 0.5, MR + 0.12, 2.25), (MX + 0.3, MR + 0.02, 2.35), (MX + 0.1, MR + 0.04, 1.4)], ('#6a5a4a', 0.3), 'wreck_sail')
k.tube((MX + 0.2, MR - 0.08, 2.9), (MX - 1.4, MR + 0.4, C.WZ), 0.012, '#3a3028', 'wreck_rope', verts=4)
k.blob(MX + 0.15, MR - 0.05, 3.08, 0.1, 0.08, 0.06, '#f0f0ec', 'gull', segs=8)                 # a gull on the masthead
for (x, r) in ((33.0, 34.6), (24.6, 35.0), (38.4, 35.8), (14.6, 34.6)):
    k.rock(x, r, C.WZ, 0.45, 0.35, 0.35, ('#3a3034', 0.22), part='reef')
HX0, HX1, HR = FENCE                                 # the hull turned keel-up: the fence's shop, its open side to the lane
hl = HX1 - HX0
for i in range(14):                                  # her ribs and planking as a long low vault
    t = i / 13
    x = HX0 + t * hl
    half = 1.15 * math.sin(math.pi * (0.06 + 0.88 * t)) ** 0.6
    k.tube((x, HR - 2.2, 0.0), (x, HR - 2.2 + half, 1.25 + 0.25 * math.sin(math.pi * t)), 0.06, ('#3a2618', 0.18), 'hull_rib', verts=5)
    k.tube((x, HR - 2.2 + half, 1.25 + 0.25 * math.sin(math.pi * t)), (x, HR - 2.2 + 2 * half, 0.0), 0.06, ('#3a2618', 0.18), 'hull_rib', verts=5)
for j in range(9):                                    # strakes: the planking over the ribs, a few stove in
    a = math.pi * (j + 0.5) / 9
    for i in range(8):
        if (i, j) in ((3, 4), (4, 4), (6, 2)):
            continue
        xa, xb = HX0 + 0.1 + i * hl / 8, HX0 + 0.1 + (i + 1) * hl / 8 - 0.04
        rr = HR - 2.2 + 1.1 - math.cos(a) * 1.1
        zz = math.sin(a) * 1.45
        k.box(xa, rr - 0.11, zz - 0.06, xb, rr + 0.11, zz + 0.04, (shade('#4a3220', rng.uniform(0.8, 1.15)), 0.2), 'hull_plank')
k.box(HX0, HR - 1.3, 1.42, HX1, HR - 1.0, 1.55, ('#2a1a10', 0.2), 'keel')
k.box(HX0 - 0.1, HR - 0.25, 0.0, HX1 + 0.1, HR - 0.05, 0.9, ('#4a3220', 0.18), 'counter')            # her counter, under the gunwale
k.box(HX0 - 0.15, HR - 0.3, 0.9, HX1 + 0.15, HR + 0.05, 0.96, ('#6a4a30', 0.14), 'counter_top')
for (x, col) in ((HX0 + 0.5, '#c8a040'), (HX0 + 1.1, '#9ac8e0'), (HX0 + 1.7, '#e04060'), (HX1 - 1.2, '#d8d0c0'), (HX1 - 0.6, '#c8a040')):
    k.sphere(x, HR - 0.15, 1.02, 0.07, 0.07, col, 'fence_goods', segs=8)                        # whatever she's got today
k.box(HX1 - 0.5, HR - 0.6, 0.96, HX1 - 0.1, HR - 0.2, 1.3, ('#2a1a10', 0.2), 'strongbox')
k.box(HX1 - 0.48, HR - 0.18, 1.08, HX1 - 0.12, HR - 0.17, 1.14, '#c8a040', 'strongbox_lock')
W.lantern(k, HX0 + 0.3, HR - 0.1, 1.3, 1.6, s=0.08, energy=10)
V.board_sign(k, 'NO QUESTIONS', 'IMFellEnglishSC-Regular', (HX0 + HX1) / 2, HR - 0.32, 1.25, size=0.13, board='#2a1a14', ink='#e8c060')
k.solid(HX0 - 0.2, HR - 2.3, HX1 + 0.2, HR)
k.solid(HX0 + 2.0, HR, HX0 + 2.6, HR + 0.6)            # where Vesper stands, at her counter

# ---- the pirates' slip on the west arm: a raider in frame ---------------------------------------------------------------------
sx0, sx1, sr0, sr1 = SLIP
Y.slip_new(k, sx0, sx1, sr0, sr1, 0.05, C.WZ - 0.25, rng, ground=terrain.z)
Y.hull_on_slip(k, (sx0 + sx1) / 2, sr0 + 0.6, sr1 - 0.8, 1.0, 0.25, 1.3, 'frame', sr0, sr1, 0.05, C.WZ - 0.25, rng)
Y.lumber(k, sx1 + 0.4, sx1 + 1.8, sr0 - 0.2, sr0 + 0.8, rng)
k.solid(sx0, sr0 - 0.2, sx1, sr1)
A.barrel(k, sx0 - 0.5, sr0 - 0.6, h=0.75, radius=0.28, tone='#2a2220')                          # pitch
k.cyl(sx0 - 1.2, sr0 - 0.4, 0.0, 0.35, 0.3, ('#2a2a2e', 0.15), 'pitch_pot', verts=12)
k.cone(sx0 - 1.2, sr0 - 0.4, 0.0, 0.12, 0.2, 0.05, EMBER, 'pitch_fire', emit=(EMBER, 2.0), verts=8)
k.point_light(sx0 - 1.2, sr0 - 0.1, 0.5, EMBER, 6, radius=0.15, group='flicker')
k.solid(sx0 - 1.6, sr0 - 1.0, sx0, sr0)
KETTLE = (int(sx1) + 1, int(sr0) + 1)               # Ham Kettle, by his raider
k.solid(KETTLE[0], KETTLE[1], KETTLE[0] + 1, KETTLE[1] + 1)

# ---- the battery at the cove's mouth, the gibbet on the point, a flag ---------------------------------------------------------
for (bx, br) in BATTERY:
    k.box(bx - 0.9, br - 0.5, 0.0, bx + 0.9, br + 0.5, 0.25, ('#5a5050', 0.2), 'battery_wall', bevel=0.03)
    for dx in (-0.45, 0.45):
        k.box(bx + dx - 0.22, br - 0.2, 0.25, bx + dx + 0.22, br + 0.2, 0.42, ('#5a2a1a', 0.2), 'gun_carriage')
        k.tube((bx + dx, br - 0.25, 0.48), (bx + dx, br + 0.7, 0.52), 0.1, ('#1e1e24', 0.1), 'cannon', verts=10)
    for i in range(4):
        k.sphere(bx - 0.6 + (i % 2) * 0.18, br + 0.6 + (i // 2) * 0.16, 0.08, 0.08, 0.08, '#1e1e24', 'shot', segs=8)
    k.solid(bx - 0.9, br - 0.5, bx + 0.9, br + 0.9)
gx, gr = GIBBET
k.cyl(gx, gr, 0.0, 2.6, 0.07, (A.WOOD_DD, 0.18), 'gibbet', verts=8)
k.tube((gx, gr, 2.5), (gx + 0.9, gr, 2.5), 0.06, (A.WOOD_DD, 0.18), 'gibbet', verts=6)
k.tube((gx - 0.05, gr, 1.9), (gx + 0.5, gr, 2.5), 0.04, A.WOOD_DD, 'gibbet', verts=5)
k.cyl(gx + 0.8, gr, 2.0, 2.5, 0.005, '#2a2a2e', 'chain', verts=3)
for i in range(8):                                     # an empty iron cage, swinging a little
    a = i * math.tau / 8
    k.cyl(gx + 0.8 + math.cos(a) * 0.22, gr + math.sin(a) * 0.22, 1.15, 2.0, 0.012, '#2a2a30', 'cage', verts=4)
k.cyl(gx + 0.8, gr, 1.12, 1.18, 0.24, '#2a2a30', 'cage', verts=10)
k.cone(gx + 0.8, gr, 2.0, 2.12, 0.24, 0.02, '#2a2a30', 'cage', verts=10)
k.blob(gx + 0.85, gr, 2.16, 0.09, 0.07, 0.07, '#141018', 'crow', segs=8)
k.solid_post(gx, gr)
I.flagpole(k, 43.0, 30.0, col='#141014')

# ---- the stormwatch on the east headland: a round tower, its storm flags on a mast, the cups on the roof -------------------------
SX, SR = STORM
k.cyl(SX, SR, 0.0, 0.4, 1.35, ('#4a4448', 0.2), 'tower_footing', verts=20)
k.cyl(SX, SR, 0.4, 4.6, 1.15, ('#6a6266', 0.16), 'tower_wall', verts=20)
z = 0.45
while z < 4.5:                                         # coursed: stone bands
    k.cyl(SX, SR, z, z + 0.03, 1.165, '#4a4448', 'tower_course', verts=20)
    z += 0.32
k.cyl(SX, SR, 4.6, 4.85, 1.32, ('#4a4448', 0.16), 'tower_cornice', verts=20)
for i in range(10):                                    # crenels round the roof
    a = i * math.tau / 10
    k.box(SX + math.cos(a) * 1.18 - 0.16, SR + math.sin(a) * 1.18 - 0.16, 4.85, SX + math.cos(a) * 1.18 + 0.16,
          SR + math.sin(a) * 1.18 + 0.16, 5.1, ('#5a5458', 0.16), 'crenel')
W.door(k, SX, SR + 1.12, w=0.7, h=1.25, col='#3a2418')
for (a, z) in ((0.5, 2.4), (2.6, 3.4), (1.6, 3.9)):
    W.window(k, SX + math.cos(a) * 1.0, SR + math.sin(a) * 1.0 + 0.12, z, w=0.3, h=0.42, shutters=None)
k.cyl(SX, SR, 4.85, 6.6, 0.04, '#2a2a30', 'lightning_rod', verts=5)
for i in range(3):                                     # the anemometer: three cups on arms, turning (frozen at one turn)
    a = i * math.tau / 3 + 0.3
    k.tube((SX + 0.4, SR, 5.6), (SX + 0.4 + math.cos(a) * 0.35, SR + math.sin(a) * 0.35, 5.6), 0.015, '#2a2a30', 'anemometer', verts=4)
    k.sphere(SX + 0.4 + math.cos(a) * 0.35, SR + math.sin(a) * 0.35, 5.6, 0.07, 0.07, '#c8a040', 'anemometer_cup', segs=8)
k.cyl(SX + 0.4, SR, 4.85, 5.6, 0.02, '#2a2a30', 'anemometer', verts=4)
MX2, MR2 = SX - 1.9, SR + 0.4                          # the signal mast: a yard, storm cones and a pennant
k.cyl(MX2, MR2, 0.0, 5.2, 0.06, (A.WOOD_D, 0.14), 'signal_mast', verts=8)
k.cyl_x(MX2 - 0.8, MX2 + 0.8, MR2, 4.4, 0.03, 0.03, A.WOOD_D, 'signal_yard', verts=6)
k.cone(MX2 - 0.6, MR2, 3.6, 4.2, 0.01, 0.22, '#1a1a20', 'storm_cone', verts=10)      # the cone point down: a gale from the south
k.cone(MX2 + 0.6, MR2, 3.7, 4.3, 0.22, 0.0, '#1a1a20', 'storm_cone', verts=10)
k.poly([(MX2, MR2, 5.15), (MX2 + 0.9, MR2 + 0.05, 5.0), (MX2, MR2, 4.85)], ('#b02a22', 0.2), 'pennant')
W.lantern(k, MX2, MR2 + 0.05, 2.0, 2.3, s=0.09, energy=12)
k.solid(SX - 1.4, SR - 1.4, SX + 1.4, SR + 1.0)
k.solid_post(MX2, MR2)

# ---- the land's life: ash palms, red pines, dead trees, ember ferns, rocks --------------------------------------------------------
def ash_palm(cx, cr, h=2.6, lean=(0.5, -0.2)):
    """A palm grown on ash: a ringed trunk curving up, a crown of drooping fronds in dark red-green, a cluster of nuts."""
    pts = []
    for i in range(7):
        t = i / 6
        pts.append((cx + lean[0] * t * t, cr + lean[1] * t * t, h * t))
    for i, (p, q) in enumerate(zip(pts, pts[1:])):
        k.tube(p, q, 0.09 - i * 0.008, (shade('#5a4030', 1.0 + 0.08 * (i % 2)), 0.25), 'palm_trunk', verts=7)
    top = pts[-1]
    with k.foliage('leaf'):
        for j in range(9):
            a = j * math.tau / 9 + rng.uniform(-0.2, 0.2)
            L = rng.uniform(0.9, 1.2)
            mid = (top[0] + math.cos(a) * L * 0.55, top[1] + math.sin(a) * L * 0.45, top[2] + 0.15)
            end = (top[0] + math.cos(a) * L, top[1] + math.sin(a) * L * 0.85, top[2] - 0.45)
            col = rng.choice(('#3a4a2a', '#4a3a26', '#2e3e24', '#5a3a28'))
            for (a0, b0) in ((top, mid), (mid, end)):
                side = (-math.sin(a) * 0.14, math.cos(a) * 0.14)
                k.poly([(a0[0] + side[0], a0[1] + side[1], a0[2]), (b0[0] + side[0] * 0.6, b0[1] + side[1] * 0.6, b0[2]),
                        (b0[0] - side[0] * 0.6, b0[1] - side[1] * 0.6, b0[2]), (a0[0] - side[0], a0[1] - side[1], a0[2])],
                       (col, 0.3), 'palm_frond')
    for j in range(3):
        k.sphere(top[0] + rng.uniform(-0.08, 0.08), top[1] + rng.uniform(-0.08, 0.08), top[2] - 0.12, 0.07, 0.07, '#4a3018', 'palm_nut', segs=6)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def ember_fern(cx, cr, s=1.0):
    with k.foliage('leaf'):
        for j in range(6):
            a = j * math.tau / 6 + rng.uniform(-0.3, 0.3)
            k.tube((cx, cr, 0.02), (cx + math.cos(a) * 0.32 * s, cr + math.sin(a) * 0.25 * s, 0.28 * s), 0.035 * s,
                   (rng.choice(('#6a2a1e', '#7a3424', '#5a2418')), 0.3), 'fern', rb=0.006, verts=4)


busy = lambda x, r: pd(x, r) < 1.0
taken = [(x0 - 0.6, rb - 0.6, x1 + 0.6, rf + 1.2) for (x0, x1, rb, rf, dx) in HOUSES + [TAVERN, HARBOUR_SHED]]
taken += [(FENCE[0] - 0.6, FENCE[2] - 2.8, FENCE[1] + 0.6, FENCE[2] + 1.2), (STORM[0] - 2.6, STORM[1] - 1.8, STORM[0] + 1.8, STORM[1] + 2.0),
          (SLIP[0] - 2.0, SLIP[2] - 1.4, SLIP[1] + 2.2, SLIP[3]), (GIBBET[0] - 0.8, GIBBET[1] - 0.8, GIBBET[0] + 1.6, GIBBET[1] + 0.8),
          (TRAIL[0] - 1.6, TRAIL[1] - 1.0, TRAIL[0] + 2.0, TRAIL[1] + 2.4)]
taken += [(bx - 1.2, br - 0.8, bx + 1.2, br + 1.2) for (bx, br) in BATTERY]


def free(x, r, pad=0.0):
    if (int(x), int(r)) not in walk or busy(x, r) or SEA_NEAR.get((int(x), int(r)), 9) < 1.5:
        return False
    return not any(a - pad <= x <= c + pad and b - pad <= r <= d + pad for (a, b, c, d) in taken)


# the arms of the cove: stilt shacks over the water's edge, net racks, crab pots, a pirate market by the fence ----------------
def shack(x0, x1, r0, r1, roof):
    """A fisher's shack of old planking on stilts at the water's edge, a lantern by its door, nets hung on its wall."""
    for (x, r) in ((x0 + 0.1, r1 - 0.1), (x1 - 0.1, r1 - 0.1), (x0 + 0.1, r0 + 0.1), (x1 - 0.1, r0 + 0.1)):
        k.cyl(x, r, -0.8, 0.35, 0.06, (A.WOOD_DD, 0.2), 'stilt', verts=6)
    k.box(x0 - 0.1, r0 - 0.1, 0.3, x1 + 0.1, r1 + 0.3, 0.38, ('#4a3420', 0.2), 'shack_deck')
    z = 0.38
    while z < 1.5:
        k.box(x0, r0, z, x1, r1, z + 0.17, (shade('#5a3e28', rng.uniform(0.8, 1.15)), 0.2), 'shack_plank')
        z += 0.18
    W._gable_roof(k, x0, x1, r0, r1, 1.55, 0.7, roof)
    W.door(k, (x0 + x1) / 2, r1, w=0.55, h=0.95, col='#2a1a10')
    W.lantern(k, (x0 + x1) / 2 + 0.5, r1 + 0.05, 1.1, 1.3, s=0.06, energy=6)
    k.poly([(x0 + 0.1, r1 + 0.02, 1.3), (x0 + 0.7, r1 + 0.02, 1.3), (x0 + 0.65, r1 + 0.05, 0.6), (x0 + 0.15, r1 + 0.05, 0.6)],
           ('#4a5048', 0.3), 'net')
    k.solid(x0 - 0.1, r0 - 0.1, x1 + 0.1, r1 + 0.3)


SHACKS = [(5.4, 7.2, 30.0, 31.4, '#3a2a2a'), (8.2, 9.8, 33.0, 34.2, '#5a2a22'), (49.0, 50.8, 27.6, 29.0, '#2e2a2e')]
for (x0, x1, r0, r1, roof) in SHACKS:
    shack(x0, x1, r0, r1, roof)
    taken.append((x0 - 0.6, r0 - 0.6, x1 + 0.6, r1 + 1.0))
for (x0, x1, r) in ((3.6, 6.0, 26.6), (44.6, 47.0, 21.8)):
    I.drying_rack(k, x0, x1, r)
    taken.append((x0 - 0.3, r - 0.4, x1 + 0.3, r + 0.4))
for (x, r) in ((10.2, 31.0), (51.0, 25.2)):
    I.crab_pots(k, x, r, n=3)
    k.solid(x - 0.3, r - 0.3, x + 1.0, r + 0.4)
    taken.append((x - 0.5, r - 0.5, x + 1.2, r + 0.6))
for (x0, x1, r0, r1, aw, goods) in ((44.2, 46.0, 23.2, 23.9, ('#1a1414', '#b02a22'), 'fish'), (48.0, 49.8, 22.8, 23.5, ('#3a1a3a', '#e0c040'), 'fish')):
    W.market_stall(k, x0, x1, r0, r1, awning=aw, goods=goods)
    taken.append((x0 - 0.4, r0 - 0.6, x1 + 0.4, r1 + 0.6))
for (x, r) in ((4.0, 33.5), (11.6, 35.0), (46.0, 33.0), (52.0, 30.5), (6.0, 35.6)):    # driftwood along the arms' beaches
    x, r = x + rng.uniform(-0.5, 0.5), r + rng.uniform(-0.3, 0.3)
    k.tube((x - 0.5, r - 0.1, 0.06), (x + 0.5, r + 0.15, 0.08), 0.06, ('#8a7a68', 0.3), 'driftwood', verts=6)

palms = []
for i in range(600):
    x, r = rng.uniform(4, 52), rng.uniform(10, 34)
    if len(palms) >= 40:
        break
    if free(x, r) and all(math.hypot(x - a, r - b) > 2.2 for (a, b) in palms):
        palms.append((x, r))
        if r < 14.5 or x > 46 or rng.random() < 0.25:
            I.red_pine(k, x, r, h=rng.uniform(2.0, 2.8))
            k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
        else:
            ash_palm(x, r, h=rng.uniform(2.2, 3.0), lean=(rng.uniform(-0.6, 0.6), rng.uniform(-0.3, 0.1)))
        taken.append((x - 0.6, r - 0.6, x + 0.6, r + 0.6))
for i in range(120):
    x, r = rng.uniform(4, 52), rng.uniform(10, 27)
    if free(x, r, 0.3):
        ember_fern(x, r, s=rng.uniform(0.8, 1.3))
for (x, r, h) in ((9.0, 18.0, 1.8), (45.0, 11.5, 2.0), (19.8, 11.0, 1.6), (6.0, 27.6, 1.5)):
    if free(x, r):
        I.dead_tree(k, x, r, h=h)
        k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
for i in range(30):
    x, r = rng.uniform(5, 50), rng.uniform(9.5, 13.5)
    if free(x, r, 0.4):
        s = rng.uniform(0.25, 0.5)
        k.rock(x, r, s * 0.25, s, s * 0.8, s * 0.7, ('#3a3034', 0.22), part='boulder')
        if s > 0.4:
            k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# ---- small life on the boardwalk and round the doors ---------------------------------------------------------------------------
I.campfire(k, 25.0, 23.7, energy=50)                      # the pirates' bonfire in the square, log seats round it
I.log_seat(k, 24.2, 25.8, 24.55)
k.solid(24.4, 23.2, 25.6, 24.2)
AX, AR = 32.6, 23.6                                    # a great anchor laid on the boards, off some ship of the line
k.tube((AX - 0.9, AR, 0.08), (AX + 0.9, AR, 0.08), 0.07, '#2a2a30', 'anchor', verts=8)
k.tube((AX - 0.8, AR - 0.45, 0.07), (AX - 0.8, AR + 0.45, 0.07), 0.06, '#2a2a30', 'anchor', verts=8)
for s_ in (-1, 1):
    k.tube((AX + 0.9, AR, 0.08), (AX + 1.2, AR + s_ * 0.5, 0.08), 0.06, '#2a2a30', 'anchor', verts=8)
k.cyl_y(AX - 1.05, AR - 0.08, AR + 0.08, 0.14, 0.14, 0.14, '#2a2a30', 'anchor', verts=10)
k.solid(AX - 1.0, AR - 0.3, AX + 1.2, AR + 0.3)
for (cx, cr) in ((24.0, 22.5), (34.6, 23.1), (16.6, 23.2)):
    A.crate(k, cx, cr, s=0.5)
    A.crate(k, cx + 0.05, cr + 0.05, s=0.38, z0=0.5, solid=False)
for (cx, cr) in ((26.4, 22.6), (37.1, 22.6)):
    A.barrel(k, cx, cr, h=0.7, radius=0.25, tone='#5a3a22')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
for i in range(3):                                      # rum kegs racked by the tavern
    A.barrel(k, 17.0 + i * 0.5, 22.7, h=0.45, radius=0.22, upright=False, tone='#6a3a1e')
k.solid(16.7, 22.4, 18.3, 23.0)
V.sacks(k, 32.4, 22.8, n=3, col=('#c8b090', '#b8a080', '#a89070'))
k.solid(32.0, 22.5, 32.9, 23.1)
for (x0, x1, r) in ((29.6, 31.4, 23.6),):               # nets drying over the rail
    k.poly([(x0, QUAY + 0.92, 0.55), (x1, QUAY + 0.92, 0.55), (x1, QUAY + 0.98, 0.2), (x0, QUAY + 0.98, 0.2)], ('#4a5048', 0.3), 'net')
W.rowboat(k, 40.0, 42.0, 27.4, beam=0.8, hull='#2a1a14')                                       # drawn up on the east beach
k.solid(40.0, 27.0, 42.0, 27.9)
W.rowboat(k, 7.4, 9.4, 28.4, beam=0.8, hull='#3a1a14')
k.solid(7.4, 28.0, 9.4, 28.9)
W.wanted_poster(k, 28.0, 21.9)
k.blob(21.4, 22.6, 0.1, 0.12, 0.08, 0.08, '#d07030', 'cat', segs=10)                           # a ship's cat, ginger, one ear short
k.sphere(21.5, 22.65, 0.18, 0.07, 0.06, '#d07030', 'cat', segs=8)
for (x, r) in ((25.0, 24.5), (32.0, 24.6)):                                                       # gulls on the boardwalk
    k.blob(x, r, 0.08, 0.09, 0.05, 0.06, '#f0f0ec', 'gull', segs=8)
    k.cone(x + 0.1, r, 0.1, 0.1, 0.02, 0.0, '#e0a030', 'gull', verts=4)

I.fishing_jetty(k, FJ, FLEN, 's', glow='#ff7040')
I.tufts(k, [c for c in walk if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark', 'moor')], '#5a3a2a', per_cell=1.0,
        avoid=busy, flowers=0.25)
I.pebbles(k, walk, '#4a4044', per_cell=0.25, avoid=busy)

# ---- light ------------------------------------------------------------------------------------------------------------------
k.area_light(28.0, 16.0, 16.0, '#8a90c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))           # moonlight
k.point_light(28.0, 22.0, 4.0, '#ffc890', 70, radius=1.6)
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#3a2430', 0.75))


# ---- the world ------------------------------------------------------------------------------------------------------------------
def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


tx0, tx1, trb, trf, tdx = TAVERN
w = {'name': 'Cinder Key', 'sea': 'crimson', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY - 1]}, 'moonColor': '#f0c8c0', 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': PX, 'y': QUAY + 3, 'type': 'go_sailing', 'label': 'DOCK', 'prompt': 'PRESS E TO GO SAILING'},
         {'x': int(tdx), 'y': int(trf), 'type': 'enter_world', 'target': 'lumar-cinder-tavern', 'spawn': [8, 10], 'label': 'THE SALT RAT',
          'prompt': 'PRESS E TO GO IN'},
         {'x': int(STORM[0]), 'y': int(STORM[1] + 1.2), 'type': 'enter_world', 'target': 'lumar-cinder-stormwatch', 'spawn': [6, 10],
          'label': 'STORMWATCH', 'prompt': 'PRESS E TO GO IN'},
         {'x': int(TRAIL[0]), 'y': int(TRAIL[1]), 'type': 'enter_world', 'target': 'lumar-cinder-volcano', 'spawn': [22, 35],
          'label': 'THE CRATER TRAIL', 'prompt': 'PRESS E TO CLIMB'},
         {'x': int(TRAIL[0]) + 1, 'y': int(TRAIL[1]), 'type': 'enter_world', 'target': 'lumar-cinder-volcano', 'spawn': [22, 35],
          'label': 'THE CRATER TRAIL', 'prompt': 'PRESS E TO CLIMB'},
         {'x': int(FENCE[0] + 2), 'y': int(FENCE[2]), 'type': 'dialog', 'label': 'THE FENCE', 'prompt': 'PRESS E TO TALK',
          'dialog': 'A WOMAN BEHIND A COUNTER MADE OF A SHIP\'S GUNWALE, UNDER A HULL TURNED KEEL-UP. "WHATEVER IT IS, I\'VE SEEN WORSE. WHAT ARE YOU SELLING?"'},
         {'x': KETTLE[0], 'y': KETTLE[1], 'type': 'dialog', 'label': 'SHIPWRIGHT', 'prompt': 'PRESS E TO TALK',
          'dialog': 'A BIG MAN IN A BLUE BANDANA, PITCH TO THE ELBOWS, LOOKING AT HIS RAIDER LIKE SHE OWES HIM MONEY.'},
         look('THE WRECK', 20, 29, "A GALLEON ON HER SIDE IN THE SHALLOWS, HER MASTS SNAPPED, HER GUNPORTS FULL OF WEED.\n\nTHE CROWN'S NAVY "
              "SANK HER HERE TWENTY YEARS AGO TO CLOSE THE COVE. THE PIRATES MOVED IN THE FOLLOWING WEEK."),
         look('OLD MAST', 36, 31, "A MAST STANDING STRAIGHT UP OUT OF THE WATER, A YARD ACROSS IT, A RAG OF SAIL. A GULL KEEPS IT.\n\n"
              "WHATEVER SHE WAS, SHE WENT DOWN UPRIGHT."),
         look('GUN BATTERY', int(BATTERY[0][0]), int(BATTERY[0][1]) - 1, "TWO OLD GUNS BEHIND A STONE WALL, AIMED AT THE COVE'S MOUTH. "
              "ONE IS LOADED. NOBODY WILL SAY WHICH."),
         look('GUN BATTERY', int(BATTERY[1][0]), int(BATTERY[1][1]) - 1, "TWO MORE GUNS ON THE EAST ARM. THE SHOT STACKED BESIDE THEM "
              "HAS GONE RUSTY. THE GUNNER HASN'T."),
         look('GIBBET', int(GIBBET[0]) + 1, int(GIBBET[1]) + 1, "AN EMPTY IRON CAGE SWINGING ON THE POINT, A CROW ON TOP.\n\n"
              "\"FOR CHEATS,\" SAYS A PAINTED BOARD. \"NOT YET NEEDED THIS YEAR.\""),
         look('THE SLIP', int(SLIP[1]) + 1, int(SLIP[2]), "THE PIRATES' SLIP: A RAIDER IN FRAME, HER RIBS UP LIKE A FISH'S, A POT OF PITCH "
              "SMOKING BESIDE IT. WHOEVER IS BUILDING HER IS IN NO HURRY AND HAS NO PLANS ON PAPER."),
         look('WANTED', 28, 21, "WANTED POSTERS, LAYERS DEEP. THE NEWEST HAS A DRAWING OF A SLOOP THAT LOOKS A LOT LIKE YOURS.\n\n"
              "THE REWARD HAS BEEN CROSSED OUT AND 'TOO SMALL' WRITTEN UNDERNEATH."),
         look('STORM FLAGS', int(STORM[0] - 2), int(STORM[1] + 1), "THE STORMWATCH'S MAST: TWO BLACK CONES ON THE YARD AND A RED "
              "PENNANT. CONES UP, A GALE FROM THE NORTH; CONES DOWN, FROM THE SOUTH; ONE OF EACH, SQUALLS ALL ROUND."),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FJET, scene_id=WID,
            actors=[{'sheet': 'npc-fence', 'x': int(FENCE[0] + 2), 'y': int(FENCE[2]), 'facing': 'down'},
                    {'sheet': 'npc-kettle', 'x': KETTLE[0], 'y': KETTLE[1], 'facing': 'left'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE})
w = json.load(open(WORLD))
for r in range(ROWS):                     # only the island is ground: no walking on the sea
    for c in range(COLS):
        if (c, r) not in walk and (c, r) not in PIER and (c, r) not in FJET:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('cinder done; pier', QUAY, 'ship row', SHIP_R, 'walkable', len(walk))
