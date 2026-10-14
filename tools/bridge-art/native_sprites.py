#!/usr/bin/env python3
"""Convert the bridge's big painted PNGs into native-resolution sprites.

The bridge renders every world at 32 native pixels per tile (see
apps/bridge/js/world.js). The building / prop / creature PNGs are painted at
~1000px, so this tool shrinks each one to exactly the size it occupies on the
32px grid, keeping its aspect ratio, and writes:

  apps/bridge/assets/native/<key>.png   — the native sprite
  apps/bridge/assets/native/manifest.js — sizes, loaded before sprite-loader.js

The downscale is palette-aware rather than an average, so outlines stay dark
and crisp instead of turning to mush:
  1. strip the white/cream halo image generators leave (and, for the neon
     Arcadia set, flood-fill away the dark matte from the edges)
  2. quantize the full-res art to a shared palette
  3. each native pixel takes the most common palette colour in its block,
     preferring glowing colours (neon, windows, forge light) when they cover
     a decent share of the block, and darker colours (outlines) when they
     nearly tie with the winner

Run from the repo root:  python3 tools/bridge-art/native_sprites.py [key ...]
Requires numpy + Pillow.
"""
import colorsys
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(ROOT, 'apps', 'bridge', 'assets')
OUT = os.path.join(ASSETS, 'native')
NATIVE_TS = 32  # native px per tile — keep in sync with world.js

# key: (source path under assets/, footprint width in tiles, matte flood?[, opts])
# The footprint width is the `tilesW` the world code draws the sprite at.
# opts: {'max_h': tiles} shrinks the sprite (aspect kept) if it would be
# taller than that — for art whose true proportions crowd its neighbours.
MANIFEST = {
    # Lumar
    'tavern':            ('buildings/tavern.png', 4, False),
    'inn':               ('buildings/inn.png', 5, False),
    'lighthouse':        ('buildings/lighthouse.png', 3, False),
    'smithy':            ('buildings/smithy.png', 3, False),
    'apothecary':        ('buildings/apothecary.png', 3, False),
    'bakery':            ('buildings/bakery.png', 3, False),
    'fishmonger-stall':  ('buildings/fishmonger-stall.png', 3, False),
    'ship-dock':         ('buildings/ship-dock.png', 7, False),
    'bell-tower':        ('buildings/bell-tower.png', 2, False),
    'sorceress-tower':   ('buildings/sorceress-tower.png', 3, False),
    'fountain':          ('props/fountain.png', 3, False),
    'bulletin-board':    ('props/bulletin-board.png', 2, False),
    'market-cart':       ('props/market-cart.png', 3, False),
    'crates-barrels':    ('props/crates-barrels.png', 2, False),
    # Arcadia (neon set — dark mattes)
    'arcade-sign':          ('buildings/arcade-sign.png', 5, True),
    'arcadia-shop':         ('buildings/arcadia-shop.png', 4, True),
    'neon-ramen-stand':     ('buildings/neon-ramen-stand.png', 3, True),
    'holo-billboard-kiosk': ('buildings/holo-billboard-kiosk.png', 3, True),
    'token-kiosk':          ('buildings/token-kiosk.png', 2, True),
    'hover-bike-dock':      ('buildings/hover-bike-dock.png', 2, True),
    'arcade':               ('buildings/arcade.png', 5, True),
    'cyber-noodle-bar':     ('buildings/cyber-noodle-bar.png', 3, True),
    'tech-repair-shop':     ('buildings/tech-repair-shop.png', 3, True),
    'chrome-clinic':        ('buildings/chrome-clinic.png', 4, True),
    'junk-pawn-shop':       ('buildings/junk-pawn-shop.png', 3, True),
    # Ship / misc
    'captain-workstation': ('props/captain-workstation.png', 3, False, {'max_h': 2.3}),
    'dragon':              ('creatures/dragon.png', 3, False),
    # Docked ship in Enigma / Singularity: fit to 90% of a 3-tile width.
    'ship-docked':         ('ship-docked.png', 2.7, False),
}

PALETTE_SIZE = 64


def load_rgba(path):
    im = Image.open(path).convert('RGBA')
    return np.array(im, dtype=np.uint8)


def strip_halo(a):
    """Same rules as the old runtime loader: kill white/cream background."""
    rgb = a[..., :3].astype(np.int32)
    al = a[..., 3].astype(np.int32)
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    sat = mx - mn
    tot = rgb.sum(-1)
    kill = (mx > 230) & (sat < 25)
    kill |= (al < 230) & (mx > 200) & (sat < 40)
    kill |= (mx > 215) & (sat < 18) & (tot > 620)
    a = a.copy()
    a[..., 3][kill & (al > 0)] = 0
    return a


def flood_matte(a, tol=50):
    """Remove a dark matte connected to the image edges (Arcadia PNGs)."""
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(np.int32)
    al = a[..., 3]
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    edge_a = np.concatenate([al[0], al[-1], al[:, 0], al[:, -1]])
    samples = edge[edge_a > 80]
    if len(samples) < 8:
        return a
    clusters = []
    for s in samples[:: max(1, len(samples) // 512)]:
        for c in clusters:
            if ((s - c[0]) ** 2).sum() < 35 * 35:
                c[0] = (c[0] * c[1] + s) / (c[1] + 1)
                c[1] += 1
                break
        else:
            if len(clusters) < 4:
                clusters.append([s.astype(np.float64), 1])
    n = sum(c[1] for c in clusters)
    mattes = [c[0] for c in clusters if c[1] >= max(3, n * 0.08)]
    if not mattes:
        return a
    d2 = np.min([((rgb - m) ** 2).sum(-1) for m in mattes], axis=0)
    candidate = (d2 < tol * tol) | (al == 0)
    reached = np.zeros((h, w), bool)
    reached[0, :] = candidate[0, :]
    reached[-1, :] |= candidate[-1, :]
    reached[:, 0] |= candidate[:, 0]
    reached[:, -1] |= candidate[:, -1]
    while True:
        grow = reached.copy()
        grow[1:, :] |= reached[:-1, :]
        grow[:-1, :] |= reached[1:, :]
        grow[:, 1:] |= reached[:, :-1]
        grow[:, :-1] |= reached[:, 1:]
        grow &= candidate
        if (grow == reached).all():
            break
        reached = grow
    a = a.copy()
    a[..., 3][reached] = 0
    return a


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def is_emissive(c):
    _, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c))
    return l > 0.55 and s > 0.55


def native_downscale(a, tw, th):
    h, w = a.shape[:2]
    opaque = a[..., 3] >= 128
    # Quantize opaque pixels to a palette. Transparent pixels get the mean
    # opaque colour so they don't steal a palette slot.
    rgb = a[..., :3].copy()
    if opaque.any():
        rgb[~opaque] = rgb[opaque].mean(0).astype(np.uint8)
    q = Image.fromarray(rgb, 'RGB').quantize(
        colors=PALETTE_SIZE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[: PALETTE_SIZE * 3], dtype=np.int32).reshape(-1, 3)
    idx = np.array(q, dtype=np.int32)
    emis = np.array([is_emissive(c) for c in pal])
    lums = np.array([lum(c) for c in pal])

    xs = np.linspace(0, w, tw + 1).round().astype(int)
    ys = np.linspace(0, h, th + 1).round().astype(int)
    out = np.zeros((th, tw, 4), np.uint8)
    for j in range(th):
        for i in range(tw):
            blk_o = opaque[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
            total = blk_o.size
            n_op = int(blk_o.sum())
            if total == 0 or n_op * 2 < total:
                continue
            counts = np.bincount(idx[ys[j]:ys[j + 1], xs[i]:xs[i + 1]][blk_o], minlength=len(pal))
            order = np.argsort(-counts)
            pick = order[0]
            em_counts = np.where(emis, counts, 0)
            best_em = int(np.argmax(em_counts))
            if em_counts[best_em] >= total * 0.22:
                pick = best_em
            else:
                for k in order[1:3]:
                    if counts[k] >= counts[pick] * 0.5 and lums[k] < lums[pick] - 45:
                        pick = k
            out[j, i, :3] = pal[pick]
            out[j, i, 3] = 255
    return out


def convert(key):
    src, tiles_w, matte, *rest = MANIFEST[key]
    opts = rest[0] if rest else {}
    a = load_rgba(os.path.join(ASSETS, src))
    a = strip_halo(a)
    if matte:
        a = flood_matte(a)
    h, w = a.shape[:2]
    tw = int(round(tiles_w * NATIVE_TS))
    th = int(round(tw * h / w))
    if 'max_h' in opts and th > opts['max_h'] * NATIVE_TS:
        th = int(round(opts['max_h'] * NATIVE_TS))
        tw = int(round(th * w / h))
    out = native_downscale(a, tw, th)
    # Empty rows under the art: the runtime drops the sprite by this much so
    # the building sits on the ground instead of hovering.
    rows = np.where(out[..., 3].any(1))[0]
    pad_b = int(th - 1 - rows.max()) if len(rows) else 0
    Image.fromarray(out, 'RGBA').save(os.path.join(OUT, key + '.png'), optimize=True)
    return {'w': tw, 'h': th, 'padB': pad_b, 'src': src}


def main():
    os.makedirs(OUT, exist_ok=True)
    keys = sys.argv[1:] or list(MANIFEST)
    man_path = os.path.join(OUT, 'manifest.js')
    manifest = {}
    if os.path.exists(man_path):
        txt = open(man_path).read()
        manifest = json.loads(txt[txt.index('{'): txt.rindex('}') + 1])
    for k in keys:
        manifest[k] = convert(k)
        print(f'{k:22s} -> {manifest[k]["w"]}x{manifest[k]["h"]}')
    with open(man_path, 'w') as f:
        f.write('// Generated by tools/bridge-art/native_sprites.py — do not edit.\n')
        f.write('// Native-resolution (32px/tile) sprite sizes, keyed by sprite name.\n')
        f.write('window.BridgeNativeSprites = ')
        f.write(json.dumps(dict(sorted(manifest.items())), indent=2))
        f.write(';\n')


if __name__ == '__main__':
    main()
