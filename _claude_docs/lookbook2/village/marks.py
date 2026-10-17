#!/usr/bin/env python3
"""Where the chimneys are in a packed village render: the top of each stack (its pots) → meta.json 'smoke', in 32-px
native px (the scene file scales them), so the page can puff smoke from the real chimneys of either kit.

  python3 village/marks.py <render dir> <asset dir>
"""
import json
import os
import sys

import numpy as np
from PIL import Image

R, A = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(R, 'render.json')))
idp = np.array(Image.open(os.path.join(R, 'id.png')).convert('RGB')).astype(np.int64)
key = idp[..., 0] * 65536 + idp[..., 1] * 256 + idp[..., 2]
want = []
for k, name in meta['ids'].items():
    n = name.lower()
    if n in ('chimney', 'chimney_cap', 'chimney_pot', 'chimney_mouth'):
        r, g, b = [int(v) for v in k.split(',')]
        want.append(r * 65536 + g * 256 + b)
mask = np.isin(key, want)
pts = []
if mask.any():
    ys, xs = np.nonzero(mask)
    # group by column runs: chimneys are narrow and far apart
    order = np.argsort(xs)
    groups, cur = [], [order[0]]
    for i in order[1:]:
        if xs[i] - xs[cur[-1]] > 4:
            groups.append(cur); cur = [i]
        else:
            cur.append(i)
    groups.append(cur)
    s = 32 / meta['ts']
    for g in groups:
        if len(g) < 6:
            continue
        top = min(ys[i] for i in g)
        cx = float(np.mean([xs[i] for i in g if ys[i] <= top + 2]))
        pts.append([round(cx * s, 1), round((top - 1) * s, 1)])
m = json.load(open(os.path.join(A, 'meta.json')))
m['smoke'] = pts
json.dump(m, open(os.path.join(A, 'meta.json'), 'w'), indent=1)
print('smoke', pts)
