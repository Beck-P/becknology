# quick look at a lookkit render: albedo × (sky + a sun), 4× nearest, plus albedo alone
import sys, numpy as np
from PIL import Image
d, out, sun = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4
def l16(n):
    a = np.array(Image.open(d + '/' + n)).astype(np.float32); a = a / (65535 if a.max() > 255 else 255)
    if a.ndim == 3: a = a[..., :3].mean(-1)
    return a * 5
alb = np.array(Image.open(d + '/albedo.png').convert('RGBA')).astype(np.float32) / 255
L = 0.55 * l16('light_sky.png') + 1.0 * l16('light_sun%d.png' % sun)
b = 1.1 * (1 - np.exp(-L))
img = alb[..., :3] * b[..., None]
img = np.clip(img * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(img).resize((alb.shape[1] * 3, alb.shape[0] * 3), Image.NEAREST)
im.save(out)
