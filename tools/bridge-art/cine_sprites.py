"""Render the cutscene sprites (bpy): the mothership, the shuttle level / nose
down / nose up, each side-on, with anchor points for the engine code.

  BVENV/bin/python tools/bridge-art/cine_sprites.py RENDER_DIR [name ...]
  python3 tools/bridge-art/cine_post.py RENDER_DIR apps/bridge/assets/cine
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cinekit import CineKit       # noqa: E402
import assets_ship as P           # noqa: E402

OUT = sys.argv[1]
ONLY = set(sys.argv[2:])


def lights(k, key=3.2):
    k.sun((0.5, -0.25, -0.85), '#fff2e0', key)           # key from high upper left, a little in front
    k.sun((-0.6, 0.5, -0.2), '#6080c0', key * 0.25)     # cool rim from behind right


def shuttle(name, deg):
    k = CineKit((-1.3, 3.8, -1.6, 1.6, -0.6, 2.4), elev=10, ppt=24)
    P.shuttle(k, 0.0, 0.0, landed=False, ramp=False)
    for side, er in (('near', 0.55), ('far', -0.55)):
        k.anchor('exhaust_' + side, -0.43, er, 0.62)
    k.anchor('nose', 3.4, 0.0, 0.64)
    k.anchor('belly', 1.7, 0.0, 0.3)
    if deg:
        k.pitch(deg, (1.5, 0.0, 0.8))
    lights(k)
    k.render(os.path.join(OUT, name), light_states={'full': {}}, light_samples=64, world_light=('#202838', 0.35))


def mothership():
    L = 18.0
    k = CineKit((-2.0, 18.6, -3.4, 3.4, -0.3, 5.6), elev=12, ppt=16)
    P.mothership(k, 0.0, 0.0, L=L)
    for i, dz in enumerate((-0.75, 0.0, 0.75)):
        k.anchor('exhaust_%d' % i, -1.25, 0.0, 2.0 + dz)
    k.anchor('bay', 0.42 * L, 2.0, 1.55)
    k.anchor('nose', L, 0.0, 1.8)
    lights(k, 2.6)
    k.render(os.path.join(OUT, 'mothership'), light_states={'full': {}}, light_samples=64, world_light=('#202838', 0.3))


JOBS = {
    'shuttle': lambda: shuttle('shuttle', 0),
    'shuttle-down': lambda: shuttle('shuttle-down', -16),
    'shuttle-up': lambda: shuttle('shuttle-up', 16),
    'mothership': mothership,
}
for name, job in JOBS.items():
    if not ONLY or name in ONLY:
        job()
        print('rendered', name)
