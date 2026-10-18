"""Shared bits for the Spires' rooms (arcadia-opera, arcadia-champagne, arcadia-members, arcadia-boutique): Arcadia is
always night, so each renders its lamplight in two states (`full`, `dim`: the candles and neon breathing); their
windows are HOLDOUT panes onto the Spires' night (stars, the smog sea below), drawn by js/spires.js from the world
JSON's `spires.windows`. PREVIEW=n renders every pass at no more than n samples for a quick look.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402,F401
import assets_spires as SP                             # noqa: E402,F401
import assets_estate as E                              # noqa: E402,F401
import assets_casino as CA                             # noqa: E402,F401
import assets_penthouse as PH                          # noqa: E402,F401
import assets_signs as S                               # noqa: E402,F401
from _manor import look, door, preview                 # noqa: E402,F401

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def world_path(wid):
    return os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', wid + '.json')


def render(k, out, ambient=('#2a2848', 0.45)):
    preview(k)
    return k.render(out, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}},
                    light_samples=int(os.environ.get('SAMPLES', 96)), world_light=ambient)


def out_door(x, y, spawn, label='THE SPIRES'):
    return {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'arcadia-spires', 'leaveSpawn': spawn, 'label': label,
            'prompt': 'PRESS E TO GO OUT'}


def write_world(wid, name, cols, rows, spawn, interactions, k, floor, doors, windows, actors=(), extra=None):
    path = world_path(wid)
    w = json.load(open(path)) if os.path.exists(path) else {}
    w.update({'name': name, 'width': cols, 'height': rows, 'tileSize': 16, 'tileset': 'arcadia', 'spawns': {'player': spawn},
              'tiles': [[1] * cols for _ in range(rows)], 'collisions': [[1] * cols for _ in range(rows)], 'shipExit': False,
              'interior': True})
    w['interactions'] = interactions
    open(path, 'w').write(json.dumps(w, indent=2) + '\n')
    for a in actors:
        k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
    apply_world(path, k, floor, doors=doors, scene_id=wid, actors=list(actors))
    w = json.load(open(path))
    w['spires'] = {'windows': windows}
    w['arcadia'] = {'level': 'spires'}
    w.update(extra or {})
    open(path, 'w').write(json.dumps(w, indent=2) + '\n')
    return w
