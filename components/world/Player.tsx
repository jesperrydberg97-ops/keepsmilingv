"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { arrive } from "@/game/actions";
import { nearestStation } from "@/game/interaction";
import { PLAYER_RADIUS, STUDIO_LAYOUT } from "@/game/layout";
import { cameraRelative, followPath, stepMovement, wrapAngle } from "@/game/movement";
import { runtime } from "@/game/runtime";
import { inputBlocked, useStudio } from "@/game/store";
import { PLAYER_AVATAR } from "@/lib/config/avatars";
import { Avatar, FOUNDER_PALETTE, type MotionSample } from "./Avatar";

const FORWARD_KEYS = ["KeyW", "ArrowUp"];
const BACK_KEYS = ["KeyS", "ArrowDown"];
const LEFT_KEYS = ["KeyA"];
const RIGHT_KEYS = ["KeyD"];

const headPoint = new THREE.Vector3();

/**
 * Player controller: input → intent → movement → collision. The avatar mesh
 * is a child that only receives a motion sample, keeping visuals swappable.
 */
export function Player() {
  const group = useRef<THREE.Group>(null);
  const speed = useRef(0);
  const sample = useRef<MotionSample>({ speed: 0, interactAge: 10 });
  const visible = useRef(true);

  useFrame((state, dt) => {
    const st = useStudio.getState();
    const blocked = inputBlocked(st);
    const keys = runtime.input.keys;
    const any = (codes: string[]) => codes.some((c) => keys.has(c));

    let forward = 0;
    let right = 0;
    if (!blocked) {
      forward = (any(FORWARD_KEYS) ? 1 : 0) - (any(BACK_KEYS) ? 1 : 0);
      right = (any(RIGHT_KEYS) ? 1 : 0) - (any(LEFT_KEYS) ? 1 : 0);
      if (runtime.input.joystick.x || runtime.input.joystick.y) {
        forward = runtime.input.joystick.y;
        right = runtime.input.joystick.x;
      }
    }

    let direction = { x: 0, z: 0 };
    let sprint = !blocked && (keys.has("ShiftLeft") || keys.has("ShiftRight"));

    if (forward || right) {
      // Manual input always wins over click-to-move.
      runtime.path = null;
      runtime.pendingStationId = null;
      direction = cameraRelative(forward, right, runtime.orbit.yaw);
    } else if (runtime.path && !blocked) {
      const f = followPath(runtime.player.position, runtime.path);
      if (f) {
        runtime.path = f.remaining;
        direction = f.direction;
        sprint = runtime.autoSprint;
      } else {
        runtime.path = null;
        arrive();
      }
    }

    const next = stepMovement(
      { position: runtime.player.position, velocity: runtime.player.velocity, heading: runtime.player.heading },
      { direction, sprint },
      dt,
      STUDIO_LAYOUT.colliders,
      PLAYER_RADIUS,
    );
    runtime.player.position = next.position;
    runtime.player.velocity = next.velocity;
    runtime.player.heading = next.heading;

    speed.current = Math.hypot(next.velocity.x, next.velocity.z);
    sample.current.speed = speed.current;
    sample.current.interactAge = performance.now() / 1000 - runtime.lastInteractAt;

    const g = group.current;
    if (g) {
      g.position.set(next.position.x, 0, next.position.z);
      // Smooth visual turn (heading already rate-limited; this removes jitter).
      const cur = g.rotation.y;
      g.rotation.y = cur + wrapAngle(runtime.player.heading - cur) * Math.min(1, dt * 18);
      // Hide the avatar if the camera is pushed right into it (backed into a corner).
      const camDist = state.camera.position.distanceTo(headPoint.set(next.position.x, 1.4, next.position.z));
      const show = camDist > 0.55;
      if (show !== visible.current) {
        g.visible = show;
        visible.current = show;
      }
    }

    // Nearest interactable for prompts / highlight.
    const near = nearestStation(next.position, next.heading, st.stations);
    st.setNearest(near?.id ?? null);
  });

  return (
    <group ref={group} position={[STUDIO_LAYOUT.spawn.x, 0, STUDIO_LAYOUT.spawn.z]} rotation-y={STUDIO_LAYOUT.spawn.heading}>
      <Avatar config={PLAYER_AVATAR} palette={FOUNDER_PALETTE} sample={() => sample.current} variant="founder" />
      {/* soft contact shadow for low tier (no shadow maps) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} raycast={() => null}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}
