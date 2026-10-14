"use client";

import { Outlines } from "@react-three/drei";
import { createContext, useContext } from "react";
import { OUTLINE_COLOR } from "./materials";

/**
 * Stylised look settings shared by every prop. Outlines double the draw calls
 * of outlined meshes, so they are switched off on the low quality tier.
 */
export const LookContext = createContext({ outlines: true });

/** Cartoon ink outline; place as a child of a mesh. */
export function Ink({ thickness = 0.022 }: { thickness?: number }) {
  const { outlines } = useContext(LookContext);
  if (!outlines) return null;
  return <Outlines thickness={thickness} color={OUTLINE_COLOR} />;
}
