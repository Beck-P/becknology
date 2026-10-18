"""The Atrium — inside Cascade Tower on the Terraces, L200 (world id "arcadia-atrium").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_atrium.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-atrium

Beck: "go in on the levels, it's not all just the outside… atriums many floors high, malls inside the towers." A mall
hollowed out of the tower: the back wall rises gallery over gallery out of sight, every floor a row of lit shopfronts
behind a glass rail with a cyan line under it; escalators climb across the void; two glass lifts ride their shafts
(drawn live, js/worlds/terraces.js `atrium`); on the marble floor a fountain under a chandelier of light-rods, palms in
brass planters, benches, a florist's cart and a coffee kiosk; on the ground floor, shops you can go up to: NOVA (tech),
PETAL & WIRE (flowers), PAGES (books), and the concierge's desk, where Iris knows the way to everywhere.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade, THETA  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_signs as S               # noqa: E402
import assets_penthouse as PH          # noqa: E402
import assets_casino as CA             # noqa: E402
import assets_estate as E              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-atrium'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 32, 20
C45 = math.cos(THETA)
RF = 4.0                         # the back wall
FR = 18.0                        # the front wall
DOOR = (15.0, 17.0)
CYAN, ICE = Y.CYAN, '#bff4ff'
k = Kit(COLS, ROWS, margin_top=10.5, margin_bottom=0.6, margin_x=0.4, seed=4242)
rng = k.rng
FLOORS = (0.0, 3.6, 6.6, 9.6, 12.6)        # a tall ground storey, so its shops show under the first gallery
TOP = 14.6

# ---- the floor: white marble with a dark border and an inlaid star under the fountain --------------------------------
E.marble_cabochon(k, 1.0, RF, 31.0, FR)
CA.medallion(k, 16.0, 11.0, 3.2, col='#3a4a6a', ink='#e8e4dc')

# ---- the walls --------------------------------------------------------------------------------------------------------
k.box(0.4, RF - 0.5, 0.0, 31.6, RF, TOP, ('#1a1e2a', 0.05), 'back_wall')
for x0 in (0.4, 31.0):
    k.box(x0, RF - 0.5, 0.0, x0 + 0.6, FR, TOP, ('#20242e', 0.05), 'side_wall')
    k.box(x0 - 0.02, RF - 0.5, TOP, x0 + 0.62, FR, TOP + 0.05, '#2a3040', 'wall_cap')
    k.box(x0, FR, 0.0, x0 + 0.6, FR + 0.03, TOP, '#0e1018', 'wall_cut')
for (a, b) in ((0.4, DOOR[0]), (DOOR[1], 31.6)):
    k.box(a, FR, 0.0, b, FR + 0.55, 0.42, ('#2a3040', 0.06), 'front_wall')
    k.box(a - 0.02, FR - 0.02, 0.42, b + 0.02, FR + 0.57, 0.48, ('#c8ccd4', 0.04), 'wall_cap')
k.box(DOOR[0], FR, -0.01, DOOR[1], FR + 0.55, 0.02, ('#3a4258', 0.06), 'threshold')


def shop(x0, x1, z, col, sign_col, name=None, font='Righteous', goods=True, rf=None):
    """A shopfront at height z, its front at row rf (the back wall unless said): a lit window, a doorway, a sign over it.
    Forward of the wall, the shop's room behind it is a box glowing in its own colour."""
    RF_ = globals()['RF']                      # (RF below is this front's own row)
    RF = rf if rf is not None else RF_
    if RF > RF_:
        k.box(x0, RF_, z, x1, RF, z + 2.3, shade(col, 0.3), 'shop_room', emit=(col, 0.2))
    k.box(x0, RF, z + 0.05, x1, RF + 0.04, z + 2.2, ('#141822', 0.05), 'shop_frame')
    k.box(x0 + 0.1, RF + 0.04, z + 0.2, x1 - 0.1, RF + 0.05, z + 2.0, shade(col, 0.38), 'shop_window', emit=(col, 0.45))
    dx = (x0 + x1) / 2
    k.box(dx - 0.45, RF + 0.04, z + 0.05, dx + 0.45, RF + 0.06, z + 1.9, shade(col, 0.35), 'shop_door', emit=(col, 0.5))
    if goods:
        for g in range(int((x1 - x0 - 0.4) / 0.5)):
            gx = x0 + 0.25 + g * 0.5
            if abs(gx + 0.15 - dx) < 0.6:
                continue
            k.box(gx, RF + 0.05, z + 0.3, gx + 0.3, RF + 0.2, z + 0.3 + rng.uniform(0.3, 0.9),
                  shade(rng.choice(('#e8e0f0', '#3a3a52', '#c84a6a', '#2a6a8a', '#e8c040')), 0.6), 'goods')
    if name:
        S.letters(k, name, font, dx, RF + 0.06, z + 2.25, size=0.34, col=sign_col, energy=7)
    else:
        k.box(x0 + 0.3, RF + 0.04, z + 2.05, x1 - 0.3, RF + 0.08, z + 2.35, shade(sign_col, 0.4), 'shop_sign', emit=(sign_col, 0.9))


# ---- the ground floor's shops (the ones you can go up to) ----------------------------------------------------------------
# The first gallery overhangs the back wall by GD, so from the camera's 45° a front on the wall itself is hidden under it.
# The ground floor's shops come forward a tile instead, recessed under the gallery: a lit room behind a glass front at
# SF, its sign a lightbox hung from the gallery's lip, its light spilling out over the marble.
GD = 1.8                                                                # how far each gallery comes out
SF = RF + 1.25           # forward enough to show under the gallery's lip, short of row 5 (still walkable)


def ground_shop(x0, x1, col, sign_col, name, font, goods, shut=False):
    dx = (x0 + x1) / 2
    k.box(x0, RF, 0.0, x1, SF, 0.02, ('#3a3440', 0.06), 'floor_shop')                       # the shop's own floor
    k.box(x0, RF, 0.0, x1, RF + 0.04, 3.3, shade(col, 0.45), 'shop_back', emit=(col, 0.35 if not shut else 0.08))
    for xs in (x0, x1 - 0.12):                                                           # piers either side
        k.box(xs, RF, 0.0, xs + 0.12, SF + 0.06, 3.38, ('#c8ccd4', 0.04), 'shop_pier')
    k.box(x0, SF - 0.04, 2.3, x1, SF + 0.06, 3.38, ('#141822', 0.05), 'shop_fascia')
    if shut:                                                                             # a roller shutter, a poster on it
        for i in range(12):
            z = 0.1 + i * 0.18
            k.box(x0 + 0.12, SF - 0.02, z, x1 - 0.12, SF + 0.02, z + 0.15, ('#4a5060', '#444a58')[i % 2], 'shutter')
        k.box(dx - 0.5, SF + 0.02, 0.7, dx + 0.5, SF + 0.03, 1.7, '#e8e4dc', 'poster', emit=('#c8f0d8', 0.25))
        S.letters(k, 'SOON', 'RussoOne', dx, SF + 0.04, 1.05, size=0.22, col='#2a8a6a', energy=2)
    else:
        for i, gx in enumerate(goods):                                                   # what's in the window
            g = gx[0]
            k.box(x0 + g - 0.22, RF + 0.3, 0.0, x0 + g + 0.22, RF + 0.75, 0.55, ('#e8e4dc', 0.04), 'display_plinth')
            gx[1](x0 + g, RF + 0.52, 0.55)
        k.box(x0 + 0.12, SF - 0.01, 0.06, x1 - 0.12, SF + 0.01, 2.3, ('#bfe8f8', 0.02), 'shop_glass', emit=(col, 0.06))
        for xs in [x0 + 0.12 + (x1 - x0 - 0.24) * t / 3 for t in (1, 2)]:               # mullions
            k.box(xs - 0.02, SF, 0.06, xs + 0.02, SF + 0.04, 2.3, '#c8ccd4', 'mullion')
        k.box(dx - 0.42, SF, 0.0, dx + 0.42, SF + 0.05, 2.2, shade(col, 0.4), 'shop_door', emit=(col, 0.3))
        k.box(dx - 0.02, SF + 0.05, 0.9, dx + 0.02, SF + 0.08, 1.3, '#c8a050', 'door_handle')
    # the sign, hung from the gallery's lip where it shows
    k.box(dx - 1.6, RF + GD - 0.24, 2.78, dx + 1.6, RF + GD - 0.06, 3.32, ('#0e1018', 0.05), 'shop_sign_box')
    for xs in (dx - 1.3, dx + 1.3):
        k.cyl(xs, RF + GD - 0.15, 3.32, 3.4, 0.015, '#c8ccd4', 'sign_hanger', verts=4)
    k.box(dx - 1.5, RF + GD - 0.06, 2.84, dx + 1.5, RF + GD - 0.05, 3.26, shade(sign_col, 0.25), 'shop_sign_face',
          emit=(sign_col, 0.25 if not shut else 0.1))
    if name:
        S.letters(k, name, font, dx, RF + GD - 0.04, 2.91, size=0.3, col=sign_col, energy=7)
    k.point_light(dx, RF + 0.5, 1.6, col, 30 if not shut else 4, radius=0.6, group='lamp')    # the shop lit inside
    k.point_light(dx, SF + 0.9, 0.5, col, 16 if not shut else 0, radius=0.5, group='lamp')     # its light on the marble
    k.solid(x0, RF, x1, RF + 1.0)                       # the shop's own row; the one in front stays walkable


def _tech(x, r, z):
    k.box(x - 0.16, r - 0.02, z, x + 0.16, r + 0.02, z + 0.26, '#0a1824', 'gadget', emit=('#5cc8d0', 0.7))
    k.box(x - 0.18, r - 0.08, z, x + 0.18, r + 0.08, z + 0.02, '#c8ccd4', 'gadget_stand')


def _visor(x, r, z):
    k.blob(x, r, z + 0.18, 0.18, 0.1, 0.16, ('#c8ccd4', 0.02), 'gadget_head', segs=10)
    k.box(x - 0.16, r + 0.06, z + 0.16, x + 0.16, r + 0.1, z + 0.24, '#141018', 'gadget_visor', emit=('#ff70c0', 0.8))


def _bouquet(x, r, z):
    E.vase_of_flowers(k, x, r, z, s=0.7, col='#e8e4dc', kind=('rose', 'white')[int(x * 7) % 2])


def _books(x, r, z):
    for i, c in enumerate(('#8a2a2a', '#2a4a6a', '#c8a050', '#3a5a3a', '#5a2a5a')):
        h = 0.2 + (i * 37 % 5) * 0.03
        k.box(x - 0.18 + i * 0.075, r - 0.1, z, x - 0.12 + i * 0.075, r + 0.1, z + h, c, 'book')
    k.box(x - 0.2, r + 0.1, z, x + 0.2, r + 0.13, z + 0.06, '#e8e0c8', 'book_open')


ground_shop(2.0, 7.4, '#a0e0ff', ICE, 'NOVA', 'Audiowide', ((1.2, _tech), (2.2, _visor), (4.3, _tech)))
ground_shop(8.0, 12.8, '#ffd0e0', '#ff9ac8', 'PETAL & WIRE', 'PoiretOne', ((0.9, _bouquet), (1.8, _bouquet), (3.9, _bouquet)))
ground_shop(19.2, 24.0, '#ffe0b0', '#ffd890', 'PAGES', 'IMFellEnglishSC', ((0.9, _books), (1.8, _books), (3.9, _books)))
ground_shop(24.6, 27.9, '#c8f0d8', '#80e0b0', None, None, (), shut=True)
# the concierge's desk in the middle of the back wall, the directory screen behind it, the level
k.box(13.2, RF, 0.0, 18.8, RF + 0.04, 2.3, ('#1a1e2a', 0.05), 'concierge_wall')
k.box(13.6, RF + 0.04, 0.6, 18.4, RF + 0.06, 2.1, '#0a1824', 'directory', emit=('#1a4a6a', 0.6))
for i in range(5):                                                    # the floors listed on it
    col = (ICE, '#ffd890', '#ff9ac8', '#80e0b0', ICE)[i]
    k.box(13.9, RF + 0.06, 1.8 - i * 0.24, 13.9 + rng.uniform(2.0, 3.6), RF + 0.07, 1.88 - i * 0.24, shade(col, 0.4), 'directory_line', emit=(col, 0.9))
S.neon(k, 'L200', 'RussoOne', 17.6, RF + 0.07, 1.62, size=0.36, col=CYAN, energy=8)
CA.rim(k, E.ell(16.0, RF + 1.6, 1.9, 0.75, 32, math.pi, 2 * math.pi), E.ell(16.0, RF + 1.6, 1.55, 0.45, 32, math.pi, 2 * math.pi),
       0.0, 1.0, ('#e8e4dc', 0.04), 'concierge_desk', closed=False)
CA.rim(k, E.ell(16.0, RF + 1.6, 1.95, 0.8, 32, math.pi, 2 * math.pi), E.ell(16.0, RF + 1.6, 1.5, 0.4, 32, math.pi, 2 * math.pi),
       1.0, 1.06, ('#3a4258', 0.04), 'concierge_top', closed=False)
k.box(15.5, RF + 1.0, 1.06, 16.4, RF + 1.3, 1.1, '#0a1824', 'desk_screen', emit=('#3a8ac8', 0.6))
E.vase_of_flowers(k, 14.6, RF + 1.0, 1.06, s=0.7, col='#e8e4dc', kind='white')
k.solid(14.0, RF, 18.0, RF + 2.3)

# ---- the galleries above: floor over floor of shops behind glass rails, up out of sight -------------------------------------
GD = 1.8                                                                # how far each gallery comes out
for j, z in enumerate(FLOORS[1:], 1):
    k.box(0.4, RF, z - 0.22, 31.6, RF + GD, z, ('#262c3e', 0.05), 'gallery_floor')
    k.box(0.4, RF + GD - 0.02, z - 0.22, 31.6, RF + GD + 0.02, z - 0.14, shade(CYAN, 0.4), 'gallery_led', emit=(CYAN, 0.85))
    k.box(0.4, RF + GD - 0.06, z, 31.6, RF + GD - 0.02, z + 0.7, ('#bfe8f8', 0.03), 'gallery_glass', emit=('#7ab8d0', 0.15))
    k.box(0.4, RF + GD - 0.08, z + 0.7, 31.6, RF + GD, z + 0.76, ('#c8ccd4', 0.04), 'gallery_handrail')
    x = 1.0
    i = 0
    while x < 30.5:
        w = rng.choice((3.2, 3.8, 4.4))
        if x + w > 31.0:
            w = 31.0 - x
        if w > 1.6:
            col = ('#ffd890', '#a0e0ff', '#ff9ad0', '#c8f0d8', '#ffc070', '#d0b0ff', '#ffe8c8')[(i + j * 3) % 7]
            shop(x, x + w - 0.2, z, col, rng.choice((Y.PINK, CYAN, Y.YEL, '#c080ff', ICE)), rf=RF + GD - 0.45)
        x += w
        i += 1
    for x in (5.0, 11.0, 16.0, 21.0, 27.0):                                # a figure at the rail here and there
        if rng.random() < 0.45:
            k.blob(x + rng.uniform(-1, 1), RF + GD - 0.3, z + 0.5, 0.12, 0.1, 0.32, rng.choice(('#2a2440', '#3a2a2a', '#1a2a3a')), 'shopper', segs=8)
k.box(0.4, RF, TOP - 0.3, 31.6, RF + GD, TOP, ('#202536', 0.05), 'gallery_floor')
# the glass lift shafts against the back wall at either end (their cars are drawn live)
LIFTX = (3.2, 28.8)
for x in LIFTX:
    for dx in (-0.6, 0.6):
        k.box(x + dx - 0.04, RF + GD + 0.2, 0.0, x + dx + 0.04, RF + GD + 0.28, TOP, ('#c8ccd4', 0.04), 'lift_rail')
    k.box(x - 0.6, RF + GD + 0.2, 0.0, x + 0.6, RF + GD + 0.24, TOP, ('#5a8090', 0.02), 'lift_shaft_glass', emit=('#2a5a6a', 0.12))
    for z in FLOORS[1:]:
        k.box(x - 0.64, RF + GD + 0.18, z - 0.06, x + 0.64, RF + GD + 0.3, z + 0.04, ('#c8ccd4', 0.04), 'lift_band')
    k.box(x - 0.7, RF + GD, 0.0, x + 0.7, RF + GD + 0.4, 0.1, ('#3a4258', 0.05), 'lift_pit')
    k.solid(x - 0.7, RF + GD + 0.1, x + 0.7, RF + GD + 0.35)

# ---- escalators: one from the floor up to the first gallery, one on up across the void --------------------------------------
def escalator(xa, ra, za, xb, rb, zb):
    """An escalator from (xa, ra, za) to (xb, rb, zb): a steel truss, glass balustrades with lit handrails."""
    k.tube((xa, ra, za + 0.15), (xb, rb, zb + 0.15), 0.32, ('#3a4054', 0.05), 'escalator', verts=6)
    for s in (-0.38, 0.38):
        k.tube((xa + s * 0.0, ra + s, za + 0.9), (xb, rb + s, zb + 0.9), 0.03, ('#80d0e0', 0.05), 'escalator_rail', emit=(CYAN, 0.6))
        k.tube((xa, ra + s, za + 0.4), (xb, rb + s, zb + 0.4), 0.02, ('#bfe8f8', 0.03), 'escalator_glass', emit=('#7ab8d0', 0.2))


escalator(8.0, 12.0, 0.0, 4.6, RF + GD + 0.6, FLOORS[1])
escalator(27.0, RF + GD + 0.9, FLOORS[1], 21.0, RF + GD + 0.9, FLOORS[2])
escalator(10.0, RF + GD + 0.9, FLOORS[2], 16.0, RF + GD + 0.9, FLOORS[3])
k.box(7.6, 11.6, 0.0, 9.4, 12.6, 0.12, ('#3a4258', 0.05), 'escalator_foot')
k.solid(4.6, RF + GD + 0.2, 9.4, 12.6)

# ---- the fountain under the chandelier ---------------------------------------------------------------------------------------
FX, FR0 = 16.0, 11.0
CA.rim(k, E.ell(FX, FR0, 2.2, 1.5, 40), E.ell(FX, FR0, 1.95, 1.25, 40), 0.0, 0.5, ('#e8e4dc', 0.04), 'fountain_rim')
k.cyl(FX, FR0, 0.0, 0.42, 1.95, '#1a4a6a', 'basin_water', emit=('#2a6a9a', 0.35), verts=40, ry=1.25)
k.cyl(FX, FR0, 0.0, 1.1, 0.35, ('#e8e4dc', 0.04), 'fountain_column', verts=14)
k.cyl(FX, FR0, 1.1, 1.18, 0.8, ('#e8e4dc', 0.04), 'fountain_bowl', verts=20)
k.cyl(FX, FR0, 1.1, 1.17, 0.7, '#2a6a9a', 'basin_water', emit=('#3a8ab8', 0.4), verts=20)
for a in range(10):                                                     # jets arcing in from the rim
    ang = a * 2 * math.pi / 10
    x0, r0 = FX + math.cos(ang) * 1.9, FR0 + math.sin(ang) * 1.2
    k.tube((x0, r0, 0.5), ((x0 + FX) / 2, (r0 + FR0) / 2, 1.3), 0.02, ('#d8f8ff', 0.02), 'fountain_jet', emit=(ICE, 0.6), verts=4)
    k.tube(((x0 + FX) / 2, (r0 + FR0) / 2, 1.3), (FX + math.cos(ang) * 0.6, FR0 + math.sin(ang) * 0.4, 0.45), 0.02, ('#d8f8ff', 0.02),
           'fountain_jet', emit=(ICE, 0.6), verts=4)
k.cyl(FX, FR0, 1.18, 2.0, 0.04, ('#d8f8ff', 0.02), 'fountain_jet', emit=(ICE, 0.7), verts=6)
k.solid(FX - 2.2, FR0 - 1.5, FX + 2.2, FR0 + 1.5)
for z in (6.4, 7.6, 8.8):                                                # the chandelier of light-rods, high over it
    for a in range(10):
        ang = a * math.pi / 5 + z
        k.cyl(FX + math.cos(ang) * (1.2 - (z - 6.4) * 0.2), FR0 - 2.0 + math.sin(ang) * 0.7, z - 1.0, z, 0.03, '#d8f8ff', 'light_rod',
              emit=(ICE, 0.95), verts=5)
k.cyl(FX, FR0 - 2.0, 8.8, TOP, 0.03, ('#a8c8d8', 0.05), 'chandelier_cable', verts=6)

# ---- the floor's life: palms in brass planters, benches, a florist's cart, a coffee kiosk, a holo-ad ---------------------------
for (x, r) in ((2.4, 9.5), (29.6, 9.5), (2.4, 16.4), (29.6, 16.4), (12.4, 14.8), (19.6, 14.8)):
    k.cyl(x, r, 0.0, 0.55, 0.32, ('#c8a050', 0.04), 'planter', verts=14)
    E.potted_palm(k, x, r, z=0.0, h=1.9, pot='#c8a050', leaf='#3a7a4a', fronds=10, solid=True)
for (x0, x1, r) in ((5.0, 7.0, 15.4), (25.0, 27.0, 15.4), (10.2, 12.2, 9.2), (19.8, 21.8, 9.2)):
    Y.metal_bench(k, x0, x1, r, neon=CYAN)
# the florist's cart
k.box(22.6, 12.4, 0.3, 25.2, 13.4, 0.95, ('#3a5a3a', 0.08), 'cart', bevel=0.03)
for x in (22.9, 24.9):
    k.cyl_y(x, 13.35, 13.45, 0.3, 0.28, 0.28, ('#2a2a30', 0.06), 'cart_wheel', verts=14)
for i in range(6):
    E.vase_of_flowers(k, 22.9 + i * 0.42, 12.9, 0.95, s=0.55, col='#2a3a4a', kind=('rose', 'white')[i % 2])
k.box(22.5, 12.3, 1.9, 25.3, 13.5, 1.98, ('#e8d8e0', 0.06), 'cart_awning', bevel=0.02)
for x in (22.6, 25.2):
    k.cyl(x, 13.4, 0.95, 1.9, 0.02, '#c8ccd4', 'cart_pole', verts=5)
k.solid(22.6, 12.4, 25.2, 13.4)
# the coffee kiosk
CA.rim(k, E.ell(25.5, 7.6, 1.2, 0.8, 24), E.ell(25.5, 7.6, 0.85, 0.5, 24), 0.0, 1.0, ('#2a2420', 0.06), 'kiosk')
CA.rim(k, E.ell(25.5, 7.6, 1.26, 0.86, 24), E.ell(25.5, 7.6, 0.8, 0.46, 24), 1.0, 1.06, ('#d8d0c0', 0.05), 'kiosk_top')
PH.espresso_machine(k, 25.5, 7.2, 1.06)
k.cyl(25.5, 7.6, 1.06, 2.4, 0.04, ('#c8ccd4', 0.04), 'kiosk_mast', verts=6)
k.cyl(25.5, 7.6, 2.4, 2.5, 1.3, ('#2a2420', 0.06), 'kiosk_canopy', verts=24, ry=0.9)
k.cyl(25.5, 7.6, 2.38, 2.4, 1.31, shade('#ffc890', 0.4), 'kiosk_led', emit=('#ffc890', 0.8), verts=24, ry=0.91)
k.solid(24.3, 6.8, 26.7, 8.4)
D_AD = (21.0, 10.4, 6.8, 9.2)
k.box(D_AD[0] - 0.08, RF + GD + 0.05, D_AD[2] - 0.08, D_AD[1] + 0.08, RF + GD + 0.12, D_AD[3] + 0.08, '#0a0810', 'facade_ad_frame')
k.box(D_AD[0], RF + GD + 0.12, D_AD[2], D_AD[1], RF + GD + 0.13, D_AD[3], '#120830', 'facade_ad_screen', emit=('#3a1a70', 0.6))
AD = [D_AD[0], round(RF + GD + 0.13 - D_AD[3] * C45, 3), D_AD[1], round(RF + GD + 0.13 - D_AD[2] * C45, 3)]

# ---- light ---------------------------------------------------------------------------------------------------------------------
k.area_light(16.0, 11.0, TOP + 2.0, '#c8e0ff', 900, 26.0)                         # the skylight, far up
for (x, r) in ((6.0, 10.0), (16.0, 8.0), (26.0, 10.0), (10.0, 15.0), (22.0, 15.0)):
    k.point_light(x, r, 3.6, '#fff0d8', 30, radius=0.6, group='lamp')
k.point_light(FX, FR0 - 2.0, 6.5, '#c8f0ff', 80, radius=1.0, group='lamp')
k.render(OUT, light_states={'full': {'flicker': 1.0, 'lamp': 1.0}, 'dim': {'flicker': 0.8, 'lamp': 1.0}},
         light_samples=int(os.environ.get('SAMPLES', 128)), world_light=('#2a3048', 0.5))

# ---- the world ------------------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Atrium', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia', 'interior': True,
          'spawns': {'player': [16, 17]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})


def look(label, x, y, text, **kw):
    it = {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO LOOK', 'dialog': text}
    it.update(kw)
    return it


w['interactions'] = [
    {'x': x, 'y': 18, 'type': 'leave_world', 'leaveTo': 'arcadia-terraces', 'leaveSpawn': [30, 13], 'label': 'THE TERRACES',
     'prompt': 'PRESS E TO GO OUT'} for x in (15, 16)] + [
    {'x': 16, 'y': 6, 'type': 'dialog', 'label': 'IRIS', 'prompt': 'PRESS E TO TALK',
     'dialog': 'THE CONCIERGE LOOKS UP FROM HER SCREEN WITH A SMILE THAT KNOWS WHERE EVERYTHING IS.'},
    {'x': 4, 'y': 4, 'type': 'vendor', 'label': 'NOVA', 'prompt': 'PRESS E TO BROWSE',
     'items': [{'id': 'stim_pack', 'price': 26}, {'id': 'medkit', 'price': 30}]},
    {'x': 10, 'y': 4, 'type': 'vendor', 'label': 'PETAL & WIRE', 'prompt': 'PRESS E TO BROWSE',
     'items': [{'id': 'posy', 'price': 14}]},
    {'x': 21, 'y': 4, 'type': 'dialog', 'label': 'PAGES', 'prompt': 'PRESS E TO BROWSE',
     'dialog': 'A BOOKSHOP TWO HUNDRED FLOORS UP. IN THE WINDOW: "A HISTORY OF THE LOOP", "THE SPIRES: A FIELD GUIDE FOR PEOPLE WHO WILL NEVER LIVE THERE", AND A SIGNED COPY OF ODETTE LARK\'S MEMOIR, "SET STARTS WHEN I SAY SO".'},
    {'x': 27, 'y': 4, 'type': 'dialog', 'label': 'SHUTTERED SHOP', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'COMING SOON: A CLINIC FOR "CHROME THAT BELONGS ON A GALA INVITATION". THE SPIRES\' BOUTIQUES ARE COMING DOWN TO MEET THE MONEY.'},
    {'x': 23, 'y': 12, 'type': 'vendor', 'label': 'FLOWER CART', 'prompt': 'PRESS E TO BROWSE', 'items': [{'id': 'posy', 'price': 12}]},
    {'x': 25, 'y': 9, 'type': 'vendor', 'label': 'COFFEE KIOSK', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'cloud_espresso', 'price': 6}, {'id': 'glass_cake', 'price': 9}]},
    look('THE FOUNTAIN', 16, 13, 'COINS ON THE BOTTOM FROM EVERY CITY ON THE PLANET, AND A FEW FROM LUMAR. SOMEBODY HAS WISHED, IN MARKER ON THE RIM, FOR A FLAT IN THE SPIRES.'),
    look('THE GLASS LIFT', 3, 7, 'A GLASS CAR RIDES UP THE SHAFT PAST GALLERY AFTER GALLERY. THE BUTTONS GO TO FLOOR 260; THE SPIRES TAKE THE EXPRESS OUTSIDE.'),
    look('THE ESCALATOR', 8, 13, 'IT HUMS UP TO THE FIRST GALLERY. EVERYONE ON IT IS LOOKING AT THEIR WRIST, AND EVERYONE ON THE NEXT ONE UP IS TOO.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-concierge', 'x': 16, 'y': 5, 'facing': 'down'}]
for a in ACTORS:
    k.blocked.add((a['x'], a['y']))
apply_world(WORLD, k, (1, 4, 30, 17), doors=[(15, 18), (16, 18)], scene_id=WID, actors=ACTORS,
            scene_extra={'ads': [AD + [3]]})
w = json.load(open(WORLD))
w['atrium'] = {'lifts': [[x, round(RF + GD + 0.3 - 0.4 * C45, 3), round(RF + GD + 0.3 - (FLOORS[-1] + 0.4) * C45, 3)] for x in LIFTX],
               'escalators': [[8.0, round(12.0 - 0.3 * C45, 3), 4.6, round(RF + GD + 0.6 - (FLOORS[1] + 0.3) * C45, 3)],
                              [27.0, round(RF + GD + 0.9 - (FLOORS[1] + 0.3) * C45, 3), 21.0, round(RF + GD + 0.9 - (FLOORS[2] + 0.3) * C45, 3)],
                              [10.0, round(RF + GD + 0.9 - (FLOORS[2] + 0.3) * C45, 3), 16.0, round(RF + GD + 0.9 - (FLOORS[3] + 0.3) * C45, 3)]]}
w['view'] = [-0.5, -10.0, COLS + 0.5, ROWS + 0.6]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('atrium done')
