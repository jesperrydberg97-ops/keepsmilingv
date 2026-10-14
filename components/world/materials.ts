import * as THREE from "three";
import { woodFloorTexture } from "./textures";

/**
 * Stylised "video game" materials: cel-shaded toon materials sharing one
 * stepped light ramp, saturated warm colours, and emissive accents that the
 * bloom pass picks up. Created lazily on the client and shared across meshes.
 */

let ramp: THREE.DataTexture | null = null;

/**
 * Soft cel-shading ramp: a smooth S-curve sampled with linear filtering, so
 * light rolls off gradually (no hard banding) while keeping the stylised,
 * slightly flattened look of a modern cosy game.
 */
export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  const n = 64;
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const s = x * x * (3 - 2 * x); // smoothstep
    const v = Math.round(255 * (0.3 + 0.7 * (0.35 * x + 0.65 * s)));
    data.set([v, v, v, 255], i * 4);
  }
  ramp = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.LinearFilter;
  ramp.magFilter = THREE.LinearFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

export function toon(color: THREE.ColorRepresentation, opts: Omit<THREE.MeshToonMaterialParameters, "color" | "gradientMap"> = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...opts });
}

let mats: ReturnType<typeof create> | null = null;

function create() {
  const floorMap = woodFloorTexture(1024); // supersampled ×2 on high/ultra
  floorMap.repeat.set(6, 4.5);
  return {
    floor: toon("#e9b98a", { map: floorMap }),
    // Flat, clean plaster reads better than noisy texture under cel shading.
    wall: toon("#efd2ae"),
    ceiling: toon("#3a2a22"),
    darkWood: toon("#5a3420"),
    warmWood: toon("#b5703c"),
    oak: toon("#d39a5c"),
    metal: toon("#3b3a44"),
    brass: toon("#e2b257", { emissive: "#3a2508" }),
    leather: toon("#a2512c"),
    fabric: toon("#4f7a6a"),
    fabricWarm: toon("#d9884e"),
    cork: toon("#c98f55"),
    paper: toon("#fff3dc"),
    black: toon("#1d1b22"),
    glass: new THREE.MeshBasicMaterial({ color: "#1b1d1f", transparent: true, opacity: 0.55 }),
    daylight: new THREE.MeshBasicMaterial({ color: "#fff1d0", toneMapped: false }),
    leaf: toon("#58a04a"),
    leafDark: toon("#2f7a45"),
    terracotta: toon("#d0663e"),
    lampShade: toon("#ffe2a8", { emissive: "#ffb347", emissiveIntensity: 0.9 }),
    amberGlow: new THREE.MeshBasicMaterial({ color: "#ffc46b", toneMapped: false }),
  };
}

export function materials() {
  mats ??= create();
  return mats;
}

/** Colour used for the cartoon outlines around props. */
export const OUTLINE_COLOR = "#1a0f08";
