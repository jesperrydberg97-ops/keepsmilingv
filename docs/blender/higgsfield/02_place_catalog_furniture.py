# Run after importing these Higgsfield 3D Jutsu catalog assets (scene_builder_3d_import_asset),
# named as below: Sofa 3seat (FUR_sofa), Armchair, Bookshelf, Record Console, Media Unit,
# Floor Plant x2 (FUR_plant_0/2), Plant Potted 01 x2 (FUR_plant_1/3), Floor Pouf x2,
# Side Table x2 (FUR_sidetable_reading/phone), Floor Lamp, Table Lamp (FUR_desk_lamp),
# Books Stack, Room Divider, Curtains, Pendant Light (FUR_pendant_0), Wall Sconce (FUR_sconce_0),
# Throw Blanket. Positions are game coordinates (x, z) from game/layout.ts.
import bpy, math
from mathutils import Vector, Quaternion

def world_bbox(o):
    pts = []
    for d in [o] + list(o.children_recursive):
        if d.type == 'MESH':
            pts += [d.matrix_world @ Vector(c) for c in d.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)]); mx = Vector([max(p[i] for p in pts) for i in range(3)])
    return mn, mx

def place(o, gx, gz, face=(0, 1), w=None, d=None, h=None, base=0.0, scale=None, sxyz=None):
    """Turn the asset's front (Blender -Y) to game direction `face`, fit it inside a
    game-space box (w along x, d along z, h tall) and stand it on `base`."""
    phi = math.atan2(face[0], face[1])
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Quaternion((0, 0, 1), phi)
    o.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    mn, mx = world_bbox(o)
    size = mx - mn
    if scale is None:
        r = []
        if w: r.append(w / size.x)
        if d: r.append(d / size.y)
        if h: r.append(h / size.z)
        scale = min(r) if r else 1.0
    o.scale = sxyz if sxyz else (scale, scale, scale)
    bpy.context.view_layer.update()
    mn, mx = world_bbox(o)
    c = (mn + mx) / 2
    o.location += Vector((gx - c.x, -gz - c.y, base - mn.z))
    bpy.context.view_layer.update()

def dup(src, name):
    """Copy an imported asset. The catalog id custom properties must not be duplicated."""
    def strip(o):
        for k in list(o.keys()):
            del o[k]
    n = src.copy(); n.name = name; strip(n)
    src.users_collection[0].objects.link(n)
    for ch in src.children:
        c = ch.copy(); c.parent = n; strip(c)
        src.users_collection[0].objects.link(c)
    return n

O = bpy.data.objects
place(O["FUR_sofa"], -7.6, -0.5, face=(-1, 0), w=1.0, d=2.6, h=0.9)
place(O["FUR_armchair"], -9.9, -6.7, face=(1, 0.45), scale=0.92)
bs = O["FUR_bookshelf"]
for o, x in [(bs, -10.65), (dup(bs, "FUR_bookshelf_b"), -9.6), (dup(bs, "FUR_bookshelf_c"), -8.55)]:
    place(o, x, -8.6, face=(0, 1), w=1.04, d=0.45, h=2.4)
place(O["FUR_media_unit"], -11.35, -0.5, face=(1, 0), w=0.6, d=2.8, h=0.55)
for i, (x, z) in enumerate([(-11.1, 7.9), (11.2, 4.4), (-6.4, -8.2), (2.3, 7.9)]):
    place(O[f"FUR_plant_{i}"], x, z, w=0.62, d=0.62, h=1.7)
for i, x in enumerate([-1.6, 1.6]):
    place(O[f"FUR_pouf_{i}"], x, -5.2, w=0.6, d=0.6)
place(O["FUR_sidetable_reading"], -8.6, -7.3, w=0.64, d=0.64)
place(O["FUR_sidetable_phone"], 10.9, 7.7, w=0.7, d=0.7)
place(O["FUR_books_stack"], -8.62, -7.28, face=(0.3, 1), base=world_bbox(O["FUR_sidetable_reading"])[1].z, scale=1.0)
place(O["FUR_floor_lamp"], -10.85, -7.65, scale=1.12)
place(O["FUR_record_console"], 9.35, -8.45, scale=1.0, base=0.72)  # turntable on the music cabinet
place(O["FUR_desk_lamp"], 6.55, 6.0, scale=1.0, base=0.765)
dv = O["FUR_divider"]
for o, x in [(dv, -11.45), (dup(dv, "FUR_divider_b"), -10.55), (dup(dv, "FUR_divider_c"), -9.65)]:
    place(o, x, -3.6, face=(0, 1), w=0.9, d=0.35)
cu = O["FUR_curtains"]
place(cu, -11.86, 3.05, face=(1, 0), sxyz=(1.0, 1.1, 1.5))
place(dup(cu, "FUR_curtains_b"), -11.86, 7.15, face=(1, 0), sxyz=(1.0, 1.1, 1.5))
pd = O["FUR_pendant_0"]
place(pd, 5.5, 5.8, base=2.55, scale=1.2)
place(dup(pd, "FUR_pendant_1"), -9.2, -7.2, base=2.45, scale=1.2)
sc = O["FUR_sconce_0"]
for o, x, z, f in [(sc, -3.0, -8.86, (0, 1)), (dup(sc, "FUR_sconce_1"), 3.0, -8.86, (0, 1)),
                   (dup(sc, "FUR_sconce_2"), 11.86, -6.8, (-1, 0)), (dup(sc, "FUR_sconce_3"), 11.86, 2.6, (-1, 0)),
                   (dup(sc, "FUR_sconce_4"), -3.4, 8.86, (0, -1)), (dup(sc, "FUR_sconce_5"), 3.4, 8.86, (0, -1))]:
    place(o, x, z, face=f, base=2.2, scale=1.3)
place(O["FUR_throw"], -7.45, 0.25, face=(-1, 0), base=0.42, scale=1.2)
