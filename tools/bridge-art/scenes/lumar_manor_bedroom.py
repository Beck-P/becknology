"""Ashcombe House — the master bedroom, up the great staircase (world id "lumar-manor-bedroom"; js/home.js).
Usage: BVENV/bin/python lumar_manor_bedroom.py RENDER_DIR

The admiral's own room: wide honey-oak boards; blue damask over cream panelling; a four-poster in mahogany, reeded
posts with gilt finials, an open tester with a pleated valance, velvet curtains gathered at the posts, a carved
headboard, white sheets turned down over an embroidered coverlet, pillows and a bolster, a throw and a buttoned
bench at its foot, a night table and lamp each side; a dressing table with a triple glass, scent bottles, a jewel box
spilling pearls, a single rose; a small marble fire with a wing chair drawn up to it; two tall windows on the harbour;
in the corner a roll-top bath on brass claw feet, steaming, on a floor of white hexagons, a painted screen behind it;
the stairs down to the hall in the other corner. Open boards between for the furniture you buy.
"""
import sys

from _manor import A, E, Kit, C45, render, look, door, write_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-manor-bedroom'
COLS, ROWS = 22, 13
H = 3.0 / C45
FLOOR = (1, 2, 20, 11)
PAPER, WOOD, DRAPE = '#3e5272', E.CREAM, '#7a2a3a'
FX = 16.0

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, margin_x=0.4, seed=4019)

E.parquet_planks(k, 1.0, 2.0, 21.0, 12.0, tones=('#9a6a3a', '#8e6034', '#a67444'), plank=0.26, lengths=(1.5, 2.0, 2.5))
E.panelled_wall(k, 0.4, 21.6, 2.0, H, paper=PAPER, wood=WOOD, skip=[(FX - 1.15, FX + 1.15)])
E.side_wall(k, 0.4, 1.0, 1.5, 12.0, H, paper=PAPER, wood=WOOD)
E.side_wall(k, 21.0, 21.6, 1.5, 12.0, H, paper=PAPER, wood=WOOD)
E.front_wall(k, 0.4, 21.6, 12.0, wood=WOOD)

# ---- the back wall: the dressing table, the windows, the bed, the fire -----------------------------------------------
WINDOWS = []
for wx in (5.6, 19.7):
    WINDOWS.append(E.sash_window(k, wx, 2.0, w=1.0, z0=0.95, z1=3.15))
    E.drapes(k, wx, 2.0, 1.0, 3.32, col=DRAPE, trim=E.GILT)
    E.window_light(k, wx, 2.0, 2.1, 1.0, sun=70, moon=16)
E.dressing_table(k, 2.95, 2.0, w=1.3, skirt='#e8d0d4')
E.four_poster(k, 9.45, 12.55, 2.12, 5.15, drape=E.VELVET_B, cover=E.IVORY, canopy_z=2.6)
for x in (8.95, 13.05):
    A.nightstand(k, x, 2.45, candle_on=False)
    E.table_lamp(k, x, 2.45, 0.5, base='#2a4a8a', energy=6, s=0.9)
E.bed_bench(k, 10.0, 12.0, 5.55, col=E.VELVET_B)
shelf, F = E.grand_fireplace(k, FX, 2.0, H, w=2.0, open_w=0.95, open_h=0.85, breast=PAPER, energy=120, garniture=False)
k.solid(FX - 1.15, 2.0, FX + 1.15, F + 0.62)
E.mirror(k, FX - 0.55, FX + 0.55, F, shelf + 0.14, shelf + 1.15, arched=True)
E.clock_on_mantel(k, FX, F + 0.12, shelf)
for s in (-1, 1):
    E.vase_of_flowers(k, FX + s * 0.72, F + 0.14, shelf, s=0.6, col='#f0ece4', band=E.VELVET_B, kind='rose' if s < 0 else 'white')
E.wingback(k, 14.35, 4.5, facing='right', col='#7a2a3a')
E.portrait(k, 7.55, 2.0, 1.65, w=0.66, h=0.9, sitter='lady', coat='#3a4a7a', hair='#5a3a1e', bg=('#2a2a3a', '#3a3a4a', '#20202a'))
E.sconce(k, 7.55, 2.0, z=1.25, energy=4)
E.sconce(k, 18.2, 2.0, z=2.1, energy=4)

# ---- the rug, a chandelier --------------------------------------------------------------------------------------------
E.persian_rug(k, 7.8, 5.6, 14.2, 9.4, field='#2a3a5a', border='#7a2a3a', accent='#d8b060', ivory='#ece4d0')
E.chandelier(k, 11.0, 7.4, 2.9, rad=0.5, arms=6, chain_top=H + 0.3, energy=80)

# ---- the bath in its corner ---------------------------------------------------------------------------------------
E.tiles_hex(k, 15.6, 7.6, 20.9, 11.6, z=0.012)
E.folding_screen(k, 15.7, 7.25, 20.7, 7.25, panels=5, h=1.65)
E.roll_top_bath(k, 18.0, 9.55, length=1.6, width=0.74, body='#2a4a5a', along='x')
k.box(16.4, 10.4, 0.0, 17.4, 10.9, 0.035, ('#f0ece4', 0.08), 'bath_mat', bevel=0.01)
k.cyl(20.4, 8.4, 0, 0.9, 0.025, E.GILT, 'towel_rail', verts=6)                    # a towel stand, towels on it
k.cyl(20.4, 8.4, 0, 0.04, 0.15, E.GILT, 'towel_rail', verts=10)
k.box(20.25, 8.3, 0.4, 20.55, 8.5, 0.88, ('#f4f0e6', 0.08), 'towel', bevel=0.02)
k.solid(20.2, 8.2, 20.6, 8.6)
E.potted_palm(k, 20.35, 11.0, h=1.3, pot='#e8e4dc', fronds=8, s=0.85)
z = E.side_table_round(k, 16.1, 9.3, h=0.6, rad=0.2, wood=E.MAHOG)
E.candelabrum(k, 16.1, 9.3, z, arms=1, s=0.9, energy=2.5)

# ---- the stairs down to the hall ---------------------------------------------------------------------------------
A.stairwell_down(k, 1.05, 2.95, 9.25, 11.95)
k.solid(1.0, 9.25, 3.0, 11.95)
E.plinth(k, 3.6, 9.55, h=1.0, w=0.4)
E.vase_of_flowers(k, 3.6, 9.55, 1.0, s=0.75, col='#2a4a8a', kind='blue', mix=['white'])
E.chaise_longue(k, 5.6, 4.45, length=1.6, col='#c8a8b0', head='left')             # far enough out to stand at the window
for (x, r) in ((5.0, 9.0), (17.5, 6.0), (6.0, 5.0), (11.0, 10.0), (18.0, 10.0)):
    k.point_light(x, r, 3.0, '#ffd8a8', 38, radius=0.6, group='lamp')
E.torchere(k, 4.2, 2.5, h=1.7, energy=8)                                       # between the glass and the window, clear of the way through

render(k, OUT)

I = [
    door('STAIRS', 2, 10, 'lumar-manor', [2, 10], prompt='PRESS E TO GO DOWN'),
    look('BED', 11, 5, 'THE ADMIRAL\'S FOUR-POSTER. YOU DRAW THE CURTAINS AND THE HOUSE GOES AWAY, AND YOU SLEEP LIKE A SHIP IN HARBOUR.', prompt='PRESS E TO SLEEP',
         action='sleep', rest=1.3),
    look('THE BATH', 18, 9, 'A ROLL-TOP BATH, DEEP ENOUGH TO DROWN A BAD DAY IN, THE WATER ALREADY HOT. SOMEBODY IN THIS HOUSE KNOWS WHEN YOU\'RE COMING HOME.',
         prompt='PRESS E TO BATHE', action='sleep', rest=1.6),
    look('DRESSING TABLE', 2, 2, 'SCENT BOTTLES, A SILVER BRUSH, A JEWEL BOX LEFT OPEN AND A STRING OF PEARLS SPILLING OUT OF IT, A SINGLE ROSE. IN THE THREE GLASSES, THREE OF YOU.'),
    look('HEARTH', 16, 2, 'A SMALL FIRE, LAID AND LIT BEFORE YOU CAME UP. THE CLOCK ON THE MANTEL HAS BEEN STOPPED AT TWENTY TO SEVEN FOR FIFTY YEARS.'),
    look('WINDOW', 5, 2, 'THE HARBOUR UNDER YOUR WINDOW, THE LIGHTS OF SHIPS AT ANCHOR, THE GREEN LIGHT ON THE POINT.', action='view', view='sea', beam=True),
    look('WINDOW', 19, 2, 'THE ROOFS OF CROWNHAVEN, THE PALACE ON ITS HILL, THE BELL TOWER OF ST BRENDAN\'S.', action='view', view='sea', roofs=True),
    look('WING CHAIR', 14, 4, 'A WING CHAIR BY THE FIRE.', prompt='PRESS E TO SIT', action='sit', seat=[14.4, 4.55], facing='right'),
    look('CHAISE', 5, 4, 'A CHAISE LONGUE UNDER THE WINDOW, A SHAWL OVER IT.', prompt='PRESS E TO SIT', action='sit', seat=[5.4, 4.6], facing='down', view='sea'),
    look('PORTRAIT', 7, 2, 'THE ADMIRAL\'S WIFE, IN BLUE, HER HAIR IN A NET OF PEARLS. HE KEPT HER WHERE HE COULD SEE HER FROM THE BED.'),
]
write_world(WID, 'The Master Bedroom', COLS, ROWS, [3, 10], I, k, FLOOR, [], WINDOWS)
print('bedroom done')
