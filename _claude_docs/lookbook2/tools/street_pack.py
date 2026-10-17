#!/usr/bin/env python3
"""Arcadia's wet street: pack.py keeps reflections only on water, so this packs the street's own.

  python3 street_pack.py <render dir> <asset dir>

Writes into the asset dir (beside pack.py's files):
  street_refl.png   the mirror pass on the street (flat colours), alpha = how wet: puddles 255, the paving ~120
  street_glow.png   the lit things alone in the mirror (neon, windows, lamps), same alpha
  street_mask.png   alpha = the wet mask (for clipping the ripple, rings and splashes)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

R, OUT = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(R, 'render.json')))
idp = np.array(Image.open(os.path.join(R, 'id.png')).convert('RGB')).astype(np.int64)
key = idp[..., 0] * 65536 + idp[..., 1] * 256 + idp[..., 2]
H, W = key.shape
puddle, road, paving = [], [], []
for k, name in meta['ids'].items():
    r, g, b = [int(v) for v in k.split(',')]
    kk = r * 65536 + g * 256 + b
    if 'puddle' in name:
        puddle.append(kk)
    elif name in ('road', 'road_paint', 'crosswalk'):
        road.append(kk)
    elif name in ('floor', 'gutter', 'drain', 'kerb', 'carpet', 'manhole', 'grate'):
        paving.append(kk)
wet = np.zeros((H, W), np.float32)
wet[np.isin(key, paving)] = 0.42
wet[np.isin(key, road)] = 0.62
wet[np.isin(key, puddle)] = 1.0
alb = np.array(Image.open(os.path.join(R, 'albedo.png')).convert('RGBA'))
wet[alb[..., 3] < 128] = 0


def keyed(name):
    p = os.path.join(R, name)
    if not os.path.exists(p):
        return None
    a = np.array(Image.open(p).convert('RGB')).astype(np.int64)
    sky = ((a[..., 0] > 200) & (a[..., 1] < 60) & (a[..., 2] > 200)) | (a.sum(-1) < 6)
    return a, sky


rf = keyed('refl.png')
if rf is not None:
    a, sky = rf
    al = np.where(sky, 0, wet * 255)
    Image.fromarray(np.dstack([a, al]).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'street_refl.png'), optimize=True)
gl = keyed('refl_glow.png')
if gl is not None:
    a, sky = gl
    lit = a.sum(-1) > 30
    al = np.where(lit & ~sky, wet * 255, 0)
    Image.fromarray(np.dstack([a, al]).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'street_glow.png'), optimize=True)
m = np.zeros((H, W, 4), np.uint8)
m[..., 3] = (wet * 255).astype(np.uint8)
Image.fromarray(m, 'RGBA').save(os.path.join(OUT, 'street_mask.png'), optimize=True)
print('street packed', OUT, 'puddle px', int((wet >= 1).sum()), 'paving px', int(((wet > 0) & (wet < 1)).sum()))
