"""Ashcombe House — the dining room, through the double doors under the great hall's gallery (world id
"lumar-manor-dining"; js/home.js).
Usage: BVENV/bin/python lumar_manor_dining.py RENDER_DIR

Laid for a dinner that might start any minute: a long mahogany table under a damask cloth, twelve places (gilt
chargers, blue-rimmed plates, napkins folded like mitres, silver either side, wine and water glasses), carvers at the
ends, candelabra lit down the middle between silver epergnes of white roses, a fruit stand, a covered tureen,
decanters of claret and sherry; two crystal chandeliers over it; walls of red damask over cream panelling; a serpentine
sideboard of silver under a great marine painting; glazed cabinets of the Ashcombe china in the corners; two tall
windows in gold silk. Chevron parquet; open floor at the front and the sides for the furniture you buy.
"""
import sys

from _manor import A, E, Kit, C45, render, look, door, write_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-manor-dining'
COLS, ROWS = 22, 13
H = 3.0 / C45
FLOOR = (1, 2, 20, 11)
DOORS = [(10, 12), (11, 12)]
PAPER, WOOD, SILK = '#7a2c30', E.CREAM, '#b88a3a'

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, margin_x=0.4, seed=4017)

E.parquet_chevron(k, 1.0, 2.0, 21.0, 12.0, tones=('#6a4226', '#5e3a20', '#76492a', '#6e4428'), border=(0.32, '#3a2412'))
E.panelled_wall(k, 0.4, 21.6, 2.0, H, paper=PAPER, wood=WOOD)
E.side_wall(k, 0.4, 1.0, 1.5, 12.0, H, paper=PAPER, wood=WOOD)
E.side_wall(k, 21.0, 21.6, 1.5, 12.0, H, paper=PAPER, wood=WOOD)
E.front_wall(k, 0.4, 21.6, 12.0, door=(10.0, 12.0), wood=WOOD)
E.runner_carpet(k, 10.2, 10.6, 11.8, 12.0, col=E.VELVET_R)

# ---- the back wall -------------------------------------------------------------------------------------------------
WINDOWS = []
for wx in (5.1, 16.9):
    WINDOWS.append(E.sash_window(k, wx, 2.0, w=1.1, z0=0.95, z1=3.15))
    E.drapes(k, wx, 2.0, 1.1, 3.32, col=SILK, trim=E.GILT)
    E.window_light(k, wx, 2.0, 2.1, 1.1, sun=75, moon=16)
E.sideboard(k, 9.3, 12.7, 2.0)
E.seascape(k, 11.0, 2.0, 1.72, w=1.75, h=1.0, night=True)
E.china_cabinet(k, 1.3, 3.1, 2.0, top=2.5)
E.china_cabinet(k, 18.9, 20.7, 2.0, top=2.5)
for (x, kind) in ((7.6, 'still'), (14.4, 'portrait')):
    if kind == 'still':
        E.still_life(k, x, 2.0, 1.85, w=0.8, h=0.62)
    else:
        E.portrait(k, x, 2.0, 1.7, w=0.66, h=0.9, sitter='gent', coat='#3a2a1a', hair='#d8d4cc')
    E.sconce(k, x, 2.0, z=1.35, energy=4)

# ---- the table, laid --------------------------------------------------------------------------------------------------
E.persian_rug(k, 3.6, 4.4, 18.4, 8.9, field='#2a3048', border='#6a1a1e', accent='#c8a050')
E.long_table(k, 5.3, 16.7, 6.6, d=1.15, places=6, seat='#6a1a24')
for x in (8.4, 13.6):
    E.chandelier(k, x, 6.6, 2.8, rad=0.55, arms=8, chain_top=H + 0.3, energy=130)

# ---- the corners: a wine cooler, a trolley, palms -----------------------------------------------------------------
cx, cr = 2.0, 10.4                                           # a brass-bound cellarette of bottles on ice
k.cyl(cx, cr, 0.0, 0.62, 0.3, (E.MAHOG, 0.06), 'cellarette', verts=12)
for z in (0.12, 0.5):
    k.cyl(cx, cr, z, z + 0.04, 0.305, E.GILT, 'cellarette', verts=12)
k.cyl(cx, cr, 0.6, 0.63, 0.26, '#c8e8f0', 'ice', emit=('#6a9aa8', 0.25), verts=12)
for (dx, dr, col) in ((-0.1, -0.05, '#1a3a24'), (0.08, 0.06, '#5a1a24'), (0.1, -0.1, '#c8a040')):
    k.cyl(cx + dx, cr + dr, 0.6, 0.92, 0.035, col, 'bottle', verts=8)
    k.cyl(cx + dx, cr + dr, 0.92, 1.0, 0.014, E.GILT, 'bottle', verts=6)
k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
tx, tr = 19.6, 10.2                                          # a drinks trolley
for (a, b) in ((tx - 0.4, tr - 0.22), (tx + 0.4, tr - 0.22), (tx - 0.4, tr + 0.22), (tx + 0.4, tr + 0.22)):
    k.cyl(a, b, 0.05, 0.8, 0.015, E.GILT, 'trolley', verts=6)
    k.cyl_x(a - 0.04, a + 0.04, b, 0.05, 0.05, 0.05, '#2a2a2e', 'trolley_wheel', verts=8)
for z in (0.3, 0.75):
    k.box(tx - 0.42, tr - 0.24, z, tx + 0.42, tr + 0.24, z + 0.025, (E.MAHOG, 0.06), 'trolley')
for (dx, col) in ((-0.25, '#6a1020'), (-0.08, '#b88a30'), (0.1, '#e8e0d0')):
    k.cyl(tx + dx, tr, 0.775, 0.98, 0.04, '#c8d8e0', 'decanter', emit=('#607080', 0.25), verts=10)
    k.cyl(tx + dx, tr, 0.785, 0.92, 0.036, col, 'decanter_wine', verts=10)
    k.sphere(tx + dx, tr, 1.02, 0.025, 0.03, '#c8d8e0', 'decanter', segs=8)
k.cyl(tx + 0.28, tr, 0.775, 0.85, 0.035, '#c8dce8', 'glass', emit=('#8090a0', 0.3), verts=8)
for i in range(3):
    k.cyl(tx - 0.2 + i * 0.18, tr, 0.325, 0.56, 0.05, ('#1a3a24', '#5a1a24', '#3a2a1a')[i], 'bottle', verts=8)
k.solid(tx - 0.42, tr - 0.24, tx + 0.42, tr + 0.24)
E.potted_palm(k, 4.0, 10.6, h=1.45, jardiniere='#2a4a8a', fronds=8)
E.potted_palm(k, 18.0, 10.6, h=1.45, jardiniere='#2a4a8a', fronds=8)
for (x, r) in ((5.0, 10.0), (17.0, 10.0), (11.0, 10.5), (2.5, 5.0), (19.5, 5.0)):
    k.point_light(x, r, 3.0, '#ffd8a8', 42, radius=0.6, group='lamp')
E.torchere(k, 7.6, 3.1, h=1.7, energy=8)
E.torchere(k, 14.4, 3.1, h=1.7, energy=8)

render(k, OUT)

I = [door('THE HALL', x, y, 'lumar-manor', [7, 3]) for (x, y) in DOORS]
I += [
    look('THE TABLE', 11, 6, 'LAID FOR TWELVE: THE ASHCOMBE SILVER, THE BLUE AND WHITE, CANDLES LIT. NOBODY IS COMING. IT IS LAID EVERY NIGHT ANYWAY, IN CASE THE ADMIRAL COMES HOME.'),
    look('SIDEBOARD', 11, 2, 'THE SILVER: A TEA URN, SALVERS, A CLARET AND A SHERRY IN CUT-GLASS DECANTERS, AND ABOVE THEM THE REMEMBRANCE UNDER THE MOON IN A FRAME THE SIZE OF A DOOR.'),
    look('WINDOW', 5, 2, 'THE QUAY IN THE EVENING, THE LAMPLIGHTER GOING ALONG IT, A FIDDLE FROM THE CROWN & ANCHOR.', action='view', view='sea', roofs=True),
    look('WINDOW', 16, 2, 'MASTS IN THE HARBOUR LIKE A WINTER WOOD, AND PAST THEM THE OPEN SEA.', action='view', view='sea', beam=True),
    look('CHINA', 2, 2, 'THE BEST SERVICE: ONE HUNDRED AND FOUR PIECES, EVERY ONE WITH A SHIP ON IT. A TUREEN SHAPED LIKE A GALLEON. SOMEBODY MUST HAVE LOVED IT.'),
    look('CHINA', 19, 2, 'GLASS FOR EVERY WINE THERE IS AND A FEW THERE ISN\'T, ETCHED WITH THE ASHCOMBE ANCHOR.'),
    look('CARVER', 4, 6, 'THE HEAD OF THE TABLE. THE ADMIRAL\'S CHAIR.', prompt='PRESS E TO SIT', action='sit', seat=[4.95, 6.65], facing='right'),
    look('WINE', 2, 10, 'A CELLARETTE OF ICE AND BOTTLES: A SPARKLING ROSE CROWN, A CRIMSON CLARET, SOMETHING GOLDEN FROM THE TERN.'),
    look('DRINKS', 19, 10, 'A TROLLEY OF DECANTERS ON CASTERS, FOR WHEN THE PORT GOES ROUND.'),
]
write_world(WID, 'The Dining Room', COLS, ROWS, [10, 11], I, k, FLOOR, DOORS, WINDOWS)
print('dining room done')
