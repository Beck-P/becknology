#!/usr/bin/env python3
"""Look Book 2: pack a lookkit.py G-buffer into the page's assets.

  python3 pack.py <render dir> <asset dir>

Writes (all 8-bit PNG, same size):
  albedo.png   flat colours, alpha = coverage
  emis.png     self-lit colour (lamp glass, windows, neon), black elsewhere
  sky.png      R: sky light (white dome, with occlusion), G: lamps' light luminance... (see below)
  sunA.png     R, G, B = suns 0, 1, 2      sunB.png  R, G, B = suns 3, 4, 5
  lamps.png    the lamps' coloured light
  norm.png     world normal (x, y, z) * 0.5 + 0.5
  info.png     R: tree code (leaf pass G), G: flags (1 leaf, 2 needle, 4 grass, 8 water, 16 ground, 32 roof), B: line strength
  refl.png     mirror colours on the water (alpha = covered), when rendered
  meta.json    sizes, suns, light encoding
Light encoding: stored v = sqrt(min(1, L / 4)) * 255, where L is irradiance relative to a white surface (1 = lit like
the white sky dome on open ground). Decode L = (v / 255)^2 * 4.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

R, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(R, 'render.json')))


def load(name, mode=None):
    p = os.path.join(R, name)
    if not os.path.exists(p):
        return None
    im = Image.open(p)
    if mode:
        im = im.convert(mode)
    return np.array(im)


def load16(name):
    p = os.path.join(R, name)
    if not os.path.exists(p):
        return None
    a = np.array(Image.open(p)).astype(np.float32)
    mx = 65535.0 if a.max() > 255 else 255.0
    return a / mx


def save(a, name, mode=None):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), mode).save(os.path.join(OUT, name), optimize=True)


GAIN = 4.0 / 0.8      # undo the -2 stop exposure, and the white diffuse's 0.8 albedo


def enc(L):
    return np.sqrt(np.clip(L / 4.0, 0, 1)) * 255.0


alb = load('albedo.png', 'RGBA')
H, W = alb.shape[:2]
cover = alb[..., 3]
save(alb, 'albedo.png', 'RGBA')
emi = load('emission.png', 'RGB')
save(emi, 'emis.png', 'RGB')


def lum(name):
    a = load16(name)
    if a is None:
        return np.zeros((H, W), np.float32)
    a = a[..., :3] if a.ndim == 3 else a
    if a.ndim == 3:
        a = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    return a * GAIN


sky = lum('light_sky.png')
save(np.dstack([enc(sky)] * 3), 'sky.png', 'RGB')
suns = [lum('light_sun%d.png' % i) for i in range(len(meta['suns']))]
while len(suns) < 6:
    suns.append(np.zeros((H, W), np.float32))
save(np.dstack([enc(s) for s in suns[:3]]), 'sunA.png', 'RGB')
save(np.dstack([enc(s) for s in suns[3:6]]), 'sunB.png', 'RGB')
lp = load16('light_lamps.png')
if lp is not None:
    lp = lp[..., :3] * GAIN
    save(enc(lp), 'lamps.png', 'RGB')
nrm = load('normal.png', 'RGB')
save(nrm, 'norm.png', 'RGB')

# flags from the leaf pass and the part names
leaf = load('leaf.png', 'RGB')
flags = np.zeros((H, W), np.uint8)
tree = np.zeros((H, W), np.uint8)
if leaf is not None:
    lr, lg, lb = leaf[..., 0].astype(int), leaf[..., 1].astype(int), leaf[..., 2].astype(int)
    flags |= np.where(lr > 200, 1, 0).astype(np.uint8)
    flags |= np.where(lb > 200, 2, 0).astype(np.uint8)
    flags |= np.where((lr > 40) & (lr < 100), 4, 0).astype(np.uint8)
    flags |= np.where((lb > 40) & (lb < 100), 8, 0).astype(np.uint8)
    tree = np.where((lr > 200) | (lb > 200), lg, 0).astype(np.uint8)
idp = load('id.png', 'RGB')
ids = meta.get('ids', {})
key = idp[..., 0].astype(np.int64) * 65536 + idp[..., 1].astype(np.int64) * 256 + idp[..., 2]
GROUND = ('ground', 'grass', 'meadow', 'turf', 'path', 'dirt', 'sand', 'earth', 'snow', 'coast', 'lip', 'cobble', 'flag',
          'paving', 'road', 'street', 'floor', 'rug', 'water', 'pond', 'stream', 'mud', 'soil', 'field', 'track', 'moss', 'drift')
ROOF = ('roof', 'shingle', 'slate', 'thatch', 'ridge', 'tile')
ground_keys, roof_keys = [], []
for k, name in ids.items():
    r, g, b = [int(v) for v in k.split(',')]
    kk = r * 65536 + g * 256 + b
    n = name.lower()
    if any(w in n for w in GROUND):
        ground_keys.append(kk)
    if any(w in n for w in ROOF):
        roof_keys.append(kk)
flags |= np.where(np.isin(key, ground_keys) | ((flags & 12) > 0), 16, 0).astype(np.uint8)
flags |= np.where(np.isin(key, roof_keys), 32, 0).astype(np.uint8)

# lines: where a part sits in front of a different one (depth jump), never inside the ground; and round the silhouette
dep = load16('depth.png')
if dep.ndim == 3:
    dep = dep[..., 0]
line = np.zeros((H, W), np.float32)
ground = (flags & 16) > 0
covered = cover > 128
for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
    k2 = np.roll(key, (dy, dx), (0, 1))
    d2 = np.roll(dep, (dy, dx), (0, 1))
    c2 = np.roll(covered, (dy, dx), (0, 1))
    g2 = np.roll(ground, (dy, dx), (0, 1))
    zr = meta['zmax'] - meta['zmin']
    farther = (d2 - dep) * zr > 0.06                 # the neighbour is behind me by more than ~a twentieth of a tile
    edge = covered & ~ground & (key != k2) & (farther | ~c2)
    line = np.maximum(line, np.where(edge, 1.0, 0.0))
    crease = covered & ~ground & ~g2 & (key != k2) & ~farther & c2
    line = np.maximum(line, np.where(crease, 0.45, 0.0))
line[0, :] = line[-1, :] = 0
line[:, 0] = line[:, -1] = 0
save(np.dstack([tree, flags, line * 255]), 'info.png', 'RGB')

refl = load('refl.png', 'RGBA')
if refl is not None:
    # only where the water is: the water parts' flag, or (coasts) below the waterline
    water = (flags & 8) > 0
    if meta.get('waterZ') is not None:
        hgt = load16('height.png')
        hgt = hgt[..., 0] if hgt.ndim == 3 else hgt
        z = (hgt * 2 - 1) * meta['heightRange']
        water |= covered & (z < meta['waterZ'] - 0.01)
        flags |= np.where(water, 8, 0).astype(np.uint8)
        save(np.dstack([tree, flags, line * 255]), 'info.png', 'RGB')
    rr, rg, rb = refl[..., 0].astype(int), refl[..., 1].astype(int), refl[..., 2].astype(int)
    sky = ((rr > rg + 50) & (rb > rg + 50)) | ((rr + rg + rb) < 6)      # the mirrored sky (magenta key, soft edges too; black in older renders)
    refl[..., 3] = np.where(water & ~sky, refl[..., 3], 0)
    save(refl, 'refl.png', 'RGBA')
    rg = load('refl_glow.png', 'RGB')
    if rg is not None:
        lit = water & (rg.astype(int).sum(-1) > 30)
        save(np.dstack([rg, np.where(lit, 255, 0)]), 'reflglow.png', 'RGBA')

out = {
    'w': W, 'h': H, 'ts': meta['ts'], 'crop': meta['crop'], 'scene': meta['scene'],
    'suns': [s['hour'] for s in meta['suns']], 'sunDirs': [s['dir'] for s in meta['suns']],
    'lamps': lp is not None, 'refl': refl is not None, 'waterZ': meta.get('waterZ'),
    'reflGlow': os.path.exists(os.path.join(OUT, 'reflglow.png')),
}
json.dump(out, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
print('packed', OUT, W, 'x', H, 'lamps' if out['lamps'] else '', 'refl' if out['refl'] else '')
