"use client";

import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AvatarConfig } from "@/lib/config/avatars";
import { toon } from "./materials";
import { Ink } from "./look";

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
  /** 0..1 — raise a hand and wave (the host greeting a visitor). */
  wave?: number;
  /** True while the host's greeting dialogue is open. */
  talk?: boolean;
}

export interface AvatarPalette {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  accent: string;
}

/** Placeholder for the founder until their own model arrives. */
export const FOUNDER_PALETTE: AvatarPalette = { skin: "#e6b08a", hair: "#4a2e1c", top: "#e0873a", bottom: "#2f3a52", shoes: "#f3ede2", accent: "#ffc65c" };
/** The visitor's own body (third-person camera only). */
export const VISITOR_PALETTE: AvatarPalette = { skin: "#d9a07c", hair: "#2b2320", top: "#4f8a78", bottom: "#3a3530", shoes: "#1a1715", accent: "#e8dcc2" };

export function Avatar({
  config,
  palette,
  sample,
  variant,
}: {
  config: AvatarConfig;
  palette: AvatarPalette;
  sample: () => MotionSample;
  variant: "founder" | "visitor";
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
    if (!actions[config.clips.idle]) console.warn(`[avatar] ${config.url} has no "${config.clips.idle}" clip (required)`);
    const optional = Object.values(config.clips).filter((c) => c && !actions[c]);
    if (optional.length) console.info(`[avatar] ${config.url} has no clips named: ${optional.join(", ")} (those states fall back)`);
  }, [actions, config]);

  useFrame(() => {
    const { speed, interactAge, wave = 0, talk = false } = sample();
    const c = config.clips;
    const has = (n?: string): n is string => !!n && !!actions[n];
    let name = speed < 0.15 ? c.idle : speed < (config.walkClipSpeed + config.runClipSpeed) / 2 ? c.walk : c.run;
    if (speed < 0.15) {
      if (has(c.interact) && interactAge < 1.2) name = c.interact;
      else if (talk && has(c.talk)) name = c.talk;
      else if (wave > 0.5 && has(c.wave)) name = c.wave;
    }
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
 * Procedural placeholder character in the studio's cartoon style, with a
 * simple walk cycle and a wave. Proportions match the asset spec (≈1.75 m
 * tall, feet at origin, facing +Z) so swapping in the final GLB doesn't
 * change framing or collisions.
 */
function PlaceholderAvatar({ palette, sample, variant }: { palette: AvatarPalette; sample: () => MotionSample; variant: "founder" | "visitor" }) {
  const mats = useMemo(
    () => ({
      skin: toon(palette.skin),
      hair: toon(palette.hair),
      top: toon(palette.top),
      bottom: toon(palette.bottom),
      shoes: toon(palette.shoes),
      accent: toon(palette.accent),
      eye: new THREE.MeshBasicMaterial({ color: "#1a120c" }),
      cam: toon("#26242c"),
    }),
    [palette],
  );
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const swing = useRef(0);
  const waveAmt = useRef(0);

  useFrame((state, dt) => {
    const { speed, interactAge, wave = 0 } = sample();
    const t = state.clock.elapsedTime;
    const moving = Math.min(1, speed / 3);
    phase.current += dt * (4 + speed * 2.2) * (speed > 0.05 ? 1 : 0);
    swing.current += (moving - swing.current) * Math.min(1, dt * 10);
    waveAmt.current += (wave - waveAmt.current) * Math.min(1, dt * 6);
    const s = Math.sin(phase.current) * 0.7 * swing.current;
    if (legL.current) legL.current.rotation.x = s;
    if (legR.current) legR.current.rotation.x = -s;
    if (armL.current) {
      armL.current.rotation.x = -s * 0.8;
      armL.current.rotation.z = -0.12;
    }
    if (armR.current) {
      const reach = interactAge < 0.9 ? Math.sin((interactAge / 0.9) * Math.PI) * 1.2 : 0;
      const w = waveAmt.current;
      // Raise the arm sideways and wag the forearm for a friendly wave.
      armR.current.rotation.x = (s * 0.8 - reach) * (1 - w);
      armR.current.rotation.z = 0.12 + w * (2.5 + Math.sin(t * 9) * 0.35);
    }
    if (body.current) {
      const breathe = Math.sin(t * 1.8) * 0.008 * (1 - swing.current);
      body.current.position.y = Math.abs(Math.cos(phase.current)) * 0.045 * swing.current + breathe;
      body.current.rotation.x = 0.06 * swing.current;
    }
    if (head.current) head.current.rotation.z = Math.sin(t * 1.1) * 0.03 + waveAmt.current * 0.08;
  });

  return (
    <group ref={body}>
      {/* legs pivot at hips (y = 0.86) */}
      {[
        [legL, -0.12],
        [legR, 0.12],
      ].map(([ref, x]) => (
        <group key={String(x)} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.86, 0]}>
          <mesh position={[0, -0.4, 0]} castShadow material={mats.bottom}>
            <capsuleGeometry args={[0.09, 0.62, 4, 12]} />
            <Ink />
          </mesh>
          <mesh position={[0, -0.81, 0.05]} castShadow material={mats.shoes}>
            <capsuleGeometry args={[0.07, 0.16, 4, 10]} />
            <Ink />
          </mesh>
        </group>
      ))}
      {/* chunky torso */}
      <mesh position={[0, 1.13, 0]} castShadow material={mats.top}>
        <capsuleGeometry args={[0.24, 0.34, 6, 16]} />
        <Ink />
      </mesh>
      {/* arms pivot at shoulders */}
      {[
        [armL, -0.32],
        [armR, 0.32],
      ].map(([ref, x]) => (
        <group key={String(x)} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 1.36, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow material={mats.top}>
            <capsuleGeometry args={[0.075, 0.38, 4, 10]} />
            <Ink />
          </mesh>
          <mesh position={[0, -0.53, 0]} castShadow material={mats.skin}>
            <sphereGeometry args={[0.075, 14, 10]} />
            <Ink />
          </mesh>
        </group>
      ))}
      {/* oversized head: reads at a distance, very "game character" */}
      <group ref={head} position={[0, 1.62, 0]}>
        <mesh castShadow material={mats.skin}>
          <sphereGeometry args={[0.2, 24, 18]} />
          <Ink />
        </mesh>
        {/* hair cap */}
        <mesh position={[0, 0.05, -0.02]} material={mats.hair}>
          <sphereGeometry args={[0.205, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        </mesh>
        {/* eyes + a smile — Keep Smiling */}
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 0.01, 0.185]} material={mats.eye}>
            <sphereGeometry args={[0.024, 10, 8]} />
          </mesh>
        ))}
        <mesh position={[0, -0.07, 0.17]} rotation={[0.15, 0, Math.PI]} material={mats.eye}>
          <torusGeometry args={[0.05, 0.009, 6, 16, Math.PI]} />
        </mesh>
        {variant === "founder" && (
          // beanie in brand amber: reads as "the filmmaker"
          <mesh position={[0, 0.09, -0.01]} castShadow material={mats.accent}>
            <sphereGeometry args={[0.215, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
            <Ink />
          </mesh>
        )}
      </group>
      {variant === "founder" && (
        // camera on a strap
        <group position={[0, 1.08, 0.25]}>
          <mesh material={mats.cam}>
            <boxGeometry args={[0.2, 0.13, 0.09]} />
            <Ink />
          </mesh>
          <mesh position={[0.03, 0, 0.07]} rotation-x={Math.PI / 2} material={mats.cam}>
            <cylinderGeometry args={[0.045, 0.05, 0.07, 16]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
