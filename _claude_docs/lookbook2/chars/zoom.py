# python3 zoom.py out.png scale sheet1 [sheet2 ...] -- frames: (row,col) pairs default down idle0, down idle3, right idle0, down walk2
import sys
from PIL import Image
out, z, *sheets = sys.argv[1:]
z = int(z)
cells = [(0, 0), (0, 3), (1, 0), (0, 6), (3, 0)]
ims = [Image.open(s).convert('RGBA') for s in sheets]
fw, fh = ims[0].width // 12, ims[0].height // 4
W = len(cells) * fw + 4
o = Image.new('RGBA', (W * len(ims), fh + 2), (96, 118, 84, 255))
for k, im in enumerate(ims):
    for j, (r, c) in enumerate(cells):
        o.alpha_composite(im.crop((c * fw, r * fh, c * fw + fw, r * fh + fh)), (k * W + j * fw, 1))
o.resize((o.width * z, o.height * z), Image.NEAREST).save(out)
print(o.size)
