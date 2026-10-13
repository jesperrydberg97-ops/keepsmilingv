"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor, useProgress } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { QUALITY_PRESETS, type QualityTier } from "@/game/quality";
import { useStudio } from "@/game/store";
import type { Print, SiteSettings, TimelineItem } from "@/schemas/content";
import { CameraRig } from "./CameraRig";
import { Guide } from "./Guide";
import { Player } from "./Player";
import { Room } from "./Room";
import { Stations } from "./Stations";

export interface SceneProps {
  quality: QualityTier;
  prints: Print[];
  settings: SiteSettings;
  timeline: TimelineItem[];
  notes: string[];
  guideName: string;
  onReady: () => void;
}

export default function Scene({ quality, prints, settings, timeline, notes, guideName, onReady }: SceneProps) {
  const preset = QUALITY_PRESETS[quality];
  const [dpr, setDpr] = useState(preset.dpr[1]);
  const panelOpen = useStudio((s) => s.panel !== null);
  const setContextLost = useStudio((s) => s.setContextLost);

  useEffect(() => setDpr(preset.dpr[1]), [preset]);

  return (
    <Canvas
      key={quality}
      // Pause continuous rendering while a full overlay covers the scene.
      frameloop={panelOpen ? "demand" : "always"}
      shadows={preset.shadows ? "soft" : false}
      dpr={dpr}
      gl={{ antialias: preset.antialias, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      camera={{ fov: 50, near: 0.1, far: 60, position: [0, 3, 12] }}
      style={{ touchAction: "none" }}
      aria-label="Interactive 3D studio. Use the Stations menu for an accessible list of everything in the studio."
      role="img"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        const c = gl.domElement;
        c.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          setContextLost(true);
        });
        c.addEventListener("webglcontextrestored", () => setContextLost(false));
      }}
    >
      <color attach="background" args={["#0f0d0b"]} />
      <fog attach="fog" args={["#16120d", 18, 40]} />
      <PerformanceMonitor
        bounds={() => [40, 58]}
        onDecline={() => setDpr((d) => Math.max(preset.dpr[0], d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(preset.dpr[1], d + 0.25))}
        flipflops={4}
      />
      <AdaptiveDpr pixelated={false} />
      <Lighting quality={quality} />
      <Suspense fallback={null}>
        <Room />
        <Stations prints={prints} settings={settings} timeline={timeline} notes={notes} practicalLights={preset.practicalLights} />
        {settings.features.welcomeGuide && <Guide name={guideName} />}
        <Player />
        <ReadySignal onReady={onReady} />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}

function Lighting({ quality }: { quality: QualityTier }) {
  const preset = QUALITY_PRESETS[quality];
  return (
    <>
      <hemisphereLight args={["#ffe9cc", "#3a2a1c", 0.8]} />
      <ambientLight intensity={0.12} color="#ffd8a8" />
      {/* Late-afternoon daylight through the west windows */}
      <directionalLight
        position={[-16, 9, 5]}
        intensity={2.2}
        color="#ffe2b8"
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* Warm fill from the interior */}
      <pointLight position={[0, 3.8, 2]} intensity={6} distance={14} decay={1.6} color="#ffc98a" />
      {/* Local reflections without downloading an HDRI */}
      <Environment resolution={quality === "high" ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={2} color="#ffe3bd" position={[-10, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ffb870" position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#f5bd70" position={[8, 2, -6]} scale={2} />
      </Environment>
    </>
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const { active, progress } = useProgress();
  useEffect(() => useStudio.setState({ loadProgress: progress }), [progress]);
  useEffect(() => {
    if (!active) {
      const id = requestAnimationFrame(() => onReady());
      return () => cancelAnimationFrame(id);
    }
  }, [active, onReady]);
  return null;
}
