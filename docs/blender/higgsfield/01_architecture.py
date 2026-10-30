import bpy, math, bmesh
from mathutils import Vector

scene = bpy.context.scene
# Clear default content
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in scene.collection.children:
        scene.collection.children.link(c)
    return c

ARCH = coll("ARCH"); LIGHTS = coll("LIGHTS")

def G(x, y, z):
    """Game coordinates (Y up, z toward the door) -> Blender (Z up)."""
    return Vector((x, -z, y))

def mat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)

def box(name, cx, cy, cz, sx, sy, sz, material, col=ARCH, bevel=0.0):
    """Box centred at game (cx, cy, cz) with game sizes (sx, sy, sz)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sz, sy), verts=bm.verts)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = G(cx, cy, cz)
    col.objects.link(o)
    me.materials.append(material)
    if bevel > 0:
        md = o.modifiers.new("Bevel", "BEVEL"); md.width = bevel; md.segments = 3; md.limit_method = 'ANGLE'
    return o

# --- Procedural materials (baked to images later for export) ---
def wood_floor():
    m = bpy.data.materials.new("M_floor_oak"); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links
    b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1, 1, 1)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    brick = N.new("ShaderNodeTexBrick")
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Mortar Size"].default_value = 0.004
    brick.inputs["Brick Width"].default_value = 1.6
    brick.inputs["Row Height"].default_value = 0.2
    brick.offset = 0.37; brick.squash = 1.0
    brick.inputs["Color1"].default_value = (*srgb("#b98454"), 1)
    brick.inputs["Color2"].default_value = (*srgb("#9c6a40"), 1)
    brick.inputs["Mortar"].default_value = (*srgb("#3a2414"), 1)
    L.new(mp.outputs["Vector"], brick.inputs["Vector"])
    wave = N.new("ShaderNodeTexWave"); wave.wave_type = 'BANDS'; wave.bands_direction = 'X'
    wave.inputs["Scale"].default_value = 3.0; wave.inputs["Distortion"].default_value = 9.0
    wave.inputs["Detail"].default_value = 4.0
    L.new(mp.outputs["Vector"], wave.inputs["Vector"])
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 0.6
    L.new(mp.outputs["Vector"], noise.inputs["Vector"])
    mix1 = N.new("ShaderNodeMix"); mix1.data_type = 'RGBA'; mix1.blend_type = 'MULTIPLY'
    mix1.inputs["Factor"].default_value = 0.22
    L.new(brick.outputs["Color"], mix1.inputs[6]); L.new(wave.outputs["Color"], mix1.inputs[7])
    mix2 = N.new("ShaderNodeMix"); mix2.data_type = 'RGBA'; mix2.blend_type = 'OVERLAY'
    mix2.inputs["Factor"].default_value = 0.25
    L.new(mix1.outputs[2], mix2.inputs[6]); L.new(noise.outputs["Color"], mix2.inputs[7])
    L.new(mix2.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
    L.new(brick.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

def plaster(name, hexc):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    n1 = N.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 1.4; n1.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], n1.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    c = srgb(hexc)
    ramp.color_ramp.elements[0].color = (c[0]*0.86, c[1]*0.84, c[2]*0.82, 1)
    ramp.color_ramp.elements[1].color = (*c, 1)
    ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[1].position = 0.7
    L.new(n1.outputs["Fac"], ramp.inputs["Fac"]); L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    n2 = N.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 40; n2.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], n2.inputs["Vector"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08
    L.new(n2.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

def rug_mat():
    m = bpy.data.materials.new("M_rug"); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["UV"], sep.inputs["Vector"])
    # Border mask from UV distance to the edges
    def edge(axis):
        mn = N.new("ShaderNodeMath"); mn.operation = 'MINIMUM'
        sub = N.new("ShaderNodeMath"); sub.operation = 'SUBTRACT'; sub.inputs[0].default_value = 1.0
        L.new(sep.outputs[axis], sub.inputs[1]); L.new(sep.outputs[axis], mn.inputs[0]); L.new(sub.outputs[0], mn.inputs[1])
        return mn
    ex, ey = edge(0), edge(1)
    mn = N.new("ShaderNodeMath"); mn.operation = 'MINIMUM'
    L.new(ex.outputs[0], mn.inputs[0]); L.new(ey.outputs[0], mn.inputs[1])
    band = N.new("ShaderNodeValToRGB")
    els = band.color_ramp.elements
    els[0].position = 0.035; els[0].color = (*srgb("#c9a066"), 1)
    els[1].position = 0.05; els[1].color = (*srgb("#5a2f22"), 1)
    band.color_ramp.interpolation = 'CONSTANT'
    e = els.new(0.02); e.color = (*srgb("#4a271b"), 1)
    e2 = els.new(0.075); e2.color = (*srgb("#a5824f"), 1)
    e3 = els.new(0.085); e3.color = (*srgb("#5a2f22"), 1)
    L.new(mn.outputs[0], band.inputs["Fac"])
    fib = N.new("ShaderNodeTexNoise"); fib.inputs["Scale"].default_value = 260; fib.inputs["Detail"].default_value = 4
    L.new(tc.outputs["UV"], fib.inputs["Vector"])
    mix = N.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs["Factor"].default_value = 0.35
    L.new(band.outputs["Color"], mix.inputs[6]); L.new(fib.outputs["Color"], mix.inputs[7])
    L.new(mix.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 1.0
    return m

M = {
  "floor": wood_floor(),
  "wall": plaster("M_wall_plaster", "#e8d6be"),
  "ceiling": mat("M_ceiling", srgb("#2a221c"), 0.95),
  "beam": mat("M_beam_darkwood", srgb("#3b2416"), 0.6),
  "steel": mat("M_steel_black", srgb("#1e1d21"), 0.38, 0.85),
  "skirt": mat("M_skirting", srgb("#3b2416"), 0.5),
  "door": mat("M_door_walnut", srgb("#4a2c1a"), 0.45),
  "brass": mat("M_brass", srgb("#c69a52"), 0.28, 1.0),
  "rug": rug_mat(),
}
glass = mat("M_window_glass", srgb("#cfe0ea"), 0.05); glass.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 1.0
sky = bpy.data.materials.new("M_window_daylight"); sky.use_nodes = True
sn = sky.node_tree.nodes; sb = sn["Principled BSDF"]
sb.inputs["Base Color"].default_value = (*srgb("#fff1d0"), 1)
sb.inputs["Emission Color"].default_value = (*srgb("#ffe7c0"), 1); sb.inputs["Emission Strength"].default_value = 3.0

W, D, H, T = 24.0, 18.0, 4.6, 0.3
# Floor (walkable, named for the site's click-to-walk)
me = bpy.data.meshes.new("floor")
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
bmesh.ops.scale(bm, vec=(W, D, 1), verts=bm.verts); bm.to_mesh(me); bm.free()
fl = bpy.data.objects.new("floor", me); ARCH.objects.link(fl); me.materials.append(M["floor"])
# UVs in metres for tiling
uv = me.uv_layers.new(name="UVMap")
for loop in me.loops:
    v = me.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (v.x / 4, v.y / 4)

# Rug: 6 x 4 m at game (0, 0.5)
me = bpy.data.meshes.new("rug")
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
bmesh.ops.scale(bm, vec=(6, 4, 1), verts=bm.verts)
bm.to_mesh(me); bm.free()
rug = bpy.data.objects.new("ENV_rug", me); rug.location = G(0, 0.012, 0.5); ARCH.objects.link(rug)
me.materials.append(M["rug"])
uv = me.uv_layers.new(name="UVMap")
for loop in me.loops:
    v = me.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (v.x / 6 + 0.5, v.y / 4 + 0.5)
sol = rug.modifiers.new("Thick", "SOLIDIFY"); sol.thickness = 0.012; sol.offset = 1

# Ceiling
box("ENV_ceiling", 0, H + 0.05, 0, W + 2*T, 0.1, D + 2*T, M["ceiling"])
# Walls (north, east, south with door gap, west with window gap)
box("ENV_wall_n", 0, H/2, -9 - T/2, W + 2*T, H, T, M["wall"])
box("ENV_wall_e", 12 + T/2, H/2, 0, T, H, D, M["wall"])
dw, dh = 2.4, 2.8
box("ENV_wall_s_l", (-12 - dw/2) / 2 - 0.15, H/2, 9 + T/2, 12 - dw/2 + T, H, T, M["wall"])
box("ENV_wall_s_r", (12 + dw/2) / 2 + 0.15, H/2, 9 + T/2, 12 - dw/2 + T, H, T, M["wall"])
box("ENV_wall_s_top", 0, (H + dh) / 2, 9 + T/2, dw, H - dh, T, M["wall"])
z0, z1 = 2.0, 8.2
box("ENV_wall_w_a", -12 - T/2, H/2, (-9 + z0) / 2, T, H, z0 + 9, M["wall"])
box("ENV_wall_w_b", -12 - T/2, H/2, (z1 + 9) / 2, T, H, 9 - z1, M["wall"])
box("ENV_wall_w_sill", -12 - T/2, 0.45, (z0 + z1) / 2, T, 0.9, z1 - z0, M["wall"])
box("ENV_wall_w_head", -12 - T/2, (H + 3.6) / 2, (z0 + z1) / 2, T, H - 3.6, z1 - z0, M["wall"])
# Skirting boards
for nm, cx, cz, sx, sz in [("n", 0, -8.99, W, 0.03), ("e", 11.99, 0, 0.03, D)]:
    box(f"ENV_skirt_{nm}", cx, 0.075, cz, sx, 0.15, sz, M["skirt"])
# Window: steel frame grid + daylight panel behind
wx = -12 - T/2
box("ENV_window_daylight", wx - 0.12, 2.25, (z0 + z1) / 2, 0.02, 2.7, z1 - z0, sky)
box("ENV_window_glass", wx, 2.25, (z0 + z1) / 2, 0.02, 2.7, z1 - z0, glass)
panes = 6; pw = (z1 - z0) / panes
for i in range(panes + 1):
    box(f"ENV_window_mullion_{i}", wx + 0.03, 2.25, z0 + i * pw, 0.08, 2.7, 0.06, M["steel"])
for j, y in enumerate([0.9, 1.8, 2.7, 3.6]):
    box(f"ENV_window_transom_{j}", wx + 0.03, y, (z0 + z1) / 2, 0.08, 0.06, z1 - z0, M["steel"])
# Ceiling beams (along the depth) and a cross girder
for x in [-9, -6, -3, 0, 3, 6, 9]:
    box(f"ENV_beam_{x:+d}", x, H - 0.18, 0, 0.24, 0.36, D, M["beam"], bevel=0.01)
# Columns (steel I-section look: core + flanges)
for i, (cx, cz) in enumerate([(-4.5, -3), (4.5, -3)]):
    box(f"ENV_column_{i}", cx, H/2, cz, 0.3, H, 0.3, M["steel"], bevel=0.008)
    box(f"ENV_column_{i}_base", cx, 0.06, cz, 0.36, 0.12, 0.36, M["steel"], bevel=0.008)
# Entrance door
box("ENV_door_frame", 0, dh/2, 8.97, dw + 0.16, dh + 0.08, 0.08, M["steel"])
box("ENV_door_leaf_l", -dw/4, (dh - 0.05)/2, 8.95, dw/2 - 0.04, dh - 0.05, 0.05, M["door"], bevel=0.01)
box("ENV_door_leaf_r", dw/4, (dh - 0.05)/2, 8.95, dw/2 - 0.04, dh - 0.05, 0.05, M["door"], bevel=0.01)
box("ENV_door_handle_l", -0.12, 1.05, 8.91, 0.03, 0.4, 0.03, M["brass"])
box("ENV_door_handle_r", 0.12, 1.05, 8.91, 0.03, 0.4, 0.03, M["brass"])

# --- Working light rig (Blender preview only; not exported) ---
for o in list(LIGHTS.objects): bpy.data.objects.remove(o, do_unlink=True)
sun_d = bpy.data.lights.new("LGT_key_sun", "SUN"); sun_d.energy = 4.5; sun_d.color = (1.0, 0.78, 0.52); sun_d.angle = math.radians(1.5)
sun = bpy.data.objects.new("LGT_key_sun", sun_d); LIGHTS.objects.link(sun)
# Low golden sun from the west through the windows (Blender -X side), slightly from the south
sun.rotation_euler = (math.radians(68), 0, math.radians(-100))
fill_d = bpy.data.lights.new("LGT_fill", "POINT"); fill_d.energy = 900; fill_d.color = (0.75, 0.85, 1.0); fill_d.shadow_soft_size = 3
fill = bpy.data.objects.new("LGT_fill", fill_d); fill.location = G(4, 3.8, -4); LIGHTS.objects.link(fill)
warm_d = bpy.data.lights.new("LGT_warm_bounce", "POINT"); warm_d.energy = 700; warm_d.color = (1.0, 0.7, 0.45); warm_d.shadow_soft_size = 3
warm = bpy.data.objects.new("LGT_warm_bounce", warm_d); warm.location = G(-6, 3.6, 4); LIGHTS.objects.link(warm)

world = scene.world or bpy.data.worlds.new("World"); scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.32, 0.27, 0.22, 1); bg.inputs["Strength"].default_value = 0.35

# Delivery camera: visitor's spawn view (eye 1.62 m at game (0, 6.3) looking toward -Z)
cam_d = bpy.data.cameras.new("CAM_main"); cam_d.lens_unit = 'FOV'; cam_d.angle = math.radians(80)
cam = bpy.data.objects.new("CAM_main", cam_d); cam.location = G(0, 1.62, 6.9)
cam.rotation_euler = (math.radians(90 - 4), 0, 0)  # looking toward Blender +Y (game -Z)
scene.collection.objects.link(cam); scene.camera = cam

scene.render.engine = 'BLENDER_EEVEE'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.resolution_x = 960; scene.render.resolution_y = 540
try:
    scene.eevee.taa_render_samples = 16
    scene.eevee.use_shadows = True
    scene.eevee.use_raytracing = True
except Exception:
    pass

t = artifacts.file(name="arch.png", media_type="image/png")
scene.render.filepath = str(t.path)
scene.render.image_settings.media_type = "IMAGE"
scene.render.image_settings.file_format = "PNG"
bpy.ops.render.render(write_still=True)
t.publish()
result = {"objects": len(bpy.data.objects), "materials": len(bpy.data.materials)}
