#!/usr/bin/env python3
"""Postcard step 3: bake the camera move's frames (side_render.py move) into one strip the page plays as a cutscene.

  python3 move_bake.py <render dir>/move-<32|48> <asset dir> [--steps 9]

Each frame is lit for golden hour the way relight.js lights a scene (the white sky dome tinted by the sky, the low gold
sun with its shadows), its light snapped to a few steps, outlines left to the 3D: flat colour × light. Where nothing
was rendered (the sky) the strip is transparent, so the page draws its live sky behind. Writes strip.png (frames in a
grid, COLS across) and strip.json ({w, h, cols, n, horizons}).
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
STEPS = int(sys.argv[sys.argv.index('--steps') + 1]) if '--steps' in sys.argv else 9
os.makedirs(OUT, exist_ok=True)
frames = json.load(open(os.path.join(SRC, 'frames.json')))
GAIN = 4.0 / 0.8


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def mix(a, b, t):
    return a + (b - a) * t


# golden hour (18:12) as relight.js's light model has it
sky_top, sky_hor = hexc('#7896d6'), hexc('#ffc68c')
golden = 0.85
sky_c = mix(mix(sky_top, sky_hor, 0.45), np.ones(3, np.float32), 0.55)
sky_c /= (0.2126 * sky_c[0] + 0.7152 * sky_c[1] + 0.0722 * sky_c[2])
sun_c = mix(hexc('#fff4e4'), hexc('#ffc27e'), golden)
SKY, SUN = 0.62, 1.3
tint_w = mix(sky_top, sky_hor, 0.2 + 0.45 * golden)
WATER = mix(hexc('#24687e'), tint_w, 0.21 + 0.22 * golden)


def load16(p):
    a = np.array(Image.open(p)).astype(np.float32)
    a = a / (65535.0 if a.max() > 255 else 255.0)
    if a.ndim == 3:
        a = a[..., :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    return a * GAIN


tiles = []
for fr in frames:
    d = os.path.join(SRC, 'f%02d' % fr['f'])
    alb = np.array(Image.open(os.path.join(d, 'albedo.png')).convert('RGBA')).astype(np.float32) / 255
    sky = load16(os.path.join(d, 'light_sky.png'))
    sun = load16(os.path.join(d, 'light_sun0.png'))
    leaf = np.array(Image.open(os.path.join(d, 'leaf.png')).convert('RGB'))
    water = (leaf[..., 2] > 40) & (leaf[..., 2] < 100)
    L = SKY * sky[..., None] * sky_c + SUN * sun[..., None] * sun_c
    lum = L @ np.array([0.2126, 0.7152, 0.0722], np.float32) + 1e-5
    b = 1.1 * (1 - np.exp(-lum))
    b = np.round(b * STEPS) / STEPS
    tint = 1 + (L / lum[..., None] - 1) * 0.7
    rgb = alb[..., :3] * b[..., None] * tint
    rgb[water] = WATER * 1.04
    out = np.dstack([np.clip(rgb, 0, 1) * 255, alb[..., 3:4] * 255]).astype(np.uint8)
    tiles.append(out)

h, w = tiles[0].shape[:2]
cols = 7
rows = math.ceil(len(tiles) / cols)
strip = np.zeros((rows * h, cols * w, 4), np.uint8)
for i, t in enumerate(tiles):
    r, c = divmod(i, cols)
    strip[r * h:(r + 1) * h, c * w:(c + 1) * w] = t
Image.fromarray(strip, 'RGBA').save(os.path.join(OUT, 'strip.png'), optimize=True)
json.dump({'w': w, 'h': h, 'cols': cols, 'n': len(tiles), 'horizons': [f['horizon'] for f in frames]},
          open(os.path.join(OUT, 'strip.json'), 'w'), indent=1)
print('baked', len(tiles), 'frames', w, 'x', h, '→', OUT)
