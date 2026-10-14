"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { arrive } from "@/game/actions";
import { nearestStation } from "@/game/interaction";
import { PLAYER_RADIUS, STUDIO_LAYOUT } from "@/game/layout";
import { cameraRelative, followPath, stepMovement, wrapAngle } from "@/game/movement";
import { FP_DEFAULT_PITCH, runtime } from "@/game/runtime";
import { inputBlocked, useStudio } from "@/game/store";
import { VISITOR_AVATAR } from "@/lib/config/avatars";
import { Avatar, VISITOR_PALETTE, type MotionSample } from "./Avatar";

const FORWARD_KEYS = ["KeyW", "ArrowUp"];
const BACK_KEYS = ["KeyS", "ArrowDown"];
const LEFT_KEYS = ["KeyA"];
const RIGHT_KEYS = ["KeyD"];

const headPoint = new THREE.Vector3();

/**
 * Player controller: input → intent → movement → collision. The visitor's
 * body is only rendered in third person; first person shows the arms
 * viewmodel (FirstPersonArms) attached to the camera instead.
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

    const firstPerson = st.settings.cameraMode === "first";

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
        if (firstPerson && !runtime.turnTo) {
          // Auto-walk turns the view toward where we're heading.
          const want = Math.atan2(direction.x, direction.z);
          runtime.orbit.yaw = wrapAngle(runtime.orbit.yaw + wrapAngle(want - runtime.orbit.yaw) * Math.min(1, dt * 5));
          runtime.lookPitch += (FP_DEFAULT_PITCH - runtime.lookPitch) * Math.min(1, dt * 3);
        }
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
    // In first person the body always faces where the visitor looks (strafing included).
    runtime.player.heading = firstPerson ? runtime.orbit.yaw : next.heading;

    speed.current = Math.hypot(next.velocity.x, next.velocity.z);
    sample.current.speed = speed.current;
    sample.current.interactAge = performance.now() / 1000 - runtime.lastInteractAt;

    const g = group.current;
    if (g) {
      g.position.set(next.position.x, 0, next.position.z);
      // Smooth visual turn (heading already rate-limited; this removes jitter).
      const cur = g.rotation.y;
      g.rotation.y = cur + wrapAngle(runtime.player.heading - cur) * Math.min(1, dt * 18);
      // No body in first person; in third person hide it if the camera is pushed into it.
      const camDist = state.camera.position.distanceTo(headPoint.set(next.position.x, 1.4, next.position.z));
      const show = !firstPerson && camDist > 0.55;
      if (show !== visible.current) {
        g.visible = show;
        visible.current = show;
      }
    }

    // Nearest interactable for prompts / highlight.
    const near = nearestStation(next.position, runtime.player.heading, st.stations);
    st.setNearest(near?.id ?? null);
  });

  return (
    <group ref={group} position={[STUDIO_LAYOUT.spawn.x, 0, STUDIO_LAYOUT.spawn.z]} rotation-y={STUDIO_LAYOUT.spawn.heading}>
      <Avatar config={VISITOR_AVATAR} palette={VISITOR_PALETTE} sample={() => sample.current} variant="visitor" />
      {/* soft contact shadow for low tier (no shadow maps) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} raycast={() => null}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}
