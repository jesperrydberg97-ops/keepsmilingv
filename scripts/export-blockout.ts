/**
 * Exports the studio floor plan as a blockout GLB for Blender:
 *   npm run export:blockout   →   docs/blender/ksv-studio-blockout.glb
 *
 * Everything comes straight from game/layout.ts (the same data used for
 * collision, pathfinding and stations), so a model built on top of this file
 * lines up with the running site. Units are metres, Y up (Blender's glTF
 * importer converts to Z up automatically). +Z points to the entrance (south).
 *
 * Node naming (keep these names in the final studio.glb):
 *   station_<id>   empty at each interactive object's centre (+ height)
 *   approach_<id>  empty where the visitor stands, rotated to face the object
 *   prop_<id>      box = keep-out footprint of furniture (walkable space ends here)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROPS, STUDIO_LAYOUT, buildStations } from "../game/layout.ts";

type Vec3 = [number, number, number];
interface NodeDef {
  name: string;
  translation?: Vec3;
  rotation?: [number, number, number, number];
  scale?: Vec3;
  mesh?: number;
  children?: number[];
}

const MATERIALS = [
  { name: "blockout_floor", color: [0.55, 0.36, 0.22, 1] },
  { name: "blockout_wall", color: [0.86, 0.8, 0.7, 1] },
  { name: "blockout_metal", color: [0.15, 0.15, 0.17, 1] },
  { name: "blockout_furniture", color: [0.62, 0.48, 0.36, 1] },
  { name: "blockout_screen", color: [0.05, 0.05, 0.06, 1] },
  { name: "blockout_window", color: [0.75, 0.88, 1, 1] },
  { name: "blockout_wood_dark", color: [0.3, 0.19, 0.11, 1] },
] as const;
const M = { floor: 0, wall: 1, metal: 2, furniture: 3, screen: 4, window: 5, wood_dark: 6 } as const;

// ---- unit cube geometry (centred, size 1) ----------------------------------
const faces: { n: Vec3; corners: Vec3[] }[] = [
  { n: [1, 0, 0], corners: [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]] },
  { n: [-1, 0, 0], corners: [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]] },
  { n: [0, 1, 0], corners: [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]] },
  { n: [0, -1, 0], corners: [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]] },
  { n: [0, 0, 1], corners: [[0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5]] },
  { n: [0, 0, -1], corners: [[-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5]] },
];
const positions: number[] = [];
const normals: number[] = [];
const indices: number[] = [];
faces.forEach((f, i) => {
  f.corners.forEach((c) => {
    positions.push(...c);
    normals.push(...f.n);
  });
  const o = i * 4; // 4 vertices per face
  indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
});

// ---- scene ------------------------------------------------------------------
const nodes: NodeDef[] = [];
const add = (n: NodeDef) => nodes.push(n) - 1;
const box = (name: string, center: Vec3, size: Vec3, material: number) =>
  add({ name, translation: center, scale: size, mesh: material });
const yaw = (h: number): [number, number, number, number] => [0, Math.sin(h / 2), 0, Math.cos(h / 2)];

const { bounds, ceilingHeight: H, wallThickness: T } = STUDIO_LAYOUT;
const W = bounds.maxX - bounds.minX;
const D = bounds.maxZ - bounds.minZ;

// Architecture
const arch: number[] = [];
arch.push(box("floor", [0, -0.01, 0], [W, 0.02, D], M.floor));
arch.push(box("wall_north", [0, H / 2, bounds.minZ - T / 2], [W + 2 * T, H, T], M.wall));
arch.push(box("wall_south", [0, H / 2, bounds.maxZ + T / 2], [W + 2 * T, H, T], M.wall));
arch.push(box("wall_east", [bounds.maxX + T / 2, H / 2, 0], [T, H, D], M.wall));
const { z0, z1 } = PROPS.westWindows;
const wx = bounds.minX - T / 2;
arch.push(box("wall_west_north", [wx, H / 2, (bounds.minZ + z0) / 2], [T, H, z0 - bounds.minZ], M.wall));
arch.push(box("wall_west_south", [wx, H / 2, (z1 + bounds.maxZ) / 2], [T, H, bounds.maxZ - z1], M.wall));
arch.push(box("wall_west_sill", [wx, 0.45, (z0 + z1) / 2], [T, 0.9, z1 - z0], M.wall));
arch.push(box("wall_west_lintel", [wx, (H + 3.6) / 2, (z0 + z1) / 2], [T, H - 3.6, z1 - z0], M.wall));
arch.push(box("window_west_glass", [wx, 2.25, (z0 + z1) / 2], [0.04, 2.7, z1 - z0], M.window));
arch.push(box("door_entrance", [PROPS.door.x, PROPS.door.h / 2, bounds.maxZ - 0.03], [PROPS.door.w, PROPS.door.h, 0.06], M.metal));
arch.push(box("ceiling", [0, H + 0.01, 0], [W + 2 * T, 0.02, D + 2 * T], M.wall));
[-9, -6, -3, 0, 3, 6, 9].forEach((x, i) => arch.push(box(`beam_${i + 1}`, [x, H - 0.18, 0], [0.24, 0.36, D], M.wood_dark)));

// Furniture keep-out footprints (walls are architecture above)
const propsGroup: number[] = [];
for (const c of STUDIO_LAYOUT.colliders) {
  // Walls are architecture above; the founder's personal-space box is not furniture.
  if (c.id.startsWith("wall") || c.id === "npc-guide") continue;
  const mat = c.id.startsWith("column") ? M.metal : M.furniture;
  propsGroup.push(box(`prop_${c.id}`, [(c.minX + c.maxX) / 2, c.height / 2, (c.minZ + c.maxZ) / 2], [c.maxX - c.minX, c.height, c.maxZ - c.minZ], mat));
}

// Wall-mounted items (screens, boards, frames)
const wallItems: number[] = [];
const tv = PROPS.tvScreen;
wallItems.push(box("wall_tv_screen", [tv.x, tv.y, tv.z], [0.06, tv.h, tv.w], M.screen));
const ps = PROPS.projectorScreen;
wallItems.push(box("wall_showreel_screen", [ps.x, ps.y, ps.z], [ps.w, ps.h, 0.04], M.screen));
const ab = PROPS.aboutBoard;
wallItems.push(box("wall_about_board", [ab.x, ab.y, ab.z], [ab.w, ab.h, 0.05], M.furniture));
PROPS.galleryFrames.forEach((f, i) => wallItems.push(box(`wall_gallery_frame_${i + 1}`, [f.x, f.y, f.z], [0.05, 1.0, 1.4], M.screen)));

// Station + approach empties (all stations, using placeholder print slugs for the frames)
const stations = buildStations(PROPS.galleryFrames.map((_, i) => ({ slug: `frame-${i + 1}`, title: `Frame ${i + 1}` })));
const stationGroup: number[] = [];
const approachGroup: number[] = [];
for (const s of stations) {
  const id = s.id.startsWith("print-") ? s.id.replace("print-", "gallery_") : s.id.replace(/-/g, "_");
  stationGroup.push(add({ name: `station_${id}`, translation: [s.position.x, s.height, s.position.z] }));
  approachGroup.push(add({ name: `approach_${id}`, translation: [s.approach.x, 0, s.approach.z], rotation: yaw(s.approach.heading) }));
}
const spawn = add({ name: "spawn_visitor", translation: [STUDIO_LAYOUT.spawn.x, 0, STUDIO_LAYOUT.spawn.z], rotation: yaw(STUDIO_LAYOUT.spawn.heading) });
// Where the founder character stands (rendered by the site; keep this spot clear in the model).
const founderSpot = add({ name: "spot_founder_keep_clear", translation: [PROPS.npc.x, 0, PROPS.npc.z] });

const groups = [
  add({ name: "Architecture", children: arch }),
  add({ name: "Furniture_KeepOut", children: propsGroup }),
  add({ name: "Wall_Items", children: wallItems }),
  add({ name: "Stations", children: stationGroup }),
  add({ name: "Approach_Points", children: approachGroup }),
];
const root = add({ name: "KSV_Studio_Blockout", children: [...groups, spawn, founderSpot] });

// ---- binary buffer ------------------------------------------------------------
const posBuf = Buffer.from(new Float32Array(positions).buffer);
const nrmBuf = Buffer.from(new Float32Array(normals).buffer);
const idxBuf = Buffer.from(new Uint16Array(indices).buffer);
const pad4 = (b: Buffer, fill = 0) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4), fill)]) : b);
const bin = Buffer.concat([posBuf, nrmBuf, pad4(idxBuf)]);

const gltf = {
  asset: { version: "2.0", generator: "KSV export-blockout" },
  extras: {
    note: "Keep Smiling Visuals studio blockout. Metres, Y up, +Z = entrance (south). Generated from game/layout.ts — do not edit by hand; rerun npm run export:blockout.",
  },
  scene: 0,
  scenes: [{ name: "KSV Studio", nodes: [root] }],
  nodes,
  meshes: MATERIALS.map((m, i) => ({ name: `cube_${m.name}`, primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: i }] })),
  materials: MATERIALS.map((m) => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: m.color, metallicFactor: 0, roughnessFactor: 0.9 } })),
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
    { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
    { bufferView: 2, componentType: 5123, count: indices.length, type: "SCALAR" },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length, byteLength: nrmBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length + nrmBuf.length, byteLength: idxBuf.length, target: 34963 },
  ],
  buffers: [{ byteLength: bin.length }],
};

const json = pad4(Buffer.from(JSON.stringify(gltf)), 0x20);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const chunk = (type: number, data: Buffer) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(data.length, 0);
  h.writeUInt32LE(type, 4);
  return Buffer.concat([h, data]);
};
const glb = Buffer.concat([header, chunk(0x4e4f534a, json), chunk(0x004e4942, bin)]);

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../docs/blender/ksv-studio-blockout.glb");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, glb);
console.log(`Wrote ${out} (${(glb.length / 1024).toFixed(1)} KB, ${nodes.length} nodes, ${stations.length} stations)`);
