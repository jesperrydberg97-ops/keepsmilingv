"use client";

import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { runtime } from "@/game/runtime";
import { useStudio } from "@/game/store";
import { walkCycle } from "./CameraRig";
import { VISITOR_PALETTE } from "./Avatar";
import { toon } from "./materials";

/**
 * First-person arms viewmodel, parented to the camera like in an FPS.
 * Drawn on top of the world (no depth test) so they never clip into walls
 * or furniture. They sway with the walk cycle and reach out on interaction.
 */
export function FirstPersonArms() {
  const camera = useThree((s) => s.camera);
  const cameraMode = useStudio((s) => s.settings.cameraMode);
  const reduced = useStudio((s) => s.settings.reducedMotion);
  const root = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);

  const mats = useMemo(() => {
    const overlay = (m: THREE.Material, order: number) => {
      m.depthTest = false;
      m.depthWrite = false;
      return { m, order };
    };
    return {
      sleeve: overlay(toon(VISITOR_PALETTE.top), 1000),
      cuff: overlay(toon("#2f5f52"), 1001),
      hand: overlay(toon(VISITOR_PALETTE.skin), 1002),
    };
  }, []);

  useFrame((state) => {
    const g = root.current;
    if (!g) return;
    g.visible = cameraMode === "first" && !runtime.focus;
    if (!g.visible) return;
    const t = state.clock.elapsedTime;
    const motion = reduced ? 0 : 1;
    const ph = walkCycle.phase;
    const amt = walkCycle.amount * motion;
    // Walk sway + idle breathing.
    g.position.set(Math.sin(ph) * 0.012 * amt, Math.abs(Math.cos(ph)) * -0.014 * amt + Math.sin(t * 1.6) * 0.003 * motion, 0);
    // Pull the arms inward on narrow (portrait) screens so they stay in frame.
    const xs = Math.min(1, Math.max(0.45, state.size.width / state.size.height / 1.3));
    const age = performance.now() / 1000 - runtime.lastInteractAt;
    const reach = age < 0.7 ? Math.sin((age / 0.7) * Math.PI) : 0;
    if (right.current) {
      right.current.position.set(0.25 * xs, -0.33 + reach * 0.08, -0.45 - reach * 0.16);
      right.current.rotation.set(-1.28 + reach * 0.3 + Math.sin(ph) * 0.05 * amt, -0.3, 0.16);
    }
    if (left.current) {
      left.current.position.set(-0.25 * xs, -0.34, -0.44);
      left.current.rotation.set(-1.25 - Math.sin(ph) * 0.05 * amt, 0.3, -0.16);
    }
  });

  const Arm = ({ side }: { side: 1 | -1 }) => (
    <group ref={side === 1 ? right : left}>
      {/* forearm runs along local +Y; the group tilts it forward */}
      <mesh position={[0, -0.1, 0]} material={mats.sleeve.m} renderOrder={mats.sleeve.order} frustumCulled={false}>
        <capsuleGeometry args={[0.042, 0.3, 4, 12]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} material={mats.cuff.m} renderOrder={mats.cuff.order} frustumCulled={false}>
        <cylinderGeometry args={[0.046, 0.046, 0.035, 16]} />
      </mesh>
      <group position={[0, 0.115, 0]}>
        <RoundedBox args={[0.072, 0.09, 0.034]} radius={0.016} smoothness={3} material={mats.hand.m} renderOrder={mats.hand.order} frustumCulled={false} />
        {/* thumb */}
        <mesh position={[side * -0.04, -0.012, 0.01]} rotation-z={side * 0.6} material={mats.hand.m} renderOrder={mats.hand.order} frustumCulled={false}>
          <capsuleGeometry args={[0.011, 0.028, 3, 8]} />
        </mesh>
      </group>
    </group>
  );

  return createPortal(
    <group ref={root}>
      <Arm side={1} />
      <Arm side={-1} />
    </group>,
    camera,
  );
}
