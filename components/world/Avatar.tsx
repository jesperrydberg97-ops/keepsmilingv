"use client";

import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AvatarConfig } from "@/lib/config/avatars";

/**
 * Visual avatar only. It reads a motion sample each frame and never moves
 * itself — the controller owns position/heading. Swap a GLB in via config
 * without touching movement, camera or interaction code.
 */

export interface MotionSample {
  /** Horizontal speed in m/s. */
  speed: number;
  /** Seconds since the last interaction started (for a small gesture). */
  interactAge: number;
}

export interface AvatarPalette {
  skin: string;
  top: string;
  bottom: string;
  shoes: string;
  accent: string;
}

export const FOUNDER_PALETTE: AvatarPalette = { skin: "#c99a78", top: "#b5773d", bottom: "#2e2a26", shoes: "#151311", accent: "#f5bd70" };
export const GUIDE_PALETTE: AvatarPalette = { skin: "#a87858", top: "#5f7a63", bottom: "#3a3530", shoes: "#1a1715", accent: "#e8dcc2" };

export function Avatar({
  config,
  palette,
  sample,
  variant,
}: {
  config: AvatarConfig;
  palette: AvatarPalette;
  sample: () => MotionSample;
  variant: "founder" | "guide";
}) {
  const placeholder = <PlaceholderAvatar palette={palette} sample={sample} variant={variant} />;
  if (!config.url) return placeholder;
  return (
    <AvatarErrorBoundary fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <GltfAvatar config={config} sample={sample} />
      </Suspense>
    </AvatarErrorBoundary>
  );
}

class AvatarErrorBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[avatar] failed to load model, using placeholder", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function GltfAvatar({ config, sample }: { config: AvatarConfig; sample: () => MotionSample }) {
  const gltf = useGLTF(config.url!);
  const scene = useMemo(() => {
    const s = cloneSkinned(gltf.scene);
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.frustumCulled = false; // skinned bounds are often wrong in exported files
      }
    });
    return s;
  }, [gltf.scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(gltf.animations, group);
  const current = useRef<string | null>(null);

  useEffect(() => {
    const missing = Object.values(config.clips).filter((c) => c && !actions[c]);
    if (missing.length) console.warn(`[avatar] ${config.url} is missing clips: ${missing.join(", ")}`);
  }, [actions, config]);

  useFrame(() => {
    const { speed, interactAge } = sample();
    const c = config.clips;
    let name = speed < 0.15 ? c.idle : speed < (config.walkClipSpeed + config.runClipSpeed) / 2 ? c.walk : c.run;
    if (c.interact && interactAge < 1.2 && speed < 0.15) name = c.interact;
    const action = actions[name];
    if (!action) return;
    if (current.current !== name) {
      const prev = current.current ? actions[current.current] : null;
      action.reset().fadeIn(0.2).play();
      prev?.fadeOut(0.2);
      current.current = name;
    }
    if (name === c.walk) action.timeScale = THREE.MathUtils.clamp(speed / config.walkClipSpeed, 0.6, 1.6);
    else if (name === c.run) action.timeScale = THREE.MathUtils.clamp(speed / config.runClipSpeed, 0.7, 1.4);
    else action.timeScale = 1;
  });

  return (
    <group ref={group} scale={config.scale} rotation-y={config.rotationY}>
      <primitive object={scene} />
    </group>
  );
}

/**
 * Procedural placeholder mannequin with a simple walk cycle. Proportions match
 * the asset spec (1.75 m tall, feet at origin, facing +Z) so swapping in the
 * final GLB doesn't change framing.
 */
function PlaceholderAvatar({ palette, sample, variant }: { palette: AvatarPalette; sample: () => MotionSample; variant: "founder" | "guide" }) {
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.6 }),
      top: new THREE.MeshStandardMaterial({ color: palette.top, roughness: 0.75 }),
      bottom: new THREE.MeshStandardMaterial({ color: palette.bottom, roughness: 0.8 }),
      shoes: new THREE.MeshStandardMaterial({ color: palette.shoes, roughness: 0.5 }),
      accent: new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.5 }),
    }),
    [palette],
  );
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const swing = useRef(0);

  useFrame((state, dt) => {
    const { speed, interactAge } = sample();
    const moving = Math.min(1, speed / 3);
    phase.current += dt * (4 + speed * 2.2) * (speed > 0.05 ? 1 : 0);
    swing.current += (moving - swing.current) * Math.min(1, dt * 10);
    const s = Math.sin(phase.current) * 0.7 * swing.current;
    if (legL.current) legL.current.rotation.x = s;
    if (legR.current) legR.current.rotation.x = -s;
    if (armL.current) armL.current.rotation.x = -s * 0.8;
    if (armR.current) {
      // small reach gesture right after an interaction
      const reach = interactAge < 0.9 ? Math.sin((interactAge / 0.9) * Math.PI) * 1.2 : 0;
      armR.current.rotation.x = s * 0.8 - reach;
    }
    if (body.current) {
      const breathe = Math.sin(state.clock.elapsedTime * 1.8) * 0.006 * (1 - swing.current);
      body.current.position.y = Math.abs(Math.cos(phase.current)) * 0.04 * swing.current + breathe;
      body.current.rotation.x = 0.06 * swing.current;
    }
  });

  return (
    <group ref={body}>
      {/* legs pivot at hips (y = 0.92) */}
      {[
        [legL, -0.11],
        [legR, 0.11],
      ].map(([ref, x]) => (
        <group key={String(x)} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.92, 0]}>
          <mesh position={[0, -0.43, 0]} castShadow material={mats.bottom}>
            <capsuleGeometry args={[0.075, 0.72, 4, 10]} />
          </mesh>
          <mesh position={[0, -0.88, 0.05]} castShadow material={mats.shoes}>
            <boxGeometry args={[0.11, 0.08, 0.26]} />
          </mesh>
        </group>
      ))}
      {/* torso */}
      <mesh position={[0, 1.22, 0]} castShadow material={mats.top}>
        <capsuleGeometry args={[0.2, 0.42, 4, 12]} />
      </mesh>
      {/* arms pivot at shoulders */}
      {[
        [armL, -0.27],
        [armR, 0.27],
      ].map(([ref, x]) => (
        <group key={String(x)} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 1.45, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow material={mats.top}>
            <capsuleGeometry args={[0.06, 0.48, 4, 8]} />
          </mesh>
          <mesh position={[0, -0.6, 0]} castShadow material={mats.skin}>
            <sphereGeometry args={[0.055, 10, 8]} />
          </mesh>
        </group>
      ))}
      {/* neck + head */}
      <mesh position={[0, 1.55, 0]} material={mats.skin}>
        <cylinderGeometry args={[0.055, 0.06, 0.08, 10]} />
      </mesh>
      <mesh position={[0, 1.67, 0]} castShadow material={mats.skin}>
        <sphereGeometry args={[0.115, 20, 16]} />
      </mesh>
      {/* nose hint so facing direction reads clearly */}
      <mesh position={[0, 1.66, 0.11]} material={mats.skin}>
        <sphereGeometry args={[0.022, 8, 6]} />
      </mesh>
      {variant === "founder" ? (
        // beanie in brand amber + a camera strap: reads as "the filmmaker"
        <>
          <mesh position={[0, 1.73, -0.01]} castShadow material={mats.accent}>
            <sphereGeometry args={[0.12, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 1.18, 0.21]} material={mats.shoes}>
            <boxGeometry args={[0.15, 0.1, 0.07]} />
          </mesh>
        </>
      ) : (
        // guide: lanyard badge in a light accent
        <mesh position={[0, 1.18, 0.205]} material={mats.accent}>
          <boxGeometry args={[0.09, 0.12, 0.01]} />
        </mesh>
      )}
    </group>
  );
}
