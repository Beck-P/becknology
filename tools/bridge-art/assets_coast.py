"""Coastlines for the Lumar sea scenes: land that slopes into real water.

    import assets_coast as C
    C.coast(k, land_cells, palette='rose')          # banks, beaches, seabed, rocks, kelp
    k.water_z = C.WZ                                 # scenekit renders the height pass

The land is the walkable island (ground at z = 0). Round it a heightfield
grows outward with a noisy, irregular edge: a lip of grass or sand, then a
rock bank or a sandy beach down to the waterline at WZ, a shallow shelf and
the seabed falling away to the deep. Rocks gather at the waterline (some
standing out of the sea, some just under it), kelp and glowing spore clumps
grow in the shallows. The engine lays its animated water over everything
below WZ — translucent in the shallows, opaque in the deep, foam where the
water meets what stands in it (scene_post writes the shore field from the
height pass).
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector, noise

from scenekit import S, shade

WZ = -0.34           # the sea surface (ground is z = 0)
STEP = 1 / 8         # heightfield resolution, tiles

SALT = ['#1a1e20', '#252a28', '#3a4848', '#4a5a58']

# seabed + glow per sea
PALETTES = {
    'emerald': {'bed': '#4a5a48', 'weed': '#1e3a2a', 'glow': '#60e0a0', 'sand': '#8a7a5a'},
    'crimson': {'bed': '#5a4644', 'weed': '#3a1a22', 'glow': '#ff5070', 'sand': '#8a7266'},
    'rose': {'bed': '#5a4a56', 'weed': '#3a2034', 'glow': '#ff80c0', 'sand': '#8e7a80'},
    'sapphire': {'bed': '#46506a', 'weed': '#1a2a48', 'glow': '#60a0ff', 'sand': '#7a8090'},
    'midnight': {'bed': '#3e3a54', 'weed': '#221a3a', 'glow': '#a080ff', 'sand': '#6a6680'},
}


def _n(x, r, f, seed):
    return noise.noise(Vector((x * f + seed * 17.3, r * f - seed * 9.1, seed * 3.7)))


def _smooth(a, b, t):
    t = min(1.0, max(0.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _lerp(a, b, t):
    return a + (b - a) * t


def _profile(d, beach):
    """Height at distance d (tiles) past the land's edge."""
    if d <= 0:
        return -0.03
    rock = (_lerp(-0.03, WZ + 0.06, d / 0.18) if d < 0.18 else
            _lerp(WZ + 0.06, WZ - 0.28, (d - 0.18) / 0.4) if d < 0.58 else
            _lerp(WZ - 0.28, WZ - 0.7, (d - 0.58) / 1.1) if d < 1.68 else
            max(WZ - 1.55, _lerp(WZ - 0.7, WZ - 1.55, (d - 1.68) / 1.4)))
    sand = (_lerp(-0.03, WZ - 0.04, _smooth(0, 1, d / 0.95)) if d < 0.95 else
            _lerp(WZ - 0.04, WZ - 0.55, (d - 0.95) / 1.4) if d < 2.35 else
            max(WZ - 1.55, _lerp(WZ - 0.55, WZ - 1.55, (d - 2.35) / 1.6)))
    return _lerp(rock, sand, beach)


class Terrain:
    def __init__(self, X0, R0, H, B, D, nx, nr):
        self.x0, self.r0, self.H, self.B, self.D, self.nx, self.nr = X0, R0, H, B, D, nx, nr

    def _ij(self, x, r):
        i = min(max(int(round((x - self.x0) / STEP)), 0), self.nx - 1)
        j = min(max(int(round((r - self.r0) / STEP)), 0), self.nr - 1)
        return j, i

    def z(self, x, r):
        """Ground height at (x, r): 0 on the island, the bank / seabed beyond."""
        j, i = self._ij(x, r)
        return min(0.0, self.H[j, i]) if self.D[j, i] > 0 else 0.0

    def wet(self, x, r):
        return self.z(x, r) < WZ


def coast(k, land, palette='emerald', grass='#34462e', rock=SALT[2], beachiness=0.0, seed=3,
          bounds=None, rocks=1.0, keep_clear=(), reach=(0.25, 1.0), beach_bias=None, sheer=(), ground=None):
    """land: walkable cells (c, r) — the coast never bites into them; it
    wanders `reach` = (base, swing) tiles out from them (cells beyond, such
    as a rocky rim, are the coast's to shape — build no ground there).
    bounds: (x0, x1, r0, r1) the heightfield covers (default: the whole
    render). beachiness shifts the coast from rock (−) toward sand (+).
    keep_clear: rects (x0, r0, x1, r1) where no rocks or kelp go (piers,
    a ship's hull). beach_bias(x, r): added to the sand-or-rock choice there
    (sand by the harbour's beach, rock under its cliffs). sheer: rects
    where the land stops at a built wall (a quay) and the water is deep
    right up to it. ground: (material, albedo) of the island's own surface
    (assets_isle.ground) — the lip then carries it on instead of one grass
    colour, so the land's edge is the coast's wandering outline, not the
    tile grid. Returns a Terrain (heights for placing things)."""
    P = PALETTES[palette]
    land = list(land)
    if bounds is None:
        bounds = (-k.mx - 1.0, k.cols + k.mx + 1.0, -k.mt - 2.5, k.rows + k.mb + 2.5)
    x0, x1, r0, r1 = bounds
    nx = int(round((x1 - x0) / STEP)) + 1
    nr = int(round((r1 - r0) / STEP)) + 1
    xs = np.linspace(x0, x1, nx)
    rs = np.linspace(r0, r1, nr)
    X, R = np.meshgrid(xs, rs)                      # [nr, nx]

    # distance to the nearest land cell (0 inside)
    L = np.array(land, np.float64)
    D = np.full(X.shape, 1e9)
    for (c, r) in L:
        dx = np.maximum(np.maximum(c - X, X - (c + 1)), 0)
        dr = np.maximum(np.maximum(r - R, R - (r + 1)), 0)
        D = np.minimum(D, np.hypot(dx, dr))

    H = np.zeros(X.shape)
    B = np.zeros(X.shape)          # beach factor
    for j in range(nr):
        for i in range(nx):
            x, r = X[j, i], R[j, i]
            # the edge wanders: broad headlands and coves, finer ragged detail
            out = reach[0] + reach[1] * (0.5 + 0.5 * _n(x, r, 0.42, seed)) + 0.22 * _n(x, r, 1.3, seed + 5)
            out = max(0.12, out)
            d = D[j, i] - out
            b = _smooth(-0.15, 0.35, _n(x, r, 0.22, seed + 1) + beachiness + (beach_bias(x, r) if beach_bias else 0))
            B[j, i] = b
            z = _profile(d, b)
            if ground and d <= 0:
                z = -0.004                     # flush with assets_isle.ground: no seam along the tile edges
            if d > 0.5:                                                     # ripples and hollows on the bed
                z += 0.05 * _n(x, r, 2.4, seed + 2) + 0.12 * _n(x, r, 0.6, seed + 3) * min(1.0, d - 0.5)
            if D[j, i] > 0 and any(a <= x <= c and b <= r <= e for (a, b, c, e) in sheer):
                z = min(z, WZ - 0.85)
            H[j, i] = z

    # faces by material band
    bands = {}

    def band(z, b, x, r, d):
        if z > -0.06:      # grass runs on from the island; sand starts a ragged way out
            if b > 0.6 and d > 0.25 + 0.35 * (0.5 + 0.5 * _n(x, r, 1.1, seed + 6)):
                return 'lip_sand'
            if ground:     # the island's own ground, dithered at band edges like assets_isle.ground
                h1 = math.sin(x * 103.9 + r * 626.1) * 43758.5453
                h2 = math.sin(x * 314.8 + r * 89.1) * 24634.6345
                cx, cr = x + STEP / 2, r + STEP / 2
                return 'g:' + ground[0](cx + 0.09 * (2 * (h1 - math.floor(h1)) - 1), cr + 0.09 * (2 * (h2 - math.floor(h2)) - 1))
            return 'lip_grass'
        if z > WZ + 0.05:
            return 'bank_sand' if b > 0.5 else 'bank_rock'
        if z > WZ - 0.1:
            return 'wet_sand' if b > 0.5 else 'wet_rock'
        if z > WZ - 0.75:
            w = _n(x, r, 0.9, seed + 4)
            return 'weed' if w > 0.3 else ('shelf_sand' if b > 0.35 else 'shelf')
        return 'deep'

    for j in range(nr - 1):
        for i in range(nx - 1):
            zc = (H[j, i] + H[j, i + 1] + H[j + 1, i] + H[j + 1, i + 1]) / 4
            if zc < -0.04 or D[j, i] > 0.0 or D[j + 1, i + 1] > 0.0:
                key = band(zc, B[j, i], X[j, i], R[j, i], D[j, i])
                bands.setdefault(key, []).append((j, i))
    ALB = {
        'lip_grass': (grass, 0.3), 'lip_sand': (shade(P['sand'], 1.15), 0.25),
        'bank_sand': (P['sand'], 0.25), 'bank_rock': (rock, 0.25),
        'wet_sand': (shade(P['sand'], 0.72), 0.2), 'wet_rock': (shade(rock, 0.7), 0.2),
        'shelf_sand': (shade(P['sand'], 0.85), 0.25), 'shelf': (P['bed'], 0.3), 'weed': (P['weed'], 0.35),
        'deep': (shade(P['bed'], 0.7), 0.3),
    }
    if ground:
        ALB.update({'g:' + key: alb for key, alb in ground[1].items()})
    for key, faces in bands.items():
        bm = bmesh.new()
        vmap = {}

        def v(j, i):
            if (j, i) not in vmap:
                vmap[(j, i)] = bm.verts.new((X[j, i], -R[j, i] * S, H[j, i]))
            return vmap[(j, i)]
        for (j, i) in faces:
            bm.faces.new((v(j, i), v(j, i + 1), v(j + 1, i + 1), v(j + 1, i)))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:                       # face up
            if f.normal.z < 0:
                f.normal_flip()
        me = bpy.data.meshes.new('coast')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('coast', me)
        k.scene.collection.objects.link(o)
        k._finish(o, ALB[key], 'coast_' + key.split('_')[0])
        for p in o.data.polygons:
            p.use_smooth = True

    def clear(x, r):
        return not any(a <= x <= c and b <= r <= d for (a, b, c, d) in keep_clear)

    def h_at(x, r):
        i = int(round((x - x0) / STEP))
        j = int(round((r - r0) / STEP))
        i = min(max(i, 0), nx - 1)
        j = min(max(j, 0), nr - 1)
        return H[j, i], B[j, i], D[j, i]

    rng = k.rng
    # boulders on the grass lip round the island
    g = 0.5
    for j in range(int((r1 - r0) / g)):
        for i in range(int((x1 - x0) / g)):
            x = x0 + (i + rng.random()) * g
            r = r0 + (j + rng.random()) * g
            z, b, d = h_at(x, r)
            if d < 0.25 or z < -0.05 or b > 0.6 or not clear(x, r) or rng.random() > 0.3 * rocks:
                continue
            s = rng.uniform(0.18, 0.36)
            k.rock(x, r, s * 0.25, s, s * 0.8, s * 0.75, (shade(rock, rng.uniform(0.8, 1.1)), 0.2), part='rim_rock')

    # rocks at the waterline, a few standing well out, some just under
    g = 0.34
    for j in range(int((r1 - r0) / g)):
        for i in range(int((x1 - x0) / g)):
            x = x0 + (i + rng.random()) * g
            r = r0 + (j + rng.random()) * g
            z, b, d = h_at(x, r)
            if d <= 0.05 or not clear(x, r):
                continue
            near = WZ + 0.08 > z > WZ - 0.3
            under = WZ - 0.3 >= z > WZ - 0.8
            p = (0.5 if near else 0.06 if under else 0) * (1 - 0.85 * b) * rocks
            if rng.random() > p:
                continue
            s = rng.uniform(0.12, 0.3) if rng.random() > 0.12 else rng.uniform(0.38, 0.6)
            cz = z + s * rng.uniform(0.1, 0.45) if near else z + s * 0.2
            tone = shade(rock, rng.uniform(0.7, 1.05))
            k.rock(x, r, cz, s, s * rng.uniform(0.7, 0.95), s * rng.uniform(0.55, 0.85), (tone, 0.22), part='coast_rock')
            if near and s > 0.3 and rng.random() < 0.6:                      # barnacles + weed at its waterline
                for _ in range(3):
                    a = rng.uniform(0, math.tau)
                    k.blob(x + math.cos(a) * s * 0.8, r + math.sin(a) * s * 0.6, WZ + 0.02, 0.07, 0.06, 0.03,
                           (P['weed'], 0.3), 'coast_weed', segs=6)

    # kelp, spore clumps and shells in the shallows
    g = 0.45
    for j in range(int((r1 - r0) / g)):
        for i in range(int((x1 - x0) / g)):
            x = x0 + (i + rng.random()) * g
            r = r0 + (j + rng.random()) * g
            z, b, d = h_at(x, r)
            if not clear(x, r) or d <= 0.05:
                continue
            if WZ - 0.15 > z > WZ - 0.75 and rng.random() < 0.16:
                for _ in range(rng.randint(2, 4)):
                    ox, orr = rng.uniform(-0.12, 0.12), rng.uniform(-0.1, 0.1)
                    hgt = rng.uniform(0.18, 0.4)
                    k.tube((x + ox, r + orr, z), (x + ox + rng.uniform(-0.08, 0.08), r + orr, min(WZ - 0.02, z + hgt)),
                           0.025, P['weed'], 'kelp', rb=0.006, verts=4)
            elif WZ - 0.1 > z > WZ - 0.6 and rng.random() < 0.09:
                for _ in range(rng.randint(3, 6)):
                    k.sphere(x + rng.uniform(-0.12, 0.12), r + rng.uniform(-0.1, 0.1), z + 0.03,
                             rng.uniform(0.025, 0.05), 0.03, shade(P['glow'], 0.4), 'spore_clump',
                             emit=(P['glow'], 0.55), segs=6)
            elif b > 0.6 and WZ + 0.2 > z > WZ - 0.05 and rng.random() < 0.12:
                k.blob(x, r, z + 0.01, 0.05, 0.04, 0.02, ('#d8ccc0', 0.1), 'shell', segs=6)
    k.water_z = WZ
    return Terrain(x0, r0, H, B, D, nx, nr)


def sink(k, since, dz, lights_since=None):
    """Lower everything built since len(k.parts) == since by dz (a ship that
    should ride lower in the water)."""
    bpy.context.view_layer.update()
    for p in k.parts[since:]:
        p['obj'].location.z += dz
    for L in k.lights[(len(k.lights) if lights_since is None else lights_since):]:
        L['obj'].location.z += dz
