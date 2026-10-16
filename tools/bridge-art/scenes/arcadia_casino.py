"""The Neon Royale — the casino floor (world id "arcadia-casino"). Usage: BVENV/bin/python arcadia_casino.py RENDER_DIR

A gold-and-black Art Deco palace under neon, through the gold revolving doors on the District street. Across the
back wall: the race and sports book (a video wall over the betting windows), the arch to the Card Room, the
cashier's cage behind brass bars, the Crown Room's arch behind a velvet rope (the high rollers), the crash screen
with its rail of terminals, the arch to the Runouts lounge, and the stage where Lady Velvet sings at the piano.
On the floor: banks of slot machines down the left, the pit in the middle (three blackjack tables, two roulette
wheels and the pit boss's podium, three craps tubs), the lounge and the island bar on the right with two more
banks of slots, the door to Aurum (the restaurant); in the marble foyer, Royale Link, the prize hover-car on its
turntable, the boutique and the host's desk. Every playable station is a `casino` interaction (js/casino.js runs
the games); the live parts (wheels, screens, slot chases, marquee bulbs, dice) are drawn by js/worlds/casino.js
from the world JSON's `casino.live` block.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_casino as C                     # noqa: E402
import assets_cyber as Y                      # noqa: E402
import assets_district as D                   # noqa: E402
import assets_signs as S                      # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-casino'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 29
H = 6.0
FLOOR = (1, 3, 42, 27)
DOORS = [(21, 28), (22, 28)]
RB = 3.0                                   # the back wall's face

k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=7007)
live = C.Live()
rng = k.rng

# ---- the shell -----------------------------------------------------------------------------------------------------
C.carpet(k, 1.0, RB, 43.0, 28.0, skip=[(11.0, 20.5, 33.0, 28.0)])
C.marble(k, 11.0, 20.5, 33.0, 28.0)
C.runner(k, 21.0, 20.5, 23.0, 22.4)
C.runner(k, 21.0, 26.0, 23.0, 28.0)
C.medallion(k, 22.0, 24.2, 1.75)
ARCHES = {'cards': 12.0, 'crown': 22.0, 'runouts': 33.0}
C.deco_wall(k, 0.4, 43.6, RB, H, gaps=[(10.8, 13.2), (20.8, 23.2), (31.8, 34.2)],      # each the width of its arch's wall
            clear=[(1.2, 10.4), (13.8, 19.2), (17.9, 26.1), (24.7, 31.2), (34.8, 43.6)])     # the book, the cage, the frieze, crash, the stage
C.arch(k, ARCHES['cards'], RB, 2.0, H, glow='#ff9050')
C.arch(k, ARCHES['runouts'], RB, 2.0, H, glow='#c050ff')
C.arch(k, ARCHES['crown'], RB, 2.0, H, glow='#ffd070', steps=4, energy=20)
C.side_wall(k, 0.4, 1.0, RB - 0.5, 28.0, H)
C.side_wall(k, 43.0, 43.6, RB - 0.5, 28.0, H, gaps=[(21.0, 23.0)])
C.front_wall(k, 0.4, 43.6, 28.0, (21.0, 23.0))

# ---- the back wall: the book, the card room, the cage, the Crown Room, crash, Runouts, the stage ------------------------
# the race and sports book: a video wall over three betting windows
C.video_wall(k, live, 1.5, 10.1, RB, 1.32, 3.9, [(0.0, 0.42, 0.31, 1.0, 'sports'), (0.33, 0.3, 0.67, 1.0, 'race'),
                                                (0.69, 0.42, 1.0, 1.0, 'sports'), (0.0, 0.0, 0.31, 0.4, 'odds'),
                                                (0.33, 0.0, 0.67, 0.28, 'odds'), (0.69, 0.0, 1.0, 0.4, 'odds')])
S.letters(k, 'RACE & SPORTS', 'RussoOne', 5.8, RB + 0.1, 4.25, size=0.6, col=Y.CYAN_L, energy=12)
C.betting_counter(k, 1.5, 10.1, RB, RB + 0.8)
for x in (2.5, 5.5, 8.5):
    k.poly([(x - 0.28, RB + 0.2, 1.38), (x + 0.28, RB + 0.2, 1.38), (x + 0.28, RB + 0.55, 1.07), (x - 0.28, RB + 0.55, 1.07)],
           '#081020', 'bet_screen', emit=('#2a6aa0', 0.7))
    live.screens.append([round(x - 0.24, 3), round(RB + 0.2 - 1.38 * C.C45, 3), round(x + 0.24, 3), round(RB + 0.55 - 1.07 * C.C45, 3), 'odds'])
k.solid(1.5, RB, 10.1, RB + 0.8)
# the Card Room's arch: gold letters and a neon spade
S.letters(k, 'CARD ROOM', 'Limelight', ARCHES['cards'], RB + 0.1, 3.35, size=0.36, col=C.GOLD_L, energy=8)
spade = [(-0.0, 0.32), (0.2, 0.1), (0.22, -0.05), (0.1, -0.12), (0.02, -0.06), (0.08, -0.22), (-0.08, -0.22), (-0.02, -0.06),
         (-0.1, -0.12), (-0.22, -0.05), (-0.2, 0.1)]
Y.neon_shape(k, [(ARCHES['cards'] + x * 1.4, 4.2 + z * 1.4) for (x, z) in spade], RB + 0.12, C.PINK)
# the cashier's cage
CAGE = C.cage(k, live, 14.0, 19.0, RB, depth=1.6, windows=3)
S.letters(k, 'CASHIER', 'Limelight', 16.5, RB + 0.1, 3.15, size=0.42, col=C.GOLD_L, energy=8)
# the Crown Room: the big sign over its arch, a velvet rope across, steps up into the light
C.neon_crown(k, ARCHES['crown'], RB + 0.1, 3.3, s=0.6, col=C.YEL, gem=C.PINK, energy=20)
# the frieze along the top of the wall: THE NEON ROYALE in gold, Neon in pink script over it
k.box(18.2, RB, 4.42, 25.8, RB + 0.1, 5.5, (C.LACQUER, 0.05), 'frieze')
k.box(18.1, RB, 4.38, 25.9, RB + 0.12, 4.44, (C.GOLD, 0.05), 'frieze_trim')
k.box(18.1, RB, 5.48, 25.9, RB + 0.12, 5.54, (C.GOLD, 0.05), 'frieze_trim')
S.letters(k, 'ROYALE', 'Limelight', ARCHES['crown'] + 0.9, RB + 0.1, 4.55, size=0.78, col=C.GOLD_L, energy=18)
S.neon(k, 'Neon', 'Pacifico', ARCHES['crown'] - 2.45, RB + 0.12, 4.62, size=1.4, col=C.PINK, tube=0.03, energy=16)
for i in range(3):
    k.box(ARCHES['crown'] - 1.0, RB - 1.2 + i * 0.3, 0.0, ARCHES['crown'] + 1.0, RB - 0.9 + i * 0.3, 0.12 * (3 - i), (C.GOLD_D, 0.05), 'step')
D.velvet_rope(k, ARCHES['crown'] - 1.15, ARCHES['crown'] + 1.15, RB + 0.45)
k.solid(ARCHES['crown'] - 1.0, RB, ARCHES['crown'] + 1.0, RB + 0.9)              # the rope: you ask at it
# crash: the big screen, the rail of terminals
C.video_wall(k, live, 25.0, 30.9, RB, 1.25, 3.95, [(0.0, 0.0, 1.0, 1.0, 'crash')])
S.letters(k, 'CRASH', 'Bungee', 27.95, RB + 0.1, 4.25, size=2.2, col='#ff7040', energy=14)      # Bungee sets small: 2.2 is ~3 tiles across
CRASH = [26.0, 28.0, 30.0]
for x in CRASH:
    C.bet_terminal(k, live, x, RB + 0.45, 'crashbet', col='#ff7040', w=0.62)
# Runouts' arch
S.neon(k, 'RUNOUTS', 'Audiowide', ARCHES['runouts'], RB + 0.1, 3.35, size=0.4, col='#ff60d0', tube=0.018, energy=10)
# the stage: Lady Velvet at the microphone, the pianist at the grand
SH = C.stage(k, live, 35.0, 43.0, RB, depth=2.4, h=0.4, crown=False)
S.neon(k, 'Lady Velvet', 'Pacifico', 39.0, RB + 0.08, SH + 1.62, size=0.85, col=C.PINK, tube=0.026, energy=12)   # her name in lights over the starburst
C.grand_piano(k, 37.35, RB + 1.3, facing='right')
C.mic_stand(k, 39.5, RB + 1.75, SH)
for x in (36.0, 39.6, 42.0):                              # spotlights on the stage
    k.point_light(x, RB + 2.0, 2.4, '#ffc0d8', 16, radius=0.4)

# ---- the slots: four banks down the left, two on the right -------------------------------------------------------------
SLOTS = []                                                 # playable machines: (x, row)
BANKS = [(7, (0, 4), (2, 6), 'ROYAL SEVENS'), (12, (1, 2), (1, 5), 'DIAMOND RUSH'), (17, (3, 5), (3, 7), 'NEON GEISHA'),
         (22, (2, 0), (2, 6), 'LUCKY CLOVER')]
for (r0, themes, play, name) in BANKS:
    xs = C.slot_bank(k, live, 1.0, float(r0), 9, w=1.0, themes=themes, playable=play, rng=rng)
    S.lightbox(k, name, 'Limelight', 5.5, float(r0) - 0.02, 2.8, 3.6, 0.6, bg='#1a0e14', ink='#1a0810', size=0.42,      # over the spine, clear of the toppers
               glow=C.SLOT_THEMES[themes[0]][1], energy=3)
    SLOTS += [(int(xs[i]), r0) for i in play]
for (r0, themes, n, play) in ((18, (4, 1), 7, (1, 5)), (23, (5, 0), 6, (2,))):
    xs = C.slot_bank(k, live, 35.0, float(r0), n, w=1.0, themes=themes, playable=play, rng=rng)
    S.lightbox(k, 'HIGH LIMIT' if r0 == 18 else 'VOID STARS', 'Limelight', 35.0 + n / 2, float(r0) - 0.02, 2.8, 3.2, 0.6,
               bg='#1a0e14', ink='#1a0810', size=0.42, glow=C.SLOT_THEMES[themes[0]][1], energy=3)
    SLOTS += [(int(xs[i]), r0) for i in play]

# ---- the pit -------------------------------------------------------------------------------------------------------------
BJ = [15.5, 22.0, 28.5]
for cx in BJ:
    st = [(cx - 0.5, 8.55), (cx + 0.5, 8.55), (cx - 1.75, 7.75), (cx + 1.75, 7.75)] if cx == 22.0 else \
         [(cx - 1.0, 8.55), (cx, 8.6), (cx + 1.0, 8.55), (cx - 1.8, 7.7), (cx + 1.8, 7.7)]
    C.blackjack(k, live, cx, 7.0, w=3.0, d=1.45, stools=st, rng=rng)
    k.solid(cx - 1.5, 7.0, cx + 1.5, 8.0)
ROU = [(12.5, 'left'), (26.4, 'right')]
WHEELS = []
for (x0, side) in ROU:
    WHEELS.append(C.roulette(k, live, x0, 12.0, w=3.6, d=1.3, wheel=side, rng=rng))
    for x in ([x0 + 2.0, x0 + 3.0] if side == 'left' else [x0 + 1.1, x0 + 2.1]):
        C._stool(k, x, 13.6)
    k.solid(x0, 12.0, x0 + 3.6, 13.0)
# the pit boss's podium between the wheels: a lacquered desk, screens, a lamp
k.box(21.3, 11.9, 0.0, 23.7, 12.8, 1.05, (C.LACQUER, 0.05), 'podium', bevel=0.03)
k.box(21.25, 11.85, 1.05, 23.75, 12.85, 1.1, (C.GOLD, 0.05), 'podium_top')
k.box(21.35, 12.79, 0.88, 23.65, 12.81, 0.94, shade(C.PINK, 0.45), 'podium_neon', emit=(C.PINK, 0.85))
for x in (21.6, 23.4):
    k.box(x - 0.05, 12.79, 0.1, x + 0.05, 12.82, 0.85, (C.GOLD, 0.05), 'podium_trim')
for (x, kind) in ((21.8, 'odds'), (23.2, 'odds')):
    k.poly([(x - 0.3, 12.0, 1.5), (x + 0.3, 12.0, 1.5), (x + 0.3, 12.2, 1.12), (x - 0.3, 12.2, 1.12)], '#081020', 'pit_screen', emit=('#3a5a9a', 0.6))
k.solid(21.3, 11.9, 23.7, 12.8)
CRAPS = [14.5, 22.0, 29.5]
for cx in CRAPS:
    C.craps(k, live, cx, 17.95, w=4.8, d=1.9, rng=rng)
    k.solid(cx - 2.4, 17.0, cx + 2.4, 18.9)
    k.box(cx - 0.25, 16.25, 0.0, cx + 0.25, 16.75, 0.5, (C.OXBLOOD_L, 0.1), 'box_chair', bevel=0.04)      # the boxman's chair
    k.box(cx - 0.25, 16.2, 0.5, cx + 0.25, 16.3, 1.05, (C.OXBLOOD_L, 0.1), 'box_chair', bevel=0.03)

# ---- the right: the lounge before the stage, the island bar, the way to Aurum ------------------------------------------------
for (cx, cr) in ((36.0, 7.6), (39.0, 7.6), (41.6, 8.7)):
    C.cocktail_table(k, cx, cr)
    k.solid(cx - 0.32, cr - 0.32, cx + 0.32, cr + 0.32)
LOUNGE_SEATS = [(35, 8, 'up'), (37, 8, 'up'), (38, 8, 'up'), (40, 8, 'up'), (41, 9, 'up')]
for (x, y, f) in LOUNGE_SEATS:
    C.club_chair(k, x + 0.5, y + 0.55, f)
BAR = (38.5, 13.5)
C.island_bar(k, BAR[0], BAR[1], w=5.4, d=3.1, stools=[(x + 0.5, 15.6) for x in range(36, 41)])
# Aurum's door: a gold sign on a stand by the opening
k.box(41.75, 20.0, 0.0, 42.25, 20.2, 0.06, (C.GOLD_D, 0.05), 'sign_foot')
k.box(41.95, 20.05, 0.06, 42.05, 20.15, 1.3, (C.GOLD, 0.05), 'sign_post')
S.lightbox(k, 'AURUM', 'CinzelDecorative-Bold', 42.0, 20.15, 1.3, 1.7, 0.66, bg='#1a1208', ink='#1a0c04', glow='#ffc060', energy=4)
k.solid(41.7, 20.0, 42.3, 20.3)
k.point_light(42.6, 22.0, 2.0, '#ffb060', 18, radius=0.4)

# ---- the foyer: Royale Link, the prize car, the boutique, the host, columns, chandeliers ----------------------------------------
LINK = C.link_kiosk(k, live, 12.6, 17.4, 21.8, n=4)
S.letters(k, 'ROYALE LINK', 'Audiowide', 15.0, 21.8, 2.12, size=0.5, col=Y.CYAN_L, energy=6)
# the prize: a gold hover-coupe turning on a bulb-ringed plinth
k.cyl(15.8, 25.4, 0.0, 0.22, 1.2, (C.LACQUER_L, 0.05), 'plinth', verts=32)
k.cyl(15.8, 25.4, 0.22, 0.26, 1.15, (C.LACQUER_L, 0.04), 'plinth_top', verts=32)
k.cyl(15.8, 25.4, 0.26, 0.27, 1.12, (C.GOLD, 0.05), 'plinth_rim', verts=32)
k.cyl(15.8, 25.4, 0.27, 0.28, 1.0, (C.LACQUER, 0.04), 'plinth_top', verts=32)
for i in range(28):
    a = 2 * math.pi * i / 28
    k.sphere(15.8 + math.cos(a) * 1.21, 25.4 + math.sin(a) * 1.21, 0.12, 0.035, 0.035, '#fff0c0', 'plinth_bulb', emit=('#ffe090', 1.0), segs=5)
    live.bulbs.append(live.at(15.8 + math.cos(a) * 1.21, 25.4 + math.sin(a) * 1.21, 0.12))
C.prize_coupe(k, 15.8, 25.4, z=0.62)
k.solid(14.6, 24.2, 17.0, 26.6)
S.lightbox(k, 'WIN ME', 'RussoOne', 15.8, 26.75, 0.3, 1.25, 0.42, bg='#ffe080', ink='#6a1010', glow='#ffd040', energy=2)
# the boutique: shelves of gifts behind, a glass counter, the clerk between
k.box(27.0, 21.15, 0.0, 32.0, 21.5, 2.1, (C.LACQUER, 0.05), 'boutique_shelves')
for zz in (0.5, 0.95, 1.4, 1.85):
    k.box(27.05, 21.5, zz - 0.04, 31.95, 21.75, zz, (C.GOLD, 0.05), 'boutique_shelf')
    for i in range(16):
        col = rng.choice((C.PINK, C.CYAN, C.YEL, '#f0f0f0', C.PURP))
        x = 27.15 + i * 0.3
        if rng.random() < 0.3:
            k.sphere(x + 0.1, 21.62, zz + 0.1, 0.09, 0.09, '#c8e8ff', 'snow_globe', emit=('#a0d0ff', 0.3), segs=8)
        else:
            k.box(x, 21.55, zz, x + 0.2, 21.7, zz + rng.uniform(0.12, 0.3), (col, 0.1), 'gift_box')
k.box(27.0, 21.45, 2.1, 32.0, 21.55, 2.16, shade(C.PINK, 0.45), 'boutique_neon', emit=(C.PINK, 0.85))
S.letters(k, 'BOUTIQUE', 'Limelight', 29.5, 21.2, 2.22, size=0.55, col=C.GOLD_L, energy=5)
k.solid(27.0, 21.15, 32.0, 21.8)
k.box(27.0, 23.0, 0.0, 32.0, 23.6, 0.95, ('#1a1620', 0.05), 'case_base')
k.box(27.05, 23.05, 0.2, 31.95, 23.55, 0.9, '#2a3040', 'case_glass', emit=('#4a5a7a', 0.35))
for i in range(9):
    col = rng.choice((C.YEL, C.PINK, C.CYAN, '#f0f0f0'))
    k.box(27.25 + i * 0.52, 23.2, 0.55, 27.45 + i * 0.52, 23.4, 0.7, shade(col, 0.6), 'case_goods', emit=(col, 0.4))
k.box(26.95, 22.95, 0.95, 32.05, 23.65, 1.0, (C.GOLD, 0.05), 'case_top')
k.solid(27.0, 23.0, 32.0, 23.6)
# the host's desk by the door
k.box(24.4, 25.15, 0.0, 26.1, 25.75, 1.0, (C.LACQUER, 0.05), 'host_desk', bevel=0.03)
k.box(24.35, 25.1, 1.0, 26.15, 25.8, 1.05, (C.GOLD, 0.05), 'host_desk_top')
k.box(25.6, 25.25, 1.05, 25.9, 25.5, 1.25, '#081020', 'host_screen', emit=('#3a5a9a', 0.6))
k.cyl(24.8, 25.4, 1.05, 1.25, 0.06, ('#f0f0f0', 0.05), 'vase', verts=8)
k.blob(24.8, 25.4, 1.38, 0.16, 0.14, 0.16, ('#c02050', 0.15), 'roses', segs=8)
k.solid(24.4, 25.15, 26.1, 25.75)
for (x, r) in ((18.6, 21.4), (25.4, 21.4), (18.6, 27.0), (25.4, 27.0)):
    C.column(k, x, r, 3.4)
C.chandelier(k, 22.0, 24.2, 3.5, s=1.45, energy=90)
C.chandelier(k, 13.6, 25.0, 3.3, s=1.0, energy=50)
C.chandelier(k, 30.0, 25.6, 3.3, s=1.0, energy=50)
for (x, r) in ((15.8, 23.6), (29.5, 24.6), (22.0, 27.0)):
    k.point_light(x, r, 2.6, '#ffd8a0', 24, radius=0.6)

# ---- light: warm and low over the felt (the tables bring their own), gold in the foyer, the room's neon ---------------------
for (x, r) in ((5.5, 9.8), (5.5, 14.8), (5.5, 19.8), (5.5, 24.8), (38.5, 20.6), (38.5, 25.6)):     # the slot aisles
    k.point_light(x, r, 2.6, '#ff90d0', 22, radius=0.8, group='pulse')
for (x, r) in ((22.0, 10.0), (15.0, 15.0), (29.0, 15.0), (22.0, 20.0), (38.5, 9.6), (36.5, 16.4)):
    k.point_light(x, r, 3.0, '#ffd0a0', 26, radius=0.8)
for (x, r, c) in ((11.5, 6.0, C.PINK), (33.0, 6.0, C.PURP), (22.0, 5.0, C.YEL), (11.5, 18.0, C.CYAN), (33.5, 18.0, C.PINK)):
    k.point_light(x, r, 2.4, c, 18, radius=0.6, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0, 'pulse': 1.0}, 'dim': {'flicker': 0.86, 'pulse': 0.45}},
         light_samples=96, world_light=('#2a1830', 0.45))

# ---- the world ---------------------------------------------------------------------------------------------------------
P = 'PRESS E TO PLAY'


def station(x, y, game, table, label, **kw):
    it = {'x': x, 'y': y, 'type': 'casino', 'game': game, 'table': table, 'label': label, 'prompt': P}
    it.update(kw)
    return it


def talk(x, y, label, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO TALK', 'dialog': text}


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Neon Royale', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [21, 26]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'interior': True})
inter = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'arcadia-street', 'leaveSpawn': [50, 9], 'label': 'THE STREET',
     'prompt': 'PRESS E TO GO OUT'} for (x, y) in DOORS]
inter += [{'x': x, 'y': 3, 'type': 'enter_world', 'target': 'arcadia-casino-cards', 'spawn': [7, 13], 'label': "THE CARD ROOM · TEXAS HOLD'EM",
           'prompt': 'PRESS E TO GO IN'} for x in (11, 12)]
inter += [{'x': x, 'y': 3, 'type': 'enter_world', 'target': 'arcadia-casino-cards', 'spawn': [23, 13], 'label': 'RUNOUTS',
           'prompt': 'PRESS E TO GO IN'} for x in (32, 33)]
inter += [{'x': x, 'y': 3, 'type': 'royale_vip', 'target': 'arcadia-casino-vip', 'spawn': [10, 12], 'label': 'THE CROWN ROOM',
           'prompt': 'PRESS E TO GO UP'} for x in (21, 22)]
inter += [{'x': 42, 'y': y, 'type': 'enter_world', 'target': 'arcadia-casino-dining', 'spawn': [2, 8], 'label': 'AURUM',
           'prompt': 'PRESS E TO DINE'} for y in (21, 22)]
# the games
inter += [station(x, 3, 'derby', 'derby-%d' % (i + 1), 'RACE & SPORTS') for i, x in enumerate((2, 5, 8))]
inter += [station(int(x), 3, 'crash', 'crash-%d' % (i + 1), 'CRASH') for i, x in enumerate(CRASH)]
inter += [station(int(x), 7, 'blackjack', 'bj-%d' % (i + 1), 'BLACKJACK') for i, x in enumerate(BJ)]
inter += [station(14, 12, 'roulette', 'roulette-1', 'ROULETTE'), station(28, 12, 'roulette', 'roulette-2', 'ROULETTE')]
inter += [station(int(x) - 1, 18, 'craps', 'craps-%d' % (i + 1), 'CRAPS') for i, x in enumerate(CRAPS)]
inter += [station(x, y, 'slots', 'slots-%d' % (i + 1), 'SLOTS') for i, (x, y) in enumerate(SLOTS)]
inter += [station(int(x), 22, 'lobby', 'link-%d' % (i + 1), 'ROYALE LINK') for i, x in enumerate(LINK)]
inter += [station(14, 4, 'lobby', 'cage-1', 'CAGE WINDOW'), station(18, 4, 'lobby', 'cage-2', 'CAGE WINDOW')]
# the people, the bar, the boutique
inter += [
    talk(16, 4, 'PENNY', 'THE CASHIER COUNTS A STACK OF CHIPS WITHOUT LOOKING AT IT.'),
    talk(22, 12, 'LOU', 'THE PIT BOSS WATCHES THREE TABLES AT ONCE.'),
    talk(23, 3, 'BRUNO', 'A BIG MAN IN A RED COAT BY THE VELVET ROPE.'),
    talk(37, 14, 'OZZIE', 'THE BARTENDER POLISHES A GLASS THAT IS ALREADY CLEAN.'),
    {'x': 39, 'y': 14, 'type': 'vendor', 'label': 'THE BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'gold_rush', 'price': 12}, {'id': 'royale_martini', 'price': 18}, {'id': 'void_fizz', 'price': 6}]},
    talk(39, 4, 'VELVET', 'LADY VELVET SINGS SOMETHING SLOW AND SAD ABOUT A LUCKY STREAK.'),
    look(36, 4, 'THE PIANIST', 'HE PLAYS WITH HIS EYES SHUT. A TIP JAR ON THE PIANO SAYS: REQUESTS - NO.\n\nYOU REQUEST ANYWAY. HE PLAYS IT ANYWAY.'),
    talk(25, 24, 'RAFE', 'THE HOST TOUCHES HIS EARPIECE AND SMILES AT YOU.'),
    talk(28, 23, 'MIMI', 'THE BOUTIQUE CLERK STRAIGHTENS A ROW OF SNOW GLOBES.'),
    {'x': 30, 'y': 23, 'type': 'vendor', 'label': 'THE BOUTIQUE', 'prompt': 'PRESS E TO BROWSE',
     'items': [{'id': 'royale_globe', 'price': 40}, {'id': 'gold_chip', 'price': 120}, {'id': 'lucky_dice', 'price': 60}]},
    look(16, 24, 'THE PRIZE CAR', 'A GOLD HOVER-COUPE TURNING SLOWLY ON ITS PLINTH, BULBS CHASING ROUND THE RIM. A PLAQUE: "THE ROYALE '
         'JACKPOT - HIT THREE CROWNS ON ANY MACHINE IN THE HOUSE."\n\nNOBODY HAS. THE DUST ON THE PLINTH SAYS NOBODY HAS IN A WHILE.'),
    look(22, 24, 'THE CROWN MOSAIC', 'A CROWN IN GOLD SET INTO THE MARBLE, WORN SMOOTH WHERE A HUNDRED THOUSAND PEOPLE HAVE STEPPED ON '
         'IT FOR LUCK.', 'PRESS E TO STEP ON IT'),
]
w['interactions'] = inter
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

# ---- the people ---------------------------------------------------------------------------------------------------------
ACT = [('npc-dealer', 15, 6, 'down'), ('npc-dealer-b', 21, 6, 'down'), ('npc-dealer-c', 28, 6, 'down'),
       ('npc-croupier', 13, 11, 'down'), ('npc-croupier', 29, 11, 'down'), ('npc-pitboss', 22, 11, 'down'),
       ('npc-stickman', 14, 19, 'up'), ('npc-stickman', 21, 19, 'up'), ('npc-stickman', 29, 19, 'up'),
       ('npc-royale-cashier', 16, 3, 'down'), ('npc-doorman', 23, 3, 'down'), ('npc-royale-bartender', 37, 13, 'down'),
       ('npc-host', 25, 24, 'down'), ('npc-boutique', 29, 22, 'down'), ('npc-highroller', 12, 19, 'up'),
       ('npc-samurai', 31, 19, 'up')]
SIT = [('npc-boxman', 14, 16, 'down'), ('npc-boxman', 22, 16, 'down'), ('npc-boxman', 29, 16, 'down'),
       ('npc-gambler-a', 14, 8, 'up'), ('npc-gambler-b', 22, 8, 'up'), ('npc-patron-a', 29, 8, 'up'),
       ('npc-gambler-c', 15, 13, 'up'), ('npc-gambler-d', 27, 13, 'up'),
       ('npc-patron-b', 5, 8, 'up'), ('npc-gambler-a', 8, 13, 'up'), ('npc-gambler-d', 1, 18, 'up'), ('npc-gambler-b', 4, 23, 'up'),
       ('npc-patron-a', 39, 19, 'up'), ('npc-gambler-c', 37, 8, 'up'), ('npc-gambler-b', 40, 8, 'up'), ('npc-patron-b', 36, 15, 'up')]
LIFT = {'npc-pitboss': 0.35, 'npc-royale-cashier': 0.3}          # stood up behind a podium, the cage's counter or a desk, or only their heads show
actors = [dict({'sheet': s, 'x': x, 'y': y, 'facing': f}, **({'lift': LIFT[s]} if s in LIFT else {})) for (s, x, y, f) in ACT]
actors += [{'sheet': s, 'x': x, 'y': y, 'facing': f, 'pose': 'sit'} for (s, x, y, f) in SIT]
actors += [{'sheet': 'npc-singer', 'x': 39, 'y': 4, 'facing': 'down', 'lift': SH},
           {'sheet': 'npc-pianist', 'x': 36, 'y': 4, 'facing': 'right', 'pose': 'sit', 'lift': SH}]
for a in actors:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=actors,
            scene_extra={'flicker': {'mode': 'pulse'}})
w = json.load(open(WORLD))
w['casino'] = {'live': live.dump(), 'floor': 'main'}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('casino floor done')
