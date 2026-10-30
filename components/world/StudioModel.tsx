"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { requestStation, walkTo } from "@/game/actions";
import { inputBlocked, useStudio } from "@/game/store";
import {
  SCREEN_NODES,
  SITE_MATERIALS,
  isClickProxy,
  isWalkableFloor,
  printIndexFromNodeName,
  stationIdFromNodeName,
} from "@/game/studioModel";
import type { Print } from "@/schemas/content";
import { CLICK_SLOP_PX, Hotspot } from "./Hotspot";
import { materials } from "./materials";
import {
  plasterTexture,
  rugTexture,
  screenTexture,
  woodFloorTexture,
} from "./textures";

/**
 * Loads the authored studio (studio.glb, see docs/BLENDER.md) in place of the
 * procedural room and furniture. Gameplay data (colliders, walkable area,
 * station positions) still comes from game/layout.ts, so the model must be
 * built on the generated blockout.
 *
 * - Nodes named `station_<id>` (and their children) become clickable.
 * - `screen_tv`, `screen_showreel`, `screen_laptop` get live screen content.
 * - `print_1` … `print_4` show the gallery photographs.
 * - `floor` is the click-to-walk surface; `hit_*` meshes are invisible click targets.
 * - Materials listed in SITE_MATERIALS get the site's own textures (UVs in metres).
 * - Cameras and lights in the file are dropped: the site lights the scene.
 * - Supports Meshopt, Draco and KTX2-compressed files.
 */

let ktx2: KTX2Loader | null = null;

export function StudioModel({ url, prints }: { url: string; prints: Print[] }) {
  const gl = useThree((s) => s.gl);
  const gltf = useGLTF(url, "/decoders/draco/", true, (loader) => {
    ktx2 ??= new KTX2Loader()
      .setTranscoderPath("/decoders/basis/")
      .detectSupport(gl);
    // drei's loader type comes from three-stdlib; the runtime API is identical.
    (loader as unknown as { setKTX2Loader(l: KTX2Loader): void }).setKTX2Loader(
      ktx2,
    );
  });
  const stations = useStudio((s) => s.stations);
  const setHovered = useStudio((s) => s.setHovered);
  const printTextures = useTexture(prints.slice(0, 4).map((p) => p.image.src));
  const slugs = useMemo(() => prints.map((p) => p.slug), [prints]);

  // glTF UVs have V pointing down, so textures applied here must not be flipped.
  const unflipped = (t: THREE.Texture) => {
    const c = t.clone();
    c.flipY = false;
    c.needsUpdate = true;
    return c;
  };

  const screens = useMemo(
    () => ({
      tv: unflipped(screenTexture("Projects", "KSV · Now showing", 24)),
      showreel: unflipped(screenTexture("Showreel", "KSV Showreel", 36)),
      laptop: unflipped(screenTexture("Start a project", "Booking desk", 28)),
    }),
    [],
  );

  const siteMaterials = useMemo(() => {
    const m = materials();
    const tile = (t: THREE.Texture) => {
      const c = unflipped(t);
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(1, 1);
      return c;
    };
    // Floor UVs: 1 unit = 4 m (one plank-texture tile). Walls: 1 unit = 2 m.
    const floorMap = tile(woodFloorTexture(1024));
    const floor = (m.floor as THREE.MeshStandardMaterial).clone();
    floor.map = floorMap;
    floor.bumpMap = floorMap;
    const plaster = tile(plasterTexture(512));
    const wall = (m.wall as THREE.MeshStandardMaterial).clone();
    wall.map = plaster;
    wall.bumpMap = plaster;
    const rug = new THREE.MeshStandardMaterial({
      map: unflipped(rugTexture(1024)),
      roughness: 1,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: "#cfe0ea",
      transparent: true,
      opacity: 0.12,
      roughness: 0.05,
      depthWrite: false,
    });
    return { floor, wall, rug, glass } satisfies Record<
      (typeof SITE_MATERIALS)[keyof typeof SITE_MATERIALS],
      THREE.Material
    >;
  }, []);

  // One-time scene preparation: drop authoring cameras/lights, shadows, live screens, gallery prints.
  useEffect(() => {
    const drop: THREE.Object3D[] = [];
    gltf.scene.traverse((o) => {
      if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera)
        drop.push(o);
    });
    for (const o of drop) o.removeFromParent();
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (isClickProxy(o.name)) {
        // Invisible, but still hit by the raycaster.
        mesh.material = new THREE.MeshBasicMaterial({ visible: false });
        return;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const matName = (mesh.material as THREE.Material)
        .name as keyof typeof SITE_MATERIALS;
      const site = SITE_MATERIALS[matName];
      if (site) {
        mesh.material = siteMaterials[site];
        if (site === "glass" || site === "rug") mesh.castShadow = false;
      }
      const base = o.name.replace(/\.\d+$/, "");
      const screen = SCREEN_NODES[base as keyof typeof SCREEN_NODES];
      if (screen)
        mesh.material = new THREE.MeshBasicMaterial({
          map: screens[screen],
          toneMapped: false,
        });
      const pi = printIndexFromNodeName(o.name);
      const tex = pi !== null ? printTextures[pi] : undefined;
      if (tex) {
        const t = unflipped(tex);
        t.colorSpace = THREE.SRGBColorSpace;
        mesh.material = new THREE.MeshStandardMaterial({
          map: t,
          roughness: 0.6,
        });
      }
    });
  }, [gltf.scene, screens, printTextures, siteMaterials]);

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
    if (isWalkableFloor(e.object.name)) walkTo({ x: e.point.x, z: e.point.z });
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
      <primitive
        object={gltf.scene}
        onClick={onClick}
        onPointerMove={onOver}
        onPointerOut={onOut}
      />
      {/* Proximity rings for every station (same as the procedural studio). */}
      {stations.map((s) => (
        <Hotspot key={s.id} station={s}>
          {null}
        </Hotspot>
      ))}
    </group>
  );
}
