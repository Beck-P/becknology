"""CineKit — side-on sprite renders for the bridge's cutscenes.

A Kit with its own camera: orthographic, looking at the model from the
camera side (rows grow toward it) at a low elevation, framing a bounding
box at `ppt` pixels per tile. Everything else — primitives, materials,
the passes and scene_post's toon shading — is the scene kit's, so the
mothership, the shuttle and the galleon in a cutscene look like the rooms.

    k = CineKit((x0, x1, r0, r1, z0, z1), elev=12, ppt=16)
    P.shuttle(k, 0.0, 0.0, landed=False, ramp=False)
    k.pitch(-18, (1.7, 0, 0.8))          # nose down, about a pivot
    k.sun((-0.5, 0.6, 0.6), '#fff4e0', 3.0)
    k.render(OUT, light_states={'full': {}})

Rows are stretched by S in the scene kit; seen side-on that stretch runs
along the line of sight, so it doesn't show.
"""
import math

import bpy
from mathutils import Matrix, Vector

from scenekit import Kit, S, hexc, lin


class CineKit(Kit):
    def __init__(self, bbox, elev=12, ppt=16, seed=7):
        super().__init__(1, 1, seed=seed)
        self.bb = bbox
        self.elev = math.radians(elev)
        self.ppt = ppt
        self.anchors = {}    # name -> Vector (Blender coords), projected to pixels after render

    def anchor(self, name, x, r, z):
        """A named point (engine exhaust, bay door…) reported in pixels in render.json."""
        self.anchors[name] = Vector((x, -r * S, z))

    def pitch(self, deg, pivot):
        """Rotate the whole model nose-up by deg (x toward +z) about pivot (x, row, z)."""
        bpy.context.view_layer.update()      # objects placed by location need their matrices evaluated first
        P = Vector((pivot[0], -pivot[1] * S, pivot[2]))
        M = Matrix.Translation(P) @ Matrix.Rotation(math.radians(-deg), 4, 'Y') @ Matrix.Translation(-P)
        for p in self.parts:
            p['obj'].matrix_world = M @ p['obj'].matrix_world
        for L in self.lights:
            L['obj'].matrix_world = M @ L['obj'].matrix_world
        for n in self.anchors:
            self.anchors[n] = (M @ self.anchors[n].to_4d()).to_3d()

    def sun(self, direction, color, strength, angle=4.0):
        """Directional key light. direction: (x, row, z) the light travels along."""
        ld = bpy.data.lights.new('sun', 'SUN')
        ld.color = lin(hexc(color))[:3]
        ld.energy = strength
        ld.angle = math.radians(angle)
        o = bpy.data.objects.new('sun', ld)
        self.scene.collection.objects.link(o)
        d = Vector((direction[0], -direction[1] * S, direction[2])).normalized()
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        self._add_light({'obj': o, 'energy': strength, 'group': 'static'})
        return o

    def _camera(self):
        sc = self.scene
        x0, x1, r0, r1, z0, z1 = self.bb
        e = self.elev
        f = Vector((0, math.cos(e), -math.sin(e)))      # view direction
        up = Vector((0, math.sin(e), math.cos(e)))
        corners = [Vector((x, -r * S, z)) for x in (x0, x1) for r in (r0, r1) for z in (z0, z1)]
        us = [c.dot(up) for c in corners]
        sy0, sy1 = min(us), max(us)
        wt, ht = x1 - x0, sy1 - sy0
        self.resx = int(math.ceil(wt * self.ppt))
        self.resy = int(math.ceil(ht * self.ppt))
        centre = Vector(((x0 + x1) / 2, 0, 0)) + up * ((sy0 + sy1) / 2)
        D = 60.0
        C = centre - f * D
        cd = bpy.data.cameras.new('cam')
        cd.type = 'ORTHO'
        cd.ortho_scale = max(wt, ht)
        cd.clip_start = 0.1
        cd.clip_end = 200
        cam = bpy.data.objects.new('cam', cd)
        sc.collection.objects.link(cam)
        cam.location = C
        cam.rotation_euler = (math.pi / 2 - e, 0, 0)
        sc.camera = cam
        self.cam_dot = C.dot(f)
        self.origin = (0, 0)
        self.zmin, self.zmax = D - 40, D + 40

    def render(self, out, **kw):
        meta = super().render(out, **kw)
        from bpy_extras.object_utils import world_to_camera_view
        cam = self.scene.camera
        meta['anchors'] = {}
        for n, p in self.anchors.items():
            co = world_to_camera_view(self.scene, cam, p)
            meta['anchors'][n] = [round(co.x * self.resx, 1), round((1 - co.y) * self.resy, 1)]
        import json
        import os
        json.dump(meta, open(os.path.join(out, 'render.json'), 'w'), indent=1)
        return meta
