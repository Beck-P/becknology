#!/usr/bin/env python3
"""Arcadia diorama: a quick look at a lookkit render without the page (noon | night), scaled up.
  python3 arc_preview.py <render dir> <out.png> [scale]"""
import sys
import numpy as np
from PIL import Image
R, OUT = sys.argv[1], sys.argv[2]
SC = int(sys.argv[3]) if len(sys.argv) > 3 else 3
def l16(n):
    a = np.array(Image.open(R + '/' + n)).astype(np.float32)
    a = a / (65535.0 if a.max() > 255 else 255.0)
    return a[..., :3] if a.ndim == 3 else np.dstack([a] * 3)
alb = np.array(Image.open(R + '/albedo.png').convert('RGBA')).astype(np.float32) / 255
emi = np.array(Image.open(R + '/emission.png').convert('RGB')).astype(np.float32) / 255
G = 5.0
sky, sun = l16('light_sky.png') * G, l16('light_sun3.png') * G
try:
    lamps = l16('light_lamps.png') * G
except Exception:
    lamps = np.zeros_like(sky)
tone = lambda L: 1.1 * (1 - np.exp(-L))
noon = alb[..., :3] * tone(sky * np.array([0.62, 0.66, 0.72]) + sun * np.array([1.25, 1.2, 1.1]))
night = alb[..., :3] * tone(sky * np.array([0.08, 0.1, 0.18]) + lamps * 0.9) + emi * 0.95
def out(a):
    a = np.clip(a, 0, 1) * 255
    a = np.where(alb[..., 3:] > 0.5, a, np.ones_like(a) * np.array([20, 20, 30]))
    return Image.fromarray(a.astype(np.uint8))
a, b = out(noon), out(night)
w, h = a.size
s = Image.new('RGB', (w * 2 + 4, h))
s.paste(a, (0, 0)); s.paste(b, (w + 4, 0))
s = s.resize((s.width * SC, s.height * SC), Image.NEAREST)
s.save(OUT)
print(OUT, s.size)
