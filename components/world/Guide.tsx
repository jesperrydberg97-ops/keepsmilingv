"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { PROPS } from "@/game/layout";
import { wrapAngle } from "@/game/movement";
import { runtime } from "@/game/runtime";
import { useStudio } from "@/game/store";
import { GUIDE_AVATAR } from "@/lib/config/avatars";
import { Avatar, GUIDE_PALETTE, type MotionSample } from "./Avatar";
import { Hotspot } from "./Hotspot";
import { labelTexture } from "./textures";

/**
 * Welcome NPC — a separate character from the playable founder. It has its
 * own (scripted) dialogue controller in the HUD; in-world it idles, turns to
 * face the visitor when nearby and shows a small speech marker.
 */
export function Guide({ name }: { name: string }) {
  const station = useStudio((s) => s.stations.find((x) => x.id === "npc-guide"));
  const root = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);
  const sample = useRef<MotionSample>({ speed: 0, interactAge: 10 });
  const reduced = useStudio((s) => s.settings.reducedMotion);
  const tag = useMemo(() => labelTexture(name, { width: 512, height: 128, font: "500 52px ui-sans-serif, system-ui", color: "#f3ede2", bg: "rgba(15,13,11,0.75)" }), [name]);
  const baseHeading = 0.6;

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const p = runtime.player.position;
    const dx = p.x - PROPS.npc.x;
    const dz = p.z - PROPS.npc.z;
    const near = Math.hypot(dx, dz) < 5;
    const want = near ? Math.atan2(dx, dz) : baseHeading;
    g.rotation.y += wrapAngle(want - g.rotation.y) * Math.min(1, dt * 3);
    if (marker.current) {
      marker.current.position.y = 2.05 + (reduced ? 0 : Math.sin(clock.elapsedTime * 2) * 0.04);
      marker.current.rotation.y += reduced ? 0 : dt;
    }
  });

  return (
    <Hotspot station={station}>
      <group position={[PROPS.npc.x, 0, PROPS.npc.z]}>
        <group ref={root} rotation-y={baseHeading}>
          <Avatar config={GUIDE_AVATAR} palette={GUIDE_PALETTE} sample={() => sample.current} variant="guide" />
        </group>
        <mesh ref={marker} position={[0, 2.05, 0]}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshBasicMaterial color="#9db497" toneMapped={false} />
        </mesh>
        <sprite position={[0, 2.28, 0]} scale={[0.8, 0.2, 1]}>
          <spriteMaterial map={tag} transparent depthWrite={false} toneMapped={false} />
        </sprite>
        {/* hit target bigger than the thin mannequin */}
        <mesh position={[0, 0.9, 0]} visible={false}>
          <cylinderGeometry args={[0.45, 0.45, 1.9, 8]} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} raycast={() => null}>
          <circleGeometry args={[0.36, 24]} />
          <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
    </Hotspot>
  );
}
