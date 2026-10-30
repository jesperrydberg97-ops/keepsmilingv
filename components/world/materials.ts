import * as THREE from "three";
import { ART_STYLE } from "@/lib/config/art";
import { plasterTexture, woodFloorTexture } from "./textures";

/**
 * Shared studio materials for both art directions (see lib/config/art.ts):
 * - realistic: physically based (MeshStandardMaterial) with roughness and
 *   metalness, plaster/wood textures with subtle bump, lit by the scene and a
 *   local environment for soft reflections.
 * - stylized: cel-shaded toon materials sharing one soft light ramp.
 * Created lazily on the client and shared across meshes.
 */

export const REALISTIC = ART_STYLE === "realistic";

let ramp: THREE.DataTexture | null = null;

/** Soft cel-shading ramp (stylized style only). */
export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  const n = 64;
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const s = x * x * (3 - 2 * x);
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

export interface SurfaceOptions {
  map?: THREE.Texture;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  /** PBR only (ignored by the stylized style). */
  roughness?: number;
  metalness?: number;
}

/** A surface in the current art style. */
export function surface(color: THREE.ColorRepresentation, opts: SurfaceOptions = {}): THREE.Material {
  const { roughness = 0.7, metalness = 0, bumpMap, bumpScale, ...rest } = opts;
  // Only pass optional maps that are set (three warns about `undefined` parameters).
  const defined = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  if (REALISTIC) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...(bumpMap ? { bumpMap, bumpScale: bumpScale ?? 1 } : {}), ...defined });
  }
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...defined });
}

/** Pick a colour per art style: muted natural tones for realistic, punchier for stylized. */
const pick = (realistic: string, stylized: string) => (REALISTIC ? realistic : stylized);

let mats: ReturnType<typeof create> | null = null;

function create() {
  const floorMap = woodFloorTexture(1024); // supersampled ×2 on high/ultra
  floorMap.repeat.set(6, 4.5);
  const plaster = plasterTexture(512).clone();
  plaster.repeat.set(5, 1.2);
  plaster.needsUpdate = true;
  return {
    floor: surface(pick("#d9b08a", "#e9b98a"), { map: floorMap, roughness: 0.48, bumpMap: floorMap, bumpScale: 0.6 }),
    wall: REALISTIC ? surface("#e6d3bb", { map: plaster, bumpMap: plaster, bumpScale: 0.5, roughness: 0.92 }) : surface("#efd2ae"),
    ceiling: surface(pick("#2c241e", "#3a2a22"), { roughness: 0.95 }),
    darkWood: surface(pick("#4a2c1a", "#5a3420"), { roughness: 0.55 }),
    warmWood: surface(pick("#8f5a33", "#b5703c"), { roughness: 0.5 }),
    oak: surface(pick("#b9874f", "#d39a5c"), { roughness: 0.45 }),
    metal: surface(pick("#2b2a2f", "#3b3a44"), { roughness: 0.35, metalness: 0.85 }),
    brass: surface(pick("#c69a52", "#e2b257"), { roughness: 0.28, metalness: 1, emissive: REALISTIC ? "#000000" : "#3a2508" }),
    leather: surface(pick("#7a3f22", "#a2512c"), { roughness: 0.42 }),
    fabric: surface(pick("#4e6a5e", "#4f7a6a"), { roughness: 0.95 }),
    fabricWarm: surface(pick("#b07a52", "#d9884e"), { roughness: 0.95 }),
    cork: surface(pick("#b07f4f", "#c98f55"), { roughness: 1 }),
    paper: surface(pick("#f1e8d6", "#fff3dc"), { roughness: 0.85 }),
    black: surface(pick("#141316", "#1d1b22"), { roughness: 0.3, metalness: 0.2 }),
    glass: new THREE.MeshBasicMaterial({ color: "#1b1d1f", transparent: true, opacity: 0.55 }),
    daylight: new THREE.MeshBasicMaterial({ color: "#fff1d0", toneMapped: false }),
    leaf: surface(pick("#4d7a3e", "#58a04a"), { roughness: 0.6 }),
    leafDark: surface(pick("#2f5a33", "#2f7a45"), { roughness: 0.6 }),
    terracotta: surface(pick("#a95a3a", "#d0663e"), { roughness: 0.85 }),
    lampShade: surface("#ffe2a8", { emissive: "#ffb347", emissiveIntensity: REALISTIC ? 1.2 : 0.9, roughness: 0.8 }),
    amberGlow: new THREE.MeshBasicMaterial({ color: "#ffc46b", toneMapped: false }),
  };
}

export function materials() {
  mats ??= create();
  return mats;
}

/** Colour used for the cartoon outlines around props (stylized style). */
export const OUTLINE_COLOR = "#1a0f08";
