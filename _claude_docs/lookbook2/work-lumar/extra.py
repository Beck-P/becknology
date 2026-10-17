#!/usr/bin/env python3
"""Lumar's extra pass: how deep the water is under each water pixel (the sea is a mirror plane at the waterline over a
modelled seabed), so the page can show the sand through the shallows, darken the deep and lap foam at the edge.

  python3 extra.py <render dir> <asset dir>   → <asset dir>/wdepth.png  (gray: depth below the waterline, 0..1 tile → 0..250;
                                                 255 = not water)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

R, A = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(R, 'render.json')))
h = np.array(Image.open(os.path.join(R, 'height.png'))).astype(np.float32)
h = h / (65535.0 if h.max() > 255 else 255.0)
if h.ndim == 3:
    h = h[..., 0]
z = (h * 2 - 1) * meta['heightRange']
info = np.array(Image.open(os.path.join(A, 'info.png')))
water = (info[..., 1] & 8) > 0
d = np.clip(meta['waterZ'] - z, 0, 1)
out = np.where(water, np.round(d * 250), 255).astype(np.uint8)
Image.fromarray(out, 'L').save(os.path.join(A, 'wdepth.png'), optimize=True)
print('wdepth', A, 'water px', int(water.sum()), 'depth range', float(d[water].min()) if water.any() else None, float(d[water].max()) if water.any() else None)

# the mirror's sky is keyed magenta; pack.py keeps its anti-aliased fringe (pinkish pixels) — strip those too
rp = os.path.join(A, 'refl.png')
if os.path.exists(rp):
    rf = np.array(Image.open(rp).convert('RGBA')).astype(int)
    fringe = (rf[..., 0] > rf[..., 1] + 50) & (rf[..., 2] > rf[..., 1] + 50)
    rf[..., 3] = np.where(fringe, 0, rf[..., 3])
    Image.fromarray(rf.astype(np.uint8), 'RGBA').save(rp, optimize=True)
    print('refl fringe removed', int(fringe.sum()))

# inpaint: parts that glow at night (the trail stones, the sea glass) come out of the light passes black (lookkit renders
# glowing parts as emitters there, at strength 0), so by day they'd be black holes in the sand. Give them their
# neighbours' light.
al = np.array(Image.open(os.path.join(A, 'albedo.png')))[..., 3] > 8
P = {n: np.array(Image.open(os.path.join(A, n + '.png')).convert('RGB')).astype(np.int32) for n in ('sky', 'sunA', 'sunB', 'lamps') if os.path.exists(os.path.join(A, n + '.png'))}
dark = al & ~water & (P['sky'].sum(-1) == 0) & (P['sunA'].sum(-1) == 0) & (P['sunB'].sum(-1) == 0)
todo = dark.copy()
print('inpaint px', int(todo.sum()))
for it in range(12):
    if not todo.any():
        break
    got = np.zeros(todo.shape, bool)
    for n, a in P.items():
        acc = np.zeros(a.shape, np.int64); cnt = np.zeros(todo.shape, np.int64)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ok = ~np.roll(todo, (dy, dx), (0, 1))
            acc += np.where(ok[..., None], np.roll(a, (dy, dx), (0, 1)), 0); cnt += ok
        fill = todo & (cnt > 0)
        a[fill] = (acc[fill] / cnt[fill][:, None]).astype(np.int32)
        got |= fill
    todo &= ~got
for n, a in P.items():
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(A, n + '.png'), optimize=True)
