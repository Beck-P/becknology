"""The Gloaming — the ghost ship of the Midnight Sea, boarded (world id "lumar-gloaming").

  BVENV/bin/python tools/bridge-art/scenes/lumar_gloaming.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-gloaming

Saltmere's old packet, that put out into the storm the night the village drowned to fetch the abbey's boats and never
came back: now a ghost, sailing the Midnight Sea against the wind under sails like torn lace, green lanterns burning
cold in her rigging. You come aboard her from your own boat over her waist (js/sloop.js `ghostShip`; the way back is
`ghost_return`, js/midnight.js). Her deck from her stern to her bowsprit: the raised quarterdeck with her wheel and her
captain's ghost at it, the binnacle, her stern lantern - dark, its hook empty - the hatch to the hold, her guns along the
rails, barrels and lines and a capstan, three masts with their rags of sail, and her crew going about their work as if
the storm were still blowing, see-through (`ghost`); the ones the sea took the minds of come at you with cutlasses
(spectral sailors, js/combat.js).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-gloaming'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 36, 16
k = Kit(COLS, ROWS, margin_top=4.0, margin_bottom=2.0, margin_x=1.0, seed=7171)
rng = k.rng
GHOST = '#7ad0c8'
WOOD_G = '#3a4a44'                                  # her timbers, gone grey-green
SEA = -1.6                                          # the sea's surface, well down her sides

X0, X1, BOW = 3.0, 27.0, 33.0                       # her stern, where the bow begins to narrow, her stem
RC, HB = 8.0, 3.6                                   # her centreline row, her half-beam at the deck


def half(x):
    """Her half-breadth at x along her: square at the stern, round into the bow."""
    if x <= X1:
        return HB * (0.9 + 0.1 * min(1.0, (x - X0) / 3.0))
    t = (x - X1) / (BOW - X1)
    return HB * math.cos(t * math.pi / 2) ** 0.8


def on_deck(x, r):
    return X0 <= x <= BOW and abs(r - RC) < half(x) - 0.25


deck = {(c, r) for c in range(COLS) for r in range(ROWS) if on_deck(c + 0.5, r + 0.5)}

# ---- her hull: sides falling away to the sea, her planking, her wale, the waterline weed ---------------------------------------
N = 48
pts = [X0 + (BOW - X0) * i / N for i in range(N + 1)]
for side in (-1, 1):
    for a, b in zip(pts, pts[1:]):
        ha, hb = half(a), half(b)
        for z0, z1, col, nm in ((SEA - 0.4, -0.55, '#24302c', 'hull'), (-0.55, -0.35, '#4a3a2a', 'wale'), (-0.35, 0.02, WOOD_G, 'hull_plank')):
            k.quads([((a, RC + side * ha * 0.98, z0), (b, RC + side * hb * 0.98, z0), (b, RC + side * hb, z1), (a, RC + side * ha, z1))],
                    (shade(col, rng.uniform(0.9, 1.1)), 0.18), nm)
k.box(X0 - 0.1, RC - HB * 0.9, SEA - 0.4, X0 + 0.05, RC + HB * 0.9, 0.02, ('#24302c', 0.18), 'transom')
for i in range(7):                                     # her stern windows: dark, one with a light in it
    x0 = RC - HB * 0.75 + i * HB * 0.22
    k.box(X0 - 0.12, x0, -1.05, X0 - 0.1, x0 + 0.24, -0.6, '#0a1214', 'stern_window', emit=(GHOST, 0.6 if i == 3 else 0.05))
for x in [X0 + 1.0 + i * 1.6 for i in range(15) if X0 + 1.0 + i * 1.6 < BOW - 2]:     # weed hanging off her at the waterline
    for side in (-1, 1):
        k.blob(x, RC + side * half(x) * 1.0, SEA + 0.1, 0.3, 0.04, 0.22, ('#2a3a2a', 0.25), 'weed', segs=6)
k.box(BOW - 0.2, RC - 0.12, -1.2, BOW + 0.3, RC + 0.12, 0.3, (WOOD_G, 0.18), 'stem')
k.tube((BOW, RC, 0.25), (BOW + 2.6, RC, 1.0), 0.07, (WOOD_G, 0.15), 'bowsprit', verts=8)

# ---- her deck: planks fore and aft, the quarterdeck raised a step, a rail all round -----------------------------------------
QD = 9.5                                              # the quarterdeck runs from the stern to here
r = RC - HB
while r < RC + HB:
    x = X0 - rng.uniform(0, 0.8)
    while x < BOW:
        L = rng.uniform(1.4, 2.6)
        xa, xb = max(X0, x), min(x + L, BOW)
        if on_deck(xa + 0.3, r + 0.15) or on_deck(xb - 0.3, r + 0.15):
            z = 0.18 if xb <= QD + 0.01 else 0.0
            k.box(xa + 0.01, r + 0.01, z - 0.05, xb - 0.01, r + 0.31, z, (shade('#5a5a4a', rng.uniform(0.82, 1.12)), 0.2), 'floor_deck')
        x += L
    r += 0.32
k.box(QD - 0.04, RC - HB, 0.0, QD + 0.04, RC + HB, 0.2, (WOOD_G, 0.15), 'qd_step')
for side in (-1, 1):                                  # the rail: posts and a cap, broken in places, a gangway gap in her waist
    for x in [X0 + 0.2 + i * 0.7 for i in range(int((BOW - X0) / 0.7))]:
        if abs(x - 16.5) < 1.0 and side > 0:
            continue
        rr = RC + side * (half(x) - 0.1)
        k.cyl(x, rr, 0.0, 0.62, 0.05, (WOOD_G, 0.15), 'rail_post', verts=6)
    for a, b in zip(pts, pts[1:]):
        if side > 0 and 15.4 < (a + b) / 2 < 17.6:
            continue
        if rng.random() < 0.06:                       # a rotten stretch, gone
            continue
        k.tube((a, RC + side * (half(a) - 0.1), 0.62), (b, RC + side * (half(b) - 0.1), 0.62), 0.04, ('#4a5a52', 0.15), 'rail', verts=5)

# ---- masts and their rags of sail, glowing faintly -----------------------------------------------------------------------------
MASTS = [(12.0, 7.6), (19.5, 8.6), (26.5, 7.4)]
for (mx, h) in MASTS:
    k.cyl(mx, RC, 0.0, h, 0.13, (WOOD_G, 0.12), 'mast', verts=10)
    k.cyl(mx, RC, h * 0.62, h * 0.66, 0.24, (WOOD_G, 0.12), 'top', verts=10)
    BR = math.radians(58)                             # her yards braced round hard, so the rags of her sails face you
    sb, cb = math.sin(BR), math.cos(BR)
    for (yz, span) in ((h * 0.45, 3.2), (h * 0.8, 2.4)):
        k.tube((mx - sb * span / 2, RC - cb * span / 2, yz), (mx + sb * span / 2, RC + cb * span / 2, yz), 0.06, (WOOD_G, 0.12), 'yard', verts=8)
        for i in range(6):                            # the sail hanging from it in ribbons, lit from inside
            ta = -span / 2 + 0.1 + i * span / 6
            tb = ta + span / 6 - 0.05
            drop = rng.uniform(0.7, 1.6) if i % 2 else rng.uniform(1.4, 2.2)
            pa_ = (mx + sb * ta, RC + cb * ta)
            pb_ = (mx + sb * tb, RC + cb * tb)
            bil = 0.18                                # bellied a little forward, the way she's sailing
            k.poly([(pa_[0], pa_[1], yz - 0.05), (pb_[0], pb_[1], yz - 0.05), (pb_[0] + bil, pb_[1] + 0.1, yz - drop), (pa_[0] + bil, pa_[1] + 0.1, yz - drop * 0.85)],
                   ('#9ab8b0', 0.2), 'ghost_sail', emit=(GHOST, 0.35))
    for side in (-1, 1):                              # shrouds down to the rail
        for j in range(3):
            k.tube((mx, RC, h * 0.62), (mx - 0.6 + j * 0.6, RC + side * (half(mx) - 0.15), 0.6), 0.012, '#2a3430', 'shroud', verts=4)
    k.box(mx + 0.15, RC + 0.2, h * 0.55 + 0.02, mx + 0.35, RC + 0.4, h * 0.55 + 0.04, '#2a2a30', 'lantern_cage')
    k.sphere(mx + 0.25, RC + 0.3, h * 0.55 + 0.15, 0.07, 0.08, '#204840', 'ghost_flame', emit=(GHOST, 1.0), segs=8)
    k.point_light(mx + 0.25, RC + 0.6, h * 0.55, GHOST, 30, radius=0.2, group='flicker')
    k.solid(mx - 0.3, RC - 0.3, mx + 0.3, RC + 0.3)
for (a, b) in (((12.0, RC, 7.6), (19.5, RC, 8.6)), ((19.5, RC, 8.6), (26.5, RC, 7.4)), ((26.5, RC, 7.4), (BOW + 2.5, RC, 1.0)),
               ((12.0, RC, 7.4), (X0 + 0.3, RC, 1.4))):
    k.tube(a, b, 0.014, '#2a3430', 'stay', verts=4)

# ---- the quarterdeck: the wheel and the binnacle, her captain's ghost, the stern lantern's empty hook ----------------------------
WX, WR = 6.2, RC
k.cyl_x(WX - 0.05, WX + 0.05, WR, 1.1, 0.45, 0.45, ('#4a3a2a', 0.15), 'wheel_rim', verts=18)
k.cyl_x(WX - 0.07, WX + 0.07, WR, 1.1, 0.38, 0.38, '#2a3430', 'wheel_hole', verts=18)
for i in range(8):
    a = i * math.pi / 4
    k.tube((WX, WR, 1.1), (WX, WR + math.cos(a) * 0.58, 1.1 + math.sin(a) * 0.58), 0.025, ('#5a4a38', 0.15), 'wheel_spoke', verts=5)
k.box(WX - 0.15, WR - 0.12, 0.18, WX + 0.15, WR + 0.12, 0.7, (WOOD_G, 0.15), 'wheel_post')
k.solid(WX - 0.4, WR - 0.5, WX + 0.4, WR + 0.5)
k.solid(7, int(RC), 8, int(RC) + 1)                       # where her captain stands
k.cyl(8.2, RC + 1.6, 0.18, 0.95, 0.18, ('#4a3a2a', 0.15), 'binnacle', verts=10)
k.sphere(8.2, RC + 1.6, 1.0, 0.16, 0.12, ('#8a9a88', 0.08), 'binnacle_glass', segs=10)
k.solid(7.9, RC + 1.3, 8.5, RC + 1.9)
LX, LR = X0 + 0.5, RC - 2.2                            # the stern lantern on its bracket: dark - this is where she shows her light
k.tube((LX, LR, 0.6), (LX, LR, 2.2), 0.05, ('#2a2a30', 0.15), 'lantern_bracket', verts=6)
k.tube((LX, LR, 2.2), (LX - 0.45, LR, 2.25), 0.03, '#2a2a30', 'lantern_bracket', verts=5)
k.box(LX - 0.6, LR - 0.15, 1.6, LX - 0.3, LR + 0.15, 2.0, ('#1a1e24', 0.1), 'lantern_dark')
k.solid_post(LX, LR)

# ---- the waist and the fo'c'sle: guns, the hatch, a capstan, barrels, coils of line --------------------------------------------
for x in (11.0, 14.0, 22.0, 25.0):
    for side in (-1, 1):
        rr = RC + side * (half(x) - 0.6)
        k.box(x - 0.35, rr - 0.22, 0.0, x + 0.35, rr + 0.22, 0.28, ('#3a2a20', 0.15), 'gun_carriage')
        k.tube((x, rr - side * 0.2, 0.36), (x, rr + side * 0.55, 0.4), 0.09, ('#1e2a28', 0.1), 'cannon', verts=10)
        k.solid(x - 0.4, rr - 0.3, x + 0.4, rr + 0.3)
HX, HR2 = 16.5, RC - 0.4                                # the hatch to the hold: its grating, a green glow coming up through it
k.box(HX - 0.9, HR2 - 0.6, 0.0, HX + 0.9, HR2 + 0.6, 0.18, ('#3a3028', 0.15), 'hatch_coaming')
for i in range(6):
    k.box(HX - 0.8 + i * 0.3, HR2 - 0.5, 0.18, HX - 0.68 + i * 0.3, HR2 + 0.5, 0.2, '#2a2420', 'hatch_grating')
k.box(HX - 0.8, HR2 - 0.5, 0.05, HX + 0.8, HR2 + 0.5, 0.06, '#0e2a26', 'hatch_glow', emit=(GHOST, 0.5))
k.point_light(HX, HR2 + 0.8, 0.4, GHOST, 12, radius=0.3, group='flicker')
k.solid(HX - 0.9, HR2 - 0.6, HX + 0.9, HR2 + 0.6)
CX2 = 23.6
k.cyl(CX2, RC, 0.0, 0.7, 0.32, ('#4a3a2a', 0.15), 'capstan', verts=12)
for i in range(6):
    a = i * math.tau / 6
    k.tube((CX2, RC, 0.6), (CX2 + math.cos(a) * 0.7, RC + math.sin(a) * 0.7, 0.62), 0.035, ('#5a4a38', 0.15), 'capstan_bar', verts=5)
k.solid(CX2 - 0.4, RC - 0.4, CX2 + 0.4, RC + 0.4)
for (x, r) in ((9.6, RC - 2.6), (10.2, RC - 2.5), (28.6, RC + 1.8)):
    A.barrel(k, x, r, h=0.7, radius=0.26, tone='#3a3a30')
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
for (x, r) in ((18.4, RC + 2.4), (28.0, RC - 1.6)):
    for i in range(4):
        k.cyl(x, r, 0.02 + i * 0.06, 0.07 + i * 0.06, 0.28 - i * 0.02, ('#7a7a68', 0.15), 'rope_coil', verts=14)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
k.cyl(30.0, RC - 0.9, 0.0, 1.3, 0.05, (WOOD_G, 0.15), 'belfry_post', verts=6)                # the ship's bell at the fo'c'sle, green
k.cone(30.0, RC - 0.9, 0.95, 1.25, 0.04, 0.18, ('#4a7a5a', 0.06), 'ship_bell', verts=12)
k.solid_post(30.0, RC - 0.9)
k.cyl(31.0, RC + 0.6, 0.0, 0.95, 0.03, '#2a2a30', 'lantern_post', verts=5)                          # a lantern on the fo'c'sle
k.sphere(31.0, RC + 0.6, 1.05, 0.06, 0.07, '#204840', 'ghost_flame', emit=(GHOST, 1.0), segs=8)
k.point_light(31.0, RC + 0.9, 1.1, GHOST, 14, radius=0.2, group='flicker')
# the gangway: a plank laid from her waist down to where your own boat lies alongside
k.box(16.0, RC + HB - 0.2, -0.05, 17.0, RC + HB + 1.6, 0.0, ('#4a3e30', 0.2), 'gangplank')

k.area_light(18.0, 6.0, 14.0, '#6a78b8', 1500, 40.0, rot=(math.radians(-35), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.6}}, light_samples=96, world_light=('#1e2434', 0.6))


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


BACK = [(16, int(RC + HB) - 1), (16, int(RC + HB))]
w = {'name': 'The Gloaming', 'sea': 'midnight', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [16, int(RC + HB) - 1]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': x, 'y': y, 'type': 'ghost_return', 'label': 'YOUR BOAT', 'prompt': 'PRESS E TO GO BACK DOWN'} for (x, y) in BACK] + [
         {'x': 7, 'y': int(RC), 'type': 'dialog', 'label': 'CAPTAIN MARROW', 'prompt': 'PRESS E TO TALK',
          'dialog': 'A WOMAN AT THE WHEEL, MADE OF COLD GREEN LIGHT, A TRICORN PULLED DOWN AGAINST A WIND THAT ISN\'T BLOWING.'},
         {'x': int(LX), 'y': int(LR), 'type': 'dialog', 'label': 'STERN LANTERN', 'prompt': 'PRESS E TO LOOK',
          'dialog': "HER STERN LANTERN ON ITS IRON BRACKET: DARK, THE GLASS CRACKED, THE WICK DROWNED. A SHIP SHOWS HER LIGHT HERE SO SHE CAN BE SEEN COMING HOME."},
         look('HATCH', int(HX), int(HR2) + 1, "THE HATCH TO HER HOLD. GREEN LIGHT COMES UP THROUGH THE GRATING, AND THE SOUND OF WATER SLOPPING "
              "BELOW, AND SOMEONE COUNTING BARRELS, OVER AND OVER, ALWAYS GETTING TO NINE."),
         look("SHIP'S BELL", 30, int(RC), "HER BELL, GREEN WITH THE SEA. CAST INTO ITS LIP: 'GLOAMING - SALTMERE'. IT DOESN'T RING. IT "
              "IS LISTENING FOR ANOTHER ONE."),
         look('THE WHEEL', int(WX), int(WR) - 1, "HER WHEEL, LASHED HARD OVER. SHE IS STEERING FOR SOMEWHERE SHE CAN'T SEE."),
         look('RAGGED SAILS', 19, int(RC) - 2, "HER SAILS HANG IN RIBBONS, AND STILL THEY FILL, AGAINST THE WIND, GLOWING FAINTLY GREEN "
              "LIKE A JELLYFISH IN DEEP WATER."),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=BACK, scene_id=WID,
            actors=[{'sheet': 'npc-ghost-captain', 'x': 7, 'y': int(RC), 'facing': 'right', 'ghost': True}],
            scene_extra={'backdrop': True, 'mist': True})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in deck and (c, r) not in BACK:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-1.0, -4.0, COLS + 1.0, ROWS + 2.0]
w['onFaint'] = {'world': 'lumar-saltmere', 'spawn': [22, 23], 'who': 'CAPTAIN MARROW',
                'line': "YOU COME ROUND ON SALTMERE'S QUAY, WET THROUGH. OUT IN THE MIST, GREEN LANTERNS ARE TURNING AWAY.\n\nA VOICE "
                        "ON THE WIND: \"PUT YOU ASHORE, WARM ONE. MY LADS DON'T KNOW WHAT THEY DO. YOUR BOAT'S AT THE PIER.\""}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('gloaming done; deck', len(deck))
