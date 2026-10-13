import * as THREE from "three";
import { plasterTexture, woodFloorTexture } from "./textures";

/**
 * Shared PBR materials. Created lazily on the client and reused across meshes
 * to keep draw-call state changes and GPU memory low.
 */
let mats: ReturnType<typeof create> | null = null;

function create() {
  const plaster = plasterTexture(512);
  const wallMap = plaster.clone();
  wallMap.repeat.set(4, 1);
  wallMap.needsUpdate = true;
  const floorMap = woodFloorTexture(1024);
  floorMap.repeat.set(6, 4.5);
  return {
    floor: new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.62, metalness: 0.02 }),
    wall: new THREE.MeshStandardMaterial({ map: wallMap, color: "#d9ccb8", roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: "#2a241d", roughness: 1 }),
    darkWood: new THREE.MeshStandardMaterial({ color: "#3b2617", roughness: 0.55 }),
    warmWood: new THREE.MeshStandardMaterial({ color: "#8a5a35", roughness: 0.5 }),
    oak: new THREE.MeshStandardMaterial({ color: "#b07f4f", roughness: 0.55 }),
    metal: new THREE.MeshStandardMaterial({ color: "#26231f", roughness: 0.42, metalness: 0.85 }),
    brass: new THREE.MeshStandardMaterial({ color: "#b48a4a", roughness: 0.3, metalness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: "#6e3f25", roughness: 0.48 }),
    fabric: new THREE.MeshStandardMaterial({ color: "#56604f", roughness: 0.95 }),
    fabricWarm: new THREE.MeshStandardMaterial({ color: "#a2795a", roughness: 0.95 }),
    cork: new THREE.MeshStandardMaterial({ color: "#a47a4c", roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: "#efe6d4", roughness: 0.9 }),
    black: new THREE.MeshStandardMaterial({ color: "#0d0c0b", roughness: 0.35, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: "#1b1d1f", roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.55 }),
    daylight: new THREE.MeshBasicMaterial({ color: "#fff3dc", toneMapped: false }),
    leaf: new THREE.MeshStandardMaterial({ color: "#4a6b3f", roughness: 0.7 }),
    leafDark: new THREE.MeshStandardMaterial({ color: "#35522f", roughness: 0.7 }),
    terracotta: new THREE.MeshStandardMaterial({ color: "#9b5a3c", roughness: 0.85 }),
    lampShade: new THREE.MeshStandardMaterial({ color: "#f6dcae", emissive: "#f0b462", emissiveIntensity: 1.4, roughness: 0.8 }),
    amberGlow: new THREE.MeshBasicMaterial({ color: "#f5bd70", toneMapped: false }),
  };
}

export function materials() {
  mats ??= create();
  return mats;
}
