"""The Crown Room — the Neon Royale's high-roller room (world id "arcadia-casino-vip"). Usage:
BVENV/bin/python arcadia_casino_vip.py RENDER_DIR

Up the steps behind the velvet rope, for those who've won enough at poker to be asked (js/worlds/casino.js keeps
the rope): black marble and gold under a window the width of the room onto the city (the live skyline behind the
render's HOLDOUT panes), three tables at high stakes — the Duchess's own poker table in the middle, a blackjack
table, a roulette wheel — her gold chair, a champagne tower, the crown on its plinth, a velvet sofa.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_casino as C                     # noqa: E402
import assets_cyber as Y                      # noqa: E402
import assets_district as D                   # noqa: E402
import assets_signs as S                      # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-casino-vip'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 14
H = 4.8
FLOOR = (1, 3, 20, 12)
DOORS = [(10, 13), (11, 13)]
RB = 3.0
VIP_FELT = '#2e1048'

k = Kit(COLS, ROWS, margin_top=1.4, margin_bottom=0.5, seed=9119)
live = C.Live()
rng = k.rng

# ---- the shell: black marble, a window the width of the room ---------------------------------------------------------------------
C.marble(k, 1.0, RB, 21.0, 13.0, size=1.0, a='#2a2430', b=C.MARBLE_D, inlay=C.GOLD)
C.deco_wall(k, 0.4, 2.0, RB, H, mirrors=False, neon=C.YEL)
C.deco_wall(k, 20.0, 21.6, RB, H, mirrors=False, neon=C.YEL)
SKY = C.panorama(k, 2.0, 20.0, RB, 0.8, 3.75, H, step=2.0, neon=C.YEL)
C.side_wall(k, 0.4, 1.0, RB - 0.5, 13.0, H)
C.side_wall(k, 21.0, 21.6, RB - 0.5, 13.0, H)
C.front_wall(k, 0.4, 21.6, 13.0, (10.0, 12.0), neon=C.YEL)
C.neon_crown(k, 11.0, RB + 0.1, 3.95, s=0.42, col=C.YEL, gem=C.PINK, energy=12)
# a crimson rug under the tables, gold-bordered
k.box(2.0, 4.2, 0.0, 20.0, 9.6, 0.012, (C.OXBLOOD, 0.1), 'rug')
k.box(2.15, 4.35, 0.012, 19.85, 9.45, 0.016, (C.GOLD, 0.05), 'rug_trim')
k.box(2.3, 4.5, 0.016, 19.7, 9.3, 0.02, (C.OXBLOOD_L, 0.1), 'rug')

# ---- the tables --------------------------------------------------------------------------------------------------------------
PK = (10.5, 6.9)
places = [(10.5, 5.55, 'down'), (9.5, 5.55, 'down'), (11.5, 5.55, 'down'), (8.5, 6.55, 'right'), (12.5, 6.55, 'left'),
          (9.5, 8.55, 'up'), (10.5, 8.55, 'up'), (11.5, 8.55, 'up')]
C.poker(k, live, PK[0], PK[1], w=3.4, d=1.9, felt=VIP_FELT, places=places, empty=(0, 4), rng=rng, wood='#1a0e08')
C.throne_chair(k, 12.5, 6.55, facing='left')
k.solid(PK[0] - 1.7, PK[1] - 0.95, PK[0] + 1.7, PK[1] + 0.95)
C.blackjack(k, live, 4.5, 4.9, w=3.0, d=1.45, felt=VIP_FELT, stools=[(3.5, 6.6), (4.5, 6.65), (5.5, 6.6)], rng=rng)
k.solid(3.0, 4.9, 6.0, 5.9)
C.roulette(k, live, 14.8, 5.0, w=3.6, d=1.3, wheel='right', felt=VIP_FELT, rng=rng)
k.solid(14.8, 5.0, 18.4, 6.0)
for x in (15.5, 16.5):
    C._stool(k, x, 6.6)

# ---- the room: the champagne tower, the crown, the sofa, the bar cart -----------------------------------------------------------------
k.cyl(17.5, 10.6, 0.0, 0.05, 0.3, (C.GOLD_D, 0.05), 'ct_foot', verts=14)
k.cyl(17.5, 10.6, 0.05, 0.66, 0.06, (C.GOLD, 0.05), 'ct_post', verts=8)
k.cyl(17.5, 10.6, 0.66, 0.72, 0.42, (C.LACQUER, 0.04), 'ct_top', verts=20)
k.cyl(17.5, 10.6, 0.65, 0.66, 0.43, (C.GOLD, 0.05), 'ct_rim', verts=20)
C.champagne_tower(k, 17.5, 10.6, 0.72, levels=5)
k.solid(17.0, 10.1, 18.0, 11.1)
k.box(2.8, 10.2, 0.0, 4.2, 11.6, 0.8, (C.MARBLE_D, 0.1), 'plinth', bevel=0.03)
k.box(2.75, 10.15, 0.8, 4.25, 11.65, 0.88, (C.GOLD, 0.05), 'plinth_top')
C.crown_3d(k, 3.5, 10.9, 0.88, s=1.0)
k.point_light(3.5, 11.6, 2.2, '#ffd890', 18, radius=0.4)
k.solid(2.8, 10.2, 4.2, 11.6)
k.box(12.6, 11.2, 0.0, 15.6, 11.95, 0.42, (C.VELVET, 0.1), 'sofa', bevel=0.05)
k.box(12.6, 11.75, 0.3, 15.6, 12.05, 0.95, (C.VELVET, 0.1), 'sofa_back', bevel=0.05)
for x in (12.55, 15.45):
    k.box(x, 11.2, 0.0, x + 0.12, 12.05, 0.7, (C.GOLD, 0.05), 'sofa_arm')
k.solid(12.6, 11.2, 15.6, 12.0)
k.box(6.2, 10.6, 0.0, 7.6, 11.2, 0.85, (C.GOLD_D, 0.05), 'bar_cart', bevel=0.02)
for i in range(6):
    col = ('#3a1a0a', '#1a3a1a', '#5a1a2a')[i % 3]
    k.cyl(6.4 + i * 0.2, 10.9, 0.85, 1.15, 0.045, (col, 0.06), 'decanter', emit=('#ffb060', 0.15), verts=6)
k.solid(6.2, 10.6, 7.6, 11.2)
for (x, r) in ((1.6, 11.6), (20.4, 11.6)):
    k.cyl(x, r, 0.0, 0.5, 0.25, (C.GOLD, 0.05), 'urn', verts=12)
    k.blob(x, r, 0.95, 0.35, 0.32, 0.5, ('#2a5a3a', 0.2), 'palm', segs=10)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
C.chandelier(k, 10.0, 12.1, 3.0, s=1.0, energy=40)

# ---- light: gold pools on the felt (the tables bring their own), the city's glow, the neon crown --------------------------------------
for (x, r) in ((5.0, 9.5), (16.0, 9.0), (10.5, 11.5), (19.0, 6.0), (2.0, 7.5)):
    k.point_light(x, r, 2.5, '#ffd0a0', 14, radius=0.6)
k.area_light(11.0, RB + 1.0, 3.8, '#8070c0', 70, 10.0, rot=(math.radians(-50), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.82}}, light_samples=128, world_light=('#22142c', 0.42))

# ---- the world ------------------------------------------------------------------------------------------------------------------
P = 'PRESS E TO PLAY'
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Crown Room', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [10, 12]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'interior': True})
w['interactions'] = [
    {'x': x, 'y': 13, 'type': 'leave_world', 'leaveTo': 'arcadia-casino', 'leaveSpawn': [21, 4], 'label': 'THE CASINO FLOOR',
     'prompt': 'PRESS E TO GO DOWN'} for (x, _) in DOORS] + [
    {'x': 10, 'y': 7, 'type': 'casino', 'game': 'poker', 'table': 'poker-vip', 'stakes': 'high', 'label': "THE DUCHESS'S TABLE", 'prompt': P},
    {'x': 4, 'y': 5, 'type': 'casino', 'game': 'blackjack', 'table': 'bj-vip', 'stakes': 'high', 'label': 'HIGH-LIMIT BLACKJACK', 'prompt': P},
    {'x': 16, 'y': 5, 'type': 'casino', 'game': 'roulette', 'table': 'roulette-vip', 'stakes': 'high', 'label': 'HIGH-LIMIT ROULETTE', 'prompt': P},
    {'x': 12, 'y': 6, 'type': 'dialog', 'label': 'THE DUCHESS', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE DUCHESS LOOKS UP FROM HER CARDS.'},
    {'x': 17, 'y': 10, 'type': 'dialog', 'label': 'THE CHAMPAGNE TOWER', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'FIVE TIERS OF COUPES, AND THE CHAMPAGNE POURED IN AT THE TOP RUNS DOWN THROUGH ALL OF THEM.\n\nA CARD IN GOLD INK: '
               '"FOR WHOEVER BEATS ME AT MY OWN TABLE. - I."\n\nIT HAS BEEN POURED, AND REPOURED, FOR A VERY LONG TIME.'},
    {'x': 3, 'y': 10, 'type': 'dialog', 'label': 'THE CROWN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A CROWN OF REAL GOLD ON A BLACK PLINTH, THE STONES IN IT PINK AND LIT FROM INSIDE. THE PLAQUE SAYS IT WAS THE STAKE IN THE '
               'HAND THAT WON THE DUCHESS THIS HOUSE.\n\nTHE PLAQUE DOES NOT SAY WHAT THE OTHER PLAYER PUT UP.'},
    {'x': 7, 'y': 10, 'type': 'dialog', 'label': 'THE BAR CART', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'CRYSTAL DECANTERS, EACH WITH A LITTLE GOLD TAG: ORBITAL RYE, 40 CYCLES. SPORE BRANDY, LUMAR. SOMETHING CALLED '
               '"THE SECOND MORTGAGE".'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
actors = [{'sheet': 'npc-dealer', 'x': 10, 'y': 5, 'facing': 'down'}, {'sheet': 'npc-dealer-b', 'x': 4, 'y': 4, 'facing': 'down'},
          {'sheet': 'npc-croupier', 'x': 17, 'y': 4, 'facing': 'down'}, {'sheet': 'npc-highroller', 'x': 15, 'y': 6, 'facing': 'up'},
          {'sheet': 'npc-duchess', 'x': 12, 'y': 6, 'facing': 'left', 'pose': 'sit'},
          {'sheet': 'npc-gambler-b', 'x': 9, 'y': 8, 'facing': 'up', 'pose': 'sit'},
          {'sheet': 'npc-gambler-a', 'x': 8, 'y': 6, 'facing': 'right', 'pose': 'sit'},
          {'sheet': 'npc-gambler-d', 'x': 5, 'y': 6, 'facing': 'up', 'pose': 'sit'}]
for a in actors:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=actors, scene_extra={'sky': SKY})
w = json.load(open(WORLD))
w['casino'] = {'live': live.dump(), 'floor': 'vip', 'sky': SKY}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('crown room done')
