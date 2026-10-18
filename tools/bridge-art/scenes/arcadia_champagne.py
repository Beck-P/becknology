"""Aurelle — the Spires' champagne bar and sky lounge (world id "arcadia-champagne").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_champagne.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-champagne

Through the round-windowed door off the crown plaza: a long white room with glass from sill to lintel across the back
onto the only real stars in Arcadia (js/spires.js draws them, and the smog sea far below, behind the HOLDOUT pane).
A racetrack bar of white onyx lit from inside, a tower of bottles in their foils and a pyramid of coupes on top, Coco
pouring, pink velvet stools; a white grand piano in the corner with the pianist at it; velvet banquettes round low
tables to the west; the sky lounge to the east — tub chairs and a curved sofa turned to the glass, a fire table between;
Bastien the sommelier with his trolley; flowers, a chandelier, pastel neon. AURELLE in script over the glass.
"""
import math
import sys

from _spires_room import SP, E, CA, PH, S, Kit, render, look, out_door, write_world  # noqa: F401

OUT = sys.argv[1]
WID = 'arcadia-champagne'
COLS, ROWS = 24, 14
H, RB, RF = 4.2, 2.6, 13.0
FLOOR = (1, 3, 22, 12)
DOORS = [(4, 13), (5, 13)]

k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=4819)

E.marble_cabochon(k, 1.0, RB, 23.0, RF, size=1.0, black='#c8a868', border=0.36)
SKY = SP.window_wall(k, 0.4, 23.6, RB, 0.55, 3.45, H, step=1.95, neon=SP.PINK)
SP.stone_room(k, 1.0, 23.0, RB, RF, H, door=(3.5, 5.5))
S.neon(k, 'Aurelle', 'Pacifico', 12.0, RB - 0.3, 3.62, size=0.55, col=SP.PEACH)
for (xa, xb) in ((3.5, 5.5),):
    k.box(xa, RF, -0.004, xb, RF + 0.6, 0.004, (SP.GOLD, 0.2), 'threshold')

# ---- the bar ------------------------------------------------------------------------------------------------------------------
SP.champagne_bar(k, 12.0, 6.1, w=5.2, d=2.4, stools=[(10.0, 8.0), (11.3, 8.0), (12.7, 8.0), (14.0, 8.0)])
k.box(9.6, 2.7, 0.0, 14.4, 3.15, 0.95, ('#f2eee8', 0.04), 'back_counter')            # the back counter under the glass
for i in range(9):
    k.cyl(9.9 + i * 0.52, 2.92, 0.95, 1.2 + (i % 3) * 0.05, 0.05, ('#1a3a2a', 0.08), 'bottle', verts=6)
    k.cyl(9.9 + i * 0.52, 2.92, 1.18 + (i % 3) * 0.05, 1.3 + (i % 3) * 0.05, 0.035, (SP.GOLD_L, 0.2), 'bottle_foil', verts=6)
k.solid(9.6, 2.7, 14.4, 3.2)

# ---- the piano and the banquettes (west) -------------------------------------------------------------------------------------------
CA.grand_piano(k, 3.4, 4.6, col='#f2eee8', facing='right')
for (cx, cr) in ((3.6, 8.6), (7.4, 8.6)):
    E.sofa(k, cx, cr - 0.9, length=2.0, facing='down', col='#c86a9a', legs=SP.GOLD, kind='settee')
    CA.cocktail_table(k, cx, cr + 0.1, glow=SP.LILAC)
    for s in (-1, 1):
        CA.club_chair(k, cx + s * 1.1, cr + 1.0, facing='up', col='#8a7ab8')
E.vase_of_flowers(k, 6.2, 3.6, 0.0, s=1.3, col='#f2eee8', band=SP.GOLD, kind='white', mix=['pink'])
k.solid(5.9, 3.3, 6.5, 3.9)

# ---- the sky lounge (east): chairs turned to the glass, a fire table --------------------------------------------------------------
PH.sectional(k, 17.0, 21.6, 5.4, 6.4, col='#e8e2f0', arms=('left', 'right'), cushions=(SP.PINK, SP.BLUE, SP.LILAC))
k.box(18.2, 3.9, 0.0, 20.4, 4.7, 0.36, ('#e2dccf', 0.05), 'fire_table', bevel=0.03)
k.box(18.5, 4.1, 0.36, 20.1, 4.5, 0.38, '#1a1418', 'fire_bed', emit=('#ff9a50', 0.9))
for i in range(7):
    k.cone(18.6 + i * 0.22, 4.3, 0.38, 0.5 + (i % 2) * 0.08, 0.06, 0.0, '#ffb060', 'flame', emit=('#ffc070', 1.0), verts=5)
k.point_light(19.3, 4.4, 0.8, '#ffb070', 18, radius=0.4, group='flicker')
k.solid(18.2, 3.9, 20.4, 4.7)
for (x, r, f) in ((16.4, 9.4, 'right'), (21.6, 9.4, 'left'), (19.0, 10.6, 'up')):
    CA.club_chair(k, x, r, facing=f, col='#c8b0f8')
CA.cocktail_table(k, 19.0, 9.4, glow=SP.PINK)
# Bastien's trolley: a silver bucket on ice, three bottles, a cloth
k.box(15.3, 9.6, 0.0, 16.1, 10.2, 0.85, (SP.GOLD_D, 0.2), 'trolley', bevel=0.02)
k.cyl(15.7, 9.9, 0.85, 1.12, 0.17, ('#d8dce8', 0.03), 'ice_bucket', verts=12)
for dx in (-0.06, 0.06):
    k.cyl(15.7 + dx, 9.9, 1.0, 1.32, 0.04, ('#1a3a2a', 0.08), 'bottle', verts=6)
k.solid(15.3, 9.6, 16.1, 10.2)

# ---- the rugs, the little tables by the door, flowers everywhere -----------------------------------------------------------------
E.persian_rug(k, 1.6, 7.3, 9.4, 11.2, field='#d8c8e8', border='#8a6aa8', accent=SP.GOLD, ivory='#f4eef4')
E.persian_rug(k, 15.6, 8.4, 22.4, 11.6, field='#f0d8e0', border='#a86a8a', accent=SP.GOLD, ivory='#f8f2f4')
for (cx, cr) in ((10.0, 11.4), (14.0, 11.4)):
    SP.cafe_table(k, cx, cr, cloth='#f4eef4', china=False)
    k.cyl(cx + 0.12, cr - 0.08, 0.73, 0.98, 0.03, ('#f0e8d0', 0.03), 'flute', verts=6)
    k.cyl(cx - 0.12, cr + 0.06, 0.73, 0.98, 0.03, ('#f0e8d0', 0.03), 'flute', verts=6)
for (x, r) in ((1.8, 3.6), (22.2, 3.6)):
    E.plinth(k, x, r, h=0.9, w=0.5, stone='#f2eee8', trim=SP.GOLD)
    E.vase_of_flowers(k, x, r, 0.9, s=1.0, col='#f2eee8', band=SP.GOLD, kind='white', mix=['pink'])
for x in (8.0, 16.0):                                                 # champagne on ice by the bar's ends
    k.cyl(x, 6.0, 0.0, 0.7, 0.03, (SP.GOLD, 0.2), 'bucket_stand', verts=6)
    k.cyl(x, 6.0, 0.7, 0.95, 0.15, ('#d8dce8', 0.03), 'ice_bucket', verts=12)
    k.cyl(x + 0.04, 6.0, 0.9, 1.22, 0.045, ('#1a3a2a', 0.08), 'bottle', verts=6)
    k.cyl(x + 0.04, 6.0, 1.15, 1.25, 0.035, (SP.GOLD_L, 0.2), 'bottle_foil', verts=6)
    k.solid_post(x, 6.0)

# ---- the room's light: the chandelier, sconces, the bar glowing, the stars through the glass -------------------------------------------
E.chandelier(k, 12.0, 9.8, 2.9, rad=0.62, arms=8, chain_top=H, energy=90)
for (x, r) in ((2.0, 11.6), (22.0, 11.6)):
    E.potted_palm(k, x, r, h=1.5, pot='#f2eee8', leaf='#3a6a4a', fronds=9)
k.area_light(12.0, RB + 1.0, 3.8, '#b8c0ff', 28, 10.0, rot=(math.radians(-50), 0, 0))       # starlight through the glass
for (x, r) in ((4.5, 8.0), (19.0, 8.0), (12.0, 11.0), (8.5, 11.2), (16.0, 11.2)):
    k.point_light(x, r, 2.6, '#ffd8b8', 22, radius=0.6, group='flicker')
render(k, OUT, ambient=('#3a3040', 0.38))

# ---- the world ----------------------------------------------------------------------------------------------------------------
I = [out_door(x, y, [89, 10], 'THE CROWN PLAZA') for (x, y) in DOORS]
I += [
    {'x': 11, 'y': 9, 'type': 'vendor', 'label': 'THE BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'starlight', 'price': 24}, {'id': 'champagne', 'price': 20}, {'id': 'sky_oysters', 'price': 28}, {'id': 'petit_fours', 'price': 16}]},
    look('COCO', 13, 9, 'COCO POLISHES A COUPE AND HOLDS IT UP TO THE STARS.', prompt='PRESS E TO TALK'),
    look('BASTIEN', 16, 11, 'THE SOMMELIER TURNS A BOTTLE SO THE LABEL FACES YOU.', prompt='PRESS E TO TALK'),
    look('THE GLASS', 6, 3, 'NOTHING BUT STARS ABOVE, AND BELOW THE SMOG LIT PINK AND CYAN FROM UNDERNEATH, THE TOWER TOPS STANDING OUT OF IT LIKE ROCKS IN A SEA.',
         action='view', view='spires'),
    look('THE GLASS', 17, 3, 'THE OTHER SPIRES, WHITE AND GOLD, EACH WITH ITS OWN BAR AND ITS OWN PEOPLE LOOKING BACK AT THIS ONE.',
         action='view', view='spires'),
    look('THE PIANO', 4, 6, 'A WHITE GRAND, THE PIANIST PLAYING SOMETHING SLOW WITHOUT LOOKING AT THE KEYS. A BRANDY GLASS OF TIPS ON THE LID.'),
    look('THE FIRE TABLE', 19, 5, 'A LOW TABLE OF WHITE STONE WITH A BED OF FLAME DOWN THE MIDDLE. UP HERE THE NIGHTS ARE COLD AND THE PEOPLE ARE COLDER.'),
    look('STOOL', 10, 8, 'A PINK VELVET STOOL AT THE BAR.', prompt='PRESS E TO SIT', action='sit', seat=[10.0, 8.0], facing='up'),
    look('STOOL', 14, 8, 'A PINK VELVET STOOL AT THE BAR.', prompt='PRESS E TO SIT', action='sit', seat=[14.0, 8.0], facing='up'),
    look('SOFA', 18, 5, 'THE CURVED SOFA, TURNED TO THE GLASS.', prompt='PRESS E TO SIT AND LOOK', action='sit', seat=[18.2, 5.9], facing='up',
         view='spires'),
    look('SOFA', 21, 5, 'THE CURVED SOFA, TURNED TO THE GLASS.', prompt='PRESS E TO SIT AND LOOK', action='sit', seat=[20.6, 5.9], facing='up',
         view='spires'),
]
actors = [{'sheet': 'npc-aurelle-bartender', 'x': 12, 'y': 6, 'facing': 'down'},
          {'sheet': 'npc-sommelier', 'x': 16, 'y': 10, 'facing': 'left'},
          {'sheet': 'npc-pianist', 'x': 4, 'y': 5, 'facing': 'right', 'pose': 'sit'},
          {'sheet': 'npc-member-a', 'x': 19, 'y': 10, 'facing': 'up', 'pose': 'sit'},
          {'sheet': 'npc-member-b', 'x': 6, 'y': 9, 'facing': 'up', 'pose': 'sit'}]
write_world(WID, 'Aurelle', COLS, ROWS, [4, 12], I, k, FLOOR, DOORS, [SKY], actors=actors)
print('aurelle done')
