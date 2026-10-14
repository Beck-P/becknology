#!/usr/bin/env python3
"""Compose Blender scene passes (scenekit.render) into game assets.

  python3 tools/bridge-art/scene_post.py RENDER_DIR OUT_DIR

Writes to OUT_DIR:
  <state>.png   toon-shaded scene, one per light state (e.g. full / dim —
                the game cross-fades them to make firelight flicker)
  depth.png     engine depth packed in 16 bits (R = high byte, G = low)
  scene.json    size, origin, depth range, per-tile light for characters

Toon shading: final = albedo × band(light) + emission. Light luminance is
snapped to a few flat bands while keeping its hue, so warm firelight stays
warm. Lines are drawn where a part sits in front of another (id + depth) and
around the silhouette.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

# (luminance threshold, brightness) — tuned for night interiors
BANDS = [(0.0, 0.16), (0.035, 0.30), (0.10, 0.48), (0.22, 0.68), (0.42, 0.88), (0.75, 1.06)]
TINT = 0.55         # how much of the light's hue survives into the band
LIGHT_GAIN = 4.0    # undo scenekit.LIGHT_EXPOSURE (-2 stops)
EXPOSURE = 1.6 * LIGHT_GAIN
LINE_DEPTH_EPS = 0.08
OUTLINE = np.array([14, 10, 16], np.float32)


def load(path, mode=None):
    im = Image.open(path)
    return np.array(im.convert(mode) if mode else im)


def load16(path):
    """16-bit PNG → float 0..1 (RGBA or gray)."""
    im = Image.open(path)
    a = np.array(im)
    if a.dtype == np.uint16 or a.max() > 255:
        return a.astype(np.float32) / 65535.0
    return a.astype(np.float32) / 255.0


# Painterly shading (Cast n Chill-like): a smooth tone curve quantized into
# many small steps with 4×4 ordered dithering, instead of a few hard bands.
STYLE = 'dither'
STEPS = 14
BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16


def tone(lum):
    return 0.16 + 0.93 * (1 - np.exp(-lum * 4.0))


def toon(albedo, light, emission):
    L = light[..., :3] * EXPOSURE
    lum = L @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    if STYLE == 'dither':
        h, w = lum.shape
        th = np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w]
        top = 1.12
        v = tone(lum) / top * (STEPS - 1)
        band = np.floor(v + th) / (STEPS - 1) * top
    else:
        band = np.full(lum.shape, BANDS[0][1], np.float32)
        for t, v in BANDS:
            band = np.where(lum >= t, v, band)
    chroma = L / np.maximum(lum, 1e-4)[..., None]
    chroma = np.clip(chroma, 0, 2.2)
    tint = 1 + (chroma - 1) * TINT
    a = albedo[..., :3].astype(np.float32) / 255
    out = a * band[..., None] * tint
    e = emission[..., :3].astype(np.float32) / 255
    out = np.clip(out + e, 0, 1)
    return out


def lines(img, ids, depth, alpha):
    h, w = alpha.shape
    idk = (ids[..., 0].astype(np.int64) << 16) | (ids[..., 1].astype(np.int64) << 8) | ids[..., 2]
    line = np.zeros((h, w), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ys0, ys1 = max(0, -dy), h - max(0, dy)
        xs0, xs1 = max(0, -dx), w - max(0, dx)
        p = (slice(ys0, ys1), slice(xs0, xs1))
        q = (slice(ys0 + dy, ys1 + dy), slice(xs0 + dx, xs1 + dx))
        front = alpha[q] & ((idk[q] != idk[p]) & (depth[q] < depth[p] - LINE_DEPTH_EPS))
        line[p] |= alpha[p] & front
    out = img.copy()
    # soft line: a deeper shade of the surface itself, not near-black
    out[line] = out[line] * 0.62 + OUTLINE / 255 * 0.12
    return out


def main():
    rd, od = sys.argv[1], sys.argv[2]
    os.makedirs(od, exist_ok=True)
    meta = json.load(open(os.path.join(rd, 'render.json')))
    albedo = load(os.path.join(rd, 'albedo.png'), 'RGBA')
    emission = load(os.path.join(rd, 'emission.png'), 'RGBA')
    ids = load(os.path.join(rd, 'id.png'), 'RGB')
    alpha = albedo[..., 3] >= 128
    d01 = load16(os.path.join(rd, 'depth.png'))
    if d01.ndim == 3:
        d01 = d01[..., 0]
    view = meta['zmin'] + d01 * (meta['zmax'] - meta['zmin'])
    depth = view + meta['camDot']                     # engine depth units
    depth = np.where(alpha, depth, np.inf)

    for state in meta['lightStates']:
        light = load16(os.path.join(rd, 'light_' + state + '.png'))
        img = toon(albedo, light, emission)
        img = lines(img, ids, depth, alpha)
        rgba = np.zeros(albedo.shape, np.uint8)
        rgba[..., :3] = (img * 255 + 0.5).astype(np.uint8)
        rgba[..., 3] = np.where(alpha, 255, 0)
        Image.fromarray(rgba, 'RGBA').save(os.path.join(od, state + '.png'), optimize=True)

    # Swappable decor variants (scenekit k.variant): each rendered alone in
    # the room's light -> cropped lit image per state + depth
    variants = []
    for v in meta.get('variants', []):
        vd = os.path.join(rd, v['dir'])
        valb = load(os.path.join(vd, 'albedo.png'), 'RGBA')
        vemi = load(os.path.join(vd, 'emission.png'), 'RGBA')
        vids = load(os.path.join(vd, 'id.png'), 'RGB')
        va = valb[..., 3] >= 128
        bx0, by0, bx1, by1 = v['bbox']
        box = np.zeros(va.shape, bool)
        box[by0:by1, bx0:bx1] = True
        va &= box
        if not va.any():
            continue
        vdd = load16(os.path.join(vd, 'depth.png'))
        if vdd.ndim == 3:
            vdd = vdd[..., 0]
        vdepth = np.where(va, meta['zmin'] + vdd * (meta['zmax'] - meta['zmin']) + meta['camDot'], np.inf)
        ys, xs = np.nonzero(va)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        imgs = {}
        for state in meta['lightStates']:
            light = load16(os.path.join(vd, 'light_' + state + '.png'))
            img = lines(toon(valb, light, vemi), vids, vdepth, va)
            rgba = np.zeros(valb.shape, np.uint8)
            rgba[..., :3] = (img * 255 + 0.5).astype(np.uint8)
            rgba[..., 3] = np.where(va, 255, 0)
            imgs[state] = rgba[y0:y1, x0:x1]
        variants.append((v, (x0, y0, x1, y1), imgs, vdepth[y0:y1, x0:x1]))

    # Packed depth (one range for the base and every variant)
    finite = [depth[np.isfinite(depth)]] + [vdp[np.isfinite(vdp)] for _, _, _, vdp in variants]
    finite = np.concatenate(finite)
    dmin, dmax = float(finite.min()) - 0.01, float(finite.max()) + 0.01

    def pack(dp):
        q = np.where(np.isfinite(dp), (dp - dmin) / (dmax - dmin) * 65534, 65535)
        q = np.clip(q + 0.5, 0, 65535).astype(np.uint32)
        out = np.zeros(dp.shape + (4,), np.uint8)
        out[..., 0] = q >> 8
        out[..., 1] = q & 255
        out[..., 3] = 255
        return out
    Image.fromarray(pack(depth), 'RGBA').save(os.path.join(od, 'depth.png'), optimize=True)

    layers = {}
    for v, (x0, y0, x1, y1), imgs, vdp in variants:
        ld = os.path.join(od, 'layers', v['slot'], v['key'])
        os.makedirs(ld, exist_ok=True)
        for state, rgba in imgs.items():
            Image.fromarray(rgba, 'RGBA').save(os.path.join(ld, state + '.png'), optimize=True)
        Image.fromarray(pack(vdp), 'RGBA').save(os.path.join(ld, 'depth.png'), optimize=True)
        layers.setdefault(v['slot'], {})[v['key']] = {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}

    # Per-tile light on characters (probe plane at chest height)
    theta = math.radians(meta['theta'])
    ox, oy, ts = meta['originX'], meta['originY'], 32
    tiles = {}
    for state in meta['lightStates']:
        probe = load16(os.path.join(rd, 'probe_' + state + '.png'))[..., :3] * EXPOSURE
        grid = []
        for r in range(meta['rows']):
            row = []
            for c in range(meta['cols']):
                x = int(ox + (c + 0.5) * ts)
                y = int(oy + (r + 0.5 - meta['probeZ'] * math.cos(theta)) * ts)
                y = min(max(y, 0), probe.shape[0] - 1)
                L = probe[y, x]
                lum = float(L @ np.array([0.2126, 0.7152, 0.0722]))
                b = BANDS[0][1]
                for t, v in BANDS:
                    if lum >= t:
                        b = v
                ch = np.clip(L / max(lum, 1e-4), 0, 2.2)
                tint = 1 + (ch - 1) * TINT
                m = np.clip(b * tint * 1.15, 0.22, 1.25)
                row.append([round(float(v), 3) for v in m])
            grid.append(row)
        tiles[state] = grid

    out = {
        'width': meta['width'], 'height': meta['height'],
        'originX': meta['originX'], 'originY': meta['originY'],
        'theta': meta['theta'],
        'depthMin': dmin, 'depthMax': dmax,
        'states': meta['lightStates'],
        'tileLight': tiles,
    }
    if layers:
        out['layers'] = layers
    json.dump(out, open(os.path.join(od, 'scene.json'), 'w'), separators=(',', ':'))
    print('wrote', od, out['width'], 'x', out['height'], 'depth', round(dmin, 2), round(dmax, 2))


if __name__ == '__main__':
    main()
