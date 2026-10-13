"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { requestStation } from "@/game/actions";
import { inputBlocked, useStudio } from "@/game/store";
import type { Station } from "@/game/types";

/** Pixel distance a pointer may travel and still count as a click (vs. orbit drag). */
export const CLICK_SLOP_PX = 6;

/**
 * Wraps a station prop: pointer affordances, click/tap to walk + interact,
 * and a restrained highlight (soft floor ring) when the avatar is in reach.
 */
export function Hotspot({ station, children }: { station: Station | undefined; children: React.ReactNode }) {
  const ring = useRef<THREE.Mesh>(null);
  const near = useStudio((s) => station && (s.nearestStationId === station.id || s.hoveredStationId === station.id));
  const setHovered = useStudio((s) => s.setHovered);

  useFrame((_, dt) => {
    const m = ring.current;
    if (!m) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    const target = near ? 0.55 : 0;
    mat.opacity += (target - mat.opacity) * Math.min(1, dt * 8);
    m.visible = mat.opacity > 0.01;
  });

  if (!station) return <>{children}</>;

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(station.id);
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    setHovered(null);
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP_PX || inputBlocked(useStudio.getState())) return;
    requestStation(station);
  };

  return (
    <group>
      <group onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        {children}
      </group>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[station.position.x, 0.012, station.position.z]} visible={false} raycast={() => null}>
        <ringGeometry args={[Math.min(station.radius * 0.55, 1.1), Math.min(station.radius * 0.55, 1.1) + 0.05, 64]} />
        <meshBasicMaterial color="#f5bd70" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
