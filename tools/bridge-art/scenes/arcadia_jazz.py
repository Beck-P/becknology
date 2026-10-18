"""Moonglow — the jazz bar on the Terraces, L200 (world id "arcadia-jazz").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_jazz.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-jazz

A low, warm room inside Cascade Tower: navy silk on the walls over walnut panelling, a chevron floor gone dark with
years, little round tables each with a candle in red glass, and a band on a small stage under a great round window
where the moon hangs in the smog (the window is a hole: js/worlds/terraces.js draws the live skyline behind it, the
world JSON's `midlevels.sky`). The long bar runs down the left wall, Sol behind it in front of a wall of lit bottles;
three velvet booths down the right; photographs of the old players in gilt frames; a coat check by the door. The
Odette Lark Quartet: Odette at the mic, Ray at the piano, Mingo on the bass, Lou-Lou on the drums.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade, THETA  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_signs as S               # noqa: E402
import assets_penthouse as PH          # noqa: E402
import assets_casino as CA             # noqa: E402
import assets_estate as E              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-jazz'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 14
C45 = math.cos(THETA)
H = 3.0 / C45
RF = 2.0                         # the back wall
FR = 12.0                        # the front wall
DOOR = (10.0, 12.0)
PAPER, WOOD = '#1a2244', '#4a2e1e'
GOLD = '#c8a050'
WARM = '#ffc078'
k = Kit(COLS, ROWS, margin_top=3.3, margin_bottom=0.6, margin_x=0.4, seed=5150)
rng = k.rng

# ---- the room ---------------------------------------------------------------------------------------------------------
E.parquet_chevron(k, 1.0, RF, 21.0, FR, tones=('#3a2414', '#341f12', '#422a18', '#2e1c10'))
WX0, WX1, WZ0, WZ1 = 11.5, 18.5, 1.1, H - 0.5          # the great window behind the stage
E.panelled_wall(k, 0.4, 21.6, RF, H, paper=PAPER, wood=WOOD, dado=1.0, rail=GOLD)
E.side_wall(k, 0.4, 1.0, 1.5, FR, H, paper=PAPER, wood=WOOD)
E.side_wall(k, 21.0, 21.6, 1.5, FR, H, paper=PAPER, wood=WOOD)
E.front_wall(k, 0.4, 21.6, FR, door=DOOR, wood=WOOD)
k.box(DOOR[0], FR, 0.0, DOOR[1], FR + 0.55, 0.02, ('#1a2a6a', 0.08), 'floor_mat')

# the round window: a hole in the wall (the sky is drawn live behind it), a thick walnut frame, brass glazing bars
CX, CZ, RAD = (WX0 + WX1) / 2, 3.05, 1.55
ring_out, ring_in = [], []
N = 40
for i in range(N):
    a = i * 2 * math.pi / N
    ring_out.append((CX + math.cos(a) * (RAD + 0.22), CZ + math.sin(a) * (RAD + 0.22)))
    ring_in.append((CX + math.cos(a) * RAD, CZ + math.sin(a) * RAD))
pane = [(CX + math.cos(i * 2 * math.pi / N) * RAD, RF + 0.08, CZ + math.sin(i * 2 * math.pi / N) * RAD) for i in range(N)]
# the hole: a flat disc of holdout just in front of the wall
k.poly([(x, r, z) for (x, r, z) in pane], 'HOLDOUT', 'window_glass')
for i in range(N):                                                    # the frame: a ring of short bars
    a0, a1 = i * 2 * math.pi / N, (i + 1) * 2 * math.pi / N
    for (rr, w, col) in ((RAD + 0.11, 0.22, ('#3a2416', 0.08)), (RAD + 0.26, 0.06, (GOLD, 0.04))):
        p0 = (CX + math.cos(a0) * rr, CZ + math.sin(a0) * rr)
        p1 = (CX + math.cos(a1) * rr, CZ + math.sin(a1) * rr)
        k.tube((p0[0], RF + 0.1, p0[1]), (p1[0], RF + 0.1, p1[1]), w / 2, col, 'window_frame', verts=6, smooth=False)
for a in range(4):                                                    # glazing bars, a cross and a ring
    ang = a * math.pi / 4
    k.tube((CX - math.cos(ang) * RAD, RF + 0.1, CZ - math.sin(ang) * RAD), (CX + math.cos(ang) * RAD, RF + 0.1, CZ + math.sin(ang) * RAD),
           0.025, (GOLD, 0.04), 'glazing_bar', verts=5)
for i in range(N):
    a0, a1 = i * 2 * math.pi / N, (i + 1) * 2 * math.pi / N
    k.tube((CX + math.cos(a0) * 0.75, RF + 0.1, CZ + math.sin(a0) * 0.75), (CX + math.cos(a1) * 0.75, RF + 0.1, CZ + math.sin(a1) * 0.75),
           0.022, (GOLD, 0.04), 'glazing_bar', verts=5, smooth=False)

# ---- the stage: a low dais of dark boards, its lip lit, the band ---------------------------------------------------------
SX0, SX1, SR1 = 10.5, 19.5, 5.3
k.box(SX0, RF, 0.0, SX1, SR1, 0.36, ('#2a1a10', 0.08), 'stage', bevel=0.02)
for i in range(int((SX1 - SX0) / 0.22)):
    x = SX0 + i * 0.22
    k.box(x, RF, 0.36, x + 0.21, SR1, 0.37, (('#4a2e1a', '#42291a', '#523420')[i % 3], 0.1), 'floor_stage')
k.box(SX0, SR1, 0.05, SX1, SR1 + 0.03, 0.3, '#1a1008', 'stage_lip')
for i in range(16):                                                    # footlights along the lip
    x = SX0 + 0.3 + i * (SX1 - SX0 - 0.6) / 15
    k.sphere(x, SR1 + 0.04, 0.18, 0.04, 0.04, '#fff0c0', 'footlight', emit=('#ffd890', 1.0), segs=6)
k.box(SX0 - 0.2, RF, 0.0, SX0, SR1, 0.38, ('#3a2416', 0.08), 'stage_end')
k.solid(SX0, RF, SX1, SR1)
# the piano (left of the stage), angled to the room, Ray at it
CA.grand_piano(k, 12.4, 3.6, col='#0e0b10', facing='right')
k.box(11.25, 4.35, 0.36, 11.85, 4.7, 0.82, ('#2a1a10', 0.08), 'piano_stool')
# the double bass, standing, Mingo behind it
BXc, BRc = 15.3, 3.6
k.blob(BXc, BRc + 0.15, 1.05, 0.34, 0.14, 0.42, ('#8a4a1a', 0.12), 'bass_body', segs=14)
k.blob(BXc, BRc + 0.15, 1.55, 0.26, 0.12, 0.25, ('#8a4a1a', 0.12), 'bass_body', segs=12)
k.box(BXc - 0.03, BRc + 0.28, 0.75, BXc + 0.03, BRc + 0.3, 1.85, '#1a1008', 'bass_fingerboard')
k.tube((BXc, BRc + 0.15, 1.85), (BXc, BRc + 0.15, 2.35), 0.035, ('#5a2e10', 0.1), 'bass_neck', verts=6)
k.sphere(BXc, BRc + 0.15, 2.4, 0.06, 0.06, ('#5a2e10', 0.1), 'bass_scroll', segs=6)
k.cyl(BXc, BRc + 0.15, 0.36, 0.62, 0.012, '#b0b0b8', 'bass_spike', verts=4)
for dx in (-0.1, 0.1):
    k.box(BXc + dx - 0.02, BRc + 0.3, 1.0, BXc + dx + 0.02, BRc + 0.31, 1.15, '#1a1008', 'bass_f')
# the drums, Lou-Lou behind them
DXc, DRc = 18.2, 3.4
k.cyl_y(DXc, DRc + 0.3, DRc + 0.62, 0.66, 0.34, 0.34, ('#e8e4dc', 0.04), 'kick_drum', verts=18)
k.cyl_y(DXc, DRc + 0.62, DRc + 0.64, 0.66, 0.3, 0.3, ('#3a1a5a', 0.06), 'kick_head', verts=18)
S.letters(k, 'OL', 'PoiretOne', DXc, DRc + 0.64, 0.56, size=0.18, col=GOLD, energy=2)
for (dx, z, rad) in ((-0.45, 0.85, 0.16), (0.45, 0.8, 0.18), (0.0, 1.05, 0.13)):
    k.cyl(DXc + dx, DRc + 0.2, z - 0.18, z, rad, ('#e8e4dc', 0.04), 'tom', verts=14)
    k.cyl(DXc + dx, DRc + 0.2, z, z + 0.01, rad, '#f4f0e8', 'drum_head', verts=14)
for (dx, z) in ((-0.75, 1.35), (0.75, 1.25)):
    k.cyl(DXc + dx, DRc + 0.15, 0.36, z, 0.012, '#9a9aa4', 'cymbal_stand', verts=4)
    k.cyl(DXc + dx, DRc + 0.15, z, z + 0.02, 0.26, ('#d0a040', 0.03), 'cymbal', verts=16)
k.cyl(DXc + 0.75, DRc - 0.2, 0.36, 0.85, 0.012, '#9a9aa4', 'hihat_stand', verts=4)
# the singer's mic at the front of the stage, a stool, a spotlight from above
CA.mic_stand(k, 14.6, 4.8, 0.36)
k.cyl(16.6, 4.6, 0.36, 1.0, 0.02, '#9a9aa4', 'sax_stand', verts=4)               # the sax, resting on its stand
k.tube((16.6, 4.62, 0.75), (16.68, 4.62, 1.35), 0.05, ('#d0a040', 0.03), 'sax', verts=8)
k.tube((16.6, 4.62, 0.75), (16.48, 4.66, 0.62), 0.07, ('#d0a040', 0.03), 'sax', verts=8)
k.cone(16.48, 4.66, 0.62, 0.85, 0.07, 0.13, ('#d0a040', 0.03), 'sax_bell', verts=10)
k.area_light(14.6, 5.4, 3.6, '#fff0d0', 120, 1.2, rot=(math.radians(-20), 0, 0))
k.area_light(11.0, 8.0, 4.5, '#ffb878', 160, 10.0)
k.point_light(12.4, 4.2, 2.6, WARM, 10, radius=0.4, group='lamp')
k.point_light(18.2, 4.0, 2.6, '#a0b0ff', 8, radius=0.4, group='lamp')
S.neon(k, 'Moonglow', 'Pacifico', 7.0, RF + 0.08, 2.75, size=0.62, col='#8aa8ff', energy=10)

# ---- the long bar down the left wall: bottles lit from behind, the counter, stools ------------------------------------
k.box(1.0, RF, 0.0, 1.35, 10.6, 2.6, ('#1a0e0a', 0.06), 'back_bar')
for z in (1.05, 1.5, 1.95, 2.4):
    k.box(1.3, RF + 0.2, z - 0.03, 1.55, 10.4, z, '#2a1a10', 'bottle_shelf', emit=('#ffb060', 0.25))
    bottles = {}
    r = RF + 0.35
    while r < 10.3:
        col = rng.choice(('#c87a30', '#e8b040', '#3a6a3a', '#e8e0d0', '#7a2a2a', '#3a4a7a', '#c8a040'))
        bottles.setdefault(col, []).append(r)
        r += rng.uniform(0.17, 0.28)
    for col, rows in bottles.items():
        for rr in rows:
            k.cyl(1.42, rr, z, z + 0.24 + rng.random() * 0.08, 0.045, (col, 0.05), 'bottle', emit=(col, 0.3), verts=6)
k.box(1.35, RF, 0.95, 1.4, 10.6, 2.6, '#3a2a40', 'bar_mirror', emit=('#3a2a5a', 0.25))
BX0, BX1 = 2.6, 3.4
k.box(BX0, 2.8, 0.0, BX1, 10.2, 1.05, ('#3a1a14', 0.08), 'bar', bevel=0.02)
for r in [2.9 + i * 0.6 for i in range(13)]:                               # fluted front, brass foot rail
    k.box(BX1, r, 0.1, BX1 + 0.04, r + 0.4, 0.95, ('#4a2418', 0.08), 'bar_flute')
k.box(BX0 - 0.06, 2.75, 1.05, BX1 + 0.08, 10.25, 1.12, ('#7a4a24', 0.1), 'bar_top', bevel=0.01)
k.box(BX1 + 0.18, 2.9, 0.18, BX1 + 0.22, 10.1, 0.22, (GOLD, 0.04), 'foot_rail')
for r in (3.6, 6.4, 9.2):
    E.table_lamp(k, 2.95, r, 1.12, base=GOLD, shade_col='#e8b878', energy=4)
for r in (4.6, 5.3, 7.4, 8.1):
    k.cyl(2.95, r, 1.12, 1.26, 0.04, ('#e0f0ff', 0.03), 'glass', emit=('#c08040', 0.3), verts=6)
k.solid(BX0, 2.8, BX1, 10.2)
k.solid(1.0, RF, 2.6, 10.6)
for r in (3.5, 4.6, 5.7, 6.8, 7.9, 9.0):
    PH.bar_stool(k, 4.0, r, seat='#3a2a5a', metal=GOLD)
for r in range(3, 10):
    k.blocked.discard((4, r))

# ---- the booths down the right wall --------------------------------------------------------------------------------------
for r0 in (6.0, 8.1, 10.2):
    k.box(20.3, r0, 0.0, 21.0, r0 + 1.7, 1.25, ('#3a1a4a', 0.1), 'booth_back', bevel=0.04)
    k.box(19.5, r0, 0.0, 20.3, r0 + 0.35, 1.0, ('#3a1a4a', 0.1), 'booth_arm', bevel=0.04)
    k.box(19.6, r0 + 0.35, 0.0, 20.3, r0 + 1.7, 0.45, ('#4a2458', 0.1), 'booth_seat', bevel=0.04)
    k.box(18.4, r0 + 0.5, 0.0, 19.3, r0 + 1.4, 0.72, ('#2a160e', 0.08), 'booth_table', bevel=0.02)
    k.box(18.36, r0 + 0.46, 0.72, 19.34, r0 + 1.44, 0.76, ('#3a2216', 0.08), 'booth_table_top')
    k.box(18.36, r0 + 0.46, 0.7, 19.34, r0 + 0.5, 0.76, (GOLD, 0.04), 'booth_table_edge')
    k.cyl(18.85, r0 + 0.95, 0.76, 0.86, 0.05, '#7a1a1a', 'candle_glass', emit=('#ff6030', 0.8), verts=8)
    k.point_light(18.85, r0 + 0.95, 1.0, '#ff9050', 3, radius=0.06, group='flicker')
    k.solid(19.5, r0, 21.0, r0 + 1.7)
    k.solid(18.4, r0 + 0.5, 19.3, r0 + 1.4)
k.solid(19.5, 11.9, 21.0, 12.0)

# ---- the tables: small and round, a candle in red glass, two club chairs each ------------------------------------------
TABLES = [(6.5, 6.55), (9.5, 6.55), (12.5, 7.05), (15.5, 7.05), (6.5, 9.55), (9.5, 9.55), (13.5, 9.55)]
for (cx, cr) in TABLES:
    k.cyl(cx, cr, 0.0, 0.05, 0.22, (GOLD, 0.04), 'table_foot', verts=12)
    k.cyl(cx, cr, 0.05, 0.7, 0.04, (GOLD, 0.04), 'table_stem', verts=6)
    k.cyl(cx, cr, 0.7, 0.75, 0.38, ('#2a160e', 0.06), 'table_top', verts=18)
    k.cyl(cx, cr, 0.75, 0.86, 0.05, '#7a1a1a', 'candle_glass', emit=('#ff6030', 0.8), verts=8)
    k.point_light(cx, cr, 1.0, '#ff9050', 3, radius=0.06, group='flicker')
    CA.club_chair(k, cx - 1.0, cr, facing='right', col='#4a2458')
    CA.club_chair(k, cx + 1.0, cr, facing='left', col='#4a2458')
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)

# ---- the walls: photographs of the old players, sconces, the coat check by the door -------------------------------------
for (x, z) in ((5.0, 1.6), (6.4, 1.9), (7.8, 1.6), (20.0, 1.7)):
    E.gilt_frame(k, x - 0.42, x + 0.42, RF, z, z + 0.62, ornate=False)
    k.box(x - 0.34, RF + 0.05, z + 0.08, x + 0.34, RF + 0.06, z + 0.54, '#2a2620', 'photo')
    k.blob(x, RF + 0.065, z + 0.3, 0.1, 0.01, 0.16, '#5a524a', 'photo_figure', segs=8)
for x in (4.4, 9.4, 20.2):
    E.sconce(k, x, RF, z=1.95, arms=1, col=GOLD, energy=4)
k.box(1.0, 10.8, 0.0, 2.6, 11.4, 1.0, ('#3a1a14', 0.08), 'coat_counter', bevel=0.02)
k.box(0.95, 10.75, 1.0, 2.65, 11.45, 1.05, ('#7a4a24', 0.1), 'coat_top')
k.box(1.6, 10.6, 1.05, 1.9, 10.9, 1.15, ('#c8a050', 0.06), 'coat_bell')
for i in range(5):                                                     # coats on the rail behind
    k.blob(1.25, 10.9 + i * 0.12, 1.4, 0.12, 0.05, 0.45, (('#2a2a3a', '#5a2a2a', '#3a3a2a', '#1a1a1a', '#4a3a5a')[i], 0.12), 'coat', segs=8)
k.solid(1.0, 10.6, 2.6, 11.45)
E.potted_palm(k, 8.6, 11.3, h=1.5, pot='#1a1820', leaf='#3a6a3a', fronds=9)
E.potted_palm(k, 13.4, 11.3, h=1.5, pot='#1a1820', leaf='#3a6a3a', fronds=9)

# ---- light: low and warm, the moon blue through the window --------------------------------------------------------------
for (x, r) in ((7.0, 6.0), (12.0, 8.0), (7.0, 10.0), (17.0, 9.5)):
    k.point_light(x, r, 2.8, '#ffb070', 34, radius=0.5, group='lamp')
k.area_light(CX, RF + 0.6, 3.0, '#6a80e0', 60, 3.0, rot=(math.radians(-80), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0, 'lamp': 1.0}, 'dim': {'flicker': 0.7, 'lamp': 0.95}},
         light_samples=int(os.environ.get('SAMPLES', 128)), world_light=('#241e3a', 0.5))

# ---- the world -----------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Moonglow', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia', 'interior': True,
          'spawns': {'player': [11, 11]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})


def look(label, x, y, text, **kw):
    it = {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO LOOK', 'dialog': text}
    it.update(kw)
    return it


def talk(label, x, y, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO TALK', 'dialog': text}


w['interactions'] = [
    {'x': x, 'y': 12, 'type': 'leave_world', 'leaveTo': 'arcadia-terraces', 'leaveSpawn': [15, 13], 'label': 'THE TERRACES',
     'prompt': 'PRESS E TO GO OUT'} for x in (10, 11)] + [
    {'x': 3, 'y': 5, 'type': 'vendor', 'label': 'THE BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'blue_note', 'price': 11}, {'id': 'moonglow_old_fashioned', 'price': 13}, {'id': 'cloud_espresso', 'price': 7}]},
    talk('SOL', 2, 6, 'SOL POLISHES A GLASS THAT IS ALREADY CLEAN AND LISTENS TO THE PIANO.'),
    talk('ODETTE', 14, 4, 'ODETTE LARK HOLDS THE LAST NOTE UNTIL THE ROOM FORGETS TO BREATHE.'),
    talk('RAY', 11, 4, 'RAY PLAYS WITH HIS EYES SHUT AND A CIGARETTE HE NEVER LIGHTS.'),
    talk('MINGO', 16, 4, 'MINGO NODS ALONG WITH THE BASS LIKE THEY ARE HAVING A CONVERSATION.'),
    look('THE MOON WINDOW', 17, 4, 'THE MOON HANGS IN THE SMOG LIKE A LAMP IN A FISH TANK. BELOW IT THE TOWERS GO ON FOR EVER.',
         action='view', view='skyline'),
    look('PHOTOGRAPHS', 6, 3, 'OLD PLAYERS IN GILT FRAMES: A TRUMPETER WITH HIS EYES CLOSED, A WOMAN AT A PIANO LAUGHING, ODETTE AT NINETEEN, ALREADY WEARING THAT DRESS.'),
    look('COAT CHECK', 2, 11, 'NOBODY ON THE COAT CHECK TONIGHT. A NOTE: "HANG IT YOURSELF. WE TRUST YOU. MOSTLY."'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-jazz-singer', 'x': 14, 'y': 4, 'facing': 'down', 'lift': 0.36},
          {'sheet': 'npc-jazz-pianist', 'x': 11, 'y': 4, 'facing': 'right', 'pose': 'sit', 'lift': 0.36},
          {'sheet': 'npc-jazz-bassist', 'x': 15, 'y': 3, 'facing': 'down', 'lift': 0.36},
          {'sheet': 'npc-jazz-drummer', 'x': 18, 'y': 2, 'facing': 'down', 'pose': 'sit', 'lift': 0.36},
          {'sheet': 'npc-jazz-bartender', 'x': 2, 'y': 6, 'facing': 'right'}]
for a in ACTORS:
    k.blocked.add((a['x'], a['y']))
apply_world(WORLD, k, (1, 2, 20, 11), doors=[(10, 12), (11, 12)], scene_id=WID, actors=ACTORS)
w = json.load(open(WORLD))
w['midlevels'] = {'sky': [round(CX - RAD, 3), round(RF - (CZ + RAD) * C45, 3), round(CX + RAD, 3), round(RF - (CZ - RAD) * C45, 3)],
                  'moon': [round(CX, 3), round(RF - CZ * C45, 3), RAD]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('moonglow done')
