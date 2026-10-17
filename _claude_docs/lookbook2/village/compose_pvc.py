import sys
import numpy as np
from PIL import Image
a = np.array(Image.open('/tmp/claude-0/pvc_alb.png').convert('RGBA')).astype(np.float32) / 255
L = np.array(Image.open('/tmp/claude-0/pvc_light.png')).astype(np.float32)
L = (L / (65535.0 if L.max() > 255 else 255.0))[..., :3] * 4.0
lum = L @ np.array([0.2126, 0.7152, 0.0722], np.float32)
b = 1.1 * (1 - np.exp(-lum[..., None] * 1.2))
col = np.clip(a[..., :3] * b * 255, 0, 255).astype(np.uint8)
Image.fromarray(col).resize((col.shape[1] * 3, col.shape[0] * 3), Image.NEAREST).save(sys.argv[1])
print('preview', sys.argv[1], col.shape)
