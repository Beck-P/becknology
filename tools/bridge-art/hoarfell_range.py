"""Hoarfell's far ranges — the mountains behind the summit, the face, the Ice Step and the Last Ridge.

  python3 tools/bridge-art/hoarfell_range.py        # writes apps/bridge/assets/backdrops/hoarfell/range_{far,mid,near}.png

Each layer is a band of mountains rendered from a heightfield seen at a low angle (painted far to near), tileable left
to right so js/worlds/hoarfell.js can scroll it in whole pixels. The images hold data, not colours — the game colours
them for the hour (day's alpenglow, dusk, the moonlit night) in the toy finish's flat bands:
  R  light: the sun's N·L on the slope (a low sun from the west), 0..255
  G  material: 0 rock, 128 snow, 255 a line (where a nearer ridge stands in front of a farther one, or the sky)
  B  height: how high the point stands in its layer (the peaks catch the alpenglow), 0..255
  A  255 where there's mountain
"""
import math
import os

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'backdrops', 'hoarfell')


def pnoise(w, d, cells_x, cells_d, seed):
    """Value noise, periodic along x (w samples), smooth (cosine-interpolated)."""
    rng = np.random.default_rng(seed)
    g = rng.random((cells_d + 2, cells_x))
    xs = np.arange(w) / w * cells_x
    ds = np.linspace(0, cells_d, d)
    x0 = np.floor(xs).astype(int)
    fx = xs - x0
    d0 = np.floor(ds).astype(int)
    fd = ds - d0
    sx = (1 - np.cos(fx * math.pi)) / 2
    sd = (1 - np.cos(fd * math.pi)) / 2
    a = g[d0][:, x0 % cells_x]
    b = g[d0][:, (x0 + 1) % cells_x]
    c = g[d0 + 1][:, x0 % cells_x]
    e = g[d0 + 1][:, (x0 + 1) % cells_x]
    top = a + (b - a) * sx[None, :]
    bot = c + (e - c) * sx[None, :]
    return top + (bot - top) * sd[:, None]


def ridged(w, d, base_cells, seed, octaves=5):
    h = np.zeros((d, w))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = pnoise(w, d, base_cells * 2 ** o, max(2, int(base_cells * 2 ** o * d / w * 3)), seed + o * 17)
        r = 1 - np.abs(2 * n - 1)
        h += amp * r ** 2
        tot += amp
        amp *= 0.5
    return h / tot


def layer(name, W, H, D, base_cells, peak_px, dy_px, seed, snowline, light=(-0.78, 0.22, 0.58)):
    hf = ridged(W, D, base_cells, seed)
    # the massif stands up in the middle of the band's depth, falls away toward its back and front
    dd = np.linspace(0, 1, D)[:, None]
    env = np.sin(np.clip(dd, 0, 1) * math.pi) ** 0.7
    big = pnoise(W, D, max(2, base_cells // 2), 3, seed + 99)            # some stretches higher than others
    hpx = hf * env * peak_px * (0.65 + 0.6 * big)
    sm_ = hpx.copy()                                        # a little smoothing for the light, so it falls in facets, not streaks
    for _ in range(2):
        sm_ = (sm_ + np.roll(sm_, 1, 1) + np.roll(sm_, -1, 1) + np.vstack([sm_[:1], sm_[:-1]]) + np.vstack([sm_[1:], sm_[-1:]])) / 5
    # normals (pixels): x along, d toward the viewer, z up
    gx = (np.roll(sm_, -1, axis=1) - np.roll(sm_, 1, axis=1)) / 2
    gd = np.gradient(sm_, axis=0) / 1.6
    nrm = np.stack([-gx, -gd, np.ones_like(hpx)], axis=-1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    L = np.array(light) / np.linalg.norm(light)
    shade = np.clip((nrm * L).sum(-1), 0, 1)
    up = nrm[..., 2]
    tex = pnoise(W, D, base_cells * 6, 12, seed + 7)
    snow = (up > 0.62 + 0.15 * (tex - 0.5)) | (hpx > snowline * peak_px * (0.8 + 0.4 * tex))
    rel = hpx / max(1e-6, hpx.max())
    img = np.zeros((H, W, 4), np.uint8)
    dbuf = np.full((H, W), -1, int)
    ys = np.arange(H)[:, None]
    for di in range(D):                                     # far to near: nearer slices paint over farther
        ytop = np.round(H - 1 - (D - 1 - di) * dy_px / D - hpx[di]).astype(int)
        m = ys >= ytop[None, :]
        img[..., 0] = np.where(m, (shade[di] * 255).astype(np.uint8)[None, :], img[..., 0])
        img[..., 1] = np.where(m, np.where(snow[di], 128, 0).astype(np.uint8)[None, :], img[..., 1])
        img[..., 2] = np.where(m, (rel[di] * 255).astype(np.uint8)[None, :], img[..., 2])
        img[..., 3] = np.where(m, 255, img[..., 3])
        dbuf = np.where(m, di, dbuf)
    # lines: the top pixel of anything standing in front of something farther (or of the sky)
    above = np.vstack([np.full((1, W), -1), dbuf[:-1]])
    line = (dbuf >= 0) & ((above < 0) | (dbuf - above > max(3, D // 14)))
    img[..., 1] = np.where(line, 255, img[..., 1])
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(img, 'RGBA').save(os.path.join(OUT, 'range_' + name + '.png'), optimize=True)
    print(name, W, H, 'snow', round(float(snow.mean()), 2))


if __name__ == '__main__':
    layer('far', 1024, 150, 90, 6, 118, 26, 11, 0.42)
    layer('mid', 1024, 120, 80, 9, 86, 22, 23, 0.55)
    layer('near', 1024, 96, 70, 12, 58, 18, 37, 0.7)
