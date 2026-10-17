"""The Terraces — the Mid-Levels' east hub, L200 (world id "arcadia-terraces").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_terraces.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-terraces

Two hundred floors up, on the shoulder of Cascade Tower: a deck of glass and steel the width of a city block, the
tower's foot rising behind it in a curtain wall of lit floors, and over the front edge the drop to the District glowing
far below. Beck: "each part definitely unique and alive… spacing where you can go side to side and see different
places, and up, down… really cool views". The Mid-Levels' light is glass and cyan.

Along the tower's foot (the back): MOONGLOW, the jazz bar (a door under a blue script and a canopy), a noodle counter,
the great glass front of the ATRIUM (galleries of shops lit floor over floor behind it — the room itself is
arcadia-atrium), the express lobby (the Spire Express up to the Spires, the Core Express down through every level), the
café. East, the Loop's TERRACES station: a platform under a canopy, the track on its viaduct running out of a portal in
the tower's flank and off over the drop toward the next towers. Out over the drop, three cantilevered decks with glass
balustrades: HALO (a grill under festoons), LUMEN (an izakaya under lanterns) and CIRRUS (the rooftop cocktail bar, a
round bar, a fire table, loungers), and the air cab pad. Below them, more terraces stepping down the tower's face.
West, the skybridge comes in from Skyport 7; across the gap the next tower, close enough to see into.
A backdrop world: js/skyline.js draws the city behind and below everything, rain over it all.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.dirname(__file__))
from scenekit import Kit, apply_world, shade, THETA  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_district as D            # noqa: E402
import assets_signs as S               # noqa: E402
import assets_penthouse as PH          # noqa: E402
import assets_casino as CA             # noqa: E402
import assets_estate as E              # noqa: E402
import assets_city as CITY             # noqa: E402
from _manor import preview             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-terraces'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 88, 42
C45 = math.cos(THETA)
k = Kit(COLS, ROWS, margin_top=7.0, margin_bottom=4.5, margin_x=1.0, seed=2088)
st = D.Street()
rng = k.rng

RF = 12.0                       # the tower's face along the back of the deck
FRONT = 27.0                    # the main deck's front edge; the terraces hang off it
CYAN, CYAN_L, ICE = Y.CYAN, Y.CYAN_L, '#bff4ff'
STEEL, STEEL_D = '#5a6272', '#2a2e3a'
GLASSF = ('#28304a', '#242c44', '#2c3550')             # the deck's tiles: smoked glass over steel
WARM = '#ffd49a'

# ---- what you walk on: rects of tiles (inclusive) -------------------------------------------------------------------
WALK = []


def walk(x0, r0, x1, r1):
    WALK.append((x0, r0, x1, r1))


# ======================================================================================================================
# the deck: smoked glass tiles over steel, cyan light lines, glass panels over the drop
# ======================================================================================================================
def deck(x0, r0, x1, r1, tones=GLASSF, seam='#121624', edge=True, under=1.0, size=1.0):
    """A slab of deck: tiles, its own thickness and steel edge, an LED line round its outer face."""
    Y.tile_floor(k, x0, r0, x1, r1, tones=tones, size=size, seam=seam)
    k.box(x0, r0, -under, x1, r1, -0.04, ('#1a1c2a', 0.06), 'deck_slab')
    if edge:
        k.box(x0, r1, -under, x1, r1 + 0.04, -0.04, ('#2a2e3e', 0.05), 'deck_fascia')
        k.box(x0, r1 + 0.04, -0.2, x1, r1 + 0.06, -0.14, shade(CYAN, 0.4), 'deck_led', emit=(CYAN, 0.85))


def glass_panel(x, r, w=1.6, d=1.0):
    """A glass panel set in the deck, the city two hundred floors down glittering through it."""
    k.box(x - w / 2, r - d / 2, 0.0, x + w / 2, r + d / 2, 0.008, '#06061a', 'glass_floor', emit=('#141850', 0.5))
    k.box(x - w / 2 - 0.03, r - d / 2 - 0.03, 0.0, x + w / 2 + 0.03, r + d / 2 + 0.03, 0.004, '#3a3a52', 'glass_frame')
    lights = {}
    for _ in range(int(w * d * 12)):
        gx, gr = x - w / 2 + 0.1 + rng.random() * (w - 0.2), r - d / 2 + 0.08 + rng.random() * (d - 0.16)
        c = rng.choice((Y.YEL, Y.PINK, CYAN_L, '#ffd890', '#ffd890'))
        lights.setdefault(c, []).append((gx, gr, 0.008, gx + 0.04, gr + 0.02, 0.01))
    for c, rects in lights.items():
        k.boxes(rects, shade(c, 0.4), 'glass_city', emit=(c, 0.7))


def led_line(x0, r, x1):
    k.box(x0, r - 0.04, 0.0, x1, r + 0.04, 0.006, shade(CYAN, 0.4), 'deck_led', emit=(CYAN, 0.6))


# the main deck along the tower's foot
deck(1.0, RF, 87.0, FRONT, edge=False, size=0.5)
walk(1, int(RF), 86, int(FRONT) - 1)
for x in (8.0, 25.0, 41.0, 57.0, 73.0):
    led_line(x - 4.0, 20.0, x + 4.0)
# a band of pale stone down the deck's length, the way people walk, with the LED path inlaid in it
k.box(1.0, 17.0, 0.0, 87.0, 18.0, 0.008, ('#3a4058', 0.06), 'floor_promenade')
k.box(1.0, 17.46, 0.008, 87.0, 17.54, 0.012, shade(CYAN, 0.4), 'deck_led', emit=(CYAN, 0.6))
k.box(1.0, 21.0, 0.0, 87.0, 22.0, 0.008, ('#3a4058', 0.06), 'floor_promenade')
for (x, r) in ((12.0, 22.6), (34.5, 23.0), (50.0, 22.6), (66.0, 23.2), (80.0, 22.6)):
    glass_panel(x, r)
for (x, r, rx, ry, c) in ((6.0, 24.6, 0.7, 0.2, Y.PINK), (22.0, 15.8, 0.5, 0.18, CYAN), (44.6, 25.2, 0.8, 0.22, Y.PURP),
                          (59.0, 16.2, 0.55, 0.2, CYAN), (70.0, 25.0, 0.6, 0.2, Y.PINK), (31.0, 25.4, 0.45, 0.16, CYAN)):
    Y.puddle(k, x, r, rx, ry, tint=c)


# ======================================================================================================================
# Cascade Tower: its foot along the back — a curtain wall of lit floors rising into the dark
# ======================================================================================================================
TX0, TX1 = 4.0, 58.0
TH = 17.0


def curtain_wall(x0, x1, r, z0, z1, bay=1.0, floor=1.0, lit=0.55, tones=('#ffd890', '#a0e0ff', '#c8f0ff', '#ffc8e0')):
    """Floor after floor of glass: dark mullions every bay, a spandrel band at each floor with a cyan line, some floors
    lit warm, some cool, some dark; blinds, plants, a figure at a window now and then."""
    k.box(x0, r - 0.6, z0, x1, r, z1, ('#141a28', 0.06), 'tower')
    lit_by, dark = {}, []
    n = int((x1 - x0) / bay)
    for j in range(int((z1 - z0) / floor)):
        z = z0 + j * floor
        k.box(x0, r, z, x1, r + 0.04, z + 0.12, ('#262c3e', 0.05), 'spandrel')
        if rng.random() < 0.5:
            k.box(x0, r + 0.04, z + 0.1, x1, r + 0.05, z + 0.12, shade(CYAN, 0.4), 'floor_led', emit=(CYAN, 0.55))
        floor_lit = rng.random() < 0.8
        tone = rng.choice(tones)
        for i in range(n):
            gx = x0 + i * bay
            g = (gx + 0.05, r + 0.01, z + 0.14, gx + bay - 0.05, r + 0.02, z + floor - 0.02)
            if floor_lit and rng.random() < lit:
                lit_by.setdefault(tone if rng.random() < 0.8 else rng.choice(tones), []).append(g)
                if rng.random() < 0.08:
                    k.blob(gx + bay / 2, r + 0.03, z + 0.4, 0.08, 0.01, 0.16, '#101420', 'silhouette', segs=8)
                elif rng.random() < 0.1:
                    k.boxes([(gx + 0.05, r + 0.025, zz, gx + bay - 0.05, r + 0.03, zz + 0.03)
                             for zz in [z + floor - 0.06 - t * 0.07 for t in range(5)]], '#1a1a26', 'blind')
            else:
                dark.append(g)
    for i in range(n + 1):
        gx = x0 + i * bay
        k.box(gx - 0.03, r, z0, gx + 0.03, r + 0.06, z1, ('#2a3042', 0.05), 'mullion')
    if dark:
        k.boxes(dark, '#0e1424', 'window_dark')
    for c, rects in lit_by.items():
        k.boxes(rects, shade(c, 0.5), 'window_lit', emit=(c, 0.7))


# the tower's foot: two storeys of shopfront at the deck, then the curtain wall above, set back a little
AX0, AX1, AH = 24.0, 38.0, 12.0                      # the atrium's glass front
LX0, LX1 = 39.5, 51.5                                # the express lobby's recess
for (a, b) in ((TX0, AX0), (AX1, LX0 - 0.3), (LX1 + 0.3, TX1)):
    k.box(a, RF - 3.0, 0.0, b, RF - 0.5, 2.6, ('#1c2030', 0.06), 'tower_base')
    k.box(a, RF - 0.5, 2.5, b, RF + 0.35, 2.75, ('#2e3446', 0.05), 'canopy_band')            # a band over the shops
    k.box(a, RF + 0.34, 2.5, b, RF + 0.36, 2.54, shade(CYAN, 0.4), 'canopy_led', emit=(CYAN, 0.9))
curtain_wall(TX0, AX0, RF - 0.6, 2.75, TH)
curtain_wall(AX1, TX1, RF - 0.6, 2.75, TH)
curtain_wall(AX0, AX1, RF - 0.6, AH + 0.4, TH)
# the tower's name up its face, and the level
S.letters(k, 'CASCADE', 'Audiowide', 12.5, RF - 0.58, 10.6, size=0.9, col=ICE, energy=6)
S.neon(k, 'L200', 'RussoOne', 52.0, RF - 0.58, 11.2, size=1.1, col=CYAN_L, board='#0a1420', energy=10)
D.facade_ad(k, st, 44.0, 49.0, RF - 0.58, 5.2, 8.6)
D.facade_ad(k, st, 6.0, 9.6, RF - 0.58, 4.4, 6.8)

# the tower's shoulders: the curtain wall ends in a dark stone fin either side, an aircraft light on top
for x in (TX0 - 0.6, TX1):
    k.box(x, RF - 3.0, 0.0, x + 0.6, RF + 0.2, TH + 0.6, ('#20242e', 0.05), 'tower_fin')
    k.sphere(x + 0.3, RF - 0.2, TH + 0.75, 0.08, 0.08, '#ff4040', 'beacon', emit=('#ff4040', 1.0), segs=8)


def shopfront(x0, x1, glow, wall='#20242e'):
    """A shop's ground storey under the canopy band: a lit display, a recessed door, frames."""
    k.box(x0, RF - 0.02, 0.0, x1, RF + 0.02, 2.5, (wall, 0.06), 'shopfront')
    k.box(x0 + 0.12, RF + 0.02, 0.2, x1 - 0.12, RF + 0.03, 2.2, shade(glow, 0.5), 'display', emit=(glow, 0.8))
    for x in [x0 + 0.12 + i * (x1 - x0 - 0.24) / 3 for i in range(4)]:
        k.box(x - 0.03, RF + 0.02, 0.0, x + 0.03, RF + 0.07, 2.3, ('#2a3040', 0.05), 'shop_mullion')
    k.box(x0, RF, 0.0, x1, RF + 0.08, 0.18, ('#2a3040', 0.05), 'shop_sill')


# ---- MOONGLOW, the jazz bar (x 12..18): a deep blue door, a canopy, a script sign, a poster, a velvet rope ------------
JX = 15.5
for (a, b) in ((12.0, JX - 0.75), (JX + 0.75, 19.0)):
    k.box(a, RF - 0.5, 0.0, b, RF + 0.04, 2.5, ('#10142a', 0.05), 'jazz_front')
    k.box(a + 0.1, RF + 0.04, 0.0, b - 0.1, RF + 0.06, 2.45, ('#1a1e3a', 0.08), 'jazz_panel')
k.box(JX - 0.75, RF - 0.5, 2.0, JX + 0.75, RF + 0.04, 2.5, ('#10142a', 0.05), 'jazz_front')
for x in (12.6, 13.4, 17.6, 18.4):                                        # fluted panels either side, lit blue at their feet
    k.box(x - 0.18, RF + 0.06, 0.1, x + 0.18, RF + 0.1, 2.3, ('#24284a', 0.08), 'jazz_flute')
    k.box(x - 0.18, RF + 0.1, 0.1, x + 0.18, RF + 0.12, 0.16, shade('#5070ff', 0.4), 'jazz_uplight', emit=('#6080ff', 0.8))
k.box(JX - 0.75, RF - 0.4, 0.0, JX + 0.75, RF + 0.02, 2.0, ('#0c0e1c', 0.05), 'jazz_recess')
k.box(JX - 0.6, RF - 0.42, 0.0, JX + 0.6, RF - 0.38, 1.9, shade('#3a50c0', 0.4), 'jazz_door', emit=('#4060d0', 0.55))
k.box(JX - 0.03, RF - 0.37, 0.8, JX + 0.03, RF - 0.33, 1.1, '#c8a040', 'door_handle')
k.box(JX - 1.2, RF, 2.0, JX + 1.2, RF + 1.0, 2.1, ('#141830', 0.05), 'jazz_canopy', bevel=0.02)
k.box(JX - 1.2, RF + 0.98, 2.04, JX + 1.2, RF + 1.0, 2.08, shade('#6080ff', 0.4), 'jazz_canopy_led', emit=('#7090ff', 0.9))
for x in (JX - 1.15, JX + 1.15):
    k.cyl(x, RF + 0.95, 0.0, 2.0, 0.035, '#c8a040', 'canopy_post', verts=8)
    k.solid_post(x, RF + 0.95)
S.neon(k, 'Moonglow', 'Pacifico', JX, RF + 0.06, 2.85, size=0.8, col='#8aa8ff', board='#0a0c1c', energy=12)
k.cyl_y(17.9, RF + 0.04, RF + 0.08, 3.05, 0.22, 0.22, shade('#f0e8a0', 0.5), 'jazz_moon', emit=('#fff0b0', 0.9), verts=16)
k.cyl_y(18.0, RF + 0.06, RF + 0.1, 3.08, 0.2, 0.2, '#0a0c1c', 'jazz_moon_bite', verts=16)
# tonight's poster in a lit case, and the velvet rope
k.box(13.0, RF + 0.04, 0.7, 13.9, RF + 0.12, 1.9, ('#c8a040', 0.05), 'poster_case')
k.box(13.06, RF + 0.12, 0.76, 13.84, RF + 0.13, 1.84, '#1a2050', 'poster', emit=('#3a4890', 0.5))
k.box(13.2, RF + 0.13, 1.4, 13.7, RF + 0.14, 1.7, '#e8d080', 'poster_sax', emit=('#a08840', 0.4))
k.box(13.15, RF + 0.13, 0.9, 13.75, RF + 0.14, 1.0, '#8aa8ff', 'poster_text', emit=('#6080ff', 0.4))
for x in (13.8, 14.6):
    k.cyl(x, RF + 1.5, 0.0, 0.62, 0.035, '#c8a040', 'post', verts=8)
    k.sphere(x, RF + 1.5, 0.64, 0.05, 0.05, '#e8c860', 'post_cap', segs=6)
k.tube((13.8, RF + 1.5, 0.52), (14.6, RF + 1.5, 0.52), 0.025, '#1a2a80', 'rope', verts=6)
k.solid(13.75, RF + 1.3, 14.65, RF + 1.7)

# ---- TSURU, a noodle counter (x 19..24): an open front, stools, steam --------------------------------------------------
k.box(19.0, RF - 0.5, 0.0, 19.15, RF + 0.04, 2.5, ('#2a1e1a', 0.06), 'noodle_side')
k.box(23.85, RF - 0.5, 0.0, 24.0, RF + 0.04, 2.5, ('#2a1e1a', 0.06), 'noodle_side')
k.box(19.15, RF - 0.48, 0.0, 23.85, RF - 0.45, 2.3, shade('#ffb060', 0.5), 'noodle_kitchen', emit=('#ffb060', 0.7))
for i in range(6):                                                       # bowls stacked on the kitchen shelf
    k.cyl(19.6 + i * 0.75, RF - 0.35, 1.5, 1.62, 0.1, ('#e8e0d0', 0.05), 'bowl_stack', verts=10)
k.box(19.15, RF - 0.45, 1.45, 23.85, RF - 0.25, 1.5, '#3a2414', 'shelf')
k.box(19.2, RF + 0.1, 0.0, 23.8, RF + 0.6, 0.95, ('#5a2a1e', 0.08), 'counter', bevel=0.02)
k.box(19.15, RF + 0.05, 0.95, 23.85, RF + 0.65, 1.02, ('#8a5a30', 0.12), 'counter_top', bevel=0.01)
Y.stock_pot(k, 19.8, RF + 0.35, z=1.02)
for x in (21.0, 22.4):
    Y.bowl(k, x, RF + 0.4, 1.02)
for i in range(6):
    xx = 19.3 + i * 0.75
    k.box(xx, RF + 0.04, 1.6, xx + 0.7, RF + 0.06, 1.95, (('#f0e8d0', '#c83030')[i % 2], 0.06), 'noren')
k.box(19.2, RF + 0.02, 1.95, 23.8, RF + 0.08, 2.0, '#3a2414', 'noren_rod')
S.lightbox(k, 'TSURU', 'DelaGothicOne', 21.5, RF + 0.04, 2.15, 2.6, 0.32, bg='#fff2dc', ink='#a01818', size=0.26, energy=6)
for x in (20.0, 21.2, 22.4, 23.4):
    Y.neon_stool(k, x, RF + 0.95, seat='#c83040')
for x in range(19, 24):
    k.blocked.discard((x, 13))
k.solid(19.0, RF - 0.1, 24.0, RF + 0.62)
st.vent(19.8, RF + 0.35, 1.3)

# ---- the ATRIUM's great glass front (x 24..38): galleries of shops floor over floor behind open glass -------------
AB = RF - 7.0                                                            # the atrium's back wall
k.box(AX0, AB - 0.3, 0.0, AX1, AB, AH, ('#161a26', 0.05), 'atrium_back')
for x in (AX0 - 0.3, AX1):
    k.box(x, AB - 0.3, 0.0, x + 0.3, RF - 0.2, AH, ('#1a1e2a', 0.05), 'atrium_side')
Y.tile_floor(k, AX0, AB, AX1, RF - 0.2, tones=('#5a5a64', '#504f5a'), size=1.0, seam='#2a2a32')
GZ = (0.0, 2.7, 5.4, 8.1)
for j, z in enumerate(GZ):                                               # the galleries, floor over floor
    if j:
        k.box(AX0, AB, z - 0.16, AX1, AB + 1.6, z, ('#2a3044', 0.05), 'gallery_floor')
        k.box(AX0, AB + 1.58, z - 0.16, AX1, AB + 1.62, z - 0.1, shade(CYAN, 0.4), 'gallery_led', emit=(CYAN, 0.8))
        k.box(AX0, AB + 1.56, z, AX1, AB + 1.6, z + 0.55, ('#bfe8f8', 0.03), 'gallery_rail', emit=('#80c8e0', 0.2))
        k.box(AX0, AB + 1.54, z + 0.55, AX1, AB + 1.62, z + 0.6, ('#c8ccd4', 0.04), 'gallery_handrail')
    for i in range(6):                                                   # shopfronts round each gallery
        sx = AX0 + 0.3 + i * 2.25
        col = ('#ffd890', '#a0e0ff', '#ff9ad0', '#c8f0d8', '#ffc070', '#d0b0ff')[(i + j) % 6]
        k.box(sx, AB, z + 0.05, sx + 2.0, AB + 0.02, z + 2.0, shade(col, 0.5), 'atrium_shop', emit=(col, 0.75))
        for g in range(3):                                               # goods in the window
            k.box(sx + 0.25 + g * 0.55, AB + 0.02, z + 0.3, sx + 0.6 + g * 0.55, AB + 0.2, z + 0.3 + rng.uniform(0.3, 0.8),
                  shade(rng.choice(('#e8e0f0', '#3a3a52', '#c84a6a', '#2a6a8a')), 0.6), 'atrium_goods')
        sc = rng.choice((Y.PINK, CYAN, Y.YEL, '#c080ff'))
        k.box(sx + 0.2, AB + 0.02, z + 2.05, sx + 1.8, AB + 0.06, z + 2.35, shade(sc, 0.4), 'atrium_sign', emit=(sc, 0.9))
        k.box(sx + 2.0, AB, z, sx + 2.25, AB + 0.12, z + 2.4, ('#2a3044', 0.05), 'atrium_pier')
for (x0, z0) in ((26.5, 0.0), (35.5, 2.7), (26.5, 5.4)):                 # escalators crossing the void between floors
    x1 = x0 + 3.8 * (1 if x0 < 30 else -1)
    k.tube((x0, RF - 3.6, z0 + 0.1), (x1, RF - 3.6, z0 + 2.7), 0.22, ('#3a4054', 0.05), 'escalator', verts=6)
    k.tube((x0, RF - 3.3, z0 + 1.0), (x1, RF - 3.3, z0 + 3.6), 0.035, ('#80d0e0', 0.05), 'escalator_rail', emit=(CYAN, 0.6))
    k.tube((x0, RF - 3.9, z0 + 1.0), (x1, RF - 3.9, z0 + 3.6), 0.035, ('#80d0e0', 0.05), 'escalator_rail', emit=(CYAN, 0.6))
k.cyl(31.0, RF - 2.6, 0.0, 0.5, 1.3, ('#c8ccd4', 0.04), 'fountain_rim', verts=24)
k.cyl(31.0, RF - 2.6, 0.42, 0.46, 1.2, '#1a4a6a', 'basin_water', emit=('#2a6a9a', 0.4), verts=24)
k.cyl(31.0, RF - 2.6, 0.4, 1.6, 0.06, ('#c8f0ff', 0.03), 'fountain_jet', emit=(ICE, 0.7), verts=8)
k.cyl(31.0, RF - 3.0, AH - 3.0, AH, 0.04, ('#a8c8d8', 0.05), 'atrium_cable', verts=6)
for z in (AH - 3.2, AH - 4.6, AH - 6.0):                                 # a chandelier of light-rods hanging down the void
    for a in range(8):
        ang = a * math.pi / 4 + z
        k.cyl(31.0 + math.cos(ang) * 0.8, RF - 3.0 + math.sin(ang) * 0.5, z - 0.9, z, 0.025, '#d8f8ff', 'light_rod',
              emit=(ICE, 0.9), verts=5)
k.point_light(31.0, RF - 3.0, 4.5, '#c8f0ff', 140, radius=1.2, group='lamp')
k.point_light(31.0, AB + 2.0, 1.4, '#ffe0c0', 50, radius=1.0, group='lamp')
# the glass: no pane in the render (it would hide what's behind), just its mullions, transoms and a streak or two
for x in [AX0 + i * 1.75 for i in range(9)]:
    k.box(x - 0.05, RF - 0.2, 0.0, x + 0.05, RF - 0.1, AH, ('#3a4258', 0.05), 'atrium_mullion')
for z in (2.7, 5.4, 8.1, 10.6):
    k.box(AX0, RF - 0.2, z - 0.05, AX1, RF - 0.1, z + 0.05, ('#3a4258', 0.05), 'atrium_transom')
for (xa, za) in ((AX0 + 2.0, 6.0), (AX0 + 9.0, 3.5)):
    k.bar(xa, RF - 0.09, xa + 1.2, RF - 0.09, za, za + 3.5, 0.02, ('#e0f8ff', 0.02), 'glass_streak', emit=('#a0d8f0', 0.2))
k.box(AX0 - 0.3, RF - 0.5, AH, AX1 + 0.3, RF + 0.2, AH + 0.4, ('#2a3044', 0.05), 'atrium_head')
k.box(AX0 - 0.3, AB - 0.3, AH, AX1 + 0.3, RF - 0.5, AH + 0.2, ('#202536', 0.05), 'atrium_roof')
S.letters(k, 'THE ATRIUM', 'Righteous', 31.0, RF + 0.2, AH - 0.9, size=0.62, col=ICE, energy=8)
# the doors: a revolving pair either side of a wide glass slider
CA.revolving_door(k, 28.5, RF + 0.1, rad=0.42, h=1.6)
CA.revolving_door(k, 33.5, RF + 0.1, rad=0.42, h=1.6)
k.box(29.2, RF - 0.25, 0.0, 32.8, RF - 0.2, 0.1, ('#3a4258', 0.05), 'atrium_sill')
k.box(30.2, RF - 0.18, 0.0, 31.8, RF - 0.12, 2.2, ('#c8f0ff', 0.03), 'atrium_slider', emit=('#a0d8f0', 0.25))
k.solid(AX0, RF - 0.3, 29.0, RF + 0.55)
k.solid(33.0, RF - 0.3, AX1, RF + 0.55)
for (x, r) in ((25.0, RF + 1.0), (37.0, RF + 1.0)):
    PH.planter(k, x - 0.6, r - 0.3, x + 0.6, r + 0.3, kind='box', h=0.5)

# ---- the express lobby (x 39..51): a lit recess, two pairs of brass lift doors, their indicators --------------------
k.box(LX0, RF - 2.0, 0.0, LX1, RF - 1.98, 3.0, ('#1a1e2c', 0.05), 'lobby_back')
Y.tile_floor(k, LX0, RF - 2.0, LX1, RF, tones=('#e6e2da', '#d8d4cc'), size=0.5, seam='#a8a49c')
k.box(LX0 - 0.3, RF - 2.0, 0.0, LX0, RF + 0.02, 2.5, ('#20242e', 0.05), 'lobby_side')
k.box(LX1, RF - 2.0, 0.0, LX1 + 0.3, RF + 0.02, 2.5, ('#20242e', 0.05), 'lobby_side')
k.box(LX0 - 0.3, RF - 2.0, 2.5, LX1 + 0.3, RF + 0.35, 2.75, ('#2e3446', 0.05), 'lobby_head')
k.box(LX0 - 0.3, RF + 0.34, 2.5, LX1 + 0.3, RF + 0.36, 2.54, shade(CYAN, 0.4), 'canopy_led', emit=(CYAN, 0.9))
k.box(LX0, RF - 1.0, 2.48, LX1, RF - 0.9, 2.5, shade('#fff0d0', 0.5), 'lobby_light', emit=('#fff0d0', 0.9))
LIFTS = {}


def lift_doors(cx, label, sub, col, font='Limelight'):
    """A pair of brass lift doors in a black frame, the floor indicator over them, the call button beside."""
    r = RF - 1.98
    k.box(cx - 1.0, r, 0.0, cx + 1.0, r + 0.12, 2.25, ('#0e0e14', 0.04), 'lift_frame')
    k.box(cx - 0.8, r + 0.12, 0.0, cx - 0.01, r + 0.14, 2.0, ('#b08a40', 0.04), 'lift_door')
    k.box(cx + 0.01, r + 0.12, 0.0, cx + 0.8, r + 0.14, 2.0, ('#b08a40', 0.04), 'lift_door')
    for dz in (0.5, 1.0, 1.5):                                         # deco lines on the doors
        k.box(cx - 0.75, r + 0.14, dz, cx - 0.06, r + 0.15, dz + 0.03, '#e8c870', 'lift_door_line')
        k.box(cx + 0.06, r + 0.14, dz, cx + 0.75, r + 0.15, dz + 0.03, '#e8c870', 'lift_door_line')
    k.box(cx - 0.5, r + 0.12, 2.06, cx + 0.5, r + 0.16, 2.22, '#140c08', 'lift_indicator', emit=('#ff9a40', 0.8))
    k.box(cx + 1.05, r + 0.12, 0.95, cx + 1.25, r + 0.16, 1.25, ('#0e0e14', 0.05), 'call_panel')
    k.sphere(cx + 1.15, r + 0.17, 1.1, 0.045, 0.045, col, 'call_button', emit=(col, 1.0), segs=8)
    S.letters(k, label, font, cx, r + 0.12, 2.38, size=0.26, col=col, energy=6)
    S.neon(k, sub, 'RussoOne', cx, r + 0.12, 2.86, size=0.22, col=col, energy=6)
    k.point_light(cx, r + 0.8, 1.6, '#ffe0b0', 14, radius=0.3, group='lamp')


lift_doors(43.0, 'SPIRE EXPRESS', 'L200 · L480', '#f0d8a0')
lift_doors(48.5, 'CORE EXPRESS', 'B60 · L480', CYAN_L, font='Audiowide')
k.solid(LX0, RF - 2.0, LX1, RF - 1.7)
walk(40, int(RF) - 1, 51, int(RF) - 1)
# a directory pillar between them, a bench, a brass ashtray bin
k.box(45.5, RF - 0.6, 0.0, 46.0, RF - 0.1, 2.2, ('#16161e', 0.05), 'directory')
for i in range(6):
    k.box(45.55, RF - 0.1, 0.4 + i * 0.28, 45.95, RF - 0.08, 0.6 + i * 0.28, shade((ICE, '#f0d8a0', Y.PINK)[i % 3], 0.4),
          'directory_line', emit=((ICE, '#f0d8a0', Y.PINK)[i % 3], 0.7))
k.solid(45.4, RF - 0.7, 46.1, RF)

# ---- GLASS & STEAM, the café (x 52..58): a coffee bar open to the deck --------------------------------------------------
shopfront(52.0, 57.6, '#ffc890', wall='#22201e')
k.box(52.4, RF + 0.1, 0.0, 57.2, RF + 0.55, 1.0, ('#3a2a20', 0.08), 'cafe_counter', bevel=0.02)
k.box(52.35, RF + 0.05, 1.0, 57.25, RF + 0.6, 1.05, ('#d8d0c0', 0.06), 'cafe_top')
PH.espresso_machine(k, 53.2, RF + 0.3, 1.05)
for i in range(4):
    k.cyl(54.4 + i * 0.35, RF + 0.35, 1.05, 1.16, 0.05, ('#f0ece4', 0.05), 'cup', verts=8)
k.box(55.8, RF + 0.15, 1.05, 57.0, RF + 0.5, 1.25, ('#e8e4f0', 0.02), 'cake_case', emit=('#ffd8a0', 0.3))
S.letters(k, 'GLASS & STEAM', 'PoiretOne', 54.8, RF + 0.36, 2.58, size=0.3, col='#ffe0b0', energy=6)
for (x, r) in ((53.5, 14.4), (56.3, 14.4)):
    Y.cafe_table(k, x, r, top='#2a2a3e', neon=CYAN)
k.solid(52.0, RF - 0.1, 57.6, RF + 0.62)
st.vent(53.2, RF + 0.3, 1.5)

# ---- the shuttered boutique and the service door at the west end (x 4..12) ---------------------------------------------
shopfront(5.0, 11.4, '#3a4a6a')
k.boxes([(5.2, RF + 0.06, z, 11.2, RF + 0.08, z + 0.05) for z in [0.3 + i * 0.07 for i in range(16)]], ('#5a5e6a', 0.08), 'shutter')
S.lightbox(k, 'KIRA · SILKS', 'PoiretOne', 8.2, RF + 0.36, 2.58, 3.2, 0.3, bg='#f0e8f8', ink='#4a2a6a', size=0.22, energy=4)
D.graffiti(k, 5.4, 7.0, RF + 0.09, 0.5, 1.2, Y.PINK, rng=rng)

# ======================================================================================================================
# the Loop's TERRACES station, east: a platform under a canopy, the track on its viaduct
# ======================================================================================================================
SX0, SX1 = 59.0, 87.0
PR0 = 8.0                       # the platform's back edge (the track's behind it)
TRK = 6.2                       # the track's centre row
deck(SX0, PR0, SX1, RF, tones=('#2c3044', '#283040'), edge=False)
walk(60, int(PR0), 86, int(RF) - 1)
# the platform edge: a yellow line of tactile studs, then the gap, then the track
k.box(SX0, PR0, 0.0, SX1, PR0 + 0.3, 0.012, '#d8b830', 'platform_edge')
k.boxes([(x, PR0 + 0.08, 0.012, x + 0.05, PR0 + 0.22, 0.02) for x in [SX0 + 0.1 + i * 0.16 for i in range(int((SX1 - SX0) / 0.16))]],
        '#b89820', 'tactile')
k.box(SX0, PR0 - 0.02, -0.5, SX1, PR0, 0.0, ('#2a2e3a', 0.05), 'platform_face')
k.box(SX0, PR0 - 0.01, -0.12, SX1, PR0 + 0.01, -0.08, shade(CYAN, 0.4), 'platform_led', emit=(CYAN, 0.9))
# the viaduct: a deep concrete beam, the two rails glowing faintly, a power rail; it runs from the tower's portal off east
VX0, VX1 = 56.0, 96.0
k.box(VX0, TRK - 1.5, -2.6, VX1, TRK + 1.5, -0.55, ('#2a2c36', 0.06), 'viaduct')
k.box(VX0, TRK + 1.5, -2.6, VX1, TRK + 1.52, -0.55, ('#30323e', 0.05), 'viaduct_face')
k.box(VX0, TRK + 1.52, -0.9, VX1, TRK + 1.54, -0.85, shade(Y.PINK, 0.4), 'viaduct_led', emit=(Y.PINK, 0.85))
k.box(VX0, TRK - 1.5, -0.55, VX1, TRK + 1.5, -0.45, ('#1a1c24', 0.05), 'track_bed')
sleepers = [(x, TRK - 0.9, -0.45, x + 0.18, TRK + 0.9, -0.38) for x in [VX0 + i * 0.45 for i in range(int((VX1 - VX0) / 0.45))]]
k.boxes(sleepers, ('#3a3a42', 0.08), 'sleeper')
for dr in (-0.55, 0.55):
    k.box(VX0, TRK + dr - 0.05, -0.38, VX1, TRK + dr + 0.05, -0.28, ('#9aa0ae', 0.04), 'rail')
k.box(VX0, TRK - 1.1, -0.38, VX1, TRK - 1.02, -0.3, shade(CYAN, 0.4), 'power_rail', emit=(CYAN, 0.5))
for x in [VX0 + 2 + i * 5.0 for i in range(8)]:                         # the piers under it, dropping into the dark
    k.box(x - 0.4, TRK - 0.8, -8.0, x + 0.4, TRK + 0.8, -2.6, ('#262830', 0.06), 'viaduct_pier')
# the portal in the tower's flank where the track comes out
k.box(55.0, TRK - 2.0, -2.6, 58.0, TRK + 1.6, 3.0, ('#1c2030', 0.06), 'portal_wall')
k.box(55.6, TRK + 1.6, -0.5, 57.6, TRK + 1.62, 1.6, '#06060c', 'portal_mouth')
k.box(55.5, TRK + 1.6, 1.6, 57.7, TRK + 1.7, 1.75, shade(CYAN, 0.4), 'portal_led', emit=(CYAN, 0.9))
for i in range(4):
    k.box(55.8 + i * 0.5, TRK + 1.62, 1.2, 56.0 + i * 0.5, TRK + 1.63, 1.4, '#ff5050', 'portal_lamp', emit=('#ff5050', 0.8))
# the east end: the track runs into the next tower's flank through a lit portal
k.box(86.0, TRK - 2.4, -2.6, 92.0, TRK + 1.6, 6.0, ('#1c2030', 0.06), 'portal_wall')
k.box(86.0, TRK + 1.6, -0.5, 86.02, TRK + 1.62, 6.0, ('#22283a', 0.05), 'portal_wall')
k.box(86.4, TRK + 1.6, -0.5, 88.4, TRK + 1.63, 1.6, '#06060c', 'portal_mouth')
k.box(86.3, TRK + 1.6, 1.6, 88.5, TRK + 1.7, 1.75, shade(CYAN, 0.4), 'portal_led', emit=(CYAN, 0.9))
for i in range(4):
    k.box(86.6 + i * 0.5, TRK + 1.63, 1.2, 86.8 + i * 0.5, TRK + 1.64, 1.4, '#ff5050', 'portal_lamp', emit=('#ff5050', 0.8))
for j in range(5):                                                       # the tower's lit floors over the portal
    z = 2.0 + j * 0.8
    k.box(86.2, TRK + 1.6, z, 91.8, TRK + 1.64, z + 0.5, shade(rng.choice(('#ffd890', '#a0e0ff')), 0.5), 'window_lit',
          emit=(rng.choice(('#ffd890', '#a0e0ff')), 0.6))
# the canopy: slim steel columns along the back of the platform, a glass roof with LED edges
for x in [SX0 + 1.5 + i * 4.0 for i in range(7)]:
    k.cyl(x, PR0 + 0.6, 0.0, 3.4, 0.07, (STEEL, 0.05), 'canopy_column', verts=10)
    k.solid_post(x, PR0 + 0.6)
    k.tube((x, PR0 + 0.6, 3.4), (x, PR0 + 2.0, 3.55), 0.05, (STEEL, 0.05), 'canopy_arm', verts=6)
for x in [SX0 + 0.2 + i * 0.8 for i in range(int((SX1 - SX0) / 0.8))]:      # an open lattice of fins, not a slab
    k.box(x, PR0 + 0.5, 3.52, x + 0.08, PR0 + 2.1, 3.62, ('#3a5868', 0.03), 'canopy_fin')
k.box(SX0, PR0 + 0.5, 3.5, SX1, PR0 + 0.6, 3.6, (STEEL, 0.05), 'canopy_beam')
k.box(SX0, PR0 + 2.05, 3.5, SX1, PR0 + 2.12, 3.6, (STEEL, 0.05), 'canopy_beam')
k.box(SX0, PR0 + 2.1, 3.46, SX1, PR0 + 2.14, 3.5, shade(CYAN, 0.4), 'canopy_led', emit=(CYAN, 0.9))
for x in [SX0 + 3.5 + i * 4.0 for i in range(6)]:
    k.box(x - 0.6, PR0 + 0.4, 3.4, x + 0.6, PR0 + 0.8, 3.5, '#e8f8ff', 'canopy_lamp', emit=(ICE, 0.95))
    k.point_light(x, PR0 + 0.8, 3.2, '#d8f4ff', 28, radius=0.5, group='lamp')
# the Loop's roundel and the station name, the departure board, benches, a ticket gate
S.neon(k, 'TERRACES', 'Audiowide', 73.0, PR0 + 2.12, 3.05, size=0.42, col=ICE, board='#0a1420', energy=10)
for cx in (65.0, 81.0):
    k.cyl(cx, PR0 + 0.62, 2.0, 2.7, 0.05, (STEEL, 0.05), 'roundel_post', verts=6)
    k.cyl_y(cx, PR0 + 0.66, PR0 + 0.72, 2.95, 0.34, 0.34, '#e83a6a', 'roundel', emit=('#ff4a80', 0.85), verts=20)
    k.cyl_y(cx, PR0 + 0.72, PR0 + 0.74, 2.95, 0.2, 0.2, '#0a1420', 'roundel_hole', verts=20)
    k.box(cx - 0.5, PR0 + 0.74, 2.88, cx + 0.5, PR0 + 0.76, 3.02, '#1a4a8a', 'roundel_bar', emit=('#3a7ad8', 0.9))
k.box(70.4, PR0 + 0.5, 1.7, 75.6, PR0 + 0.6, 2.5, ('#0c0e14', 0.04), 'departures')
for i, (txt_w, col) in enumerate(((3.6, '#ffb040'), (3.0, '#ffb040'), (4.2, ICE))):
    k.box(70.7, PR0 + 0.6, 2.25 - i * 0.2, 70.7 + txt_w, PR0 + 0.62, 2.33 - i * 0.2, shade(col, 0.4), 'departure_line', emit=(col, 0.9))
for x in (62.5, 68.0, 78.0, 84.0):
    Y.metal_bench(k, x - 0.9, x + 0.9, PR0 + 3.0, neon=CYAN)
k.box(60.0, RF - 0.6, 0.0, 60.3, RF + 0.2, 1.0, ('#2a2e3a', 0.05), 'gate_post')
for x in (61.3, 62.6):
    k.box(x, RF - 0.5, 0.0, x + 0.25, RF + 0.1, 1.0, ('#2a2e3a', 0.05), 'ticket_gate')
    k.box(x, RF - 0.5, 1.0, x + 0.25, RF + 0.1, 1.02, shade('#40e080', 0.4), 'gate_light', emit=('#40e080', 0.8))
k.solid(60.0, RF - 0.6, 60.3, RF + 0.2)

# ======================================================================================================================
# out over the drop: HALO, LUMEN, CIRRUS and the cab pad, cantilevered off the deck's front edge
# ======================================================================================================================
def terrace(x0, x1, r1, tones=GLASSF, wood=False):
    """A cantilevered terrace off the main deck: its slab, glass balustrades round its three open sides, brackets
    under it reaching back to the tower below."""
    if wood:
        PH.decking(k, x0, FRONT, x1, r1)
        k.box(x0, FRONT, -0.8, x1, r1, -0.04, ('#1a1c2a', 0.06), 'deck_slab')
    else:
        deck(x0, FRONT, x1, r1, tones=tones, edge=False, under=0.8)
    k.box(x0, r1, -0.8, x1, r1 + 0.05, -0.04, ('#2a2e3e', 0.05), 'deck_fascia')
    k.box(x0, r1 + 0.05, -0.3, x1, r1 + 0.07, -0.24, shade(CYAN, 0.4), 'deck_led', emit=(CYAN, 0.85))
    PH.glass_balustrade(k, (x0, r1 - 0.12), (x1, r1 - 0.12), post=STEEL, rail='#c8d4dc')
    PH.glass_balustrade(k, (x0 + 0.12, FRONT), (x0 + 0.12, r1 - 0.12), post=STEEL, rail='#c8d4dc')
    PH.glass_balustrade(k, (x1 - 0.12, FRONT), (x1 - 0.12, r1 - 0.12), post=STEEL, rail='#c8d4dc')
    for x in [x0 + 1.0 + i * 3.0 for i in range(int((x1 - x0 - 1.0) / 3.0) + 1)]:
        k.tube((x, r1 - 0.2, -0.8), (x, FRONT + 0.5, -6.0), 0.09, ('#30343e', 0.05), 'bracket', verts=8)
    walk(int(x0) + 1, int(FRONT), int(x1) - 1, int(r1) - 1)
    return [round(x0, 3), round(r1 - 1.05 * C45, 3), round(x1, 3), round(r1 - 0.1 * C45, 3)]


def front_rail(x0, x1):
    """The main deck's own front edge where no terrace hangs off it."""
    PH.glass_balustrade(k, (x0, FRONT - 0.12), (x1, FRONT - 0.12), post=STEEL, rail='#c8d4dc')
    k.box(x0, FRONT, -1.0, x1, FRONT + 0.05, -0.04, ('#2a2e3e', 0.05), 'deck_fascia')
    k.box(x0, FRONT + 0.05, -0.2, x1, FRONT + 0.07, -0.14, shade(CYAN, 0.4), 'deck_led', emit=(CYAN, 0.85))


def lower_terrace(x0, x1, r0, r1, z, lamps=WARM, tables=True):
    """A terrace further down the tower's face, seen over the edge: not reachable, just the city going on below."""
    k.box(x0, r0, z - 0.5, x1, r1, z, ('#1e2030', 0.06), 'lower_slab')
    k.box(x0, r0, z, x1, r1, z + 0.01, ('#2a2e40', 0.08), 'lower_floor')
    k.box(x0, r1, z - 0.5, x1, r1 + 0.04, z, ('#2a2e3e', 0.05), 'lower_fascia')
    k.box(x0, r1 + 0.04, z - 0.2, x1, r1 + 0.06, z - 0.14, shade(CYAN, 0.4), 'lower_led', emit=(CYAN, 0.8))
    k.box(x0, r1 - 0.06, z, x1, r1 - 0.02, z + 0.9, ('#7a9aaa', 0.02), 'lower_glass', emit=('#2a4858', 0.2))
    k.box(x0, r1 - 0.1, z + 0.9, x1, r1, z + 0.96, '#c8d4dc', 'lower_rail')
    k.box(x0, r0 - 0.4, z, x1, r0, z + 2.6, ('#161a28', 0.06), 'lower_wall')
    for x in [x0 + 0.5 + i * 0.9 for i in range(int((x1 - x0 - 0.5) / 0.9))]:
        k.box(x, r0 + 0.0, z + 0.3, x + 0.7, r0 + 0.02, z + 2.2, shade(lamps, 0.5), 'lower_window', emit=(lamps, 0.6))
    if tables:
        for x in [x0 + 1.2 + i * 2.0 for i in range(int((x1 - x0 - 1.2) / 2.0))]:
            r = (r0 + r1) / 2 + rng.uniform(-0.4, 0.4)
            k.cyl(x, r, z, z + 0.72, 0.36, ('#e8e0d0', 0.06), 'lower_table', verts=14)
            k.sphere(x, r, z + 0.8, 0.04, 0.05, '#fff0c0', 'lower_candle', emit=('#ffb040', 1.0), segs=5)
            for s in (-1, 1):
                k.cyl(x + s * 0.55, r, z, z + 0.45, 0.18, ('#3a3448', 0.08), 'lower_chair', verts=10)
    for x in [x0 + 0.3 + i * 1.6 for i in range(int((x1 - x0) / 1.6) + 1)]:
        k.tube((x, r1 - 0.2, z - 0.5), (x, r0 + 0.5, z - 5.0), 0.07, ('#30343e', 0.05), 'bracket', verts=6)
    k.point_light((x0 + x1) / 2, (r0 + r1) / 2, z + 1.5, lamps, 30, radius=0.6, group='lamp')


GLASS = []
front_rail(1.0, 4.0)
front_rail(24.5, 27.5)
front_rail(43.5, 47.0)
front_rail(70.5, 77.6)
front_rail(82.4, 87.0)

# ---- HALO, the grill (x 4..24.5, out to row 37): tables under festoons, heaters, the grill counter --------------------
GLASS.append(terrace(4.0, 24.5, 37.5, wood=True))
lower_terrace(5.0, 23.0, 35.0, 40.5, -3.6, lamps='#ffc890')
k.box(5.0, 28.0, 0.0, 10.4, 29.0, 1.0, ('#2a2a30', 0.06), 'grill_counter', bevel=0.02)       # the grill against the deck
k.box(4.95, 27.95, 1.0, 10.45, 29.05, 1.06, ('#5a5654', 0.05), 'grill_top')
k.box(5.4, 28.2, 1.06, 7.6, 28.8, 1.1, '#1a1010', 'grill_bars')
for i in range(9):
    k.box(5.5 + i * 0.24, 28.22, 1.1, 5.56 + i * 0.24, 28.78, 1.12, '#3a3030', 'grill_rod')
k.box(5.5, 28.25, 1.06, 7.5, 28.75, 1.08, '#ff6020', 'embers', emit=('#ff5010', 0.9))
for x in (5.9, 6.5, 7.1):
    k.box(x, 28.35, 1.12, x + 0.35, 28.6, 1.17, ('#7a3020', 0.1), 'steak')
k.point_light(6.5, 28.8, 1.5, '#ff8040', 18, radius=0.3, group='flicker')
st.vent(6.5, 28.5, 1.2)
k.box(8.0, 28.2, 1.06, 10.2, 28.8, 1.12, ('#e8e4dc', 0.04), 'pass_plates')
k.box(5.0, 27.6, 1.06, 10.4, 27.65, 2.2, '#1a1a1e', 'hood_back')
k.box(5.0, 27.6, 2.2, 10.4, 29.1, 2.45, ('#6a6e78', 0.04), 'grill_hood', bevel=0.02)
S.letters(k, 'HALO', 'Monoton', 7.7, 29.1, 2.15, size=0.5, col='#ffb060', energy=9)
k.solid(5.0, 27.6, 10.4, 29.1)
HALO_TABLES = [(12.5, 30.55), (16.5, 30.55), (20.5, 30.55), (8.5, 33.55), (12.5, 34.55), (16.5, 34.55), (20.5, 34.55)]
for (cx, cr) in HALO_TABLES:
    CA.dining_table(k, cx, cr, rad=0.46, cloth='#e8e2d6', chairs=((-1, 0), (1, 0)), chair_off=1.0, chair_col='#2a3a4a')
for (x, r) in ((10.6, 32.3), (18.6, 32.3)):                             # patio heaters, glowing at the top
    k.cyl(x, r, 0.0, 0.08, 0.22, (STEEL_D, 0.05), 'heater_base', verts=12)
    k.cyl(x, r, 0.08, 2.1, 0.04, (STEEL, 0.05), 'heater_pole', verts=8)
    k.cone(x, r, 2.1, 2.3, 0.08, 0.38, (STEEL, 0.05), 'heater_hat', verts=14)
    k.cyl(x, r, 1.8, 2.1, 0.07, '#ff6020', 'heater_glow', emit=('#ff6a20', 1.0), verts=10)
    k.point_light(x, r, 1.7, '#ff8040', 12, radius=0.2, group='flicker')
    k.solid_post(x, r)
posts = {n: PH.light_post(k, x, r) for n, (x, r) in {'a': (4.4, 27.4), 'b': (14.2, 27.4), 'c': (24.1, 27.4),
                                                      'd': (4.4, 37.2), 'e': (14.2, 37.2), 'f': (24.1, 37.2)}.items()}
BULBS = []
for (a, b) in (('a', 'e'), ('e', 'c'), ('d', 'b'), ('b', 'f'), ('a', 'b'), ('b', 'c'), ('d', 'e'), ('e', 'f')):
    BULBS += PH.festoon(k, posts[a], posts[b], sag=0.4, n=12, light_every=4, energy=2.4)
for (x, r) in ((23.5, 28.3), (4.9, 36.5), (23.5, 36.5)):
    PH.planter(k, x - 0.45, r - 0.4, x + 0.45, r + 0.4, kind='grass', h=0.5)
k.box(11.0, 28.0, 0.0, 11.6, 28.5, 1.1, ('#14141a', 0.05), 'podium', bevel=0.02)          # the maitre d's podium
E.table_lamp(k, 11.3, 28.25, 1.1, base='#c8a040', shade_col='#f0dcb0', energy=4)
k.solid(11.0, 28.0, 11.6, 28.5)

# ---- LUMEN, the izakaya (x 27.5..43.5, out to row 36): low tables, cushions, red lanterns, a counter -------------------
GLASS.append(terrace(27.5, 43.5, 36.5, tones=('#3a2e28', '#352a24', '#3e3229')))
lower_terrace(28.5, 42.5, 34.0, 39.5, -3.2, lamps='#ff9a70')
k.box(28.6, 28.7, 0.0, 33.6, 29.35, 0.95, ('#3a1e18', 0.08), 'izakaya_counter', bevel=0.02)
k.box(28.55, 28.65, 0.95, 33.65, 29.4, 1.02, ('#8a5a30', 0.12), 'izakaya_top')
for i in range(5):
    k.cyl(29.0 + i * 0.95, 29.0, 1.02, 1.14, 0.06, ('#e8e0d0', 0.06), 'sake_cup', verts=8)
k.box(30.4, 27.9, 0.0, 33.4, 28.35, 0.9, ('#4a3a30', 0.08), 'izakaya_grill', bevel=0.02)
k.box(30.6, 27.95, 0.9, 33.2, 28.3, 0.95, '#ff6020', 'embers', emit=('#ff5010', 0.8))
for i in range(5):
    k.tube((30.8 + i * 0.5, 27.95, 1.0), (30.8 + i * 0.5, 28.3, 1.0), 0.02, '#b07a40', 'skewer', verts=4)
k.point_light(31.9, 28.3, 1.3, '#ff8040', 12, radius=0.3, group='flicker')
st.vent(31.9, 28.1, 1.0)
k.box(28.6, 27.55, 1.0, 33.6, 27.6, 2.2, ('#24120e', 0.06), 'izakaya_back')
for i in range(12):                                                      # sake bottles on the back shelf
    col = ('#2a4a2a', '#e8e0d0', '#4a2a1a', '#2a3a5a')[i % 4]
    k.cyl(28.9 + i * 0.4, 27.7, 1.5, 1.85, 0.06, (col, 0.05), 'bottle', verts=6)
k.box(28.6, 27.6, 1.48, 33.6, 27.85, 1.52, '#3a2414', 'shelf')
S.neon(k, 'LUMEN', 'DelaGothicOne', 31.1, 27.62, 2.4, size=0.42, col='#ff7a50', board='#14080a', energy=10)
k.solid(28.6, 28.6, 33.6, 29.4)
for x in (29.4, 30.6, 31.8, 33.0):
    Y.neon_stool(k, x, 29.75, seat='#c83a3a')
LUMEN_TABLES = [(36.5, 29.6), (40.5, 29.6), (30.5, 32.6), (34.5, 32.6), (38.5, 32.6), (42.0, 32.6)]
for (cx, cr) in LUMEN_TABLES:                                            # low tables with floor cushions
    k.box(cx - 0.6, cr - 0.4, 0.0, cx + 0.6, cr + 0.4, 0.38, ('#5a3418', 0.1), 'low_table', bevel=0.02)
    k.box(cx - 0.62, cr - 0.42, 0.38, cx + 0.62, cr + 0.42, 0.42, ('#7a4a24', 0.12), 'low_table_top')
    for s in (-1, 1):
        k.box(cx + s * 0.95 - 0.28, cr - 0.3, 0.0, cx + s * 0.95 + 0.28, cr + 0.3, 0.14, ('#8a2a2a', 0.1), 'zabuton', bevel=0.04)
    Y.bowl(k, cx - 0.2, cr, 0.42)
    k.cyl(cx + 0.25, cr + 0.1, 0.42, 0.56, 0.05, ('#e8e0d0', 0.05), 'sake_flask', verts=8)
    k.solid(cx - 0.6, cr - 0.4, cx + 0.6, cr + 0.4)
for i, x in enumerate([28.6 + i * 1.6 for i in range(10)]):             # lanterns on a line over the terrace
    Y.paper_lantern(k, x, 31.0, 2.5, col=('#e03030' if i % 3 else '#f0a030'), s=0.42, top=2.9)
k.tube((28.2, 31.0, 2.9), (43.0, 31.0, 2.9), 0.012, '#2a1a12', 'lantern_line', verts=4)
for x in (28.2, 43.0):
    k.cyl(x, 31.0, 0.0, 2.95, 0.05, ('#3a2414', 0.08), 'lantern_pole', verts=8)
    k.solid_post(x, 31.0)
E.potted_palm(k, 42.6, 35.4, h=1.2, pot='#2a2a30', leaf='#3a6a3a', fronds=7, s=0.8)

# ---- CIRRUS, the rooftop cocktail bar (x 47..70.5, out to row 39): a round bar, loungers, a fire table ----------------
GLASS.append(terrace(47.0, 70.5, 39.5, tones=('#2a2e44', '#262a40', '#30344a')))
lower_terrace(48.0, 69.5, 37.0, 42.5, -3.8, lamps='#c0a0ff')
BX, BR = 58.5, 31.0
CA.rim(k, E.ell(BX, BR, 2.4, 1.6, 40), E.ell(BX, BR, 1.85, 1.15, 40), 0.0, 1.0, ('#1a1c2a', 0.06), 'bar')
CA.rim(k, E.ell(BX, BR, 2.48, 1.68, 40), E.ell(BX, BR, 1.8, 1.1, 40), 1.0, 1.06, ('#e8e8f0', 0.04), 'bar_top')
CA.rim(k, E.ell(BX, BR, 2.42, 1.62, 40), E.ell(BX, BR, 2.36, 1.56, 40), 0.15, 0.2, shade(Y.PINK, 0.4), 'bar_led', emit=(Y.PINK, 0.9))
CA.bottle_tower(k, BX, BR - 0.6, h=2.4, rad=0.45)
for i in range(10):                                                     # coupes and highballs on the bar top
    a = i * 2 * math.pi / 10 + 0.3
    k.cyl(BX + math.cos(a) * 2.12, BR + math.sin(a) * 1.38, 1.06, 1.2, 0.04, ('#e0f0ff', 0.03), 'glass',
          emit=((Y.PINK, CYAN, Y.YEL, '#c080ff')[i % 4], 0.3), verts=6)
k.solid(BX - 2.5, BR - 1.7, BX + 2.5, BR + 1.7)
for a in [math.pi * f for f in (0.1, 0.2, 0.3, 0.7, 0.8, 0.9)]:          # stools round the bar, its front open
    PH.bar_stool(k, BX - math.cos(a) * 2.95, BR + math.sin(a) * 2.1, seat='#3a2a5a', metal='#c8ccd8')
S.neon(k, 'CIRRUS', 'Monoton', BX, BR - 0.2, 3.3, size=0.75, col='#ffb0e0', board='#100818', energy=14)
k.cyl(BX, BR, 2.4, 3.15, 0.05, (STEEL, 0.05), 'sign_mast', verts=6)
# the lounge: a long sectional facing the drop round a fire table, loungers along the rail, little tables
PH.sectional(k, 50.0, 55.0, 34.6, 36.4, col='#3a3448', depth=0.85, arms=('left', 'right', 'back'),
             cushions=('#c86a9a', '#5ac8d0', '#e8c040'))
k.box(51.3, 37.0, 0.0, 53.7, 37.8, 0.38, ('#3a3a44', 0.05), 'fire_table', bevel=0.02)
k.box(51.5, 37.15, 0.38, 53.5, 37.65, 0.42, '#1a3a5a', 'fire_glass', emit=('#2a6a9a', 0.5))
for i in range(7):
    k.cone(51.7 + i * 0.27, 37.4, 0.42, 0.62 + 0.12 * ((i * 3) % 4) / 3, 0.07, 0.0, '#ffb040', 'flame', emit=('#ff8020', 1.0), verts=6)
k.point_light(52.5, 37.4, 0.9, '#ff9040', 22, radius=0.3, group='flicker')
k.solid(51.3, 37.0, 53.7, 37.8)
for x, towel in ((62.6, Y.PINK), (64.2, CYAN), (65.8, '#c080ff'), (67.4, Y.YEL)):
    PH.lounger(k, x, 34.6, towel=towel)
for (x, r) in ((49.5, 29.4), (66.0, 29.4), (69.4, 31.4)):
    CA.cocktail_table(k, x, r, glow=rng.choice((Y.PINK, CYAN)))
for (x, r) in ((47.8, 38.4), (69.7, 38.4), (69.7, 28.3)):
    PH.planter(k, x - 0.4, r - 0.4, x + 0.4, r + 0.4, kind='olive' if r > 30 else 'grass', h=0.5)
posts2 = {n: PH.light_post(k, x, r) for n, (x, r) in {'a': (47.4, 27.4), 'b': (58.8, 27.4), 'c': (70.1, 27.4),
                                                      'd': (47.4, 39.2), 'e': (58.8, 39.2), 'f': (70.1, 39.2)}.items()}
for (a, b) in (('a', 'e'), ('e', 'c'), ('d', 'b'), ('b', 'f')):
    BULBS += PH.festoon(k, posts2[a], posts2[b], sag=0.45, n=14, bulb='#ffd8f0', light_every=4, energy=2.2)
k.area_light(BX, BR + 4.0, 5.0, '#b080ff', 90, 6.0, rot=(math.radians(-15), 0, 0))

# ---- the air cab pad (x 76..84, out to row 39): a round pad on a stem, a cab waiting, the rank sign --------------------
PX, PR = 80.0, 34.0
walk(78, int(FRONT), 81, 29)
deck(77.5, FRONT, 82.5, 30.0, edge=False, under=0.6)
for x in (77.6, 82.4):
    PH.glass_balustrade(k, (x, FRONT), (x, 29.4), post=STEEL, rail='#c8d4dc')
k.cyl(PX, PR, -0.6, -0.02, 4.4, ('#1e2030', 0.06), 'pad_slab', verts=48)
k.cyl(PX, PR, -0.02, 0.0, 4.3, ('#262a3a', 0.06), 'pad_floor', verts=48)
k.cyl(PX, PR, 0.0, 0.006, 3.2, '#2e3248', 'pad_floor', verts=48)
for i in range(36):
    a = i * math.pi / 18
    k.cyl(PX + math.cos(a) * 4.15, PR + math.sin(a) * 4.15, 0.0, 0.05, 0.06, '#103038', 'pad_light',
          emit=((Y.YEL if i % 3 else CYAN), 0.95), verts=6)
k.box(PX - 0.9, PR - 0.15, 0.006, PX + 0.9, PR + 0.15, 0.01, '#e8d040', 'pad_mark')
k.box(PX - 0.15, PR - 1.2, 0.006, PX + 0.15, PR + 1.2, 0.01, '#e8d040', 'pad_mark')
k.cone(PX, PR + 1.0, -9.0, -0.6, 0.8, 1.6, ('#1a1c26', 0.06), 'pad_stem', verts=20)
for a in range(0, 360, 12):                                              # the pad's rail, glass all round but the way in
    if 248 < a < 292:
        continue
    t0, t1 = math.radians(a), math.radians(a + 12)
    k.bar(PX + math.cos(t0) * 4.25, PR + math.sin(t0) * 4.25, PX + math.cos(t1) * 4.25, PR + math.sin(t1) * 4.25,
          0.0, 0.9, 0.03, ('#7a9aaa', 0.02), 'pad_glass', emit=('#2a4858', 0.2))
    k.bar(PX + math.cos(t0) * 4.25, PR + math.sin(t0) * 4.25, PX + math.cos(t1) * 4.25, PR + math.sin(t1) * 4.25,
          0.9, 0.96, 0.07, '#c8d4dc', 'pad_rail')
for cx, cr in [(PX + math.cos(math.radians(a)) * 4.25, PR + math.sin(math.radians(a)) * 4.25) for a in range(0, 360, 12)]:
    if (cx - PX) ** 2 + (cr - PR) ** 2 > 0 and not (248 < math.degrees(math.atan2(cr - PR, cx - PX)) % 360 < 292):
        k.solid(cx - 0.1, cr - 0.1, cx + 0.1, cr + 0.1)


def air_cab(cx, cr, col='#e8b830'):
    """A hover cab waiting on the pad: a rounded body in the company's yellow, a glass bubble, lift pods glowing."""
    k.blob(cx, cr, 0.65, 1.15, 0.55, 0.35, (col, 0.06), 'cab_body', segs=18)
    k.blob(cx + 0.2, cr, 0.95, 0.6, 0.42, 0.3, '#142030', 'cab_glass', emit=('#2a4a70', 0.35), segs=16)
    k.box(cx - 1.1, cr + 0.48, 0.55, cx + 1.1, cr + 0.52, 0.62, '#141416', 'cab_stripe')
    k.box(cx - 0.5, cr - 0.12, 1.22, cx - 0.1, cr + 0.12, 1.32, '#e8c040', 'cab_sign', emit=('#ffd860', 0.95))
    for s in (-1, 1):
        k.cyl(cx + s * 0.75, cr, 0.12, 0.3, 0.2, '#2a2a30', 'cab_pod', verts=14)
        k.cyl(cx + s * 0.75, cr, 0.08, 0.12, 0.16, shade(CYAN, 0.45), 'cab_pod_glow', emit=(CYAN, 0.95), verts=14)
    k.sphere(cx + 1.15, cr - 0.2, 0.62, 0.06, 0.04, '#fff6e0', 'cab_head', emit=('#fff2d0', 1.0), segs=8)
    k.sphere(cx + 1.15, cr + 0.2, 0.62, 0.06, 0.04, '#fff6e0', 'cab_head', emit=('#fff2d0', 1.0), segs=8)
    k.point_light(cx, cr + 0.4, 0.1, CYAN, 6, radius=0.3, group='flicker')
    k.solid(cx - 1.2, cr - 0.6, cx + 1.2, cr + 0.6)


air_cab(PX + 0.8, PR - 0.6)
k.box(PX - 3.2, PR - 2.2, 0.0, PX - 2.6, PR - 1.6, 1.0, ('#2a2e3a', 0.05), 'rank_post')
k.box(PX - 3.5, PR - 1.95, 1.0, PX - 2.3, PR - 1.85, 1.7, '#14181e', 'rank_sign', emit=('#3a4a5a', 0.3))
S.letters(k, 'AIR CABS', 'Audiowide', PX - 2.9, PR - 1.84, 1.24, size=0.2, col='#ffd860', energy=6)
k.solid(PX - 3.2, PR - 2.2, PX - 2.6, PR - 1.6)
for r in range(30, 39):
    for x in range(76, 85):
        if (x + 0.5 - PX) ** 2 / 3.9 ** 2 + (r + 0.5 - PR) ** 2 / 3.7 ** 2 < 1.0:
            WALK.append((x, r, x, r))

# ======================================================================================================================
# west: the skybridge in from Skyport 7, and across the gap the next tower, its flats lit
# ======================================================================================================================
BR0, BR1 = 18.0, 21.0
k.box(-3.0, BR0, -0.6, 1.0, BR1 + 1.0, -0.04, ('#1a1c2a', 0.06), 'bridge_slab')
Y.tile_floor(k, -3.0, BR0, 1.0, BR1 + 1.0, tones=GLASSF, size=1.0, seam='#121624')
for r in (BR0, BR1 + 1.0):                                               # a glass tube: ribs over the bridge
    k.box(-3.0, r - 0.05, 0.0, 1.0, r + 0.05, 2.6, ('#5a8090', 0.02), 'bridge_glass', emit=('#2a4a5a', 0.2))
for x in (-2.5, -1.5, -0.5, 0.5):
    k.tube((x, BR0, 0.0), (x, BR0, 2.6), 0.05, (STEEL, 0.05), 'bridge_rib', verts=6)
    k.tube((x, BR0, 2.6), (x, BR1 + 1.0, 2.6), 0.05, (STEEL, 0.05), 'bridge_rib', verts=6)
    k.tube((x, BR1 + 1.0, 0.0), (x, BR1 + 1.0, 2.6), 0.05, (STEEL, 0.05), 'bridge_rib', verts=6)
k.box(-3.0, BR1 + 0.95, 0.04, 1.0, BR1 + 1.0, 0.08, shade(CYAN, 0.4), 'bridge_led', emit=(CYAN, 0.9))
S.letters(k, 'SKYPORT 7', 'Audiowide', -0.6, BR0, 2.75, size=0.26, col=ICE, energy=6)
walk(0, int(BR0), 0, int(BR1))
k.solid(0.0, 13.0, 1.0, BR0 - 0.05)
k.solid(0.0, BR1 + 1.0, 1.0, FRONT)
# the near tower across the gap (north-west), close enough to see into: flats behind big windows
NX0, NX1, NR = -7.0, 3.5, 9.6
k.box(NX0, NR - 3.0, -10.0, NX1, NR, 14.0, ('#1c1a26', 0.06), 'tower')
for j in range(9):
    z = -2.0 + j * 1.6
    k.box(NX0, NR, z, NX1, NR + 0.06, z + 0.15, ('#2a2632', 0.05), 'spandrel')
    for i in range(4):
        x = NX0 + 0.4 + i * 2.6
        lit = rng.random() < 0.7
        col = rng.choice(('#ffd0a0', '#ffe0b0', '#a0d8ff', '#ffb8d8'))
        k.box(x, NR, z + 0.2, x + 2.2, NR + 0.02, z + 1.45, ('#0c0e18', 0.04) if not lit else shade(col, 0.42), 'flat_window',
              emit=None if not lit else (col, 0.5))
        if lit:                                                          # what's inside: a lamp, a sofa, someone, a plant
            what = rng.choice(('lamp', 'sofa', 'person', 'plant', 'tv'))
            if what == 'lamp':
                k.cyl(x + 0.5, NR + 0.03, z + 0.2, z + 0.9, 0.02, '#2a2420', 'flat_lamp', verts=5)
                k.cone(x + 0.5, NR + 0.03, z + 0.85, z + 1.05, 0.14, 0.06, '#fff0d0', 'flat_shade', emit=('#ffd890', 0.9), verts=8)
            elif what == 'sofa':
                k.box(x + 0.4, NR + 0.03, z + 0.2, x + 1.6, NR + 0.05, z + 0.55, '#3a2a4a', 'flat_sofa')
            elif what == 'person':
                k.blob(x + 1.1, NR + 0.04, z + 0.65, 0.12, 0.01, 0.3, '#100c14', 'silhouette', segs=8)
            elif what == 'plant':
                k.blob(x + 1.8, NR + 0.04, z + 0.6, 0.2, 0.01, 0.3, '#1a3a24', 'flat_plant', segs=8)
            else:
                k.box(x + 0.6, NR + 0.03, z + 0.55, x + 1.5, NR + 0.05, z + 1.05, '#40a0ff', 'flat_tv', emit=('#60b0ff', 0.9))
    if rng.random() < 0.5:
        k.box(NX0 + 0.2, NR + 0.06, z + 0.0, NX1 - 0.2, NR + 0.7, z + 0.08, ('#2a2632', 0.05), 'flat_balcony')
        k.box(NX0 + 0.2, NR + 0.66, z + 0.08, NX1 - 0.2, NR + 0.7, z + 0.7, ('#6a8a9a', 0.02), 'flat_balcony_glass')
k.solid(0, 0, COLS, 8)

# ---- life along the deck: lamps, planters, benches, a holo-kiosk, a drone parked, bins --------------------------------
for x in (8.0, 20.0, 38.0, 54.0, 68.0, 84.0):
    Y.street_lamp(k, x, 25.6, col=CYAN if x < 40 else ICE)
for (x, r) in ((3.0, 15.0), (3.0, 24.0), (39.5, 18.6), (86.0, 15.0), (86.0, 24.0)):
    PH.planter(k, x - 0.5, r - 0.5, x + 0.5, r + 0.5, kind='olive', h=0.55)
for (x0, x1, r, n) in ((13.0, 15.0, 23.4, CYAN), (22.0, 24.0, 23.4, Y.PINK), (52.0, 54.0, 23.4, CYAN), (60.0, 62.0, 18.4, Y.PINK)):
    Y.metal_bench(k, x0, x1, r, neon=n)
Y.holo_kiosk(k, 40.5, 15.4)
Y.vending_machine(k, 58.4, RF + 0.1, w=0.8)
k.solid(57.9, RF, 58.9, RF + 0.8)
Y.trash_can(k, 27.4, 15.0)
Y.trash_can(k, 61.0, 15.0)
D.drone_parked(k, 70.0, 16.0)

# ---- the sky garden: real trees in round steel planters, benches round them ---------------------------------------
import assets_town as W                                                  # noqa: E402
for (x, r, h) in ((17.5, 19.6, 2.6), (46.5, 19.6, 2.9), (66.5, 19.6, 2.5), (8.0, 19.6, 2.2)):
    k.cyl(x, r, 0.0, 0.55, 1.15, ('#2a2e3a', 0.05), 'planter', verts=24)
    k.cyl(x, r, 0.55, 0.6, 1.2, ('#c8d4dc', 0.04), 'planter_rim', verts=24)
    k.cyl(x, r, 0.0, 0.08, 1.2, shade(CYAN, 0.4), 'planter_led', emit=(CYAN, 0.7), verts=24)
    k.cyl(x, r, 0.55, 0.58, 1.1, '#2a1e16', 'soil', verts=24)
    W.tree(k, x, r, h=h + 0.55, tone=rng.choice(('#2e5434', '#3a5a2e', '#2a4e3a')))
    for a in range(10):                                                  # flowers round the trunk
        ang = a * 0.63
        k.sphere(x + math.cos(ang) * 0.75, r + math.sin(ang) * 0.6, 0.62, 0.06, 0.05,
                 rng.choice(('#f0a0c8', '#f0f0f0', '#a0c8f0')), 'flower', segs=5)
    k.solid(x - 1.15, r - 1.15, x + 1.15, r + 1.15)
# a sculpture at the middle of it all: a ring of brushed steel standing on its edge, lit from inside — the Halo
HX, HR = 31.0, 19.4
k.box(HX - 0.9, HR - 0.5, 0.0, HX + 0.9, HR + 0.5, 0.3, ('#2a2e3a', 0.05), 'plinth')
for i in range(36):
    a0, a1 = i * math.pi / 18, (i + 1) * math.pi / 18
    k.tube((HX + math.cos(a0) * 1.0, HR, 1.4 + math.sin(a0) * 1.0), (HX + math.cos(a1) * 1.0, HR, 1.4 + math.sin(a1) * 1.0),
           0.12, ('#c8d0dc', 0.03), 'sculpture', verts=8, smooth=False)
    k.tube((HX + math.cos(a0) * 0.86, HR, 1.4 + math.sin(a0) * 0.86), (HX + math.cos(a1) * 0.86, HR, 1.4 + math.sin(a1) * 0.86),
           0.03, shade(CYAN, 0.5), 'sculpture_led', emit=(CYAN, 0.9), verts=5, smooth=False)
k.point_light(HX, HR + 0.6, 1.4, '#a0f0ff', 18, radius=0.4, group='lamp')
k.solid(HX - 0.9, HR - 0.5, HX + 0.9, HR + 0.5)
# signposts: which way to everything, the level on top
def signpost(x, r, lines):
    k.cyl(x, r, 0.0, 2.2, 0.05, (STEEL_D, 0.05), 'signpost', verts=8)
    k.box(x - 0.18, r - 0.1, 2.2, x + 0.18, r + 0.1, 2.5, ('#0a1420', 0.05), 'signpost_cap')
    k.box(x - 0.16, r + 0.1, 2.26, x + 0.16, r + 0.11, 2.44, shade(CYAN, 0.4), 'signpost_l200', emit=(CYAN, 0.9))
    for i, (txt, side, col) in enumerate(lines):
        z = 1.95 - i * 0.32
        x0, x1 = (x - 1.3, x - 0.05) if side < 0 else (x + 0.05, x + 1.3)
        k.box(x0, r - 0.03, z - 0.12, x1, r + 0.03, z + 0.12, ('#141c2a', 0.05), 'signpost_arm')
        S.letters(k, txt, 'RussoOne', (x0 + x1) / 2, r + 0.03, z - 0.08, size=0.14, col=col, energy=4)
    k.solid_post(x, r)


signpost(4.5, 16.0, [('SKYPORT 7', -1, ICE), ('THE LOOP', 1, '#ff7aa0'), ('EXPRESS', 1, '#f0d8a0')])
signpost(39.0, 15.6, [('THE ATRIUM', -1, ICE), ('THE LOOP', 1, '#ff7aa0'), ('CIRRUS', 1, '#ffb0e0')])
signpost(70.5, 24.5, [('HALO', -1, '#ffb060'), ('AIR CABS', 1, '#ffd860'), ('MOONGLOW', -1, '#8aa8ff')])
# a newsstand, a scooter dock, a holo info board, bins and bollards
k.box(25.6, 14.6, 0.0, 27.4, 15.4, 1.2, ('#1a3a4a', 0.06), 'newsstand', bevel=0.02)
k.box(25.5, 14.5, 1.2, 27.5, 15.6, 1.3, ('#e8c040', 0.05), 'newsstand_roof')
for i in range(5):
    k.box(25.7 + i * 0.33, 15.4, 0.4, 25.95 + i * 0.33, 15.42, 0.95, rng.choice(('#e84060', '#40c8d8', '#e8e0d0', '#a060e0')), 'magazine',
          emit=(rng.choice((Y.PINK, CYAN)), 0.2))
k.solid(25.6, 14.6, 27.4, 15.4)
for i in range(6):                                                   # e-scooters in a dock
    x = 75.5 + i * 0.45
    k.box(x - 0.04, 15.0, 0.0, x + 0.04, 16.2, 0.12, ('#e8e4dc', 0.04), 'scooter_deck')
    k.tube((x, 15.1, 0.1), (x, 15.0, 1.0), 0.025, ('#3a3e48', 0.04), 'scooter_stem', verts=5)
    k.tube((x - 0.18, 15.0, 1.0), (x + 0.18, 15.0, 1.0), 0.02, ('#3a3e48', 0.04), 'scooter_bar', verts=4)
    k.sphere(x, 15.02, 0.85, 0.03, 0.03, CYAN, 'scooter_light', emit=(CYAN, 0.9), segs=5)
k.box(75.2, 14.8, 0.0, 78.0, 15.0, 0.25, ('#2a2e3a', 0.05), 'scooter_dock')
k.solid(75.2, 14.8, 78.0, 16.2)
for x in (6.0, 12.0, 26.0, 37.0, 50.0, 62.0, 77.0, 83.0):            # bollards along the front edge, lit rings
    k.cyl(x, 26.4, 0.0, 0.55, 0.08, ('#2a2834', 0.06), 'bollard', verts=10)
    k.cyl(x, 26.4, 0.4, 0.46, 0.085, shade(CYAN, 0.4), 'bollard_band', emit=(CYAN, 0.8), verts=10)
    k.solid_post(x, 26.4)

# ---- light ---------------------------------------------------------------------------------------------------------
k.area_light(44.0, 18.0, 14.0, '#5a78c8', 2600, 60.0, rot=(math.radians(-25), 0, 0))       # the Mid-Levels' cool sky glow
k.area_light(44.0, 34.0, -6.0, '#ff70b0', 900, 60.0, rot=(math.radians(160), 0, 0))       # the District's glow from below
for (x, r) in ((8.0, 18.0), (30.0, 17.0), (45.0, 15.0), (62.0, 20.0), (78.0, 19.0)):
    k.point_light(x, r, 3.5, '#c8f0ff', 26, radius=0.6, group='lamp')
k.point_light(JX, RF + 1.2, 1.6, '#6080ff', 14, radius=0.3, group='flicker')
k.point_light(31.0, RF + 1.0, 2.0, '#c8f0ff', 30, radius=0.6, group='lamp')

preview(k)
k.render(OUT, light_states={'full': {'flicker': 1.0, 'lamp': 1.0}, 'dim': {'flicker': 0.74, 'lamp': 1.0}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#202a48', 0.55))

# ======================================================================================================================
# the world
# ======================================================================================================================
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Terraces', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [2, 19]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})


def look(label, x, y, text, **kw):
    it = {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO LOOK', 'dialog': text}
    it.update(kw)
    return it


def talk(label, x, y, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO TALK', 'dialog': text}


w['interactions'] = [
    {'x': 0, 'y': y, 'type': 'enter_world', 'target': 'arcadia-skypad', 'spawn': [21, 8], 'label': 'SKYBRIDGE · SKYPORT 7',
     'prompt': 'PRESS E TO CROSS'} for y in (19, 20)] + [
    {'x': 15, 'y': 12, 'type': 'enter_world', 'target': 'arcadia-jazz', 'spawn': [11, 11], 'label': 'MOONGLOW', 'prompt': 'PRESS E TO GO IN'},
    {'x': 31, 'y': 12, 'type': 'enter_world', 'target': 'arcadia-atrium', 'spawn': [16, 18], 'label': 'THE ATRIUM', 'prompt': 'PRESS E TO GO IN'},
    {'x': 43, 'y': 11, 'type': 'express_lift', 'shaft': 'spire', 'lobby': 'terraces', 'label': 'SPIRE EXPRESS', 'prompt': 'PRESS E TO CALL THE LIFT'},
    {'x': 48, 'y': 11, 'type': 'express_lift', 'shaft': 'core', 'lobby': 'terraces', 'label': 'CORE EXPRESS', 'prompt': 'PRESS E TO CALL THE LIFT'},
    {'x': 73, 'y': 9, 'type': 'loop_station', 'station': 'terraces', 'label': 'THE LOOP', 'prompt': 'PRESS E TO TAKE THE LOOP'},
    {'x': 79, 'y': 31, 'type': 'air_cab', 'pad': 'terraces', 'label': 'AIR CAB', 'prompt': 'PRESS E TO HAIL A CAB'},
    {'x': 21, 'y': 13, 'type': 'vendor', 'label': 'TSURU', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'spore_ramen', 'price': 12}, {'id': 'neon_udon', 'price': 8}]},
    {'x': 54, 'y': 13, 'type': 'vendor', 'label': 'GLASS & STEAM', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'cloud_espresso', 'price': 7}, {'id': 'glass_cake', 'price': 10}]},
    {'x': 8, 'y': 29, 'type': 'vendor', 'label': 'HALO GRILL', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'halo_skewers', 'price': 14}, {'id': 'cloud_espresso', 'price': 7}]},
    {'x': 31, 'y': 30, 'type': 'vendor', 'label': 'LUMEN', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'lumen_yakitori', 'price': 12}, {'id': 'spore_ramen', 'price': 12}, {'id': 'warm_sake', 'price': 8}]},
    {'x': 59, 'y': 32, 'type': 'vendor', 'label': 'CIRRUS BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'cirrus_sour', 'price': 12}, {'id': 'skyline_spritz', 'price': 10}, {'id': 'void_fizz', 'price': 7}]},
    talk('NADIA', 57, 32, 'NADIA SPINS A BOTTLE, CATCHES IT BEHIND HER BACK AND POURS WITHOUT LOOKING AT IT.'),
    talk('CHEF BASTIEN', 9, 30, 'THE CHEF TURNS FOUR STEAKS AT ONCE WITH ONE PAIR OF TONGS.'),
    talk('HIRO', 32, 28, 'HIRO WARMS A FLASK OF SAKE IN A PAN OF WATER, TESTING IT WITH A FINGERTIP.'),
    talk('DOVE', 80, 30, 'THE CAB DRIVER LEANS ON HER CAB AND WATCHES THE TRAFFIC LIKE IT OWES HER MONEY.'),
    talk('THE LIFT ATTENDANT', 46, 11, 'A LIFT ATTENDANT IN A GOLD-FRAGGED CAP, HANDS FOLDED, WAITS BY THE DIRECTORY.'),
    look('DEPARTURES', 72, 9, 'THE LOOP — NEXT TRAINS: LANTERN ROW 2 MIN · SPACEPORT 4 MIN · TERRACES (THIS STATION). THE RING TAKES TWELVE MINUTES ALL THE WAY ROUND.'),
    look('THE EDGE', 44, 26, 'GLASS, THEN TWO HUNDRED FLOORS OF NOTHING, THEN THE DISTRICT: PINK AND CYAN IN THE RAIN, SMALL AS A CIRCUIT BOARD. ABOVE, THROUGH THE SMOG, THE SPIRES ARE WHITE.',
         action='view', view='skyline'),
    look('THE EDGE', 2, 26, 'THE SKYBRIDGE SWINGS A LITTLE IN THE WIND. BELOW IT, A TRAFFIC LANE OF HOVER-CABS SLIDES PAST LIKE A STRING OF BEADS.', action='view', view='skyline'),
    look('THE NEXT TOWER', 2, 13, 'ACROSS THE GAP, CLOSE ENOUGH TO WAVE: SOMEONE WATCHING THE NEWS, SOMEONE WATERING A PLANT, SOMEONE ASLEEP ON A SOFA WITH THE CITY STILL ON.'),
    look('GLASS PANEL', 12, 22, 'YOU\'RE STANDING ON GLASS. FAR BELOW, A LOOP TRAIN SLIDES BETWEEN TWO TOWERS LIKE A NEEDLE THROUGH CLOTH.'),
    look('THE ATRIUM GLASS', 26, 13, 'BEHIND THE GLASS, GALLERIES OF SHOPS GO UP FLOOR OVER FLOOR, ESCALATORS CRISSCROSSING, A CHANDELIER OF LIGHT RODS HANGING DOWN THE MIDDLE.'),
    look('KIRA SILKS', 8, 13, 'SHUTTERED. A NOTE TAPED INSIDE: "GONE UP TO THE SPIRES TO SELL TO PEOPLE WITH MONEY. BACK WHEN THEY RUN OUT."'),
    look('LOUNGER', 62, 35, 'A WARM CUSHION, THE PINK OF CIRRUS\'S SIGN, THE TOWERS GOING ON FOR EVER.', prompt='PRESS E TO LIE BACK',
         action='sit', seat=[62.6, 35.85], facing='down', view='skyline'),
    look('THE FIRE TABLE', 52, 35, 'FLAMES STANDING UP OUT OF BLUE GLASS AT THE EDGE OF EVERYTHING. A COUPLE ON THE SOFA ARE PRETENDING NOT TO HOLD HANDS.',
         prompt='PRESS E TO SIT', action='sit', seat=[52.5, 35.3], facing='down', view='skyline'),
    look('MOONGLOW POSTER', 13, 13, 'TONIGHT AT MOONGLOW: THE ODETTE LARK QUARTET. "SET STARTS WHEN ODETTE SAYS SO."'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

# what you walk on is the decks; everything else (the drop, the tower) is solid
cells = set()
for (x0, r0, x1, r1) in WALK:
    for x in range(x0, x1 + 1):
        for r in range(r0, r1 + 1):
            cells.add((x, r))
for x in range(COLS):
    for r in range(ROWS):
        if (x, r) not in cells:
            k.blocked.add((x, r))
ACTORS = [{'sheet': 'npc-mixologist', 'x': 58, 'y': 31, 'facing': 'down'},
          {'sheet': 'npc-grill-chef', 'x': 9, 'y': 30, 'facing': 'up', 'light': [9, 30]},
          {'sheet': 'npc-izakaya', 'x': 32, 'y': 28, 'facing': 'down'},
          {'sheet': 'npc-cabbie', 'x': 80, 'y': 30, 'facing': 'down'},
          {'sheet': 'npc-liftman', 'x': 46, 'y': 11, 'facing': 'down'}]
for a in ACTORS:
    k.blocked.add((a['x'], a['y']))
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS,
            scene_extra={'backdrop': True, 'steam': st.steam, 'ads': st.ads})
w = json.load(open(WORLD))
w['skyline'] = {'baseRow': 2.0, 'railRow': ROWS + 1.5, 'centerCol': COLS / 2,
                'rain': {'drops': 170, 'splash': [1.5, 13.0, 86.5, 38.5]}}
w['view'] = [-6.0, -6.0, COLS + 1.0, ROWS + 4.0]
w['loop'] = {'track': [58.0, 86.4, TRK, -0.28]}
w['terraces'] = {'glass': GLASS, 'bulbs': BULBS, 'track': [VX0, TRK, VX1], 'platform': [SX0, PR0, SX1], 'pad': [PX, PR]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('terraces done')
