"""Ashcombe House — the drawing room, off the great hall's west wall (world id "lumar-manor-drawing"; js/home.js).
Usage: BVENV/bin/python lumar_manor_drawing.py RENDER_DIR

Where the Ashcombes received: chevron parquet inside a walnut border; walls of old-gold silk in stripes over cream
panelling; a white marble chimneypiece with its fire and a great gilt glass over it; two tall windows on the harbour
hung in blue silk; a pair of camelback settees facing each other across a tea table laid for two (the pot still warm,
a stand of little cakes) on a blue Persian rug, a wing chair drawn up between them; a black grand piano with its lid
up and a harp beside it under the left window; a chaise longue under the right; pier tables with flowers under a
landscape and a portrait; a vitrine of the best porcelain; a crystal chandelier; palms; a bust. Open floor round it
all for the furniture you buy.
"""
import math
import sys

from _manor import A, E, Kit, C45, render, look, door, write_world  # noqa: F401
import assets_casino as CA
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-manor-drawing'
COLS, ROWS = 20, 13
H = 3.0 / C45
FLOOR = (1, 2, 18, 10)
EAST = [(19, 8), (19, 9)]
PAPER, WOOD, SILK = '#ae8a3c', E.CREAM, '#2e4a7a'
FX = 10.0

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, margin_x=0.4, seed=4011)

E.parquet_chevron(k, 1.0, 2.0, 19.0, 11.0, border=(0.32, '#5e3b1e'))
E.panelled_wall(k, 0.4, 19.6, 2.0, H, paper=PAPER, wood=WOOD, pattern='stripe', skip=[(FX - 1.3, FX + 1.3)])
E.side_wall(k, 0.4, 1.0, 1.5, 11.0, H, paper=PAPER, wood=WOOD)
E.side_wall(k, 19.0, 19.6, 1.5, 11.0, H, paper=PAPER, wood=WOOD, openings=[(8.0, 10.0)])
k.box(19.0, 8.05, -0.004, 20.0, 9.95, 0.004, (E.MARBLE_K, 0.06), 'threshold')
E.front_wall(k, 0.4, 19.6, 11.0, wood=WOOD)

# ---- the back wall -------------------------------------------------------------------------------------------------
WINDOWS = []
for wx in (4.6, 15.4):
    WINDOWS.append(E.sash_window(k, wx, 2.0, w=1.1, z0=0.95, z1=3.15))
    E.drapes(k, wx, 2.0, 1.1, 3.32, col=SILK, trim=E.GILT)
    E.window_light(k, wx, 2.0, 2.1, 1.1, sun=75, moon=16)
shelf, F = E.grand_fireplace(k, FX, 2.0, H, w=2.3, open_w=1.05, breast=PAPER, energy=150)
k.solid(FX - 1.3, 2.0, FX + 1.3, F + 0.62)
E.mirror(k, FX - 0.72, FX + 0.72, F, shelf + 0.14, shelf + 1.55, arched=True)
E.console_table(k, 6.45, 7.75, 2.0)
E.vase_of_flowers(k, 7.1, 2.22, 0.86, s=0.95, col='#f0ece4', band=SILK, kind='pink', mix=['white'])
E.seascape(k, 7.1, 2.0, 1.75, w=1.15, h=0.72)
E.console_table(k, 12.25, 13.55, 2.0)
E.vase_of_flowers(k, 12.9, 2.22, 0.86, s=0.95, col=SILK, band='#f0ece4', kind='blue', mix=['white'])
E.portrait(k, 12.9, 2.0, 1.72, w=0.72, h=0.98, sitter='lady', coat='#7a2a3a', hair='#c8a060', bg=('#2a3a2a', '#3a4a36', '#22261a'))
E.china_cabinet(k, 17.15, 18.85, 2.0, top=2.45)
for x in (8.55, 11.45):
    E.sconce(k, x, 2.0, z=2.2, energy=5)

# ---- the piano and the harp, the chaise ------------------------------------------------------------------------------
CA.grand_piano(k, 3.15, 5.05, col='#16121a', facing='right')
k.solid(2.0, 4.6, 4.0, 5.5)
hx, hr = 1.75, 3.15                                          # the harp
k.box(hx - 0.15, hr - 0.15, 0, hx + 0.15, hr + 0.15, 0.12, (E.GILT, 0.05), 'harp')
k.cyl(hx - 0.1, hr, 0.12, 1.75, 0.03, (E.GILT, 0.05), 'harp', verts=8)
k.sphere(hx - 0.1, hr, 1.8, 0.06, 0.06, E.GILT_L, 'harp', segs=8)
k.tube((hx - 0.1, hr, 1.75), (hx + 0.35, hr, 1.5), 0.03, (E.GILT, 0.05), 'harp', verts=6)
k.tube((hx + 0.35, hr, 1.5), (hx + 0.12, hr, 0.2), 0.05, (E.MAHOG, 0.06), 'harp', rb=0.09, verts=8)
for i in range(9):
    t = i / 9
    k.tube((hx - 0.08 + 0.42 * t * 0.95, hr, 1.72 - 0.25 * t), (hx - 0.08 + 0.2 * t, hr, 0.2 + 0.1 * t), 0.004, '#f0e8d0', 'harp_string', verts=3)
k.solid(hx - 0.2, hr - 0.2, hx + 0.4, hr + 0.2)
E.chaise_longue(k, 15.4, 4.45, length=1.7, col='#c8b0a0', head='right')

# ---- the seating round the tea table, the rug, the chandelier -------------------------------------------------------
E.persian_rug(k, 6.3, 4.4, 13.7, 9.6, field='#22325a', border='#7a1e22', accent='#d8b060', ivory='#ece0c4')
E.sofa(k, 7.45, 7.0, length=2.1, facing='right', col='#4a6aa0', legs=E.GILT, kind='settee', cushions=(E.GILT_L, '#e8c8c0'))
E.sofa(k, 12.55, 7.0, length=2.1, facing='left', col='#4a6aa0', legs=E.GILT, kind='settee', cushions=('#e8c8c0', E.GILT_L))
E.tea_table(k, 10.0, 7.0, w=1.15, d=0.62, h=0.46)
E.wingback(k, 10.0, 9.15, facing='up', col='#7a2a34')
for (x, r) in ((7.45, 5.45), (12.55, 8.6)):
    z = E.side_table_round(k, x, r, h=0.64, rad=0.24)
    E.table_lamp(k, x, r, z, base='#2a4a8a', energy=5)
E.chandelier(k, 10.0, 7.0, 2.95, rad=0.62, arms=8, chain_top=H + 0.3, energy=130)

# ---- the corners ---------------------------------------------------------------------------------------------------
E.potted_palm(k, 1.75, 9.9, h=1.55, jardiniere='#2a4a8a', fronds=9)
E.plinth(k, 18.3, 5.35, h=1.05, w=0.42, trim=E.GILT)
E.bust(k, 18.3, 5.35, 1.05, wig=False)
z = E.side_table_round(k, 4.6, 9.7, h=0.66, rad=0.26, cloth='#7a2a34')
E.vase_of_flowers(k, 4.6, 9.7, z, s=0.75, col='#f0ece4', kind='rose')
for (x, r) in ((5.5, 9.0), (15.0, 9.5)):
    k.point_light(x, r, 3.1, '#ffd8a8', 30, radius=0.6, group='lamp')

render(k, OUT)

I = [door('THE HALL', x, y, 'lumar-manor', [1, 10]) for (x, y) in EAST]
I += [
    look('HEARTH', 10, 2, 'A WHITE MARBLE FIRE UNDER A GLASS THAT HAS WATCHED TWO HUNDRED YEARS OF ASHCOMBES PRETEND NOT TO LOOK AT THEMSELVES IN IT.'),
    look('PIANO', 3, 5, 'A BLACK GRAND WITH ITS LID UP. ON THE STAND, "THE FAIR WIND WALTZ", PENCILLED ALL OVER IN A CHILD\'S HAND. YOU PLAY THE FIRST LINE. IT\'S HARDER THAN IT LOOKS.'),
    look('HARP', 1, 3, 'A GILT HARP. YOU RUN A HAND ACROSS IT AND THE ROOM GOES QUIET TO LISTEN.'),
    look('WINDOW', 4, 2, 'THE HARBOUR IN THE LATE LIGHT: A PACKET COMING IN FROM THE TERN, GULLS ON THE PIER, THE GREEN LIGHT ON THE POINT.', action='view', view='sea', beam=True),
    look('WINDOW', 15, 2, 'ROOFS STEPPING DOWN TO THE QUAY, THE CROWN & ANCHOR\'S SIGN, A HULL ON THE SLIP AT THE ROYAL YARD.', action='view', view='sea', roofs=True),
    look('PORCELAIN', 17, 2, 'THE ASHCOMBE SERVICE, BLUE AND WHITE, EVERY PIECE PAINTED WITH A DIFFERENT SHIP. ONE PLATE IS MISSING. THE FAMILY NEVER SPOKE OF IT.'),
    look('TEA', 10, 7, 'TEA FOR TWO, STILL WARM, AND A STAND OF LITTLE CAKES. SOMEBODY KEEPS LAYING IT. YOU HAVE STOPPED ASKING WHO.'),
    look('SETTEE', 7, 7, 'A SILK SETTEE, FADED WHERE THE SUN FALLS ON IT.', prompt='PRESS E TO SIT', action='sit', seat=[7.6, 6.95], facing='right'),
    look('SETTEE', 12, 7, 'A SILK SETTEE, FADED WHERE THE SUN FALLS ON IT.', prompt='PRESS E TO SIT', action='sit', seat=[12.4, 6.95], facing='left'),
    look('CHAISE', 15, 4, 'A CHAISE LONGUE UNDER THE WINDOW, A SHAWL THROWN OVER IT. THE BEST PLACE IN THE HOUSE TO READ AND NOT BE FOUND.', prompt='PRESS E TO SIT',
         action='sit', seat=[15.2, 4.6], facing='down', view='sea'),
    look('BUST', 18, 5, 'A YOUNG WOMAN IN MARBLE, HER HAIR IN RIBBONS: THE FIRST LADY ASHCOMBE, AT SIXTEEN, BEFORE SHE TOOK OVER THE SHIPPING LINE.'),
]
write_world(WID, 'The Drawing Room', COLS, ROWS, [18, 8], I, k, FLOOR, EAST, WINDOWS)
print('drawing room done')
