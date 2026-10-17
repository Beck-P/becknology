"""Quick look at the house kits: the two east cottages of Brambleford alone on a lawn, today's kit (left) and the richer
one (right), lit by one sun and the sky — a fast check of shapes before a full village render.

  ~/BVENV/bin/python village/preview.py <out.png> [ts]
"""
import math
import os
import sys


REPO = '/home/user/becknology'
sys.path.insert(0, os.path.join(REPO, 'tools', 'bridge-art'))
import bpy  # noqa: E402
import scenekit  # noqa: E402

OUT = sys.argv[1]
scenekit.TS = int(sys.argv[2]) if len(sys.argv) > 2 else 32
sys.argv = [sys.argv[0], '/tmp/none']
import assets_town as W  # noqa: E402
import assets_village as V  # noqa: E402
orig_house = W.house
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'richer.py')).read().split('W.house = rich_house')[0]
exec(compile(src, 'richer.py', 'exec'))     # defines rich_house etc. without running lookkit

k = scenekit.Kit(20, 7, margin_top=2.2, margin_bottom=0.3, seed=1907)
k.box(-1, -2.5, -0.1, 21, 7.5, 0.0, ('#5a8a3a', 0.1), 'grass')
F0 = 1.0
for (fn, dx) in ((orig_house, 0.0), (rich_house, 10.0)):
    fn(k, 0.4 + dx, 4.2 + dx, 1.6, 5.8, wall_h=2.1, rise=1.3, roof='#3a6a8a', wall='#e8dcc8', door_x=2.3 + dx,
       windows=[(1.2 + dx, 0.9), (3.4 + dx, 0.9)], chimney=1.0 + dx)
    fn(k, 5.0 + dx, 9.0 + dx, 2.0, 6.0, wall_h=2.2, rise=1.4, roof='#7a3a3a', wall='#b8a890', door_x=7.0 + dx,
       windows=[(5.9 + dx, 0.9), (8.1 + dx, 0.9)], chimney=8.4 + dx, stone=True)
    V.picket_fence(k, (0.2 + dx, 6.55), (2.0 + dx, 6.55))
    V.picket_fence(k, (2.6 + dx, 6.55), (4.4 + dx, 6.55))
for fn in k.later:
    fn()
k._camera()
k._world_default = ('#a8c4e0', 0.85)
sc = k.scene
sc.world.use_nodes = True
k._sky(None)
k._assign('albedo'); k._settings(1); k._render('/tmp/claude-0/pv_alb.png')
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k._assign('light', {}); k._settings(16, raw=True, sixteen=True); k._render('/tmp/claude-0/pv_light.png')
print('passes written')
