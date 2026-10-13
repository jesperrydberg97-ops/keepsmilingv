"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { CAMERA_LIMITS, clampOrbit, computeCameraPosition, damp } from "@/game/camera";
import { STUDIO_LAYOUT } from "@/game/layout";
import { runtime } from "@/game/runtime";
import { inputBlocked, useStudio } from "@/game/store";
import { wrapAngle } from "@/game/movement";

const OCCLUDERS = STUDIO_LAYOUT.colliders.filter((c) => c.occludesCamera);
const ORBIT_START_PX = 4;

/**
 * Third-person follow camera. Drag (mouse or one finger) orbits, wheel or
 * pinch zooms, ←/→ rotate for keyboard users. Obstruction handling keeps the
 * camera inside the room; station focus gently reframes before overlays.
 */
export function CameraRig() {
  const { camera, gl } = useThree();
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const pitchActual = useRef<number>(CAMERA_LIMITS.defaultPitch);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let downAt: { x: number; y: number } | null = null;
    let pinchDist = 0;

    const sens = () => useStudio.getState().settings.sensitivity;
    const blocked = () => inputBlocked(useStudio.getState());

    const onDown = (e: PointerEvent) => {
      if (blocked()) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        downAt = { x: e.clientX, y: e.clientY };
        dragging = false;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        dragging = true; // two fingers never count as a tap
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev || blocked()) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinchDist > 0) runtime.orbit.distance *= pinchDist / d;
        pinchDist = d;
        runtime.orbit = clampOrbit(runtime.orbit);
        return;
      }
      if (!dragging && downAt && Math.hypot(cur.x - downAt.x, cur.y - downAt.y) > ORBIT_START_PX) dragging = true;
      if (!dragging) return;
      const k = 0.005 * sens();
      runtime.orbit.yaw = wrapAngle(runtime.orbit.yaw - (cur.x - prev.x) * k);
      runtime.orbit.pitch += (cur.y - prev.y) * k * 0.8;
      runtime.orbit = clampOrbit(runtime.orbit);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) downAt = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (blocked()) return;
      e.preventDefault();
      runtime.orbit.distance *= Math.exp(e.deltaY * 0.0012);
      runtime.orbit = clampOrbit(runtime.orbit);
    };
    const onContext = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContext);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const st = useStudio.getState();
    const reduced = st.settings.reducedMotion;

    // Keyboard orbit (accessible without a pointer).
    if (!inputBlocked(st)) {
      const keys = runtime.input.keys;
      const rot = (keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0);
      if (rot) runtime.orbit.yaw = wrapAngle(runtime.orbit.yaw + rot * dt * 1.8 * st.settings.sensitivity);
    }

    const p = runtime.player.position;
    const target: [number, number, number] = [p.x, CAMERA_LIMITS.targetHeight, p.z];
    let desiredPos: THREE.Vector3;
    let desiredLook: THREE.Vector3;

    if (runtime.focus) {
      desiredPos = new THREE.Vector3(...runtime.focus.camera);
      desiredLook = new THREE.Vector3(...runtime.focus.target);
    } else {
      const r = computeCameraPosition(target, runtime.orbit, STUDIO_LAYOUT, OCCLUDERS);
      pitchActual.current = r.pitch;
      desiredPos = new THREE.Vector3(...r.position);
      desiredLook = new THREE.Vector3(...target);
    }

    if (runtime.snapCamera) {
      pos.current.copy(desiredPos);
      look.current.copy(desiredLook);
      runtime.snapCamera = false;
    } else {
      // Gentle damping; reduced-motion uses a tighter follow (less floaty drift).
      const lambda = runtime.focus ? 5 : reduced ? 18 : 10;
      pos.current.set(
        damp(pos.current.x, desiredPos.x, lambda, dt),
        damp(pos.current.y, desiredPos.y, lambda, dt),
        damp(pos.current.z, desiredPos.z, lambda, dt),
      );
      look.current.set(
        damp(look.current.x, desiredLook.x, lambda * 1.4, dt),
        damp(look.current.y, desiredLook.y, lambda * 1.4, dt),
        damp(look.current.z, desiredLook.z, lambda * 1.4, dt),
      );
      // Never let damping drag the camera through a wall.
      const b = STUDIO_LAYOUT.bounds;
      pos.current.x = THREE.MathUtils.clamp(pos.current.x, b.minX + 0.15, b.maxX - 0.15);
      pos.current.z = THREE.MathUtils.clamp(pos.current.z, b.minZ + 0.15, b.maxZ - 0.15);
      pos.current.y = THREE.MathUtils.clamp(pos.current.y, 0.4, STUDIO_LAYOUT.ceilingHeight - 0.2);
    }
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });

  return null;
}
