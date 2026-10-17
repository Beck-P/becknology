"""The Penthouse — the top of Skyport 7's tower, yours for 250,000 (world id "arcadia-penthouse"; js/home.js,
js/legacy.js, js/estate.js).
Usage: BVENV/bin/python arcadia_penthouse.py RENDER_DIR

Beck: "the penthouse has like an outdoor deck area… that's where the pool is too instead of inside… a cool deck, a
little pool there, cool views of the city… more space." The whole top of the tower, one floor: inside on the left,
the roof deck on the right through a wall of sliding glass, the city all round it (a backdrop world: js/skyline.js
draws the towers, the traffic and the holo-ads behind everything, through the glass and past the balustrade; rain
falls on the deck and not indoors, `skyline.rain.dry`).

Inside, under a black marble floor veined with gold: glass to the ceiling along the back; the bed on its plinth with
its head to the city and a stone egg of a bath beside it; a bathroom glimpsed behind its vanity wall (twin basins,
round mirrors lit from behind, a rain shower); the lounge — a velvet sectional facing the glass round a marble table;
a white grand piano; the bar against the core, a back bar of lit bottles under HALCYON in pink neon, its stools in a
row; the kitchen beside it (black units, an oven clock glowing, a waterfall island under glass pendants); a marble
dining table with velvet tub chairs; the lift in the front wall. Outside, on teak: the plunge pool glowing cyan with
its infinity edge toward the towers, three loungers with towels and drinks, a drinks counter, a fire pit in a ring
of cushions, planters of grasses, clipped box and an olive tree, festoon lights strung corner to corner over it all,
the glass balustrade (the front panes drawn as glass over the drop by js/estate.js, `penthouse.glass`).
Open floor everywhere between, for the furniture you buy (tools/bridge-art/furniture_sprites.py).
"""
import json
import math
import os
import sys

from _cyber_room import Y, P, ROOT, Kit, THETA, apply_world  # noqa: F401
import assets_casino as CA                                  # noqa: E402
import assets_estate as E                                   # noqa: E402
import assets_penthouse as PH                               # noqa: E402
from scenekit import shade                                  # noqa: E402
from _manor import preview                                  # noqa: E402

OUT = sys.argv[1]
WID = 'arcadia-penthouse'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 36, 19
C = math.cos(THETA)
H = 3.4
RF = 2.0                                    # the back of the floor: glass, the core, the deck's balustrade
FRONT = 16.0                                # the front edge: the low front wall indoors, the balustrade outside
PX = 20.97                                  # the sliding glass between inside and the deck (it blocks the last column indoors)
DOOR_R = (8.0, 11.0)                        # where it's open
FLOOR = (1, 2, 34, 15)
DOORS = [(10, 16), (11, 16)]
WARM = PH.WARM

k = Kit(COLS, ROWS, margin_top=1.3, margin_bottom=1.6, margin_x=0.6, seed=2502)

# ---- the floor, the walls, the glass -------------------------------------------------------------------------------
PH.black_marble(k, 1.0, RF, PX, FRONT)
POOL_AT = (30.3, 3.25, 34.45, 7.75)
PH.decking(k, PX, RF, 35.0, FRONT, holes=[(POOL_AT[0] - 0.18, POOL_AT[1] - 0.18, POOL_AT[2] + 0.18, POOL_AT[3] + 0.18)])
k.box(0.4, FRONT, -0.32, 35.4, FRONT + 0.62, -0.002, ('#1e1a26', 0.05), 'roof_edge')
PH.tower_face(k, 0.4, 35.4, FRONT + 0.62, depth=6.5)
P.ship_side_wall(k, 0.4, 1.0, RF - 0.4, FRONT, H, pal=Y.WALL)
GLASS = PH.glass_wall(k, 1.0, 13.6, RF, H, mullions=(3.6, 6.2, 8.8, 11.2))
# the core: the lift shaft and the services, walnut slats over black, a cove of light under the bulkhead
k.box(13.6, RF - 0.5, 0, PX, RF, H, (PH.BLACK_L, 0.04), 'core')
slats = []
x = 13.65
while x < PX - 0.05:
    slats.append((x, RF, 2.5, x + 0.07, RF + 0.04, H - 0.3))
    x += 0.12
k.boxes(slats, (PH.TEAK_D, 0.06), 'core_slats')
k.box(13.6, RF - 0.3, H - 0.3, PX, RF + 0.3, H, (PH.BLACK_L, 0.05), 'bulkhead')
k.box(13.6, RF + 0.3, H - 0.32, PX, RF + 0.32, H - 0.28, shade(Y.PINK, 0.4), 'cove', emit=(Y.PINK, 0.8))
P.ship_front_wall(k, 0.4, PX, FRONT, door=(10.0, 12.0), pal=Y.WALL)
k.box(10.05, FRONT + 0.6, 0.62, 11.95, FRONT + 0.62, 0.78, '#0c1418', 'lift_sign', emit=(Y.CYAN, 0.6))
PH.sliding_doors(k, PX, RF, FRONT, H, open_r=DOOR_R)

# ---- the bedroom: the bed facing nothing but city, the bath beside it ------------------------------------------------
PH.geo_rug(k, 1.6, 3.4, 6.6, 7.0)
PH.platform_bed(k, 2.7, 5.3, 2.5, 5.4)
PH.egg_tub(k, 7.35, 3.45, rad=0.62)
E.potted_palm(k, 8.55, 6.9, h=1.7, pot='#1a1820', leaf='#3a6a3a', fronds=10)
k.box(5.8, 6.2, 0.0, 6.5, 6.7, 0.04, '#e8e0f0', 'slippers')
k.box(6.55, 6.2, 0.0, 7.0, 6.7, 0.04, '#e8e0f0', 'slippers')

# ---- the bathroom, glimpsed: the vanity on its wall, a rain shower, slate underfoot ----------------------------------
BR0, BR1, BX1 = 7.4, 11.6, 4.7
k.box(1.0, BR0 - 0.3, 0, BX1, BR0, 1.65, ('#2a2830', 0.04), 'bath_wall')
k.box(1.0, BR0 - 0.32, 1.65, BX1, BR0 + 0.02, 1.7, (PH.GOLD, 0.03), 'bath_wall_cap')
tiles = [E.rect(x + 0.01, r + 0.01, x + 0.49, r + 0.49) for x in [1.0 + 0.5 * i for i in range(7)] for r in [BR0 + 0.5 * j for j in range(8)]
         if x < BX1 - 0.1 and r < BR1]
E.flats(k, tiles, 0.001, ('#3a3a44', 0.06), 'bath_floor')
PH.vanity(k, 1.25, 4.45, BR0, mz=1.22, mr=0.24)
PH.rain_shower(k, 1.05, 9.7, 2.6, BR1, H)
PH.sliding_doors(k, BX1, BR0, BR1, 2.4, open_r=(9.0, 10.0))
k.box(3.2, 10.9, 0.0, 4.3, 11.4, 0.02, ('#e8e0d8', 0.08), 'bath_mat')

# ---- the lounge, facing the glass ------------------------------------------------------------------------------------
PH.geo_rug(k, 8.9, 2.7, 13.9, 7.4, base='#241e30', accent='#5a8ac8')
PH.sectional(k, 9.3, 13.5, 3.0, 6.9, depth=0.85, arms=('left', 'right', 'front'))
PH.coffee_table(k, 10.5, 3.7, 12.3, 4.7)
PH.arc_lamp(k, 14.15, 6.5, 12.6, 5.0, h=2.1)
PH.sculpture(k, 8.3, 9.0)
CA.grand_piano(k, 7.2, 13.0, col='#ece8e2', facing='right')
k.solid(6.2, 12.5, 8.1, 13.5)

# ---- the bar and the kitchen against the core -----------------------------------------------------------------------
PH.back_bar(k, 13.75, 17.35, RF, H)
Y.neon_text(k, 'HALCYON', 15.55, RF + 0.04, 2.36, h=0.26, col=Y.PINK, energy=5)
PH.bar_counter(k, 14.06, 16.94, 3.45, 4.05, stools=(14.45, 15.15, 15.85, 16.55), stool_r=4.72)
PH.drinks(k, 14.2, 16.9, 3.75, 1.06, n=4)
PH.espresso_machine(k, 16.6, RF + 0.2, 0.95)
PH.kitchen_run(k, 17.5, 20.9, RF, H)
PH.kitchen_island(k, 18.0, 20.6, 4.5, 5.5, stools=(18.45, 19.3, 20.15), stool_r=5.95, H=H)
PH.dining_set(k, 14.2, 18.4, 10.2, d=1.0)
PH.robot_vacuum(k, 12.6, 9.6)
for (x, r) in ((9.25, 15.2), (12.75, 15.2)):               # tall plants either side of the lift
    E.potted_palm(k, x, r, h=1.5, pot='#1a1820', leaf='#4a7a3a', fronds=8, s=0.85)
PH.geo_rug(k, 5.4, 9.2, 13.6, 14.4, base='#2a2232', lines=PH.GOLD, accent='#c86a9a')      # the open floor at the front, a rug on it
E.wingback(k, 2.3, 13.3, facing='right', col='#4a2a6a', legs=PH.GOLD)                      # a reading corner
k.cyl(3.15, 12.55, 0, 0.5, 0.2, (PH.BLACK_L, 0.04), 'side_table', verts=14)
k.cyl(3.15, 12.55, 0.5, 0.53, 0.22, (PH.GOLD, 0.03), 'side_table', verts=14)
E.stack_of_books(k, 3.15, 12.55, 0.53, n=3)
k.solid(2.95, 12.35, 3.35, 12.75)
PH.arc_lamp(k, 1.55, 12.3, 2.4, 13.1, h=1.95, energy=12)
E.potted_palm(k, 1.7, 14.9, h=2.0, pot='#1a1820', leaf='#3a6a3a', fronds=11)

# ---- out on the deck ----------------------------------------------------------------------------------------------
PANES = [PH.glass_balustrade(k, (PX + 0.1, FRONT), (35.0, FRONT))]
PH.glass_balustrade(k, (PX + 0.1, RF), (35.0, RF), holdout=True)
PH.glass_balustrade(k, (35.0, RF), (35.0, FRONT))
POOL = PH.plunge_pool(k, *POOL_AT, infinity='right')
import assets_casino as CA2                                  # a float drifting on the water, a towel and sandals by it
CA2.rim(k, E.ell(32.9, 6.3, 0.34, 0.26, 18), E.ell(32.9, 6.3, 0.16, 0.12, 18), -0.07, 0.01, ('#f070a0', 0.04), 'pool_float')
k.box(29.2, 8.3, 0.0, 29.9, 8.75, 0.03, (Y.CYAN, 0.08), 'towel')
for dx in (0.0, 0.14):
    k.box(30.4 + dx, 8.45, 0.0, 30.5 + dx, 8.7, 0.025, '#e8e0d0', 'sandals')
k.cyl(30.15, 7.95, 0.05, 0.11, 0.006, '#d8e8f0', 'glass', verts=5)
k.cyl(30.15, 7.95, 0.11, 0.17, 0.025, '#e8d890', 'glass', emit=('#a09040', 0.3), verts=8)
for x, towel in ((25.3, Y.PINK), (26.8, Y.CYAN), (28.3, '#e8c040')):
    PH.lounger(k, x, 3.05, towel=towel)
PH.planter(k, 22.1, 2.12, 24.2, 2.62, kind='grass', h=0.5)
PH.outdoor_bar(k, 22.1, 23.9, 4.1, 4.7)
PH.planter(k, 33.55, 9.35, 34.75, 10.65, kind='olive', h=0.55)
PH.planter(k, 21.4, 15.15, 26.6, 15.75, kind='grass', h=0.45)
PH.planter(k, 33.3, 14.9, 34.8, 15.7, kind='box', h=0.45)
PH.fire_pit(k, 29.6, 12.6, rad=0.55, seat_rad=1.62, arc=(196, 344))
PH.geo_rug(k, 22.4, 10.6, 26.0, 13.6, base='#3a3430', lines='#c8a060', accent='#c86a3a')
for (x, r, f) in ((23.0, 11.3, 'right'), (25.4, 11.3, 'left')):
    E.rattan_chair(k, x, r, facing=f, cushion='#e8e0d8', stripe='#3a3448')
k.cyl(24.2, 11.6, 0, 0.36, 0.3, ('#4a4650', 0.05), 'deck_table', verts=16)
k.cyl(24.2, 11.6, 0.36, 0.4, 0.34, (PH.TEAK_L, 0.07), 'deck_table', verts=16)
E.hurricane_lamp(k, 24.1, 11.55, 0.4, energy=2.5)
k.solid(23.9, 11.3, 24.5, 11.9)
# the festoons, corner to corner over the deck
posts = {n: PH.light_post(k, x, r) for n, (x, r) in {'nw': (21.45, 2.32), 'n': (28.6, 2.28), 'ne': (34.7, 2.32),
                                                     'sw': (21.45, 15.62), 's': (28.6, 15.66), 'se': (34.7, 15.62)}.items()}
BULBS = []
for (a, b) in (('nw', 's'), ('s', 'ne'), ('sw', 'n'), ('n', 'se'), ('nw', 'n'), ('n', 'ne')):
    BULBS += PH.festoon(k, posts[a], posts[b], sag=0.42 if a[0] != b[0] else 0.25, n=12, light_every=4, energy=2.6)

# ---- light ---------------------------------------------------------------------------------------------------------
for x in (2.8, 6.8, 10.8, 15.6, 19.2):                     # downlights inside, warm
    for r in (4.5, 8.5, 12.5):
        k.point_light(x, r, H - 0.2, '#ffd8b0', 40, radius=0.4, group='lamp')
k.area_light(7.0, RF + 0.6, 2.2, '#7a60d0', 120, 10.0, rot=(math.radians(-70), 0, 0))       # the city's glow through the glass
k.area_light(28.0, 9.0, 9.0, '#6a58c0', 1400, 18.0, rot=(math.radians(-30), 0, 0))          # the sky over the deck
k.point_light(3.8, 4.2, 1.6, '#f090c0', 10, radius=0.4)
k.point_light(18.9, 5.0, 2.2, WARM, 10, radius=0.3)
k.point_light(10.8, 15.0, 1.4, '#a0e0f0', 8, radius=0.3)

preview(k)
k.render(OUT, light_states={'full': {'flicker': 1.0, 'lamp': 1.0}, 'dim': {'flicker': 0.72, 'lamp': 1.0}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#2a2448', 0.6))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.pop('interior', None)
w.update({'name': 'The Penthouse', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [11, 15]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})


def look(label, x, y, text, **kw):
    it = {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO LOOK', 'dialog': text}
    it.update(kw)
    return it


w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'arcadia-skypad', 'leaveSpawn': [11, 4], 'label': 'THE LIFT', 'prompt': 'PRESS E TO GO UP TO THE ROOF'}
    for (x, y) in DOORS] + [
    look('THE GLASS', 1, 2, 'THE WHOLE CITY, AND YOU ABOVE IT. THE TRAFFIC LANES RUN LIKE RIVERS OF LIGHT BETWEEN THE TOWERS.', action='view', view='skyline'),
    look('BED', 4, 5, 'YOU SLEEP ABOVE THE CITY WITH THE TOWERS FOR A NIGHT LIGHT, AND DREAM OF NOTHING AT ALL.', prompt='PRESS E TO SLEEP', action='sleep'),
    look('THE BATH', 7, 3, 'A BATH CUT FROM ONE STONE, BY THE GLASS. YOU SINK IN TO THE CHIN WITH THE CITY AT YOUR ELBOW AND A GLASS OF SOMETHING COLD.',
         prompt='PRESS E TO BATHE', action='sleep', rest=1.6),
    look('VANITY', 3, 7, 'TWIN BASINS, TWO MIRRORS RINGED WITH LIGHT. IN BOTH OF THEM YOU LOOK LIKE SOMEBODY WHO OWNS A PENTHOUSE.'),
    look('THE LOUNGE', 11, 6, 'A SOFA YOU COULD LOSE A PARTY IN, FACING THE GLASS. ON THE TABLE, A BOWL OF GLOWING STONES AND A TABLET THAT SAYS WELCOME HOME.',
         prompt='PRESS E TO SIT', action='sit', seat=[11.5, 6.55], facing='up'),
    look('PIANO', 7, 13, 'A WHITE GRAND, TUNED THIS MORNING BY SOMEONE YOU NEVER SAW. YOU PLAY THE FOUR NOTES YOU KNOW; THE ROOM MAKES THEM SOUND EXPENSIVE.'),
    look('THE BAR', 15, 3, 'EVERY BOTTLE THE CITY MAKES, AND A FEW IT DOESN\'T. THE DUCHESS SENT UP A CASE OF HALCYON \'01 "FOR THE NEW NEIGHBOUR."'),
    look('THE KITCHEN', 19, 5, 'A KITCHEN NOBODY HAS COOKED IN. THE OVEN KNOWS FOUR HUNDRED RECIPES AND YOUR NAME. THE LEMONS ARE REAL, WHICH IN ARCADIA IS A FLEX.'),
    look('THE GLASS', 9, 2, 'THE NEON ROYALE\'S CROWN, LEVEL WITH YOUR WINDOW. FROM HERE THE WHALES LOOK LIKE ANYONE ELSE.', action='view', view='skyline'),
    look('THE POOL', 30, 8, 'A PLUNGE POOL LIT FROM BELOW, WARM AS A BATH, ITS FAR EDGE SPILLING AWAY TOWARD THE TOWERS. THE WATER SMELLS FAINTLY OF THE SEA ON LUMAR. SOMEBODY IMPORTED IT.',
         prompt='PRESS E TO SWIM', action='sleep', rest=1.4),
    look('LOUNGER', 25, 4, 'WARM CUSHIONS, A TOWEL ROLLED UNDER YOUR NECK, THE TRAFFIC SLIDING PAST TWO HUNDRED FLOORS DOWN.', prompt='PRESS E TO LIE BACK',
         action='sit', seat=[25.3, 4.3], facing='down', view='skyline'),
    look('LOUNGER', 26, 4, 'THE RAIN NEVER QUITE REACHES THIS FAR UP. IT JUST GLITTERS ON THE GLASS.', prompt='PRESS E TO LIE BACK',
         action='sit', seat=[26.8, 4.3], facing='down', view='skyline'),
    look('LOUNGER', 28, 4, 'A DRINK WITH AN UMBRELLA IN IT, MELTING. NOBODY WILL ASK YOU TO DO ANYTHING FOR HOURS.', prompt='PRESS E TO LIE BACK',
         action='sit', seat=[28.3, 4.3], facing='down', view='skyline'),
    look('THE FIRE PIT', 29, 11, 'FLAMES STANDING UP OUT OF BLUE GLASS, CUSHIONS ALL ROUND. THE BEST SEAT IN ARCADIA, AND IT\'S YOURS.', prompt='PRESS E TO SIT',
         action='sit', seat=[29.6, 11.5], facing='down'),
    look('DRINKS', 23, 4, 'A COUNTER OF ICE AND BOTTLES BY THE POOL, AND A STACK OF TOWELS IN YOUR COLOURS.'),
    look('THE EDGE', 34, 13, 'GLASS, THEN NOTHING, THEN THE CITY. A HOVER-CAB DRIFTS PAST AT EYE LEVEL; THE PASSENGER WAVES. YOU WAVE BACK.', action='view', view='skyline'),
    look('THE EDGE', 30, 15, 'STRAIGHT DOWN: THE SKYWALK, THE DISTRICT, THE STREET, ALL OF IT SMALL AND LIT AND BUSY. UP HERE IT\'S QUIET.', action='view', view='skyline'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, scene_extra={'backdrop': True})
w = json.load(open(WORLD))
w['skyline'] = {'baseRow': 3.6, 'railRow': FRONT + 1.4, 'centerCol': COLS / 2,
                'rain': {'drops': 150, 'splash': [PX + 0.4, RF + 0.3, 34.7, FRONT - 0.3],
                         'dry': [[0.3, round(RF - H * C - 0.6, 3), PX + 0.15, FRONT + 0.7]]}}
w['view'] = [-0.6, -1.4, COLS + 0.6, ROWS + 0.6]
w['penthouse'] = {'glass': [p for p in PANES if p], 'pool': POOL, 'bulbs': BULBS, 'fire': [29.6, round(12.6 - 0.9 * C, 3)]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('penthouse done; glass', GLASS)
