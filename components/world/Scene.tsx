"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, useProgress } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { QUALITY_PRESETS, type QualityTier } from "@/game/quality";
import { useStudio } from "@/game/store";
import type { Print, SiteSettings, TimelineItem } from "@/schemas/content";
import { CameraRig } from "./CameraRig";
import { FirstPersonArms } from "./FirstPersonArms";
import { Ambience, PostFx, StationMarkers } from "./GameFx";
import { LookContext } from "./look";
import { REALISTIC } from "./materials";
import { StudioModel } from "./StudioModel";
import { STUDIO_MODEL } from "@/lib/config/art";
import { Guide } from "./Guide";
import { Player } from "./Player";
import { Room } from "./Room";
import { Stations } from "./Stations";
import { setTextureDetail } from "./textures";

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
  // Supersample generated textures (labels, screens, wood grain) except on the low tier.
  setTextureDetail(quality === "low" ? 1 : 2);
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
      // With a post chain, anti-aliasing happens inside it (MSAA + SMAA).
      gl={{ antialias: preset.antialias && !preset.post, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      camera={{ fov: 70, near: 0.05, far: 60, position: [0, 1.6, 8] }}
      style={{ touchAction: "none" }}
      aria-label="Interactive 3D studio. Use the Stations menu for an accessible list of everything in the studio."
      role="img"
      onCreated={({ gl }) => {
        // AgX keeps natural colour in highlights (lamps, window light) for the realistic style.
        gl.toneMapping = REALISTIC ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = REALISTIC ? 1.15 : 1.0;
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
      <Lighting quality={quality} />
      <LookContext.Provider value={{ outlines: preset.outlines }}>
      <Suspense fallback={null}>
        {STUDIO_MODEL.url ? (
          // Authored studio: replaces the procedural shell and furniture.
          <StudioModel url={STUDIO_MODEL.url} prints={prints} />
        ) : (
          <>
            <Room />
            <Stations prints={prints} settings={settings} timeline={timeline} notes={notes} practicalLights={preset.practicalLights} />
          </>
        )}
        {settings.features.welcomeGuide && <Guide name={guideName} />}
        <Player />
        <StationMarkers />
        <Ambience high={preset.particles} />
        <ReadySignal onReady={onReady} />
      </Suspense>
      </LookContext.Provider>
      <CameraRig />
      <FirstPersonArms />
      <PostFx preset={preset} />
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
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      {/* Warm fill from the interior */}
      <pointLight position={[0, 3.8, 2]} intensity={6} distance={14} decay={1.6} color="#ffc98a" />
      {REALISTIC && (
        // Soft image-based light + reflections from a tiny local "room", no HDRI download.
        <Environment resolution={quality === "low" ? 64 : 256} frames={1} environmentIntensity={0.55}>
          <Lightformer form="rect" intensity={3} color="#ffe6c4" position={[-10, 2.2, 5]} rotation-y={Math.PI / 2} scale={[6, 2.6, 1]} />
          <Lightformer form="rect" intensity={0.7} color="#ffcf96" position={[0, 4.4, 0]} rotation-x={Math.PI / 2} scale={[18, 12, 1]} />
          <Lightformer form="circle" intensity={1.5} color="#ffb860" position={[9, 1.6, -7]} scale={1.2} />
          <Lightformer form="circle" intensity={1.5} color="#ffb860" position={[-9, 1.6, -7]} scale={1.2} />
        </Environment>
      )}
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
