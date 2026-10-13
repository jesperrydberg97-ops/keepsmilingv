/**
 * Avatar asset slots. While `url` is null a clearly-marked placeholder
 * mannequin is rendered. To drop in a final character:
 *   1. Export a GLB following docs/ASSET_PIPELINE.md
 *   2. Put it at public/models/founder-player.glb (or a CDN URL)
 *   3. Set `url` below and map clip names if they differ.
 * Movement, collision, camera and interaction code never change.
 */
export interface AvatarConfig {
  url: string | null;
  /** Uniform scale applied after import (asset should already be in metres). */
  scale: number;
  /** Extra yaw if the asset doesn't face +Z. */
  rotationY: number;
  /** Clip names inside the GLB for each animation state. */
  clips: { idle: string; walk: string; run: string; interact?: string; wave?: string };
  /** Walk speed (m/s) at which the walk clip looks right, for playback-rate matching. */
  walkClipSpeed: number;
  runClipSpeed: number;
}

export const PLAYER_AVATAR: AvatarConfig = {
  url: null, // "/models/founder-player.glb"
  scale: 1,
  rotationY: 0,
  clips: { idle: "Idle", walk: "Walk", run: "Run", interact: "Interact" },
  walkClipSpeed: 1.4,
  runClipSpeed: 4.0,
};

export const GUIDE_AVATAR: AvatarConfig = {
  url: null, // "/models/welcome-guide.glb"
  scale: 1,
  rotationY: 0,
  clips: { idle: "Idle", walk: "Walk", run: "Run", wave: "Wave" },
  walkClipSpeed: 1.4,
  runClipSpeed: 4.0,
};
