"""Hoarfell — the Last Ridge, past the Hoarspire. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_ridge.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-ridge

The backcountry expedition (js/expedition.js). One long ridge bent in a U
over the cloud sea (a backdrop world: js/worlds/hoarfell.js draws the sky
and the cloud wherever the render is empty). You come up a rope over the
south rim of the west arm and cross the crevasse field: open crevasses (blue
ice going down into the dark), and their hidden ends under the snow —
bamboo wands mark the one safe line, cairns the places you can trust. The
Ice Step, a band of seracs across the arm, is climbed in its own world
(hoarfell-icestep). Above it the high ridge: a frozen tarn, the bivouac hut,
an old camp nobody came back for, rime towers, the last cairn. The east arm
is one long bowl of wind-packed snow, skied (js/ski.js, free skiing) down to
the ice buttress at its foot, and the lit door in it (hoarfell-hollow). The
rim drops away in strata all round; the cleft between the arms goes down
into the cloud.

Written into the world JSON for the game: `expedition` (the hidden
crevasses' tiles, the cairns, the door's twelve hollows in screen tiles)
and `ski` (the bowl: grade, zone, one wind lip to jump, the obstacles).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_isle as I                       # noqa: E402
import assets_snow as N                       # noqa: E402
import assets_town as W                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-ridge'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 50, 66
C = math.cos(math.radians(45))
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=4.8, seed=5101)
n2 = I.n2


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


# ---- the ridge's shape: a U of rounded boxes, smooth-joined, edges wandering --------------------------------------------
def sdbox(x, r, x0, r0, x1, r1, rad):
    cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
    qx, qr = abs(x - cx) - ((x1 - x0) / 2 - rad), abs(r - cr) - ((r1 - r0) / 2 - rad)
    return math.hypot(max(qx, 0.0), max(qr, 0.0)) + min(max(qx, qr), 0.0) - rad


def smin(a, b, s):
    h = max(s - abs(a - b), 0.0) / s
    return min(a, b) - h * h * s * 0.25


def nz(x, r, f, sd):
    """Wavy noise that varies along every direction (n2's main term only runs across x)."""
    return (math.sin((x * 0.83 + r * 0.56) * f * 2.0 + sd) * 0.45 + math.sin((-x * 0.42 + r * 0.91) * f * 2.3 + sd * 1.7) * 0.35 +
            math.sin((x * 0.6 - r * 0.8) * f * 1.7 + sd * 2.3) * 0.2)


def land(x, r):
    """Negative on the ridge."""
    a = sdbox(x, r, 3.6, 17.0, 23.2, 64.6, 2.6)        # the west arm: the way up
    b = sdbox(x, r, 3.0, 2.8, 47.0, 19.0, 3.2)         # the high ridge
    c = sdbox(x, r, 29.0, 17.0, 46.8, 64.6, 2.6)       # the east arm: the bowl
    d = smin(smin(a, b, 4.0), c, 4.0)
    return d + 1.4 * nz(x, r, 0.16, 3) + 0.6 * nz(x, r, 0.45, 8) + 0.16 * nz(x, r, 1.4, 12)


# ---- the crevasses: cracks across the west arm; open in places, hidden under the snow between ---------------------------------
# (row at x 13, tilt, seed, open stretches (x), the snow bridge the wands cross by)
CRACKS = [
    (55.6, 0.06, 1, [(5.6, 11.4), (16.0, 21.6)], (12.6, 15.0)),
    (50.6, -0.05, 2, [(5.0, 16.6), (20.6, 22.2)], (17.3, 19.8)),
    (46.2, 0.04, 3, [(6.4, 14.2), (18.6, 21.8)], (14.9, 17.8)),
    (41.6, -0.07, 4, [(5.2, 8.0), (12.4, 21.6)], (8.6, 11.2)),
    (37.8, 0.03, 5, [(4.6, 10.6), (16.2, 21.2)], (11.6, 14.6)),
]


def arm_edges(r):
    xs = [x / 8 for x in range(0, 26 * 8) if land(x / 8, r) < 0]
    return (min(xs), max(xs)) if xs else (4.0, 23.0)


def _clip():
    for i, (r0, tilt, sd, vis, br) in enumerate(CRACKS):
        lo, hi = arm_edges(r0)
        CRACKS[i] = (r0, tilt, sd, [(max(a, lo + 1.1), min(b, hi - 1.1)) for (a, b) in vis if min(b, hi - 1.1) - max(a, lo + 1.1) > 1.5], br)


def crack_row(i, x):
    r0, tilt, sd = CRACKS[i][:3]
    return r0 + tilt * (x - 13) + 0.35 * math.sin(x * 0.9 + sd * 1.7) + 0.15 * math.sin(x * 2.3 + sd)


def crack_w(i, x):
    """Half-width of the open slot at x: up to ~0.42 mid-stretch, -0.15 (closed) past its ends."""
    best = -0.15
    for (a, b) in CRACKS[i][3]:
        if a < x < b:
            s = math.sin(math.pi * (x - a) / (b - a)) ** 0.6
            best = max(best, (0.42 * (0.85 + 0.15 * math.sin(x * 3.1 + i))) * s - 0.15 * (1 - s))
    return best


def crev(x, r):
    """Positive inside an open crevasse."""
    return max(crack_w(i, x) - abs(r - crack_row(i, x)) for i in range(len(CRACKS)))


_clip()

# the wand line: arrival, over each snow bridge, to the foot of the Ice Step
PATH = [(13.5, 63.0), (12.4, 59.4), (13.8, 55.6), (16.6, 53.0), (18.5, 50.6), (17.6, 48.4), (16.3, 46.2), (13.0, 44.0),
        (9.9, 41.6), (11.0, 39.8), (13.1, 37.8), (14.5, 35.4)]
HIGH = [(14.5, 27.6), (14.0, 22.0), (15.0, 16.0), (19.0, 12.6), (25.8, 10.6), (31.0, 12.6), (35.6, 15.6), (37.2, 19.0)]
CAIRNS = [(11.4, 61.4), (15.0, 52.6), (15.2, 43.6), (17.4, 35.6)]


def path_d(x, r):
    return I.path_dist([PATH], x, r)


def hidden_at(i, x):
    """On crack i at x, is the snow hollow? (past the open stretches, not on the bridge, inside the arm)"""
    lo, hi = CRACKS[i][4]
    return crack_w(i, x) <= 0.0 and not (lo <= x <= hi)


# ---- the wind lip in the bowl (a natural kicker), sastrugi ---------------------------------------------------------------
JUMP = (38.6, 41.5, 3.0, 2.4, 0.5)      # x, lip row, width, length, height


def jump_at(x, r):
    jx, lr, w, L, h = JUMP
    u = (r - (lr - L)) / L
    v = abs(x - jx) / (w / 2)
    return h * u ** 1.4 * (1 - v ** 6) if 0 <= u <= 1 and v <= 1 else 0.0


def in_bowl(x, r):
    return x > 27.0 and r > 17.5


def height(x, r):
    z = jump_at(x, r)
    if not path_d(x, r) < 0.6:             # wind ripples everywhere but the trodden line
        z += 0.016 * max(0.0, math.sin(x * 2.0 + r * 3.3 + 1.6 * n2(x, r, 0.4, 5)))
    return z


ICE_PATCH = (33.0, 32.2, 38.0, 35.8)


def in_ice(x, r):
    return ((x - 35.5) / 2.3) ** 2 + ((r - 34.0) / 1.5) ** 2 + 0.35 * n2(x, r, 0.9, 21) < 1.0


def crev_open(x, r):
    """How far into an open stretch of crevasse (x, r) is; -9 where no crack is open at x."""
    best = -9.0
    for i in range(len(CRACKS)):
        w = crack_w(i, x)
        if w > 0:
            best = max(best, w - abs(r - crack_row(i, x)))
    return best


def material(x, r):
    if crev_open(x, r) > -0.17:
        return 'lip'
    for i in range(len(CRACKS)):
        if x < 24.5 and abs(r - crack_row(i, x)) < 0.07 and hidden_at(i, x) and land(x, r) < -0.4:
            return 'sag'                                          # the faintest grey seam: the crack under the snow
    if r > 33.5 and path_d(x, r) < 0.3:
        return 'track'
    if I.path_dist([HIGH], x, r) < 0.34 and r < 28:
        return 'track'
    if in_ice(x, r):
        return 'ice'
    if 34 < r < 60 and x < 25 and n2(x, r, 0.55, 11) > 0.62:
        return 'blue'                                             # bare glacier ice between the cracks
    if jump_at(x, r) > 0.02:
        return 'lipped'
    return 'drift' if n2(x, r, 0.8, 17) > 0.45 else 'snow'


ALB = {'snow': (N.SNOW, 0.03), 'drift': ('#dde5f1', 0.03), 'track': ('#ccd5e6', 0.02), 'lip': ('#b2dbef', 0.05),
       'sag': ('#d6deeb', 0.02), 'blue': ('#c2dbec', 0.04), 'ice': ('#a8d4ea', 0.04), 'lipped': (shade(N.SNOW, 1.03), 0.0)}

# ---- what isn't open snow: the Ice Step's band, the buttress over the door ------------------------------------------------
def band_mid(x):
    return 31.0 + 1.1 * math.sin(x * 0.45) + 0.6 * math.sin(x * 1.3 + 1)


BAND = {(c, r) for c in range(1, 27) for r in range(26, 37) if abs(r + 0.5 - band_mid(c + 0.5)) < 2.5 and land(c + 0.5, r + 0.5) < -0.25}
BUTTRESS = {(c, r) for c in range(39, 46) for r in range(56, 60) if land(c + 0.5, r + 0.5) < -0.25}
DOOR_X = 41.5

# ---- the walking surface: quads where it's ridge and not crevasse; the edge pulled onto the true outline -------------------------
SN = 8


def F(x, r):
    return max(land(x, r), crev(x, r))


def project(x, r):
    for _ in range(8):
        f = F(x, r)
        if abs(f) < 1e-3:
            break
        h = 0.01
        gx = (F(x + h, r) - F(x - h, r)) / (2 * h)
        gr = (F(x, r + h) - F(x, r - h)) / (2 * h)
        g2 = gx * gx + gr * gr
        if g2 < 1e-6:
            break
        sx, sr = -f * gx / g2, -f * gr / g2
        m = math.hypot(sx, sr)
        if m > 0.2:
            sx, sr = sx * 0.2 / m, sr * 0.2 / m
        x, r = x + sx, r + sr
    return x, r


faces = {}
for gj in range(-4, (ROWS + 1) * SN):
    for gi in range(-4, (COLS + 1) * SN):
        x, r = (gi + 0.5) / SN, (gj + 0.5) / SN
        cell = (int(math.floor(x)), int(math.floor(r)))
        if cell in BAND or cell in BUTTRESS or F(x, r) >= 0:
            continue
        h1 = math.sin(gi * 12.9898 + gj * 78.233) * 43758.5453
        h2 = math.sin(gi * 39.346 + gj * 11.135) * 24634.6345
        key = material(x + 0.06 * (2 * (h1 - math.floor(h1)) - 1), r + 0.06 * (2 * (h2 - math.floor(h2)) - 1))
        faces.setdefault(key, []).append(((gi, gj), (gi + 1, gj), (gi + 1, gj + 1), (gi, gj + 1)))
VC = {}


def svert(p):
    if p not in VC:
        x, r = p[0] / SN, p[1] / SN
        cell = (int(math.floor(x - 1e-6)), int(math.floor(r - 1e-6)))
        if F(x, r) > 0:
            x, r = project(x, r)
        VC[p] = (x, r, 0.01 * n2(x, r, 3.1, 7) - 0.004 + height(x, r))
    return VC[p]


I._mesh(k, faces, svert, ALB, 'ground')
gm = (lambda x, r: material(x, r), ALB)

# ---- the rim: trace the outline (marching squares over the ridge's field), loft it down in strata ---------------------------------
ST = 0.25
GX0, GY0 = -2.0, -2.0
NX, NY = int((COLS + 4) / ST) + 1, int((ROWS + 4) / ST) + 1
V = [[land(GX0 + i * ST, GY0 + j * ST) for i in range(NX)] for j in range(NY)]


def epoint(key):
    t, i, j = key
    if t == 'h':
        a, b = V[j][i], V[j][i + 1]
        u = a / (a - b)
        return (GX0 + (i + u) * ST, GY0 + j * ST)
    a, b = V[j][i], V[j + 1][i]
    u = a / (a - b)
    return (GX0 + i * ST, GY0 + (j + u) * ST)


links = {}
for j in range(NY - 1):
    for i in range(NX - 1):
        cs = [V[j][i] < 0, V[j][i + 1] < 0, V[j + 1][i + 1] < 0, V[j + 1][i] < 0]
        es = []
        if cs[0] != cs[1]:
            es.append(('h', i, j))
        if cs[1] != cs[2]:
            es.append(('v', i + 1, j))
        if cs[3] != cs[2]:
            es.append(('h', i, j + 1))
        if cs[0] != cs[3]:
            es.append(('v', i, j))
        if len(es) == 2:
            pairs = [(es[0], es[1])]
        elif len(es) == 4:                                    # a saddle: pair by the centre
            centre = (V[j][i] + V[j][i + 1] + V[j + 1][i] + V[j + 1][i + 1]) / 4 < 0
            pairs = [(es[0], es[1]), (es[2], es[3])] if centre == cs[0] else [(es[0], es[3]), (es[1], es[2])]
        else:
            pairs = []
        for a, b in pairs:
            links.setdefault(a, []).append(b)
            links.setdefault(b, []).append(a)
loops, seen = [], set()
for start in links:
    if start in seen:
        continue
    loop, prev, cur = [start], None, start
    seen.add(start)
    while True:
        nxt = [q for q in links[cur] if q != prev]
        if not nxt or nxt[0] == start:
            break
        prev, cur = cur, nxt[0]
        if cur in seen:
            break
        seen.add(cur)
        loop.append(cur)
    loops.append([epoint(q) for q in loop])
rim = max(loops, key=len)


def resample(pts, step):
    out, carry = [], 0.0
    pts = pts + [pts[0]]
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, br - ar)
        d = carry
        while d < L:
            out.append((ax + (bx - ax) * d / L, ar + (br - ar) * d / L))
            d += step
        carry = d - L
    return out


rim = resample(rim, 0.2)


def normal(x, r):
    h = 0.02
    gx = (land(x + h, r) - land(x - h, r)) / (2 * h)
    gr = (land(x, r + h) - land(x, r - h)) / (2 * h)
    m = math.hypot(gx, gr) or 1.0
    return gx / m, gr / m


NORM = [normal(x, r) for (x, r) in rim]
STRATA = ('#5a6274', '#4a5264', '#6a7286', '#3e4658')
levels, z = [0.0], 0.0
while z > -6.6:
    z -= 0.42 + 0.2 * abs(n2(z * 3, 1, 1.3, 5))
    levels.append(z)


def ring(z, j):
    pts = []
    for (x, r), (nx, nr) in zip(rim, NORM):
        push = 0.0 if j == 0 else 0.06 * n2(x * 2.1 + r * 1.3, z * 3, 1.0, 9) + 0.045 * j
        pts.append((x + nx * push, r + nr * push * 0.8, z))
    return pts


rings = [ring(z, j) for j, z in enumerate(levels)]
for j in range(len(rings) - 1):
    k.loft([rings[j], rings[j + 1]], (STRATA[j % 4], 0.14), 'cliff', closed=True, smooth=False)
for i, ((x, r), (nx, nr)) in enumerate(zip(rim, NORM)):
    if i % 4 == 0:
        k.blob(x - nx * 0.12, r - nr * 0.1, 0.0, 0.46, 0.2, 0.1, (N.SNOW, 0.1), 'cornice', segs=8)
    if nr > 0.3 and k.rng.random() < 0.1:
        d = k.rng.uniform(0.8, 4.4)
        k.rock(x + nx * 0.05 * d, r + nr * (0.1 + 0.04 * d), -d, 0.32, 0.2, 0.28, ('#4a5264', 0.18), part='crag', segs=7)

# ---- the open crevasses: blue ice walls going down into the dark --------------------------------------------------------------
DEPTH = (('#a8d4ea', 0.0), ('#7ab4d8', 0.35), ('#4a7ea8', 0.8), ('#24466c', 1.4), ('#0e1c32', 2.1), ('#060c18', 2.8))
for i in range(len(CRACKS)):
    for (a, b) in CRACKS[i][3]:
        xs = [a + (b - a) * t / 60 for t in range(61)]
        xs = [x for x in xs if crack_w(i, x) > 0.004]
        if len(xs) < 4:
            continue
        rings_c = []
        for (col, zz) in DEPTH:
            f = max(0.0, 1 - (zz / 2.8) ** 1.2) if zz < 2.8 else 0.0
            near = [(x, crack_row(i, x) - crack_w(i, x) * f, -zz) for x in xs]
            far = [(x, crack_row(i, x) + crack_w(i, x) * f, -zz) for x in reversed(xs)]
            rings_c.append(near + far)
        for j in range(len(rings_c) - 1):
            k.loft([rings_c[j], rings_c[j + 1]], (DEPTH[j][0], 0.08), 'crevasse', closed=True, smooth=False)
        # snow overhanging the lips, icicles down the far wall
        for x in xs[2:-2:5]:
            w = crack_w(i, x)
            if w > 0.15:
                k.blob(x, crack_row(i, x) - w - 0.04, 0.0, 0.22, 0.1, 0.06, (N.SNOW, 0.1), 'lip_snow', segs=6)
                if k.rng.random() < 0.5:
                    k.tube((x, crack_row(i, x) - w + 0.03, 0.0), (x, crack_row(i, x) - w + 0.03, -0.5), 0.05, (N.ICE, 0.05), 'icicle', rb=0.006, verts=5)

# seracs: tilted blocks of glacier ice among the cracks
SERACS = [(7.2, 53.4, 0.5), (20.4, 48.2, 0.6), (5.6, 44.0, 0.45), (21.0, 43.6, 0.5), (19.2, 39.4, 0.4), (6.2, 58.6, 0.55),
          (21.6, 57.6, 0.5), (8.6, 36.2, 0.4)]
for (x, r, s) in SERACS:
    if land(x, r) > -0.9:
        continue
    k.blob(x, r, s * 0.7, s, s * 0.8, s * 0.9, ('#bcdcef', 0.06), 'serac', rot=(k.rng.uniform(-14, 14), k.rng.uniform(-10, 10), k.rng.uniform(0, 90)),
           segs=6, smooth=False)
    k.blob(x - 0.05, r - 0.05, s * 1.45, s * 0.7, s * 0.55, s * 0.25, (N.ROOF_SNOW, 0.08), 'serac_snow', segs=6)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)

# ---- the wands: bamboo canes with a rag of orange, all the way up the line -----------------------------------------------------
def along(path, every):
    out, carry = [], 0.0
    for (ax, ar), (bx, br) in zip(path, path[1:]):
        L = math.hypot(bx - ax, br - ar)
        d = carry
        while d < L:
            u = d / L
            out.append((ax + (bx - ax) * u, ar + (br - ar) * u, (bx - ax) / L, (br - ar) / L))
            d += every
        carry = d - L
    return out


WANDS = []
for n, (x, r, dx, dr) in enumerate(along(PATH, 1.7)):
    s = 1 if n % 2 else -1
    wx, wr = x - dr * 0.5 * s, r + dx * 0.5 * s
    WANDS.append([round(wx, 2), round(wr, 2)])
    lean = k.rng.uniform(-0.05, 0.05)
    k.tube((wx, wr, 0.0), (wx + lean, wr, 1.05), 0.022, ('#c8a060', 0.1), 'wand', verts=5)
    k.box(wx + lean, wr - 0.015, 0.82, wx + lean + 0.24, wr + 0.015, 1.02, ('#e8602a', 0.1), 'wand_flag')

# ---- cairns: the safe places ------------------------------------------------------------------------------------------------
def cairn(x, r, s=0.42):
    for (dx, dr, f) in ((0, 0, 1.0), (0.08, -0.04, 0.78), (-0.04, 0.02, 0.56), (0.02, 0.0, 0.36)):
        sz = s * f
        k.rock(x + dx, r + dr, 0.15 + (1 - f) * s * 2.1, sz, sz * 0.9, sz * 0.62, ('#5a6272', 0.18), part='cairn', segs=7)
    k.blob(x, r, s * 2.1, s * 0.3, s * 0.28, s * 0.16, (N.ROOF_SNOW, 0.1), 'cairn_snow', segs=6)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)


for (x, r) in CAIRNS:
    cairn(x, r)

# ---- arrival: an anchor at the south rim, the rope down over the cliff, the warning stone ------------------------------------------
AX = 13
AR = max(r for r in range(ROWS) if all(land(AX + dx, r + dr) < -0.05 for dx in (0.1, 0.9) for dr in (0.1, 0.9)))
k.box(AX + 0.3, AR + 0.4, 0, AX + 0.7, AR + 0.55, 0.12, ('#c0c4cc', 0.1), 'anchor')
k.cyl(AX + 0.2, AR + 0.15, 0, 0.1, 0.12, ('#3a8ae0', 0.12), 'rope_coil', verts=12)
lip_r = AR + 1.0
while land(AX + 0.5, lip_r) < 0:
    lip_r += 0.05
k.tube((AX + 0.5, AR + 0.5, 0.06), (AX + 0.5, lip_r, 0.03), 0.02, ('#3a8ae0', 0.1), 'rope', verts=4)
k.tube((AX + 0.5, lip_r, 0.03), (AX + 0.56, lip_r + 0.5, -4.8), 0.02, ('#3a8ae0', 0.1), 'rope', verts=4)
I.standing_stone(k, 15.6, 61.0, h=1.5, tone='#4e5668', glyph='#e0b030')

# ---- the Ice Step: a band of seracs across the arm ------------------------------------------------------------------------------
HB = I.ridge(k, sorted(BAND), top=3.4, slope=1.0, seed=41, rock='#e2ecf6', strata=('#8ab8d8', '#6a9ac0', '#a8d0e8'),
             moss=N.ROOF_SNOW, foot=0.45, patchy=False, ground=gm)
for (c, r) in BAND:
    k.solid(c, r, c + 1, r + 1)
for c in range(3, 25):                                            # seracs leaning on its crest
    x = c + k.rng.uniform(0, 1)
    if land(x, band_mid(x)) > -1.0 or k.rng.random() < 0.35:
        continue
    s_ = k.rng.uniform(0.35, 0.6)
    z0 = HB(x, band_mid(x) - 0.3)
    k.blob(x, band_mid(x) - 0.3, z0 + s_ * 0.6, s_, s_ * 0.8, s_ * 1.1, ('#bcdcef', 0.06), 'serac',
           rot=(k.rng.uniform(-18, 18), k.rng.uniform(-12, 12), k.rng.uniform(0, 90)), segs=6, smooth=False)
    k.blob(x - 0.05, band_mid(x) - 0.35, z0 + s_ * 1.6, s_ * 0.7, s_ * 0.55, s_ * 0.25, (N.ROOF_SNOW, 0.08), 'serac_snow', segs=6)
for x in (12.9, 15.1):                                            # the fixed anchors at the foot of the line up it
    k.cyl(x, 34.15, 0, 0.5, 0.05, ('#c0c4cc', 0.1), 'stake', verts=6)
k.tube((12.9, 34.15, 0.45), (13.6, 33.6, 2.2), 0.018, ('#3a8ae0', 0.1), 'fixed_rope', verts=4)

# ---- the high ridge: rime towers, the tarn, the bivouac hut, the old camp, the last cairn -----------------------------------------
def rime_tower(x, r, h, s=0.5):
    """A spire of rock furred with rime on its windward (west) side."""
    z = 0.0
    while z < h:
        rad = s * (1 - 0.55 * z / h)
        k.rock(x + k.rng.uniform(-0.05, 0.05), r, z + rad * 0.6, rad, rad * 0.85, rad * 0.8, ('#525a6c', 0.2), part='spire', segs=7)
        k.blob(x - rad * 0.45, r + rad * 0.15, z + rad * 0.7, rad * 0.7, rad * 0.75, rad * 0.62, (N.ROOF_SNOW, 0.08), 'rime', segs=7)
        z += rad * 1.15
    k.blob(x - s * 0.1, r, h + s * 0.2, s * 0.42, s * 0.4, s * 0.45, (N.ROOF_SNOW, 0.08), 'rime_cap', segs=7)


OBST = []
TOWERS = [(6.0, 22.0, 2.6, 0.55), (20.6, 24.4, 2.2, 0.5), (7.6, 26.6, 1.8, 0.45), (18.0, 6.2, 2.4, 0.5), (33.2, 6.0, 2.8, 0.55),
          (44.4, 14.0, 2.2, 0.5), (5.4, 15.0, 2.0, 0.45),
          # the bowl: things to ski round
          (32.2, 27.2, 2.6, 0.55), (43.6, 25.6, 2.0, 0.5), (30.8, 37.4, 2.2, 0.5), (44.2, 39.2, 2.4, 0.5), (41.6, 48.2, 2.0, 0.5),
          (31.6, 51.0, 1.8, 0.45)]
for (x, r, h, s) in TOWERS:
    if land(x, r) > -0.9:
        continue
    rime_tower(x, r, h, s)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)
    if in_bowl(x, r):
        OBST.append([x, r, round(s * 0.85, 2), 'rock'])
for (x, r, s) in ((38.4, 31.6, 0.42), (35.0, 45.8, 0.4), (45.0, 31.0, 0.38), (29.6, 44.6, 0.36), (37.0, 23.4, 0.34)):
    k.rock(x, r, 0.1, s, s * 0.8, s * 0.7, ('#5a6272', 0.2), part='boulder', segs=8)
    k.blob(x, r, s * 0.6, s * 0.75, s * 0.6, s * 0.3, (N.SNOW, 0.1), 'boulder_snow', segs=8)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)
    OBST.append([x, r, round(s * 0.9, 2), 'rock'])

N.ice_pond(k, 9.6, 9.6, 2.6, 1.5)
for _ in range(34):                                               # wind-carved drifts: low, long, lying with the wind
    x, r = k.rng.uniform(4, 46), k.rng.uniform(4, 58)
    if land(x, r) > -1.2 or (x < 25 and r > 26) or abs(x - 26) < 3 and r < 12 or I.path_dist([HIGH], x, r) < 1.2:
        continue
    k.blob(x, r, 0.0, k.rng.uniform(0.7, 1.4), k.rng.uniform(0.25, 0.4), k.rng.uniform(0.06, 0.12), (shade(N.SNOW, 1.02), 0.04), 'drift',
           rot=(0, 0, k.rng.uniform(-12, 12)), segs=10)

# the bivouac hut: low stone walls, a barrel roof of corrugated iron under a drift, one small window
HX0, HX1, HR0, HR1 = 24.6, 27.6, 7.6, 9.8
k.box(HX0, HR0, 0, HX1, HR1, 1.25, ('#6a6e7a', 0.2), 'hut_wall', bevel=0.03)
k.cyl_x(HX0 - 0.08, HX1 + 0.08, (HR0 + HR1) / 2, 1.2, (HR1 - HR0) / 2 + 0.12, 0.75, ('#8a8e98', 0.12), 'hut_roof', verts=18)
k.blob(25.4, HR0 + 0.6, 1.6, 1.1, 0.9, 0.45, (N.ROOF_SNOW, 0.08), 'hut_drift', segs=10)
k.blob(HX0 - 0.2, 8.6, 0.3, 0.7, 1.3, 0.55, (N.SNOW, 0.08), 'hut_drift', segs=10)
W.door(k, 26.6, HR1 + 0.01, col=N.LOG_D)
W.window(k, 25.3, HR1 + 0.02, 0.6, w=0.4, h=0.36)
k.cyl(27.2, 8.2, 1.4, 2.1, 0.07, (N.IRON, 0.1), 'stovepipe', verts=8)
k.box(HX1 + 0.1, 8.4, 0, HX1 + 0.9, 9.6, 0.5, (N.LOG, 0.12), 'woodstack')
k.box(HX1 + 0.08, 8.38, 0.5, HX1 + 0.92, 9.62, 0.58, (N.ROOF_SNOW, 0.1), 'woodstack_snow')
k.solid(24, 7, 28, 10)
k.solid(28, 8, 29, 9)

# the old camp: a tent flattened by the wind, a sledge on its side, an axe left standing in the snow
I.tent(k, 40.6, 8.4, w=1.4, d=1.7, h=0.55, col='#8a6a2a', trim='#c8b890')
k.blob(40.2, 8.0, 0.5, 0.9, 0.8, 0.3, (N.SNOW, 0.1), 'tent_snow', segs=8)
k.box(42.2, 9.0, 0.0, 43.6, 9.4, 0.2, (N.LOG, 0.12), 'sledge', bevel=0.02)
k.box(42.1, 9.0, 0.2, 43.7, 9.08, 0.42, (N.LOG_D, 0.12), 'sledge_rail')
k.tube((39.2, 9.6, 0.0), (39.3, 9.6, 0.9), 0.03, (N.LOG_D, 0.1), 'axe_shaft', verts=5)
k.box(39.0, 9.55, 0.85, 39.6, 9.65, 0.95, ('#9aa0aa', 0.1), 'axe_head')
k.solid(39, 7, 43, 9)
k.solid(42, 9, 44, 10)

# the last cairn on the crest, prayer flags to the rime towers either side
cairn(27.6, 5.6, s=0.62)
W.bunting(k, (18.0, 6.2, 2.0), (27.6, 5.6, 1.6), sag=0.35, cols=('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030'))
W.bunting(k, (27.6, 5.6, 1.6), (33.2, 6.0, 2.2), sag=0.3, cols=('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030'))

# a carved stone at the head of the bowl: the lantern, and an arrow down
I.standing_stone(k, 40.6, 17.6, h=1.7, tone='#4e5668', glyph='#ffc860')

# ---- the foot of the bowl: an ice buttress, and the lit door in it ---------------------------------------------------------------------
NOTCH = (DOOR_X - 0.6, 58.2, DOOR_X + 0.6, 60.4)
HD = I.ridge(k, sorted(BUTTRESS), top=2.8, slope=1.0, seed=47, rock='#e2ecf6', strata=('#8ab8d8', '#6a9ac0', '#a8d0e8'),
             moss=N.ROOF_SNOW, foot=0.35, patchy=False, ground=gm, notches=[NOTCH])
for (c, r) in BUTTRESS:
    k.solid(c, r, c + 1, r + 1)
face_r = 59.9
k.box(DOOR_X - 0.58, 58.3, 0, DOOR_X + 0.58, 58.42, 1.55, ('#2a1a08', 0.1), 'door_glow', emit=('#ffc860', 0.95))
for s in (-1, 1):                                                  # pillars of clear ice, a lintel, carved hollows up them
    k.box(DOOR_X + s * 0.6 - 0.14, 58.3, 0, DOOR_X + s * 0.6 + 0.14, face_r, 1.85, ('#c4e2f2', 0.05), 'door_pillar', bevel=0.02)
k.box(DOOR_X - 0.76, 58.3, 1.62, DOOR_X + 0.76, face_r, 1.95, ('#c4e2f2', 0.05), 'door_lintel', bevel=0.02)
k.box(DOOR_X - 0.12, face_r, 1.68, DOOR_X + 0.12, face_r + 0.02, 1.9, ('#18283a', 0.1), 'rune_hollow')
HOLLOWS = []
for s in (-1, 1):
    for n in range(6):
        hz = 0.2 + n * 0.25
        hx = DOOR_X + s * 0.6
        k.box(hx - 0.05, face_r, hz - 0.05, hx + 0.05, face_r + 0.02, hz + 0.05, ('#18283a', 0.1), 'hollow')
        HOLLOWS.append(screen(hx, face_r + 0.02, hz))
k.point_light(DOOR_X, 59.6, 0.7, '#ffc060', 30, radius=0.3)
k.blob(DOOR_X - 1.6, 60.5, 0.1, 0.8, 0.5, 0.3, (N.SNOW, 0.1), 'door_drift', segs=8)
k.blob(DOOR_X + 1.7, 60.4, 0.1, 0.7, 0.45, 0.3, (N.SNOW, 0.1), 'door_drift', segs=8)

# ---- the light: the same evening as the summit, lower and redder; the cloud sea's blue in the shadows -----------------------------------
k.sun((0.82, 0.3, -0.3), '#ffa890', 3.3, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=64, world_light=('#8088cc', 0.95))

# ---- what the game needs ---------------------------------------------------------------------------------------------------------------------
cells = {(c, r) for c in range(COLS) for r in range(ROWS)
         if all(land(c + dx, r + dr) < -0.03 for dx in (0.05, 0.5, 0.95) for dr in (0.05, 0.5, 0.95))}
for (c, r) in list(cells):                                        # the open crevasses can't be walked
    if any(crev(c + dx, r + dr) > -0.02 for dx in (0.1, 0.5, 0.9) for dr in (0.1, 0.5, 0.9)):
        k.solid(c, r, c + 1, r + 1)

hidden = set()
for i in range(len(CRACKS)):
    for c in range(1, 25):
        x = c + 0.5
        if not hidden_at(i, x):
            continue
        r = int(math.floor(crack_row(i, x)))
        if (c, r) in cells and (c, r) not in k.blocked and path_d(x, r + 0.5) > 1.0:
            hidden.add((c, r))

grade, zone = [], []
for r in range(ROWS):
    g, z = '', ''
    for x in range(COLS):
        cx, cr = x + 0.5, r + 0.5
        if not in_bowl(cx, cr) or cr > 57.5:
            gv = 0
        elif cr < 21:
            gv = 3
        elif cr < 51:
            gv = 6 if land(cx, cr) > -2.0 else 7
        elif cr < 55:
            gv = 4
        else:
            gv = 2
        g += str(gv)
        if in_ice(cx, cr):
            z += 'i'
        elif in_bowl(cx, cr) and land(cx, cr) > -1.6:
            z += '~'
        else:
            z += '.'
    grade.append(g)
    zone.append(z)

EXP = {
    'crevasses': sorted([list(t) for t in hidden]),
    'cairns': [[int(x), int(r)] for (x, r) in CAIRNS],
    'field': [1, 34, 25, 62],
    'door': {'x': int(DOOR_X), 'y': 59, 'hollows': HOLLOWS},
    'hut': [26, 9],
    'wands': WANDS,
}
SKI = {'name': 'THE BOWL', 'hello': 'THE BOWL. NOBODY HAS SKIED IT IN YEARS.', 'start': 19.0, 'finish': 55.0, 'runs': {}, 'jumps': [list(JUMP)], 'grade': grade, 'zone': zone, 'obstacles': OBST}

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Last Ridge', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [AX, AR - 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 2, 'summit': True, 'expedition': EXP, 'ski': SKI})
w['interactions'] = [
    {'x': AX, 'y': AR, 'type': 'enter_world', 'label': 'THE WAY BACK', 'prompt': 'PRESS E TO ABSEIL DOWN', 'target': 'hoarfell-summit',
     'spawn': [23, 9]},
    {'x': 15, 'y': 61, 'type': 'dialog', 'label': 'CARVED STONE', 'prompt': 'PRESS E TO READ',
     'dialog': 'A STANDING STONE, ITS FACE CUT WITH A LANTERN AND A LINE OF WORDS GONE SOFT WITH FROST:\n\n'
               'THE WIND TURNS BACK. KEEP TO THE WANDS. TRUST NO SNOW YOU HAVE NOT SEEN ANOTHER CROSS.'},
    {'x': 14, 'y': 34, 'type': 'climb', 'route': 'icestep', 'label': 'THE ICE STEP', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 26, 'y': 9, 'type': 'expedition', 'action': 'hut', 'label': 'BIVOUAC HUT', 'prompt': 'PRESS E TO GO IN'},
    {'x': 40, 'y': 9, 'type': 'expedition', 'action': 'camp', 'label': 'OLD CAMP', 'prompt': 'PRESS E TO LOOK'},
    {'x': 9, 'y': 9, 'type': 'dialog', 'label': 'FROZEN TARN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A TARN FROZEN TO THE BOTTOM, CLEAR AS GLASS. DOWN IN IT, A SCATTER OF COINS FROM EVERY WORLD YOU KNOW - '
               'AND SOME YOU DON\'T. PEOPLE DROPPED THEM HERE FOR LUCK, ON THE WAY.'},
    {'x': 27, 'y': 5, 'type': 'dialog', 'label': 'THE LAST CAIRN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE HIGHEST POINT OF THE RIDGE, PRAYER FLAGS CRACKING IN THE WIND. TO THE SOUTH, THE HOARSPIRE, SMALL NOW. '
               'TO THE EAST THE RIDGE BENDS AND FALLS AWAY IN ONE LONG BOWL, AND AT THE BOTTOM OF IT, SOMETHING IS LIT.'},
    {'x': 40, 'y': 18, 'type': 'ski_here', 'label': 'THE BOWL', 'prompt': 'PRESS E TO SKI'},
    {'x': 40, 'y': 17, 'type': 'dialog', 'label': 'CARVED STONE', 'prompt': 'PRESS E TO READ',
     'dialog': 'A LANTERN CUT INTO THE STONE, AND UNDER IT AN ARROW POINTING STRAIGHT DOWN THE BOWL.'},
    {'x': int(DOOR_X), 'y': 59, 'type': 'expedition', 'action': 'door', 'label': 'THE ICE DOOR', 'prompt': 'PRESS E TO LOOK'},
] + [{'x': int(x), 'y': int(r), 'type': 'expedition', 'action': 'cairn', 'label': 'CAIRN', 'prompt': 'PRESS E TO LOOK'} for (x, r) in CAIRNS]
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, scene_extra={'backdrop': True, 'smoke': []})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in cells:
            w['collisions'][r][c] = 1
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
print('hoarfell-ridge done', len(hidden), 'hidden crevasse tiles', len(OBST), 'obstacles', 'arrival', AX, AR)
