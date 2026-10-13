export type QualityTier = "high" | "low";

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

export const QUALITY_PRESETS = {
  high: { dpr: [1, 2] as [number, number], shadows: true, shadowMapSize: 2048, antialias: true, practicalLights: 4 },
  low: { dpr: [0.75, 1.25] as [number, number], shadows: false, shadowMapSize: 512, antialias: false, practicalLights: 1 },
};
