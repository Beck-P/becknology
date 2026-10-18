"""The rave in the old Central station — at the bottom of the Sump (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_sump_rave.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-sump-rave

An illegal party in a station that drowned before anyone alive was born: the platform under its tiled vault (CENTRAL in
old enamel letters), the track bed flooded black with the light coming up through it, a carriage half sunk at the far
end lit purple and made the bar, Lux on the decks on a stack of speakers on the platform's edge, laser lines cutting
the steam, glow sticks in the water, a crowd. Teal and violet. World: arcadia-sump-rave, 34 x 22.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_under as U                    # noqa: E402
import assets_cyber as Y                    # noqa: E402
import assets_signs as S                    # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-sump-rave'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 34, 22
R0 = 3.0                 # the back wall: the vault's tiled face
PE = 15.0                # the platform's edge; the flooded track bed beyond
TEAL, VIO = '#40e0c0', '#c060ff'
WZ = -1.0

k = Kit(COLS, ROWS, margin_top=0.6, margin_bottom=0.5, seed=3434)
dr = U.Drips()
rng = k.rng

# ---- the vault: white tiles gone green and brown, the station's name in enamel, the stairs up ----------------------------------
k.box(-0.5, R0 - 0.5, 0, COLS + 0.5, R0, 5.0, ('#c8d0c0', 0.1), 'wall_tile')
k.boxes([(-0.5, R0, z, COLS + 0.5, R0 + 0.008, z + 0.012) for z in [0.15 + i * 0.15 for i in range(32)]], '#8a9488', 'tile_seam')
k.boxes([(x, R0, 0.0, x + 0.012, R0 + 0.008, 5.0) for x in [i * 0.3 for i in range(114)]], '#8a9488', 'tile_seam')
k.box(-0.5, R0 + 0.009, 0.0, COLS + 0.5, R0 + 0.012, 1.3, ('#3a5a40', 0.35), 'damp')                         # where the water stood
k.box(-0.5, R0 + 0.009, 1.3, COLS + 0.5, R0 + 0.012, 1.45, ('#5a4a30', 0.3), 'tide_mark')
k.box(-0.5, R0 + 0.01, 3.6, COLS + 0.5, R0 + 0.03, 3.8, ('#2a5a8a', 0.1), 'tile_band')
for x0 in (4.0, 22.0):                                                                                   # CENTRAL, in enamel
    k.box(x0, R0 + 0.02, 2.4, x0 + 7.0, R0 + 0.06, 3.3, ('#1a3a7a', 0.1), 'enamel_sign')
    k.box(x0 + 0.08, R0 + 0.06, 2.48, x0 + 6.92, R0 + 0.065, 3.22, '#e8e8e0', 'enamel_border')
    k.box(x0 + 0.14, R0 + 0.065, 2.54, x0 + 6.86, R0 + 0.07, 3.16, ('#1a3a7a', 0.1), 'enamel_sign')
    S.letters(k, 'CENTRAL', 'RussoOne', x0 + 3.5, R0 + 0.07, 2.62, size=0.46, col='#e8e8e0', lit=False)
k.box(14.4, R0 - 0.3, 0.0, 17.6, R0 + 0.01, 2.2, '#100c14', 'stair_arch')                               # the way up: a tiled arch, the stair lit
for i in range(7):
    k.box(14.5, R0 - 0.3 + i * 0.04, i * 0.3, 17.5, R0 - 0.26 + i * 0.04, 0.05 + i * 0.3, ('#4a4a50', 0.1), 'stair_tread')
for x0 in (13.9, 17.6):                                                                       # the arch's tiled jambs and head
    k.box(x0, R0 + 0.0, 0.0, x0 + 0.5, R0 + 0.12, 2.4, ('#d8dcd0', 0.1), 'arch_jamb')
k.box(13.9, R0 + 0.0, 2.2, 18.1, R0 + 0.12, 2.6, ('#d8dcd0', 0.1), 'arch_head')
k.box(14.6, R0 + 0.12, 2.28, 17.4, R0 + 0.13, 2.52, '#0a2a0a', 'exit_sign', emit=('#40ff80', 0.8))
k.point_light(16.0, R0 + 0.3, 2.8, '#ffc070', 20, radius=0.5, group='flicker')

# ---- the platform: old tiles, cracked; benches; the decks on a stack of speakers ----------------------------------------------
Y.tile_floor(k, -0.5, R0, COLS + 0.5, PE, tones=('#4a4a46', '#44443e'), size=0.5, seam='#1a1a18')
k.box(-0.5, PE - 0.3, -0.01, COLS + 0.5, PE, 0.005, '#c8a030', 'platform_edge')                           # the yellow line
k.box(-0.5, PE, WZ - 0.5, COLS + 0.5, PE + 0.06, 0.0, ('#3a3a36', 0.1), 'platform_face')
for (x, r) in ((3.0, 4.2), (29.0, 4.2)):                                                                  # old benches
    k.box(x - 1.2, r, 0.42, x + 1.2, r + 0.5, 0.48, ('#6a4a2a', 0.15), 'bench')
    k.box(x - 1.2, r - 0.05, 0.48, x + 1.2, r + 0.05, 0.95, ('#6a4a2a', 0.15), 'bench_back')
    for dx in (-1.0, 1.0):
        k.box(x + dx - 0.05, r, 0.0, x + dx + 0.05, r + 0.5, 0.42, '#2a2a2a', 'bench_leg')
    k.solid(x - 1.2, r - 0.05, x + 1.2, r + 0.5)
DX = 16.0
for s in (-1, 1):                                                                                          # speaker walls
    for j in range(2):
        for i in range(2):
            x0 = DX + s * (2.4 + i * 1.3) - (1.2 if s < 0 else 0)
            k.box(x0, 11.6, j * 1.1, x0 + 1.2, 12.6, j * 1.1 + 1.05, ('#141218', 0.08), 'speaker', bevel=0.03)
            k.cyl_y(x0 + 0.6, 12.6, 12.64, j * 1.1 + 0.52, 0.4, 0.4, '#2a2830', 'cone', verts=16)
    k.solid(DX + s * 2.4 - (2.5 if s < 0 else 0), 11.6, DX + s * 2.4 + (2.5 if s > 0 else 0), 12.6)
k.box(DX - 2.0, 11.4, 0.0, DX + 2.0, 12.6, 1.05, ('#1a1820', 0.06), 'deck_table', bevel=0.02)
for x in (DX - 1.0, DX + 1.0):
    k.cyl(x, 12.0, 1.05, 1.09, 0.3, '#0e0e14', 'turntable', verts=16)
k.box(DX - 0.4, 11.8, 1.05, DX + 0.4, 12.2, 1.1, '#2a2a34', 'mixer')
k.box(DX - 2.0, 12.6, 0.1, DX + 2.0, 12.62, 0.95, '#0a0818', 'deck_front', emit=(VIO, 0.6))
k.solid(DX - 2.0, 11.4, DX + 2.0, 12.6)
# laser lines across the steam, glow sticks everywhere, a dangling string of bare bulbs
for i in range(7):
    a = -0.9 + i * 0.3
    k.tube((DX, 11.4, 2.6), (DX + math.sin(a) * 14, 11.4 - math.cos(a) * 7, 4.4), 0.012, shade((TEAL, VIO)[i % 2], 0.5),
           'laser', emit=((TEAL, VIO)[i % 2], 1.0), verts=4)
k.box(DX - 0.3, 11.2, 2.4, DX + 0.3, 11.6, 2.7, '#1a1a1e', 'laser_box')
for _ in range(30):
    x, r = rng.uniform(1, 33), rng.uniform(5, 14.5)
    col = rng.choice((TEAL, VIO, '#ff60a0', '#a0ff40'))
    k.tube((x, r, 0.005), (x + rng.uniform(-0.12, 0.12), r + rng.uniform(-0.06, 0.06), 0.01), 0.012, shade(col, 0.5), 'glowstick', emit=(col, 0.9), verts=4)
k.tube((1.0, 7.0, 3.6), (33.0, 7.0, 3.6), 0.008, '#14121a', 'bulb_line', verts=3)
for x in [2.0 + i * 2.0 for i in range(16)]:
    U.caged_bulb(k, x, 7.0, 3.3 - 0.3 * math.sin(math.pi * (x - 1) / 32), col='#ffd8a0', energy=5, wire_to=3.6)

# ---- the flooded track bed and the half-sunk carriage, made the bar --------------------------------------------------------------
U.canal(k, -0.5, PE + 0.06, COLS + 0.5, ROWS + 1.0, z=WZ, glow='#40c0c0', rng=rng, debris=False)
for _ in range(25):                                                                 # glow sticks floating
    x, r = rng.uniform(0, 34), rng.uniform(PE + 0.5, ROWS)
    col = rng.choice((TEAL, VIO, '#ff60a0'))
    k.tube((x, r, WZ + 0.005), (x + 0.15, r + 0.04, WZ + 0.01), 0.014, shade(col, 0.5), 'glowstick', emit=(col, 0.9), verts=4)
for r in (PE + 1.6, PE + 3.4):                                                      # the rails, just under
    k.box(-0.5, r, WZ - 0.12, COLS + 0.5, r + 0.08, WZ - 0.04, '#5a3a2a', 'rail')
CR = PE + 2.5
k.box(22.0, CR - 1.2, WZ - 0.6, 33.6, CR + 1.2, WZ + 2.0, ('#5a6a7a', 0.15), 'carriage', bevel=0.12)
k.box(22.0, CR - 1.21, WZ + 2.0, 33.6, CR + 1.21, WZ + 2.25, ('#4a5a6a', 0.1), 'roof_carriage', bevel=0.1)
for i in range(6):                                                                  # its windows lit violet, people inside
    x = 22.6 + i * 1.8
    k.box(x, CR - 1.22, WZ + 1.0, x + 1.2, CR - 1.2, WZ + 1.7, shade(VIO, 0.3), 'carriage_window', emit=(VIO, 0.7))
for i in range(4):
    k.box(23.0 + i * 2.6, CR + 1.2, WZ + 1.0, 24.4 + i * 2.6, CR + 1.22, WZ + 1.7, shade(VIO, 0.3), 'carriage_window', emit=(VIO, 0.7))
k.box(22.0, CR + 1.22, WZ + 0.6, 33.6, CR + 1.24, WZ + 0.7, '#c8a030', 'carriage_stripe')
k.box(22.6, PE - 0.02, -0.02, 25.4, CR - 1.2, 0.04, ('#6a4a2a', 0.15), 'floor_gangplank')                      # a gangplank to it
k.box(25.0, CR + 1.22, WZ + 1.0, 29.0, CR + 1.24, WZ + 1.6, '#0a0818', 'bar_sign_board')
S.neon(k, 'BAR', 'Monoton', 27.0, CR + 1.24, WZ + 1.05, size=0.4, col=VIO, energy=10)
k.point_light(27.5, CR + 1.8, WZ + 1.4, VIO, 40, radius=0.8, group='flicker')

# ---- light: violet and teal, the lasers, the water ----------------------------------------------------------------------------------
for (x, r, z, col, e) in ((8.0, 9.0, 3.0, VIO, 40), (24.0, 9.0, 3.0, TEAL, 40), (16.0, 13.0, 2.0, VIO, 30), (4.0, 14.0, 1.2, TEAL, 18),
                          (12.0, 18.0, WZ + 0.4, TEAL, 40), (4.0, 19.0, WZ + 0.4, TEAL, 30)):
    k.point_light(x, r, z, col, e, radius=0.6, group='flicker')
for x in (6.0, 14.0, 22.0):
    dr.vent(x, 13.0, 0.0)
dr.drip(9.0, 10.0, 6.0)
dr.drip(25.0, 6.0, 6.0)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.5}}, light_samples=96, world_light=('#22163a', 1.2))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Central (the rave)', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [16, 4]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': x, 'y': 3, 'type': 'leave_world', 'label': 'THE SUMP', 'prompt': 'UP THE STAIRS', 'leaveTo': 'arcadia-sump', 'leaveSpawn': [71, 28]}
    for x in (15, 16, 17)] + [
    {'x': 16, 'y': 9, 'type': 'under', 'act': 'dance', 'label': 'THE PLATFORM', 'prompt': 'PRESS E TO DANCE',
     'dance': 'THE BASS COMES UP OUT OF THE FLOODED TRACKS AND THROUGH THE TILES, THE LASERS CUT THE STEAM INTO SLICES, A HUNDRED PEOPLE WHO LIVE AT THE BOTTOM OF EVERYTHING JUMP AT ONCE.'},
    {'x': 16, 'y': 11, 'type': 'dialog', 'label': 'LUX', 'prompt': 'PRESS E TO TALK', 'dialog': 'LUX GRINS AND KEEPS PLAYING.'},
    {'x': 24, 'y': 15, 'type': 'dialog', 'label': 'RAVE BAR', 'prompt': 'PRESS E TO ORDER', 'dialog': 'DRINKS.'},
    look(7, 3, 'CENTRAL', 'THE STATION\'S NAME IN BLUE ENAMEL, THE TILES AROUND IT GREEN WHERE THE WATER STOOD. THE LAST TRAIN LEFT FROM HERE BEFORE ANYONE IN THIS ROOM WAS BORN.'),
    look(3, 4, 'BENCH', 'A PLATFORM BENCH, THE WOOD BLACK WITH DAMP. TWO PEOPLE ASLEEP ON IT THROUGH THE LOUDEST PART OF THE NIGHT.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.blocked.update({(c, r) for c in range(COLS) for r in range(int(PE), ROWS)})
for c in range(22, 26):
    k.blocked.discard((c, int(PE)))                                                 # the gangplank's head
DANCERS = [('npc-patron-a', 8, 9, 'up'), ('npc-patron-b', 11, 8, 'right'), ('npc-passerby', 20, 9, 'left'), ('npc-shopper', 23, 8, 'up'),
           ('npc-courier', 13, 10, 'up'), ('npc-husk', 27, 10, 'down'), ('npc-saint-b', 5, 11, 'right')]
for (s_, x, y, f) in DANCERS:
    k.solid(x, y, x + 1, y + 1)
apply_world(WORLD, k, (0, int(R0) + 1, COLS - 1, int(PE)), doors=[(15, 3), (16, 3), (17, 3)], scene_id=WID,
            actors=[{'sheet': 'npc-lux', 'x': 16, 'y': 11, 'facing': 'down'}] +
                   [{'sheet': s_, 'x': x, 'y': y, 'facing': f, 'dance': True} for (s_, x, y, f) in DANCERS])
w = json.load(open(WORLD))
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'sump'}
w['scene']['steam'] = dr.steam
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('rave done', len(k.parts), 'parts')
