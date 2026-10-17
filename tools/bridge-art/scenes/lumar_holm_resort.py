"""The Starling — the hotel on your holm, inside: its lobby, its bar and its terrace over the sea (world id
"lumar-holm-resort"; js/holm.js, js/business.js `holm-resort`, js/home.js, js/estate.js).
Usage: BVENV/bin/python lumar_holm_resort.py RENDER_DIR

Sun-bleached seaside elegance behind the door of the old boathouse's replacement: whitewashed boards; white walls
trimmed in sea blue; the front desk with its brass bell, guest book and hydrangeas, the keys hanging in their
pigeonholes behind it under a chart of the holm and a life ring; a racetrack of a cocktail bar in woven rattan round a
tower of lit bottles the colours of a sunset, bamboo stools with striped cushions; a rattan sofa and tub chairs and a
peacock chair round a low table on a striped jute rug; kentia palms in pots; ceiling fans turning their palm-leaf
blades; and through a colonnade hung with white voile, the terrace: pale limestone, a white balustrade with hurricane
lamps along it, café tables and rattan chairs facing the water, bougainvillea and a lemon tree in pots, a brass
telescope — and past it the sea (a hole in the render; js/estate.js draws the holm's own sea there, `scene.sea`).
The staff stand in it as you hire them and guests come when it's open (actors with a `role`, js/holm.js). Open boards
and flags for the furniture you buy.
"""
import math
import sys

import json

from _manor import A, E, Kit, C45, render, look, door, write_world, world_path  # noqa: F401
from scenekit import shade
import assets_village as V
import assets_town as T

OUT = sys.argv[1]
WID = 'lumar-holm-resort'
COLS, ROWS = 24, 15
H = 2.8 / C45
FLOOR = (1, 2, 22, 13)
DOORS = [(11, 14), (12, 14)]
WALL, TRIM = '#efe8dc', E.SEA_BLUE
CR = 5.5                                                     # the colonnade, between the lobby and the terrace

k = Kit(COLS, ROWS, margin_top=2.6, margin_bottom=1.4, margin_x=1.6, seed=7711)

# ---- floors, walls --------------------------------------------------------------------------------------------------
E.flagstones(k, 0.4, 1.7, 23.6, CR + 0.1)
E.parquet_planks(k, 1.0, CR + 0.1, 23.0, 14.0, tones=('#d8cbb0', '#cfc0a2', '#e2d6be', '#c8b898'), plank=0.24, lengths=(1.5, 2.0, 2.5))
E.terrace_balustrade(k, 0.4, 23.6, 2.0)
for x in (0.55, 23.45):                                      # the terrace's ends, over the water too
    k.box(x - 0.12, 1.85, 0, x + 0.12, CR - 0.1, 0.14, ('#ebe6dc', 0.06), 'balustrade')
    k.box(x - 0.15, 1.85, 0.83, x + 0.15, CR - 0.1, 0.95, ('#f0ece2', 0.06), 'balustrade_rail')
    r = 2.2
    while r < CR - 0.2:
        k.cyl(x, r, 0.14, 0.83, 0.04, '#f0ece2', 'baluster', verts=8)
        r += 0.2
k.box(0.3, 1.8, -1.6, 23.7, CR, -0.02, ('#b8ae9a', 0.1), 'terrace_wall')               # the terrace's stone, down into the water
# the island round the hotel: lawn at its sides and front, a gravel path to the door, a hedge, flowers under the walls
LAWN = ('#4a6a3c', 0.14)
for (a, b, c, d) in ((-1.6, CR - 0.1, 0.4, 16.6), (23.6, CR - 0.1, 25.6, 16.6), (0.4, 14.55, 23.6, 16.6)):
    k.box(a, b, -0.3, c, d, -0.002, LAWN, 'lawn')
k.box(-1.6, CR - 0.1, -1.6, 25.6, CR, -0.3, ('#7a7062', 0.12), 'shore_rock')
k.box(10.4, 14.5, -0.3, 13.6, 16.6, 0.004, ('#c8b898', 0.14), 'gravel')
for x in (9.9, 13.85):                                      # lanterns either side of the path
    T.lantern_post(k, x, 14.85, h=2.0, energy=30)
for (x0, x1) in ((-1.4, 0.2), (23.8, 25.4)):
    for i in range(7):
        r = CR + 0.6 + i * 1.3
        k.blob((x0 + x1) / 2 + 0.25 * math.sin(i * 1.7), r, 0.35, 0.55, 0.45, 0.4, ('#3e6232', 0.16), 'hedge', segs=10)
    for i in range(10):
        r = CR + 0.4 + i * 0.9
        k.sphere(x1 - 0.12 if x0 < 0 else x0 + 0.12, r, 0.12, 0.06, 0.05, ('#e890b0', '#f0e0a0', '#c8384a')[i % 3], 'bloom', segs=6)
for x in (1.0, 3.5, 6.0, 8.5, 15.0, 17.5, 20.0, 22.5):
    k.blob(x, 15.0, 0.18, 0.5, 0.3, 0.25, ('#4a7a3a', 0.16), 'shrub', segs=8)
    for j in range(3):
        k.sphere(x - 0.25 + j * 0.25, 14.85 + 0.1 * (j % 2), 0.38, 0.05, 0.04, ('#e890b0', '#f4f0e6', '#e8c040')[j], 'bloom', segs=6)
for x in (1.5, 5.5, 9.5, 14.5, 18.5, 22.5):                 # hurricane lamps along the balustrade
    E.hurricane_lamp(k, x, 2.0, 0.95, energy=3.0, s=1.1)
for (x0, x1) in ((0.4, 1.0), (23.0, 23.6)):
    k.box(x0, CR - 0.1, 0, x1, 14.0, H, (WALL, 0.05), 'side_wall')
    k.box(x0 - 0.02, CR - 0.1, H, x1 + 0.02, 14.0, H + 0.05, shade(WALL, 0.92), 'wall_cap')
    k.box((x1 - 0.06) if x0 < 1 else x0, CR - 0.1, H + 0.05, (x1 + 0.02) if x0 < 1 else (x0 + 0.06), 14.0, H + 0.07, TRIM, 'wall_cap_trim')
    k.box(x0 - 0.02, 14.0, 0, x1 + 0.02, 14.03, H + 0.05, (shade(WALL, 0.84), 0.05), 'wall_end')
    k.box(x0 - 0.02, CR - 0.12, 0, x1 + 0.02, CR - 0.1, H + 0.05, '#120c0a', 'wall_cut')
E.front_wall(k, 0.4, 23.6, 14.0, door=(11.0, 13.0), wood=WALL, stone=shade(WALL, 0.9))
E.runner_carpet(k, 11.15, 12.6, 12.85, 14.0, col=TRIM, trim=WALL, motif=False)
E.colonnade(k, 1.0, 23.0, CR, h=2.75, step=2.2, col='#f4f0e6')
V.board_sign(k, 'THE STARLING', 'IMFellEnglishSC-Regular', 12.0, CR + 0.17, 2.85, size=0.22, board='#1e2e4a', ink='#f0e8d0')

# ---- the terrace: café tables facing the sea, pots, the telescope -----------------------------------------------------
for (cx, cols) in ((3.5, ('#e8b0a0', '#3a6a9a')), (8.5, ('#f0ece4', '#c86a3a')), (15.5, ('#f0ece4', '#3a6a9a'))):
    k.cyl(cx, 3.2, 0, 0.7, 0.03, '#e8e4dc', 'cafe_leg', verts=6)
    k.cyl(cx, 3.2, 0.7, 0.74, 0.3, ('#f4f0e8', 0.04), 'cafe_table', verts=16)
    E.hurricane_lamp(k, cx - 0.08, 3.15, 0.74, energy=0, s=0.8)
    k.cyl(cx + 0.14, 3.25, 0.74, 0.86, 0.035, '#d8e8f0', 'glass', emit=('#8090a0', 0.3), verts=8)
    k.cyl(cx + 0.14, 3.25, 0.75, 0.83, 0.032, '#f08060', 'cocktail', emit=('#a05040', 0.4), verts=8)
    k.solid(cx - 0.3, 2.9, cx + 0.3, 3.5)
    for (dx, c) in ((-1.0, cols[0]), (1.0, cols[1])):
        E.rattan_chair(k, cx + dx, 3.6, facing='up', cushion='#f2eee4', stripe=c)
E.bougainvillea(k, 1.3, 4.6, s=1.1)
E.bougainvillea(k, 22.7, 4.6, s=1.1)
E.bougainvillea(k, 19.4, 3.1, s=0.95, bloom=('#e8d040', '#f0e070', '#c8b030'))       # the lemon tree
tx, tr = 12.0, 3.0                                           # the telescope on its tripod, aimed out to sea
for a in (math.pi / 2, math.pi / 2 + 2.094, math.pi / 2 + 4.189):
    k.tube((tx + math.cos(a) * 0.28, tr + math.sin(a) * 0.22, 0.0), (tx, tr, 1.05), 0.016, '#6a4a2a', 'telescope_stand', verts=5)
k.tube((tx + 0.1, tr + 0.28, 0.95), (tx - 0.12, tr - 0.5, 1.4), 0.06, (E.GILT, 0.04), 'telescope', rb=0.045, verts=12)
k.solid(tx - 0.3, tr - 0.25, tx + 0.3, tr + 0.25)
k.box(20.0, 4.0, 0, 20.9, 4.6, 0.85, ('#f0ece2', 0.05), 'service_table')              # the waiter's station
k.box(20.05, 4.05, 0.85, 20.85, 4.55, 0.88, TRIM, 'service_table')
for i in range(3):
    k.cyl(20.2 + i * 0.25, 4.3, 0.88, 0.98, 0.035, '#d8e8f0', 'glass', emit=('#8090a0', 0.3), verts=8)
k.solid(20.0, 4.0, 21.0, 4.9)

# ---- the lobby: the desk, the bar, the lounge --------------------------------------------------------------------------
E.reception(k, 1.6, 5.6, 7.6, 8.3)
E.starling_bar(k, 17.6, 9.6, w=4.4, d=2.6, stools=((15.35, 11.25), (16.5, 11.55), (17.65, 11.6), (18.8, 11.45), (19.95, 10.85), (14.9, 10.45)))
k.solid(16.3, 11.35, 16.7, 11.75)                          # the stool a guest sits on
E.runner_carpet(k, 6.2, 8.6, 13.3, 12.8, col='#c8b48a', trim=TRIM, motif=False)
stripes = [E.rect(6.2, r, 13.3, r + 0.12) for r in [8.9 + 0.5 * i for i in range(8)]]
E.flats(k, stripes, 0.0135, ('#e8dcc0', 0.04), 'runner')
E.sofa(k, 9.75, 9.4, length=2.2, facing='down', col='#f0ece2', legs=E.RATTAN, kind='settee', cushions=('#3a6a9a', '#e8b0a0'))
k.box(8.9, 10.3, 0.0, 10.6, 11.1, 0.4, (E.RATTAN, 0.12), 'low_table')                  # a low rattan table, shells and a bowl
k.box(8.85, 10.25, 0.4, 10.65, 11.15, 0.44, ('#e8e0d0', 0.05), 'low_table')
for (dx, dr, col) in ((-0.5, 0.1, '#f0d8c8'), (-0.3, 0.25, '#e8c0b0'), (0.4, 0.15, '#f4ece0')):
    k.sphere(9.75 + dx, 10.7 + dr, 0.47, 0.06, 0.03, col, 'shell', segs=8)
k.cyl(9.95, 10.65, 0.44, 0.52, 0.16, '#3a6a9a', 'bowl', verts=14)
for j in range(5):
    k.sphere(9.95 + math.cos(j * 1.25) * 0.07, 10.65 + math.sin(j * 1.25) * 0.05, 0.53, 0.04, 0.035, ('#e8d040', '#f08040')[j % 2], 'fruit', segs=6)
k.solid(8.9, 10.3, 10.6, 11.1)
for (x, f) in ((8.6, 'up'), (10.9, 'up')):
    E.rattan_chair(k, x, 12.0, facing=f, cushion='#f2eee4', stripe='#3a6a9a')
E.peacock_chair(k, 7.0, 10.6, cushion='#e8b0a0')
for (x, r, s) in ((6.0, 6.3, 1.0), (13.7, 6.3, 1.0), (1.7, 12.9, 0.95), (22.3, 12.9, 0.95), (14.2, 12.9, 0.9)):
    E.potted_palm(k, x, r, h=1.7, pot='#e8e0d0', leaf='#4a7a3a', fronds=10, s=s)
for (x, r) in ((9.75, 10.6), (4.0, 10.8), (13.6, 12.6)):
    E.ceiling_fan(k, x, r, 2.75, top=H + 0.2)
E.life_ring(k, 16.4, CR + 0.04, 1.55)                       # a life ring on one column, the ship's bell on another
k.box(7.55, CR + 0.08, 1.55, 7.65, CR + 0.3, 1.6, E.GILT, 'ship_bell')
k.sphere(7.6, CR + 0.3, 1.38, 0.1, 0.13, E.GILT, 'ship_bell', segs=12)

# ---- light: the sun on the terrace by day, lamps and the bar at night ---------------------------------------------
k.area_light(12.0, 2.5, 6.5, '#fff0d8', 1800, 16.0, rot=(math.radians(-25), 0, 0), group='sun')
k.area_light(12.0, 2.5, 6.5, '#90a8d8', 260, 16.0, rot=(math.radians(-25), 0, 0), group='moon')
for x in (4.0, 12.0, 20.0):
    k.area_light(x, CR + 0.4, 2.2, '#fff2dc', 60, 2.0, rot=(math.radians(-80), 0, 0), group='sun')
for (x, r) in ((4.5, 10.5), (9.75, 10.6), (12.0, 7.0), (20.5, 12.5), (17.6, 12.4), (6.0, 3.6), (17.0, 3.6)):
    k.point_light(x, r, 2.6, '#ffd8a8', 40, radius=0.6, group='lamp')
for i in range(int(22 / 2.2) + 1):                          # lanterns hung between the columns
    x = 1.0 + i * 2.2 + 1.1
    if x > 22.5:
        break
    k.cyl(x, CR, 2.2, 2.6, 0.01, '#3a3a40', 'lantern_chain', verts=4)
    A.hanging_lamp(k, x, CR, z=1.95, energy=10, chain_top=2.62)

render(k, OUT, day_world=('#d0d8e8', 0.65))

I = [{'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-holm', 'leaveSpawn': [32, 20], 'label': 'OUTSIDE', 'prompt': 'PRESS E TO GO OUT'} for (x, y) in DOORS]
I += [
    look('THE STARLING', 3, 8, 'THE FRONT DESK. THE BELL SAYS "RING FOR THE MANAGER".'),
    look('THE BAR', 18, 10, 'THE BARMAN SHAKES YOU A STARLING SUNSET: RUM FROM THE TERN, LIMES, SOMETHING PINK. IT TASTES LIKE THE LAST DAY OF A HOLIDAY.'),
    look('THE SEA', 6, 2, 'THE EMERALD SEA FROM THE TERRACE: THE CAPITAL\'S LIGHTS ON ONE SIDE, NOTHING BUT WATER ON THE OTHER, AND A PACKET COMING IN WITH MORE GUESTS.',
         action='view', view='sea'),
    look('TELESCOPE', 12, 2, 'THE BRASS TELESCOPE. GUESTS PAY A COIN TO LOOK AT THE LIGHTHOUSE ON SAPPHIRE. YOU DON\'T.', action='view', view='sea', beam=True),
    look('ROOMS', 22, 9, 'TWELVE ROOMS DOWN THE CORRIDOR, EACH WITH A BALCONY ON THE WATER AND A NAME INSTEAD OF A NUMBER: TERN, PETREL, CORMORANT…'),
    look('SOFA', 10, 9, 'A RATTAN SOFA PILED WITH CUSHIONS, UNDER A FAN.', prompt='PRESS E TO SIT', action='sit', seat=[10.45, 9.6], facing='down'),
    look('CHAIR', 2, 3, 'A RATTAN CHAIR FACING THE SEA, ITS CUSHION WARM FROM THE SUN.', prompt='PRESS E TO SIT', action='sit', seat=[2.5, 3.55], facing='up', view='sea'),
    look('CHAIR', 16, 3, 'A RATTAN CHAIR FACING THE SEA.', prompt='PRESS E TO SIT', action='sit', seat=[16.5, 3.55], facing='up', view='sea'),
    look('BELL', 7, 5, 'THE STARLING\'S BELL, OFF A WRECK ON THE CRIMSON. IT RINGS FOR DINNER AND, ONCE, FOR A WEDDING.'),
]
ACTORS = [
    {'sheet': 'npc-steward', 'x': 3, 'y': 6, 'facing': 'down', 'role': 'desk'},
    {'sheet': 'npc-bartender', 'x': 17, 'y': 9, 'facing': 'down', 'role': 'bar'},
    {'sheet': 'npc-server', 'x': 20, 'y': 4, 'facing': 'left', 'role': 'floor'},
    {'sheet': 'npc-coralie', 'x': 9, 'y': 9, 'facing': 'down', 'pose': 'sit', 'role': 'guest'},
    {'sheet': 'npc-merchant', 'x': 7, 'y': 3, 'facing': 'up', 'pose': 'sit', 'role': 'guest'},
    {'sheet': 'npc-scholar', 'x': 14, 'y': 3, 'facing': 'up', 'pose': 'sit', 'role': 'guest'},
    {'sheet': 'npc-boutique', 'x': 16, 'y': 11, 'facing': 'up', 'pose': 'sit', 'role': 'guest'},
]
SEA = [[-1.6, -2.6, COLS + 1.6, CR]]
write_world(WID, 'The Starling', COLS, ROWS, [11, 13], I, k, FLOOR, DOORS, [], tileset='lumar',
            extra={'sea': SEA, 'actors': ACTORS, 'backdrop': True})
w = json.load(open(world_path(WID)))
w['view'] = [-1.6, -2.6, COLS + 1.6, ROWS + 0.4]
open(world_path(WID), 'w').write(json.dumps(w, indent=2) + '\n')
print('starling done')
