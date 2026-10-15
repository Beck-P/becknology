"""The Runout Room — the games parlour behind Arcadia's Arcade. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/runouts_room.py RENDER_DIR show|play
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/runouts/public/art/room-show   (or room-play)

The Runouts app's own place: the picker is this room (`show`: every station
dressed — the wheel's face, the derby's horses, the board's number); each
game is played at its station, the camera moved there over the `play`
render (the moving parts left out, drawn live by the app). Same 32 px a
tile, same light, same palette as the Bridge's Arcadia rooms.

Along the back wall: a bank of three slot machines, the wheel of fortune,
the lucky-number board, the RUNOUTS sign over the market wall, the derby,
the plinko wall and two cabinets (Space Invaders, Rocket Launch). On the
floor: the card table under its lamps, the coin table, the marble urn, the
dice pit, the bomb table, the holo-table (battle royale) and, by the door,
THE MACHINE, the fortune-teller booth that picks for you. The anchors the
app needs (stations' rects on screen, felt, reels, lanes, pegs) are written
to room.json.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit  # noqa: E402
import assets_cyber as Y   # noqa: E402
import assets_lumar as L   # noqa: E402
import assets_runouts as R  # noqa: E402
import assets_signs as G   # noqa: E402

OUT = sys.argv[1]
MODE = sys.argv[2] if len(sys.argv) > 2 else 'show'
DYN = MODE == 'show'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
COLS, ROWS = 34, 14
WALL_R, WALL_H = 3.0, 4.2
C = math.cos(math.radians(45))
k = Kit(COLS, ROWS, margin_top=0.4, margin_bottom=0.4, seed=7707)


def rect(x0, x1, r_front, z_top, r_back=None, z_bot=0.0):
    """A station's box on screen, in tiles: [x0, top row, x1, bottom row]."""
    rb = r_front if r_back is None else r_back
    return [round(x0, 2), round(rb - z_top * C, 2), round(x1, 2), round(r_front - z_bot * C, 2)]


Y.cyber_room(k, 0, WALL_R, COLS, ROWS, WALL_H, door=(15.5, 18.5), top_neon=Y.PINK, base_neon=Y.CYAN)
for (x0, r0, x1, r1, col) in ((12.0, 5.4, 22.0, 10.8, '#3a1030'), (2.0, 9.9, 10.4, 13.4, '#1a1e3a'), (26.4, 7.6, 33.4, 13.4, '#102a30')):
    L.rug(k, x0, r0, x1, r1, col=col, trim='#c8a048')

S = {}
A = {}
# ---- along the back wall ---------------------------------------------------------------------------------------------
for i, col in enumerate(('#e84040', '#e8c040', '#7080e8')):
    a = R.slot_machine(k, 1.2 + i * 1.15, WALL_R, col, dyn=DYN, seed=i)
    A.setdefault('slots', []).append(a['window'])
S['slots'] = rect(0.6, 4.3, WALL_R + 0.9, 2.2, WALL_R)
A['wheel'] = R.big_wheel(k, 6.4, WALL_R + 0.4, 1.95, 1.2, dyn=DYN)
S['wheel'] = rect(5.0, 7.8, WALL_R + 0.6, 3.5, WALL_R + 0.3)
A['number'] = R.flap_board(k, 10.0, WALL_R, 1.25, dyn=DYN)
k.box(8.9, WALL_R, 0, 11.1, WALL_R + 0.6, 0.95, ('#2a1a30', 0.04), 'console', bevel=0.02)
k.solid(8.9, WALL_R, 11.1, WALL_R + 0.7)
S['rng'] = rect(8.9, 11.1, WALL_R + 0.6, 2.45, WALL_R)
A['market'] = R.ticker_wall(k, 12.4, 17.6, WALL_R, 1.25, 2.85, dyn=DYN)
S['stock-market'] = rect(12.2, 17.8, WALL_R + 0.2, 2.95, WALL_R)
G.neon(k, 'RUNOUTS', 'Monoton', 15.0, WALL_R + 0.05, 3.3, size=0.5, col=Y.PINK, energy=8)
A['derby'] = R.derby(k, 18.4, 23.4, WALL_R, lanes=6, dyn=DYN)
S['horse-race'] = rect(18.4, 23.4, WALL_R + 1.0, 2.8, WALL_R)
A['plinko'] = R.plinko_board(k, 25.7, WALL_R, dyn=DYN)
S['plinko'] = rect(23.6, 27.8, WALL_R + 0.6, 3.45, WALL_R)
Y.arcade_cabinet(k, 29.0, WALL_R, art='invaders', marquee=Y.GREEN, side=Y.CYAN)
Y.arcade_cabinet(k, 30.2, WALL_R, art='missile', marquee='#ff9040', side=Y.PINK)
S['space-invaders'] = rect(28.55, 29.45, WALL_R + 0.9, 2.1, WALL_R)
S['rocket'] = rect(29.75, 30.65, WALL_R + 0.9, 2.1, WALL_R)
A['cabinets'] = {'space-invaders': [28.6, 29.4], 'rocket': [29.8, 30.6]}
Y.vending_machine(k, 32.6, WALL_R)

# ---- the floor -------------------------------------------------------------------------------------------------------------
A['poker'] = R.poker_table(k, 17.0, 8.0, dyn=DYN)
S['holdem'] = rect(13.6, 20.4, 9.35, 0.9, 6.65)
for (x, r) in ((14.2, 6.2), (16.0, 6.0), (18.0, 6.0), (19.8, 6.2), (13.2, 9.7), (20.8, 9.7)):
    Y.neon_stool(k, x, r, seat='#a03070')
A['coins'] = R.coin_table(k, 5.0, 7.2, dyn=DYN)
S['coin-flips'] = rect(4.1, 5.9, 8.1, 0.9, 6.3)
A['marble'] = R.marble_urn(k, 9.0, 6.6, dyn=DYN)
S['black-marble'] = rect(8.5, 9.5, 7.1, 1.8, 6.1)
A['dice'] = R.dice_pit(k, 3.0, 9.4, 10.6, 12.2, dyn=DYN)
S['dice'] = rect(2.9, 9.5, 12.3, 1.0, 10.5)
A['bomb'] = R.bomb_table(k, 23.6, 11.2, dyn=DYN)
S['bomb'] = rect(22.85, 24.35, 11.95, 1.3, 10.45)
A['holo'] = R.holo_table(k, 29.4, 9.6, dyn=DYN)
S['battle-royale'] = rect(28.4, 30.4, 10.6, 1.0, 8.6)
A['machine'] = R.fortune_booth(k, 31.9, 11.6, dyn=DYN)
S['random'] = rect(31.25, 32.55, 12.6, 2.62, 11.6)
for (x, r) in ((26.0, 6.6), (12.6, 11.6), (20.6, 12.2)):
    Y.cafe_table(k, x, r)
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
L.potted_plant(k, 0.8, 13.2)
L.potted_plant(k, 33.2, 6.4)

# ---- the light: dark, neon, warm lamps over the tables ------------------------------------------------------------------------
for x in (15.0, 19.0):                                                       # warm lamps over the card table
    L.hanging_lamp(k, x, 7.8, z=2.8, energy=220, chain_top=WALL_H + 0.3)
L.hanging_lamp(k, 6.2, 11.2, z=2.7, energy=200, chain_top=WALL_H + 0.3)       # and the dice pit
for (x, r, c) in ((3.5, 5.0, '#a060ff'), (10.0, 4.8, '#ff60c0'), (17.0, 4.6, '#ff70b0'), (24.0, 4.8, '#6080ff'), (30.5, 5.0, '#a060ff'),
                  (6.0, 9.0, '#6080ff'), (12.5, 10.5, '#a060ff'), (23.5, 9.0, '#ff60c0'), (29.0, 11.5, '#40c0e0')):
    k.point_light(x, r, 2.8, c, 58, radius=0.6)
k.render(OUT, light_states={'full': {}}, light_samples=96, world_light=('#2c2048', 0.6))

if DYN or os.environ.get('ROOM_JSON'):
    out = os.path.join(ROOT, 'apps', 'runouts', 'public', 'art', 'room.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({'cols': COLS, 'rows': ROWS, 'stations': S, 'anchors': A, 'C': C}, open(out, 'w'), indent=1)
print('runouts room', MODE)
