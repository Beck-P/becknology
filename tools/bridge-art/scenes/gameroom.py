"""The Wayfarer's game room — Blender scene (off the bridge, through its
east door).

  BVENV/bin/python tools/bridge-art/scenes/gameroom.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/gameroom

Every game found out in the worlds lands here: six arcade cabinets along
the back wall, NULL's rig, the chess table, Enigma's two terminals, the
canvas that paints itself at the Brink, a pachinko machine from Lucky 7. Each slot is a variant pair —
`g_<game>`: `on` (the game itself) or `off` (a dust sheet over its shape,
a tag saying where it's from) — and js/games.js picks which by what the
pilot has played. The score board on the wall is always there.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_backs as B                       # noqa: E402
import assets_cyber as Y                       # noqa: E402
import assets_deck as D                        # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_ship as P                        # noqa: E402
import assets_station as T                     # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'gameroom.json')
COLS, ROWS = 18, 12
RF = 4.0
H = 2.4 / math.cos(THETA)

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=701)

# ---- shell ----------------------------------------------------------------------------------------
A.floor_planks(k, 1, RF, 17, 11, tone='#5a3a1a')
P.ship_back_wall(k, 0.5, 17.5, RF, H, pal=P.Q_WALL)
P.ship_side_wall(k, 0.4, 1.0, 3.5, 7.0, H, pal=P.Q_WALL)          # the door back to the bridge, west
P.ship_side_wall(k, 0.4, 1.0, 9.0, 11.0, H, pal=P.Q_WALL)
k.box(0.4, 7.0, 2.62, 1.0, 9.0, H, (P.Q_WALL[1], 0.06), 'door_lintel')
k.box(0.4, 7.0, -0.01, 1.0, 9.0, 0.02, ('#2a3038', 0.08), 'threshold')
D.side_door(k, 1.0, 7.0, 9.0, 1, sign='BRIDGE')                    # the bridge's own doorway: framed, a lantern, its light
P.ship_side_wall(k, 17.0, 17.6, 3.5, 11.0, H, pal=P.Q_WALL)
k.box(0.4, 11.0, 0, 17.6, 11.6, 0.35, (P.Q_WALL[1], 0.06), 'front_wall')
k.box(0.4, 11.0, 0.35, 17.6, 11.6, 0.4, P.Q_WALL[0], 'wall_cap')
k.box(0.4, 10.99, 0.29, 17.6, 11.02, 0.32, '#103038', 'led', emit=(P.CYAN, 0.6))
P.led_strip(k, 1.0, 17.0, RF + 0.1, z=2.6)
A.rug(k, 3.2, 7.1, 6.0, 9.4, col='#2a3a5a', trim='#5cc8d0', pattern=True)
A.rug(k, 10.6, 7.6, 16.4, 9.8, col='#4a2a3a', trim='#e8c040')


def sheet(cx, cr, w, d, h, tag='#e8e0d0', cab=False):
    """A dust sheet over something not found yet: off-white calico thrown over its shape and tied round with a cord, a
    flat top with the cloth turned down over its edges, folds hanging straight to a hem that pools a little on the
    boards, the dark foot of what's under it showing, a luggage tag on a string. `cab`: an arcade cabinet's shape under
    it (the marquee jutting forward at the top, the control panel's ledge). It used to be a grey box under a rounded
    blob: a row of ghosts."""
    cloth = '#d2c6aa'
    x0, x1, r0, r1 = cx - w / 2, cx + w / 2, cr - d / 2, cr + d / 2
    k.box(x0 + 0.05, r0 + 0.05, 0.0, x1 - 0.05, r1 - 0.02, 0.09, '#1a120c', 'sheet_foot')         # what's under it
    k.box(x0, r0, 0.09, x1, r1, h - 0.07, (cloth, 0.1), 'sheet', bevel=0.015)
    k.box(x0 - 0.03, r0 - 0.03, h - 0.08, x1 + 0.03, r1 + 0.03, h, (shade(cloth, 1.07), 0.1), 'sheet_top', bevel=0.015)
    if cab:
        k.box(x0 - 0.02, r1, h * 0.8, x1 + 0.02, r1 + 0.14, h - 0.02, (shade(cloth, 1.04), 0.1), 'sheet_marquee', bevel=0.015)
        k.box(x0 - 0.02, r1, h * 0.42, x1 + 0.02, r1 + 0.2, h * 0.47, (shade(cloth, 1.05), 0.1), 'sheet_ledge', bevel=0.015)
    n = max(3, int(w / 0.17))                                        # folds down the front, light and shade
    for i in range(n):
        x = x0 + (i + 0.5) * w / n
        top = h * (0.4 if cab else 0.92) - (i % 2) * 0.12
        k.box(x - 0.025, r1 + (0.2 if cab else 0.0), 0.09, x + 0.025, r1 + (0.23 if cab else 0.03), top,
              (shade(cloth, 0.84 if i % 2 else 1.06), 0.1), 'sheet_fold')
    for xs in (x0, x1):                                              # and down the sides
        for j in range(2):
            rr = r0 + (j + 0.5) * d / 2
            k.box(xs - 0.02, rr - 0.025, 0.09, xs + 0.02, rr + 0.025, h * 0.85, (shade(cloth, 0.86), 0.1), 'sheet_fold')
    k.box(x0 - 0.05, r0 - 0.04, 0.09, x1 + 0.05, r1 + (0.27 if cab else 0.07), 0.15, (shade(cloth, 0.93), 0.1), 'sheet_hem')
    k.box(x0 - 0.015, r0 - 0.015, h * 0.6, x1 + 0.015, r1 + (0.215 if cab else 0.015), h * 0.6 + 0.04, '#7a5a34', 'sheet_cord')
    k.box(cx + w / 4, r1 + (0.22 if cab else 0.02), h * 0.5, cx + w / 4 + 0.12, r1 + (0.23 if cab else 0.03), h * 0.58,
          (tag, 0.05), 'tag')


# ---- the slots (variants) ----------------------------------------------------------------------------
CABS = [('runouts', 'runouts', 2.2, Y.PINK), ('asteroids', 'asteroids', 4.0, Y.CYAN), ('helicopter', 'helicopter', 5.8, Y.YEL),
        ('breakout', 'breakout', 7.6, Y.PURP), ('space-invaders', 'invaders', 9.4, Y.GREEN), ('missile-command', 'missile', 11.2, Y.RED)]
for key, art, cx, col in CABS:
    with k.variant('g_' + key, 'on'):
        Y.arcade_cabinet(k, cx, RF, art=art, marquee=col)
    with k.variant('g_' + key, 'off'):
        sheet(cx, RF + 0.4, 0.8, 0.62, 2.05, cab=True)
    k.solid(cx - 0.4, RF, cx + 0.4, RF + 0.9)
with k.variant('g_splice', 'on'):
    B.splice_rig(k, 13.6, RF)
with k.variant('g_splice', 'off'):
    sheet(13.6, RF + 0.3, 1.25, 0.6, 1.95)
k.solid(13.0, RF, 14.2, RF + 0.55)
Y.highscore_board(k, 15.9, RF, z0=1.0, w=1.3, h=1.0)
with k.variant('g_chess', 'on'):
    P.chess_table(k, 4.6, 8.25)
    P.ship_stool(k, 3.65, 8.3)
    P.ship_stool(k, 5.55, 8.3)
with k.variant('g_chess', 'off'):
    sheet(4.6, 8.25, 1.0, 1.0, 0.85)
k.solid(4.1, 7.8, 5.1, 8.7)
with k.variant('g_cipher-room', 'on'):
    T.station_terminal(k, 11.9, 8.6, col='#c080ff', w=1.2)
with k.variant('g_cipher-room', 'off'):
    sheet(11.9, 8.6, 1.2, 0.8, 1.3)
with k.variant('g_typist', 'on'):
    T.station_terminal(k, 14.3, 8.6, col=T.TEAL, w=1.2)
with k.variant('g_typist', 'off'):
    sheet(14.3, 8.6, 1.2, 0.8, 1.3)
k.solid(11.3, 8.2, 12.5, 9.0)
k.solid(13.7, 8.2, 14.9, 9.0)
with k.variant('g_genart', 'on'):
    for i in range(3):
        a = i * 2 * math.pi / 3 + 0.5
        k.tube((8.6 + math.cos(a) * 0.3, 9.4 + math.sin(a) * 0.25, 0.0), (8.6, 9.3, 1.3), 0.02, ('#5a3a20', 0.1), 'easel', verts=5)
    k.box(8.05, 9.15, 0.75, 9.15, 9.22, 1.75, '#14102a', 'canvas', emit=('#2a1a50', 0.6))
    for j in range(40):
        t = j / 40 * 4 * math.pi
        rr = 0.05 + j * 0.011
        k.box(8.6 + math.cos(t) * rr - 0.02, 9.225, 1.25 + math.sin(t) * rr * 0.9 - 0.02, 8.6 + math.cos(t) * rr + 0.02, 9.235,
              1.25 + math.sin(t) * rr * 0.9 + 0.02, '#14102a', 'swirl', emit=(('#c080ff', '#80e0ff', '#ffe080')[j % 3], 1.0))
    k.point_light(8.6, 9.8, 1.3, '#a080ff', 8, radius=0.2)
with k.variant('g_genart', 'off'):
    sheet(8.6, 9.3, 0.9, 0.5, 1.75)
k.solid(8.2, 9.0, 9.0, 9.7)
with k.variant('g_pachinko', 'on'):
    Y.pachinko_machine(k, 16.0, 5.0, '#6a2c0c', '#ffc030')
with k.variant('g_pachinko', 'off'):
    sheet(16.0, 5.3, 0.9, 0.62, 2.15)
k.solid(15.55, 5.0, 16.45, 5.62)

# ---- light -----------------------------------------------------------------------------------------
k.point_light(4.5, 7.0, 2.6, '#ffc890', 60, radius=0.6)
k.point_light(10.0, 6.5, 2.6, '#ffc890', 50, radius=0.6)
k.point_light(14.5, 8.0, 2.6, '#ffc890', 50, radius=0.6)
k.point_light(8.5, 10.3, 2.3, '#c0a0ff', 20, radius=0.4)
k.render(OUT, light_states={'full': {'pulse': 1.0, 'flicker': 1.0}, 'dim': {'pulse': 0.6, 'flicker': 0.8}}, light_samples=128,
         world_light=('#2a2438', 0.45))

# ---- the world -------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Game Room', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'gameroom', 'fixedCamera': True,
          'spawns': {'player': [1, 8]}, 'leaveLabel': '&#8592; BRIDGE', 'leaveTo': 'bridge'})


TITLES = {'runouts': 'RUNOUTS', 'asteroids': 'ASTEROIDS', 'helicopter': 'HELICOPTER', 'breakout': 'BREAKOUT',
          'space-invaders': 'INVADERS', 'missile-command': 'MISSILE CMD', 'splice': 'SPLICE', 'chess': 'CHESS',
          'cipher-room': 'CIPHER', 'typist': 'SIGNAL RELAY', 'genart': 'THE CANVAS', 'pachinko': 'PACHINKO'}


def slot(x, y, key):
    return {'x': x, 'y': y, 'type': 'game_slot', 'game': key, 'label': TITLES[key], 'prompt': 'PRESS E TO PLAY'}


w['interactions'] = [
    {'x': 0, 'y': 7, 'type': 'enter_world', 'target': 'bridge', 'spawn': [18, 7], 'label': 'BRIDGE', 'prompt': 'ENTER BRIDGE',
     'noBeacon': True},
    {'x': 0, 'y': 8, 'type': 'enter_world', 'target': 'bridge', 'spawn': [18, 7], 'label': 'BRIDGE', 'prompt': 'ENTER BRIDGE',
     'noBeacon': True},
] + [slot(int(cx), 4, key) for key, art, cx, col in CABS] + [
    slot(13, 4, 'splice'), slot(4, 8, 'chess'), slot(11, 8, 'cipher-room'), slot(14, 8, 'typist'), slot(8, 9, 'genart'), slot(16, 5, 'pachinko'),
    {'x': 15, 'y': 4, 'type': 'game_scores', 'label': 'SCORE BOARD', 'prompt': 'PRESS E TO READ'},
    {'x': 16, 'y': 4, 'type': 'game_scores', 'label': 'SCORE BOARD', 'prompt': 'PRESS E TO READ'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(15.2, RF, 16.6, RF + 0.3)                  # under the score board
apply_world(WORLD, k, (1, 4, 16, 10), doors=[(0, 7), (0, 8)], scene_id='gameroom',
            scene_extra={'flicker': {'mode': 'pulse'}, 'layers': {}})
print('gameroom done')
