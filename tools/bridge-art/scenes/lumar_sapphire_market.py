"""The floating market at Sapphire Port (world id "lumar-sapphire-market"). Workstream B1.

  BVENV/bin/python tools/bridge-art/scenes/lumar_sapphire_market.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-sapphire-market

Sapphire, the merchants' sea. Through the gate at the east end of Sapphire Port's quay, the old inner basin: every dusk
the traders lash their boats together into one floating street — two broad barges for its squares, caiques and
longboats moored all round them under striped awnings, plank bridges between, strings of lanterns from mast to mast —
and buy whatever a captain's found. Along the quay behind it, the Sapphire Glassworks: its brick cone smoking over
the rooftops, the furnace glowing through the great arched door, and the glass shop beside it, its bay windows full of
blue glass.

  rows 0-3   the glassworks, the glass shop, the warehouse (their fronts on row 4)
  rows 4-7   the quay: the gate back to Sapphire Port at its west end
  rows 8-25  the basin: the plank walk out from the quay, the north barge, a bridge, the south barge, the trader boats
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_house as HK              # noqa: E402
import assets_cliff as CL              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-sapphire-market'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 36, 26
k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, margin_x=0.0, seed=3301)
rng = k.rng
C45 = math.cos(math.radians(45))
WZ = -0.42                                   # the basin's surface
Q = 8.0                                      # the quay's edge (row)
STONE = '#7a7e88'
SLATE = '#3a4a5a'

# ---- the quay -----------------------------------------------------------------------------------------------------
k.box(-1.0, -3.0, -0.6, COLS + 1.0, Q, -0.01, ('#3a3a42', 0.1), 'ground')
HK.street(k, -0.5, 4.0, COLS + 0.5, Q - 0.3)
x = -0.5
while x < COLS + 0.5:                                          # the coping along the edge
    w_ = rng.uniform(0.55, 0.95)
    k.box(x + 0.015, Q - 0.3, -0.04, x + w_ - 0.015, Q + 0.02, 0.05, (shade('#a8a49a', rng.uniform(0.88, 1.08)), 0.14), 'quay_coping', bevel=0.025)
    x += w_
z = -0.06
i = 0
while z > WZ - 0.5:                                            # coursed blocks down to the water, wet at the waterline
    h_ = rng.uniform(0.18, 0.24)
    x = -0.5 - (0.25 if i % 2 else 0.0)
    while x < COLS + 0.5:
        w_ = rng.uniform(0.42, 0.78)
        wet = max(0.0, min(1.0, (WZ + 0.2 - z) / 0.25))
        k.box(x + 0.02, Q - 0.02, z - h_ + 0.02, x + w_ - 0.02, Q + 0.04, z, (W._mix(shade(STONE, rng.uniform(0.8, 1.0)), '#2e3a40', 0.6 * wet), 0.16),
              'quay_wall', bevel=0.02)
        x += w_
    z -= h_
    i += 1
for (bx) in (3.5, 8.0, 12.5, 23.5, 28.0, 32.5):
    k.cyl(bx, Q - 0.45, 0.0, 0.32, 0.11, ('#2a2a30', 0.1), 'bollard', verts=10)
    k.cyl(bx, Q - 0.45, 0.32, 0.37, 0.14, '#2a2a30', 'bollard_cap', verts=10)
    k.solid(bx - 0.2, Q - 0.65, bx + 0.2, Q - 0.25)

# the basin: still water inside the walls, a breakwater across the south with a gap to the sea
k.box(-1.0, Q, WZ - 1.2, COLS + 1.0, ROWS + 1.5, WZ - 0.9, ('#1a2a3a', 0.2), 'seabed')
k.box(-1.0, Q, WZ - 0.06, COLS + 1.0, ROWS + 1.5, WZ, '#1e4a6a', 'pond_water')
for (x0, x1) in ((-1.0, 13.0), (22.0, COLS + 1.0)):
    k.box(x0, 24.3, WZ - 0.8, x1, 25.4, 0.12, ('#6a6e78', 0.2), 'breakwater', bevel=0.04)
    xx = x0
    while xx < x1:
        w_ = rng.uniform(0.5, 0.9)
        k.box(xx + 0.02, 24.28, 0.1, min(x1, xx + w_) - 0.02, 25.42, 0.2, (shade('#a8a49a', rng.uniform(0.85, 1.05)), 0.15), 'breakwater_coping', bevel=0.02)
        xx += w_
for (lx) in (12.6, 22.4):                                    # the gap's two lamps
    k.cyl(lx, 24.85, 0.2, 1.3, 0.12, ('#e8e4dc', 0.15), 'harbour_light', verts=12)
    k.cyl(lx, 24.85, 1.3, 1.5, 0.15, '#2a2a30', 'harbour_light_cap', verts=12)
    k.cyl(lx, 24.85, 1.32, 1.46, 0.1, '#103060', 'harbour_light_lamp', emit=('#80b0ff', 1.0), verts=10)
    k.point_light(lx, 25.2, 1.4, '#80b0ff', 20, radius=0.15)
for i in range(40):                                          # weed at the waterline along the quay
    k.blob(rng.uniform(0, COLS), Q + 0.06, WZ + rng.uniform(0.0, 0.1), rng.uniform(0.06, 0.14), 0.03, 0.04,
           (rng.choice(('#2a3a3a', '#2e4040', '#3e4a40')), 0.2), 'weed', segs=6)

# ---- the buildings along the quay -------------------------------------------------------------------------------
HK.install()
F = 4.0                                                      # the fronts
# the Sapphire Glassworks: a brick cone over the furnace, a long hall in front with a great arched door
GX0, GX1 = 2.0, 11.0
k.box(GX0, 0.2, -0.02, GX1, F, 2.2, ('#8a5a48', 0.18), 'glassworks_wall', bevel=0.04)
zz = 0.25
i = 0
while zz < 2.15:                                             # brick courses on the hall's face
    xx = GX0 + (0.0 if i % 2 else 0.12)
    rects = []
    while xx < GX1 - 0.05:
        rects.append((xx + 0.01, F - 0.01, zz + 0.01, min(GX1, xx + 0.24) - 0.01, F + 0.015, zz + 0.1))
        xx += 0.25
    k.boxes(rects, (shade('#9a6a52', 1.0 + 0.06 * ((i * 5) % 3 - 1)), 0.2), 'brick')
    zz += 0.11
    i += 1
k.box(GX0 - 0.05, F - 0.02, -0.02, GX1 + 0.05, F + 0.04, 0.3, ('#7a7468', 0.2), 'footing', bevel=0.02)
W._gable_roof(k, GX0, GX1, 0.2, F, 2.2, 1.1, SLATE)
# the great arched door, the furnace's glow inside
GD = 5.0
k.box(GD - 0.9, F - 0.05, 0.0, GD + 0.9, F + 0.06, 1.55, ('#a8a49a', 0.15), 'door_reveal', bevel=0.03)
k.cyl_y(GD, F - 0.05, F + 0.06, 1.55, 0.9, 0.55, ('#a8a49a', 0.15), 'door_reveal', verts=18)
k.box(GD - 0.72, F - 0.02, 0.0, GD + 0.72, F + 0.07, 1.5, '#2a1006', 'furnace_glow', emit=('#ff8a30', 0.75))
k.cyl_y(GD, F - 0.02, F + 0.07, 1.5, 0.72, 0.42, '#2a1006', 'furnace_glow', emit=('#ff8a30', 0.75), verts=16)
k.point_light(GD, F + 0.8, 0.8, '#ff9a40', 90, radius=0.5, group='flicker')
k.point_light(GD, F - 0.6, 0.8, '#ff8a30', 60, radius=0.4, group='flicker')
for wx in (3.0, 7.6, 9.6):
    CL.deep_window(k, wx, F + 0.02, 0.9, w=0.5, h=0.7, shutters=None, arch=True)
W.hanging_sign(k, 8.6, F, 1.9, icon='compass')
# the cone: a tall brick cone rising out of the roof, smoke at its mouth
CX, CR = 6.6, 1.6
k.cone(CX, CR, 1.8, 5.6, 1.6, 0.45, ('#8a5440', 0.25), 'cone_brick', verts=28)
for j in range(6):                                           # iron bands round it
    zb = 2.2 + j * 0.55
    rr = 1.6 - (1.6 - 0.45) * (zb - 1.8) / 3.8
    k.cyl(CX, CR, zb, zb + 0.05, rr + 0.02, '#2a2a30', 'cone_band', verts=28)
k.cyl(CX, CR, 5.55, 5.7, 0.5, '#2a1a14', 'cone_mouth', verts=16)
k.cyl(CX, CR, 5.6, 5.66, 0.38, '#3a1206', 'cone_glow', emit=('#ff6a20', 0.6), verts=14)
SMOKE = [[CX, round(CR - 5.8 * C45, 3)]]

# the glass shop: a bay window of blue glass on the quay
HK.rich_house(k, 11.8, 16.6, 0.8, F, wall_h=2.0, rise=1.2, roof=SLATE, wall='#d8d4c8', door_x=15.6,
              windows_up=[(13.0, 1.55), (15.2, 1.55)], chimney=12.4, sign=(16.45, 1.6, 'compass'))
HK.bay_shop(k, 12.2, 14.8, F, goods=('#2a5ad8', '#5a8ae8', '#8ab0f0', '#2a8a9a', '#e8f0ff'))
# the warehouse with its hoist, and two tall merchant houses
HK.rich_house(k, 17.4, 22.6, 0.4, F, wall_h=2.6, rise=1.2, roof='#3a4a5a', wall='#8a8a90', door_x=20.0,
              windows=[(18.2, 1.0), (21.8, 1.0)], windows_up=[(20.0, 1.9)], stone=True)
k.box(19.2, F, 0.0, 20.8, F + 0.06, 1.6, ('#4a3420', 0.12), 'warehouse_doors')
k.box(19.95, F - 0.1, 2.4, 20.05, F + 0.6, 2.5, A.WOOD_D, 'hoist_beam')
k.tube((20.0, F + 0.55, 2.4), (20.0, F + 0.55, 1.2), 0.012, '#8a7450', 'hoist_rope', verts=4)
A.crate(k, 20.0, F + 0.55, s=0.4, tone=A.WOOD_L)
HK.rich_house(k, 23.4, 27.8, 0.8, F, wall_h=2.3, rise=1.3, roof='#2a4a7a', wall='#e0d8c8', door_x=25.6,
              windows=[(24.3, 0.9), (26.9, 0.9)], windows_up=[(24.3, 1.7), (26.9, 1.7)], chimney=27.2, lanterns=(25.0, 26.2))
HK.rich_house(k, 28.6, 34.0, 1.0, F, wall_h=2.0, rise=1.2, roof=SLATE, wall='#c8c4b8', door_x=30.4,
              windows=[(29.3, 0.85), (32.0, 0.85), (33.3, 0.85)], windows_up=[(31.3, 1.5)], chimney=33.4)
k.solid(0, 0, COLS, 4)
# street life along the quay
for (cx_, cr_) in ((1.0, 5.0), (16.9, 4.6), (34.6, 4.8)):
    HK.barrels(k, cx_, cr_)
    k.solid(cx_ - 0.4, cr_ - 0.4, cx_ + 0.4, cr_ + 0.4)
A.crate(k, 22.9, 4.4, s=0.5, tone=A.WOOD_L)
A.crate(k, 23.0, 4.5, s=0.36, tone=A.WOOD)
k.solid(22.5, 4.2, 23.4, 5.0)
for (lx) in (2.4, 10.2, 17.0, 27.0, 33.6):
    W.lantern_post(k, lx, 7.2, energy=26)
    k.solid_post(lx, 7.2)
W.street_clutter(k, (0.0, 4.2, 36.0, 7.6), seed=331)
# the gate back to Sapphire Port: an arch at the west end of the quay
k.box(-0.6, 4.0, 0.0, -0.1, 7.8, 2.3, ('#8a8478', 0.18), 'gate_pier', bevel=0.04)

# ---- the floating market ----------------------------------------------------------------------------------------
WALK_X = (17, 18)                                            # the plank walk out from the quay (columns)
BARGE_N = (11.0, 25.0, 10.0, 13.9)                           # x0, x1, r0, r1 (the deck)
BARGE_S = (9.0, 27.0, 17.0, 20.9)
BRIDGE_X = (17, 18)


def deck(x0, x1, r0, r1, z=0.08, tone='#8a6a44'):
    """A barge: a black-tarred hull down to the water, its deck of planks running across, a low rail."""
    k.box(x0 - 0.15, r0 - 0.15, WZ - 0.25, x1 + 0.15, r1 + 0.15, z - 0.06, ('#2a2420', 0.2), 'barge_hull', bevel=0.08)
    k.box(x0 - 0.18, r1 + 0.05, WZ + 0.05, x1 + 0.18, r1 + 0.2, WZ + 0.18, ('#7a2a1a', 0.2), 'barge_wale')
    r = r0
    rects = {}
    while r < r1:
        t = rng.randrange(3)
        rects.setdefault(t, []).append((x0, r + 0.015, z - 0.06, x1, min(r1, r + 0.32) - 0.015, z))
        r += 0.33
    for t, rs in rects.items():
        k.boxes(rs, (shade(tone, (0.9, 1.0, 1.1)[t]), 0.15), 'deck')


def plank_walk(x0, x1, r0, r1, z=0.06):
    rr = r0
    while rr < r1:
        k.box(x0, rr + 0.02, z - 0.06, x1, min(r1, rr + 0.3) - 0.02, z, (shade('#7a5a3a', rng.uniform(0.85, 1.1)), 0.15), 'deck')
        rr += 0.32
    for xx in (x0 + 0.05, x1 - 0.05):                         # rope rails on stanchions
        rr = r0 + 0.2
        while rr < r1:
            k.cyl(xx, rr, z, z + 0.55, 0.03, A.WOOD_D, 'stanchion', verts=6)
            rr += 1.0
        k.tube((xx, r0 + 0.2, z + 0.5), (xx, r1 - 0.2, z + 0.5), 0.015, '#a08a60', 'rope_rail', verts=4)
    for xx in (x0 + 0.1, x1 - 0.1):                           # piles where it crosses open water
        rr = r0 + 0.5
        while rr < r1:
            k.cyl(xx, rr, WZ - 0.4, z - 0.05, 0.06, ('#3a2a1a', 0.2), 'pile', verts=8)
            rr += 1.5


plank_walk(WALK_X[0] + 0.05, WALK_X[1] + 0.95, Q - 0.1, BARGE_N[2] + 0.1)
deck(*BARGE_N)
plank_walk(BRIDGE_X[0] + 0.05, BRIDGE_X[1] + 0.95, BARGE_N[3] - 0.1, BARGE_S[2] + 0.1)
deck(*BARGE_S, tone='#7e6040')

# the trader boats moored all round the barges: a striped awning on poles, their goods, a lantern each
TRADERS = [
    # (centre x, centre row, length along x, awning colours, goods, trader label, trader tile)
    (8.6, 11.9, 3.0, ('#2a4a9a', '#e8e8f0'), 'fish', 'NERYS', (10, 11)),
    (27.0, 11.9, 3.0, ('#c0a040', '#e8e8f0'), 'crystal', 'KASSIA', (25, 11)),
    (13.0, 9.0, 2.6, ('#e8e8f0', '#a03a2e'), 'spice', 'THEO', (13, 9)),
    (6.6, 19.0, 3.0, ('#5a3a6a', '#e8d8b8'), 'curio', 'OLD DORAN', (8, 19)),
    (29.4, 19.0, 3.0, ('#2a8a9a', '#e8e8f0'), 'glass', 'LYRA', (27, 19)),
    (18.0, 22.4, 3.4, ('#a03a2e', '#e8dcc0'), 'fruit', 'MELINA', (18, 21)),
]
GOODS = {'fish': ('#a8b8c0', '#c8a080', '#8a9aa0', '#5a7ab0'), 'crystal': ('#4080f0', '#f080b0', '#e04060', '#b48cff'),
         'spice': ('#c84a3a', '#e0b040', '#8a5a2a', '#e8e0c8'), 'curio': ('#d0a048', '#8a6a3a', '#5a8a7a', '#e8dcc0'),
         'glass': ('#2a5ad8', '#5a8ae8', '#8ab0f0', '#2a8a9a'), 'fruit': ('#e04a2a', '#e0b040', '#5a8a3a', '#c86a2a')}


def trader_boat(cx, cr, L, awning, goods):
    """A longboat lashed alongside (her length across the screen): a painted hull, a striped awning on four poles, the
    goods in crates and baskets under it, a lantern hung from the ridge."""
    hull = rng.choice(('#2a5ad8', '#7a2a1a', '#2a6a5a', '#e8e4dc', '#c89a28'))
    k.blob(cx, cr, WZ + 0.22, L / 2, 0.55, 0.32, (hull, 0.14), 'boat_hull', segs=20)
    k.blob(cx, cr, WZ + 0.42, L / 2 - 0.15, 0.45, 0.08, '#2a1a0a', 'boat_inside', segs=18)
    k.box(cx - L / 2 + 0.3, cr - 0.4, WZ + 0.42, cx + L / 2 - 0.3, cr + 0.4, WZ + 0.48, ('#7a5a3a', 0.15), 'deck')
    zt = WZ + 1.75
    for dx in (-L / 2 + 0.45, L / 2 - 0.45):
        for dr in (-0.35, 0.35):
            k.cyl(cx + dx, cr + dr, WZ + 0.45, zt, 0.03, A.WOOD_D, 'awning_pole', verts=6)
    n = 8
    for j in range(n):                                       # the awning: stripes across, a gentle pitch
        xa = cx - L / 2 + 0.35 + (L - 0.7) * j / n
        xb = cx - L / 2 + 0.35 + (L - 0.7) * (j + 1) / n
        col = awning[j % 2]
        k.quads([((xa, cr - 0.5, zt - 0.08), (xb, cr - 0.5, zt - 0.08), (xb, cr, zt + 0.12), (xa, cr, zt + 0.12)),
                 ((xa, cr, zt + 0.12), (xb, cr, zt + 0.12), (xb, cr + 0.5, zt - 0.08), (xa, cr + 0.5, zt - 0.08))], (col, 0.3), 'awning')
        k.box(xa, cr + 0.48, zt - 0.22, xb, cr + 0.52, zt - 0.08, (col, 0.3), 'awning_valance')
    cols = GOODS[goods]
    for j in range(int(L / 0.55)):                           # crates and baskets along her
        gx = cx - L / 2 + 0.55 + j * 0.55
        if goods in ('fish', 'fruit', 'spice'):
            k.cyl(gx, cr - 0.1, WZ + 0.48, WZ + 0.68, 0.2, ('#a8844a', 0.3), 'basket', verts=10)
            for q in range(5):
                k.sphere(gx + rng.uniform(-0.12, 0.12), cr - 0.1 + rng.uniform(-0.1, 0.1), WZ + 0.7 + rng.uniform(0, 0.05), 0.06, 0.05,
                         (rng.choice(cols), 0.3), 'goods', segs=6)
        elif goods == 'crystal':
            A.crate(k, gx, cr - 0.05, s=0.36, tone=A.WOOD_L)
            for q in range(3):
                k.cone(gx + rng.uniform(-0.1, 0.1), cr - 0.05 + rng.uniform(-0.08, 0.08), WZ + 0.84, WZ + 1.1, 0.05, 0.0,
                       '#1a2a6a', 'crystal', emit=(rng.choice(cols), 0.8), verts=5)
        elif goods == 'glass':
            k.box(gx - 0.22, cr - 0.25, WZ + 0.48, gx + 0.22, cr + 0.15, WZ + 0.62, ('#6a4a2a', 0.2), 'shelf')
            for q in range(3):
                k.sphere(gx - 0.14 + q * 0.14, cr - 0.05, WZ + 0.72, 0.06, 0.08, '#1a3a6a', 'glass_float', emit=(rng.choice(cols), 0.35), segs=8)
        else:
            A.crate(k, gx, cr - 0.05, s=0.34, tone=rng.choice((A.WOOD_L, A.WOOD)))
            k.box(gx - 0.08, cr - 0.12, WZ + 0.82, gx + 0.08, cr + 0.02, WZ + 0.94, (rng.choice(cols), 0.2), 'curio')
    W.lantern(k, cx, cr + 0.1, zt - 0.45, zt - 0.2, s=0.08, energy=10)


for (cx_, cr_, L, aw, goods, lab, tile) in TRADERS:
    trader_boat(cx_, cr_, L, aw, goods)
    k.solid(cx_ - L / 2, cr_ - 0.55, cx_ + L / 2, cr_ + 0.55)

# caiques and a rowboat tied up round the edge of the basin
for (bx, br, L, hull) in ((3.0, 15.5, 1.9, CL.BLUE), (33.0, 15.0, 2.0, '#e8e4dc'), (31.4, 22.4, 1.7, '#c8402e'), (4.0, 22.0, 1.8, '#2a8a9a')):
    sp_, sl_ = len(k.parts), len(k.lights)
    CL.caique(k, bx, br, length=L, hull=hull)
    I.pose(k, sp_, (bx, br, 0), dz=WZ + 0.1, lights_since=sl_)

# lanterns strung from the barges' masts: a forest of thin masts, lines of paper lanterns between them
MASTS = [(11.4, 10.4), (24.6, 10.4), (11.4, 13.5), (24.6, 13.5), (9.4, 17.4), (26.6, 17.4), (9.4, 20.5), (26.6, 20.5), (18.0, 15.5)]
for (mx, mr) in MASTS:
    k.cyl(mx, mr, 0.05, 3.0, 0.045, ('#5a3a22', 0.2), 'mast', verts=8)
    k.solid_post(mx, mr)
LINES = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (2, 8), (3, 8), (8, 4), (8, 5)]
LCOLS = ('#ffb040', '#ff7040', '#ffd870', '#ff9ac0', '#80c8ff')
for (a, b) in LINES:
    (ax, ar), (bx, br) = MASTS[a], MASTS[b]
    n = max(3, int(math.hypot(bx - ax, br - ar) / 1.1))
    pts = []
    for j in range(n + 1):
        t = j / n
        pts.append((ax + (bx - ax) * t, ar + (br - ar) * t, 2.9 - 0.5 * math.sin(math.pi * t)))
    for p0, p1 in zip(pts, pts[1:]):
        k.tube(p0, p1, 0.008, '#2a2a2c', 'lantern_line', verts=3)
    for j in range(1, n):
        x_, r_, z_ = pts[j]
        col = LCOLS[(a * 7 + b * 3 + j) % len(LCOLS)]
        k.sphere(x_, r_, z_ - 0.16, 0.11, 0.14, '#3a1a08', 'paper_lantern', emit=(col, 0.9), segs=8)
        if j % 2 == 0:
            k.point_light(x_, r_, z_ - 0.4, col, 8, radius=0.12, group='flicker')
# rope lashings between boats and barges, fenders
for (cx_, cr_, L, aw, goods, lab, tile) in TRADERS:
    k.tube((cx_, cr_ - 0.3, WZ + 0.5), (cx_ + (1 if cx_ < 18 else -1) * (L / 2 + 0.3), cr_ - 0.3, 0.05), 0.015, '#a08a60', 'lashing', verts=4)
for (x0, x1, r0, r1) in (BARGE_N, BARGE_S):
    xx = x0 + 0.4
    while xx < x1:
        k.cyl_y(xx, r1 + 0.15, r1 + 0.3, WZ + 0.12, 0.09, 0.12, ('#5a4a3a', 0.3), 'fender', verts=8)
        xx += 1.6
# on the barges: a brazier, tables, sacks, the auctioneer's crate
for (x_, r_) in ((15.0, 11.2), (21.4, 12.6), (12.4, 19.6), (23.2, 18.2)):
    A.barrel(k, x_, r_, h=0.6, radius=0.24)
    k.solid(x_ - 0.3, r_ - 0.3, x_ + 0.3, r_ + 0.3)
k.cyl(18.0, 19.4, 0.08, 0.5, 0.25, ('#3a3a40', 0.2), 'brazier', verts=12)
k.cyl(18.0, 19.4, 0.48, 0.55, 0.2, '#3a1206', 'brazier_coals', emit=('#ff7a30', 0.9), verts=12)
k.point_light(18.0, 19.4, 0.9, '#ff9a40', 30, radius=0.2, group='flicker')
k.solid(17.6, 19.0, 18.4, 19.8)

# ---- light --------------------------------------------------------------------------------------------------------
k.area_light(18.0, 12.0, 14.0, '#8a98d0', 1400, 30.0, rot=(math.radians(-35), 0, 0))
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('MARKET_SAMPLES', 96)), world_light=('#26344e', 0.8))

# ---- the world ----------------------------------------------------------------------------------------------------
WALK = set()
for c in range(0, COLS):
    for r in range(4, 8):
        WALK.add((c, r))
for c in WALK_X:
    for r in range(8, int(BARGE_N[2])):
        WALK.add((c, r))
for (x0, x1, r0, r1) in (BARGE_N, BARGE_S):
    for c in range(int(math.ceil(x0)), int(math.floor(x1))):
        for r in range(int(math.ceil(r0)), int(math.floor(r1)) + 1):
            WALK.add((c, r))
for c in BRIDGE_X:
    for r in range(int(BARGE_N[3]) + 1, int(BARGE_S[2])):
        WALK.add((c, r))


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'The Floating Market', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
     'spawns': {'player': [1, 6]}, 'moonColor': [50, 100, 180], 'shipExit': False,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': 0, 'y': 5, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire', 'leaveSpawn': [44, 22], 'label': 'SAPPHIRE PORT', 'prompt': 'PRESS E TO GO BACK'},
         {'x': 0, 'y': 6, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire', 'leaveSpawn': [44, 22], 'label': 'SAPPHIRE PORT', 'prompt': 'PRESS E TO GO BACK'},
         {'x': 5, 'y': 4, 'type': 'enter_world', 'target': 'lumar-sapphire-glassworks', 'spawn': [8, 9], 'label': 'GLASSWORKS', 'prompt': 'PRESS E TO GO IN'},
         {'x': 13, 'y': 4, 'type': 'vendor', 'label': 'GLASS SHOP', 'prompt': 'PRESS E TO BROWSE',
          'items': [{'id': 'glass_float', 'price': 28}, {'id': 'caldera_lantern', 'price': 34}, {'id': 'glass', 'price': 22}]},
         look('THE CONE', 7, 4, 'THE GLASSWORKS\' CONE: A BRICK CHIMNEY AS WIDE AS A HOUSE AT ITS FOOT, NARROWING TO A RED MOUTH OVER THE ROOFTOPS. THE FURNACE UNDER IT HAS NOT GONE OUT IN NINETY YEARS, THEY SAY.\n\nTHE HEAT COMES OUT OF THE GREAT DOOR LIKE A HAND ON YOUR CHEST.'),
         look('WAREHOUSE', 20, 4, 'CRATES STENCILLED "SAPPHIRE GLASSWORKS - THIS WAY UP - FRAGILE - NO, REALLY". A HOIST CREAKS OVERHEAD.'),
         look('THE BASIN', 18, 7, 'THE OLD INNER BASIN. EVERY DUSK THE TRADERS ROW IN AND LASH THEIR BOATS TOGETHER INTO ONE FLOATING STREET. BY DAWN THEY\'RE GONE AGAIN, AND THE WATER\'S JUST WATER.'),
         look('BRAZIER', 18, 18, 'A BRAZIER OF COALS IN THE MIDDLE OF THE SOUTH BARGE. A KETTLE ON IT, AND THREE TRADERS ARGUING ABOUT THE PRICE OF SALT AS IF THEIR LIVES DEPENDED ON IT.'),
         look('THE HARBOUR LIGHTS', 18, 20, 'TWO BLUE LAMPS ON THE BREAKWATER MARK THE GAP TO THE OPEN SEA. BLUE, THE SAILORS SAY, BECAUSE A SAPPHIRE MAN WILL ONLY TRUST A SAPPHIRE LIGHT.'),
     ] + [{'x': t[6][0], 'y': t[6][1], 'type': 'dialog', 'label': t[5], 'prompt': 'PRESS E TO TALK', 'dialog': ''} for t in TRADERS]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-market-' + t[5].lower().replace('old ', ''), 'x': t[6][0], 'y': t[6][1], 'facing': 'down'} for t in TRADERS],
            scene_extra={'smoke': SMOKE})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in WALK:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('floating market done; walkable', len(WALK))
