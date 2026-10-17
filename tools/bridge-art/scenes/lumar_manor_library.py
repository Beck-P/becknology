"""Ashcombe House — the library, off the great hall's east wall (world id "lumar-manor-library"; js/home.js).
Usage: BVENV/bin/python lumar_manor_library.py RENDER_DIR

Two hundred years of a seafaring family's reading: bookcases from the floor to the cornice all along the back wall,
walnut, panelled cupboards under them, fluted pilasters between the bays, every shelf full (runs of a binding, gilt
bands on the spines, stacks lying flat, a skull, a small globe, a vase) and a brass rail with the library ladder hooked
on it; a tall window in the middle hung in green velvet with a brass telescope on its tripod before it; a long library
table under green-shaded lamps, open atlases and a magnifying glass; two leather wing chairs and a chesterfield round
a reading lamp; a great globe on its stand; a ship model in a glass case; dark oak boards under a red Persian rug; a
lantern of a chandelier. Open floor along the front and the sides for the furniture you buy.
"""
import math
import sys

from _manor import A, E, Kit, C45, render, look, door, write_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-manor-library'
COLS, ROWS = 20, 14
H = 3.0 / C45
FLOOR = (1, 2, 18, 11)
WEST = [(0, 8), (0, 9)]
PAPER, WOOD = '#2e4a3a', '#d8c8a8'
WX = 10.0                                                   # the window between the two runs of shelves

k = Kit(COLS, ROWS, margin_top=3.3, margin_bottom=0.6, margin_x=0.4, seed=4013)

E.parquet_planks(k, 1.0, 2.0, 19.0, 12.0, tones=('#5e3c22', '#54351e', '#664226'), plank=0.2)
FX = 15.45                                                  # the fire, set into the right-hand run of shelves
E.panelled_wall(k, 0.4, 19.6, 2.0, H, paper=PAPER, wood=WOOD, skip=[(0.4, 8.75), (11.25, FX - 1.2), (FX + 1.2, 19.6)])
E.side_wall(k, 0.4, 1.0, 1.5, 12.0, H, paper=PAPER, wood=WOOD, openings=[(8.0, 10.0)])
E.side_wall(k, 19.0, 19.6, 1.5, 12.0, H, paper=PAPER, wood=WOOD)
k.box(0.0, 8.05, -0.004, 1.0, 9.95, 0.004, (E.MARBLE_K, 0.06), 'threshold')
E.front_wall(k, 0.4, 19.6, 12.0, wood=WOOD)

# ---- the bookcases and the window between them -----------------------------------------------------------------------
TOP = H - 0.25
RAIL = 2.35
E.bookcase_wall(k, 0.5, 8.75, 2.0, top=TOP, bay=1.03, wood=E.WALNUT, rail=RAIL)
E.bookcase_wall(k, 11.25, FX - 1.25, 2.0, top=TOP, bay=1.0, wood=E.WALNUT, rail=RAIL)
E.bookcase_wall(k, FX + 1.25, 19.5, 2.0, top=TOP, bay=1.0, wood=E.WALNUT, rail=RAIL)
shelf, F = E.grand_fireplace(k, FX, 2.0, H, w=2.2, open_w=1.0, breast=PAPER, marble='#d8d0c4', energy=150)
k.solid(FX - 1.2, 2.0, FX + 1.2, F + 0.62)
E.portrait(k, FX, F, shelf + 0.35, w=0.8, h=1.05, sitter='captain', coat='#2a3a2a', hair='#c8c0b0')
E.library_ladder(k, 5.6, 2.42, RAIL, 3.55)
WINDOWS = [E.sash_window(k, WX, 2.0, w=1.15, z0=0.8, z1=3.2)]
E.drapes(k, WX, 2.0, 1.15, 3.38, col='#24503a', trim=E.GILT)
E.window_light(k, WX, 2.0, 2.0, 1.15, sun=85, moon=18)
k.box(WX - 0.75, 2.0, 0.0, WX + 0.75, 2.5, 0.5, (E.WALNUT, 0.06), 'window_seat')
k.box(WX - 0.72, 2.02, 0.5, WX + 0.72, 2.48, 0.6, ('#24503a', 0.08), 'window_cushion', bevel=0.03)
for (dx, col) in ((-0.45, '#8a2a2a'), (0.42, '#c8a060')):
    k.box(WX + dx - 0.15, 2.04, 0.6, WX + dx + 0.15, 2.14, 0.86, (col, 0.08), 'cushion', bevel=0.04)
k.solid(WX - 0.75, 2.0, WX + 0.75, 2.5)
tx, tr = WX + 1.0, 3.1                                      # the telescope on its tripod, aimed out of the window
for a in (math.pi / 2, math.pi / 2 + 2.094, math.pi / 2 + 4.189):
    k.tube((tx + math.cos(a) * 0.28, tr + math.sin(a) * 0.22, 0.0), (tx, tr, 1.05), 0.016, E.MAHOG, 'telescope_stand', verts=5)
k.tube((tx + 0.12, tr + 0.25, 0.95), (tx - 0.25, tr - 0.5, 1.45), 0.06, (E.GILT, 0.04), 'telescope', rb=0.045, verts=12)
k.cyl(tx, tr, 1.0, 1.08, 0.04, E.GILT, 'telescope', verts=8)
k.solid(tx - 0.3, tr - 0.25, tx + 0.3, tr + 0.25)

# ---- reading: the table, the chairs, the globe, the ship in its case ----------------------------------------------
E.persian_rug(k, 4.2, 4.6, 15.8, 10.4, field='#6a1a1e', border='#24302a', accent='#c8a050', ivory='#e4d4b0')
TX0, TX1, TR = 6.4, 10.4, 6.2                               # the library table
for x in (TX0 + 0.15, TX1 - 0.15):
    for r in (TR - 0.4, TR + 0.4):
        k.cyl(x, r, 0, 0.72, 0.05, (E.WALNUT, 0.06), 'table_leg', verts=8)
k.box(TX0, TR - 0.55, 0.72, TX1, TR + 0.55, 0.8, (E.WALNUT, 0.06), 'table_top')
k.box(TX0 + 0.1, TR - 0.45, 0.8, TX1 - 0.1, TR + 0.45, 0.805, ('#24503a', 0.06), 'table_leather')
E.open_book(k, 7.3, TR + 0.1, 0.805)
E.open_book(k, 9.0, TR - 0.15, 0.805, col='#24302a')
k.box(7.9, TR - 0.4, 0.805, 8.6, TR + 0.05, 0.81, ('#e8dcb8', 0.1), 'chart')
k.box(8.0, TR - 0.36, 0.81, 8.5, TR, 0.812, '#7ab0a0', 'chart_sea')
k.cyl(8.75, TR + 0.25, 0.805, 0.82, 0.07, E.GILT, 'magnifier', verts=12)
k.tube((8.75, TR + 0.25, 0.81), (8.95, TR + 0.4, 0.81), 0.012, E.MAHOG, 'magnifier', verts=5)
E.stack_of_books(k, TX1 - 0.35, TR + 0.25, 0.805, n=5)
E.stack_of_books(k, TX0 + 0.3, TR - 0.3, 0.805, n=3)
for x in (TX0 + 0.9, TX1 - 1.0):
    E.reading_lamp(k, x, TR - 0.32, 0.805, energy=6)
A.candle(k, TX0 + 0.25, TR + 0.3, 0.805, energy=1.5)
k.solid(TX0, TR - 0.55, TX1, TR + 0.55)
for x in (7.4, 9.4):
    E.dining_chair(k, x, TR + 0.92, 'up', seat='#24503a', wood=E.WALNUT)
E.wingback(k, 13.55, 4.45, facing='right', col='#6a3420')
E.wingback(k, 17.35, 4.45, facing='left', col='#6a3420')
for x in (12.6, 18.3):
    z = E.side_table_round(k, x, 4.45, h=0.62, rad=0.24, wood=E.WALNUT)
    E.reading_lamp(k, x, 4.4, z, energy=7)
E.stack_of_books(k, 12.55, 4.6, 0.62, n=2)
E.sofa(k, 15.45, 7.75, length=2.3, facing='up', col='#5a2418', legs=E.WALNUT, kind='chesterfield')
E.globe_stand(k, 18.4, 7.4, s=1.15)
E.tea_table(k, 15.45, 6.1, w=1.0, d=0.5, h=0.44, wood=E.WALNUT, tea=False, top='#3a2a1e')
k.box(15.15, 5.95, 0.44, 15.55, 6.15, 0.47, ('#c8b080', 0.08), 'cigar_box')
k.cyl(15.75, 6.05, 0.44, 0.52, 0.035, '#c8dce8', 'glass', emit=('#8090a0', 0.3), verts=8)
k.cyl(15.75, 6.05, 0.45, 0.5, 0.032, '#b88a30', 'whisky', verts=8)
# the ship in her case, on a stand
sx, sr = 3.0, 7.0
k.box(sx - 0.5, sr - 0.25, 0, sx + 0.5, sr + 0.25, 0.85, (E.WALNUT, 0.06), 'case_stand')
k.box(sx - 0.52, sr - 0.27, 0.85, sx + 0.52, sr + 0.27, 0.9, (shade(E.WALNUT, 1.2), 0.05), 'case_stand')
for (a, b) in ((sx - 0.5, sr + 0.25), (sx + 0.5, sr + 0.25), (sx - 0.5, sr - 0.25), (sx + 0.5, sr - 0.25)):
    k.cyl(a, b, 0.9, 1.55, 0.012, E.GILT, 'case_frame', verts=4)
k.box(sx - 0.52, sr - 0.27, 1.55, sx + 0.52, sr + 0.27, 1.58, E.GILT, 'case_frame')
k.loft([[(sx - 0.35, sr, 1.04), (sx - 0.35, sr - 0.08, 1.12), (sx - 0.35, sr + 0.08, 1.12)],
        [(sx + 0.3, sr, 1.0), (sx + 0.3, sr - 0.1, 1.12), (sx + 0.3, sr + 0.1, 1.12)],
        [(sx + 0.42, sr, 1.1), (sx + 0.42, sr - 0.02, 1.12), (sx + 0.42, sr + 0.02, 1.12)]], ('#3a2414', 0.06), 'ship_model', closed=True)
for (mx, top) in ((sx - 0.2, 1.48), (sx + 0.0, 1.52), (sx + 0.2, 1.44)):
    k.cyl(mx, sr, 1.1, top, 0.008, '#2a1a10', 'ship_model', verts=4)
    for j in range(3):
        z0 = 1.18 + j * (top - 1.2) / 3
        k.box(mx - 0.08 + j * 0.01, sr + 0.01, z0, mx + 0.08 - j * 0.01, sr + 0.015, z0 + (top - 1.2) / 3.4, '#f0e8d4', 'ship_sails')
k.box(sx - 0.15, sr + 0.24, 0.62, sx + 0.15, sr + 0.26, 0.72, E.GILT, 'case_plaque')
k.solid(sx - 0.52, sr - 0.27, sx + 0.52, sr + 0.27)
E.plinth(k, 1.75, 4.0, h=1.05, w=0.42, trim=E.GILT)
E.bust(k, 1.75, 4.0, 1.05, stone='#3a3028')
E.potted_palm(k, 18.2, 10.6, h=1.5, pot='#7a4a2a', fronds=9)
z = E.side_table_round(k, 1.75, 10.7, h=0.66, rad=0.26, wood=E.WALNUT)
E.vase_of_flowers(k, 1.75, 10.7, z, s=0.7, col='#24503a', kind='gold', mix=['white'])
# the light: a brass lantern chandelier over the table, lamps, the window
E.chandelier(k, 8.4, 6.2, 2.9, rad=0.55, arms=8, tiers=2, chain_top=H + 0.3, energy=130)
E.torchere(k, 4.3, 7.0, h=1.7, energy=10)
for (x, r) in ((4.0, 5.5), (4.5, 10.0), (12.0, 9.5), (16.5, 10.0)):
    k.point_light(x, r, 3.0, '#ffd8a8', 44, radius=0.6, group='lamp')

render(k, OUT)

I = [door('THE HALL', x, y, 'lumar-manor', [24, 8]) for (x, y) in WEST]
I += [
    look('BOOKCASE', 3, 2, 'LOGBOOKS, THREE SHELVES OF THEM, EVERY VOYAGE AN ASHCOMBE EVER MADE. THE LAST ONE ENDS MID-SENTENCE.', prompt='PRESS E TO READ'),
    look('BOOKCASE', 18, 2, '"A NATURAL HISTORY OF THE SPORE SEAS", ALL NINE VOLUMES, UNCUT. A PRESSED KELP-FLOWER FALLS OUT OF THE FIRST ONE.', prompt='PRESS E TO READ'),
    look('HEARTH', 15, 2, 'A FIRE IN THE MIDDLE OF THE BOOKS, WHICH THE ADMIRAL SAID WAS THE POINT OF HAVING BOTH. OVER IT, HIS BROTHER, WHO NEVER READ ANY OF THEM.'),
    look('LADDER', 5, 3, 'THE LIBRARY LADDER, HOOKED ON ITS BRASS RAIL. YOU RIDE IT ALONG THE SHELVES, WHICH IS EXACTLY AS GOOD AS YOU HOPED.'),
    look('WINDOW', 10, 2, 'THE WINDOW SEAT, AND OUT OF THE WINDOW THE HARBOUR MOUTH. THE ADMIRAL\'S TELESCOPE IS STILL POINTED AT THE PALACE.', prompt='PRESS E TO SIT',
         action='sit', seat=[10.0, 2.7], facing='down', view='sea', beam=True),
    look('TELESCOPE', 11, 3, 'A BRASS TELESCOPE, AIMED AT THE PALACE WINDOWS. THE ADMIRAL WAS A CURIOUS MAN.', action='view', view='sea', roofs=True),
    look('LIBRARY TABLE', 8, 6, 'AN ATLAS OF THE FIVE SEAS OPEN AT THE CRIMSON, A MAGNIFYING GLASS, A CHART WITH A ROUTE PENCILLED IN AND RUBBED OUT. TWICE.'),
    look('GLOBE', 18, 7, 'THE OLD WORLD AS THE ASHCOMBES KNEW IT, THE MIDNIGHT ISLE STILL MARKED "HERE BE NOTHING". YOU SPIN IT AND IT STOPS ON LUMAR. IT ALWAYS DOES.'),
    look('SHIP MODEL', 3, 7, 'HMS REMEMBRANCE, THE FIRST ADMIRAL\'S FLAGSHIP, A YARD LONG IN HER GLASS CASE, EVERY LINE RIGGED BY HIS OWN HAND OVER THIRTY WINTERS.'),
    look('BUST', 1, 4, 'A BRONZE OF SOMEONE NOBODY CAN NAME. THE PLAQUE SAYS ONLY "HE KNEW".'),
    look('WING CHAIR', 13, 4, 'A LEATHER WING CHAIR BY THE FIRE, WORN TO THE SHAPE OF SOMEONE WHO READ IN IT FOR FORTY YEARS.', prompt='PRESS E TO SIT',
         action='sit', seat=[13.6, 4.5], facing='right'),
    look('WING CHAIR', 17, 4, 'A LEATHER WING CHAIR BY THE FIRE, THE READING LAMP AT ITS ELBOW.', prompt='PRESS E TO SIT', action='sit', seat=[17.3, 4.5], facing='left'),
    look('CHESTERFIELD', 15, 7, 'A CHESTERFIELD YOU SINK INTO, FACING THE FIRE. ON THE TABLE, A BOX OF CIGARS AND A WHISKY NOBODY FINISHED.', prompt='PRESS E TO SIT',
         action='sit', seat=[15.45, 7.7], facing='up'),
]
write_world(WID, 'The Library', COLS, ROWS, [1, 8], I, k, FLOOR, WEST, WINDOWS)
print('library done')
