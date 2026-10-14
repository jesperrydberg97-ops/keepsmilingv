"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { requestStation, walkTo } from "@/game/actions";
import { inputBlocked, useStudio } from "@/game/store";
import { SCREEN_NODES, printIndexFromNodeName, stationIdFromNodeName } from "@/game/studioModel";
import type { Print } from "@/schemas/content";
import { CLICK_SLOP_PX, Hotspot } from "./Hotspot";
import { screenTexture } from "./textures";

/**
 * Loads the authored studio (studio.glb, see docs/BLENDER.md) in place of the
 * procedural room and furniture. Gameplay data (colliders, walkable area,
 * station positions) still comes from game/layout.ts, so the model must be
 * built on the generated blockout.
 *
 * - Nodes named `station_<id>` (and their children) become clickable.
 * - `screen_tv`, `screen_showreel`, `screen_laptop` get live screen content.
 * - `print_1` … `print_4` show the gallery photographs.
 * - Anything named `floor*` is the click-to-walk surface.
 * - Supports Meshopt, Draco and KTX2-compressed files.
 */

let ktx2: KTX2Loader | null = null;

export function StudioModel({ url, prints }: { url: string; prints: Print[] }) {
  const gl = useThree((s) => s.gl);
  const gltf = useGLTF(url, "/decoders/draco/", true, (loader) => {
    ktx2 ??= new KTX2Loader().setTranscoderPath("/decoders/basis/").detectSupport(gl);
    // drei's loader type comes from three-stdlib; the runtime API is identical.
    (loader as unknown as { setKTX2Loader(l: KTX2Loader): void }).setKTX2Loader(ktx2);
  });
  const stations = useStudio((s) => s.stations);
  const setHovered = useStudio((s) => s.setHovered);
  const printTextures = useTexture(prints.slice(0, 4).map((p) => p.image.src));
  const slugs = useMemo(() => prints.map((p) => p.slug), [prints]);

  const screens = useMemo(
    () => ({
      tv: screenTexture("Projects", "KSV · Now showing", 24),
      showreel: screenTexture("Showreel", "KSV Showreel", 36),
      laptop: screenTexture("Start a project", "Booking desk", 28),
    }),
    [],
  );

  // One-time scene preparation: shadows, live screens, gallery prints.
  useEffect(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const base = o.name.replace(/\.\d+$/, "");
      const screen = SCREEN_NODES[base as keyof typeof SCREEN_NODES];
      if (screen) mesh.material = new THREE.MeshBasicMaterial({ map: screens[screen], toneMapped: false });
      const pi = printIndexFromNodeName(o.name);
      const tex = pi !== null ? printTextures[pi] : undefined;
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        mesh.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
      }
    });
  }, [gltf.scene, screens, printTextures]);

  /** Walk up from the hit object to the nearest `station_*` ancestor. */
  const stationFor = (obj: THREE.Object3D | null) => {
    for (let o = obj; o; o = o.parent) {
      const id = stationIdFromNodeName(o.name, slugs);
      if (id) return stations.find((s) => s.id === id);
    }
    return undefined;
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP_PX || inputBlocked(useStudio.getState())) return;
    const station = stationFor(e.object);
    if (station) return requestStation(station);
    if (/^floor/i.test(e.object.name)) walkTo({ x: e.point.x, z: e.point.z });
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    const station = stationFor(e.object);
    setHovered(station?.id ?? null);
    document.body.style.cursor = station ? "pointer" : "";
  };
  const onOut = () => {
    setHovered(null);
    document.body.style.cursor = "";
  };

  return (
    <group>
      <primitive object={gltf.scene} onClick={onClick} onPointerMove={onOver} onPointerOut={onOut} />
      {/* Proximity rings for every station (same as the procedural studio). */}
      {stations.map((s) => (
        <Hotspot key={s.id} station={s}>
          {null}
        </Hotspot>
      ))}
    </group>
  );
}
