"""LUMEN — the Spires' implant atelier (world id "arcadia-boutique").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_boutique.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-boutique

Off the crown plaza under Halcyon's tower: designer implants shown like jewellery. A white room as quiet as a chapel —
pale marble, a back wall of arched niches each holding one piece lit in its own pastel (an eye of light, chrome lace for
an arm, a halo, a voice box like a seashell), glass cases on white plinths down the floor, a mirror in a gold frame,
the fitting chair (a sculptural white recliner under a ring of light) behind a screen of white voile, white orchids,
Iris Kade at her glass desk and Nox by the cases. LUMEN in fine gold over the niches. The `implants` interaction is the
shop (js/spires.js: the designer tier of js/implants.js once it's here).
"""
import math
import sys

from _spires_room import SP, E, CA, PH, S, Kit, shade, render, look, out_door, write_world  # noqa: F401

OUT = sys.argv[1]
WID = 'arcadia-boutique'
COLS, ROWS = 16, 11
H, RB, RF = 3.8, 2.4, 10.0
FLOOR = (1, 3, 14, 9)
DOORS = [(7, 10), (8, 10)]
GLOWS = (SP.PINK, SP.BLUE, SP.LILAC, SP.MINT, SP.PEACH)

k = Kit(COLS, ROWS, margin_top=1.4, margin_bottom=0.5, seed=4831)

SP.paving(k, 1.0, RB, 15.0, RF, size=1.5, strip=0, tones=('#f2f0f4', '#ecebf0', '#f6f4f8', '#e8e6ee'), part='floor', grout='#c8c2d0')
SP.stone_room(k, 1.0, 15.0, RB, RF, H, door=(6.6, 8.4))

# ---- the back wall: arched niches, a piece in each, lit from inside --------------------------------------------------------------
k.box(0.4, RB - 0.5, 0.0, 15.6, RB, H, (SP.STONE_L, 0.05), 'wall')
k.box(0.4, RB - 0.02, H - 0.4, 15.6, RB + 0.12, H - 0.28, (SP.STONE, 0.05), 'cornice')
k.box(0.4, RB + 0.1, H - 0.34, 15.6, RB + 0.13, H - 0.31, shade(SP.LILAC, 0.5), 'cornice_neon', emit=(SP.LILAC, 0.85))
for i, x in enumerate((2.4, 4.6, 11.4, 13.6)):
    g = GLOWS[i]
    k.box(x - 0.55, RB - 0.25, 0.9, x + 0.55, RB - 0.02, 2.6, shade(g, 0.35), 'niche', emit=(g, 0.75))
    k.cyl_y(x, RB - 0.25, RB - 0.02, 2.6, 0.55, 0.4, shade(g, 0.35), 'niche', emit=(g, 0.75), verts=16)
    k.box(x - 0.62, RB - 0.02, 0.84, x + 0.62, RB + 0.12, 0.92, (SP.GOLD, 0.2), 'niche_sill')
    k.cyl(x, RB - 0.12, 0.92, 1.25, 0.12, ('#f4f2f6', 0.04), 'stand', verts=10)
    if i == 0:                                                       # an eye of light
        k.sphere(x, RB - 0.12, 1.55, 0.2, 0.2, ('#e8eef8', 0.03), 'implant', segs=12)
        k.sphere(x, RB - 0.0, 1.55, 0.09, 0.09, shade(g, 0.5), 'implant_iris', emit=(g, 1.0), segs=10)
    elif i == 1:                                                     # chrome lace for an arm
        k.blob(x, RB - 0.12, 1.75, 0.1, 0.08, 0.5, ('#d8dce8', 0.03), 'implant', segs=10)
        for j in range(5):
            k.tube((x - 0.1, RB - 0.04, 1.35 + j * 0.16), (x + 0.1, RB - 0.04, 1.43 + j * 0.16), 0.012, shade(g, 0.5), 'implant_lace', emit=(g, 0.9), verts=4)
    elif i == 2:                                                     # a halo
        pts = [(x + math.cos(a / 16 * math.tau) * 0.3, RB - 0.12, 1.7 + math.sin(a / 16 * math.tau) * 0.3) for a in range(17)]
        for a, b in zip(pts, pts[1:]):
            k.tube(a, b, 0.025, shade(g, 0.5), 'implant_halo', emit=(g, 1.0), verts=5)
    else:                                                            # a voice box like a shell
        k.blob(x, RB - 0.12, 1.6, 0.22, 0.12, 0.26, ('#f8e8e0', 0.04), 'implant', rot=(0, 0.4, 0), segs=12)
        k.sphere(x, RB - 0.02, 1.6, 0.05, 0.05, shade(g, 0.5), 'implant_glow', emit=(g, 1.0), segs=8)
    k.point_light(x, RB + 0.4, 1.8, g, 5, radius=0.2, group='flicker')
for x in (1.25, 3.5, 5.75, 10.25, 12.5, 14.75):                   # white pilasters between the niches, gold capitals
    k.box(x - 0.16, RB - 0.02, 0.0, x + 0.16, RB + 0.1, H - 0.4, (SP.STONE, 0.05), 'pilaster')
    k.box(x - 0.2, RB - 0.02, H - 0.62, x + 0.2, RB + 0.14, H - 0.5, (SP.GOLD, 0.2), 'capital')
k.box(0.4, RB - 0.02, 0.0, 15.6, RB + 0.08, 0.22, (SP.STONE_D, 0.06), 'skirting')
k.solid(1.0, RB, 15.0, RB + 0.3)
S.letters(k, 'LUMEN', 'PoiretOne', 8.0, RB + 0.12, 2.75, size=0.48, col=SP.GOLD_L, energy=8, spacing=1.4)
S.neon(k, 'atelier', 'Pacifico', 8.0, RB + 0.12, 2.2, size=0.32, col=SP.PINK)
# the mirror between the niches, a gold frame
k.box(6.9, RB - 0.02, 0.5, 9.1, RB + 0.06, 2.1, (SP.GOLD, 0.2), 'mirror_frame')
k.box(7.02, RB + 0.06, 0.62, 8.98, RB + 0.08, 1.98, ('#c8ccd8', 0.02), 'mirror_glass', emit=('#9aa0b8', 0.25))
k.cyl_y(8.0, RB - 0.02, RB + 0.06, 2.1, 1.1, 0.35, (SP.GOLD, 0.2), 'mirror_frame', verts=20)

# ---- the floor: glass cases on plinths, the fitting chair behind voile, Iris's desk -------------------------------------------------
for i, (cx, cr) in enumerate(((4.0, 6.0), (8.0, 6.4), (12.0, 6.0))):
    g = GLOWS[(i + 2) % 5]
    k.box(cx - 0.55, cr - 0.4, 0.0, cx + 0.55, cr + 0.4, 0.9, ('#f4f2f6', 0.04), 'plinth', bevel=0.03)
    k.box(cx - 0.58, cr - 0.43, 0.88, cx + 0.58, cr + 0.43, 0.94, (SP.GOLD, 0.2), 'plinth_cap')
    for (a, b, c, d) in ((cx - 0.5, cr + 0.33, cx + 0.5, cr + 0.35), (cx - 0.5, cr - 0.35, cx - 0.48, cr + 0.35), (cx + 0.48, cr - 0.35, cx + 0.5, cr + 0.35)):
        k.box(a, b, 0.94, c, d, 1.55, ('#d8ecf8', 0.02), 'case_glass', emit=('#8aa0c0', 0.12))
    for (a, b, c, d) in ((cx - 0.5, cr - 0.35, cx + 0.5, cr - 0.31), (cx - 0.5, cr + 0.31, cx + 0.5, cr + 0.35),
                         (cx - 0.5, cr - 0.35, cx - 0.46, cr + 0.35), (cx + 0.46, cr - 0.35, cx + 0.5, cr + 0.35)):
        k.box(a, b, 1.55, c, d, 1.58, (SP.GOLD, 0.2), 'case_frame')
    k.cyl(cx, cr, 0.94, 1.0, 0.22, ('#3a2a4a', 0.1), 'case_velvet', verts=12)
    k.sphere(cx, cr, 1.12, 0.1, 0.08, shade(g, 0.5), 'implant_glow', emit=(g, 1.0), segs=10)
    k.point_light(cx, cr + 0.1, 1.3, g, 4, radius=0.1, group='flicker')
    k.solid(cx - 0.55, cr - 0.4, cx + 0.55, cr + 0.4)
# the fitting chair: a white recliner on a pedestal, a ring of light over it, behind a voile screen
FX, FR = 13.2, 8.4
k.cyl(FX, FR, 0.0, 0.3, 0.45, ('#f4f2f6', 0.04), 'chair_base', verts=16)
k.box(FX - 0.9, FR - 0.3, 0.3, FX + 0.5, FR + 0.3, 0.55, ('#f8f6fa', 0.04), 'chair_seat', bevel=0.12)
k.box(FX - 0.95, FR - 0.3, 0.55, FX - 0.6, FR + 0.3, 1.05, ('#f8f6fa', 0.04), 'chair_back', bevel=0.12)
pts = [(FX - 0.3 + math.cos(a / 18 * math.tau) * 0.55, FR + math.sin(a / 18 * math.tau) * 0.4, 2.3) for a in range(19)]
for a, b in zip(pts, pts[1:]):
    k.tube(a, b, 0.03, shade(SP.LILAC, 0.5), 'fitting_ring', emit=(SP.LILAC, 1.0), verts=5)
k.point_light(FX - 0.3, FR, 2.0, SP.LILAC, 12, radius=0.3, group='flicker')
k.solid(FX - 1.0, FR - 0.4, FX + 0.6, FR + 0.4)
for x in (11.6, 12.2, 12.8):
    k.box(x - 0.28, 7.3, 0.0, x + 0.28, 7.34, 2.2, ('#f6f2ea', 0.03), 'voile')
k.box(11.2, 7.28, 2.2, 13.2, 7.36, 2.26, (SP.GOLD, 0.2), 'voile_rail')
k.solid(11.3, 7.2, 13.1, 7.4)
# Iris's desk: a slab of glass on gold, a tablet glowing, a single orchid
k.box(1.6, 8.0, 0.72, 3.8, 8.8, 0.8, ('#f4f2f6', 0.04), 'desk_top', bevel=0.02)
for x in (1.75, 3.65):
    k.box(x - 0.05, 8.05, 0.0, x + 0.05, 8.75, 0.72, (SP.GOLD, 0.2), 'desk_leg')
k.box(2.4, 8.2, 0.78, 3.0, 8.55, 0.8, '#101828', 'tablet', emit=(SP.BLUE, 0.7))
k.cyl(1.95, 8.4, 0.78, 0.95, 0.07, ('#f4f2f6', 0.04), 'orchid_pot', verts=8)
for j in range(4):
    k.sphere(1.95 + (j - 1.5) * 0.06, 8.4, 1.1 + j * 0.06, 0.05, 0.04, '#f8f4fa', 'orchid', segs=6)
k.solid(1.6, 8.0, 3.8, 8.8)
for (x, r) in ((1.6, 3.4), (14.4, 3.4), (6.0, 9.4), (10.0, 9.4)):
    E.plinth(k, x, r, h=0.75, w=0.42, stone='#f4f2f6', trim=SP.GOLD)
    E.vase_of_flowers(k, x, r, 0.75, s=0.8, col='#f4f2f6', band=SP.GOLD, kind='white')
E.chandelier(k, 8.0, 7.6, 2.75, rad=0.45, arms=6, chain_top=H, energy=40)
for (x, r) in ((4.0, 8.0), (11.0, 5.0)):
    k.point_light(x, r, 2.5, '#fff0e8', 14, radius=0.5, group='static')
k.area_light(8.0, 6.0, 3.6, '#fff4ec', 120, 9.0)                  # the ceiling: one soft white panel over the room
render(k, OUT, ambient=('#48444e', 0.3))

I = [out_door(x, y, [34, 10], 'THE CROWN PLAZA') for (x, y) in DOORS]
I += [
    {'x': 8, 'y': 7, 'type': 'implants', 'shop': 'lumen', 'label': 'THE COLLECTION', 'prompt': 'PRESS E TO BROWSE'},
    look('IRIS KADE', 3, 7, 'IRIS KADE LOOKS UP FROM HER TABLET AND, FOR A MOMENT, AT SOMETHING JUST BEHIND YOUR EYES.', prompt='PRESS E TO TALK'),
    look('NOX', 10, 5, 'NOX STRAIGHTENS A CASE THAT WAS ALREADY STRAIGHT.', prompt='PRESS E TO TALK'),
    look('THE FITTING CHAIR', 12, 9, 'A WHITE RECLINER UNDER A RING OF LIGHT, BEHIND A SCREEN OF VOILE. NOBODY HAS EVER SCREAMED IN IT. THAT IS WHAT THEY CHARGE FOR.'),
    look('THE NICHES', 4, 3, 'EACH PIECE ALONE IN ITS OWN ARCH OF LIGHT, LIKE A RELIC: AN EYE, CHROME LACE FOR AN ARM, A HALO, A VOICE LIKE A SHELL. NO PRICES. IF YOU HAVE TO ASK, NOX WILL TELL YOU, VERY GENTLY.'),
    look('THE MIRROR', 8, 3, 'YOU, IN A GOLD FRAME, EXACTLY AS NATURE AND YOUR CHOICES MADE YOU. A SMALL CARD IN THE CORNER SAYS: FOR NOW.'),
]
actors = [{'sheet': 'npc-atelier', 'x': 3, 'y': 7, 'facing': 'down'}, {'sheet': 'npc-atelier-b', 'x': 10, 'y': 4, 'facing': 'down'}]
write_world(WID, 'LUMEN', COLS, ROWS, [7, 9], I, k, FLOOR, DOORS, [], actors=actors)
print('lumen done')
