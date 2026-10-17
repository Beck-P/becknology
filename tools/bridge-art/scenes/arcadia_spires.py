"""The Spires — Halcyon's crown plaza, L480 (world id "arcadia-spires").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_spires.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-spires

Above the smog, the only place in Arcadia with real stars (js/skyline.js mode 'spires': the other spires and the smog
sea below with the Mid-Levels' tower tops through it). A platform of white stone hung on the side of Halcyon's tower,
quiet, lit by lamps, pastel neon and starlight. West, the sky gardens: lawns with real trees, clipped hedges, a long
reflecting pool with the stars in it, the tea salon under its striped awning and a pergola of wisteria over the tea
tables, the orangery behind. The middle, the crown plaza: gold-strip paving round an inlaid star, Halcyon's crown
fountain, winged statues, the foot of Halcyon's tower — LUMEN (the implant atelier), the Spire Express, the tower's
great doors, the Core Express, and the discreet bronze door of the Orrery (the members' club). East, the Lyra (the
opera) up its steps behind a colonnade, AURELLE (the champagne bar and sky lounge), and the sky docks out over the drop:
teak decking, the air cab pad, the dockmaster's kiosk, a luggage trolley, and the yacht Lumière lying alongside on her
lift fields. A white balustrade round it all, globes on its piers, a telescope at the front looking down into the smog.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_spires as SP             # noqa: E402
import assets_signs as S               # noqa: E402
import assets_town as T                # noqa: E402
import assets_penthouse as PH          # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-spires'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 96, 46
RB = 8.0                         # the buildings' faces
FRONT = 40.0                     # the plaza's front edge (the balustrade)
DOCK_FRONT = 41.4                # the sky docks reach a little further out
DX0 = 64.0                       # where the docks begin
k = Kit(COLS, ROWS, margin_top=4.5, margin_bottom=0.6, margin_x=0.5, seed=4801)
SAMPLES = int(os.environ.get('SAMPLES', 64))
from _manor import preview  # noqa: E402
preview(k)                       # PREVIEW=n: every pass at no more than n samples, for a quick look

# ---- the ground ------------------------------------------------------------------------------------------------------------
# the gardens' lawns and walks (west), the plaza's paving (middle and in front of the opera), the docks' teak (east front)
T.grass(k, 0.8, RB, 31.0, FRONT, tone='#2c4a34', tufts=0.4)
SP.gravel(k, 0.8, 16.5, 31.0, 18.0)                       # the long walk across the gardens
SP.gravel(k, 0.8, 30.5, 31.0, 32.0)
SP.gravel(k, 14.5, 18.0, 16.0, 30.5)                      # and down the middle, past the pool
SP.gravel(k, 14.5, 32.0, 16.0, FRONT)
SP.gravel(k, 2.0, RB, 18.5, 15.0)                          # the tea terrace under the pergola
SP.paving(k, 31.0, RB, DX0, FRONT, size=1.0, strip=4)
SP.paving(k, DX0, RB, 95.2, 28.0, size=1.0, strip=4)
PH.decking(k, DX0, 28.0, 95.2, DOCK_FRONT)
k.box(DX0, 27.92, -0.005, 95.2, 28.08, 0.006, (SP.GOLD, 0.2), 'deck_gold')
SP.star_inlay(k, 47.5, 31.0, 2.4)
# the platform's faces falling away into the smog
SP.deck_face(k, 0.6, DX0, FRONT + 0.2, depth=4.0)
SP.deck_face(k, DX0, 95.4, DOCK_FRONT + 0.2, depth=4.0, led=SP.MINT)
k.box(DX0 - 0.25, FRONT + 0.2, -4.0, DX0, DOCK_FRONT + 0.45, -0.02, (SP.STONE_D, 0.06), 'deck_face')
SP.deck_side(k, 0.6, RB, FRONT + 0.45, face=-1)
SP.deck_side(k, 95.4, RB, DOCK_FRONT + 0.45, face=1)

# ---- the balustrade round the edge ---------------------------------------------------------------------------------------------
SP.balustrade(k, 0.9, DX0, FRONT, lamps=4.0)
SP.balustrade(k, DX0, 79.0, DOCK_FRONT, lamps=3.8, glow=SP.MINT)
SP.balustrade(k, 81.5, 95.0, DOCK_FRONT, lamps=3.4, glow=SP.MINT)
SP.balustrade_v(k, DX0, FRONT, DOCK_FRONT, glow=SP.MINT)
SP.balustrade_v(k, 0.9, RB + 0.8, FRONT, lamps=4.5)
SP.balustrade_v(k, 95.0, RB + 0.8, DOCK_FRONT, lamps=4.5, glow=SP.MINT)
k.solid(0, 0, 1, ROWS)
k.solid(95, 0, COLS, ROWS)
k.solid(0, FRONT, DX0, ROWS)
k.solid(DX0, DOCK_FRONT, COLS, ROWS)
k.solid(0, 0, COLS, RB + 0.4)

# ---- west: the orangery, the tea salon, the pergola ---------------------------------------------------------------------------
SP.stone_facade(k, 0.6, 31.0, RB, 4.2, fins=1.6, band=3.3, glow='#ffe8c8', part='orangery')
k.box(0.4, RB - 1.4, 4.2, 31.2, RB + 0.2, 4.45, (SP.STONE_L, 0.05), 'orangery_parapet')
for x in [2.0 + i * 3.6 for i in range(9)]:                       # urns along the parapet
    k.cyl(x, RB - 0.2, 4.45, 4.7, 0.16, (SP.STONE_L, 0.05), 'urn', verts=10)
    with k.foliage('leaf'):
        T.leafy_crown(k, x, RB - 0.2, 4.95, 0.3, 0.26, 0.3, '#2e5038', part='urn_plant')
S.letters(k, 'THE SKY GARDENS', 'PoiretOne', 15.5, RB + 0.2, 3.55, size=0.32, col=SP.GOLD_L, energy=6)
S.neon(k, 'L480', 'PoiretOne', 28.6, RB + 0.2, 3.55, size=0.28, col=SP.LILAC)
# the tea salon: a counter under a striped awning, tins on the étagère, the hostess behind it
SP.tea_counter(k, 5.0, 12.0, RB + 1.2, RB + 1.8)
SP.awning(k, 4.4, 12.6, RB + 0.2, 2.5, depth=1.7)
S.neon(k, 'Thé', 'Pacifico', 8.5, RB + 0.2, 2.75, size=0.5, col=SP.PINK)
SP.pergola(k, 3.0, 17.5, 11.0, 14.2)
for (x, r) in ((4.6, 12.6), (7.6, 12.6), (10.6, 12.6), (13.6, 12.6), (16.4, 12.2)):
    SP.cafe_table(k, x, r)
SP.planter(k, 14.0, RB + 1.4, kind='flowers', w=1.4, d=0.7)
SP.planter(k, 16.4, RB + 1.4, kind='cone')
k.box(2.2, RB + 0.6, 0.0, 3.2, RB + 1.4, 0.9, ('#c8b090', 0.1), 'cake_trolley')         # a trolley of cakes by the counter
for i in range(3):
    k.cyl(2.7, RB + 1.0, 0.9 + i * 0.16, 0.98 + i * 0.16, 0.3 - i * 0.07, (('#f4c8d8', '#f8e8b0', '#c8e8d8')[i], 0.08), 'cake', verts=12)
k.solid(2.2, RB + 0.6, 3.2, RB + 1.4)

# ---- west: the gardens ---------------------------------------------------------------------------------------------------------
SP.reflecting_pool(k, 5.0, 22.0, 25.0, 25.2)
for (x, r, h, bloom) in ((3.0, 20.0, 3.2, None), (27.0, 20.0, 3.0, SP.PINK), (3.2, 27.5, 2.9, SP.PINK), (27.4, 27.8, 3.3, None),
                         (6.5, 35.5, 3.4, '#f8f0f4'), (23.8, 35.6, 3.0, None), (11.0, 36.8, 2.6, SP.PINK), (19.6, 36.5, 2.8, '#f8f0f4'),
                         (22.0, 20.0, 2.7, None), (8.5, 20.0, 2.8, '#f8f0f4')):
    SP.garden_tree(k, x, r, h=h, tone=k.rng.choice(('#2e5a3a', '#2a5240', '#34603a')), bloom=bloom)
SP.hedge(k, 1.4, 14.0, 19.0)
SP.hedge(k, 16.6, 30.6, 19.0)
SP.hedge(k, 1.4, 14.0, 29.6)
SP.hedge(k, 16.6, 30.6, 29.6)
SP.flower_border(k, 2.0, 13.8, 19.6)
SP.flower_border(k, 16.8, 30.2, 19.6)
SP.flower_border(k, 2.0, 13.8, 29.0)
SP.flower_border(k, 16.8, 30.2, 29.0)
for x in (9.0, 21.0):                                                   # benches along the pool
    SP.bench(k, x - 0.9, x + 0.9, 26.4, back=1)
SP.bench(k, 4.6, 6.4, 33.4, back=-1)
SP.bench(k, 24.0, 25.8, 33.4, back=-1)
for (x, r) in ((15.25, 21.0), (15.25, 27.0)):
    SP.planter(k, x, r, kind='tree', w=0.9, d=0.9, tone='#2e5a3a', bloom=SP.PINK)
for x in (2.0, 29.0):
    SP.lamp(k, x, 17.2, glow=SP.WARM)
    SP.lamp(k, x, 31.2, glow=SP.WARM)
SP.lamp(k, 13.8, 38.0)
SP.lamp(k, 16.7, 38.0)
# the gardener's barrow and her watering can, by the far hedge
k.box(26.0, 33.6, 0.25, 27.2, 34.4, 0.6, ('#3a5a4a', 0.1), 'barrow')
k.cyl_y(25.8, 33.7, 34.3, 0.2, 0.18, 0.18, '#2a2a2a', 'barrow_wheel', verts=10)
k.tube((27.2, 33.7, 0.55), (27.9, 33.7, 0.7), 0.02, '#5a4632', 'barrow_handle', verts=4)
k.tube((27.2, 34.3, 0.55), (27.9, 34.3, 0.7), 0.02, '#5a4632', 'barrow_handle', verts=4)
for i in range(5):
    k.cone(26.2 + i * 0.2, 34.0, 0.6, 0.85, 0.06, 0.01, '#3a7a40', 'cuttings', verts=4)
k.cyl(28.4, 34.8, 0.0, 0.32, 0.13, (SP.GOLD_D, 0.2), 'watering_can', verts=10)
k.tube((28.5, 34.8, 0.22), (28.8, 34.8, 0.42), 0.025, SP.GOLD_D, 'watering_can', verts=5)
k.solid(25.8, 33.6, 28.0, 34.4)

# ---- the middle: the foot of Halcyon's tower ------------------------------------------------------------------------------------
SP.stone_facade(k, 31.0, 62.0, RB, 7.5, fins=1.55, band=3.4, glow='#fff0dc', part='halcyon')
for x in [32.0 + i * 1.55 for i in range(20)]:                         # gold fins rising up the tower past the frame
    k.box(x - 0.04, RB + 0.16, 3.6, x + 0.04, RB + 0.36, 7.5, (SP.GOLD, 0.2), 'halcyon_fin')
S.letters(k, 'HALCYON', 'PoiretOne', 46.5, RB + 0.36, 4.3, size=0.95, col=SP.GOLD_L, energy=9, spacing=1.25)
S.neon(k, 'L480 · THE SPIRES', 'PoiretOne', 46.5, RB + 0.36, 3.75, size=0.26, col=SP.LILAC)
# LUMEN, the implant atelier: a jewel-box window, the name in fine gold, a pastel halo round the door
SP.shop_window(k, 32.2, 33.7, RB + 0.36, glow='#e8d8ff')
SP.shop_window(k, 35.3, 36.6, RB + 0.36, glow='#e8d8ff')
k.box(33.75, RB + 0.36, 0.0, 35.25, RB + 0.4, 2.3, '#14101c', 'lumen_door', emit=('#d8c8ff', 0.55))
S.letters(k, 'LUMEN', 'PoiretOne', 34.5, RB + 0.4, 2.5, size=0.36, col=SP.GOLD_L, energy=7, spacing=1.3)
S.neon(k, 'atelier', 'Pacifico', 34.5, RB + 0.4, 2.95, size=0.3, col=SP.LILAC)
for (x, c) in ((32.95, SP.PINK), (35.95, SP.BLUE)):                      # in the windows: an arm of chrome lace, an eye of light
    k.cyl(x, RB + 0.1, 0.5, 0.62, 0.22, (SP.STONE_L, 0.05), 'display_plinth', verts=12)
    k.blob(x, RB + 0.1, 1.15, 0.12, 0.08, 0.45, ('#d8dce8', 0.05), 'display_chrome', segs=10)
    k.sphere(x, RB + 0.12, 1.65, 0.12, 0.12, shade(c, 0.5), 'display_jewel', emit=(c, 0.95), segs=10)
SP.lift_doors(k, 40.0, RB + 0.36, 'SPIRE EXPRESS', sub='L480', glow=SP.BLUE)
SP.grand_doors(k, 47.0, RB + 0.36, w=2.6)
SP.lift_doors(k, 54.0, RB + 0.36, 'CORE EXPRESS', sub='L480', glow=SP.PEACH)
# the Orrery's door: dark bronze, a small brass plate, the orrery in gold neon over it
k.box(58.6, RB + 0.36, 0.0, 60.4, RB + 0.42, 2.4, ('#3a2a1c', 0.15), 'orrery_door', bevel=0.02)
k.box(58.5, RB + 0.3, 2.4, 60.5, RB + 0.44, 2.52, (SP.GOLD, 0.2), 'orrery_lintel')
k.box(59.35, RB + 0.42, 1.2, 59.65, RB + 0.45, 1.36, (SP.GOLD_L, 0.25), 'orrery_plate')
k.sphere(59.5, RB + 0.46, 3.05, 0.11, 0.11, shade(SP.PEACH, 0.6), 'orrery_sun', emit=(SP.PEACH, 1.0), segs=10)
for (rr, n) in ((0.3, 1), (0.48, 2), (0.66, 3)):
    pts = [(59.5 + math.cos(a / 24 * math.tau) * rr, RB + 0.46, 3.05 + math.sin(a / 24 * math.tau) * rr * 0.55) for a in range(25)]
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.012, shade(SP.GOLD_L, 0.5), 'neon', emit=(SP.GOLD_L, 0.85), verts=4)
    p = pts[(n * 7) % 24]
    k.sphere(p[0], p[1] + 0.01, p[2], 0.05, 0.05, SP.BLUE if n == 2 else SP.PINK, 'orrery_planet', emit=(SP.BLUE if n == 2 else SP.PINK, 0.9), segs=6)
k.point_light(59.5, RB + 0.8, 2.0, SP.PEACH, 6, radius=0.2, group='flicker')
for x in (37.7, 43.2, 50.8, 56.6):                                     # clipped balls along the tower's foot
    SP.planter(k, x, RB + 1.0, kind='ball', w=0.8, d=0.8)
for x in (31.6, 61.6):
    SP.planter(k, x, RB + 1.0, kind='cone', w=0.8, d=0.8)

# ---- the crown plaza ---------------------------------------------------------------------------------------------------------
SP.crown_fountain(k, 47.5, 21.5, rad=2.6)
for (x, r) in ((38.0, 26.5), (57.0, 26.5)):
    SP.statue(k, x, r)
for (x, r) in ((42.0, 17.0), (53.0, 17.0), (42.0, 26.5), (53.0, 26.5), (35.0, 34.5), (60.0, 34.5), (33.6, 14.0), (61.4, 14.0)):
    SP.lamp(k, x, r, glow=(SP.WARM if (x + r) % 2 < 1 else SP.LILAC))
for (x0, x1, r, b) in ((44.0, 46.0, 16.2, -1), (49.0, 51.0, 16.2, -1), (44.0, 46.0, 27.2, 1), (49.0, 51.0, 27.2, 1)):
    SP.bench(k, x0, x1, r, back=b)
for x in (36.0, 42.0, 53.0, 59.0):
    SP.planter(k, x, 36.0, kind='flowers', w=1.4, d=0.7)
SP.viewer(k, 47.5, 38.6)
SP.bench(k, 44.4, 46.2, 38.3, back=None)
SP.bench(k, 48.8, 50.6, 38.3, back=None)
# a flower seller's cart by the fountain
k.box(40.4, 30.6, 0.3, 41.8, 31.4, 0.85, ('#f0e8dc', 0.06), 'cart')
for s in (-1, 1):
    k.cyl_y(41.1 + s * 0.55, 31.4, 31.48, 0.3, 0.3, 0.3, (SP.GOLD, 0.2), 'cart_wheel', verts=14)
for i in range(16):
    k.sphere(40.6 + (i % 8) * 0.16, 30.8 + (i // 8) * 0.3, 0.92, 0.07, 0.06, (SP.PINK, '#f8f0f4', SP.LILAC, SP.PEACH)[i % 4], 'flower', segs=6)
k.tube((40.5, 30.7, 0.85), (40.5, 30.7, 1.8), 0.02, SP.GOLD, 'cart_pole', verts=4)
k.cone(41.1, 31.0, 1.75, 2.0, 0.9, 0.05, (SP.PINK, 0.08), 'cart_parasol', verts=12)
k.solid(40.4, 30.6, 41.8, 31.4)

# ---- east: the Lyra (the opera) ------------------------------------------------------------------------------------------------
SP.stone_facade(k, 62.0, 83.0, RB, 6.2, fins=1.4, band=4.6, glow='#ffd8a8', part='opera')
SP.stairs(k, 64.5, 81.0, RB + 0.36, n=3, tread=0.45, rise=0.12)
for x in [65.0 + i * 2.25 for i in range(8)]:                          # the colonnade on the top step
    SP.fluted_column(k, x, RB + 1.2, 3.9)
k.box(64.4, RB + 0.3, 3.9, 81.2, RB + 1.6, 4.4, (SP.STONE_L, 0.05), 'opera_entablature')
k.box(64.4, RB + 1.6, 4.0, 81.2, RB + 1.64, 4.3, (SP.GOLD, 0.2), 'opera_frieze')
S.letters(k, 'THE LYRA', 'CinzelDecorative-Bold', 72.75, RB + 1.64, 4.04, size=0.34, col=SP.GOLD_L, energy=8, spacing=1.2)
k.box(64.2, RB - 0.2, 4.4, 81.4, RB + 1.7, 4.62, (SP.STONE, 0.05), 'opera_attic')
for (x, kind) in ((66.1, 0), (79.4, 1)):
    SP.poster(k, x, RB + 0.36, 1.0, kind=kind)
for x in (71.4, 74.1):                                                 # the doors, light spilling out
    k.box(x - 0.7, RB + 0.36, 0.36, x + 0.7, RB + 0.4, 2.7, '#1a1408', 'opera_door', emit=('#ffcf90', 0.6))
    k.box(x - 0.8, RB + 0.34, 2.7, x + 0.8, RB + 0.44, 2.85, (SP.GOLD, 0.2), 'opera_door_head')
k.point_light(72.75, RB + 2.0, 1.4, '#ffd090', 30, radius=0.6, group='static')
S.neon(k, 'tonight · Starfall', 'Pacifico', 72.75, RB + 1.7, 3.35, size=0.3, col=SP.PINK)
for x in (63.4, 82.2):
    SP.lamp(k, x, RB + 2.4, glow=SP.WARM)
SP.planter(k, 63.4, RB + 1.0, kind='cone', w=0.8, d=0.8)
# a gilt gate between the opera and Aurelle
k.box(83.0, RB - 1.2, 0.0, 84.0, RB, 3.2, (SP.STONE, 0.05), 'gate_pier')
for i in range(7):
    k.tube((83.1 + i * 0.13, RB + 0.1, 0.0), (83.1 + i * 0.13, RB + 0.1, 2.6 + (0.2 if i == 3 else 0)), 0.018, SP.GOLD, 'gate_bar', verts=4)

# ---- east: AURELLE, the champagne bar and sky lounge -----------------------------------------------------------------------------
SP.stone_facade(k, 84.0, 95.4, RB, 5.6, fins=1.1, band=3.0, glow='#ffe0b8', part='aurelle')
k.box(85.2, RB + 0.36, 0.0, 93.8, RB + 0.5, 2.8, ('#121018', 0.1), 'aurelle_front')
for i in range(5):                                                     # round windows, lit warm, gold rims
    x = 85.9 + i * 1.8
    if i == 2:
        continue
    k.cyl_y(x, RB + 0.5, RB + 0.56, 1.5, 0.48, 0.48, (SP.GOLD, 0.2), 'aurelle_rim', verts=20)
    k.cyl_y(x, RB + 0.52, RB + 0.58, 1.5, 0.4, 0.4, '#1a1008', 'aurelle_window', emit=('#ffc888', 0.7), verts=20)
k.box(88.9, RB + 0.5, 0.0, 90.1, RB + 0.56, 2.4, '#1a1008', 'aurelle_door', emit=('#ffc888', 0.65))
k.box(88.75, RB + 0.48, 2.4, 90.25, RB + 0.6, 2.55, (SP.GOLD, 0.2), 'aurelle_door_head')
for i in range(9):                                                     # a fan of gold rays over the door
    a = math.pi * (0.1 + 0.8 * i / 8)
    k.tube((89.5, RB + 0.6, 2.55), (89.5 + math.cos(a) * 0.9, RB + 0.6, 2.55 + math.sin(a) * 0.6), 0.02, shade(SP.GOLD_L, 0.6), 'neon',
           emit=(SP.GOLD_L, 0.8), verts=4)
S.neon(k, 'Aurelle', 'Pacifico', 89.5, RB + 0.6, 3.25, size=0.72, col=SP.PEACH)
S.letters(k, 'CHAMPAGNE · SKY LOUNGE', 'PoiretOne', 89.5, RB + 0.6, 4.3, size=0.2, col=SP.GOLD_L, energy=6)
k.point_light(89.5, RB + 1.2, 1.6, '#ffc888', 22, radius=0.5, group='flicker')
for x in (87.6, 91.4):                                                 # a velvet rope either side of the door
    for xx in (x - 0.7, x + 0.7):
        k.cyl(xx, RB + 1.4, 0.0, 0.62, 0.035, SP.GOLD, 'rope_post', verts=8)
        k.sphere(xx, RB + 1.4, 0.64, 0.055, 0.055, SP.GOLD_L, 'rope_post', segs=6)
    k.tube((x - 0.7, RB + 1.4, 0.52), (x + 0.7, RB + 1.4, 0.52), 0.025, '#8a1430', 'rope', verts=6)
    k.solid(x - 0.75, RB + 1.3, x + 0.75, RB + 1.5)
for x in (85.0, 94.2):
    SP.planter(k, x, RB + 1.0, kind='tree', tone='#2a5240', bloom=SP.PEACH)

# ---- east: the sky docks ------------------------------------------------------------------------------------------------------
SP.cab_pad(k, 70.0, 34.0, rad=1.7)
k.cyl(72.2, 32.2, 0.0, 2.3, 0.05, (SP.GOLD, 0.2), 'cab_sign_post', verts=8)
k.box(71.75, 32.2, 1.9, 72.65, 32.26, 2.35, '#0c1a18', 'cab_sign', emit=(SP.MINT, 0.5))
S.letters(k, 'AIR CABS', 'RussoOne', 72.2, 32.26, 2.02, size=0.17, col=SP.MINT, energy=8)
k.solid_post(72.2, 32.2)
SP.bench(k, 66.2, 68.0, 31.0, back=-1)
# the dockmaster's kiosk: a little white booth with a gold dome and a lit hatch
KX, KR = 87.0, 30.6
k.box(KX - 0.9, KR - 0.7, 0.0, KX + 0.9, KR + 0.7, 2.1, (SP.STONE_L, 0.05), 'kiosk', bevel=0.04)
k.box(KX - 0.6, KR + 0.7, 0.9, KX + 0.6, KR + 0.74, 1.7, '#141c28', 'kiosk_hatch', emit=('#ffe0b0', 0.55))
k.box(KX - 0.7, KR + 0.7, 0.86, KX + 0.7, KR + 0.95, 0.92, (SP.GOLD, 0.2), 'kiosk_sill')
k.sphere(KX, KR, 2.1, 0.75, 0.45, (SP.GOLD, 0.2), 'kiosk_dome', segs=14)
k.cone(KX, KR, 2.5, 2.9, 0.05, 0.01, SP.GOLD_L, 'kiosk_finial', verts=6)
S.letters(k, 'DOCKMASTER', 'PoiretOne', KX, KR + 0.74, 1.82, size=0.15, col=SP.GOLD_L, energy=5)
k.point_light(KX, KR + 1.1, 1.3, '#ffe0b0', 8, radius=0.2, group='flicker')
k.solid(KX - 0.9, KR - 0.7, KX + 0.9, KR + 0.7)
SP.luggage(k, 83.4, 36.6)
SP.luggage(k, 84.6, 37.2)
for x in (66.0, 70.5, 75.0, 86.0, 90.5, 94.0):
    SP.bollard(k, x, DOCK_FRONT - 0.45)
for (x, r) in ((65.0, 29.0), (77.0, 29.0), (93.8, 29.0), (77.0, 38.5), (93.8, 35.0)):
    SP.dock_light(k, x, r, glow=SP.MINT if x < 80 else SP.BLUE)
# crates of champagne waiting to go aboard
for (x, r) in ((91.2, 38.8), (91.9, 38.8), (91.55, 38.2)):
    k.box(x - 0.3, r - 0.25, 0.0 if r > 38.5 else 0.4, x + 0.3, r + 0.25, 0.4 if r > 38.5 else 0.8, ('#c8a878', 0.1), 'crate', bevel=0.01)
k.solid(90.8, 38.4, 92.3, 39.1)
# the Lumière lying alongside, out over the drop, and her gangway
SP.yacht(k, 70.5, 92.5, 43.6, z=0.3)
SP.gangway(k, 80.3, DOCK_FRONT - 0.2, 80.3, 42.7, 0.0, 1.2)
for x in (79.4, 81.2):
    k.cyl(x, DOCK_FRONT - 0.2, 0.0, 1.0, 0.04, SP.GOLD, 'gangway_post', verts=6)
    k.solid_post(x, DOCK_FRONT - 0.2)
k.solid(79.0, DOCK_FRONT - 0.4, 81.6, DOCK_FRONT)

# ---- light: starlight from above, the city's glow coming up through the smog, the lamps ---------------------------------------
k.area_light(48.0, 18.0, 30.0, '#c8d4ff', 1500, 80.0, rot=(math.radians(-25), 0, 0))
k.area_light(48.0, 60.0, -10.0, '#ff9ad0', 260, 90.0, rot=(math.radians(140), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.82}}, light_samples=SAMPLES, world_light=('#2a3058', 0.55))

w = {'name': 'The Spires', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [40, 10]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 40, 'y': 9, 'type': 'express_lift', 'shaft': 'spire', 'lobby': 'spires', 'label': 'SPIRE EXPRESS', 'prompt': 'PRESS E TO CALL THE LIFT'},
         {'x': 54, 'y': 9, 'type': 'express_lift', 'shaft': 'core', 'lobby': 'spires', 'label': 'CORE EXPRESS', 'prompt': 'PRESS E TO CALL THE LIFT'},
         {'x': 34, 'y': 9, 'type': 'enter_world', 'target': 'arcadia-boutique', 'spawn': [7, 9], 'label': 'LUMEN', 'prompt': 'PRESS E TO GO IN'},
         {'x': 47, 'y': 9, 'type': 'dialog', 'label': 'HALCYON TOWER', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'THE GREAT DOORS OF HALCYON\'S TOWER. BEHIND THE GLASS A LOBBY OF WHITE MARBLE, A RECEPTION DESK WITH NOBODY AT IT, AND A LIFT THAT ONLY GOES UP. THE DOORS DO NOT OPEN FOR YOU. A SMALL GOLD PLATE SAYS: BY APPOINTMENT.'},
         {'x': 59, 'y': 9, 'type': 'orrery_door', 'target': 'arcadia-members', 'spawn': [11, 12], 'label': 'THE ORRERY', 'prompt': 'PRESS E TO KNOCK'},
         {'x': 72, 'y': 10, 'type': 'enter_world', 'target': 'arcadia-opera', 'spawn': [12, 14], 'label': 'THE LYRA', 'prompt': 'PRESS E TO GO IN'},
         {'x': 73, 'y': 10, 'type': 'enter_world', 'target': 'arcadia-opera', 'spawn': [12, 14], 'label': 'THE LYRA', 'prompt': 'PRESS E TO GO IN'},
         {'x': 89, 'y': 9, 'type': 'enter_world', 'target': 'arcadia-champagne', 'spawn': [5, 12], 'label': 'AURELLE', 'prompt': 'PRESS E TO GO IN'},
         {'x': 9, 'y': 10, 'type': 'vendor', 'label': 'THE TEA SALON', 'prompt': 'PRESS E TO ORDER',
          'items': [{'id': 'jasmine_pearls', 'price': 14}, {'id': 'petit_fours', 'price': 18}, {'id': 'honey_cake', 'price': 12}]},
         {'x': 70, 'y': 34, 'type': 'air_cab', 'pad': 'spires', 'label': 'AIR CAB', 'prompt': 'PRESS E TO HAIL A CAB'},
         {'x': 47, 'y': 38, 'type': 'dialog', 'label': 'TELESCOPE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'DOWN THROUGH THE BRASS, THE SMOG LIES LIKE A SEA AT NIGHT, LIT PINK AND CYAN FROM UNDERNEATH. THE TOPS OF THE MID-LEVELS\' TOWERS STAND OUT OF IT LIKE ROCKS. SOMEWHERE A LOOP TRAIN\'S LIGHTS THREAD THROUGH THEM. UP HERE, NOBODY CAN HEAR THE RAIN.'},
         {'x': 80, 'y': 40, 'type': 'dialog', 'label': 'THE LUMIERE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A SKY YACHT, WHITE AS A WEDDING, RIDING HER LIFT FIELDS A FOOT OFF THE DOCK. A STEWARD AT THE TOP OF THE GANGWAY SMILES THE SMILE OF A MAN WHO WILL NOT LET YOU ABOARD.'},
         {'x': 47, 'y': 25, 'type': 'dialog', 'label': 'THE CROWN FOUNTAIN', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'HALCYON\'S CROWN IN GOLD, SPILLING WATER INTO A STONE BOWL. THE COINS AT THE BOTTOM ARE REAL GOLD. A SMALL SIGN, ALSO GOLD, SAYS THE WISHES ARE REVIEWED QUARTERLY.'},
         {'x': 38, 'y': 28, 'type': 'dialog', 'label': 'STATUE', 'prompt': 'PRESS E TO READ',
          'dialog': 'A WINGED FIGURE IN WHITE MARBLE, A GILT LAUREL HELD UP TO THE STARS. THE PLAQUE: "ABOVE THE SMOG, THE LIGHT IS FREE." SOMEBODY HAS SCRATCHED UNDERNEATH: "FOR SOME."'},
         {'x': 22, 'y': 26, 'type': 'dialog', 'label': 'THE REFLECTING POOL', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'STILL WATER, BLACK AS SPACE, WITH THE STARS IN IT. REAL STARS. THE ONLY ONES IN ARCADIA. A CHILD IS POINTING AT THEM AND COUNTING.'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
actors = [
    {'sheet': 'npc-tea-host', 'x': 9, 'y': 9, 'facing': 'down'},
    {'sheet': 'npc-gardener', 'x': 26, 'y': 35, 'facing': 'left'},
    {'sheet': 'npc-halcyon-doorman', 'x': 46, 'y': 9, 'facing': 'down'},
    {'sheet': 'npc-dockmaster', 'x': 87, 'y': 31, 'facing': 'down'},
    {'sheet': 'npc-yacht-steward', 'x': 80, 'y': 42, 'facing': 'up'},
]
for a in actors:                                  # nobody walks through the people
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (1, int(RB) + 1, 94, int(DOCK_FRONT)), scene_id=WID, actors=actors,
            scene_extra={'backdrop': True})
w = json.load(open(WORLD))
w['interactions'] += [
    {'x': 26, 'y': 34, 'type': 'dialog', 'label': 'GARDENER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE GARDENER IS BUSY.'},
    {'x': 9, 'y': 9, 'type': 'dialog', 'label': 'TEA HOSTESS', 'prompt': 'PRESS E TO TALK', 'dialog': 'WELCOME TO THE TEA SALON.'},
    {'x': 87, 'y': 32, 'type': 'dialog', 'label': 'DOCKMASTER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE DOCKMASTER LOOKS UP FROM HIS LEDGER.'},
    {'x': 46, 'y': 10, 'type': 'dialog', 'label': 'CONCIERGE', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE CONCIERGE INCLINES HIS HEAD.'},
]
w['skyline'] = {'mode': 'spires', 'baseRow': 5.0, 'railRow': FRONT + 1.0, 'centerCol': 48.0}
w['view'] = [-0.5, -4.0, COLS + 0.5, ROWS + 0.5]
w['arcadia'] = {'level': 'spires'}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('spires done')
