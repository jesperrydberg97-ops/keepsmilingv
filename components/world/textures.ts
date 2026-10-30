import * as THREE from "three";

/**
 * Procedural textures generated on the client — zero downloads for the
 * greybox/first art pass. Phase 3 replaces these with baked KTX2 textures and
 * lightmaps from the authored studio GLB.
 */

/**
 * Supersampling factor for every generated texture. 2 on the high/ultra tiers
 * gives crisp text and grain up close; 1 keeps GPU memory low on phones.
 * Set once before the first texture is created (see Scene).
 */
let DETAIL = 1;
export function setTextureDetail(scale: number) {
  DETAIL = scale;
}

/** Canvas sized at DETAIL× with a matching transform, so drawing code uses logical units. */
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * DETAIL);
  c.height = Math.round(h * DETAIL);
  const g = c.getContext("2d")!;
  g.scale(DETAIL, DETAIL);
  g.imageSmoothingQuality = "high";
  return [c, g] as const;
}

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const cache = new Map<string, THREE.Texture>();
function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  const k = `${key}@${DETAIL}`;
  const hit = cache.get(k);
  if (hit) return hit as T;
  const t = make();
  // Three clamps this to the GPU's maximum; keeps floors and signs sharp at grazing angles.
  t.anisotropy = 16;
  cache.set(k, t);
  return t;
}

export function woodFloorTexture(size: number) {
  return cached(`wood-${size}`, () => {
    const [c, g] = canvas(size, size);
    const r = rand(7);
    const planks = 8;
    const ph = size / planks;
    for (let i = 0; i < planks; i++) {
      const offset = r() * size;
      for (let k = -2; k < 2; k++) {
        const x0 = offset + k * size * 0.75;
        const l = 38 + r() * 12;
        g.fillStyle = `hsl(${26 + r() * 6}, ${38 + r() * 10}%, ${l * 0.62}%)`;
        g.fillRect(x0, i * ph, size * 0.75, ph);
        // grain
        g.globalAlpha = 0.12;
        for (let j = 0; j < 14; j++) {
          g.strokeStyle = r() > 0.5 ? "#000" : "#fff";
          g.lineWidth = 0.5 + r();
          g.beginPath();
          const y = i * ph + r() * ph;
          g.moveTo(x0, y);
          g.bezierCurveTo(x0 + size * 0.25, y + (r() - 0.5) * 4, x0 + size * 0.5, y + (r() - 0.5) * 4, x0 + size * 0.75, y);
          g.stroke();
        }
        g.globalAlpha = 1;
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.fillRect(x0, i * ph, 2, ph);
      }
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillRect(0, i * ph, size, 1.5);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/** Neutral plaster: soft mottling, tinted by the material colour. Also used as a bump map. */
export function plasterTexture(size: number) {
  return cached(`plaster-${size}`, () => {
    const [c, g] = canvas(size, size);
    const r = rand(11);
    g.fillStyle = "#e8e8e8";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < size * 8; i++) {
      const x = r() * size;
      const y = r() * size;
      const rad = 1.5 + r() * size * 0.04;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const l = r() > 0.5 ? 255 : 0;
      grd.addColorStop(0, `rgba(${l},${l},${l},${0.008 + r() * 0.014})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

export function rugTexture(size: number) {
  return cached(`rug-${size}`, () => {
    const [c, g] = canvas(size, size / 1.5);
    const w = size;
    const h = size / 1.5;
    g.fillStyle = "#5a3424";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c9a066";
    g.lineWidth = w * 0.012;
    g.strokeRect(w * 0.05, h * 0.07, w * 0.9, h * 0.86);
    g.strokeStyle = "rgba(201,160,102,0.5)";
    g.lineWidth = w * 0.004;
    g.strokeRect(w * 0.09, h * 0.13, w * 0.82, h * 0.74);
    g.fillStyle = "rgba(201,160,102,0.35)";
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.ellipse(w / 2, h / 2, w * (0.06 + i * 0.05), h * (0.06 + i * 0.05), 0, 0, Math.PI * 2);
      g.lineWidth = 2;
      g.strokeStyle = `rgba(201,160,102,${0.4 - i * 0.06})`;
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

export function labelTexture(
  text: string,
  opts: { width?: number; height?: number; font?: string; color?: string; bg?: string; sub?: string; align?: CanvasTextAlign } = {},
) {
  const key = `label-${text}-${JSON.stringify(opts)}`;
  return cached(key, () => {
    const w = opts.width ?? 1024;
    const h = opts.height ?? 256;
    const [c, g] = canvas(w, h);
    if (opts.bg) {
      g.fillStyle = opts.bg;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = opts.color ?? "#f3ede2";
    g.textAlign = opts.align ?? "center";
    g.textBaseline = "middle";
    g.font = opts.font ?? `500 ${Math.round(h * 0.42)}px Georgia, serif`;
    const x = g.textAlign === "left" ? w * 0.06 : w / 2;
    g.fillText(text, x, opts.sub ? h * 0.4 : h / 2);
    if (opts.sub) {
      g.font = `400 ${Math.round(h * 0.16)}px ui-monospace, monospace`;
      g.globalAlpha = 0.75;
      g.fillText(opts.sub, x, h * 0.75);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Screen content for the TV and showreel wall. */
export function screenTexture(title: string, sub: string, hue = 32) {
  return cached(`screen-${title}-${sub}-${hue}`, () => {
    const w = 1024;
    const h = 576;
    const [c, g] = canvas(w, h);
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, `hsl(${hue}, 35%, 16%)`);
    grd.addColorStop(1, `hsl(${hue + 20}, 40%, 6%)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.6);
    glow.addColorStop(0, "rgba(232,169,85,0.35)");
    glow.addColorStop(1, "rgba(232,169,85,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8a955";
    g.font = "400 26px ui-monospace, monospace";
    g.textAlign = "left";
    g.fillText(sub.toUpperCase(), 60, 80);
    g.fillStyle = "#f3ede2";
    g.font = "500 92px Georgia, serif";
    g.fillText(title, 60, h - 120);
    // play glyph
    g.beginPath();
    g.arc(w - 140, h - 140, 56, 0, Math.PI * 2);
    g.fillStyle = "rgba(232,169,85,0.9)";
    g.fill();
    g.beginPath();
    g.moveTo(w - 160, h - 172);
    g.lineTo(w - 160, h - 108);
    g.lineTo(w - 108, h - 140);
    g.closePath();
    g.fillStyle = "#241503";
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}
