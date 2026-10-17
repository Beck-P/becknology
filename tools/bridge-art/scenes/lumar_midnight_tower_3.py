"""The Sorceress's Tower, the top: the star chamber (world id "lumar-midnight-tower-3").

  BVENV/bin/python tools/bridge-art/scenes/lumar_midnight_tower_3.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-midnight-tower-3

The top of the tower, under the roof's open slit: Morwen's great orrery in the middle — a brass sun with the seven
worlds the Wayfarer knows turning round it on their arms (Lumar's green sea, Arcadia's lit night, Enigma's rings, the
Singularity's dark disc, Verdance, Hoarfell, Sylvara) — the long telescope aimed out of the slit at the sky, the
scrying pool in its stone basin (it shows the Midnight Sea tonight: where the ghost ship drifts, js/midnight.js), star
charts hung on the angled walls, a desk of astrolabes and an hourglass, and a bench under the window for the view.
The stairwell goes back down to the stillroom.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_lumar as A                               # noqa: E402
import assets_magic as M                               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-midnight-tower-3'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
BRASS, BRASS_L = '#b08838', '#e0c070'

H = 2.6 / math.cos(THETA)
k = Kit(12, 13, margin_top=1.0, margin_bottom=0.5, seed=6103)
rng = k.rng
HOLE = (3.0, 7.4, 4.6, 9.0)
P, C = M.octagon_room(k, 2, 2, 10, 11, 2, H, door=(6.0, 6.0), floor_tone='#34304a', holes=[HOLE])
A.stairwell_down(k, HOLE[0], HOLE[2], HOLE[1], HOLE[3])

# ---- the back wall: the slit in the roof, the long telescope pointing out of it ---------------------------------------
k.box(4.6, 1.96, 1.1, 7.4, 2.05, H, '#04040c', 'sky_slit', emit=('#101838', 0.5))
for _ in range(26):                                       # stars in the slit
    x, z = rng.uniform(4.75, 7.25), rng.uniform(1.25, H - 0.1)
    s = rng.choice((0.012, 0.018, 0.026))
    k.sphere(x, 2.06, z, s, 0.01, '#f0ecd8', 'slit_star', emit=('#f0e8c8', rng.uniform(0.6, 1.0)), segs=5)
for x in (4.5, 7.5):                                      # its iron shutters folded back
    k.box(x - 0.1, 1.98, 1.05, x + 0.1, 2.1, H, ('#2a2a34', 0.1), 'slit_shutter')
k.point_light(6.0, 2.8, 2.6, '#8090d0', 18, radius=0.8)
TX, TR = 6.0, 3.2
k.cyl(TX, TR, 0.0, 0.12, 0.42, (M.STONE_PD, 0.12), 'scope_base', verts=10)
k.cyl(TX, TR, 0.12, 0.95, 0.09, (BRASS, 0.08), 'scope_pier', verts=10)
k.sphere(TX, TR, 1.0, 0.12, 0.12, BRASS_L, 'scope_mount', segs=10)
k.tube((TX, TR + 0.75, 0.82), (TX, TR - 0.95, 2.35), 0.13, ('#c89848', 0.08), 'telescope', verts=14)
k.tube((TX, TR - 0.95, 2.35), (TX, TR - 1.05, 2.44), 0.16, BRASS_L, 'telescope_ring', verts=14)
k.tube((TX, TR + 0.75, 0.82), (TX, TR + 0.88, 0.7), 0.05, '#2a2a30', 'eyepiece', verts=8)
for t in (0.25, 0.6):
    p = (TX, TR + 0.75 - 1.7 * t, 0.82 + 1.53 * t)
    k.tube(p, (TX, p[1] - 0.05, p[2] + 0.045), 0.145, BRASS_L, 'telescope_ring', verts=14)
k.solid(TX - 0.5, TR - 0.5, TX + 0.5, TR + 0.5)

# ---- the angled walls: tall windows, star charts --------------------------------------------------------------------------
M.angled_window(k, P[7], P[0], C, 0.25, 0.75, 0.9, 2.45, moon=True)
M.angled_window(k, P[1], P[2], C, 0.25, 0.75, 0.9, 2.45)
k.area_light(3.3, 3.3, 1.9, '#7890e0', 40, 1.0, rot=(math.radians(-70), 0, math.radians(45)))
k.area_light(8.7, 3.3, 1.9, '#7890e0', 34, 1.0, rot=(math.radians(-70), 0, math.radians(-45)))
M.star_banner(k, P[6], P[7], C, 0.5, 0.9, 2.2, w=0.7, col='#1a2448')
M.star_banner(k, P[2], P[3], C, 0.35, 0.9, 2.2, w=0.7, col='#24183e')
M.star_banner(k, P[2], P[3], C, 0.75, 1.1, 2.0, w=0.5, col='#1a2448')

# ---- the orrery: a brass sun, seven worlds turning on their arms ------------------------------------------------------------
OX, OR = 6.0, 6.3
k.cyl(OX, OR, 0.0, 0.08, 0.62, (M.STONE_PD, 0.12), 'orrery_dais', verts=16)
k.cyl(OX, OR, 0.08, 0.16, 0.52, (shade(M.STONE_P, 1.1), 0.12), 'orrery_dais', verts=16)
k.cyl(OX, OR, 0.16, 0.95, 0.07, (BRASS, 0.08), 'orrery_column', verts=10)
for i in range(3):                                          # the column's three feet
    a = i * math.tau / 3 + 0.4
    k.tube((OX + math.cos(a) * 0.4, OR + math.sin(a) * 0.4, 0.16), (OX, OR, 0.6), 0.03, BRASS, 'orrery_column', verts=6)
k.sphere(OX, OR, 1.18, 0.24, 0.24, '#7a4a10', 'orrery_sun', emit=('#ffb040', 1.4), segs=16)
k.point_light(OX, OR, 1.2, '#ffb050', 22, radius=0.25, group='flicker')
for rr in (0.7, 1.25):                                      # two brass rings, the ecliptic's tracks
    n = 36
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        k.tube((OX + math.cos(a0) * rr, OR + math.sin(a0) * rr * 0.85, 1.05), (OX + math.cos(a1) * rr, OR + math.sin(a1) * rr * 0.85, 1.05),
               0.012, BRASS_L, 'orrery_ring', verts=4)
WORLDS = [  # (radius, angle, size, albedo, glow or None, ring?)  — Lumar, Arcadia, Enigma, the Singularity, Verdance, Hoarfell, Sylvara
    (0.7, 0.3, 0.1, '#1a6a50', ('#30c090', 0.35), False),
    (0.7, 2.4, 0.09, '#2a1a4a', ('#e070c0', 0.6), False),
    (0.7, 4.3, 0.11, '#8a7a5a', None, True),
    (1.25, 1.1, 0.08, '#08060e', ('#a080e0', 0.7), True),
    (1.25, 2.7, 0.09, '#4a8a3a', None, False),
    (1.25, 4.0, 0.09, '#d8e4f0', None, False),
    (1.25, 5.5, 0.1, '#2a5a2a', ('#d0a040', 0.25), False),
]
for (rr, a, s, alb, glow, ring) in WORLDS:
    px, pr, pz = OX + math.cos(a) * rr, OR + math.sin(a) * rr * 0.85, 1.05 + s + 0.06
    k.tube((OX, OR, 1.0), (px, pr, 1.0), 0.014, BRASS, 'orrery_arm', verts=4)
    k.cyl(px, pr, 1.0, pz - s, 0.012, BRASS, 'orrery_arm', verts=4)
    k.sphere(px, pr, pz, s, s, (alb, 0.1), 'orrery_world', emit=glow, segs=12)
    if ring:
        n = 16
        for i in range(n):
            a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
            k.tube((px + math.cos(a0) * s * 1.8, pr + math.sin(a0) * s * 0.7, pz + math.sin(a0) * s * 0.3),
                   (px + math.cos(a1) * s * 1.8, pr + math.sin(a1) * s * 0.7, pz + math.sin(a1) * s * 0.3), 0.008,
                   '#d8c8a0' if alb != '#08060e' else '#b090ff', 'orrery_ring', verts=4)
k.sphere(OX + 0.32, OR + 0.6, 1.3, 0.035, 0.035, '#e8e8f0', 'orrery_moon', segs=8)
k.solid(OX - 0.65, OR - 0.6, OX + 0.65, OR + 0.6)

# ---- the right front: the scrying pool -------------------------------------------------------------------------------------
SPX, SPR = 8.5, 8.6
W_RIM = '#4a4658'
for i in range(20):
    a0, a1 = i * math.tau / 20, (i + 1) * math.tau / 20
    k.bar(SPX + math.cos(a0) * 0.62, SPR + math.sin(a0) * 0.52, SPX + math.cos(a1) * 0.62, SPR + math.sin(a1) * 0.52, 0.0, 0.62, 0.16,
          (shade(W_RIM, rng.uniform(0.9, 1.1)), 0.14), 'pool_rim')
k.cyl(SPX, SPR, 0.0, 0.5, 0.56, '#06060e', 'pool_inner', ry=0.46, verts=20)
k.cyl(SPX, SPR, 0.5, 0.52, 0.55, '#0a1430', 'basin_water', ry=0.45, emit=('#3050a0', 0.4), verts=20)
for _ in range(7):                                          # the stars it holds that aren't overhead
    a, d = rng.uniform(0, math.tau), rng.uniform(0, 0.4)
    k.sphere(SPX + math.cos(a) * d, SPR + math.sin(a) * d * 0.8, 0.525, 0.018, 0.004, '#e0e8ff', 'pool_star', emit=('#c8d8ff', 1.0), segs=5)
for s in (-1, 1):                                           # two little moonstone lamps on its rim
    k.sphere(SPX + s * 0.62, SPR, 0.7, 0.06, 0.06, '#304060', 'pool_lamp', emit=('#a0c0ff', 1.0), segs=8)
k.point_light(SPX, SPR, 0.9, '#7090e0', 6, radius=0.3, group='flicker')
k.solid(SPX - 0.62, SPR - 0.52, SPX + 0.62, SPR + 0.52)

# ---- the left: the astronomer's desk, a chair, a globe of the heavens ------------------------------------------------------
DX, DR = 2.85, 5.6
k.box(DX - 0.45, DR - 0.75, 0.74, DX + 0.45, DR + 0.75, 0.82, (A.WOOD_D, 0.14), 'desk')
for (x, r) in ((DX - 0.4, DR - 0.7), (DX + 0.32, DR - 0.7), (DX - 0.4, DR + 0.62), (DX + 0.32, DR + 0.62)):
    k.box(x, r, 0.0, x + 0.08, r + 0.08, 0.74, A.WOOD_DD, 'table_leg')
k.box(DX - 0.3, DR - 0.55, 0.82, DX + 0.25, DR - 0.05, 0.84, '#d8ccac', 'chart_paper')
for i in range(5):
    k.box(DX - 0.26, DR - 0.5 + i * 0.09, 0.84, DX + 0.15, DR - 0.49 + i * 0.09, 0.845, '#3a3050', 'ink')
k.cyl(DX, DR + 0.25, 0.82, 0.86, 0.12, BRASS, 'astrolabe', verts=14)          # an astrolabe, lying down
k.cyl(DX, DR + 0.25, 0.86, 0.87, 0.1, BRASS_L, 'astrolabe', verts=14)
k.bar(DX - 0.1, DR + 0.25, DX + 0.1, DR + 0.25, 0.87, 0.88, 0.015, '#2a2a30', 'astrolabe')
for (zz, rad) in ((0.82, 0.07), (1.0, 0.07)):                                    # the hourglass
    k.cone(DX + 0.15, DR + 0.58, zz, zz + 0.09, rad, 0.012, '#c8e0f0', 'hourglass', verts=10)
    k.cone(DX + 0.15, DR + 0.58, zz + 0.09, zz + 0.18, 0.012, rad, '#c8e0f0', 'hourglass', verts=10)
k.cone(DX + 0.15, DR + 0.58, 0.83, 0.87, 0.06, 0.01, '#e0c080', 'sand', verts=8)
A.candle(k, DX - 0.3, DR + 0.55, 0.82, energy=2.0)
k.solid(DX - 0.45, DR - 0.75, DX + 0.45, DR + 0.75)
A.stool(k, DX + 0.75, DR)
CGX, CGR = 2.75, 7.2                                         # a celestial globe on its stand, gold stars on blue
k.cyl(CGX, CGR, 0.0, 0.7, 0.04, A.WOOD_DD, 'globe_stand', verts=6)
k.sphere(CGX, CGR, 0.95, 0.24, 0.24, ('#1a2a5a', 0.08), 'star_globe', segs=14)
for _ in range(10):
    a, b = rng.uniform(0, math.tau), rng.uniform(-1.2, 1.2)
    k.sphere(CGX + math.cos(a) * math.cos(b) * 0.245, CGR + math.sin(a) * math.cos(b) * 0.245, 0.95 + math.sin(b) * 0.245, 0.016, 0.016,
             '#f0d070', 'globe_star', emit=('#d0b050', 0.6), segs=4)
n = 24
for i in range(n):
    a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
    k.tube((CGX + math.cos(a0) * 0.29, CGR, 0.95 + math.sin(a0) * 0.29), (CGX + math.cos(a1) * 0.29, CGR, 0.95 + math.sin(a1) * 0.29), 0.012,
           BRASS_L, 'globe_ring', verts=4)
k.solid(CGX - 0.3, CGR - 0.3, CGX + 0.3, CGR + 0.3)

# ---- the right: a bench under the window, books, the cushion where the cat sleeps when it's up here -----------------------
A.bench(k, 8.3, 9.6, 4.2)
k.box(8.4, 4.0, 0.46, 9.0, 4.4, 0.54, ('#3a2a5a', 0.1), 'cushion', bevel=0.03)
A.book_stack(k, 9.4, 5.6, n=4)
A.book_stack(k, 9.1, 6.2, n=3)
A.rug(k, 4.6, 8.4, 7.4, 10.4, col='#1a1a3a', trim='#b8a060', pattern=True)
for (x, r) in ((2.6, 4.2), (9.6, 7.3)):
    M.candelabra(k, x, r)
for (x, r, z) in ((4.3, 4.6, 2.3), (7.8, 4.8, 2.2), (4.4, 7.0, 2.4), (7.7, 7.8, 2.3)):
    M.floating_candle(k, x, r, z)
k.point_light(6.0, 9.0, 2.5, '#9098d8', 26, radius=0.6)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.74}}, light_samples=128, world_light=('#242244', 0.4))


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Star Chamber', 'width': 12, 'height': 13, 'tileSize': 16, 'tileset': 'tower', 'spawns': {'player': [5, 8]},
          'shipExit': False, 'tiles': [[2] * 12 for _ in range(13)], 'collisions': [[0] * 12 for _ in range(13)]})
w['interactions'] = [
    {'x': x, 'y': 8, 'type': 'leave_world', 'leaveTo': 'lumar-midnight-tower-2', 'leaveSpawn': [6, 4], 'label': 'STAIRS DOWN',
     'prompt': 'PRESS E TO GO DOWN'} for x in (3, 4)] + [
    look(6, 7, 'ORRERY',
         "A BRASS SUN, WARM TO THE TOUCH, AND SEVEN WORLDS TURNING ROUND IT ON THEIR ARMS: A GREEN SEA, A CITY LIT ALL "
         "NIGHT, A RINGED GIANT, A DARK DISC THAT EATS THE LAMPLIGHT, A QUILT OF FIELDS, A WHITE ONE, A FOREST.\n\n"
         "THE SEVEN YOUR SHIP KNOWS. THE BRASS IS OLD. SHE KNEW THEM FIRST."),
    look(6, 4, 'TELESCOPE',
         "THE LONG TELESCOPE, AIMED OUT OF THE SLIT AT A PATCH OF SKY WITH NOTHING IN IT.\n\nYOU LOOK, AND THERE IS "
         "SOMETHING IN IT: A STAR THAT BLINKS THREE LONG, ONE SHORT. THEN NOT.", 'PRESS E TO PEER'),
    {'x': 8, 'y': 8, 'type': 'midnight_pool', 'label': 'SCRYING POOL', 'prompt': 'PRESS E TO LOOK IN',
     'dialog': "STILL WATER IN A STONE BASIN, HOLDING STARS THAT AREN'T OVERHEAD."},
    look(3, 5, 'STAR CHARTS',
         "MORWEN'S CHARTS OF THE SKY OVER MIDNIGHT, NIGHT BY NIGHT FOR FORTY YEARS. ONE STAR IS INKED IN RED ON EVERY "
         "PAGE, AND ON EVERY PAGE IT HAS MOVED A LITTLE CLOSER TO THE ISLE.", 'PRESS E TO READ'),
    look(2, 7, 'STAR GLOBE', "A GLOBE OF THE HEAVENS, GOLD STARS ON BLUE. SOMEBODY HAS ADDED A SMALL GALLEON IN PENCIL, "
         "SAILING BETWEEN TWO OF THEM."),
    look(9, 4, 'WINDOW SEAT', "A BENCH UNDER THE WINDOW WITH A CUSHION THE CAT HAS SHAPED TO ITSELF. FROM HERE YOU CAN SEE "
         "THE WHOLE MIDNIGHT SEA, AND THE MIST MOVING ON IT LIKE BREATH."),
    look(3, 3, 'WINDOW', "THE MOON, VERY CLOSE AND VERY WHITE. THE ABBEY RUINS BELOW, AND THE MOON POOL SHINING IN THEM."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (2, 2, 9, 10), doors=[], scene_id=WID)
print('star chamber done')
