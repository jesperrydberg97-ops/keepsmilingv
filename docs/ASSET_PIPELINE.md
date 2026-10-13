# Character & asset pipeline

The playable founder and the welcome guide are **separate asset slots**. Movement, collision,
camera and interactions never depend on the mesh, so a GLB can be dropped in by editing
`lib/config/avatars.ts` only.

| Slot | File | Config | Current |
| --- | --- | --- | --- |
| Playable founder | `public/models/founder-player.glb` (or CDN URL) | `PLAYER_AVATAR` | Procedural placeholder mannequin (amber beanie), HUD shows "Avatar: placeholder" |
| Welcome guide NPC | `public/models/welcome-guide.glb` | `GUIDE_AVATAR` | Procedural placeholder (sage top, badge) + name tag |

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
| idle | `Idle` | Loop, subtle breathing. |
| walk | `Walk` | Loop; authored at ≈ 1.4 m/s (`walkClipSpeed`). Playback rate is matched to actual speed. |
| run | `Run` | Loop; authored at ≈ 4 m/s (`runClipSpeed`). Used when sprinting. |
| interact | `Interact` | One-shot reach/press gesture (founder). Optional. |
| wave | `Wave` | One-shot greeting (guide). Optional. |
| turn | (optional) | Not required — heading is smoothly rotated by the controller. |

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
