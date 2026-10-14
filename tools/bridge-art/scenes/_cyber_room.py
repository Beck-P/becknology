"""Shared bits for the 14 × 11 Arcadia interiors (floor cols 1-12, rows 2-8;
back wall at row 2; doorway at cols 6-7 of the front wall)."""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402,F401
import assets_cyber as Y                       # noqa: E402,F401
import assets_lumar as A                       # noqa: E402,F401
import assets_ship as P                        # noqa: E402,F401

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
H = 2.3 / math.cos(THETA)
FLOOR = (1, 2, 12, 8)
DOORS = [(6, 9), (7, 9)]


def world_path(name):
    return os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', name + '.json')


def new_kit(seed):
    return Kit(14, 11, margin_top=1.0, margin_bottom=0.5, seed=seed)


def render(k, out, samples=128, ambient=('#2a2040', 0.4)):
    return k.render(out, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}},
                    light_samples=samples, world_light=ambient)
