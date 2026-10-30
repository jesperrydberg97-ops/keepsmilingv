# Character models

Asset slots (see `lib/config/avatars.ts` and `docs/ASSET_PIPELINE.md`):

| File | Purpose | Status |
| --- | --- | --- |
| `studio.glb` | The studio room, built with Higgsfield 3D Jutsu (see `docs/blender/higgsfield/`) | **Live** (0.4 MB) |
| `founder.glb` | The founder greeting visitors at the rug | **Supplied** (static scan, no rig): idles, nods and backflips procedurally |

`founder.glb` was optimised from the owner's 19.5 MB export with:

```bash
npx @gltf-transform/cli optimize me_for_website.glb founder.glb \
  --compress meshopt --simplify-ratio 0.12 --simplify-error 0.0005 \
  --texture-compress webp --texture-size 2048
```

(580k → 70k triangles, 0.8 MB.) Keep files small (target < 3 MB each, Meshopt-compressed).
A rigged version with `Idle`/`Wave`/`Talk` clips can replace it without code changes.
