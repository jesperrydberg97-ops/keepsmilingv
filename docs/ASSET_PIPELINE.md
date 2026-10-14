# Character & asset pipeline

The visitor explores in **first person** (only their arms are visible). The **founder** is the
host character standing at the front edge of the rug, greeting visitors. Movement, collision,
camera and interactions never depend on any mesh, so a GLB is dropped in by editing
`lib/config/avatars.ts` only.

| Slot | File | Config | Current |
| --- | --- | --- | --- |
| Founder (host at the rug) | `public/models/founder.glb` (or CDN URL) | `HOST_AVATAR` | Cartoon placeholder (amber beanie, camera), HUD shows "Founder model: placeholder" |
| Visitor body (third-person view only) | none needed | `VISITOR_AVATAR` | Cartoon placeholder; only seen if the visitor picks third person in Settings |
| First-person arms | procedural (`components/world/FirstPersonArms.tsx`) | — | Stylised sleeves + mitten hands; a GLB slot can be added if a custom arms model is wanted |

### Art direction: "cosy video game"

Everything in the studio is cel-shaded (toon materials sharing one 4-step light ramp, see
`components/world/materials.ts`), has dark ink outlines (`Ink`), softly rounded edges and
saturated warm colours. Emissive accents (lamps, neon, markers) feed a light bloom pass.
Commissioned or bought models should match this: **stylised, chunky proportions, flat/painted
colours, no photoreal textures**. Supply base colour textures only (lighting comes from the scene);
outlines are added by the engine.

## Model specification

| Item | Requirement |
| --- | --- |
| Format | glTF 2.0 binary (`.glb`), one character per file |
| Units / scale | Metres, real-world scale (≈ 1.70–1.85 m tall). Apply all transforms before export. |
| Orientation | +Y up, character **faces +Z** (glTF default). If not, set `rotationY` in config. |
| Origin | Between the feet, on the ground plane (y = 0). |
| Mesh budget | ≤ 25k triangles (desktop), provide LOD1 ≤ 10k for mobile if using a single high-detail mesh. |
| Materials | PBR metallic-roughness, ≤ 3 materials. Textures ≤ 2048² (body), ≤ 1024² (accessories). |
| Texture compression | KTX2 (BasisU: UASTC for normal maps, ETC1S for colour). |
| Geometry compression | Meshopt (preferred, fast decode) or Draco. |
| Rig | Humanoid skeleton, ≤ 65 bones, 4 influences per vertex. Mixamo/UE-style naming recommended for retargeting. |
| Root motion | **In-place animations.** The controller owns translation; root bone must not translate horizontally. |
| File size target | ≤ 3 MB per character after compression. |

### Animation clips

| State | Default clip name | Notes |
| --- | --- | --- |
| idle | `Idle` | **Required.** Loop, subtle breathing / weight shift. |
| wave | `Wave` | **Required for the founder.** Loopable wave, played while greeting a visitor. |
| talk | `Talk` | Recommended. Loop of talking gestures while the greeting dialogue is open. |
| walk | `Walk` | Optional for the founder (they stand at the rug); authored at ≈ 1.4 m/s. |
| run | `Run` | Optional. |
| turn | (optional) | Not required: the founder turns smoothly to face the visitor in code. |

If your clip names differ, map them in `clips` in the config. Missing clips are logged in the browser console.

### Export & optimise (example with gltf-transform)

```bash
npx @gltf-transform/cli optimize founder-raw.glb founder-player.glb \
  --compress meshopt --texture-compress ktx2 --texture-size 2048
npx @gltf-transform/cli inspect founder-player.glb   # check tris, textures, clips
```

### Swap-in checklist

1. Export to spec, optimise, put the file in `public/models/` (or upload to the CDN).
2. Set `url` (and `rotationY`/`scale`/clip names if needed) in `lib/config/avatars.ts`.
3. `npm run dev`, walk into a wall, a corner and up to every station: the avatar must stay inside
   the 0.35 m collision radius, feet on the floor, facing travel direction.
4. Check the camera close to walls — the avatar hides automatically if the camera is pushed into it.
5. Run `npm run test:e2e`.

If the GLB fails to load, the placeholder is shown automatically (error boundary) and an error is logged.

## Environment assets (Phase 3)

The studio shell and props are currently built from primitives with procedural canvas textures
(zero downloads). The art pass replaces `components/world/Room.tsx` / `Stations.tsx` meshes with an
authored `studio.glb` while keeping:

* `game/layout.ts` as the source of truth for colliders, station positions and approach points
  (re-export these from the DCC scene via named empties if preferred);
* station props wrapped in `<Hotspot station={…}>` so interaction stays data-driven;
* baked lightmaps (second UV set) for static geometry, KTX2 textures, texture atlases for small props,
  instancing for repeated items (books, records), and lazy loading of non-essential props.
