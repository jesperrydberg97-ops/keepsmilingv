/**
 * Character asset slots. While `url` is null a clearly-marked placeholder is
 * rendered. To drop in a final character:
 *   1. Export a GLB following docs/ASSET_PIPELINE.md
 *   2. Put it in public/models/ (or on a CDN)
 *   3. Set `url` below and map clip names if they differ.
 * Movement, collision, camera and interaction code never change.
 */
export interface AvatarConfig {
  url: string | null;
  /** Uniform scale applied after import (asset should already be in metres). */
  scale: number;
  /**
   * Optional: rescale the model so it is this tall (metres), with its feet on
   * the floor and centred. Handy for scans/AI-generated models with odd units.
   */
  height?: number;
  /** Extra yaw if the asset doesn't face +Z. */
  rotationY: number;
  /** Clip names inside the GLB for each animation state. */
  clips: { idle: string; walk: string; run: string; interact?: string; wave?: string; talk?: string };
  /** Walk speed (m/s) at which the walk clip looks right, for playback-rate matching. */
  walkClipSpeed: number;
  runClipSpeed: number;
}

/**
 * The founder greets visitors at the rug. This is the person's real likeness,
 * supplied by them (see docs/OWNER_CHECKLIST.md). The current file is a static
 * (unrigged) scan: it idles, nods and backflips procedurally. A rigged version
 * with the clips below plays those instead.
 */
export const HOST_AVATAR: AvatarConfig = {
  url: "/models/founder.glb",
  scale: 1,
  height: 1.8,
  // The model was exported facing +X.
  rotationY: -Math.PI / 2,
  clips: { idle: "Idle", walk: "Walk", run: "Run", wave: "Wave", talk: "Talk" },
  walkClipSpeed: 1.4,
  runClipSpeed: 4.0,
};

/** The visitor's own body, only visible in the optional third-person camera. */
export const VISITOR_AVATAR: AvatarConfig = {
  url: null,
  scale: 1,
  rotationY: 0,
  clips: { idle: "Idle", walk: "Walk", run: "Run", interact: "Interact" },
  walkClipSpeed: 1.4,
  runClipSpeed: 4.0,
};

