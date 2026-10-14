"""Signs for the neon city, made from real typefaces (tools/bridge-art/fonts)
with Blender's text objects — so a noodle bar, a pawnshop and an arcade
each get lettering with its own character instead of one stroke font.

    S.neon(k, 'Noodles', 'Pacifico', cx, r_face, z, size=0.5, col=PINK)   # tubes tracing the letters
    S.letters(k, 'PAWN', 'Bungee', cx, r_face, z, size=0.45, col=YEL)     # solid extruded, lit faces
    S.lightbox(k, 'ラーメン', 'DelaGothicOne', cx, r_face, z, w, h, bg, ink) # glowing box, dark letters
    S.blade(k, 'ゲーム', 'DelaGothicOne', x, r_face, z, h, col)            # vertical sign, one glyph a row

All sit on a wall whose face is at row r_face, facing the camera, centred
on cx; z is the baseline height. Sizes are cap heights in tiles.
"""
import os

import bpy

from scenekit import S as ROWS_S, hexc, lin, shade

FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
_loaded = {}


def font(name):
    if name not in _loaded:
        _loaded[name] = bpy.data.fonts.load(os.path.join(FONTS, name + '-Regular.ttf'))
    return _loaded[name]


def _text_obj(text, fontname, size, extrude=0.0, bevel=0.0, fill=True, align='CENTER', resolution=3, spacing=1.0):
    cu = bpy.data.curves.new('sign', 'FONT')
    cu.body = text
    cu.font = font(fontname)
    cu.size = size
    cu.align_x = align
    cu.align_y = 'BOTTOM_BASELINE'
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = 1
    cu.resolution_u = resolution
    cu.space_character = spacing
    if not fill:
        cu.fill_mode = 'NONE'
    o = bpy.data.objects.new('sign', cu)
    bpy.context.scene.collection.objects.link(o)
    return o


def _place(k, o, cx, r_face, z, albedo, part, emit=None):
    """Stand the text on the wall facing the camera, convert it to a mesh part."""
    o.rotation_euler = (1.5708, 0, 0)
    o.location = (cx, -r_face * ROWS_S, z)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    mo = bpy.data.objects.new('sign_mesh', me)
    mo.matrix_world = o.matrix_world.copy()
    bpy.context.scene.collection.objects.link(mo)
    bpy.data.objects.remove(o)
    return k._finish(mo, albedo, part, emit)


def width(text, fontname, size):
    o = _text_obj(text, fontname, size)
    bpy.context.view_layer.update()
    xs = [v[0] for v in o.bound_box]
    w = max(xs) - min(xs)
    bpy.data.objects.remove(o)
    return w


def neon(k, text, fontname, cx, r_face, z, size=0.4, col='#f078a8', tube=0.012, board=None, energy=10, spacing=1.0):
    """Neon tubes tracing the letters' outlines (and a backing board if given)."""
    o = _text_obj(text, fontname, size, bevel=tube, fill=False, spacing=spacing)
    _place(k, o, cx, r_face + 0.05, z, shade(col, 0.5), 'neon', emit=(col, 0.95))
    w = width(text, fontname, size)
    if board:
        k.box(cx - w / 2 - 0.12, r_face, z - size * 0.35, cx + w / 2 + 0.12, r_face + 0.03, z + size * 1.15, board, 'sign_board')
    k.point_light(cx, r_face + 0.5, z + size * 0.5, col, energy, radius=max(0.15, w / 3), group='flicker')
    return w


def letters(k, text, fontname, cx, r_face, z, size=0.4, col='#e8c040', depth=0.06, lit=True, energy=8, spacing=1.0):
    """Solid extruded letters; lit=True glows (channel letters), else painted metal."""
    o = _text_obj(text, fontname, size, extrude=depth / 2, spacing=spacing)
    _place(k, o, cx, r_face + depth / 2, z, shade(col, 0.55 if lit else 1.0), 'letters', emit=(col, 0.9) if lit else None)
    w = width(text, fontname, size)
    if lit:
        k.point_light(cx, r_face + 0.45, z + size * 0.5, col, energy, radius=max(0.15, w / 3), group='flicker')
    return w


def lightbox(k, text, fontname, cx, r_face, z, w, h, bg='#f0e8d0', ink='#2a1020', size=None, glow=None, energy=6):
    """A glowing box sign with dark lettering on its face."""
    glow = glow or bg
    k.box(cx - w / 2 - 0.03, r_face, z - 0.03, cx + w / 2 + 0.03, r_face + 0.12, z + h + 0.03, '#14101a', 'lightbox_frame')
    k.box(cx - w / 2, r_face + 0.12, z, cx + w / 2, r_face + 0.13, z + h, shade(bg, 0.6), 'lightbox', emit=(glow, 0.8))
    size = size or h * 0.62
    o = _text_obj(text, fontname, size, extrude=0.004)
    _place(k, o, cx, r_face + 0.135, z + (h - size) / 2 + size * 0.08, ink, 'lightbox_ink')
    k.point_light(cx, r_face + 0.5, z + h / 2, glow, energy, radius=w / 3, group='flicker')


def blade(k, text, fontname, x, r_face, z, h, col='#5cc8d0', bg='#0c0818', w=0.46, stand=0.25):
    """A tall vertical sign standing off the facade on brackets, one glyph a
    row down its lit face (the street's signs are read from below)."""
    n = len(text)
    rf = r_face + stand
    for zz in (z + 0.15, z + h - 0.15):
        k.box(x - 0.03, r_face, zz - 0.03, x + 0.03, rf, zz + 0.03, '#2a2832', 'blade_bracket')
    k.box(x - w / 2, rf, z, x + w / 2, rf + 0.08, z + h, bg, 'blade')
    k.boxes([(x - w / 2, rf + 0.08, z, x + w / 2, rf + 0.095, z + 0.03), (x - w / 2, rf + 0.08, z + h - 0.03, x + w / 2, rf + 0.095, z + h),
             (x - w / 2, rf + 0.08, z, x - w / 2 + 0.03, rf + 0.095, z + h), (x + w / 2 - 0.03, rf + 0.08, z, x + w / 2, rf + 0.095, z + h)],
            shade(col, 0.5), 'blade_edge', emit=(col, 0.85))
    gs = min(w * 0.72, (h - 0.12) / n * 0.86)
    for i, ch in enumerate(text):
        gz = z + h - 0.06 - (i + 1) * (h - 0.12) / n + ((h - 0.12) / n - gs) / 2
        o = _text_obj(ch, fontname, gs, extrude=0.004)
        _place(k, o, x, rf + 0.1, gz, shade(col, 0.5), 'blade_glyph', emit=(col, 0.95))
    k.point_light(x, rf + 0.5, z + h / 2, col, 6, radius=0.2, group='flicker')
