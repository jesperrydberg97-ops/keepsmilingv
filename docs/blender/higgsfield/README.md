# Studio built with Higgsfield 3D Jutsu (Blender in the cloud)

`public/models/studio.glb` was built in the Higgsfield 3D Jutsu project
**"KSV Studio – Keep Smiling Visuals loft"**
(https://higgsfield.ai/3d-jutsu/de1ab8b3-cd9e-4004-8e88-f99fb8f69e1d, private to the owner's account).

The scripts here are what ran in that project, in order:

1. `01_architecture.py`: room shell from `game/layout.ts` (24 × 18 × 4.6 m): oak floor, plaster walls,
   west steel windows, beams, columns, entrance door, rug, preview camera and light rig.
2. Catalog imports (Higgsfield's curated "living room" set), then `02_place_catalog_furniture.py`
   to fit each one inside its keep-out box from `game/layout.ts`.
3. `03_stations.py`: every interactive station, named `station_<id>`, with `screen_*`, `print_*`
   surfaces and invisible `hit_*` click targets, plus practical lights for the Blender preview.
4. `04_architecture_uvs.py`: metre-scale UVs on the architecture.

Export and optimise (keep UVs even though the materials have no textures yet; the site
supplies the floor, plaster and rug textures by material name):

```bash
npx @gltf-transform/cli optimize raw.glb public/models/studio.glb --compress meshopt \
  --join false --flatten false --instance false --palette false --simplify false \
  --texture-compress false --prune-attributes false
```

`--join`/`--flatten`/`--palette` must stay off: they merge meshes and materials and would
lose the node and material names the site depends on. `tests/game.test.ts` checks the
shipped file for every station, screen, print and the floor.
