"""The Orrery — the Spires' private members' club (world id "arcadia-members").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_members.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-members

Behind the bronze door at the foot of Halcyon's tower (js/spires.js: members, by introduction or for a consideration).
Midnight-blue silk over walnut panelling, gold; the room's namesake in the middle of the floor — a great brass orrery
on a marble drum, the seven worlds the Wayfarer knows on their arms round a sun of warm glass; bookcases to the cornice
with the library ladder on its rail, the fire in a white marble chimneypiece with wing chairs and a chesterfield drawn
up, glass across the east end onto the stars and the smog sea, a card table under a green lamp, the bar cart, a globe,
the secretary's lectern and the members' book by the door, and a member or two who has been here since before you were
born.
"""
import math
import sys

from _spires_room import SP, E, CA, PH, S, Kit, shade, render, look, out_door, write_world  # noqa: F401

OUT = sys.argv[1]
WID = 'arcadia-members'
COLS, ROWS = 22, 14
H, RB, RF = 4.0, 2.6, 13.0
FLOOR = (1, 3, 20, 12)
DOORS = [(11, 13), (12, 13)]
SILK, WALNUT = '#1e2a4a', '#4a2e1c'
OX, OR = 10.5, 7.6                                                  # the orrery

k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=4842)

E.parquet_chevron(k, 1.0, RB, 21.0, RF)
E.panelled_wall(k, 0.4, 14.4, RB, H, paper=SILK, wood=WALNUT, skip=[(8.4, 11.6)])
SKY = SP.window_wall(k, 14.4, 21.6, RB, 0.6, 3.3, H, step=1.8, wall=WALNUT, neon=SP.PEACH)
SP.stone_room(k, 1.0, 21.0, RB, RF, H, door=(10.5, 12.5), wall=WALNUT)
E.persian_rug(k, 6.4, 5.2, 14.6, 10.2, field='#1e2a4a', border='#5a1a24', accent=SP.GOLD, ivory='#e8dcc0')

# ---- the fire, the chairs drawn up to it ------------------------------------------------------------------------------------------
shelf, F = E.grand_fireplace(k, 10.0, RB, H, w=2.6, open_w=1.2, breast=SILK, energy=150)
k.solid(8.7, RB, 11.3, F + 0.62)
E.mirror(k, 9.35, 10.65, F, shelf + 0.12, shelf + 0.95, arched=False)
E.clock_on_mantel(k, 10.0, F + 0.2, shelf)
E.wingback(k, 7.7, 4.4, facing='right', col='#5a1a24')
E.wingback(k, 12.3, 4.4, facing='left', col='#5a1a24')

# ---- the library ---------------------------------------------------------------------------------------------------------------
E.bookcase_wall(k, 1.0, 8.2, RB, top=3.4)
E.library_ladder(k, 4.3, RB, 3.1, RB + 1.0)
E.globe_stand(k, 2.2, 5.4)
E.wingback(k, 3.6, 6.6, facing='down', col='#2a4a3a')
z = E.side_table_round(k, 4.6, 6.8, h=0.62, rad=0.22, wood=E.MAHOG)
E.reading_lamp(k, 4.6, 6.8, z)
E.stack_of_books(k, 4.55, 6.85, z + 0.02, n=3)

# ---- the great orrery -----------------------------------------------------------------------------------------------------------
k.cyl(OX, OR, 0.0, 0.62, 0.62, ('#ece6da', 0.05), 'orrery_drum', verts=24)
k.cyl(OX, OR, 0.62, 0.68, 0.7, (SP.GOLD, 0.2), 'orrery_rim', verts=24)
k.cyl(OX, OR, 0.68, 1.3, 0.05, (SP.GOLD, 0.2), 'orrery_stem', verts=8)
k.sphere(OX, OR, 1.45, 0.24, 0.24, shade('#ffc870', 0.6), 'orrery_sun', emit=('#ffd890', 1.0), segs=14)
k.point_light(OX, OR, 1.5, '#ffd8a0', 12, radius=0.2, group='flicker')
PLANETS = (('#8ac8f0', 0.35), ('#f0c8a0', 0.48), ('#6ad0a0', 0.62), ('#d8e8ff', 0.76), ('#c8a0f0', 0.9), ('#f0a8c8', 1.04), ('#e0e4f0', 1.18))
for i, (col, rad) in enumerate(PLANETS):
    a = i * 2.3 + 0.6
    rad *= 1.3
    tilt = 0.12 * ((i % 3) - 1)
    pts = [(OX + math.cos(t / 24 * math.tau) * rad, OR + math.sin(t / 24 * math.tau) * rad * 0.9, 1.45 + math.sin(t / 24 * math.tau) * rad * tilt)
           for t in range(25)]
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.014, (SP.GOLD, 0.2), 'orrery_ring', verts=4)
    px, pr = OX + math.cos(a) * rad, OR + math.sin(a) * rad * 0.9
    k.tube((OX, OR, 1.32), (px, pr, 1.36 + math.sin(a) * rad * tilt), 0.012, (SP.GOLD, 0.2), 'orrery_arm', verts=4)
    k.sphere(px, pr, 1.45 + math.sin(a) * rad * tilt, 0.06 + i * 0.006, 0.06 + i * 0.006, (col, 0.1), 'orrery_planet', segs=8)
k.solid(OX - 0.75, OR - 0.75, OX + 0.75, OR + 0.75)
k.point_light(OX, OR + 1.2, 2.4, '#ffd8a8', 14, radius=0.4, group='static')

# ---- the card table, the chesterfield, the bar cart, the lectern ------------------------------------------------------------------------
CX, CR = 16.4, 8.8
k.cyl(CX, CR, 0.0, 0.7, 0.06, (WALNUT, 0.1), 'table_stem', verts=8)
k.box(CX - 0.6, CR - 0.6, 0.7, CX + 0.6, CR + 0.6, 0.76, (WALNUT, 0.1), 'card_table', bevel=0.03)
k.box(CX - 0.5, CR - 0.5, 0.76, CX + 0.5, CR + 0.5, 0.77, '#1d5a3e', 'baize')
for (dx, dr) in ((-0.2, -0.1), (0.15, 0.2), (0.25, -0.25)):
    k.box(CX + dx - 0.06, CR + dr - 0.09, 0.77, CX + dx + 0.06, CR + dr + 0.09, 0.775, '#f4f0e8', 'card')
k.cone(CX, CR, 2.0, 2.3, 0.3, 0.06, ('#2a6a4a', 0.1), 'card_lamp', emit=('#4a8a6a', 0.3), verts=10)
k.tube((CX, CR, 2.3), (CX, CR, H), 0.01, SP.GOLD, 'lamp_chain', verts=3)
k.point_light(CX, CR, 1.8, '#ffe0b0', 10, radius=0.2, group='flicker')
k.solid(CX - 0.6, CR - 0.6, CX + 0.6, CR + 0.6)
for (dx, dr, f) in ((-1.0, 0, 'right'), (1.0, 0, 'left'), (0, -1.0, 'down')):
    E.dining_chair(k, CX + dx, CR + dr, facing=f, seat='#2a4a3a', wood=WALNUT)
E.sofa(k, 6.0, 11.2, length=2.4, facing='up', col='#4a2a1a', kind='chesterfield')
E.tea_table(k, 6.0, 10.0, w=1.2, d=0.6, wood=WALNUT, tea=False)
k.box(18.6, 5.0, 0.0, 19.6, 5.6, 0.8, (SP.GOLD_D, 0.2), 'bar_cart', bevel=0.02)
for i in range(5):
    k.cyl(18.75 + i * 0.2, 5.3, 0.8, 1.1 + (i % 2) * 0.08, 0.05, (('#6a3a1a', '#2a4a2a', '#c8a050')[i % 3], 0.08), 'decanter', verts=8)
k.solid(18.6, 5.0, 19.6, 5.6)
k.box(13.5, 11.4, 0.0, 14.1, 11.9, 1.1, (WALNUT, 0.1), 'lectern', bevel=0.02)
k.box(13.4, 11.3, 1.1, 14.2, 12.0, 1.16, (SP.GOLD, 0.2), 'lectern_top')
k.box(13.55, 11.45, 1.16, 14.05, 11.85, 1.2, '#5a1424', 'members_book')
k.solid(13.5, 11.4, 14.1, 11.9)
for (x, r) in ((1.8, 11.8), (20.2, 11.8)):
    E.potted_palm(k, x, r, h=1.5, pot=SP.GOLD_D, leaf='#2e5a3a', fronds=9)
for x in (12.6, 13.6):
    E.sconce(k, x, RB, z=2.4, energy=5)
E.chandelier(k, 6.2, 8.4, 3.0, rad=0.55, arms=8, chain_top=H, energy=60)
E.chandelier(k, 15.8, 6.4, 3.0, rad=0.55, arms=8, chain_top=H, energy=60)
k.area_light(18.0, RB + 1.0, 3.6, '#b8c0ff', 30, 6.0, rot=(math.radians(-50), 0, 0))
for (x, r) in ((4.0, 9.0), (16.0, 6.0), (10.0, 11.0)):
    k.point_light(x, r, 2.5, '#ffd8a8', 18, radius=0.6, group='flicker')
render(k, OUT, ambient=('#2a2830', 0.35))

I = [out_door(x, y, [59, 10], 'THE CROWN PLAZA') for (x, y) in DOORS]
I += [
    look('MR ASHDOWN', 14, 12, 'THE CLUB SECRETARY STANDS BY THE BOOK AS IF HE WERE PART OF THE LECTERN.', prompt='PRESS E TO TALK'),
    look('LADY PERPETUA', 15, 9, 'A GRAND OLD WOMAN AT THE CARD TABLE, DEALING HERSELF A HAND OF PATIENCE AND CHEATING AT IT.', prompt='PRESS E TO TALK'),
    look('SIR AUGUSTIN', 7, 10, 'A MAN IN A DINNER JACKET OLDER THAN THE TOWER, ASLEEP WITH ONE EYE OPEN.', prompt='PRESS E TO TALK'),
    look('THE ORRERY', 10, 9, 'THE CLUB\'S NAMESAKE: SEVEN WORLDS IN BRASS ROUND A SUN OF WARM GLASS, THE SAME SEVEN YOUR SHIP KNOWS - LUMAR\'S SEA-BLUE, '
         'ARCADIA\'S NIGHT, A RINGED GIANT, THE GREEN ONE, THE ICE, THE FOREST, AND ONE SMALL DARK BALL WITH NO NAME ON ITS ARM. A CARD SAYS: DO NOT WIND.'),
    look('THE MEMBERS\' BOOK', 13, 12, 'NAMES IN INK GOING BACK THREE HUNDRED YEARS - ADMIRALS, A DUCHESS, SEVERAL HALCYONS, A NAME SCRATCHED OUT SO HARD THE PAGE TORE. YOURS IS THE NEWEST.'),
    look('THE GLASS', 17, 3, 'THE STARS, AND BELOW THEM THE SMOG LIKE A SEA. FROM HERE YOU CAN SEE THE LOOP\'S LIGHTS GOING ROUND, THIN AS A BRACELET.',
         action='view', view='spires'),
    {'x': 18, 'y': 6, 'type': 'vendor', 'label': 'THE BAR CART', 'prompt': 'PRESS E TO POUR',
     'items': [{'id': 'royale_martini', 'price': 14}, {'id': 'champagne', 'price': 16}, {'id': 'starlight', 'price': 18}]},
    look('WING CHAIR', 7, 4, 'A WING CHAIR BY THE FIRE.', prompt='PRESS E TO SIT', action='sit', seat=[7.75, 4.5], facing='right'),
    look('WING CHAIR', 12, 4, 'A WING CHAIR BY THE FIRE.', prompt='PRESS E TO SIT', action='sit', seat=[12.25, 4.5], facing='left'),
    look('THE BOOKS', 5, 3, 'CLUB HISTORIES, ATLASES OF WORLDS NOBODY HERE HAS VISITED, AND A WHOLE SHELF ON THE MANAGEMENT OF SERVANTS. ONE SPINE SAYS "THE UNDERCITY: A FIELD GUIDE". IT HAS NEVER BEEN OPENED.'),
]
actors = [{'sheet': 'npc-club-secretary', 'x': 14, 'y': 12, 'facing': 'left'},
          {'sheet': 'npc-member-a', 'x': 15, 'y': 8, 'facing': 'right', 'pose': 'sit'},
          {'sheet': 'npc-member-b', 'x': 6, 'y': 11, 'facing': 'up', 'pose': 'sit'}]
write_world(WID, 'The Orrery', COLS, ROWS, [11, 12], I, k, FLOOR, DOORS, [SKY], actors=actors)
print('orrery done')
