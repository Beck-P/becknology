"""Shared bits for Ashcombe House (world ids "lumar-manor" and its rooms, "lumar-manor-<room>"; js/home.js, js/estate.js)
and the Starling's lobby: the rooms are lit by candles and fire at night and by their tall windows in the day.

Each renders three light states — `full` and `dim` (night: the lamps and fires, the moon at the windows; the engine
flickers between them) and `day` (the sun through the windows, the lamps out, the fires low) — and `render()` writes the
`cycle` the engine blends them by (js/scene.js, by Lumar's clock). The window glass is a hole in the render: js/estate.js
paints the live sky (and the harbour) in it from `scene.windows`.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402,F401
import assets_estate as E                               # noqa: E402,F401
import assets_lumar as A                                # noqa: E402,F401

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
C45 = math.cos(THETA)
NIGHT = {'flicker': 1.0, 'lamp': 1.0, 'sun': 0.0, 'moon': 1.0, 'static': 1.0}
DIM = {'flicker': 0.72, 'lamp': 1.0, 'sun': 0.0, 'moon': 1.0, 'static': 1.0}
DAY = {'flicker': 0.5, 'lamp': 0.1, 'sun': 1.0, 'moon': 0.0, 'static': 0.55, '_emit': 0.5, '_world': ('#c4ccdc', 0.55)}


def world_path(wid):
    return os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', wid + '.json')


def preview(k):
    """PREVIEW=n: every pass (the character-light probes too) at no more than n samples — a quick look while laying a
    room out. Never for the render that ships."""
    n = int(os.environ.get('PREVIEW', 0) or 0)
    if n:
        settings = k._settings
        k._settings = lambda samples, **kw: settings(min(samples, n), **kw)


def render(k, out, ambient=('#38405a', 0.45), day_world=None):
    """Renders the night and day light states and writes the cycle into render.json (scene_post.py carries it into
    scene.json)."""
    day = dict(DAY)
    if day_world:
        day['_world'] = day_world
    samples = int(os.environ.get('SAMPLES', 96))
    preview(k)
    meta = k.render(out, light_states={'full': dict(NIGHT), 'dim': dict(DIM), 'day': day}, light_samples=samples, world_light=ambient)
    if meta is None:                                    # SCENE_NORENDER: the world JSON only
        return
    p = os.path.join(out, 'render.json')
    m = json.load(open(p))
    m['cycle'] = {'day': 'day', 'night': 'full'}
    json.dump(m, open(p, 'w'), indent=1)


def look(label, x, y, text, prompt='PRESS E TO LOOK', **kw):
    it = {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}
    it.update(kw)
    return it


def door(label, x, y, target, spawn, prompt='PRESS E TO GO THROUGH'):
    return {'x': x, 'y': y, 'type': 'enter_world', 'target': target, 'spawn': spawn, 'label': label, 'prompt': prompt}


def write_world(wid, name, cols, rows, spawn, interactions, k, floor, doors, windows, tileset='lumar-home', extra=None):
    """The world JSON for one of the rooms: its interactions, then apply_world for the collisions, the scene block
    with its windows onto the live sky."""
    path = world_path(wid)
    w = json.load(open(path)) if os.path.exists(path) else {}
    w.update({'name': name, 'width': cols, 'height': rows, 'tileSize': 16, 'tileset': tileset, 'spawns': {'player': spawn},
              'tiles': [[1] * cols for _ in range(rows)], 'collisions': [[1] * cols for _ in range(rows)], 'shipExit': False})
    w['interactions'] = interactions
    open(path, 'w').write(json.dumps(w, indent=2) + '\n')
    sx = {'windows': windows}
    sx.update(extra or {})
    apply_world(path, k, floor, doors=doors, scene_id=wid, scene_extra=sx)
