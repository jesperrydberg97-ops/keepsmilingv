# Higgsfield-prompt: studion i Blender (cinematic)

Det här är prompter för Higgsfields **3D Scene Builder**, som bygger scenen i Blender. Kopiera dem steg för
steg. Prompterna är på engelska eftersom verktygen förstår engelska bäst.

**Viktigt innan du börjar**

1. Ladda upp [`docs/blender/ksv-studio-blockout.glb`](./blender/ksv-studio-blockout.glb) som underlag
   (import asset) om verktyget tillåter det. Då hamnar allt på rätt plats direkt.
2. Gå igenom stegen i ordning: rummet, sedan möblerna, sedan ljuset och sist exporten. Kontrollera
   resultatet efter varje steg innan du går vidare.
3. "Cinematic" gäller **ljus och material** i Blender. Ljuset bakas in i texturerna, så känslan följer med
   till webben. Kamerarörelser och skärpedjup i Blender följer inte med, för på webben styr besökaren
   kameran.
4. Måtten och positionerna nedan styr var man kan gå och vad man kan klicka på i spelet. Om något
   flyttas mer än cirka 30 cm hamnar klickytor och kollisioner fel, så säg till om du vill ändra
   planlösningen, så uppdaterar jag koden.

---

## Steg 1: rummet (arkitektur)

```text
Build a semi-realistic interior in Blender, units in metres, +Z up in Blender (exports as +Y up).
A warm creative filmmaking studio loft for "Keep Smiling Visuals".

Room: 24 m wide (X from -12 to +12) by 18 m deep (Y from -9 to +9 in Blender, which is Z in the game),
ceiling height 4.6 m, walls 0.3 m thick. Keep the floor at height 0.

- Floor: wide oak plank floor, warm honey colour, subtle satin sheen, slight wear in walkways.
- Walls: warm off-white textured plaster with soft imperfections; a 15 cm dark wood skirting board.
- Ceiling: dark-stained exposed timber beams running across the room on a dark ceiling.
- Four black steel structural columns inside the room.
- West wall (X = -12): a row of tall industrial steel-frame windows with warm golden-hour daylight
  coming through.
- South wall (Y = +9 in Blender / Z = +9 in game), centre: the entrance door, dark wood with brass handle.
- A large 4 x 3 m rug at the centre-front of the room (around X 0, Z 3): deep red-brown wool with a
  thin gold border.
Name the walkable floor mesh exactly "floor". Apply all transforms. No cameras.
```

## Steg 2: möbler och stationer

Varje rad är en klickbar station. **Namnge objekten exakt** som i första kolumnen. Positionerna är
spelets X och Z (Z är Blenders −Y).

```text
Furnish the studio. Every item must be semi-realistic PBR, game-ready (clean low-to-mid poly,
bevelled edges, no micro detail that needs millions of polygons). Keep open walkways at least
1.5 m wide between stations. Position each object at the game coordinates given (x, z), where game z
equals Blender -Y. Name the top-level object of each station exactly as listed:

station_booking      (x 5.5,  z 5.8)  Reception/booking desk in walnut with a brass edge, an open laptop
                                       (laptop screen mesh named "screen_laptop", flat UV 0-1), a small
                                       desk lamp, a notebook.
station_tv           (x -11.0, z -0.5) Large wall-mounted TV on a low walnut media console, against the
                                       west wall. TV screen mesh named "screen_tv" (flat UV 0-1). A green
                                       velvet sofa facing it at around x -7.5.
station_noticeboard  (x -6.0, z 8.3)  Big cork noticeboard on the south wall with pinned photos and notes.
station_reading      (x -8.6, z -7.3) Reading lounge: leather armchair, small round side table with a
                                       stack of books, tall bookshelf, a floor lamp.
station_showreel     (x 0.0, z -7.4)  Projector screen on the north wall, about 4.5 x 2.5 m, mesh named
                                       "screen_showreel" (flat UV 0-1); a vintage film projector on a stand
                                       in front of it; two small poufs.
station_timeline     (x 5.6, z -8.2)  Long low shelf along the north wall with framed photos, awards and
                                       old cameras in chronological order.
station_music        (x 9.7, z -8.1)  Record player on a mid-century cabinet with two wooden speakers.
station_telephone    (x 10.9, z 7.7)  Vintage rotary telephone on a small round side table, south-east corner.
station_gallery_1 .. station_gallery_4
                     (x 11.2, z -5.6 / -3.4 / -1.2 / 1.0)
                                       Four large black-framed photo prints on the east wall, centre height
                                       about 1.7 m, each with a picture plane named print_1 .. print_4
                                       (flat UV 0-1, plain material), lit by small brass picture lights.
station_egg_shutter  (x 8.4, z 2.6)   Cinema camera on a tripod.
station_egg_clapper  (x -4.4, z -8.3) A film clapperboard on a wooden crate.
station_egg_polaroid (x -10.5, z 7.9) A single polaroid photo lying on the floor.

Leave a 1.2 m circle around (x 0, z 2.9) completely empty: the website places the founder character
there. Add plants (large fiddle-leaf fig, snake plants), a few C-stands and softboxes as set dressing
near the walls only. No text, logos or brand names anywhere.
```

## Steg 3: cinematic ljus (bakas in)

```text
Light the studio cinematically for golden hour, then bake it:
- Warm low sun (about 3200-3800 K) streaming through the west windows, casting long soft
  window-frame shadows across the oak floor and rug; gentle volumetric haze in the sunbeams.
- Practical lights: warm tungsten desk lamp, floor lamp, brass picture lights over the prints,
  a faint glow from the TV and projector screen; dim warm bounce on the ceiling beams.
- Cool subtle fill from the north side so shadows stay soft and slightly blue (teal-orange contrast),
  deep but not crushed blacks, filmic look (AgX).
- Ambient occlusion in corners and under furniture.
Bake the lighting (diffuse + AO, or combined) into a second UV set / lightmap textures at
2048 px for the architecture and 1024 px for furniture. Do not bake onto screen_* or print_* meshes.
Keep the scene in Blender with lights, but export WITHOUT lights and cameras.
```

## Steg 4: export

```text
Export as glTF Binary (.glb): +Y up, apply modifiers, include UVs and normals, PBR materials,
no animations, no cameras, no lights. Target: under 300,000 triangles total, under 40 materials,
textures max 2048 px (power of two). File name: studio.glb.
```

---

## När filen är klar

Skicka `studio.glb` (och gärna `.blend`-filen) till mig. Jag gör sedan detta:

- komprimerar filen (Meshopt och KTX2), på samma sätt som jag gjorde med din karaktärsmodell
- lägger den i `public/models/` och slår på den i `lib/config/art.ts`
- kontrollerar att alla stationer går att klicka på och att det inte finns någon osynlig vägg eller
  möbel i vägen

Om Higgsfield ger en snygg men "fri" tolkning som inte följer måtten kan den ändå användas: säg
till, så justerar jag planlösningen i koden efter den i stället (det tar längre tid).
