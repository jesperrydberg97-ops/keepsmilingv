"use client";

import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { PROPS, HALF_PI } from "@/game/layout";
import { useStudio } from "@/game/store";
import type { Station } from "@/game/types";
import type { Print, SiteSettings, TimelineItem } from "@/schemas/content";
import { Hotspot } from "./Hotspot";
import { materials } from "./materials";
import { labelTexture, screenTexture } from "./textures";

function useStation(id: string): Station | undefined {
  return useStudio((s) => s.stations.find((x) => x.id === id));
}

/** Small reusable primitives */
function Box({ args, position, mat, rotation, cast = true }: { args: [number, number, number]; position: [number, number, number]; mat: THREE.Material; rotation?: [number, number, number]; cast?: boolean }) {
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow>
      <boxGeometry args={args} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Cyl({ args, position, mat, rotation }: { args: [number, number, number, number?]; position: [number, number, number]; mat: THREE.Material; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[args[0], args[1], args[2], args[3] ?? 24]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Plant({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const m = materials();
  const leaves = useMemo(() => {
    const out: { p: [number, number, number]; s: number; dark: boolean }[] = [];
    let seed = Math.abs(Math.floor(x * 31 + z * 17)) + 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const rad = 0.08 + r() * 0.22;
      out.push({ p: [Math.cos(a) * rad, 0.75 + r() * 0.6, Math.sin(a) * rad], s: 0.16 + r() * 0.12, dark: r() > 0.5 });
    }
    return out;
  }, [x, z]);
  return (
    <group position={[x, 0, z]} scale={scale}>
      <Cyl args={[0.24, 0.19, 0.5]} position={[0, 0.25, 0]} mat={m.terracotta} />
      <Cyl args={[0.025, 0.03, 0.7]} position={[0, 0.8, 0]} mat={m.darkWood} />
      {leaves.map((l, i) => (
        <mesh key={i} position={l.p} scale={[l.s, l.s * 0.6, l.s]} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
          <primitive object={l.dark ? m.leafDark : m.leaf} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function FloorLamp({ x, z, light }: { x: number; z: number; light: boolean }) {
  const m = materials();
  return (
    <group position={[x, 0, z]}>
      <Cyl args={[0.16, 0.18, 0.03]} position={[0, 0.015, 0]} mat={m.metal} />
      <Cyl args={[0.015, 0.015, 1.5]} position={[0, 0.77, 0]} mat={m.brass} />
      <Cyl args={[0.14, 0.22, 0.28]} position={[0, 1.6, 0]} mat={m.lampShade} />
      {light && <pointLight position={[0, 1.55, 0]} intensity={4} distance={6} decay={2} color="#ffbf73" />}
    </group>
  );
}

/* ---------------- Booking desk ---------------- */
function BookingDesk({ lights }: { lights: boolean }) {
  const st = useStation("booking");
  const m = materials();
  const d = PROPS.bookingDesk;
  const screen = useMemo(() => screenTexture("Start a project", "Booking desk", 28), []);
  const sign = useMemo(() => labelTexture("Booking", { sub: "START A FILM PROJECT", width: 1024, height: 320, color: "#f3ede2" }), []);
  return (
    <Hotspot station={st}>
      <group position={[d.x, 0, d.z]}>
        <Box args={[d.w, 0.06, d.d]} position={[0, 0.76, 0]} mat={m.oak} />
        <Box args={[d.w - 0.1, 0.62, 0.04]} position={[0, 0.42, d.d / 2 - 0.05]} mat={m.darkWood} />
        {[-1, 1].map((s) => (
          <Box key={s} args={[0.05, 0.74, d.d - 0.1]} position={[s * (d.w / 2 - 0.08), 0.37, 0]} mat={m.metal} />
        ))}
        {/* laptop, facing the visitor (north) */}
        <group position={[-0.25, 0.79, -0.05]} rotation-y={Math.PI}>
          <Box args={[0.5, 0.02, 0.34]} position={[0, 0, 0]} mat={m.metal} />
          <group position={[0, 0.01, 0.17]} rotation-x={-1.85}>
            <Box args={[0.5, 0.33, 0.015]} position={[0, -0.165, 0]} mat={m.black} />
            <mesh position={[0, -0.165, -0.009]} rotation-y={Math.PI}>
              <planeGeometry args={[0.46, 0.29]} />
              <meshBasicMaterial map={screen} toneMapped={false} />
            </mesh>
          </group>
        </group>
        {/* notebook + pen */}
        <Box args={[0.22, 0.02, 0.3]} position={[0.45, 0.8, -0.1]} rotation={[0, 0.25, 0]} mat={m.paper} />
        <Cyl args={[0.006, 0.006, 0.14]} position={[0.52, 0.815, -0.1]} rotation={[0, 0, HALF_PI]} mat={m.brass} />
        {/* desk lamp */}
        <group position={[0.95, 0.79, 0.25]}>
          <Cyl args={[0.08, 0.09, 0.02]} position={[0, 0.01, 0]} mat={m.metal} />
          <Cyl args={[0.01, 0.01, 0.42]} position={[0, 0.22, 0]} mat={m.brass} />
          <Cyl args={[0.05, 0.11, 0.12]} position={[0, 0.45, 0]} mat={m.lampShade} />
          {lights && <pointLight position={[0, 0.4, 0]} intensity={2.2} distance={4} decay={2} color="#ffbf73" />}
        </group>
        {/* hanging sign */}
        <mesh position={[0, 2.5, 0.2]} rotation-y={Math.PI}>
          <planeGeometry args={[1.6, 0.5]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
        {[-0.7, 0.7].map((x) => (
          <Cyl key={x} args={[0.004, 0.004, 1.9]} position={[x, 3.7, 0.2]} mat={m.metal} />
        ))}
        {/* stool */}
        <Cyl args={[0.2, 0.2, 0.05]} position={[0, 0.62, 0.85]} mat={m.leather} />
        <Cyl args={[0.025, 0.025, 0.6]} position={[0, 0.3, 0.85]} mat={m.metal} />
      </group>
    </Hotspot>
  );
}

/* ---------------- Project TV ---------------- */
function ProjectTv({ lights }: { lights: boolean }) {
  const st = useStation("tv");
  const m = materials();
  const s = PROPS.tvScreen;
  const c = PROPS.tvConsole;
  const screen = useMemo(() => screenTexture("Projects", "KSV · Now showing", 24), []);
  return (
    <group>
      <Hotspot station={st}>
        <Box args={[c.w, 0.5, c.d]} position={[c.x, 0.25, c.z]} mat={m.darkWood} />
        <group position={[s.x + 0.06, s.y, s.z]} rotation-y={HALF_PI}>
          <Box args={[s.w + 0.08, s.h + 0.08, 0.06]} position={[0, 0, -0.03]} mat={m.black} />
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[s.w, s.h]} />
            <meshBasicMaterial map={screen} toneMapped={false} />
          </mesh>
        </group>
        {lights && <pointLight position={[s.x + 0.6, s.y, s.z]} intensity={1.6} distance={4} decay={2} color="#ffd29a" />}
      </Hotspot>
      {/* sofa facing the TV */}
      <group position={[PROPS.sofa.x, 0, PROPS.sofa.z]}>
        <Box args={[0.95, 0.42, 2.6]} position={[0, 0.25, 0]} mat={m.fabric} />
        <Box args={[0.25, 0.5, 2.6]} position={[0.38, 0.65, 0]} mat={m.fabric} />
        {[-1, 1].map((sgn) => (
          <Box key={sgn} args={[0.95, 0.28, 0.2]} position={[0, 0.56, sgn * 1.2]} mat={m.fabric} />
        ))}
        <Box args={[0.35, 0.3, 0.35]} position={[0.15, 0.6, 0.75]} rotation={[0, 0.3, 0.2]} mat={m.fabricWarm} />
      </group>
      <FloorLamp x={-7.5} z={1.4} light={lights} />
    </group>
  );
}

/* ---------------- Gallery wall ---------------- */
function GalleryFrame({ print, index }: { print: Print; index: number }) {
  const st = useStation(`print-${print.slug}`);
  const f = PROPS.galleryFrames[index]!;
  const tex = useTexture(print.image.src);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = materials();
  const ratio = print.image.width && print.image.height ? print.image.width / print.image.height : 1.5;
  const h = ratio >= 1 ? 1.15 / ratio + 0.15 : 1.35;
  const w = h * ratio;
  return (
    <Hotspot station={st}>
      <group position={[f.x, f.y, f.z]} rotation-y={-HALF_PI}>
        <Box args={[w + 0.16, h + 0.16, 0.05]} position={[0, 0, -0.025]} mat={m.black} cast={false} />
        <mesh position={[0, 0, 0.003]}>
          <planeGeometry args={[w + 0.06, h + 0.06]} />
          <primitive object={m.paper} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[w - 0.06, h - 0.06]} />
          <meshStandardMaterial map={tex} roughness={0.6} />
        </mesh>
        {/* picture light */}
        <Box args={[0.5, 0.04, 0.06]} position={[0, h / 2 + 0.16, 0.08]} mat={m.brass} />
      </group>
    </Hotspot>
  );
}

function Gallery({ prints, lights }: { prints: Print[]; lights: boolean }) {
  const sign = useMemo(() => labelTexture("Prints", { sub: "PHOTOGRAPHY · CLICK A FRAME", width: 1024, height: 320 }), []);
  const first = PROPS.galleryFrames[0]!;
  const last = PROPS.galleryFrames[Math.max(0, Math.min(prints.length, PROPS.galleryFrames.length) - 1)]!;
  return (
    <group>
      <Suspense fallback={null}>
        {prints.slice(0, PROPS.galleryFrames.length).map((p, i) => (
          <GalleryFrame key={p.slug} print={p} index={i} />
        ))}
      </Suspense>
      <mesh position={[11.83, 3.05, (first.z + last.z) / 2]} rotation-y={-HALF_PI}>
        <planeGeometry args={[1.6, 0.5]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      {lights && <pointLight position={[10.6, 3.2, (first.z + last.z) / 2]} intensity={6} distance={8} decay={2} color="#ffe0b0" />}
    </group>
  );
}

/* ---------------- About noticeboard ---------------- */
function Noticeboard({ notes }: { notes: string[] }) {
  const st = useStation("noticeboard");
  const m = materials();
  const b = PROPS.aboutBoard;
  const header = useMemo(() => labelTexture("About KSV", { width: 1024, height: 200 }), []);
  const noteTex = useMemo(
    () => notes.slice(0, 6).map((n) => labelTexture(n, { width: 512, height: 512, bg: "#f2e3b6", color: "#3a2a17", font: "italic 500 64px Georgia, serif" })),
    [notes],
  );
  const pins: [number, number, number][] = [
    [-0.75, 0.35, 0.12],
    [0.05, 0.4, -0.08],
    [0.8, 0.3, 0.1],
    [-0.55, -0.35, -0.06],
    [0.3, -0.3, 0.08],
    [0.95, -0.4, -0.1],
  ];
  return (
    <Hotspot station={st}>
      <group position={[b.x, b.y, b.z]} rotation-y={Math.PI}>
        <Box args={[b.w + 0.1, b.h + 0.1, 0.05]} position={[0, 0, -0.03]} mat={m.darkWood} cast={false} />
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[b.w, b.h]} />
          <primitive object={m.cork} attach="material" />
        </mesh>
        {noteTex.map((t, i) => {
          const [x, y, r] = pins[i]!;
          return (
            <group key={i} position={[x, y, 0.01]} rotation-z={r}>
              <mesh>
                <planeGeometry args={[0.42, 0.42]} />
                <meshStandardMaterial map={t} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.16, 0.01]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshStandardMaterial color="#c0392b" />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, b.h / 2 + 0.25, 0]}>
          <planeGeometry args={[1.6, 0.31]} />
          <meshBasicMaterial map={header} transparent toneMapped={false} />
        </mesh>
      </group>
    </Hotspot>
  );
}

/* ---------------- Reading lounge ---------------- */
const BOOK_COLORS = ["#7a2e22", "#2f4a3a", "#b88a3d", "#2b3550", "#5d3b55", "#c9b48e", "#384238"];

function ReadingLounge({ lights }: { lights: boolean }) {
  const st = useStation("reading");
  const m = materials();
  const a = PROPS.armchair;
  const t = PROPS.sideTable;
  const sh = PROPS.bookshelf;
  const bookMats = useMemo(() => BOOK_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })), []);
  const shelfBooks = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; c: number }[] = [];
    let seed = 3;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const y of [0.35, 0.95, 1.55, 2.1]) {
      let x = -sh.w / 2 + 0.1;
      while (x < sh.w / 2 - 0.2) {
        const w = 0.04 + r() * 0.05;
        const h = 0.26 + r() * 0.14;
        if (r() > 0.12) out.push({ x: x + w / 2, y: y + h / 2, w, h, c: Math.floor(r() * BOOK_COLORS.length) });
        x += w + 0.006;
      }
    }
    return out;
  }, [sh.w]);
  const sign = useMemo(() => labelTexture("Journal", { sub: "READING LOUNGE", width: 1024, height: 320 }), []);

  return (
    <group>
      {/* bookshelf */}
      <group position={[sh.x, 0, sh.z]}>
        <Box args={[sh.w, 0.05, sh.d]} position={[0, sh.h, 0]} mat={m.darkWood} />
        {[0.32, 0.92, 1.52, 2.07].map((y) => (
          <Box key={y} args={[sh.w, 0.03, sh.d]} position={[0, y, 0]} mat={m.darkWood} />
        ))}
        {[-1, 1].map((s) => (
          <Box key={s} args={[0.04, sh.h, sh.d]} position={[(s * sh.w) / 2, sh.h / 2, 0]} mat={m.darkWood} />
        ))}
        {shelfBooks.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, 0.02]} castShadow>
            <boxGeometry args={[b.w, b.h, sh.d * 0.75]} />
            <primitive object={bookMats[b.c]!} attach="material" />
          </mesh>
        ))}
        <mesh position={[0, sh.h + 0.45, 0.25]}>
          <planeGeometry args={[1.4, 0.44]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
      </group>
      {/* armchair angled toward the room */}
      <group position={[a.x, 0, a.z]} rotation-y={0.75}>
        <Box args={[0.85, 0.4, 0.8]} position={[0, 0.3, 0]} mat={m.leather} />
        <Box args={[0.85, 0.6, 0.18]} position={[0, 0.75, -0.33]} mat={m.leather} />
        {[-1, 1].map((s) => (
          <Box key={s} args={[0.14, 0.32, 0.8]} position={[s * 0.42, 0.6, 0]} mat={m.leather} />
        ))}
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} args={[0.025, 0.02, 0.12]} position={[sx * 0.35, 0.06, sz * 0.32]} mat={m.darkWood} />))}
      </group>
      {/* side table with journals — the interactive prop */}
      <Hotspot station={st}>
        <group position={[t.x, 0, t.z]}>
          <Cyl args={[t.r, t.r, 0.04]} position={[0, 0.55, 0]} mat={m.warmWood} />
          <Cyl args={[0.03, 0.05, 0.53]} position={[0, 0.27, 0]} mat={m.metal} />
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.02 * i - 0.02, 0.59 + i * 0.035, 0]} rotation-y={0.3 * i} castShadow>
              <boxGeometry args={[0.24, 0.03, 0.32]} />
              <primitive object={bookMats[i + 1]!} attach="material" />
            </mesh>
          ))}
          <mesh position={[0.12, 0.6, -0.12]}>
            <cylinderGeometry args={[0.04, 0.035, 0.09, 16]} />
            <meshStandardMaterial color="#efe6d4" roughness={0.4} />
          </mesh>
        </group>
      </Hotspot>
      <FloorLamp x={-11.2} z={-7.8} light={lights} />
      {/* low divider shelf */}
      <group position={[PROPS.divider.x, 0, PROPS.divider.z]}>
        <Box args={[PROPS.divider.w, PROPS.divider.h, PROPS.divider.d]} position={[0, PROPS.divider.h / 2, 0]} mat={m.darkWood} />
      </group>
      <Plant x={-11.3} z={-4.3} scale={0.9} />
    </group>
  );
}

/* ---------------- Showreel wall ---------------- */
function ShowreelWall({ title, lights }: { title: string; lights: boolean }) {
  const st = useStation("showreel");
  const m = materials();
  const s = PROPS.projectorScreen;
  const screen = useMemo(() => screenTexture("Showreel", title, 36), [title]);
  const neon = useMemo(() => labelTexture("keep smiling", { width: 2048, height: 300, font: "italic 400 200px Georgia, serif", color: "#ffd08a" }), []);
  const beam = useRef<THREE.Mesh>(null);
  const reduced = useStudio((x) => x.settings.reducedMotion);
  useFrame(({ clock }) => {
    if (beam.current && !reduced) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(clock.elapsedTime * 1.3) * 0.012;
  });
  return (
    <group>
      <Hotspot station={st}>
        <group position={[s.x, s.y, s.z]}>
          <Box args={[s.w + 0.2, s.h + 0.2, 0.04]} position={[0, 0, -0.02]} mat={m.black} cast={false} />
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[s.w, s.h]} />
            <meshBasicMaterial map={screen} toneMapped={false} />
          </mesh>
        </group>
        {/* ceiling projector */}
        <group position={[0, 4.0, -3.2]}>
          <Box args={[0.45, 0.18, 0.4]} position={[0, 0, 0]} mat={m.metal} />
          <Cyl args={[0.06, 0.06, 0.08]} position={[0, -0.02, -0.22]} rotation={[HALF_PI, 0, 0]} mat={m.black} />
          <Cyl args={[0.015, 0.015, 0.4]} position={[0, 0.3, 0]} mat={m.metal} />
        </group>
      </Hotspot>
      {/* faint projector beam */}
      <mesh ref={beam} position={[0, 3.2, -6.0]} rotation-x={-HALF_PI + 0.27} raycast={() => null}>
        <coneGeometry args={[1.8, 5.6, 4, 1, true]} />
        <meshBasicMaterial color="#ffe3b5" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.15, -8.82]}>
        <planeGeometry args={[3.4, 0.5]} />
        <meshBasicMaterial map={neon} transparent toneMapped={false} />
      </mesh>
      {lights && <pointLight position={[0, 3.9, -8.2]} intensity={2.5} distance={5} color="#ffb860" />}
      {PROPS.poufs.map((p, i) => (
        <Cyl key={i} args={[0.3, 0.3, 0.38]} position={[p.x, 0.19, p.z]} mat={i ? m.fabricWarm : m.fabric} />
      ))}
    </group>
  );
}

/* ---------------- Timeline shelf ---------------- */
function TimelineShelf({ items }: { items: TimelineItem[] }) {
  const st = useStation("timeline");
  const m = materials();
  const s = PROPS.timelineShelf;
  const sign = useMemo(() => labelTexture("Timeline", { sub: "PROJECT HISTORY", width: 1024, height: 320 }), []);
  const count = Math.max(3, Math.min(items.length, 9));
  return (
    <Hotspot station={st}>
      <group position={[s.x, 0, s.z]}>
        {[0.6, 1.2, 1.8].map((y) => (
          <Box key={y} args={[s.w, 0.04, s.d]} position={[0, y, 0]} mat={m.oak} />
        ))}
        {[-1, 1].map((x) => (
          <Box key={x} args={[0.04, s.h, s.d]} position={[(x * s.w) / 2, s.h / 2, 0]} mat={m.metal} />
        ))}
        {/* memorabilia: one object per timeline entry, left → right */}
        {Array.from({ length: count }, (_, i) => {
          const row = i % 3;
          const x = -s.w / 2 + 0.35 + (i * (s.w - 0.7)) / Math.max(1, count - 1);
          const y = [0.62, 1.22, 1.82][row]!;
          const kind = i % 4;
          return (
            <group key={i} position={[x, y, 0]}>
              {kind === 0 && <Cyl args={[0.16, 0.16, 0.04]} position={[0, 0.16, 0]} rotation={[HALF_PI, 0, 0]} mat={m.black} />}
              {kind === 1 && <Box args={[0.22, 0.14, 0.12]} position={[0, 0.07, 0]} mat={m.metal} />}
              {kind === 2 && <Box args={[0.16, 0.2, 0.01]} position={[0, 0.1, 0.05]} rotation={[-0.2, 0, 0]} mat={m.paper} />}
              {kind === 3 && <Cyl args={[0.05, 0.06, 0.18]} position={[0, 0.09, 0]} mat={m.brass} />}
            </group>
          );
        })}
        <mesh position={[0, 2.35, 0.25]}>
          <planeGeometry args={[1.4, 0.44]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
      </group>
    </Hotspot>
  );
}

/* ---------------- Music corner ---------------- */
function MusicCorner({ name, lights }: { name: string; lights: boolean }) {
  const st = useStation("music");
  const m = materials();
  const c = PROPS.musicCabinet;
  const platter = useRef<THREE.Group>(null);
  const reduced = useStudio((x) => x.settings.reducedMotion);
  const sign = useMemo(() => labelTexture(name, { sub: "MUSIC CORNER", width: 1024, height: 320 }), [name]);
  useFrame((_, dt) => {
    if (platter.current && !reduced) platter.current.rotation.y += dt * 0.6;
  });
  return (
    <group>
      <Hotspot station={st}>
        <group position={[c.x, 0, c.z]}>
          <Box args={[c.w, c.h, c.d]} position={[0, c.h / 2, 0]} mat={m.warmWood} />
          {/* vinyl crate fronts */}
          {[-0.6, -0.2, 0.2, 0.6].map((x) => (
            <Box key={x} args={[0.32, 0.5, 0.02]} position={[x, 0.36, c.d / 2 + 0.01]} mat={m.darkWood} />
          ))}
          {/* turntable */}
          <group position={[0, c.h, 0.02]}>
            <Box args={[0.5, 0.08, 0.38]} position={[0, 0.04, 0]} mat={m.black} />
            <group ref={platter} position={[-0.05, 0.09, 0]}>
              <Cyl args={[0.15, 0.15, 0.01, 32]} position={[0, 0, 0]} mat={m.black} />
              <Cyl args={[0.05, 0.05, 0.012, 24]} position={[0, 0.002, 0]} mat={m.lampShade} />
            </group>
            <Box args={[0.02, 0.02, 0.2]} position={[0.17, 0.11, 0.02]} rotation={[0, 0.3, 0]} mat={m.brass} />
          </group>
        </group>
      </Hotspot>
      {PROPS.speakers.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <Box args={[0.42, 1.0, 0.36]} position={[0, 0.5, 0]} mat={m.darkWood} />
          <Cyl args={[0.11, 0.11, 0.02]} position={[0, 0.66, 0.19]} rotation={[HALF_PI, 0, 0]} mat={m.black} />
          <Cyl args={[0.05, 0.05, 0.02]} position={[0, 0.88, 0.19]} rotation={[HALF_PI, 0, 0]} mat={m.black} />
        </group>
      ))}
      <mesh position={[c.x, 2.25, -8.84]}>
        <planeGeometry args={[1.6, 0.5]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      <FloorLamp x={11.3} z={-7.0} light={lights} />
    </group>
  );
}

/* ---------------- Telephone ---------------- */
function Telephone() {
  const st = useStation("telephone");
  const m = materials();
  const t = PROPS.phoneTable;
  const phoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8c2f23", roughness: 0.35 }), []);
  return (
    <Hotspot station={st}>
      <group position={[t.x, 0, t.z]}>
        <Cyl args={[t.r, t.r, 0.04]} position={[0, 0.7, 0]} mat={m.oak} />
        <Cyl args={[0.025, 0.025, 0.68]} position={[0, 0.34, 0]} mat={m.metal} />
        <Cyl args={[0.18, 0.2, 0.02]} position={[0, 0.01, 0]} mat={m.metal} />
        <group position={[0, 0.72, 0]} rotation-y={-2.3}>
          <Box args={[0.22, 0.09, 0.2]} position={[0, 0.045, 0]} mat={phoneMat} />
          <Cyl args={[0.06, 0.06, 0.01]} position={[0, 0.095, 0.02]} mat={m.paper} />
          <mesh position={[0, 0.13, -0.03]} rotation-z={HALF_PI} castShadow>
            <capsuleGeometry args={[0.025, 0.16, 4, 8]} />
            <primitive object={phoneMat} attach="material" />
          </mesh>
        </group>
      </group>
    </Hotspot>
  );
}

/* ---------------- Easter eggs ---------------- */
function CinemaCamera({ enabled }: { enabled: boolean }) {
  const st = useStation("egg-shutter");
  const m = materials();
  const p = PROPS.cameraTripod;
  return (
    <Hotspot station={enabled ? st : undefined}>
      <group position={[p.x, 0, p.z]}>
        {[0, 2.1, 4.2].map((a) => (
          <mesh key={a} position={[Math.sin(a) * 0.22, 0.65, Math.cos(a) * 0.22]} rotation={[Math.cos(a) * -0.32, 0, Math.sin(a) * 0.32]} castShadow>
            <cylinderGeometry args={[0.015, 0.012, 1.35, 8]} />
            <primitive object={m.metal} attach="material" />
          </mesh>
        ))}
        <group position={[0, 1.38, 0]} rotation-y={-HALF_PI + 0.4}>
          <Box args={[0.18, 0.16, 0.3]} position={[0, 0, 0]} mat={m.black} />
          <Cyl args={[0.055, 0.06, 0.16]} position={[0, 0, 0.22]} rotation={[HALF_PI, 0, 0]} mat={m.metal} />
          <Box args={[0.06, 0.05, 0.08]} position={[0, 0.1, -0.06]} mat={m.metal} />
        </group>
      </group>
    </Hotspot>
  );
}

function Clapperboard({ enabled }: { enabled: boolean }) {
  const st = useStation("egg-clapper");
  const m = materials();
  const p = PROPS.clapperCrate;
  const arm = useRef<THREE.Group>(null);
  const clapAt = useStudio((s) => s.clapAt);
  const stripes = useMemo(() => labelTexture("SCENE 1 · TAKE 1", { width: 512, height: 128, bg: "#111", color: "#eee", font: "500 44px ui-monospace, monospace" }), []);
  useFrame(() => {
    if (!arm.current) return;
    const t = (Date.now() - clapAt) / 1000;
    // open, then snap shut
    arm.current.rotation.z = t < 0.25 ? -0.6 * Math.sin((t / 0.25) * HALF_PI) : t < 0.35 ? -0.6 * (1 - (t - 0.25) / 0.1) : 0;
  });
  return (
    <Hotspot station={enabled ? st : undefined}>
      <group position={[p.x, 0, p.z]}>
        <Box args={[0.7, 0.5, 0.5]} position={[0, 0.25, 0]} mat={m.warmWood} />
        <group position={[0, 0.52, 0.05]} rotation-x={-0.35}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.32, 0.22, 0.015]} />
            <meshStandardMaterial map={stripes} roughness={0.6} />
          </mesh>
          <group ref={arm} position={[-0.16, 0.22, 0]}>
            <Box args={[0.32, 0.04, 0.016]} position={[0.16, 0.02, 0]} mat={m.black} />
          </group>
        </group>
      </group>
    </Hotspot>
  );
}

function Polaroid({ enabled }: { enabled: boolean }) {
  const st = useStation("egg-polaroid");
  const m = materials();
  if (!enabled) return null;
  return (
    <Hotspot station={st}>
      <group position={[-10.5, 0.006, 7.9]} rotation={[-HALF_PI, 0, 0.5]}>
        <mesh receiveShadow>
          <planeGeometry args={[0.16, 0.19]} />
          <primitive object={m.paper} attach="material" />
        </mesh>
        <mesh position={[0, 0.015, 0.001]}>
          <planeGeometry args={[0.13, 0.13]} />
          <meshStandardMaterial color="#6d5a40" roughness={0.6} />
        </mesh>
      </group>
    </Hotspot>
  );
}

/* ---------------- Composition ---------------- */
export function Stations({
  prints,
  settings,
  timeline,
  notes,
  practicalLights,
}: {
  prints: Print[];
  settings: SiteSettings;
  timeline: TimelineItem[];
  notes: string[];
  practicalLights: number;
}) {
  const eggs = settings.features.easterEggs;
  const L = (rank: number) => practicalLights >= rank;
  return (
    <group>
      <BookingDesk lights={L(1)} />
      <ProjectTv lights={L(2)} />
      <Gallery prints={prints} lights={L(1)} />
      <Noticeboard notes={notes} />
      <ReadingLounge lights={L(3)} />
      <ShowreelWall title={settings.showreel.title} lights={L(2)} />
      <TimelineShelf items={timeline} />
      <MusicCorner name={settings.music.projectName} lights={L(4)} />
      <Telephone />
      <CinemaCamera enabled={eggs} />
      <Clapperboard enabled={eggs} />
      <Polaroid enabled={eggs} />
      {PROPS.plants.map((p, i) => (
        <Plant key={i} x={p.x} z={p.z} scale={i % 2 ? 1.15 : 1} />
      ))}
    </group>
  );
}
