import bpy, math, bmesh
from mathutils import Vector, Quaternion

scene = bpy.context.scene
ST = bpy.data.collections.get("STATIONS") or bpy.data.collections.new("STATIONS")
if ST.name not in scene.collection.children:
    scene.collection.children.link(ST)
DR = bpy.data.collections.get("DRESSING") or bpy.data.collections.new("DRESSING")
if DR.name not in scene.collection.children:
    scene.collection.children.link(DR)
LG = bpy.data.collections["LIGHTS"]

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)

def mat(name, hexc, rough=0.6, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb(hexc), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*srgb(emit), 1)
        b.inputs["Emission Strength"].default_value = strength
    return m

M = dict(
    walnut=mat("M_walnut", "#5a3521", 0.42), oak=mat("M_oak", "#b98a55", 0.45),
    steel=bpy.data.materials["M_steel_black"], brass=bpy.data.materials["M_brass"],
    black=mat("M_black_satin", "#141316", 0.35, 0.1), plastic=mat("M_plastic_dark", "#232226", 0.5),
    alu=mat("M_aluminium", "#b9bcc2", 0.3, 1.0), cork=mat("M_cork", "#b07f4f", 1.0),
    paper=mat("M_paper", "#f1e8d6", 0.85), screen=mat("M_screen", "#0c0d10", 0.2),
    canvas=mat("M_projection_canvas", "#e9e6df", 0.9), print_=mat("M_print", "#888888", 0.6),
    matte=mat("M_mat_board", "#f4efe6", 0.9), glass_lens=mat("M_lens_glass", "#1a2430", 0.05, 0.3),
    leather=mat("M_leather_tan", "#8a4b2a", 0.45), red=mat("M_phone_red", "#8e2a22", 0.35),
    fabric_grille=mat("M_speaker_grille", "#2b2724", 0.95), vinyl=mat("M_vinyl", "#0a0a0b", 0.25),
    note_y=mat("M_note_yellow", "#f2d27a", 0.8), note_b=mat("M_note_blue", "#9cc3d5", 0.8),
    note_p=mat("M_note_pink", "#e8a7a0", 0.8), photo_a=mat("M_photo_warm", "#a5714a", 0.4),
    photo_b=mat("M_photo_cool", "#4d6a78", 0.4), photo_c=mat("M_photo_green", "#5d7a4e", 0.4),
    softbox=mat("M_softbox_diffuser", "#fff6e6", 0.9, emit="#ffe9c8", strength=2.5),
    bulb=mat("M_warm_bulb", "#ffd9a0", 0.5, emit="#ffc070", strength=6.0),
    tally=mat("M_tally_red", "#ff3020", 0.4, emit="#ff2010", strength=4.0),
    hit=mat("M_hit_proxy", "#ff00ff", 1.0),
)

def new_obj(name, me, parent, col=ST):
    o = bpy.data.objects.new(name, me); col.objects.link(o)
    if parent: o.parent = parent
    return o

def box(name, parent, cx, cy, cz, sx, sy, sz, m, bevel=0.0, col=ST, rot=None):
    """Box in the parent's local frame (Blender axes: X right, -Y toward viewer, Z up)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, sx/2.1, sy/2.1, sz/2.1), segments=2, affect='EDGES', profile=0.5)
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = bevel > 0
    o = new_obj(name, me, parent, col); o.location = (cx, cy, cz)
    if rot: o.rotation_euler = rot
    return o

def cyl(name, parent, cx, cy, cz, r, depth, m, axis='Z', seg=32, col=ST, r2=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    o = new_obj(name, me, parent, col); o.location = (cx, cy, cz)
    if axis == 'X': o.rotation_euler = (0, math.pi/2, 0)
    if axis == 'Y': o.rotation_euler = (math.pi/2, 0, 0)
    return o

def plane(name, parent, cx, cy, cz, w, h, m, col=ST):
    """Vertical plane facing local -Y with a clean 0-1 UV (u to the viewer's right, v up)."""
    me = bpy.data.meshes.new(name)
    verts = [(-w/2, 0, -h/2), (w/2, 0, -h/2), (w/2, 0, h/2), (-w/2, 0, h/2)]
    me.from_pydata(verts, [], [(0, 1, 2, 3)]); me.update()
    uv = me.uv_layers.new(name="UVMap")
    for li, (u, v) in zip(range(4), [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[li].uv = (u, v)
    # Normal must face -Y (toward the viewer): vertex order above gives -Y with these coordinates.
    me.materials.append(m)
    o = new_obj(name, me, parent, col); o.location = (cx, cy, cz)
    return o

def station(name, gx, gy, gz, face, col=ST):
    e = bpy.data.objects.new(name, None); col.objects.link(e)
    e.empty_display_type = 'PLAIN_AXES'; e.empty_display_size = 0.3
    e.location = (gx, -gz, gy)
    e.rotation_euler = (0, 0, math.atan2(face[0], face[1]))
    return e

def hit(parent, cx, cy, cz, sx, sy, sz):
    """Invisible click target (hidden by the site; keeps small props easy to click)."""
    o = box(f"hit_{parent.name}", parent, cx, cy, cz, sx, sy, sz, M["hit"])
    o.hide_render = True
    return o

def plight(name, gx, gy, gz, energy, color="#ffc98a", radius=0.1):
    d = bpy.data.lights.new(name, "POINT"); d.energy = energy; d.color = srgb(color); d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d); LG.objects.link(o); o.location = (gx, -gz, gy)
    return o

# Clean any previous build of these collections
for c in (ST, DR):
    for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
for o in list(LG.objects):
    if o.name.startswith("LGT_prac"): bpy.data.objects.remove(o, do_unlink=True)

# ---------------- Booking desk (visitor on the north side) ----------------
s = station("station_booking", 5.5, 0, 5.8, (0, -1))
box("desk_top", s, 0, 0, 0.74, 2.4, 1.0, 0.045, M["walnut"], bevel=0.012)
box("desk_edge_brass", s, 0, -0.505, 0.735, 2.38, 0.012, 0.02, M["brass"])
box("desk_front_panel", s, 0, -0.42, 0.37, 2.3, 0.04, 0.68, M["walnut"], bevel=0.01)
for i, x in enumerate([-1.12, 1.12]):
    box(f"desk_leg_{i}", s, x, 0, 0.36, 0.06, 0.92, 0.72, M["steel"], bevel=0.008)
box("desk_drawers", s, 0.75, 0.15, 0.42, 0.7, 0.6, 0.55, M["walnut"], bevel=0.01)
for k, z in enumerate([0.55, 0.32]):
    box(f"desk_drawer_pull_{k}", s, 0.75, 0.46, z, 0.18, 0.015, 0.015, M["brass"])
# Laptop facing the visitor (north = local -Y): base + tilted lid with screen
lap = bpy.data.objects.new("laptop", None); ST.objects.link(lap); lap.parent = s; lap.location = (-0.25, 0.0, 0.765)
box("laptop_base", lap, 0, 0, 0.009, 0.5, 0.34, 0.018, M["alu"], bevel=0.004)
box("laptop_keys", lap, 0, -0.02, 0.019, 0.42, 0.16, 0.002, M["plastic"])
lid = bpy.data.objects.new("laptop_lid", None); ST.objects.link(lid); lid.parent = lap; lid.location = (0, 0.17, 0.018)
lid.rotation_euler = (math.radians(-18), 0, 0)
box("laptop_lid_shell", lid, 0, 0.006, 0.17, 0.5, 0.008, 0.34, M["alu"], bevel=0.003)
plane("screen_laptop", lid, 0, -0.0005, 0.175, 0.44, 0.28, M["screen"])
# Notebook, pen cup, coffee mug
box("notebook", s, 0.25, -0.1, 0.772, 0.21, 0.29, 0.016, M["leather"], bevel=0.003, rot=(0, 0, 0.2))
cyl("pen_cup", s, 0.48, 0.25, 0.81, 0.04, 0.1, M["steel"])
cyl("mug", s, -0.75, -0.15, 0.81, 0.045, 0.1, M["paper"])
cyl("mug_coffee", s, -0.75, -0.15, 0.855, 0.04, 0.004, M["walnut"])
box("desk_sign_base", s, -0.8, -0.38, 0.78, 0.3, 0.06, 0.03, M["brass"])

# ---------------- Project TV (west wall, faces +X) ----------------
s = station("station_tv", -11.78, 1.75, -0.5, (1, 0))
box("tv_body", s, 0, 0.03, 0, 2.62, 0.05, 1.52, M["black"], bevel=0.008)
box("tv_bezel", s, 0, -0.0, 0, 2.6, 0.01, 1.5, M["black"])
plane("screen_tv", s, 0, -0.008, 0, 2.52, 1.42, M["screen"])
box("tv_mount", s, 0, 0.1, 0, 0.5, 0.12, 0.35, M["steel"])
hit(s, 0, -0.6, -1.4, 2.8, 0.7, 0.6)  # covers the media unit below

# ---------------- Showreel projection screen (north wall, faces +Z) ----------------
s = station("station_showreel", 0, 2.35, -8.82, (0, 1))
box("showreel_housing", s, 0, 0.0, 1.55, 5.5, 0.14, 0.16, M["black"], bevel=0.02)
box("showreel_border", s, 0, 0.02, 0, 5.3, 0.02, 3.0, M["black"])
plane("screen_showreel", s, 0, 0.005, 0, 5.12, 2.82, M["canvas"])
box("showreel_bottom_bar", s, 0, 0.0, -1.52, 5.22, 0.04, 0.05, M["steel"])
# Ceiling projector hanging from the centre beam
pj = bpy.data.objects.new("projector", None); DR.objects.link(pj); pj.location = (0, 5.5, 3.95)
box("projector_rod", pj, 0, 0, 0.32, 0.04, 0.04, 0.55, M["steel"], col=DR)
box("projector_body", pj, 0, 0, 0, 0.42, 0.36, 0.14, M["alu"], bevel=0.02, col=DR)
cyl("projector_lens", pj, -0.1, 0.19, 0, 0.045, 0.06, M["glass_lens"], axis='Y', col=DR)

# ---------------- About noticeboard (south wall, faces -Z) ----------------
s = station("station_noticeboard", -6, 1.65, 8.82, (0, -1))
box("board_frame", s, 0, 0.03, 0, 2.52, 0.05, 1.62, M["oak"], bevel=0.01)
box("board_cork", s, 0, 0.0, 0, 2.4, 0.03, 1.5, M["cork"])
import random
rnd = random.Random(7)
items = [("note_y", 0.22, 0.22), ("photo_a", 0.3, 0.22), ("note_b", 0.22, 0.22), ("paper", 0.3, 0.42),
         ("photo_b", 0.26, 0.2), ("note_p", 0.2, 0.2), ("photo_c", 0.32, 0.24), ("paper", 0.42, 0.3), ("note_y", 0.2, 0.2)]
spots = [(-0.9, 0.42), (-0.45, 0.35), (0.05, 0.45), (0.6, 0.3), (0.95, 0.5), (-0.85, -0.2), (-0.3, -0.25), (0.3, -0.2), (0.85, -0.35)]
for i, ((mn, w, h), (x, z)) in enumerate(zip(items, spots)):
    p = plane(f"board_item_{i}", s, x, -0.017 - i * 0.0005, z, w, h, M[mn])
    p.rotation_euler = (0, rnd.uniform(-0.12, 0.12), 0)
    cyl(f"board_pin_{i}", s, x, -0.024, z + h/2 - 0.03, 0.008, 0.014, M["red" if i % 2 else "brass"], axis='Y', seg=12)

# ---------------- Reading lounge: click target over the catalog side table ----------------
s = station("station_reading", -8.6, 0, -7.3, (0, 1))
hit(s, 0, 0, 0.35, 0.7, 0.7, 0.7)

# ---------------- Timeline shelf (north wall, faces +Z) ----------------
s = station("station_timeline", 5.6, 0, -8.65, (0, 1))
for i, x in enumerate([-1.98, -0.66, 0.66, 1.98]):
    box(f"tl_upright_{i}", s, x, 0, 0.95, 0.04, 0.38, 1.9, M["steel"])
for j, z in enumerate([0.08, 0.6, 1.12, 1.64]):
    box(f"tl_shelf_{j}", s, 0, 0, z, 4.0, 0.38, 0.035, M["oak"], bevel=0.006)
# Framed photos (chronological), old cameras and an award
frames = [(-1.6, 0.64, "photo_a"), (-0.9, 0.64, "photo_b"), (0.2, 1.16, "photo_c"), (1.1, 1.16, "photo_a"), (-1.3, 1.68, "photo_b"), (1.6, 0.12, "photo_c")]
for i, (x, z, pm) in enumerate(frames):
    f = bpy.data.objects.new(f"tl_frame_{i}", None); ST.objects.link(f); f.parent = s
    f.location = (x, 0.02, z + 0.14); f.rotation_euler = (math.radians(-10), 0, 0)
    box(f"tl_frame_{i}_border", f, 0, 0.005, 0, 0.26, 0.015, 0.21, M["black"], bevel=0.003)
    plane(f"tl_frame_{i}_photo", f, 0, -0.004, 0, 0.21, 0.16, M[pm])
for i, (x, z) in enumerate([(-0.2, 0.64), (0.6, 0.64), (-0.4, 1.68), (0.5, 1.68)]):
    box(f"tl_camera_{i}_body", s, x, 0, z + 0.07, 0.17, 0.1, 0.11, M["black"], bevel=0.008)
    cyl(f"tl_camera_{i}_lens", s, x, -0.08, z + 0.07, 0.035, 0.07, M["alu" if i % 2 else "black"], axis='Y')
    box(f"tl_camera_{i}_top", s, x - 0.03, 0, z + 0.14, 0.06, 0.06, 0.03, M["alu"])
cyl("tl_award_base", s, 1.65, 0, 1.69, 0.05, 0.05, M["walnut"])
cyl("tl_award", s, 1.65, 0, 1.8, 0.02, 0.17, M["brass"], r2=0.035)
cyl("tl_reel", s, -1.65, 0, 0.27, 0.15, 0.03, M["alu"], axis='Y')

# ---------------- Music corner: cabinet + speakers (catalog turntable on top) ----------------
s = station("station_music", 9.7, 0, -8.45, (0, 1))
box("cab_body", s, 0, 0, 0.47, 2.0, 0.56, 0.5, M["walnut"], bevel=0.012)
for i, x in enumerate([-0.5, 0.5]):
    box(f"cab_door_{i}", s, x, -0.283, 0.47, 0.96, 0.01, 0.44, M["oak"], bevel=0.004)
for i, (x, y) in enumerate([(-0.92, -0.22), (0.92, -0.22), (-0.92, 0.22), (0.92, 0.22)]):
    cyl(f"cab_leg_{i}", s, x, y, 0.11, 0.022, 0.22, M["brass"], r2=0.015)
for i, x in enumerate([0.35, 0.45, 0.55, 0.65]):
    box(f"cab_record_{i}", s, x, -0.05, 0.89, 0.01, 0.31, 0.31, M["vinyl"] if i % 2 else M["paper"])
for k, sx in enumerate([-1.4, 1.4]):
    sp = bpy.data.objects.new(f"speaker_{k}", None); ST.objects.link(sp); sp.parent = s; sp.location = (sx, -0.05, 0)
    box(f"speaker_{k}_cab", sp, 0, 0, 0.55, 0.42, 0.36, 0.9, M["walnut"], bevel=0.015)
    box(f"speaker_{k}_grille", sp, 0, -0.181, 0.6, 0.36, 0.005, 0.74, M["fabric_grille"])
    for j, (z, r) in enumerate([(0.82, 0.05), (0.45, 0.12)]):
        cyl(f"speaker_{k}_driver_{j}", sp, 0, -0.18, z, r, 0.01, M["black"], axis='Y')
    for j, (x, y) in enumerate([(-0.17, -0.14), (0.17, -0.14), (-0.17, 0.14), (0.17, 0.14)]):
        cyl(f"speaker_{k}_leg_{j}", sp, x, y, 0.05, 0.015, 0.1, M["steel"])

# ---------------- Contact telephone (on the catalog side table) ----------------
s = station("station_telephone", 10.9, 0, 7.7, (-0.72, -0.7))
ph = bpy.data.objects.new("phone", None); ST.objects.link(ph); ph.parent = s; ph.location = (0, 0, 0.545)
box("phone_base", ph, 0, 0, 0.045, 0.2, 0.22, 0.09, M["red"], bevel=0.03)
cyl("phone_dial", ph, 0, -0.06, 0.085, 0.06, 0.012, M["paper"])
cyl("phone_dial_ring", ph, 0, -0.06, 0.092, 0.055, 0.006, M["alu"])
box("phone_cradle", ph, 0, 0.04, 0.1, 0.18, 0.06, 0.03, M["red"], bevel=0.01)
hs = bpy.data.objects.new("phone_handset", None); ST.objects.link(hs); hs.parent = ph; hs.location = (0, 0.04, 0.13)
box("handset_grip", hs, 0, 0, 0.01, 0.24, 0.045, 0.03, M["red"], bevel=0.012)
for i, x in enumerate([-0.12, 0.12]):
    cyl(f"handset_cup_{i}", hs, x, 0, 0, 0.035, 0.04, M["red"])
hit(s, 0, 0, 0.35, 0.7, 0.7, 0.7)

# ---------------- Gallery frames (east wall, face -X) ----------------
for i, gz in enumerate([-5.6, -3.4, -1.2, 1.0]):
    s = station(f"station_gallery_{i+1}", 11.82, 1.7, gz, (-1, 0))
    w, h = 1.32, 0.88
    box(f"g{i+1}_frame", s, 0, 0.03, 0, w + 0.26, 0.05, h + 0.26, M["black"], bevel=0.008)
    plane(f"g{i+1}_mat", s, 0, 0.003, 0, w + 0.16, h + 0.16, M["matte"])
    plane(f"print_{i+1}", s, 0, -0.001, 0, w, h, M["print_"])
    # Brass picture light above each print
    box(f"g{i+1}_light_bar", s, 0, -0.12, h/2 + 0.24, 0.5, 0.05, 0.04, M["brass"], bevel=0.01)
    box(f"g{i+1}_light_arm", s, 0, -0.05, h/2 + 0.24, 0.03, 0.12, 0.02, M["brass"])
    plight(f"LGT_prac_gallery_{i+1}", 11.6, 1.7 + h/2 + 0.2, gz, 25, "#ffd9a8", 0.05)

# ---------------- Easter egg: cinema camera on tripod (lens toward the room, -X) ----------------
s = station("station_egg_shutter", 8.4, 0, 2.6, (-1, 0))
for i in range(3):
    a = math.radians(90 + i * 120)
    leg = cyl(f"tripod_leg_{i}", s, 0.22 * math.cos(a), 0.22 * math.sin(a), 0.62, 0.016, 1.3, M["alu"])
    leg.rotation_euler = (0.17 * math.sin(a), -0.17 * math.cos(a), 0)
cyl("tripod_head", s, 0, 0, 1.3, 0.06, 0.08, M["black"])
box("cam_body", s, 0, 0.02, 1.43, 0.16, 0.3, 0.17, M["black"], bevel=0.015)
cyl("cam_lens", s, 0, -0.2, 1.43, 0.055, 0.14, M["black"], axis='Y')
cyl("cam_lens_ring", s, 0, -0.24, 1.43, 0.06, 0.03, M["alu"], axis='Y')
box("cam_mattebox", s, 0, -0.31, 1.43, 0.2, 0.06, 0.16, M["black"], bevel=0.005)
box("cam_handle", s, 0, 0.0, 1.55, 0.03, 0.2, 0.03, M["alu"])
box("cam_monitor", s, 0.11, 0.08, 1.5, 0.02, 0.12, 0.08, M["screen"])
cyl("cam_tally", s, 0, -0.08, 1.525, 0.008, 0.01, M["tally"])

# ---------------- Easter egg: clapperboard on a crate ----------------
s = station("station_egg_clapper", -4.4, 0, -8.3, (0, 1))
box("crate", s, 0, 0, 0.24, 0.68, 0.48, 0.48, M["oak"], bevel=0.008)
for i, z in enumerate([0.08, 0.24, 0.4]):
    box(f"crate_slat_{i}", s, 0, -0.245, z, 0.7, 0.012, 0.09, M["walnut"])
cl = bpy.data.objects.new("clapper", None); ST.objects.link(cl); cl.parent = s; cl.location = (0, 0, 0.49)
cl.rotation_euler = (math.radians(-70), 0, 0.15)
box("clapper_slate", cl, 0, 0, 0.12, 0.3, 0.012, 0.24, M["black"], bevel=0.003)
box("clapper_stick", cl, 0, 0, 0.265, 0.3, 0.014, 0.04, M["paper"], bevel=0.002)
for i in range(4):
    box(f"clapper_stripe_{i}", cl, -0.11 + i * 0.075, -0.008, 0.265, 0.03, 0.002, 0.04, M["black"], rot=(0, 0.6, 0))
for i, z in enumerate([0.17, 0.11, 0.05]):
    box(f"clapper_line_{i}", cl, 0, -0.007, z, 0.26, 0.001, 0.004, M["paper"])

# ---------------- Easter egg: forgotten polaroid on the floor ----------------
s = station("station_egg_polaroid", -10.5, 0, 7.9, (0, 1))
pol = box("polaroid_card", s, 0, 0, 0.002, 0.09, 0.107, 0.002, M["paper"], rot=(0, 0, 0.5))
pp = box("polaroid_photo", s, -0.004, -0.007, 0.0035, 0.078, 0.078, 0.001, M["photo_a"], rot=(0, 0, 0.5))
hit(s, 0, 0, 0.1, 0.45, 0.45, 0.2)

# ---------------- Set dressing: softbox on a C-stand (east wall corner) ----------------
sb = bpy.data.objects.new("softbox", None); DR.objects.link(sb); sb.location = (11.35, -6.0, 0); sb.rotation_euler = (0, 0, math.radians(130))
for i in range(3):
    a = math.radians(90 + i * 120)
    cyl(f"softbox_leg_{i}", sb, 0.25 * math.cos(a), 0.25 * math.sin(a), 0.05, 0.012, 0.1, M["steel"], col=DR)
cyl("softbox_pole", sb, 0, 0, 1.05, 0.015, 2.0, M["steel"], col=DR)
box("softbox_box", sb, 0, -0.1, 1.95, 0.6, 0.35, 0.6, M["black"], bevel=0.02, col=DR)
plane("softbox_face", sb, 0, -0.276, 1.95, 0.56, 0.56, M["softbox"], col=DR)

# Practical lights for the Blender preview (the site lights the scene itself)
plight("LGT_prac_desk", 6.4, 1.1, 5.7, 30, "#ffc98a", 0.08)
plight("LGT_prac_pendant_desk", 5.5, 2.6, 5.8, 60, "#ffc98a", 0.1)
plight("LGT_prac_pendant_reading", -9.2, 2.5, -7.2, 50, "#ffc98a", 0.1)
plight("LGT_prac_floorlamp", -10.85, 1.6, -7.65, 45, "#ffc98a", 0.1)
for i, (x, z) in enumerate([(-3.0, -8.6), (3.0, -8.6), (11.6, -6.8), (11.6, 2.6), (-3.4, 8.6), (3.4, 8.6)]):
    plight(f"LGT_prac_sconce_{i}", x, 2.45, z, 20, "#ffc07a", 0.05)

# Fixes on the catalog furniture: smaller tilt for the armchair, turntable onto the cabinet
from mathutils import Quaternion
O = bpy.data.objects
def world_bbox(o):
    pts = [d.matrix_world @ Vector(c) for d in [o] + list(o.children_recursive) if d.type == 'MESH' for c in d.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
def place(o, gx, gz, phi, scale, base):
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Quaternion((0, 0, 1), phi); o.scale = (scale,)*3
    bpy.context.view_layer.update(); mn, mx = world_bbox(o); c = (mn + mx) / 2
    o.location += Vector((gx - c.x, -gz - c.y, base - mn.z)); bpy.context.view_layer.update()
    mn, mx = world_bbox(o); return [round(v, 2) for v in (mx - mn)]
fix = {}
fix["armchair"] = place(O["FUR_armchair"], -9.9, -6.7, math.atan2(1, 0.45), 0.92, 0.0)
fix["turntable"] = place(O["FUR_record_console"], 9.35, -8.45, 0.0, 1.0, 0.72)
fix["desk_lamp"] = place(O["FUR_desk_lamp"], 6.55, 6.0, 0.0, 1.0, 0.765)
bpy.data.objects["ENV_window_glass"].visible_shadow = False
bpy.data.objects["ENV_window_daylight"].visible_shadow = False

# Preview render from the spawn camera
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 960; scene.render.resolution_y = 540
t = artifacts.file(name="stations.png", media_type="image/png")
scene.render.filepath = str(t.path); scene.render.image_settings.media_type = "IMAGE"; scene.render.image_settings.file_format = "PNG"
bpy.ops.render.render(write_still=True); t.publish()
result = {"stations": sorted(o.name for o in ST.objects if o.name.startswith("station_")), "fix": fix,
          "screens": [o.name for o in ST.objects if o.name.startswith(("screen_", "print_"))]}
