"""Lucky 7 — the pachinko parlour on the District street (world id
"arcadia-lucky-7"). Usage: BVENV/bin/python arcadia_lucky_7.py RENDER_DIR

A long row of pachinko machines down the back wall under a bulb-traced 7
and the neon name, a back-to-back island of them in the middle, stools,
two regulars who never look up, the prize counter on the right with its
glass case of plush toys and boxed prizes, Sev behind it, the lucky cat on
its plinth by the door, a ball-dispenser kiosk. Every machine is its own
board in js/pachinko.js (interaction type 'pachinko', `machine`).
"""
import math
import sys
from _cyber_room import Y, A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path
import assets_signs as S

k = new_kit(777)
Y.cyber_room(k, 1, 2, 13, 9, H, floor_tones=('#2a1a22', '#34202a'), top_neon=Y.YEL, base_neon=Y.PINK)
A.rug(k, 1.1, 3.0, 8.2, 3.95, col='#6a1a2a', trim='#e8c040')        # the carpet along the back row
A.rug(k, 1.1, 6.0, 6.2, 6.95, col='#6a1a2a', trim='#e8c040')

THEMES = {
    'seven-seas': ('#183a78', '#40c8ff'), 'neon-dragon': ('#4a1058', '#ff50c0'), 'star-idol': ('#5a1e50', '#ffd040'),
    'lucky-cat': ('#6a2c0c', '#ffc030'), 'comet-rush': ('#10403a', '#60ffc0'), 'oni-gate': ('#581410', '#ff6040'),
}
TITLES = {'seven-seas': 'SEVEN SEAS', 'neon-dragon': 'NEON DRAGON', 'star-idol': 'STAR IDOL', 'lucky-cat': 'LUCKY CAT',
          'comet-rush': 'COMET RUSH', 'oni-gate': 'ONI GATE'}

# ---- the back row, under the sign ----------------------------------------------------------------------------
BACK = [(1.6, 'seven-seas'), (2.6, 'neon-dragon'), (3.6, 'star-idol'), (4.6, 'lucky-cat'), (5.6, 'comet-rush'),
        (6.6, 'oni-gate'), (7.6, 'seven-seas')]
for cx, key in BACK:
    Y.pachinko_machine(k, cx, 2.0, *THEMES[key])
    Y.neon_stool(k, cx, 3.35, seat='#e8c040')


class _St:
    bulbs = []


import assets_district as D                     # noqa: E402
D.bulb_seven(k, _St, 7.3, 2.0, 2.22, h=0.62)
S.neon(k, 'LUCKY', 'Pacifico', 4.4, 2.02, 2.2, size=0.62, col=Y.PINK, tube=0.022, energy=14)

# ---- the island, back to back with the aisle, facing the door -------------------------------------------------
ISLAND = [(1.5, 'lucky-cat'), (2.5, 'oni-gate'), (3.5, 'seven-seas'), (4.5, 'star-idol'), (5.5, 'neon-dragon')]
k.box(1.05, 5.0, 0.0, 5.95, 5.05, 2.1, ('#1a1a24', 0.06), 'island_spine')
for cx, key in ISLAND:
    Y.pachinko_machine(k, cx, 5.05, *THEMES[key])
    Y.neon_stool(k, cx, 6.35, seat='#e8c040')
for x in (1.05, 5.95):
    k.box(x - 0.04, 4.9, 0.0, x + 0.04, 5.7, 2.2, ('#c8a050', 0.06), 'island_end')
k.box(1.0, 4.9, 2.1, 6.0, 5.1, 2.18, '#301008', 'island_led', emit=(Y.YEL, 0.85))
k.solid(1.05, 5.0, 5.95, 5.7)

# ---- the prize counter --------------------------------------------------------------------------------------------
Y.prize_wall(k, 8.6, 12.9, 2.0)
S.lightbox(k, 'PRIZES', 'Bungee', 10.75, 2.02, 2.15, 3.2, 0.7, bg='#ffe080', ink='#6a1010', glow='#ffd040', size=0.52)
k.box(8.7, 3.4, 0.0, 12.9, 3.95, 0.95, ('#3a1a24', 0.06), 'counter', bevel=0.02)
k.box(8.65, 3.35, 0.95, 12.95, 4.0, 1.02, ('#c8a050', 0.06), 'counter_top')
k.box(8.72, 3.94, 0.1, 12.88, 3.96, 0.85, '#200810', 'counter_front', emit=(Y.PINK, 0.25))
# the ball counter (a hopper and a little readout), a bell, a tray of tokens
k.box(8.9, 3.45, 1.02, 9.6, 3.85, 1.22, ('#3a3a48', 0.06), 'ball_counter', bevel=0.02)
k.box(8.95, 3.85, 1.06, 9.3, 3.86, 1.18, '#081008', 'ball_readout', emit=(Y.GREEN, 0.9))
k.box(9.32, 3.5, 1.22, 9.56, 3.8, 1.26, '#14141c', 'ball_hopper')
for i in range(6):
    k.sphere(9.36 + (i % 3) * 0.08, 3.56 + (i // 3) * 0.12, 1.27, 0.03, 0.03, '#e0e4f0', 'ball', segs=6)
k.cyl(12.3, 3.7, 1.02, 1.06, 0.07, '#c8a050', 'bell_base', verts=10)
k.sphere(12.3, 3.7, 1.08, 0.06, 0.05, '#e0c060', 'bell', segs=8)
k.box(11.2, 3.5, 1.02, 11.7, 3.85, 1.05, '#1a1a24', 'token_tray')
for i in range(6):
    k.cyl(11.28 + (i % 3) * 0.16, 3.6 + (i // 3) * 0.14, 1.05, 1.07, 0.05, '#e8c040', 'token', verts=8)
k.solid(8.7, 3.4, 12.9, 4.0)
k.solid(10, 2, 11, 3)                                      # Sev, behind it

# ---- by the door: the lucky cat, the ball kiosk, a bench to sit out a losing streak ----------------------------------
Y.maneki_neko(k, 11.6, 6.4)
Y.token_kiosk(k, 9.2, 5.6)
Y.metal_bench(k, 9.6, 11.4, 8.2, neon=Y.PINK)
Y.vending_machine(k, 12.4, 4.6, w=0.75)
Y.trash_can(k, 8.6, 8.3)

# stools stay walkable (you sit at a machine by standing at it), except under the regulars
for cx, _ in BACK + ISLAND:
    k.blocked.discard((int(cx), 3 if (cx, _) in BACK else 6))
for t in ((2, 3), (5, 3)):
    k.blocked.add(t)

# ---- light: warm ceiling lamps over the rows, the neon ----------------------------------------------------------------
for (x, r) in ((2.5, 3.4), (6.0, 3.4), (3.5, 6.3), (10.8, 4.6), (10.5, 7.3), (7.0, 7.5)):
    k.point_light(x, r, 2.5, '#ffc890', 34, radius=0.6)
k.point_light(7.0, 2.8, 2.6, '#ffe090', 12, radius=0.4, group='flicker')

render(k, sys.argv[1], ambient=('#2a1420', 0.4))

PRESS = 'PRESS E TO PLAY'


def machine(x, y, key):
    return {'x': x, 'y': y, 'type': 'pachinko', 'machine': key, 'label': TITLES[key], 'prompt': PRESS}


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


import json                                         # noqa: E402
import os                                           # noqa: E402
WORLD = world_path('arcadia-lucky-7')
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Lucky 7', 'width': 14, 'height': 11, 'tileSize': 16, 'tileset': 'arcadia-lucky-7', 'spawns': {'player': [7, 8]},
          'shipExit': False})
w['interactions'] = [
    {'x': 6, 'y': 9, 'type': 'leave_world', 'label': 'STREET', 'prompt': 'RETURN TO STREET', 'leaveTo': 'arcadia-street', 'leaveSpawn': [25, 8]},
    {'x': 7, 'y': 9, 'type': 'leave_world', 'label': 'STREET', 'prompt': 'RETURN TO STREET', 'leaveTo': 'arcadia-street', 'leaveSpawn': [25, 8]},
] + [machine(int(cx), 2, key) for cx, key in BACK if int(cx) not in (2, 5)] + [machine(int(cx), 5, key) for cx, key in ISLAND] + [
    look(2, 3, 'REGULAR', "LONG TEAL HAIR, A PURPLE JACKET, BOTH HANDS ON THE HANDLE.\n\n\"DON'T TALK TO ME. I'M ON A REACH.\"\n\n"
         "THE SCREEN SAYS OTHERWISE.", 'PRESS E TO TALK'),
    look(5, 3, 'REGULAR', "A MOHAWK, A RED VEST, AND A TOWER OF BALL BOXES STACKED BESIDE THE STOOL, TALLER THAN ITS OWNER.\n\n"
         "\"STAR IDOL'S LOOSE TONIGHT. DON'T TELL ANYONE.\"", 'PRESS E TO TALK'),
    {'x': 9, 'y': 3, 'type': 'pachinko_prizes', 'label': 'PRIZE COUNTER', 'prompt': 'PRESS E TO CASH IN'},
    {'x': 12, 'y': 3, 'type': 'pachinko_prizes', 'label': 'PRIZE COUNTER', 'prompt': 'PRESS E TO CASH IN'},
    look(10, 2, 'SEV', "\"BALLS IN, COINS OUT. FIVE TO THE COIN, NO HAGGLING, NO CREDIT.\"", 'PRESS E TO TALK'),
    look(11, 6, 'LUCKY CAT', "A GOLDEN CAT ON A RED PLINTH, ONE PAW RAISED, A COIN IN ITS LAP. THE PAW IS WORN BRIGHT FROM RUBBING.\n\n"
         "YOU RUB IT. NOTHING HAPPENS. THEN, FROM THE BACK ROW, A JACKPOT BELL.", 'PRESS E TO RUB'),
    look(9, 5, 'BALL KIOSK', "A DISPENSER THAT TAKES COINS AND RATTLES OUT BALLS INTO A TRAY.\n\nTHE MACHINES SELL TRAYS TOO - IT'S THE "
         "SAME PRICE, IT JUST FEELS MORE OFFICIAL HERE."),
    look(10, 8, 'BENCH', "A BENCH BY THE DOOR FOR SITTING OUT A BAD RUN.\n\nSOMEONE HAS SCRATCHED INTO IT: 'THE BALLS DON'T KNOW YOU.'",
         'PRESS E TO SIT'),
    look(12, 4, 'VENDING MACHINE', "CANNED COFFEE, HOT. CANNED COFFEE, COLD. CANNED COFFEE, LUKEWARM (DISCOUNTED)."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id='arcadia-lucky-7', actors=[
    {'sheet': 'npc-sev', 'x': 10, 'y': 2, 'facing': 'down'},
    {'sheet': 'npc-patron-a', 'x': 2, 'y': 3, 'facing': 'up', 'pose': 'sit'},
    {'sheet': 'npc-patron-b', 'x': 5, 'y': 3, 'facing': 'up', 'pose': 'sit'}])
print('lucky 7 done')
