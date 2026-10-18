"""Château Aurelle — the grand hall and its salon de jeu (world id "hoarfell-chateau"), through the canopied doors on
Aurelle's forecourt (scenes/hoarfell_aurelle.py). Usage: BVENV/bin/python hoarfell_chateau.py RENDER_DIR

Beck: "reuse some of our casino games in there, but it's like fancier and its own vibe". Not the Neon Royale's gold
and neon: a château's hall in cream and verdigris and gilt. A floor of white marble octagons with black cabochons;
panelled walls under verdigris damask; tall windows onto the peaks going pink; a marble chimneypiece with a fire in the
middle of the back wall, a gilt glass over it and the château's founder above that. West, the reception: a marble
desk, the key board, the cage of the lift. The salon in the middle under two chandeliers, on a great rug: roulette and
blackjack, a craps table, the poker table with its regulars (Royale Link's tables, js/casino.js, in the château's own
frame: `house: 'chateau'`). East, Le Bar Doré: an island bar of gilt and green marble, a wall of wine, a grand piano,
velvet club chairs. Rendered night and day (the hearth and chandeliers by night; the windows' light by day).
"""
import math
import sys

from _manor import A, E, Kit, THETA, C45, render, look, door, write_world  # noqa: F401
from scenekit import shade
import assets_casino as C
import assets_signs as G

OUT = sys.argv[1]
WID = 'hoarfell-chateau'
COLS, ROWS = 32, 20
H = 3.1 / C45
RB = 2.0
FLOOR = (1, 3, 30, 18)
DOORS = [(15, 19), (16, 19)]
PAPER, WOOD = '#3a5a54', '#ece4d2'
FELT = '#1e4a40'                          # the château's felt: a deep verdigris green
FX = 15.5                                 # the chimneypiece

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, margin_x=0.4, seed=5121)
live = C.Live()
rng = k.rng


def peaks_window(x, w=1.2, z0=1.0, z1=3.2):
    """A tall window onto the range: the sky pink over violet peaks with snow on them (painted light, like the lodge's),
    glazing bars, a stone surround, swagged drapes."""
    rf = RB
    k.box(x - w / 2 - 0.14, rf - 0.04, z0 - 0.14, x + w / 2 + 0.14, rf + 0.03, z1 + 0.14, (WOOD, 0.05), 'window_frame')
    k.box(x - w / 2, rf + 0.03, z0, x + w / 2, rf + 0.04, z1, ('#4a2a3a', 0.05), 'window_sky', emit=('#ffb8a0', 0.95))
    k.box(x - w / 2, rf + 0.04, z0 + (z1 - z0) * 0.55, x + w / 2, rf + 0.045, z1, ('#3a2a4a', 0.05), 'window_sky_hi', emit=('#b8a0d8', 0.85))
    pts = [(x - w / 2, 0.0), (x - w * 0.25, 0.42), (x - w * 0.05, 0.22), (x + w * 0.18, 0.58), (x + w / 2, 0.3)]
    base = z0 + 0.05
    for (xa, ha), (xb, hb) in zip(pts, pts[1:]):
        k.quads([((xa, rf + 0.046, base), (xb, rf + 0.046, base), (xb, rf + 0.046, base + hb * (z1 - z0) * 0.6), (xa, rf + 0.046, base + ha * (z1 - z0) * 0.6))],
                ('#2a2a48', 0.05), 'window_peaks')
        k.poly([(xa, rf + 0.048, base + ha * (z1 - z0) * 0.6 - 0.12), (xb, rf + 0.048, base + hb * (z1 - z0) * 0.6 - 0.12),
                (xb, rf + 0.048, base + hb * (z1 - z0) * 0.6), (xa, rf + 0.048, base + ha * (z1 - z0) * 0.6)], ('#5a3a4a', 0.05), 'window_snow', emit=('#ffd8c8', 0.9))
    k.box(x - 0.025, rf + 0.05, z0, x + 0.025, rf + 0.09, z1, (WOOD, 0.05), 'window_bar')
    for f in (0.33, 0.66):
        k.box(x - w / 2, rf + 0.05, z0 + (z1 - z0) * f - 0.02, x + w / 2, rf + 0.09, z0 + (z1 - z0) * f + 0.02, (WOOD, 0.05), 'window_bar')
    E.drapes(k, x, rf, w, z1 + 0.2, col='#1e3a36', lining=WOOD, trim=E.GILT)
    E.window_light(k, x, rf, (z0 + z1) / 2, w, sun=60, moon=10)


# ---- floor and walls ----------------------------------------------------------------------------------------------
E.marble_cabochon(k, 1.0, RB, 31.0, 19.0, size=1.0, border=0.42)
E.panelled_wall(k, 0.4, 31.6, RB, H, paper=PAPER, wood=WOOD, skip=[(FX - 1.5, FX + 1.5)])
E.side_wall(k, 0.4, 1.0, 1.5, 19.0, H, paper=PAPER, wood=WOOD)
E.side_wall(k, 31.0, 31.6, 1.5, 19.0, H, paper=PAPER, wood=WOOD)
E.front_wall(k, 0.4, 31.6, 19.0, door=(15.0, 17.0), wood=WOOD)
E.runner_carpet(k, 14.6, 16.0, 17.4, 19.0, col='#8a1a2a')

# ---- the back wall: windows, the chimneypiece --------------------------------------------------------------------------
for wx in (5.4, 10.6, 20.4):
    peaks_window(wx)
shelf, F = E.grand_fireplace(k, FX, RB, H, w=2.7, open_w=1.25, breast=PAPER, energy=170)
k.solid(FX - 1.5, RB, FX + 1.5, F + 0.62)
E.mirror(k, FX - 0.66, FX + 0.66, F, shelf + 0.14, shelf + 1.0, arched=True)
E.portrait(k, FX, F, shelf + 1.3, w=0.8, h=0.95, sitter='lady', coat='#1e3a36', hair='#e8e4dc')
for x in (8.0, 13.2, 17.8, 22.6):
    E.sconce(k, x, RB, z=2.35, energy=5)

# ---- the reception (west) -------------------------------------------------------------------------------------------
k.box(1.6, 5.2, 0.0, 7.4, 6.0, 0.95, ('#e8e2d6', 0.08), 'desk', bevel=0.03)                       # a marble desk, gilt-banded
k.box(1.55, 5.15, 0.95, 7.45, 6.05, 1.02, ('#2a3a36', 0.05), 'desk_top')
k.box(1.6, 5.96, 0.1, 7.4, 6.02, 0.16, (E.GILT, 0.04), 'desk_trim')
k.box(1.6, 5.96, 0.8, 7.4, 6.02, 0.86, (E.GILT, 0.04), 'desk_trim')
for x in (2.4, 3.6, 4.8, 6.0):
    k.box(x - 0.35, 5.98, 0.24, x + 0.35, 6.02, 0.72, (shade('#e8e2d6', 0.92), 0.05), 'desk_panel')
k.sphere(4.5, 5.6, 1.06, 0.06, 0.05, E.GILT, 'desk_bell', segs=8)
E.table_lamp(k, 2.2, 5.5, 1.02, base='#1e3a36', energy=5)
E.table_lamp(k, 6.8, 5.5, 1.02, base='#1e3a36', energy=5)
k.solid(1.6, 5.2, 7.4, 6.0)
# the key board: pigeonholes with brass keys, behind the desk
k.box(2.2, RB, 1.2, 6.8, RB + 0.18, 2.5, ('#5a3a22', 0.06), 'key_board')
for i in range(12):
    for j in range(4):
        x, z = 2.4 + i * 0.36, 1.32 + j * 0.3
        k.box(x, RB + 0.18, z, x + 0.3, RB + 0.2, z + 0.24, ('#2a1a10', 0.05), 'pigeonhole')
        if (i * 7 + j * 3) % 5:
            k.box(x + 0.12, RB + 0.2, z + 0.04, x + 0.17, RB + 0.23, z + 0.16, (E.GILT, 0.04), 'key')
k.box(2.0, RB + 0.18, 2.55, 7.0, RB + 0.22, 2.85, ('#1e3a36', 0.05), 'sign_board')
G.letters(k, 'RECEPTION', 'CinzelDecorative-Bold', 4.5, RB + 0.22, 2.6, size=0.24, col=E.GILT, lit=True, energy=2)
# the lift: a gilt cage
LX0, LX1 = 1.3, 2.9
for x in (LX0, LX1):
    k.box(x - 0.05, 7.6, 0.0, x + 0.05, 9.2, 2.8, (E.GILT, 0.04), 'lift_cage')
for i in range(9):
    x = LX0 + i * (LX1 - LX0) / 8
    k.box(x - 0.012, 9.15, 0.0, x + 0.012, 9.2, 2.6, (E.GILT, 0.04), 'lift_cage')
k.box(LX0 - 0.05, 7.6, 2.6, LX1 + 0.05, 9.2, 2.8, (E.GILT, 0.04), 'lift_cage')
k.box(LX0, 7.6, 0.0, LX1, 9.15, 2.6, ('#140c08', 0.05), 'lift_car', emit=('#ffb060', 0.12))
k.cyl_y(2.1, 9.2, 9.24, 3.0, 0.24, 0.24, (E.GILT, 0.04), 'lift_dial', verts=16)
k.solid(LX0, 7.6, LX1, 9.2)
E.potted_palm(k, 1.8, 11.2, h=1.6, jardiniere='#1e3a36', fronds=9)
E.wingback(k, 4.2, 9.6, facing='right', col='#1e3a36')
E.wingback(k, 6.6, 9.6, facing='left', col='#1e3a36')
E.tea_table(k, 5.4, 9.8, w=0.8, d=0.5)
E.plinth(k, 1.9, 16.6, h=0.62, w=0.6)
E.statue(k, 1.9, 16.6, 0.62, pose='venus', s=1.15)

# ---- the salon de jeu (the middle) -----------------------------------------------------------------------------------
E.persian_rug(k, 8.8, 6.6, 23.2, 15.4, field='#1e3a36', border='#6a1a22', accent='#d8b060', ivory='#ece4d2')
C.roulette(k, live, 9.4, 5.0, w=3.6, d=1.3, wheel='left', felt=FELT, rng=rng)
k.solid(9.4, 5.0, 13.0, 6.0)
for x in (10.5, 11.5, 12.5):
    C._stool(k, x, 6.6, seat='#1e3a36')
C.blackjack(k, live, 19.4, 4.9, w=2.9, d=1.4, felt=FELT, stools=[(18.4, 6.6), (19.4, 6.65), (20.4, 6.6)], rng=rng)
k.solid(17.9, 4.9, 20.9, 5.9)
PK = (12.0, 11.2)
places = [(12.0, 9.85, 'down'), (11.0, 9.85, 'down'), (13.0, 9.85, 'down'), (10.0, 10.85, 'right'), (14.0, 10.85, 'left'),
          (11.0, 12.85, 'up'), (12.0, 12.85, 'up'), (13.0, 12.85, 'up')]
C.poker(k, live, PK[0], PK[1], w=3.4, d=1.9, felt=FELT, places=places, empty=(0, 4, 6), rng=rng, wood='#2a1a10', chair_col='#1e3a36')
k.solid(PK[0] - 1.7, PK[1] - 0.95, PK[0] + 1.7, PK[1] + 0.95)
C.craps(k, live, 19.6, 11.0, w=4.6, d=1.9, felt=FELT, rng=rng)
k.solid(17.3, 10.05, 21.9, 11.95)
for (x, r) in ((12.0, 8.2), (19.4, 8.2)):
    E.chandelier(k, x, r, 3.25, rad=0.85, arms=12, chain_top=H + 0.3, energy=150)

# ---- Le Bar Doré (east) ------------------------------------------------------------------------------------------------
E.sideboard(k, 24.6, 30.4, RB, d=0.55, h=0.95, wood='#2a1a10', silver=True)            # the back bar: decanters on a long sideboard
E.mirror(k, 25.2, 29.8, RB + 0.02, 1.15, 2.85, arched=False)
for x in (24.4, 30.6):
    E.sconce(k, x, RB, z=2.2, energy=5)
k.solid(24.6, RB, 30.4, RB + 0.6)
k.box(24.6, RB + 0.1, 3.0, 30.4, RB + 0.14, 3.4, ('#1e3a36', 0.05), 'sign_board')
G.letters(k, 'LE BAR DORE', 'Limelight', 27.5, RB + 0.14, 3.04, size=0.3, col='#f8e0a0', lit=True, energy=4)
C.island_bar(k, 27.5, 6.2, w=5.2, d=2.6, top='#2e524c', stools=[(25.5, 8.0), (26.5, 8.0), (28.5, 8.0), (29.5, 8.0)])
k.solid(24.9, 4.9, 30.1, 7.5)
C.grand_piano(k, 25.6, 13.0, facing='right')
k.solid(24.6, 12.3, 26.8, 13.8)
for (x, r, f) in ((28.4, 11.2, 'down'), (30.0, 12.4, 'left'), (28.4, 14.6, 'up')):
    C.club_chair(k, x, r, facing=f, col='#6a1a22')
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
C.cocktail_table(k, 29.0, 12.8, glow='#ffd890')
k.solid(28.7, 12.5, 29.3, 13.1)
E.potted_palm(k, 30.3, 17.4, h=1.6, jardiniere='#1e3a36', fronds=9)
# marble columns between the hall and the salon, gilt at their feet and heads
for x in (8.6, 23.4):
    for r in (6.6, 10.6, 14.6):
        k.cyl(x, r, 0.0, 0.18, 0.3, (E.GILT, 0.04), 'column_base', verts=16)
        k.cyl(x, r, 0.18, H - 0.3, 0.22, ('#ece6da', 0.05), 'column', verts=16)
        for i in range(8):                                                   # flutes
            a = i / 8 * math.tau
            k.box(x + math.cos(a) * 0.21 - 0.012, r + math.sin(a) * 0.21 - 0.012, 0.25, x + math.cos(a) * 0.21 + 0.012,
                  r + math.sin(a) * 0.21 + 0.012, H - 0.4, ('#d8d0c0', 0.04), 'column_flute')
        k.cyl(x, r, H - 0.3, H - 0.12, 0.32, (E.GILT, 0.04), 'capital', verts=16)
        k.solid_post(x, r)
# the lounges: a sofa and chairs by the reception, another by the piano
E.sofa(k, 4.6, 15.6, length=2.4, facing='up', col='#1e3a36')
E.wingback(k, 2.6, 13.4, facing='right', col='#6a1a22')
E.wingback(k, 6.6, 13.4, facing='left', col='#6a1a22')
z = E.tea_table(k, 4.6, 13.6, w=1.0, d=0.6)
E.potted_palm(k, 7.6, 17.4, h=1.4, jardiniere='#1e3a36', fronds=8, s=0.9)
E.sofa(k, 28.4, 17.2, length=2.2, facing='up', col='#6a1a22')
E.torchere(k, 26.6, 17.6, h=1.75, energy=8)
E.persian_rug(k, 1.6, 12.2, 7.6, 16.8, field='#6a1a22', border='#1e3a36', accent='#d8b060', ivory='#ece4d2')
E.torchere(k, 23.6, 16.8, h=1.8, energy=10)
E.torchere(k, 8.2, 16.8, h=1.8, energy=10)
for (x, r) in ((23.6, 3.4), (8.2, 3.4)):
    E.plinth(k, x, r, h=1.05, w=0.42, trim=E.GILT)
    E.bust(k, x, r, 1.05)

# ---- light --------------------------------------------------------------------------------------------------------------
for (x, r) in ((5.0, 13.0), (27.0, 10.0), (15.5, 15.5), (12.0, 13.5), (20.0, 13.5)):
    k.point_light(x, r, 3.2, '#ffd8a8', 30, radius=0.6, group='lamp')
render(k, OUT, ambient=('#3a405a', 0.45))

# ---- the world ---------------------------------------------------------------------------------------------------------
P = 'PRESS E TO PLAY'
CH = {'house': 'chateau'}


def table(x, y, game, tid, label, **kw):
    it = {'x': x, 'y': y, 'type': 'casino', 'game': game, 'table': tid, 'label': label, 'prompt': P}
    it.update(CH)
    it.update(kw)
    return it


I = [{'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'hoarfell-aurelle', 'leaveSpawn': [28, 9], 'label': 'THE FORECOURT', 'prompt': 'PRESS E TO GO OUT'}
     for (x, y) in DOORS]
I += [
    table(11, 6, 'roulette', 'roulette-aurelle', 'ROULETTE'),
    table(19, 6, 'blackjack', 'bj-aurelle', 'BLACKJACK'),
    table(12, 10, 'poker', 'poker-aurelle', 'THE POKER TABLE'),
    table(19, 10, 'craps', 'craps-aurelle', 'CRAPS'),
    {'x': 4, 'y': 5, 'type': 'dialog', 'label': 'MONSIEUR AUBERT', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE CONCIERGE LOOKS UP FROM HIS BOOK.'},
    {'x': 2, 'y': 9, 'type': 'aurelle', 'label': 'THE LIFT', 'prompt': 'PRESS E FOR A ROOM'},
    {'x': 27, 'y': 8, 'type': 'vendor', 'label': 'LE BAR DORE', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'champagne', 'price': 40}, {'id': 'vin_chaud', 'price': 10}, {'id': 'truffles', 'price': 26}, {'id': 'hot_cocoa', 'price': 8}],
     'dialog': 'GREEN MARBLE AND GILT, A BARMAN IN A WHITE JACKET WHO MIXES YOUR DRINK BEFORE YOU\'VE DECIDED WHAT IT IS.'},
    look('PIANO', 26, 14, 'A GRAND PIANO, LID UP, A PIANIST IN TAILS PLAYING SOMETHING SLOW FOR THE CRAPS TABLE, WHO ARE NOT LISTENING.', prompt='PRESS E TO LISTEN'),
    {'x': 15, 'y': 4, 'type': 'lodge_fire', 'label': 'FIRE', 'prompt': 'PRESS E TO WARM UP'},
    look('WINDOW', 5, 2, 'THE RANGE GOING PINK OVER THE FOREST, THE CHAIRLIFT\'S CABLES CATCHING THE LIGHT.'),
    look('WINDOW', 10, 2, 'THE HOARSPIRE, FAR OFF, A PLUME OF SNOW BLOWING OFF ITS SUMMIT.'),
    look('WINDOW', 20, 2, 'THE GLACIER IN THE NEXT VALLEY, BLUE IN ITS CREVASSES. THE GUIDES SAY THERE\'S A WAY OVER IT, HUT TO HUT, TO SOMEWHERE WARM.'),
    look('PORTRAIT', 15, 3, 'MADAME HELOISE AURELLE, WHO BUILT THE CHATEAU AS A SANATORIUM AND TURNED IT INTO A CASINO THE MOMENT THE DOCTORS LEFT.'),
    look('KEY BOARD', 6, 4, 'A HUNDRED BRASS KEYS ON GREEN TASSELS. NUMBER 13 HAS NO KEY. NUMBER 14 HAS TWO.'),
    look('STATUE', 1, 16, 'A MARBLE NYMPH IN A FUR STOLE. SOMEBODY ADDED THE STOLE LATER, IN PLASTER, AND NOBODY HAS DARED TAKE IT OFF.'),
]
actors = [{'sheet': 'npc-croupier-aurelle', 'x': 11, 'y': 4, 'facing': 'down'}, {'sheet': 'npc-dealer', 'x': 19, 'y': 4, 'facing': 'down'},
          {'sheet': 'npc-aubert', 'x': 4, 'y': 4, 'facing': 'down'},
          {'sheet': 'npc-dealer-b', 'x': 12, 'y': 9, 'facing': 'down'},
          {'sheet': 'npc-gambler-a', 'x': 10, 'y': 10, 'facing': 'right', 'pose': 'sit'},
          {'sheet': 'npc-gambler-b', 'x': 13, 'y': 12, 'facing': 'up', 'pose': 'sit'}]
for a in actors:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
write_world(WID, 'Château Aurelle', COLS, ROWS, [15, 18], I, k, FLOOR, DOORS, [], tileset='hoarfell')
import json  # noqa: E402
import _manor  # noqa: E402
p = _manor.world_path(WID)
w = json.load(open(p))
w['indoors'] = True
w['scene']['actors'] = actors
w['casino'] = {'live': live.dump(), 'house': 'chateau'}
open(p, 'w').write(json.dumps(w, indent=2) + '\n')
print('chateau done')
