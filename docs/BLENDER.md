# Studio model: Blender guide and artist brief

## Snabbstart (svenska)

1. Öppna Blender → **File → Import → glTF 2.0** → välj [`docs/blender/ksv-studio-blockout.glb`](./blender/ksv-studio-blockout.glb).
2. Du ser rummet i rätt mått med grå lådor. Lådorna under **Furniture_KeepOut** visar var möblerna får stå (besökaren går inte in i dem). Empties under **Stations** visar var de klickbara sakerna är.
3. Modellera rummet och möblerna ovanpå. Flytta inte väggar, stationer eller lådor, för gångvägarna och kollisionerna i koden bygger på dem.
4. Exportera som **glTF Binary (.glb)** enligt inställningarna nedan, spara som `public/models/studio.glb` och sätt `url` i `lib/config/art.ts`. Klart.

Vill du hellre beställa: skicka den här filen och blockout-filen till en 3D-artist. Resten av dokumentet är skrivet för hen.

---

## Artist brief (English)

**Project:** a semi-realistic, explorable 3D studio for Keep Smiling Visuals, a filmmaking and
photography studio, running in the browser (three.js). Visitors walk around in first person and
click objects: a booking desk, a TV, a gallery wall of framed prints, a showreel projector screen,
a reading corner, a record player, a timeline shelf and a phone.

**Look:** a warm creative loft at golden hour. Oak floor, textured plaster walls, dark steel,
exposed timber beams, leather and fabric, brass details, plants, books, film gear. Think of a
high-quality modern game interior (semi-realistic PBR), not photogrammetry and not cartoon.
Lived-in, welcoming, uncluttered walkways.

### Hard constraints (the site's gameplay depends on them)

- **Start from the blockout** `ksv-studio-blockout.glb`. Units are metres. The room is
  24 × 18 m with a 4.6 m ceiling, and the windows are on the west wall (−X).
- **Do not move** the walls, door, window opening, stations, approach points or the keep-out
  boxes. Furniture must stay **inside** its `prop_*` keep-out box (it may be smaller); open floor
  outside those boxes must stay open. Keep `spot_founder_keep_clear` empty: the founder
  character is rendered there by the site.
- **Name these objects exactly** (the site attaches interactions by name):

| Object | Node name |
| --- | --- |
| Booking desk (whole desk or a parent empty) | `station_booking` |
| TV (whole unit) | `station_tv` |
| Showreel projector / screen | `station_showreel` |
| About noticeboard | `station_noticeboard` |
| Reading corner side table + books | `station_reading` |
| Timeline shelf | `station_timeline` |
| Record player cabinet | `station_music` |
| Telephone + table | `station_telephone` |
| Gallery frames, left to right from the north | `station_gallery_1` … `station_gallery_4` |
| Easter eggs: cinema camera on tripod, clapperboard, polaroid on the floor | `station_egg_shutter`, `station_egg_clapper`, `station_egg_polaroid` |
| Picture surface inside each frame (UV 0–1, unwrapped flat) | `print_1` … `print_4` |
| TV screen surface / showreel screen / laptop screen (UV 0–1) | `screen_tv`, `screen_showreel`, `screen_laptop` |
| Walkable floor | `floor` (any name starting with `floor`) |

  The site puts live content on the `screen_*` and `print_*` surfaces, so give them a simple
  material and a clean 0–1 UV map.

### Technical spec

| Item | Target |
| --- | --- |
| Format | glTF 2.0 binary (`.glb`), +Y up (Blender's exporter default) |
| Triangles | ≤ 300k for the whole room (aim lower; phones load this too) |
| Materials | PBR metallic-roughness; reuse materials and trim sheets; ≤ 40 materials |
| Textures | ≤ 2048 px (4096 only for the floor/walls if needed), power-of-two, KTX2-ready |
| Lighting | **Bake** indirect light / AO into a second UV set or into base colour for static architecture. Strongly recommended: it gives the biggest jump in realism. Don't export Blender lights (the site lights the scene); or tell us if you do. |
| Hierarchy | Clean names, applied transforms (Ctrl+A), no unused data, no cameras |
| Compression | Meshopt or Draco is fine; we also run `gltf-transform optimize` |
| Deliverables | `studio.glb` + the `.blend` file + texture sources |

**Export settings (Blender → glTF 2.0):** Format *glTF Binary*, Include *Selected/Visible objects*,
Transform *+Y Up* ✔, Geometry *Apply Modifiers* ✔, *UVs* ✔, *Normals* ✔, Materials *Export*,
Compression optional, Animation off (unless something animates on purpose), Lighting *Unitless*.

### Optimising (developer)

```bash
npx @gltf-transform/cli optimize studio-raw.glb public/models/studio.glb \
  --compress meshopt --texture-compress ktx2 --texture-size 2048
```

Then set `STUDIO_MODEL.url = "/models/studio.glb"` in `lib/config/art.ts`. The procedural room
is replaced automatically, and the decoders for Meshopt, Draco and KTX2 are already bundled under
`public/decoders/`.

The blockout is generated from `game/layout.ts` with `npm run export:blockout`. If the floor
plan changes, regenerate it and send the artist the new file; CI fails if the committed blockout
is out of date.
