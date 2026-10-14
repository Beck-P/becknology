"""The Singularity — Blender scene: the Brink.

  BVENV/bin/python tools/bridge-art/scenes/singularity.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/singularity

You stand at the edge of the hole, not looking at it from afar: a wide
plain of shattered stone, cracked into plates glowing from below, falling
away into the void at its edges and breaking into islands toward the
north-east, where the horizon fills the sky (js/horizon.js draws the sky
and warps the world itself). Someone came here to study it long ago: an
avenue of columns runs toward the brink, some of them broken, their drums
hanging in the air where time stopped them falling; a ring gate half
sunk in the stone, a stair climbing to nowhere, a sundial whose shadow
points the wrong way. Pieces of other worlds have been dragged in —
Lumar cobbles and a lantern, a slab of Arcadia street, a scrap of station
hull — and the skiff sets down on the old landing ring in the south-west.
At the brink, on the last island, the altar where the echoes surface.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402  (bpy before mathutils)
from mathutils import Vector, noise    # noqa: E402
import assets_void as V                # noqa: E402
import assets_station as T             # noqa: E402
import assets_town as W                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_ship as P                # noqa: E402
import assets_signs as SG              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'singularity.json')
COLS, ROWS = 48, 34
HOLE = (56.0, -14.0)                      # where the hole is, for things pulled toward it
PAD = (8.0, 25.0)
ALTAR = (41.5, 6.5)
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=3.0, margin_x=1.0, seed=181)
rng = random.Random(181)

KEEP = [(PAD, 3.4), ((18.0, 20.5), 2.0), ((23.5, 15.5), 3.2), ((14.5, 9.5), 2.4), ((6.5, 14.5), 2.2), ((34.0, 25.0), 2.6),
        ((28.5, 21.5), 1.8), (ALTAR, 2.4), ((36.5, 11.5), 2.4)]


def land(x, r):
    for (p, rad) in KEEP:                                       # the places that matter stay on solid ground
        if math.hypot(x - p[0], r - p[1]) < rad:
            return True
    n = noise.noise(Vector((x * 0.11, r * 0.11, 1.3)))
    m = noise.noise(Vector((x * 0.33, r * 0.33, 4.1)))
    edge = min(x + 1.0, COLS + 1.0 - x, r + 3.0, ROWS + 0.2 - r)
    base = min(edge, 4.0) * 0.32 + n * 0.55 + m * 0.22
    ne = max(0.0, (x - COLS * 0.55) / (COLS * 0.45)) * max(0.0, (ROWS * 0.5 - r) / (ROWS * 0.5))
    base -= ne * 2.2                                            # breaking up toward the brink
    ridge = 1 - abs(noise.noise(Vector((x * 0.075, r * 0.075, 7.7))))
    if ridge > 0.955 and base < 1.4:                            # long chasms
        return False
    return base > 0.42


walk, zat = V.plain(k, land, COLS, ROWS, seed=7, bounds=(-1.5, COLS + 1.5, -3.0, ROWS + 1.0))

# ---- the landing ring: where ships have always set down ---------------------------------------------
k.cyl(PAD[0], PAD[1], 0.0, 0.06, 2.6, (V.STONE[3], 0.14), 'landing_ring', verts=48)
k.cyl(PAD[0], PAD[1], 0.06, 0.07, 2.3, (V.STONE[2], 0.14), 'landing_inner', verts=48)
for i in range(24):
    a = i * math.pi / 12
    k.box(PAD[0] + math.cos(a) * 2.45 - 0.05, PAD[1] + math.sin(a) * 2.45 - 0.05, 0.06, PAD[0] + math.cos(a) * 2.45 + 0.05,
          PAD[1] + math.sin(a) * 2.45 + 0.05, 0.08, '#140a28', 'ring_rune', emit=(V.GLOW, 0.8))
for i in range(4):                                            # the old guide stones
    a = i * math.pi / 2 + math.pi / 4
    x, r = PAD[0] + math.cos(a) * 3.0, PAD[1] + math.sin(a) * 3.0
    k.box(x - 0.15, r - 0.15, 0.0, x + 0.15, r + 0.15, 0.9, (V.STONE[3], 0.18), 'guide_stone', bevel=0.03)
    k.sphere(x, r, 1.0, 0.1, 0.1, '#ffb060', 'guide_light', emit=('#ffb060', 1.0), segs=8)
    k.point_light(x, r + 0.2, 1.0, '#ffb060', 8, radius=0.1, group='flicker')
    k.solid(x - 0.2, r - 0.2, x + 0.2, r + 0.2)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PAD[0] - 1.7, PAD[1] - 0.2)
k.solid(PAD[0] - 1.8, PAD[1] - 1.2, PAD[0] + 2.0, PAD[1] + 0.8)

# ---- the avenue: columns toward the brink, some broken, their pieces frozen mid-fall ----------------
def column(x, r, h=2.6, broken=None):
    k.box(x - 0.32, r - 0.32, 0.0, x + 0.32, r + 0.32, 0.22, (V.STONE[3], 0.16), 'col_base', bevel=0.02)
    top = h if broken is None else broken
    k.cyl(x, r, 0.22, top, 0.22, (V.STONE[4], 0.16), 'column', verts=12)
    for zz in [0.6 + i * 0.5 for i in range(int((top - 0.6) / 0.5))]:
        k.cyl(x, r, zz, zz + 0.03, 0.235, V.STONE[2], 'col_ring', verts=12)
    if broken is None:
        k.box(x - 0.32, r - 0.32, h, x + 0.32, r + 0.32, h + 0.2, (V.STONE[3], 0.16), 'capital', bevel=0.02)
    else:                                                   # the rest of it, hanging where time stopped it
        for i in range(3):
            zz = broken + 0.35 + i * 0.55 + rng.uniform(0, 0.2)
            k.blob(x + rng.uniform(-0.25, 0.25) * (i + 1), r + rng.uniform(-0.15, 0.15), zz + 0.2, 0.22, 0.22, 0.24,
                   (V.STONE[4], 0.16), 'frozen_drum', rot=(rng.uniform(-30, 30), rng.uniform(-30, 30), 0), segs=10)
            k.box(x - 0.02, r - 0.02, zz + 0.45, x + 0.02, r + 0.02, zz + 0.48, '#1a0c30', 'time_mote',
                  emit=(V.AMBER, 0.6))
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)


a0, a1 = (13.0, 22.0), (33.0, 11.0)
L = math.hypot(a1[0] - a0[0], a1[1] - a0[1])
ux, ur = (a1[0] - a0[0]) / L, (a1[1] - a0[1]) / L
for i in range(9):
    t = i * 2.4
    for s in (-1, 1):
        x, r = a0[0] + ux * t + ur * 1.6 * s, a0[1] + ur * t - ux * 1.6 * s
        if land(x, r):
            column(x, r, broken=None if rng.random() < 0.55 else rng.uniform(0.6, 1.6))
# paving along it
for i in range(int(L / 0.5)):
    t = i * 0.5
    x, r = a0[0] + ux * t, a0[1] + ur * t
    if land(x, r):
        k.bar(x - ur * 1.0, r + ux * 1.0, x + ur * 1.0, r - ux * 1.0, 0.0, 0.02, 0.44,
              (shade(V.STONE[4], rng.uniform(0.85, 1.1)), 0.14), 'avenue_slab')

# ---- the ring gate, half sunk -----------------------------------------------------------------------------
GX, GR = 23.5, 15.0
pts = [(GX + math.cos(a) * 2.0, GR, 1.0 + math.sin(a) * 2.0) for a in [math.pi * i / 16 for i in range(-3, 20)]]
for p, q in zip(pts, pts[1:]):
    k.tube(p, q, 0.22, (V.STONE[3], 0.16), 'ring_gate', verts=8, smooth=False)
for i, p in enumerate(pts[::3]):
    k.sphere(p[0], p[1] + 0.2, p[2], 0.05, 0.05, V.GLOW, 'gate_rune', emit=(V.GLOW, 1.0), segs=6)
k.point_light(GX, GR + 0.5, 1.6, '#c090ff', 30, radius=0.6, group='flicker')
k.solid(GX - 2.3, GR - 0.3, GX - 1.7, GR + 0.3)
k.solid(GX + 1.7, GR - 0.3, GX + 2.3, GR + 0.3)

# ---- the sundial whose shadow points at the hole, the inscribed stone -------------------------------------
SX, SR = 18.0, 20.5
k.cyl(SX, SR, 0.0, 0.18, 1.2, (V.STONE[4], 0.14), 'dial', verts=32)
for i in range(12):
    a = i * math.pi / 6
    k.box(SX + math.cos(a) * 1.0 - 0.03, SR + math.sin(a) * 1.0 - 0.03, 0.18, SX + math.cos(a) * 1.0 + 0.03,
          SR + math.sin(a) * 1.0 + 0.03, 0.2, '#140a28', 'dial_mark', emit=(V.AMBER, 0.7))
k.tube((SX, SR, 0.18), (SX + 0.3, SR - 0.3, 1.4), 0.06, (V.STONE[3], 0.14), 'gnomon', verts=6)
k.bar(SX, SR, SX + 0.95, SR - 0.6, 0.18, 0.19, 0.12, '#06040c', 'wrong_shadow')
k.solid(SX - 1.2, SR - 1.2, SX + 1.2, SR + 1.2)

# ---- the stair to nowhere ---------------------------------------------------------------------------------
TX, TR = 28.5, 21.5
for i in range(9):
    z = 0.28 * (i + 1)
    k.box(TX - 0.6, TR - i * 0.32 - 0.32, z - 0.28 if i else 0.0, TX + 0.6, TR - i * 0.32, z, (V.STONE[3], 0.16), 'stair',
          bevel=0.015)
for i in range(4):                                         # the last steps, drifting apart
    z = 2.8 + i * 0.4
    k.box(TX - 0.6 + i * 0.1, TR - 3.2 - i * 0.5, z, TX + 0.6 + i * 0.1, TR - 2.9 - i * 0.5, z + 0.2, (V.STONE[3], 0.16),
          'drifting_step', bevel=0.015)
k.solid(TX - 0.6, TR - 2.9, TX + 0.6, TR)

# ---- echoes of other worlds ------------------------------------------------------------------------------
LX, LR = 34.0, 25.0                                         # Lumar: cobbles, a lantern, half a wall
for i in range(220):
    a, d = rng.uniform(0, 2 * math.pi), math.sqrt(rng.random()) * 2.2
    x, r = LX + math.cos(a) * d, LR + math.sin(a) * d * 0.8
    k.cyl(x, r, 0.0, 0.04, 0.13, (shade('#6a6458', rng.uniform(0.8, 1.15)), 0.15), 'cobble', verts=7, ry=0.11)
W.lantern_post(k, LX - 1.2, LR - 0.6, energy=30)
k.box(LX, LR - 1.2, 0.0, LX + 1.8, LR - 0.95, 1.6, ('#b8a888', 0.1), 'echo_wall')
k.box(LX, LR - 1.2, 1.6, LX + 1.0, LR - 0.95, 2.0, ('#b8a888', 0.1), 'echo_wall')
W.window(k, LX + 0.9, LR - 0.93, 0.75, flowers=('#e04060', '#e0c040'))
A.barrel(k, LX + 1.2, LR + 0.8)
k.solid(LX, LR - 1.2, LX + 1.8, LR - 0.9)
k.solid(LX + 0.8, LR + 0.4, LX + 1.6, LR + 1.2)
AX, AR = 14.5, 9.5                                          # Arcadia: wet tiles, a sign, a machine humming
for c in range(-2, 2):
    for r in range(-1, 2):
        k.box(AX + c + 0.02, AR + r + 0.02, -0.01, AX + c + 0.98, AR + r + 0.98, 0.01, (shade('#2e2a40', rng.uniform(0.9, 1.1)), 0.06),
              'echo_tile')
Y.vending_machine(k, AX - 1.3, AR - 0.6)
SG.neon(k, 'ARC', 'Audiowide', AX + 0.6, AR - 1.0, 0.3, size=0.55, col=Y.PINK, board='#0c0818')
Y.puddle(k, AX + 0.4, AR + 0.9, 0.6, 0.25, tint=Y.CYAN)
k.solid(AX - 2, AR - 1, AX - 1, AR)
k.solid(AX, AR - 1.2, AX + 1.4, AR - 0.8)
HX, HR = 6.5, 14.5                                          # the station: hull plates, a rack still blinking
for c in range(-1, 2):
    for r in range(-1, 1):
        k.box(HX + c + 0.03, HR + r + 0.03, -0.01, HX + c + 0.97, HR + r + 0.97, 0.01, (shade('#3a4450', rng.uniform(0.9, 1.1)), 0.06),
              'hull_plate')
T.server_rack(k, HX, HR - 1.0)
k.solid(HX - 0.5, HR - 1.0, HX + 0.5, HR)

# ---- the brink: rock pulled into spikes, an avalanche frozen in the air, the altar ------------------------
for (x, r) in ((35.5, 12.6), (37.8, 10.2), (38.4, 13.5), (39.5, 8.8), (43.6, 9.2), (44.2, 5.4)):
    if land(x, r):
        V.stretched_shard(k, x, r, 0.2, rng.uniform(1.0, 2.0), HOLE)
        k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
for i in range(30):                                          # the frozen avalanche
    x, r = 36.5 + rng.uniform(-2.5, 2.5), 11.5 + rng.uniform(-2.0, 2.0)
    V.float_rock(k, x, r, rng.uniform(0.8, 3.4), rng.uniform(0.1, 0.35), rng)
V.altar(k, ALTAR[0], ALTAR[1])

# ---- drifting rock out in the void, some pulled thin ---------------------------------------------------------
for _ in range(60):
    x, r = rng.uniform(-1, COLS + 1), rng.uniform(-2.5, ROWS + 3)
    if land(x, r):
        continue
    z = rng.uniform(-3.0, 2.0)
    if rng.random() < 0.4:
        V.stretched_shard(k, x, r, z, rng.uniform(0.8, 2.4), HOLE, tone=V.STONE[2])
    else:
        V.float_rock(k, x, r, z, rng.uniform(0.15, 0.5), rng)

# ---- light: the horizon's amber glare from the north-east, violet from the void below -------------------------
k.area_light(48.0, -10.0, 8.0, '#ffb070', 3200, 22.0, rot=(math.radians(-55), math.radians(-30), 0))
k.area_light(24.0, 24.0, -8.0, '#6040c0', 900, 50.0, rot=(math.radians(160), 0, 0))
k.point_light(23.0, 17.0, 3.0, '#9070d0', 40, radius=1.0)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.6}}, light_samples=96,
         world_light=('#140c24', 0.45))

# ---- the world -------------------------------------------------------------------------------------------------
w = json.load(open(WORLD))
w['width'], w['height'] = COLS, ROWS
SPAWN = [8, 27]
w['spawns'] = {'player': SPAWN}
w.pop('designTiles', None)
w.pop('designTileNames', None)
old = {it.get('label'): it for it in w.get('interactions', [])}
sing = dict(old.get('THE SINGULARITY', {'type': 'app', 'url': '/genart', 'label': 'THE SINGULARITY', 'prompt': 'PRESS E TO ENTER'}))


def at(it, x, y):
    it = dict(it)
    it['x'], it['y'] = x, y
    return it


def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    at(sing, int(ALTAR[0]), int(ALTAR[1])),
    {'x': int(PAD[0]), 'y': int(PAD[1]), 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
    dialog(18, 20, 'SUNDIAL', 'PRESS E TO LOOK',
           "A SUNDIAL WITH NO SUN.\n\nITS SHADOW POINTS AT THE HOLE, AND IT'S LONGER THAN IT WAS A MOMENT AGO."),
    dialog(23, 15, 'RING GATE', 'PRESS E TO LOOK',
           'A RING OF STONE, HALF SUNK. THROUGH IT THE STARS ARE IN THE WRONG PLACES.\n\nYOU SEE YOUR OWN BACK, A LONG WAY OFF.'),
    dialog(28, 21, 'STAIR', 'PRESS E TO LOOK',
           'THE STEPS CLIMB INTO NOTHING. THE LAST FEW HAVE COME LOOSE AND HANG THERE, TURNING SLOWLY.'),
    dialog(35, 24, 'LUMAR ECHO', 'PRESS E TO LOOK',
           "COBBLES FROM A SQUARE YOU KNOW, A LANTERN STILL BURNING, A WINDOW BOX OF FLOWERS.\n\nHALF A WALL, AND NOTHING BEHIND IT BUT STARS."),
    dialog(15, 8, 'ARCADIA ECHO', 'PRESS E TO LOOK',
           'A SLAB OF STREET, STILL WET WITH RAIN THAT FELL SOMEWHERE ELSE.\n\nTHE SIGN SAYS "ARC". THE REST OF IT IS GONE.'),
    dialog(13, 8, 'VENDING MACHINE', 'PRESS E TO USE',
           'IT HUMS. NO POWER CABLE.\n\nA CAN DROPS: "NEO COLA - BEST BEFORE CYCLE 2189". IT IS ICE COLD.'),
    dialog(6, 13, 'STATION ECHO', 'PRESS E TO LOOK',
           "A SERVER RACK BOLTED TO A PIECE OF HULL. ITS LIGHTS BLINK IN A PATTERN.\n\nIT'S THE SAME PATTERN ENIGMA STATION WAS TRANSMITTING."),
    dialog(36, 12, 'FROZEN FALL', 'PRESS E TO LOOK',
           'A ROCKFALL, STOPPED. STONES HANG IN THE AIR WHERE THEY WERE FALLING.\n\nIF YOU WATCH LONG ENOUGH, ONE OF THEM MOVES.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id='singularity',
            scene_extra={'backdrop': True, 'flicker': {'mode': 'pulse'}, 'layers': {'shuttle': 'parked'}})
w = json.load(open(WORLD))
for r in range(ROWS):                                         # only the plain is ground
    for c in range(COLS):
        if (c, r) not in walk or (c, r) in k.blocked:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['shuttle'] = {'spawn': SPAWN}
w['horizon'] = {'hole': list(HOLE), 'brink': list(ALTAR)}
w.pop('hole', None)
w['view'] = [-1.0, -1.5, COLS + 1.0, ROWS + 2.0]
w.pop('fixedCamera', None)
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('singularity done', len(walk), 'walkable cells')
