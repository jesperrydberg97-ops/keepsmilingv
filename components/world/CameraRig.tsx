"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { CAMERA_LIMITS, FIRST_PERSON, clampOrbit, computeCameraPosition, damp, lookDirection } from "@/game/camera";
import { STUDIO_LAYOUT } from "@/game/layout";
import { runtime } from "@/game/runtime";
import { inputBlocked, useStudio } from "@/game/store";
import { wrapAngle } from "@/game/movement";

const OCCLUDERS = STUDIO_LAYOUT.colliders.filter((c) => c.occludesCamera);
const ORBIT_START_PX = 4;

/** Shared walk phase so the head bob and the first-person arms move together. */
export const walkCycle = { phase: 0, amount: 0 };

/**
 * Camera rig with two modes:
 * - first person (default): eye-height camera, drag / swipe to look,
 *   ←/→ to turn, gentle head bob; the arms viewmodel rides on the camera.
 * - third person: orbit follow camera with wall/ceiling avoidance.
 * Wheel/pinch zooms in third person only. Station focus reframes in both.
 */
export function CameraRig() {
  const { camera, gl, scene } = useThree();
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  // The arms viewmodel is parented to the camera, so the camera must be in the scene graph.
  useEffect(() => {
    scene.add(camera);
    return () => {
      scene.remove(camera);
    };
  }, [scene, camera]);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let downAt: { x: number; y: number } | null = null;
    let pinchDist = 0;

    const st = () => useStudio.getState();
    const firstPerson = () => st().settings.cameraMode === "first";
    const blocked = () => inputBlocked(st());

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
        if (pinchDist > 0 && !firstPerson()) {
          runtime.orbit.distance *= pinchDist / d;
          runtime.orbit = clampOrbit(runtime.orbit);
        }
        pinchDist = d;
        return;
      }
      if (!dragging && downAt && Math.hypot(cur.x - downAt.x, cur.y - downAt.y) > ORBIT_START_PX) dragging = true;
      if (!dragging) return;
      const k = 0.005 * st().settings.sensitivity;
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      runtime.turnTo = null; // the visitor takes over the view
      if (firstPerson()) {
        // Look-style: drag right to look right, drag up to look up.
        runtime.orbit.yaw = wrapAngle(runtime.orbit.yaw - dx * k * 0.8);
        runtime.lookPitch = THREE.MathUtils.clamp(runtime.lookPitch - dy * k * 0.8, FIRST_PERSON.minPitch, FIRST_PERSON.maxPitch);
      } else {
        runtime.orbit.yaw = wrapAngle(runtime.orbit.yaw - dx * k);
        runtime.orbit.pitch += dy * k * 0.8;
        runtime.orbit = clampOrbit(runtime.orbit);
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) downAt = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (blocked()) return;
      e.preventDefault();
      if (firstPerson()) return;
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
    const firstPerson = st.settings.cameraMode === "first";

    // Keyboard turning (accessible without a pointer).
    if (!inputBlocked(st)) {
      const keys = runtime.input.keys;
      const rot = (keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0);
      if (rot) {
        runtime.turnTo = null;
        runtime.orbit.yaw = wrapAngle(runtime.orbit.yaw + rot * dt * 1.8 * st.settings.sensitivity);
      }
    }

    // Eased turn toward something the visitor interacted with.
    if (runtime.turnTo) {
      const k = reduced ? 1 : 1 - Math.exp(-8 * dt);
      runtime.orbit.yaw = wrapAngle(runtime.orbit.yaw + wrapAngle(runtime.turnTo.yaw - runtime.orbit.yaw) * k);
      runtime.lookPitch += (runtime.turnTo.pitch - runtime.lookPitch) * k;
      if (Math.abs(wrapAngle(runtime.turnTo.yaw - runtime.orbit.yaw)) < 0.002) runtime.turnTo = null;
    }

    const p = runtime.player.position;
    const speed = Math.hypot(runtime.player.velocity.x, runtime.player.velocity.z);
    walkCycle.amount += (Math.min(1, speed / 3) - walkCycle.amount) * Math.min(1, dt * 8);
    walkCycle.phase += dt * (5 + speed * 2.4) * (speed > 0.05 ? 1 : 0);

    let desiredPos: THREE.Vector3;
    let desiredLook: THREE.Vector3;

    if (runtime.focus) {
      desiredPos = new THREE.Vector3(...runtime.focus.camera);
      desiredLook = new THREE.Vector3(...runtime.focus.target);
    } else if (firstPerson) {
      const bob = reduced ? 0 : Math.abs(Math.sin(walkCycle.phase)) * FIRST_PERSON.bob * walkCycle.amount;
      desiredPos = new THREE.Vector3(p.x, FIRST_PERSON.eyeHeight + bob, p.z);
      const d = lookDirection(runtime.orbit.yaw, runtime.lookPitch);
      desiredLook = desiredPos.clone().add(new THREE.Vector3(...d));
    } else {
      const target: [number, number, number] = [p.x, CAMERA_LIMITS.targetHeight, p.z];
      const r = computeCameraPosition(target, runtime.orbit, STUDIO_LAYOUT, OCCLUDERS);
      desiredPos = new THREE.Vector3(...r.position);
      desiredLook = new THREE.Vector3(...target);
    }

    if (runtime.snapCamera || (firstPerson && !runtime.focus && pos.current.distanceTo(desiredPos) < 0.6)) {
      // First person follows the head exactly (smoothing the eye feels floaty);
      // it only eases while returning from a station focus shot.
      pos.current.copy(desiredPos);
      look.current.copy(desiredLook);
      runtime.snapCamera = false;
    } else {
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
      const b = STUDIO_LAYOUT.bounds;
      pos.current.x = THREE.MathUtils.clamp(pos.current.x, b.minX + 0.15, b.maxX - 0.15);
      pos.current.z = THREE.MathUtils.clamp(pos.current.z, b.minZ + 0.15, b.maxZ - 0.15);
      pos.current.y = THREE.MathUtils.clamp(pos.current.y, 0.4, STUDIO_LAYOUT.ceilingHeight - 0.2);
    }
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
    // Wider lens in first person, tighter in third person.
    const persp = camera as THREE.PerspectiveCamera;
    const fov = firstPerson && !runtime.focus ? 70 : 52;
    if (Math.abs(persp.fov - fov) > 0.05) {
      persp.fov = reduced ? fov : damp(persp.fov, fov, 6, dt);
      persp.updateProjectionMatrix();
    }
  });

  return null;
}
