"""Render the cutscene sprites (bpy): the mothership, the shuttle level / nose
down / nose up, each side-on, with anchor points for the engine code. The
mothership comes as fitted too: `mothership-<module>[-<module>…]` for every
set of rooms fitted aft of her bridge (js/wayfarer.js), each a section longer.

  BVENV/bin/python tools/bridge-art/cine_sprites.py RENDER_DIR [name ...]
  python3 tools/bridge-art/cine_post.py RENDER_DIR apps/bridge/assets/cine
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cinekit import CineKit       # noqa: E402
import assets_ship as P           # noqa: E402
import assets_town as W           # noqa: E402

OUT = sys.argv[1]
ONLY = set(sys.argv[2:])


def lights(k, key=3.2):
    k.sun((0.5, -0.25, -0.85), '#fff2e0', key)           # key from high upper left, a little in front
    k.sun((-0.6, 0.5, -0.2), '#6080c0', key * 0.25)     # cool rim from behind right


def shuttle(name, deg):
    k = CineKit((-0.9, 4.0, -1.7, 1.7, -0.1, 2.2), elev=10, ppt=24)
    P.shuttle(k, 0.0, 0.0, landed=False, ramp=False)
    for side, er in (('near', 0.62), ('far', -0.62)):
        k.anchor('exhaust_' + side, -0.56, er, 0.62)
    k.anchor('nose', 3.78, 0.0, 0.76)
    k.anchor('belly', 1.7, 0.0, 0.45)
    if deg:
        k.pitch(deg, (1.5, 0.0, 0.8))
    lights(k)
    k.render(os.path.join(OUT, name), light_states={'full': {}}, light_samples=64, world_light=('#202838', 0.35))


def mothership(mods=()):
    L, M = 18.0, P.MOD_LEN * len(mods)
    k = CineKit((-1.8, 20.8 + M, -3.2, 3.2, -0.3, 9.2), elev=12, ppt=14)
    bay = P.mothership(k, 0.0, 0.0, L=L, mods=mods)['bay']
    for i, z in enumerate((2.95, 1.95)):
        k.anchor('exhaust_%d' % i, -1.45, 0.0, z)
    k.anchor('bay', *bay)
    k.anchor('nose', L + M + 2.4, 0.0, 3.5)
    lights(k, 2.6)
    k.render(os.path.join(OUT, '-'.join(('mothership',) + tuple(mods))), light_states={'full': {}}, light_samples=64,
             world_light=('#202838', 0.35))


MODULES = ('galley', 'observatory', 'greenhouse')       # her order, stern to bow (js/wayfarer.js ORDER)


def galleon():
    k = CineKit((-1.0, 11.2, -1.2, 1.2, -0.55, 6.6), elev=8, ppt=14)
    W.galleon(k, 0.0, 9.0, 0.0, beam=1.6, sails='set', waterline=False)
    k.anchor('waterline', 4.5, 0.8, 0.0)
    k.anchor('bow', 9.1, 0.4, 0.05)
    k.anchor('stern', 0.1, 0.4, 0.05)
    lights(k, 2.4)
    k.render(os.path.join(OUT, 'galleon'), light_states={'full': {}}, light_samples=64, world_light=('#283450', 0.45))


JOBS = {
    'galleon': galleon,
    'shuttle': lambda: shuttle('shuttle', 0),
    'shuttle-down': lambda: shuttle('shuttle-down', -16),
    'shuttle-up': lambda: shuttle('shuttle-up', 16),
    'mothership': mothership,
}
for _n in range(1, 1 << len(MODULES)):                  # every set of fitted rooms
    _m = tuple(m for i, m in enumerate(MODULES) if _n >> i & 1)
    JOBS['-'.join(('mothership',) + _m)] = (lambda m: lambda: mothership(m))(_m)
for name, job in JOBS.items():
    if not ONLY or name in ONLY:
        job()
        print('rendered', name)
