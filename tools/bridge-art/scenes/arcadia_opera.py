"""The Lyra — the Spires' opera house, its grand foyer (world id "arcadia-opera").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_opera.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-opera

Up the steps behind the colonnade on the crown plaza: a foyer of white and black marble under a gilt coffered gallery,
red velvet and gold. The grand stair climbs the middle to the gallery and the doors to the boxes (from a box you watch
the stage: js/spires.js's `opera` view, an act every few minutes by the clock); under the gallery either side the doors
to the stalls, a performance on behind them. The box office in its gilt cage to the west with Madame Fleur at the
grille; to the east the foyer bar's counter, the playbills, and Seraphine Lune, tonight's soprano, signing programmes.
The great chandelier, torchères, statues on their plinths, palms, a red runner from the door to the stair.
"""
import math
import sys

from _spires_room import SP, E, CA, PH, S, Kit, shade, render, look, out_door, write_world  # noqa: F401

OUT = sys.argv[1]
WID = 'arcadia-opera'
COLS, ROWS = 28, 16
H, RB, RF = 4.6, 2.6, 15.0
FLOOR = (1, 3, 26, 14)
DOORS = [(12, 15), (13, 15)]
RED, CREAM = '#7a1428', '#efe6d2'
ZG = 2.5                                                          # the gallery

k = Kit(COLS, ROWS, margin_top=2.8, margin_bottom=0.5, seed=4855)

SP.paving(k, 1.0, RB, 27.0, RF, size=1.0, strip=3, tones=('#ece4d4', '#e6dccb', '#f0e9da', '#e2d8c6'), part='floor', grout='#a89a84')
SP.star_inlay(k, 6.5, 11.8, 1.3)
SP.star_inlay(k, 19.5, 11.8, 1.3)
E.panelled_wall(k, 0.4, 27.6, RB, H, paper=RED, wood=CREAM, doors=[(4.0, 5.8, 2.15), (21.2, 23.0, 2.15)])
SP.stone_room(k, 1.0, 27.0, RB, RF, H, door=(11.5, 13.5), wall=CREAM)
E.runner_carpet(k, 11.7, 9.0, 13.3, RF, col=E.VELVET_R)

# ---- the gallery, the grand stair up to it, the doors to the boxes --------------------------------------------------------------------
E.gallery(k, 1.0, 27.0, RB, 1.0, ZG, gap=(10.9, 14.1))
E.grand_stair(k, 10.9, 14.1, RB + 1.0, 9.0, ZG, n=12, runner=E.VELVET_R, open_side='right')
for (xa, xb) in ((8.0, 9.6), (16.4, 18.0)):                         # up on the gallery: the doors to the boxes
    k.box(xa, RB - 0.05, ZG, xb, RB + 0.02, ZG + 1.5, '#1a0a0a', 'box_door', emit=('#ff9a60', 0.25))
    k.box(xa - 0.1, RB, ZG + 1.5, xb + 0.1, RB + 0.08, ZG + 1.62, (SP.GOLD, 0.2), 'box_door_head')
S.letters(k, 'THE BOXES', 'PoiretOne', 13.0, RB + 0.08, ZG + 1.55, size=0.24, col=SP.GOLD_L, energy=6)
S.letters(k, 'THE LYRA', 'CinzelDecorative-Bold', 13.0, RB + 0.08, ZG + 1.95, size=0.32, col=SP.GOLD_L, energy=7)
for (xa, xb) in ((4.0, 5.8), (21.2, 23.0)):                         # under the gallery: the doors to the stalls, light round them
    E.doorway(k, xa, xb, RB, top=2.15, wood=CREAM, glow='#ffb060', pediment=False, double=RED)
    S.letters(k, 'STALLS', 'PoiretOne', (xa + xb) / 2, RB + 0.08, 2.22, size=0.16, col=SP.GOLD_L, energy=5)
for x in (2.4, 7.2, 18.8, 24.6):
    E.sconce(k, x, RB, z=1.9, energy=5)
for (x, kind) in ((7.0, 0), (19.0, 2)):                              # playbills on the walls
    SP.poster(k, x, RB + 0.02, 0.5, w=0.8, h=1.1, kind=kind)

# ---- the box office (west), the foyer bar (east) --------------------------------------------------------------------------------------
k.box(1.6, 6.0, 0.0, 4.6, 7.0, 1.0, (RED, 0.08), 'box_office', bevel=0.02)
k.box(1.5, 5.9, 1.0, 4.7, 7.1, 1.08, (SP.GOLD, 0.2), 'box_office_top')
for i in range(13):                                                 # the gilt grille over the counter
    x = 1.7 + i * 0.24
    k.box(x - 0.012, 6.95, 1.08, x + 0.012, 6.99, 2.1, SP.GOLD, 'grille')
k.box(1.6, 6.95, 2.1, 4.6, 7.0, 2.2, (SP.GOLD, 0.2), 'grille_head')
S.letters(k, 'BOX OFFICE', 'PoiretOne', 3.1, 7.0, 2.25, size=0.18, col=SP.GOLD_L, energy=6)
k.box(2.2, 6.3, 1.08, 3.0, 6.7, 1.12, '#f0e8d0', 'tickets')
k.solid(1.6, 5.4, 4.6, 7.0)
k.box(21.6, 6.0, 0.0, 26.2, 6.9, 1.0, (RED, 0.08), 'foyer_bar', bevel=0.02)
k.box(21.6, 6.9, 0.1, 26.2, 6.92, 0.9, ('#3a0a14', 0.08), 'foyer_bar_panel')
k.box(21.5, 5.9, 1.0, 26.3, 7.0, 1.06, (SP.GOLD, 0.2), 'foyer_bar_top')
for i in range(6):
    x = 22.0 + i * 0.7
    k.cyl(x, 6.4, 1.06, 1.3, 0.035, ('#f0e8d0', 0.03), 'flute', verts=6)
    k.cyl(x, 6.4, 1.2, 1.28, 0.06, ('#f8e8b0', 0.05), 'flute_bowl', verts=8)
CA.champagne_tower(k, 25.6, 4.2, 0.0, levels=4)
k.solid(24.9, 3.5, 26.3, 4.9)
k.solid(21.6, 6.0, 26.2, 6.9)

# ---- columns holding up the gallery, round banquettes, the floor ----------------------------------------------------------------------
for x in (1.8, 5.2, 8.6, 17.4, 20.8, 24.2):
    SP.fluted_column(k, x, RB + 1.05, ZG - 0.2, col=CREAM)
for cx in (6.5, 19.5):                                               # a round red banquette on each star
    CA.rim(k, CA.ellipse(cx, 11.8, 0.95, 0.75, n=24), CA.ellipse(cx, 11.8, 0.45, 0.35, n=24), 0.0, 0.42, (RED, 0.08), 'banquette')
    CA.rim(k, CA.ellipse(cx, 11.8, 0.95, 0.75, n=24), CA.ellipse(cx, 11.8, 0.45, 0.35, n=24), 0.42, 0.46, ('#9a2438', 0.08), 'banquette_top')
    k.cyl(cx, 11.8, 0.0, 1.1, 0.42, ('#f2eee8', 0.04), 'banquette_back', verts=20)
    E.vase_of_flowers(k, cx, 11.8, 1.1, s=1.2, col='#f2eee8', band=SP.GOLD, kind='rose', mix=['white'])
    k.solid(cx - 0.95, 11.05, cx + 0.95, 12.55)

# ---- the floor: the chandelier, torchères, statues, palms, a bench -----------------------------------------------------------------------
E.chandelier(k, 13.0, 11.6, 3.2, rad=0.95, arms=12, chain_top=H + 0.5, energy=160)
for (x, r) in ((9.4, 10.0), (16.6, 10.0)):
    E.torchere(k, x, r, h=1.8, energy=10)
for (x, r, pose) in ((2.2, 12.6, 'venus'), (25.8, 12.6, 'navigator')):
    E.plinth(k, x, r, h=0.7, w=0.6, trim=SP.GOLD)
    E.statue(k, x, r, 0.7, pose=pose, s=1.15)
for (x, r) in ((6.0, 13.8), (20.0, 13.8), (8.6, 3.4), (17.4, 3.4)):
    E.potted_palm(k, x, r, h=1.5, pot=SP.GOLD_D, leaf='#2e5a3a', fronds=9)
E.sofa(k, 6.4, 9.8, length=2.2, facing='down', col=RED, kind='settee')
E.sofa(k, 19.6, 9.8, length=2.2, facing='down', col=RED, kind='settee')
for (x, r) in ((4.0, 11.0), (22.0, 11.0), (13.0, 6.0)):
    k.point_light(x, r, 2.8, '#ffd8a8', 20, radius=0.6, group='flicker')
render(k, OUT, ambient=('#30242a', 0.35))

I = [out_door(x, y, [72, 11], 'THE CROWN PLAZA') for (x, y) in DOORS]
I += [
    look('MADAME FLEUR', 3, 7, 'MADAME FLEUR PEERS AT YOU THROUGH THE GILT GRILLE AND THEN AT HER SEATING PLAN.', prompt='PRESS E TO TALK'),
    look('TOBIAS', 11, 10, 'THE USHER STANDS AT THE FOOT OF THE STAIR IN A RED COAT WITH A GOLD WAISTCOAT, HANDS BEHIND HIS BACK.', prompt='PRESS E TO TALK'),
    look('SERAPHINE', 18, 8, 'TONIGHT\'S SOPRANO, IN LILAC SEQUINS AND A STOLE, SIGNING PROGRAMMES WITH A GOLD PEN.', prompt='PRESS E TO TALK'),
    look('THE BOXES', 12, 9, 'UP THE STAIR AND THROUGH THE GALLERY DOOR INTO A BOX OF RED PLUSH. THE LIGHTS GO DOWN. THE CURTAIN.',
         prompt='PRESS E TO WATCH FROM A BOX', action='view', view='opera'),
    look('THE STALLS', 5, 3, 'THROUGH THE DOORS, MUFFLED, A SOPRANO CLIMBING A NOTE YOU FEEL IN YOUR TEETH. AN USHER PUTS A FINGER TO HIS LIPS. THE STALLS ARE FULL; THE BOXES ARE UP THE STAIR.'),
    look('THE STALLS', 22, 3, 'BEHIND THE DOORS THE ORCHESTRA SWELLS AND THREE THOUSAND PEOPLE HOLD THEIR BREATH AT ONCE.'),
    {'x': 23, 'y': 7, 'type': 'vendor', 'label': 'THE FOYER BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'champagne', 'price': 18}, {'id': 'starlight', 'price': 22}, {'id': 'petit_fours', 'price': 14}]},
    look('PLAYBILL', 7, 3, 'TONIGHT: "STARFALL", AN OPERA IN THREE ACTS. SERAPHINE LUNE AS THE LAST STAR. THE PROGRAMME SAYS IT ENDS HAPPILY. THE PROGRAMME IS LYING.'),
    look('PLAYBILL', 19, 3, 'NEXT SEASON: "THE DROWNED BELL", A NEW WORK, BASED ON A TRUE STORY FROM A WORLD OF SEAS. NOBODY UP HERE HAS EVER SEEN A SEA.'),
    look('SETTEE', 6, 9, 'A RED SETTEE BY THE WALL.', prompt='PRESS E TO SIT', action='sit', seat=[6.4, 9.9], facing='down'),
    look('SETTEE', 20, 9, 'A RED SETTEE BY THE WALL.', prompt='PRESS E TO SIT', action='sit', seat=[19.6, 9.9], facing='down'),
]
actors = [{'sheet': 'npc-boxoffice', 'x': 3, 'y': 6, 'facing': 'down', 'pose': 'sit'},
          {'sheet': 'npc-usher', 'x': 11, 'y': 9, 'facing': 'down'},
          {'sheet': 'npc-diva', 'x': 18, 'y': 7, 'facing': 'down'},
          {'sheet': 'npc-waiter', 'x': 23, 'y': 5, 'facing': 'down'}]
write_world(WID, 'The Lyra', COLS, ROWS, [12, 14], I, k, FLOOR, DOORS, [], actors=actors)
print('lyra done')
