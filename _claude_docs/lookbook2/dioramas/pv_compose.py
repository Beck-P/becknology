import sys
import numpy as np
from PIL import Image
tmp, OUT = sys.argv[1], sys.argv[2]
a = np.array(Image.open(tmp + '/albedo.png').convert('RGBA')).astype(np.float32) / 255
li = np.array(Image.open(tmp + '/light.png')).astype(np.float32)
li = li[..., :3] / (65535.0 if li.max() > 255 else 255.0) * 4.0 / 0.8
lum = li @ np.array([0.2126, 0.7152, 0.0722], np.float32)
b = 1.1 * (1 - np.exp(-lum))
rgb = a[..., :3] * b[..., None]
img = np.dstack([np.clip(rgb, 0, 1), a[..., 3:4]])
Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(OUT)
print('PREVIEW', OUT, img.shape)
