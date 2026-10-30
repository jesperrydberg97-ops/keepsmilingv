# World-space box-projected UVs (1 unit = 2 m) on the architecture, so the site's
# tiling plaster/wood textures keep a constant real-world scale on every surface.
import bpy
for o in bpy.data.objects:
    if o.type != 'MESH' or not o.name.startswith("ENV_") or o.name == "ENV_rug":
        continue
    me = o.data
    uv = me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap")
    mw = o.matrix_world
    nm = mw.to_3x3()
    for p in me.polygons:
        n = (nm @ p.normal).normalized()
        ax = max(range(3), key=lambda i: abs(n[i]))
        for li in p.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            u, w = (v.y, v.z) if ax == 0 else (v.x, v.z) if ax == 1 else (v.x, v.y)
            uv.data[li].uv = (u / 2.0, w / 2.0)
