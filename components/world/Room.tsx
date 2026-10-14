"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { PROPS, STUDIO_LAYOUT } from "@/game/layout";
import { walkTo } from "@/game/actions";
import { inputBlocked, useStudio } from "@/game/store";
import { materials, surface } from "./materials";
import { labelTexture, rugTexture } from "./textures";
import { CLICK_SLOP_PX } from "./Hotspot";
import { Ink, SurfaceMaterial } from "./look";

const { bounds, ceilingHeight: H, wallThickness: T } = STUDIO_LAYOUT;
const W = bounds.maxX - bounds.minX;
const D = bounds.maxZ - bounds.minZ;

/** Floor, walls, beams, windows, entrance — the loft shell. */
export function Room() {
  const m = materials();
  const rug = useMemo(() => rugTexture(1024), []);
  const sign = useMemo(() => labelTexture("Keep Smiling Visuals", { width: 2048, height: 256, font: "italic 400 120px Georgia, serif", color: "#f3ede2" }), []);

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX || inputBlocked(useStudio.getState())) return;
    e.stopPropagation();
    walkTo({ x: e.point.x, z: e.point.z });
  };

  const windowZ0 = PROPS.westWindows.z0;
  const windowZ1 = PROPS.westWindows.z1;
  const panes = 4;
  const paneW = (windowZ1 - windowZ0) / panes;

  return (
    <group>
      {/* Floor (click-to-move target) */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={onFloorClick} name="floor">
        <planeGeometry args={[W, D]} />
        <primitive object={m.floor} attach="material" />
      </mesh>
      {/* Central rug */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0.5]} receiveShadow raycast={() => null}>
        <planeGeometry args={[6, 4]} />
        <SurfaceMaterial map={rug} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, H, 0]} rotation-x={Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[W + T * 2, D + T * 2]} />
        <primitive object={m.ceiling} attach="material" />
      </mesh>

      {/* Walls */}
      <Wall position={[0, H / 2, bounds.minZ - T / 2]} size={[W + T * 2, H, T]} />
      <Wall position={[bounds.maxX + T / 2, H / 2, 0]} size={[T, H, D]} />
      <Wall position={[0, H / 2, bounds.maxZ + T / 2]} size={[W + T * 2, H, T]} />
      {/* West wall split around the windows */}
      <Wall position={[bounds.minX - T / 2, H / 2, (bounds.minZ + windowZ0) / 2]} size={[T, H, windowZ0 - bounds.minZ]} />
      <Wall position={[bounds.minX - T / 2, H / 2, (windowZ1 + bounds.maxZ) / 2]} size={[T, H, bounds.maxZ - windowZ1]} />
      <Wall position={[bounds.minX - T / 2, 0.45, (windowZ0 + windowZ1) / 2]} size={[T, 0.9, windowZ1 - windowZ0]} />
      <Wall position={[bounds.minX - T / 2, (H + 3.6) / 2, (windowZ0 + windowZ1) / 2]} size={[T, H - 3.6, windowZ1 - windowZ0]} />

      {/* Steel-framed windows with daylight behind */}
      <group position={[bounds.minX - T / 2, 2.25, (windowZ0 + windowZ1) / 2]}>
        <mesh position={[-0.4, 0, 0]} rotation-y={Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[windowZ1 - windowZ0, 2.7]} />
          <primitive object={m.daylight} attach="material" />
        </mesh>
        {Array.from({ length: panes + 1 }, (_, i) => (
          <mesh key={`v${i}`} position={[0, 0, -(windowZ1 - windowZ0) / 2 + i * paneW]} raycast={() => null}>
            <boxGeometry args={[0.08, 2.7, 0.06]} />
            <primitive object={m.metal} attach="material" />
          </mesh>
        ))}
        {[-1.35, -0.45, 0.45, 1.35].map((y) => (
          <mesh key={`h${y}`} position={[0, y, 0]} raycast={() => null}>
            <boxGeometry args={[0.08, 0.05, windowZ1 - windowZ0]} />
            <primitive object={m.metal} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Exposed beams */}
      {[-9, -6, -3, 0, 3, 6, 9].map((x) => (
        <mesh key={x} position={[x, H - 0.18, 0]} castShadow raycast={() => null}>
          <boxGeometry args={[0.24, 0.36, D]} />
          <primitive object={m.darkWood} attach="material" />
          <Ink />
        </mesh>
      ))}

      {/* Columns */}
      {PROPS.columns.map((c, i) => (
        <mesh key={i} position={[c.x, H / 2, c.z]} castShadow receiveShadow>
          <boxGeometry args={[0.36, H, 0.36]} />
          <primitive object={m.metal} attach="material" />
          <Ink />
        </mesh>
      ))}

      {/* Entrance door + brand sign */}
      <group position={[PROPS.door.x, 0, bounds.maxZ - 0.02]}>
        <mesh position={[0, PROPS.door.h / 2, 0]} raycast={() => null}>
          <boxGeometry args={[PROPS.door.w + 0.16, PROPS.door.h + 0.08, 0.06]} />
          <primitive object={m.metal} attach="material" />
        </mesh>
        <mesh position={[0, PROPS.door.h / 2, -0.035]} raycast={() => null}>
          <planeGeometry args={[PROPS.door.w - 0.1, PROPS.door.h - 0.1]} />
          <SurfaceMaterial color="#c7b9a0" emissive="#f0d8ae" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, PROPS.door.h + 0.55, -0.04]} rotation-y={Math.PI} raycast={() => null}>
          <planeGeometry args={[3.2, 0.4]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
      </group>

      {/* Skirting for a finished look */}
      <mesh position={[0, 0.06, bounds.minZ + 0.01]} raycast={() => null}>
        <boxGeometry args={[W, 0.12, 0.02]} />
        <primitive object={m.darkWood} attach="material" />
      </mesh>
      <mesh position={[bounds.maxX - 0.01, 0.06, 0]} raycast={() => null}>
        <boxGeometry args={[0.02, 0.12, D]} />
        <primitive object={m.darkWood} attach="material" />
      </mesh>
    </group>
  );
}

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  const m = materials();
  return (
    <mesh position={position} receiveShadow raycast={() => null}>
      <boxGeometry args={size} />
      <primitive object={m.wall} attach="material" />
    </mesh>
  );
}
