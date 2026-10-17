"""Quick look at the main street's bakery and inn: today's kit (top) and the richer one (bottom), lit by one golden sun
and the sky — a fast check of shapes before the full village render.

  ~/BVENV/bin/python village/preview_street.py <out.png>
"""
import os
import sys

REPO = '/home/user/becknology'
sys.path.insert(0, os.path.join(REPO, 'tools', 'bridge-art'))
import bpy  # noqa: E402,F401
import scenekit  # noqa: E402

OUT = sys.argv[1]
scenekit.TS = 32
sys.argv = [sys.argv[0], '/tmp/none']
import assets_town as W  # noqa: E402
import assets_village as V  # noqa: E402
orig_house = W.house
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'richer.py')).read().split('W.house = rich_house')[0]
exec(compile(src, 'richer.py', 'exec'))

k = scenekit.Kit(16, 19, margin_top=2.2, margin_bottom=0.3, seed=1907)
k.box(-1, -2.5, -0.1, 17, 19.5, 0.0, ('#5a8a3a', 0.1), 'grass')
for (fn, dr) in ((orig_house, 0.0), (rich_house, 9.5)):
    F = 7.2 + dr
    k.box(-1, F + 0.2, -0.05, 17, F + 2.0, 0.01, ('#b08a5a', 0.1), 'path')
    fn(k, 0.2, 5.0, 2.2 + dr, F, wall_h=2.3, rise=1.4, roof='#b85a3a', wall='#f4e8c8', door_x=1.8, windows=[(0.7, 0.9)], chimney=0.8)
    V.shop_window(k, 2.6, 4.6, F + 0.02, 0.45, 1.35, frame='#6a3a22', goods=('#c89048', '#e0b060', '#a86a30', '#f0d8a0'))
    V.board_sign(k, 'The Crusty Loaf', 'Pacifico', 2.6, F + 0.03, 1.72, size=0.2, board='#f0e0c0', ink='#7a3a1a', trim='#8a5030')
    W.hanging_sign(k, 4.75, F, 1.9, icon='bread')
    W.bench(k, 3.0, 4.5, F + 0.75)
    fn(k, 6.4, 14.2, 1.0 + dr, F, wall_h=2.9, rise=1.9, roof='#c4a25a', wall='#efe2c6', timber='#4a3020', door_x=10.3,
       windows=[(7.7, 0.85), (12.9, 0.85)], windows_up=[(7.7, 2.15), (10.3, 2.2), (12.9, 2.15)], chimney=13.4)
    V.board_sign(k, 'THE HAYLOFT', 'Rye', 10.3, F + 0.03, 1.78, size=0.22)
    W.hanging_sign(k, 14.35, F, 2.1, icon='mug')
    for x in (9.2, 11.4):
        W.planter(k, x - 0.45, x + 0.45, F + 0.18, flowers=('#e05070', '#f0d040', '#f0f0f0'))
for fn in k.later:
    fn()
k._camera()
k._world_default = ('#a8c4e0', 0.85)
sc = k.scene
sc.world.use_nodes = True
k._sky(None)
k._assign('albedo'); k._settings(1); k._render('/tmp/claude-0/pvs_alb.png')
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k._assign('light', {}); k._settings(16, raw=True, sixteen=True); k._render('/tmp/claude-0/pvs_light.png')
print('passes written')
