"""The Neon Royale's Card Room and the Runouts lounge (world id "arcadia-casino-cards"). Usage:
BVENV/bin/python arcadia_casino_cards.py RENDER_DIR

Two rooms behind the casino floor's back wall, a glass-and-gold screen between them. On the left the Card Room:
green carpet, three oval poker tables under low gold light with a dealer at each and regulars in the chairs, the
tournament board, a painting of robots playing cards. On the right the Runouts lounge, where the old Runouts games
live on: a cabinet for every mode (its neon pictogram on the marquee, its attract loop on the screen), eight along
the back wall under the big RUNOUTS sign and eight on an island, the Runouts desk with Kit behind it (the whole
section from one place), sofas. Each poker table is a `casino` interaction (game poker); each cabinet is game
runouts with its mode; the desk is game runouts with no mode.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_casino as C                     # noqa: E402
import assets_cyber as Y                      # noqa: E402
import assets_signs as S                      # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-casino-cards'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 34, 15
H = 4.6
FLOOR = (1, 3, 32, 13)
DOORS = [(7, 14), (8, 14), (23, 14), (24, 14)]
RB = 3.0
MODES = [('holdem', "HOLD'EM"), ('plo', 'PLO'), ('rng', 'RANDOM NUMBER'), ('wheel', 'WHEEL SPINNER'), ('dice', 'DICE DUEL'),
         ('high-card', 'HIGH CARD'), ('coin-flips', 'COIN GAUNTLET'), ('black-marble', 'BLACK MARBLE'), ('slots', 'SLOT MACHINE'),
         ('horse-race', 'HORSE RACE'), ('rocket', 'ROCKET LAUNCH'), ('space-invaders', 'SPACE INVADERS'), ('bomb', 'BOMB'),
         ('plinko', 'PLINKO'), ('battle-royale', 'BATTLE ROYALE'), ('stock-market', 'STOCK MARKET')]

k = Kit(COLS, ROWS, margin_top=1.4, margin_bottom=0.5, seed=5151)
live = C.Live()
rng = k.rng

# ---- the shell: green carpet for the cards, a neon grid for Runouts ------------------------------------------------------------
C.carpet(k, 1.0, RB, 16.0, 14.0, base='#0c2a1e', line=C.GOLD, rose=C.OXBLOOD_L, dot=C.GOLD_D)
C.carpet(k, 16.0, RB, 33.0, 14.0, base='#140c1e', line='#2a8a9a', rose='#c0308a', dot=C.YEL, step=1.0)
C.deco_wall(k, 0.4, 16.0, RB, H, clear=[(1.6, 6.8), (6.9, 10.3), (10.0, 15.0)])
# Runouts' wall: black with a neon grid, the old games' colours
k.box(16.0, RB - 0.5, 0, 33.6, RB, H, (C.LACQUER, 0.05), 'wall')
k.box(16.0, RB - 0.5, H, 33.6, RB + 0.16, H + 0.05, '#08060a', 'wall_cap')
grid = []
for i in range(1, 9):
    grid.append((16.0, RB, i * 0.5, 33.6, RB + 0.01, i * 0.5 + 0.02))
for i in range(36):
    grid.append((16.2 + i * 0.5, RB, 0.0, 16.22 + i * 0.5, RB + 0.01, H))
k.boxes(grid, shade('#2a8a9a', 0.5), 'grid_line', emit=('#2a8a9a', 0.35))
k.box(16.0, RB, H - 0.2, 33.6, RB + 0.04, H - 0.14, shade(C.PINK, 0.45), 'wall_neon', emit=(C.PINK, 0.9))
C.side_wall(k, 0.4, 1.0, RB - 0.5, 14.0, H)
C.side_wall(k, 33.0, 33.6, RB - 0.5, 14.0, H)
C.front_wall(k, 0.4, 16.0, 14.0, (7.0, 9.0))
C.front_wall(k, 16.0, 33.6, 14.0, (23.0, 25.0), neon=Y.CYAN)
# the screen between the rooms: lacquer below, frosted glass and gold mullions above
k.box(16.0, RB, 0.0, 16.3, 9.5, 1.1, (C.LACQUER, 0.05), 'partition')
k.box(15.98, RB, 1.1, 16.32, 9.5, 1.16, (C.GOLD, 0.05), 'partition_cap')
k.box(16.1, RB, 1.16, 16.2, 9.5, 2.6, '#c8b8d0', 'partition_glass', emit=('#a090c0', 0.25))
for r in [RB + 0.5 + i * 1.0 for i in range(7)]:
    k.box(16.05, r - 0.04, 1.16, 16.25, r + 0.04, 2.7, (C.GOLD, 0.05), 'partition_mullion')
k.box(16.0, 9.45, 0.0, 16.3, 9.55, 2.7, (C.GOLD, 0.05), 'partition_end')
k.solid(16.0, RB, 16.3, 9.6)

# ---- the Card Room -------------------------------------------------------------------------------------------------------------
C.video_wall(k, live, 1.8, 6.6, RB, 1.3, 3.3, [(0.0, 0.0, 1.0, 1.0, 'board')])
S.letters(k, 'THE CARD ROOM', 'Limelight', 8.6, RB + 0.1, 3.55, size=0.42, col=C.GOLD_L, energy=10)
k.box(10.1, RB, 1.3, 14.9, RB + 0.1, 3.1, (C.GOLD, 0.05), 'painting_frame')          # robots at cards, in oils
k.box(10.25, RB + 0.1, 1.45, 14.75, RB + 0.11, 2.95, ('#14321e', 0.15), 'painting')
k.box(11.0, RB + 0.11, 1.75, 14.0, RB + 0.12, 2.05, ('#1d6a46', 0.1), 'painting_table')
for (x, col) in ((11.4, '#8a8e9a'), (12.5, '#a08a5a'), (13.6, '#7a8aa0')):
    k.box(x - 0.2, RB + 0.12, 2.05, x + 0.2, RB + 0.13, 2.5, (col, 0.1), 'painting_robot')
    k.box(x - 0.14, RB + 0.12, 2.52, x + 0.14, RB + 0.13, 2.75, (shade(col, 1.15), 0.1), 'painting_robot')
    k.box(x - 0.08, RB + 0.13, 2.6, x + 0.08, RB + 0.135, 2.64, '#ff4040', 'painting_eye', emit=('#ff6060', 0.5))
k.cyl_y(12.5, RB + 0.11, RB + 0.12, 2.85, 0.3, 0.08, ('#e8c060', 0.1), 'painting_lamp', emit=('#ffe090', 0.4))
TABLES = [(4.5, 6.1), (11.5, 6.1), (8.5, 11.0)]


def places(cx, cr):
    """Seven chairs round a table and the dealer's place (index 0, top centre): tile centres, so people sit on them."""
    top = round(cr - 1.3 - 0.55) + 0.55
    bot = round(cr + 1.3 - 0.55) + 0.55
    mid = round(cr - 0.55) + 0.55
    return [(cx, top, 'down'), (cx - 1, top, 'down'), (cx + 1, top, 'down'), (cx - 2, mid, 'right'), (cx + 2, mid, 'left'),
            (cx - 1, bot, 'up'), (cx, bot, 'up'), (cx + 1, bot, 'up')]


for (cx, cr) in TABLES:
    C.poker(k, live, cx, cr, w=3.3, d=1.75, felt=C.FELT_BLUE, places=places(cx, cr), empty=(0,), rng=rng)
    k.solid(cx - 1.65, cr - 0.875, cx + 1.65, cr + 0.875)
for (x, r) in ((4.5, 9.0), (12.5, 9.5), (2.5, 12.0), (14.5, 12.5)):
    k.point_light(x, r, 2.4, '#ffd0a0', 14, radius=0.6)

# ---- the Runouts lounge ------------------------------------------------------------------------------------------------------------
S.neon(k, 'RUNOUTS', 'Audiowide', 24.5, RB + 0.04, 3.3, size=0.8, col='#ff60d0', tube=0.026, energy=24)
S.letters(k, 'EVERY GAME  EVERY STAKE', 'ZenDots', 24.5, RB + 0.04, 2.9, size=0.22, col=Y.CYAN_L, energy=4)
CAB = []
for i, (mode, label) in enumerate(MODES[:8]):
    x = 17.5 + i * 2.0
    C.runouts_cabinet(k, live, x, RB, mode)
    CAB.append((int(x), 3, mode, label))
k.box(16.6, 6.7, 0.0, 32.0, 7.0, 1.9, (C.LACQUER, 0.05), 'island_spine')     # open at the east end: the way round to the back row
k.box(16.55, 6.65, 1.9, 32.05, 7.05, 1.96, (C.LACQUER_L, 0.05), 'island_cap')
k.box(16.55, 7.02, 1.8, 32.05, 7.06, 1.86, shade('#2a8a9a', 0.5), 'island_neon', emit=('#40c8d8', 0.9))
for xx in (16.5, 31.9):
    k.box(xx, 6.6, 0.0, xx + 0.12, 7.8, 2.0, (C.GOLD, 0.05), 'island_end')
k.solid(16.6, 6.7, 32.0, 7.0)
for i, (mode, label) in enumerate(MODES[8:]):
    x = 17.5 + i * 2.0
    C.runouts_cabinet(k, live, x, 7.0, mode)
    CAB.append((int(x), 7, mode, label))
# the Runouts desk, Kit behind it; sofas; a stool at each cabinet
k.box(25.6, 10.95, 0.0, 28.4, 11.6, 1.0, (C.LACQUER, 0.05), 'desk', bevel=0.03)
k.box(25.55, 10.9, 1.0, 28.45, 11.65, 1.06, ('#c8ccd8', 0.04), 'desk_top')
k.box(25.65, 11.6, 0.8, 28.35, 11.62, 0.86, shade('#ff60d0', 0.45), 'desk_neon', emit=('#ff60d0', 0.85))
k.poly([(26.3, 11.1, 1.42), (27.1, 11.1, 1.42), (27.1, 11.3, 1.06), (26.3, 11.3, 1.06)], '#081020', 'desk_screen', emit=('#2a1a4a', 0.8))
live.screens.append([26.35, round(11.1 - 1.42 * C.C45, 3), 27.05, round(11.3 - 1.06 * C.C45, 3), 'runouts:hall'])
S.letters(k, 'RUNOUTS', 'Audiowide', 27.0, 11.62, 0.22, size=0.4, col='#ff60d0', energy=3)
k.solid(25.6, 10.95, 28.4, 11.6)
for (x0, r) in ((17.3, 11.2), (30.2, 11.2)):
    k.box(x0, r, 0.0, x0 + 2.2, r + 0.75, 0.42, ('#3a1450', 0.1), 'sofa', bevel=0.04)
    k.box(x0, r + 0.6, 0.3, x0 + 2.2, r + 0.85, 0.9, ('#4a1a64', 0.1), 'sofa_back', bevel=0.04)
    k.box(x0 + 0.5, r - 0.9, 0.0, x0 + 1.7, r - 0.3, 0.36, (C.LACQUER, 0.05), 'low_table', bevel=0.02)
    k.box(x0 + 0.5, r - 0.33, 0.3, x0 + 1.7, r - 0.3, 0.33, shade(Y.CYAN, 0.45), 'low_table_neon', emit=(Y.CYAN, 0.8))
    k.solid(x0, r, x0 + 2.2, r + 0.85)
    k.solid(x0 + 0.5, r - 0.9, x0 + 1.7, r - 0.3)
for (x, r, c) in ((19.0, 5.2, '#ff60d0'), (24.5, 5.2, Y.CYAN), (30.0, 5.2, '#ff60d0'), (21.0, 9.5, Y.PURP), (28.0, 9.5, Y.CYAN),
                  (24.5, 12.5, '#ff60d0'), (31.0, 9.0, Y.CYAN), (18.0, 12.0, Y.PURP)):
    k.point_light(x, r, 2.6, c, 24, radius=0.6, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0, 'pulse': 1.0}, 'dim': {'flicker': 0.85, 'pulse': 0.5}},
         light_samples=128, world_light=('#22142c', 0.42))

# ---- the world ---------------------------------------------------------------------------------------------------------------
P = 'PRESS E TO PLAY'
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Card Room', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [7, 13]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'interior': True})
inter = [{'x': x, 'y': 14, 'type': 'leave_world', 'leaveTo': 'arcadia-casino', 'leaveSpawn': [11, 4], 'label': 'THE CASINO FLOOR',
          'prompt': 'PRESS E TO GO BACK'} for x in (7, 8)]
inter += [{'x': x, 'y': 14, 'type': 'leave_world', 'leaveTo': 'arcadia-casino', 'leaveSpawn': [33, 4], 'label': 'THE CASINO FLOOR',
           'prompt': 'PRESS E TO GO BACK'} for x in (23, 24)]
inter += [{'x': int(cx), 'y': int(cr + 0.875 - 0.5), 'type': 'casino', 'game': 'poker', 'table': 'poker-%d' % (i + 1),
           'label': 'POKER', 'prompt': P} for i, (cx, cr) in enumerate(TABLES)]
inter += [{'x': x, 'y': y, 'type': 'casino', 'game': 'runouts', 'mode': mode, 'table': 'runouts-' + mode, 'label': label, 'prompt': P}
          for (x, y, mode, label) in CAB]
inter += [{'x': 25, 'y': 11, 'type': 'casino', 'game': 'runouts', 'table': 'runouts-hall', 'label': 'RUNOUTS', 'prompt': P},
          {'x': 27, 'y': 10, 'type': 'dialog', 'label': 'KIT', 'prompt': 'PRESS E TO TALK', 'dialog': 'KIT WAVES FROM BEHIND THE DESK.'},
          {'x': 4, 'y': 3, 'type': 'dialog', 'label': 'TOURNAMENT BOARD', 'prompt': 'PRESS E TO READ',
           'dialog': "THE CARD ROOM'S BOARD: TONIGHT'S TABLES, THE BLINDS, AND A LIST OF NAMES UNDER 'BIGGEST POTS THIS CYCLE'.\n\n"
                     "AT THE TOP, IN GOLD, THE SAME NAME AS EVERY CYCLE: THE DUCHESS."},
          {'x': 12, 'y': 3, 'type': 'dialog', 'label': 'THE PAINTING', 'prompt': 'PRESS E TO LOOK',
           'dialog': 'THREE ROBOTS AT A CARD TABLE UNDER A GREEN LAMP, IN OILS. THE ONE IN THE MIDDLE HAS A ROYAL FLUSH AND A '
                     'POKER FACE. THE OTHER TWO HAVE NO FACES AT ALL.\n\nA BRASS PLATE: "THE HOUSE ALWAYS KNOWS."'}]
w['interactions'] = inter
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACT = [('npc-dealer', 4, 4, 'down'), ('npc-dealer-b', 11, 4, 'down'), ('npc-dealer-c', 8, 9, 'down'), ('npc-runouts-host', 27, 10, 'down'),
       ('npc-courier', 19, 8, 'up'), ('npc-shopper', 29, 4, 'up')]
SIT = [('npc-gambler-b', 2, 6, 'right'), ('npc-gambler-a', 5, 7, 'up'), ('npc-patron-a', 3, 4, 'down'),
       ('npc-gambler-d', 13, 6, 'left'), ('npc-gambler-c', 10, 4, 'down'), ('npc-patron-b', 12, 7, 'up'),
       ('npc-gambler-b', 6, 10, 'right'), ('npc-gambler-a', 9, 9, 'down'), ('npc-patron-a', 10, 10, 'left')]
actors = [{'sheet': s, 'x': x, 'y': y, 'facing': f} for (s, x, y, f) in ACT]
actors += [{'sheet': s, 'x': x, 'y': y, 'facing': f, 'pose': 'sit'} for (s, x, y, f) in SIT]
for a in actors:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=actors, scene_extra={'flicker': {'mode': 'pulse'}})
w = json.load(open(WORLD))
w['casino'] = {'live': live.dump(), 'floor': 'cards'}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('card room done')
