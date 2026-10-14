"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { PROPS } from "@/game/layout";
import { wrapAngle } from "@/game/movement";
import { runtime } from "@/game/runtime";
import { useStudio } from "@/game/store";
import { HOST_AVATAR } from "@/lib/config/avatars";
import { Avatar, FOUNDER_PALETTE, type MotionSample } from "./Avatar";
import { Hotspot } from "./Hotspot";
import { labelTexture } from "./textures";

/**
 * The founder, standing at the rug to greet visitors. Separate from the
 * visitor's own (first-person) body. In-world it idles, turns to face the
 * visitor, waves while greeting, and shows a floating name tag. The dialogue
 * itself is scripted copy from content/npc.json (GuideDialogue in the HUD).
 */
export function Guide({ name }: { name: string }) {
  const station = useStudio((s) => s.stations.find((x) => x.id === "npc-guide"));
  const root = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);
  const sample = useRef<MotionSample>({ speed: 0, interactAge: 10, wave: 0 });
  const reduced = useStudio((s) => s.settings.reducedMotion);
  const tag = useMemo(
    () => labelTexture(name, { width: 512, height: 128, font: "600 54px ui-sans-serif, system-ui", color: "#fff6e6", bg: "rgba(20,12,6,0.78)" }),
    [name],
  );
  // Faces the entrance until someone comes close.
  const baseHeading = 0;

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const p = runtime.player.position;
    const dx = p.x - PROPS.npc.x;
    const dz = p.z - PROPS.npc.z;
    const dist = Math.hypot(dx, dz);
    const near = dist < 6;
    const want = near ? Math.atan2(dx, dz) : baseHeading;
    g.rotation.y += wrapAngle(want - g.rotation.y) * Math.min(1, dt * 3);
    const greeting = useStudio.getState().guide.open;
    sample.current.wave = !reduced && (greeting || dist < 2.4) ? 1 : 0;
    sample.current.talk = greeting;
    if (marker.current) {
      marker.current.position.y = 2.15 + (reduced ? 0 : Math.sin(clock.elapsedTime * 2) * 0.05);
      marker.current.rotation.y += reduced ? 0 : dt * 1.5;
    }
  });

  return (
    <Hotspot station={station}>
      <group position={[PROPS.npc.x, 0, PROPS.npc.z]}>
        <group ref={root} rotation-y={baseHeading}>
          <Avatar config={HOST_AVATAR} palette={FOUNDER_PALETTE} sample={() => sample.current} variant="founder" />
        </group>
        <mesh ref={marker} position={[0, 2.15, 0]}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshBasicMaterial color="#ffc65c" toneMapped={false} />
        </mesh>
        <sprite position={[0, 2.42, 0]} scale={[0.9, 0.225, 1]}>
          <spriteMaterial map={tag} transparent depthWrite={false} toneMapped={false} />
        </sprite>
        {/* hit target bigger than the character */}
        <mesh position={[0, 0.95, 0]} visible={false}>
          <cylinderGeometry args={[0.5, 0.5, 2, 8]} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} raycast={() => null}>
          <circleGeometry args={[0.42, 24]} />
          <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>
    </Hotspot>
  );
}
