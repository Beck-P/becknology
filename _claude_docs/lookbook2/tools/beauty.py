#!/usr/bin/env python3
"""Quick look at a lookkit render: albedo × (sky + one sun + lamps), no engine. python3 beauty.py <render dir> <out.png> [sun index] [zoom]"""
import sys
import numpy as np
from PIL import Image
R, out = sys.argv[1], sys.argv[2]
si = int(sys.argv[3]) if len(sys.argv) > 3 else 3
z = int(sys.argv[4]) if len(sys.argv) > 4 else 2
def l16(n):
    a = np.array(Image.open(R + '/' + n)).astype(np.float32); a = a / (65535.0 if a.max() > 255 else 255.0)
    return a[..., :3] if a.ndim == 3 else np.dstack([a] * 3)
alb = np.array(Image.open(R + '/albedo.png').convert('RGBA')).astype(np.float32) / 255
L = l16('light_sky.png') * 5 * 0.55 + l16('light_sun%d.png' % si) * 5 * 0.9
img = alb[..., :3] * (1.1 * (1 - np.exp(-L)))
em = np.array(Image.open(R + '/emission.png').convert('RGB')).astype(np.float32) / 255
img = np.maximum(img, em)
o = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
bg = Image.new('RGB', o.size, (30, 30, 40)); bg.paste(o, (0, 0), Image.fromarray((alb[..., 3] * 255).astype(np.uint8)))
bg.resize((bg.width * z, bg.height * z), Image.NEAREST).save(out)
