"""Ashcombe House — a captain's mansion on Crownhaven's waterfront, yours for 400,000 (world id "lumar-manor"; js/home.js,
js/legacy.js, js/estate.js). The great hall, and the way into the rest of the house.
Usage: BVENV/bin/python lumar_manor.py RENDER_DIR

Beck: "make the Ashcombe House feel super bougie and gorgeous… it's probably pretty big." The tall slate house beside
the Crown & Anchor opens on its great hall: a floor of white marble octagons and black cabochons inside a black border
with a brass line; walls of sage damask over cream panelling under a deep cornice; the grand staircase climbing the left
wall to the gallery, a red runner held by brass rods, balusters two to a tread, a lamp standard on the newel; double
doors under the gallery to the dining room, another door on the gallery to the bedrooms; the marble chimneypiece with
its fire, garniture and fender, an overmantel glass and over it the last Admiral Ashcombe in a gilt frame; tall sash
windows on the harbour in swagged drapes (their glass the live sky, js/estate.js); pier tables with flowers under
portraits; a grandfather clock; marble statuary at the corners and busts on pedestals; a Persian rug with a medallion;
the great chandelier over a drum table and its arrangement of flowers; palms in blue-and-white jardinières, the
admiral's coat still on the stand by the door. The drawing room opens off the west wall, the library off the east,
the master bedroom up the stairs (places within places, each furnishable). The open marble is yours to furnish.
"""
import sys

from _manor import A, E, Kit, THETA, C45, render, look, door, write_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-manor'
COLS, ROWS = 26, 16
H = 3.0 / C45
FLOOR = (1, 2, 24, 13)
FRONT_DOOR = [(12, 14), (13, 14)]
WEST, EAST = [(0, 10), (0, 11)], [(25, 8), (25, 9)]
DINING = [(7, 2), (8, 2)]
PAPER, WOOD = '#4a6652', E.CREAM
FX = 15.6                                                   # the chimneypiece

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, margin_x=0.4, seed=4008)

# ---- floor and walls ----------------------------------------------------------------------------------------------
E.marble_cabochon(k, 1.0, 2.0, 25.0, 14.0, size=1.0, border=0.42)
E.panelled_wall(k, 0.4, 25.6, 2.0, H, paper=PAPER, wood=WOOD, skip=[(FX - 1.45, FX + 1.45)], doors=[(7.3, 9.1, 2.25)])
E.side_wall(k, 0.4, 1.0, 1.5, 14.0, H, paper=PAPER, wood=WOOD, openings=[(10.0, 12.0)])
E.side_wall(k, 25.0, 25.6, 1.5, 14.0, H, paper=PAPER, wood=WOOD, openings=[(8.0, 10.0)])
E.front_wall(k, 0.4, 25.6, 14.0, door=(12.0, 14.0), wood=WOOD)
for (xa, ra, xb, rb) in ((0.0, 10.05, 1.0, 11.95), (25.0, 8.05, 26.0, 9.95)):      # thresholds into the next rooms
    k.box(xa, ra, -0.004, xb, rb, 0.004, (E.MARBLE_K, 0.06), 'threshold')
E.runner_carpet(k, 11.6, 13.0, 14.4, 14.0, col=E.VELVET_R)

# ---- the staircase, the gallery, the doors under and on it -----------------------------------------------------------
ZG = 2.35
E.gallery(k, 1.0, 6.45, 2.0, 0.95, ZG, gap=(1.1, 3.3))
E.grand_stair(k, 1.2, 3.2, 2.95, 9.0, ZG, n=12, runner=E.VELVET_R, open_side='right')
k.box(4.0, 1.5, ZG, 5.2, 1.98, ZG + 1.45, '#140c08', 'doorway', emit=('#ffb060', 0.08))     # up on the gallery, the way to the bedrooms
k.box(3.98, 1.5, ZG - 0.04, 5.22, 2.0, ZG, (E.MAHOG, 0.08), 'gallery_floor')
for (a, b, c, d) in ((3.86, ZG, 4.0, ZG + 1.57), (5.2, ZG, 5.34, ZG + 1.57), (3.86, ZG + 1.45, 5.34, ZG + 1.57)):
    k.box(a, 2.0, b, c, 2.08, d, (WOOD, 0.04), 'architrave')
k.point_light(4.6, 2.4, ZG + 0.9, '#ffb060', 6, radius=0.2, group='lamp')
E.portrait(k, 2.3, 2.0, ZG + 0.42, w=0.62, h=0.85, sitter='lady', coat='#5a2a4a', hair='#3a2414', bg=('#2a2a1e', '#3a3628', '#22201a'))
E.portrait(k, 6.0, 2.0, ZG + 0.42, w=0.62, h=0.85, sitter='captain', coat='#2a3a2a', hair='#8a8478')
E.doorway(k, 7.3, 9.1, 2.0, top=2.25, wood=WOOD, pediment=True, double=E.MAHOG)        # the double doors to the dining room
E.torchere(k, 4.3, 9.7, h=1.8, energy=10)

# ---- the back wall: windows, pier tables, the chimneypiece ---------------------------------------------------------
WINDOWS = []
for wx in (10.95, 20.35):
    WINDOWS.append(E.sash_window(k, wx, 2.0, w=1.1, z0=0.95, z1=3.15))
    E.drapes(k, wx, 2.0, 1.1, 3.32, col=E.VELVET_R)
    E.window_light(k, wx, 2.0, 2.1, 1.1, sun=75, moon=16)
for (cx, sitter, coat) in ((13.0, 'lady', '#2a4a6a'), (18.2, 'captain', '#1e2c4a')):
    E.console_table(k, cx - 0.62, cx + 0.62, 2.0)
    E.vase_of_flowers(k, cx, 2.22, 0.86, s=0.95, kind='white' if sitter == 'lady' else 'rose', mix=['pink'])
    E.candelabrum(k, cx - 0.45, 2.2, 0.86, arms=1, s=0.8, energy=2.0)
    E.portrait(k, cx, 2.0, 1.75, w=0.78, h=1.05, sitter=sitter, coat=coat, hair='#3a2414' if sitter == 'lady' else '#d8d4cc')
shelf, F = E.grand_fireplace(k, FX, 2.0, H, w=2.6, open_w=1.2, breast=PAPER, energy=170)
k.solid(FX - 1.45, 2.0, FX + 1.45, F + 0.62)
E.mirror(k, FX - 0.62, FX + 0.62, F, shelf + 0.14, shelf + 0.98, arched=False)
E.portrait(k, FX, F, shelf + 1.24, w=0.78, h=0.9, sitter='admiral', coat='#1e2c4a', hair='#e8e4dc')
A.grandfather_clock(k, 22.45, 2.0)
E.still_life(k, 24.05, 2.0, 1.95, w=0.9, h=0.68)
E.potted_palm(k, 24.15, 2.85, h=1.5, jardiniere='#2a4a8a', fronds=9)
for x in (12.1, 19.15, 21.45):
    E.sconce(k, x, 2.0, z=2.15, energy=5)
# a pair of wing chairs drawn up to the fire
E.wingback(k, 13.55, 4.35, facing='right', col=E.VELVET_G)
E.wingback(k, 17.65, 4.35, facing='left', col=E.VELVET_G)
E.torchere(k, 12.6, 3.3, h=1.75, energy=9)
E.torchere(k, 18.6, 3.3, h=1.75, energy=9)

# ---- the middle: the rug, the drum table and its flowers, the chandelier --------------------------------------------
E.persian_rug(k, 8.6, 5.7, 22.4, 12.0, field='#7a1e22', border='#1e2a4a', accent='#d8b060')
E.side_table_round(k, 15.5, 8.85, h=0.74, rad=0.52, wood=E.MAHOG)
E.vase_of_flowers(k, 15.5, 8.85, 0.74, s=1.55, col='#f0ece4', band='#2a4a8a', kind='white', mix=['rose', 'pink'])
E.chandelier(k, 15.5, 8.85, 3.05, rad=0.78, arms=10, chain_top=H + 0.3, energy=170)

# ---- statuary, the corners, the door ----------------------------------------------------------------------------------
E.plinth(k, 1.95, 12.35, h=0.62, w=0.6)
E.statue(k, 1.95, 12.35, 0.62, pose='venus', s=1.15)
E.plinth(k, 24.05, 12.35, h=0.62, w=0.6)
E.statue(k, 24.05, 12.35, 0.62, pose='navigator', s=1.15)
E.plinth(k, 24.3, 6.55, h=1.05, w=0.42, trim=E.GILT)
E.bust(k, 24.3, 6.55, 1.05)
z = E.side_table_round(k, 24.3, 10.85, h=0.66, rad=0.26, wood=E.MAHOG)
E.table_lamp(k, 24.3, 10.85, z, energy=5)
z = E.side_table_round(k, 4.75, 10.8, h=0.66, rad=0.26, wood=E.MAHOG)
E.vase_of_flowers(k, 4.75, 10.8, z, s=0.7, col='#3a6a5a', kind='gold')
E.potted_palm(k, 10.75, 13.3, h=1.4, jardiniere='#2a4a8a', fronds=8, s=0.9)
E.potted_palm(k, 15.25, 13.3, h=1.4, jardiniere='#2a4a8a', fronds=8, s=0.9)
A.coat_rack(k, 9.5, 13.3)

# ---- light ---------------------------------------------------------------------------------------------------------
for (x, r) in ((6.0, 9.5), (21.0, 9.5), (11.0, 12.0), (20.0, 12.0)):
    k.point_light(x, r, 3.2, '#ffd8a8', 34, radius=0.6, group='lamp')

render(k, OUT)

I = [{'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-crown', 'leaveSpawn': [45, 30], 'label': 'THE WATERFRONT', 'prompt': 'PRESS E TO GO OUT'}
     for (x, y) in FRONT_DOOR]
I += [door('THE DRAWING ROOM', x, y, 'lumar-manor-drawing', [18, 8]) for (x, y) in WEST]
I += [door('THE LIBRARY', x, y, 'lumar-manor-library', [1, 8]) for (x, y) in EAST]
I += [door('THE DINING ROOM', x, y, 'lumar-manor-dining', [10, 11]) for (x, y) in DINING]
I += [
    door('STAIRS', 2, 9, 'lumar-manor-bedroom', [3, 10], prompt='PRESS E TO GO UP'),
    look('HEARTH', 15, 2, 'A FIRE IN WHITE MARBLE, A GILT GLASS, AND OVER IT THE LAST ADMIRAL ASHCOMBE IN HIS BLUE COAT AND HIS RED SASH, LOOKING AS IF HE\'D LIKE A WORD ABOUT THE CARPET.'),
    look('WINDOW', 11, 2, 'THE ROYAL PIER, THE FISHING JETTY, THE GREEN LIGHT ON THE WEST POINT. EVERY SHIP IN THE CAPITAL GOES PAST YOUR WINDOW.',
         action='view', view='sea', beam=True),
    look('WINDOW', 20, 2, 'THE CROWN & ANCHOR\'S CHIMNEY NEXT DOOR, AND PAST IT THE ROYAL YARD, A HULL ON THE SLIP.', action='view', view='sea', roofs=True),
    look('GRANDFATHER CLOCK', 22, 2, 'IT STRIKES WITH ST BRENDAN\'S BELLS, NEVER A MOMENT BEFORE OR AFTER. THE ASHCOMBES WOUND IT EVERY SUNDAY FOR TWO HUNDRED YEARS.'),
    look('FLOWERS', 15, 8, 'LILIES AND OLD ROSES FROM THE PALACE GARDENS, FRESH EVERY MORNING. NOBODY KNOWS WHO PAYS FOR THEM. NOBODY HAS EVER ASKED.'),
    look('STATUE', 1, 12, 'A MARBLE GODDESS PUTTING UP HER HAIR. THE THIRD ADMIRAL BROUGHT HER BACK FROM THE ROSE ISLES AND NEVER SAID HOW HE PAID FOR HER.'),
    look('STATUE', 24, 12, 'MIRA LUMAR\'S NAVIGATOR, IN MARBLE, HIS HAND ON THE WORLD. THE ASHCOMBES CLAIMED HIM AS AN ANCESTOR. THE REGISTRAR HAS DOUBTS.'),
    look('BUST', 24, 6, 'THE FIRST ASHCOMBE, IN A WIG LIKE A SHEEP. HIS NOSE HAS BEEN RUBBED SHINY BY TWO HUNDRED YEARS OF CHILDREN FOR LUCK.'),
    look('PORTRAIT', 13, 2, 'A LADY ASHCOMBE IN BLUE SILK, WHO RAN THE HOUSE, THE SHIPPING LINE AND, THEY SAY, THE ADMIRAL.'),
    look('PORTRAIT', 18, 2, 'A CAPTAIN ASHCOMBE, YOUNG, A SHIP BEHIND HIM ON A GREEN SEA. HE NEVER CAME HOME FROM THE CRIMSON.'),
    look('COAT STAND', 9, 13, 'THE ADMIRAL\'S OLD COAT AND HAT, STILL ON THE STAND BY THE DOOR. NOBODY HAS HAD THE HEART TO MOVE THEM.'),
    look('WING CHAIR', 13, 4, 'A WING CHAIR DRAWN UP TO THE FIRE.', prompt='PRESS E TO SIT', action='sit', seat=[13.6, 4.45], facing='right'),
    look('WING CHAIR', 17, 4, 'A WING CHAIR DRAWN UP TO THE FIRE.', prompt='PRESS E TO SIT', action='sit', seat=[17.6, 4.45], facing='left'),
]
write_world(WID, 'Ashcombe House', COLS, ROWS, [12, 13], I, k, FLOOR, FRONT_DOOR + WEST + EAST, WINDOWS)
print('manor hall done')
