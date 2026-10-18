"""The crater of Cinder Key — the volcano's caldera (world id "lumar-cinder-volcano").

  BVENV/bin/python tools/bridge-art/scenes/lumar_cinder_volcano.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-cinder-volcano

Up the trail from Tortuga and in through a notch in the rim: a bowl of black cinder and ash walled by the crater's rim,
a lake of lava in the middle with crusted plates floating on it, fumaroles steaming, spires of black glass where the
lava cooled standing up, ember glass crystallising in the cracks (forage, js/forage.js), the old pirates' shrine of
skulls and rum bottles where they leave a coin for the mountain, a lookout on the rim toward Crimson Reach's ridge, and
the claw marks where the dragon comes to bathe. Ember imps flit here and magma crabs drag their shells over the cinders
(js/combat.js, js/crimson.js); black out and you come round on Tortuga's boardwalk.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import bpy                             # noqa: E402
import bmesh                           # noqa: E402
from scenekit import Kit, S, apply_world, shade  # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-cinder-volcano'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 38
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=9131)
rng = k.rng
EMBER = '#ff5a24'

BOWL = (22.0, 18.5, 18.5, 14.5)                    # the caldera floor: an ellipse inside the rim
LAKE = (22.0, 14.5, 7.4, 4.6)                      # the lava lake in it
NOTCH = (19.6, 24.4)                               # the notch in the south rim the trail comes through


def ell(x, r, e, wob=0.0):
    cx, cr, rx, ry = e
    return ((x - cx) / rx) ** 2 + ((r - cr) / ry) ** 2 + wob


def wob(x, r, s):
    return 0.08 * I.n2(x, r, 0.3, s) + 0.04 * I.n2(x, r, 0.9, s + 1)


cells = {(c, r) for c in range(COLS) for r in range(ROWS)}
bowl = {(c, r) for (c, r) in cells if ell(c + 0.5, r + 0.5, BOWL, wob(c + 0.5, r + 0.5, 3)) < 1.0}
bowl |= {(c, r) for c in range(int(NOTCH[0]), int(NOTCH[1]) + 1) for r in range(30, ROWS)}       # the way in
lake = {(c, r) for (c, r) in bowl if ell(c + 0.5, r + 0.5, LAKE, wob(c + 0.5, r + 0.5, 7)) < 1.0}
walk = bowl - lake
rim = cells - bowl


def material(x, r):
    w = 0.25 * I.n2(x, r, 0.6, 11) + 0.12 * I.n2(x, r, 1.9, 12)
    d = ell(x, r, LAKE)
    if d < 1.55 + w:
        return 'crust_near'                          # baked dark and cracked round the lake
    if abs(x - 22.0) < 1.2 + 0.4 * I.n2(x, r, 0.8, 13) and r > 22:
        return 'trail'
    return 'ash' if w > 0.05 else ('cinder' if w > -0.18 else 'scoria')


ALB = {'crust_near': ('#221a1a', 0.35), 'trail': ('#4a3c34', 0.3), 'ash': ('#3e3638', 0.3), 'cinder': ('#332b2c', 0.35),
       'scoria': ('#3a2a26', 0.3)}
I.ground(k, walk | {(c, r) for (c, r) in lake if ell(c + 0.5, r + 0.5, LAKE) > 0.55}, material, ALB,
         height=lambda x, r: -0.5 * I.smooth(1.18, 0.9, ell(x, r, LAKE, wob(x, r, 7))))      # the ground shelving down under the lava
I.ridge(k, rim, top=3.6, slope=2.2, seed=31, rock='#3a3034', strata=('#4a3a3c', '#2e2426', '#5a3a36'), moss='#241c1e',
        foot=0.7, ground=(material, ALB), patchy=True)

# ---- the lava lake: glowing, crusted plates drifting on it, a rim of cooling rock -----------------------------------------
bm = bmesh.new()
n = 24
cx, cr, rx, ry = LAKE
for i in range(n):
    a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
    v = [bm.verts.new((cx, -cr * S, -0.25))]
    for a in (a0, a1):
        x, r = cx + math.cos(a) * (rx + 1.4), cr + math.sin(a) * (ry + 1.4)
        v.append(bm.verts.new((x, -r * S, -0.25)))
    bm.faces.new(v)
me = bpy.data.meshes.new('lava_lake')
bm.to_mesh(me)
bm.free()
o = bpy.data.objects.new('lava_lake', me)
k.scene.collection.objects.link(o)
k._finish(o, ('#7a1a08', 0.4), 'lava_lake', emit=(EMBER, 1.8))
for i in range(64):                                      # the lake's bank: rough black rocks round its edge
    a = i * math.tau / 64 + rng.uniform(-0.03, 0.03)
    x, r = cx + math.cos(a) * (rx + 0.2), cr + math.sin(a) * (ry + 0.25)
    s_ = rng.uniform(0.25, 0.45)
    k.rock(x, r, -0.1, s_, s_ * 0.8, s_ * 0.6, ('#1e1818', 0.2), part='lake_bank')
for i in range(46):                                      # crust plates floating on it, ragged, a glow round each
    a, d = rng.uniform(0, math.tau), math.sqrt(rng.uniform(0.0, 0.92))
    x, r = cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d
    w_, h_ = rng.uniform(0.45, 1.3), rng.uniform(0.3, 0.75)
    k.blob(x, r, -0.225, w_, h_, 0.012, (shade('#1e1212', rng.uniform(0.8, 1.25)), 0.35), 'crust_plate', rot=(0, 0, rng.uniform(0, 180)), segs=7)
    k.blob(x, r, -0.235, w_ + 0.12, h_ + 0.1, 0.012, '#5a1404', 'lava_cool', emit=('#c02a08', 1.2), segs=8)
for i in range(14):                                      # hot seams across the lake, yellow where it breaks open, wandering
    a, d = rng.uniform(0, math.tau), math.sqrt(rng.uniform(0.0, 0.8))
    x, r = cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d
    b_ = rng.uniform(0, math.pi)
    for j in range(3):
        L = rng.uniform(0.3, 0.6)
        nx, nr = x + math.cos(b_) * L, r + math.sin(b_) * L
        k.bar(x, r, nx, nr, -0.245, -0.235, rng.uniform(0.04, 0.08), '#8a3a10', 'lava_hot', emit=('#ffa040', 2.0))
        x, r, b_ = nx, nr, b_ + rng.uniform(-0.8, 0.8)
for i in range(8):                                       # darker swirls of cooling skin
    a, d = rng.uniform(0, math.tau), math.sqrt(rng.uniform(0.0, 0.8))
    k.blob(cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d, -0.244, rng.uniform(0.8, 1.6), rng.uniform(0.4, 0.8), 0.004,
           '#4a1006', 'lava_skin', emit=('#a02008', 1.0), rot=(0, 0, rng.uniform(0, 180)), segs=10)
for (x, r) in ((cx - 3.0, cr - 1.0), (cx + 2.5, cr + 1.5), (cx, cr - 2.6), (cx + 4.8, cr - 0.6), (cx - 5.2, cr + 1.6)):
    k.point_light(x, r, 0.6, EMBER, 50, radius=1.2, group='flicker')
k.point_light(cx, cr, 2.5, '#ff7a30', 160, radius=3.0, group='flicker')

# ---- the bowl: fumaroles, black glass spires, ember glass in the cracks, the shrine, the lookout, the claw marks -------------
FUMES = [(9.5, 16.0), (33.0, 21.5), (14.5, 25.0), (31.5, 10.0)]
SMOKE = []
for (x, r) in FUMES:
    for i in range(7):
        a = i * math.tau / 7
        k.rock(x + math.cos(a) * 0.32, r + math.sin(a) * 0.26, 0.0, 0.16, 0.14, 0.14, ('#c8b040', 0.3), part='sulphur')
    k.cyl(x, r, -0.02, 0.02, 0.18, '#1a0c06', 'vent', emit=('#ff6020', 0.5), verts=10)
    k.point_light(x, r, 0.4, '#ffa040', 6, radius=0.1, group='flicker')
    SMOKE.append([x, round(r - 0.4, 3)])
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
SPIRES = [(12.0, 11.5, 2.0), (12.8, 12.4, 1.3), (34.0, 15.0, 2.2), (33.2, 14.2, 1.4), (7.0, 20.5, 1.6), (37.0, 18.0, 1.5),
          (16.0, 7.5, 1.8), (28.5, 7.0, 1.6)]
for (x, r, h) in SPIRES:
    k.cone(x, r, 0.0, h, 0.32, 0.03, ('#14101a', 0.08), 'obsidian', verts=5)
    k.cone(x + 0.08, r + 0.05, 0.1, h * 0.8, 0.12, 0.01, '#3a3048', 'obsidian_glint', verts=4)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
EMBERS = [(10.5, 19.5), (30.0, 24.5), (35.5, 12.5), (15.0, 9.5), (26.5, 26.5)]
for (x, r) in EMBERS:                                    # ember glass growing out of a crack, glowing (forage spots)
    k.bar(x - 0.6, r + 0.1, x + 0.6, r - 0.1, -0.01, 0.005, 0.06, '#3a0c04', 'crack', emit=(EMBER, 0.8))
    for j in range(4):
        dx, dr = rng.uniform(-0.3, 0.3), rng.uniform(-0.15, 0.15)
        k.cone(x + dx, r + dr, 0.0, rng.uniform(0.25, 0.5), 0.07, 0.004, '#1a0806', 'ember_glass', emit=('#ff4818', 0.9), verts=5)
    k.point_light(x, r, 0.3, EMBER, 4, radius=0.1, group='flicker')
SH = (8.5, 24.0)                                         # the pirates' shrine: a cairn of skulls and empty bottles, a coin bowl
for i in range(5):
    a = i * math.tau / 5
    k.rock(SH[0] + math.cos(a) * 0.45, SH[1] + math.sin(a) * 0.35, 0.0, 0.3, 0.26, 0.28, ('#3a3034', 0.22), part='cairn')
k.rock(SH[0], SH[1], 0.3, 0.32, 0.28, 0.3, ('#3a3034', 0.22), part='cairn')
for (dx, dr, z) in ((-0.2, 0.25, 0.55), (0.22, 0.2, 0.5), (0.0, 0.05, 0.85)):
    k.sphere(SH[0] + dx, SH[1] + dr, z, 0.12, 0.13, ('#d8d0c0', 0.12), 'skull', segs=10)
    k.sphere(SH[0] + dx - 0.04, SH[1] + dr + 0.11, z + 0.02, 0.025, 0.01, '#14100e', 'skull_eye', segs=6)
    k.sphere(SH[0] + dx + 0.04, SH[1] + dr + 0.11, z + 0.02, 0.025, 0.01, '#14100e', 'skull_eye', segs=6)
for i in range(6):
    a = i * math.tau / 6 + 0.3
    bx, br = SH[0] + math.cos(a) * 0.8, SH[1] + math.sin(a) * 0.6
    k.cyl(bx, br, 0.0, 0.24, 0.05, (rng.choice(('#2a4a2a', '#4a1a10', '#3a2a1a')), 0.05), 'rum_bottle', verts=8)
    if i % 2 == 0:
        A.candle(k, bx + 0.12, br + 0.05, 0.0, energy=1.0)
k.cyl(SH[0], SH[1] + 0.6, 0.0, 0.12, 0.2, ('#6a4a2a', 0.15), 'coin_bowl', verts=12)
for i in range(6):
    k.cyl(SH[0] + rng.uniform(-0.08, 0.08), SH[1] + 0.6 + rng.uniform(-0.08, 0.08), 0.1 + i * 0.012, 0.115 + i * 0.012, 0.05, ('#e0b040', 0.25), 'coin', verts=10)
k.solid(SH[0] - 0.7, SH[1] - 0.6, SH[0] + 0.7, SH[1] + 0.8)
LO = (36.0, 26.0)                                        # the lookout: a flat rock on the rim's foot, a rope rail, a spyglass on a post
k.box(LO[0] - 0.9, LO[1] - 0.6, 0.0, LO[0] + 0.9, LO[1] + 0.6, 0.18, ('#4a3c38', 0.2), 'lookout', bevel=0.05)
k.cyl(LO[0] + 0.5, LO[1] - 0.3, 0.18, 1.1, 0.04, (A.WOOD_D, 0.14), 'spyglass_post', verts=6)
k.tube((LO[0] + 0.5, LO[1] - 0.3, 1.1), (LO[0] + 0.15, LO[1] - 0.75, 1.25), 0.045, ('#c8a040', 0.15), 'spyglass', verts=8)
k.solid_post(LO[0] + 0.5, LO[1] - 0.3)
CL = (27.5, 22.0)                                        # the claw marks: four gouges in the cinder, longer than you are
for i in range(4):
    x = CL[0] + i * 0.35
    k.bar(x, CL[1] - 1.2, x + 0.3, CL[1] + 0.9, -0.01, 0.004, 0.12, '#0a0606', 'claw_mark')
k.rock(CL[0] - 1.3, CL[1] - 0.2, 0.0, 0.4, 0.3, 0.12, ('#d8d0c0', 0.12), part='scale_shed')            # a shed scale
k.box(CL[0] - 1.45, CL[1] - 0.35, 0.05, CL[0] - 1.1, CL[1] - 0.05, 0.1, '#7a1a20', 'scale_shed', emit=('#a02030', 0.2))
I.bones(k, 6.5, 13.5, s=0.9)
I.dead_tree(k, 36.5, 22.5, h=1.6, tone='#2a1a16')
k.solid(36.2, 22.2, 36.8, 22.8)
for (x, r) in [(rng.uniform(4, 40), rng.uniform(6, 32)) for _ in range(40)]:
    if (int(x), int(r)) in walk and ell(x, r, LAKE) > 1.6 and all(math.hypot(x - a, r - b) > 1.4 for (a, b, *_) in FUMES + SPIRES + EMBERS + [SH, LO, CL]):
        s_ = rng.uniform(0.18, 0.4)
        k.rock(x, r, s_ * 0.2, s_, s_ * 0.8, s_ * 0.6, ('#2e2628', 0.22), part='boulder')
        if s_ > 0.32:
            k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
I.pebbles(k, walk, '#3a3236', per_cell=0.35)
# the trail coming in through the notch: rope posts down its edges
for i in range(6):
    for s_ in (-1, 1):
        k.cyl(22.0 + s_ * 1.6, 31.0 + i * 1.1, 0.0, 0.6, 0.035, (A.WOOD_D, 0.14), 'rope_post', verts=6)
W.lantern_post(k, 20.3, 30.2, energy=20)

k.area_light(22.0, 16.0, 16.0, '#8a80c0', 1800, 40.0, rot=(math.radians(-35), 0, 0))                      # the moon
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.72}}, light_samples=96,
         world_light=('#3a2028', 0.7))


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'The Crater', 'sea': 'crimson', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [22, 35]}, 'shipExit': True, 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': x, 'y': ROWS - 1, 'type': 'leave_world', 'leaveTo': 'lumar-cinder', 'leaveSpawn': [37, 9], 'label': 'THE TRAIL DOWN',
          'prompt': 'PRESS E TO GO DOWN'} for x in (21, 22, 23)] + [
         look('LAVA LAKE', 22, 20, "A LAKE OF LAVA THE SIZE OF TORTUGA'S COVE, SLOW AND ORANGE, PLATES OF BLACK CRUST TURNING ON IT LIKE "
              "ICE ON A RIVER. THE HEAT TIGHTENS YOUR FACE FROM HERE.\n\nSOMETHING VERY LARGE HAS BEEN LYING IN IT. THE CRUST "
              "STILL HOLDS THE SHAPE."),
         look('SHRINE', int(SH[0]), int(SH[1]) + 1, "THE PIRATES' SHRINE: A CAIRN OF STONES AND SKULLS, EMPTY RUM BOTTLES ROUND IT, "
              "CANDLE STUBS, A BOWL OF COINS NOBODY WOULD DARE TAKE.\n\n\"A COIN FOR THE MOUNTAIN,\" SAYS A BOARD, \"AND THE "
              "MOUNTAIN LETS YOU HOME.\""),
         look('LOOKOUT', int(LO[0]), int(LO[1]) + 1, "FROM THE LOOKOUT, NORTH-WEST ACROSS THE CRIMSON SEA: THE ASHEN RIDGE ON "
              "CRIMSON REACH, A THREAD OF SMOKE GOING UP FROM IT, AND NOW AND THEN A FLICKER OF RED DEEP IN THE ROCK, LIKE "
              "AN EYE OPENING."),
         look('CLAW MARKS', int(CL[0]), int(CL[1]) + 1, "FOUR GOUGES IN THE CINDER, EACH LONGER THAN YOU ARE, AND A SINGLE SCALE "
              "BESIDE THEM, RED AS A COAL, THE SIZE OF A SHIELD.\n\nTHE DRAGON COMES HERE. TO BATHE, OLD WICK SAYS. OR TO THINK."),
         look('FUMAROLE', int(FUMES[0][0]), int(FUMES[0][1]) + 1, "A VENT IN THE GROUND, CRUSTED WITH YELLOW SULPHUR, HISSING STEAM "
              "THAT SMELLS OF STRUCK MATCHES. THE GROUND AROUND IT IS WARM THROUGH YOUR BOOTS."),
         look('OBSIDIAN', int(SPIRES[0][0]), int(SPIRES[0][1]) + 1, "A SPIRE OF BLACK GLASS TALLER THAN YOU, WHERE A BUBBLE OF LAVA "
              "COOLED STANDING UP. YOUR REFLECTION IN IT IS RED."),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=[], scene_id=WID, scene_extra={'smoke': SMOKE})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in walk:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [0.0, -1.0, COLS, ROWS]                 # the crater's own rim all round: no sea past its edge
w['onFaint'] = {'world': 'lumar-cinder', 'spawn': [28, 23], 'who': 'SCARLET DEE',
                'line': "YOU COME ROUND ON TORTUGA'S BOARDWALK, SINGED, SOMEBODY'S COAT UNDER YOUR HEAD.\n\n\"THE PIRATES CARRIED YOU "
                        "DOWN,\" SAYS SCARLET DEE. \"THEY'LL WANT A DRINK FOR IT. THE IMPS THROW FIRE - STEP OFF THE LINE. THE CRABS "
                        "HIT HARDER WHEN THEY'RE CRACKED.\""}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('crater done; walkable', len(walk))
