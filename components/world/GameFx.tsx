"use client";

import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import type { QualityPreset } from "@/game/quality";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { PROPS } from "@/game/layout";
import { useStudio } from "@/game/store";
import type { Station } from "@/game/types";

/**
 * Game-feel layer: floating station markers, drifting light motes and a
 * bloom/vignette pass. Markers render on every tier; particles and post
 * effects only on the high tier.
 */

/** Height of a station's marker: above the prop, below the ceiling. */
function markerHeight(s: Station) {
  return Math.min(3.6, Math.max(1.9, s.height + 0.95));
}

function Marker({ station }: { station: Station }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const near = useStudio((s) => s.nearestStationId === station.id || s.hoveredStationId === station.id);
  const reduced = useStudio((s) => s.settings.reducedMotion);
  const y = markerHeight(station);
  const offset = useMemo(() => (station.position.x * 1.7 + station.position.z) % (Math.PI * 2), [station]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime + offset;
    g.position.y = y + (reduced ? 0 : Math.sin(t * 2) * 0.08);
    if (!reduced) g.rotation.y += dt * (near ? 3 : 1.2);
    const target = near ? 1.35 : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, Math.min(1, dt * 8)));
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial;
      m.opacity = near ? 0.55 + Math.sin(t * 6) * 0.15 : 0.25;
    }
  });

  return (
    <group ref={group} position={[station.position.x, y, station.position.z]}>
      {/* downward chevron, like a quest marker */}
      <mesh rotation-x={Math.PI} raycast={() => null}>
        <coneGeometry args={[0.12, 0.26, 4]} />
        <meshBasicMaterial color={near ? "#ffd27a" : "#f2a93b"} toneMapped={false} />
      </mesh>
      <mesh ref={halo} rotation-x={Math.PI / 2} position={[0, 0.02, 0]} raycast={() => null}>
        <ringGeometry args={[0.17, 0.21, 32]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.25} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function StationMarkers() {
  const stations = useStudio((s) => s.stations);
  const shown = useMemo(() => stations.filter((s) => s.listed), [stations]);
  return (
    <group>
      {shown.map((s) => (
        <Marker key={s.id} station={s} />
      ))}
    </group>
  );
}

export function Ambience({ high }: { high: boolean }) {
  const reduced = useStudio((s) => s.settings.reducedMotion);
  if (!high) return null;
  const midZ = (PROPS.westWindows.z0 + PROPS.westWindows.z1) / 2;
  return (
    <>
      {/* dust drifting through the window light */}
      <Sparkles count={70} scale={[5, 3.2, 6.5]} position={[-9.3, 2, midZ]} size={3} speed={reduced ? 0 : 0.25} opacity={0.7} color="#ffe2a8" noise={0.6} />
      {/* faint motes across the room */}
      <Sparkles count={60} scale={[22, 3.5, 16]} position={[0, 2, 0]} size={1.6} speed={reduced ? 0 : 0.15} opacity={0.35} color="#ffd9a0" />
    </>
  );
}

/**
 * Post chain for the high/ultra tiers: MSAA inside the composer plus SMAA for
 * clean edges (outlines included), optional ambient occlusion for soft contact
 * shading, a gentle bloom on lamps/markers and a light vignette.
 */
export function PostFx({ preset }: { preset: QualityPreset }) {
  if (!preset.post) return null;
  // Effects are passed as a flat list (the composer doesn't accept empty slots).
  const bloom = <Bloom key="bloom" mipmapBlur intensity={0.45} luminanceThreshold={0.9} luminanceSmoothing={0.15} />;
  const smaa = <SMAA key="smaa" />;
  const vignette = <Vignette key="vignette" eskil={false} offset={0.25} darkness={0.5} />;
  if (preset.ao)
    return (
      <EffectComposer multisampling={preset.msaa} enableNormalPass={false}>
        <N8AO aoRadius={0.6} distanceFalloff={0.8} intensity={2.2} quality="high" halfRes={false} color="#2a1608" />
        {bloom}
        {smaa}
        {vignette}
      </EffectComposer>
    );
  return (
    <EffectComposer multisampling={preset.msaa} enableNormalPass={false}>
      {bloom}
      {smaa}
      {vignette}
    </EffectComposer>
  );
}
