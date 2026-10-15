"""Shared bits for Fellhaven's log interiors (the ski hire; the lodge has its own copy): log walls course on
course with pale chinking, log ends stacked at the corners, a cut-away front with a doorway, and a window onto
the range at alpenglow."""
import math

from _lumar_room import A, Kit, THETA  # noqa: F401
import assets_snow as N
from scenekit import shade

H = 2.0 / math.cos(THETA)


def log_room(k, x0, r0, x1, r1, door, floor='#6a4a34'):
    """Floor x0..x1 × r0..r1 (back wall at r0, front at r1), the doorway (xa, xb) in the front."""
    A.floor_planks(k, x0, r0, x1, r1, tone=floor)
    A.back_wall(k, x0 - 0.6, x1 + 0.6, r0, H, plaster=N.LOG_D, wainscot=0, beams_every=0)
    z = 0.16
    while z < H - 0.1:
        k.cyl_x(x0 - 0.6, x1 + 0.6, r0, z, 0.15, 0.155, (shade(N.LOG, k.rng.uniform(0.9, 1.1)), 0.12), 'log', verts=10)
        k.box(x0 - 0.6, r0 - 0.02, z + 0.13, x1 + 0.6, r0 + 0.06, z + 0.17, ('#c8b490', 0.1), 'chinking')
        z += 0.31
    for a, b in ((x0 - 0.6, x0), (x1, x1 + 0.6)):
        k.box(a, r0 - 0.5, 0, b, r1, H, (N.LOG_D, 0.12), 'side_wall')
        k.box(a - 0.02, r0 - 0.5, H, b + 0.02, r1, H + 0.05, '#2a1a0e', 'wall_cap')
        k.box(a - 0.02, r1, 0, b + 0.02, r1 + 0.03, H + 0.05, '#120c0a', 'wall_cut')
        zz = 0.16
        while zz < H - 0.1:
            k.cyl_y((a + b) / 2, r0 - 0.15, r0 + 0.3, zz, 0.16, 0.15, (N.LOG_L, 0.12), 'log_end', verts=10)
            zz += 0.31
    A.front_wall(k, x0 - 0.6, x1 + 0.6, r1, gaps=[door])
    A.door_frame(k, door[0], door[1], r1)


def alpenglow_window(k, x, rf=2.15, w=1.3, z0=1.0, z1=2.15):
    """A window onto the range going pink: sky, three peaks catching the sun, glazing bars, a sill."""
    k.box(x - w / 2 - 0.1, rf - 0.04, z0 - 0.1, x + w / 2 + 0.1, rf + 0.02, z1 + 0.1, ('#3e2414', 0.12), 'window_frame')
    k.box(x - w / 2, rf + 0.02, z0, x + w / 2, rf + 0.03, z1, ('#4a2a3a', 0.05), 'window_sky', emit=('#ffa890', 1.0))
    k.box(x - w / 2, rf + 0.03, z0 + (z1 - z0) * 0.62, x + w / 2, rf + 0.035, z1, ('#3a2a4a', 0.05), 'window_sky_hi', emit=('#c8a0d8', 0.85))
    for (a, b, top) in ((-0.65, 0.05, 0.6), (-0.25, 0.6, 0.76), (0.2, 0.65, 0.48)):
        a, b = a * w / 1.3, b * w / 1.3
        k.poly([(x + a, rf + 0.04, z0), (x + b, rf + 0.04, z0), (x + (a + b) / 2 + 0.05, rf + 0.04, z0 + top)],
               ('#2a2a48', 0.05), 'window_peaks', emit=('#6a6aa8', 0.8))
        k.poly([(x + (a + b) / 2 - 0.07, rf + 0.045, z0 + top - 0.16), (x + (a + b) / 2 + 0.17, rf + 0.045, z0 + top - 0.16),
                (x + (a + b) / 2 + 0.05, rf + 0.045, z0 + top)], ('#5a3a4a', 0.05), 'window_snow', emit=('#ffd8c8', 1.0))
    k.box(x - 0.03, rf + 0.04, z0, x + 0.03, rf + 0.09, z1, ('#3e2414', 0.12), 'window_bar')
    k.box(x - w / 2, rf + 0.04, (z0 + z1) / 2 - 0.03, x + w / 2, rf + 0.09, (z0 + z1) / 2 + 0.03, ('#3e2414', 0.12), 'window_bar')
    for xx in (x - w / 2 - 0.06, x + w / 2 + 0.06):
        k.box(xx - 0.06, rf + 0.02, z0 - 0.1, xx + 0.06, rf + 0.1, z1 + 0.1, ('#4e2e18', 0.12), 'window_frame')
    k.box(x - w / 2 - 0.12, rf + 0.02, z1, x + w / 2 + 0.12, rf + 0.1, z1 + 0.12, ('#4e2e18', 0.12), 'window_frame')
    k.box(x - w / 2 - 0.16, rf + 0.02, z0 - 0.16, x + w / 2 + 0.16, rf + 0.26, z0 - 0.06, ('#5e3b1e', 0.12), 'sill')
    k.area_light(x, rf + 0.55, 1.55, '#ffb8a8', 80, 1.3, rot=(math.radians(-72), 0, 0))
