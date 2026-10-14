export type QualityTier = "ultra" | "high" | "low";

/**
 * Pick a starting render tier from device capability, not viewport width.
 * PerformanceMonitor refines DPR at runtime; visitors can override in settings.
 */
export function detectQuality(): QualityTier {
  if (typeof window === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "low";
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const renderer = gpuRenderer();
  const weakGpu = /swiftshader|llvmpipe|software|mali-4|adreno \(tm\) [34]\d\d|powervr sgx/i.test(renderer);
  if (weakGpu) return "low";
  if (cores <= 4 || memory <= 3) return "low";
  if (coarse && (cores <= 6 || memory <= 4)) return "low";
  // Desktop with a discrete or Apple-silicon GPU: full fidelity.
  const strongGpu = /nvidia|geforce|rtx|quadro|radeon rx|radeon pro|apple m\d|apple gpu|arc a\d/i.test(renderer);
  if (!coarse && strongGpu && cores >= 8) return "ultra";
  return "high";
}

function gpuRenderer(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return String(r ?? "");
  } catch {
    return "";
  }
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export interface QualityPreset {
  /** Device-pixel-ratio range; PerformanceMonitor moves within it at runtime. */
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  /** Native MSAA on the default framebuffer (used when there is no post chain). */
  antialias: boolean;
  /** Practical lamps that actually emit light (the rest only glow). */
  practicalLights: number;
  /** Post-processing chain (bloom, vignette, SMAA). */
  post: boolean;
  /** MSAA samples inside the post-processing chain. */
  msaa: number;
  /** Screen-space ambient occlusion: soft contact shading in corners and under props. */
  ao: boolean;
  outlines: boolean;
  particles: boolean;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  ultra: { dpr: [1.25, 2], shadows: true, shadowMapSize: 4096, antialias: true, practicalLights: 4, post: true, msaa: 8, ao: true, outlines: true, particles: true },
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, antialias: true, practicalLights: 4, post: true, msaa: 4, ao: false, outlines: true, particles: true },
  low: { dpr: [1, 1.5], shadows: false, shadowMapSize: 512, antialias: true, practicalLights: 1, post: false, msaa: 0, ao: false, outlines: false, particles: false },
};
