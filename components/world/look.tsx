"use client";

import { Outlines } from "@react-three/drei";
import { createContext, useContext } from "react";
import type * as THREE from "three";
import { OUTLINE_COLOR, REALISTIC, toonRamp } from "./materials";

/**
 * Look settings shared by every prop. Ink outlines belong to the stylized art
 * direction and double the draw calls of outlined meshes, so they are off in
 * the realistic style and on the low quality tier.
 */
export const LookContext = createContext({ outlines: true });

/** Cartoon ink outline; place as a child of a mesh. */
export function Ink({ thickness = 0.022 }: { thickness?: number }) {
  const { outlines } = useContext(LookContext);
  if (!outlines || REALISTIC) return null;
  return <Outlines thickness={thickness} color={OUTLINE_COLOR} />;
}

type SurfaceProps = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
};

/** JSX material in the current art style (PBR or toon). */
export function SurfaceMaterial({ roughness = 0.7, metalness = 0, ...rest }: SurfaceProps) {
  if (REALISTIC) return <meshStandardMaterial roughness={roughness} metalness={metalness} {...rest} />;
  return <meshToonMaterial gradientMap={toonRamp()} {...rest} />;
}
