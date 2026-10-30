/**
 * Art direction switch.
 * - "realistic": semi-realistic PBR materials (wood, plaster, metal, fabric)
 *   with soft reflections — the owner's chosen direction, and what an
 *   authored studio.glb is expected to match.
 * - "stylized": cel-shaded cartoon look with ink outlines.
 * Game-feel elements (station markers, light motes, bloom, first-person arms)
 * are used in both.
 */
export type ArtStyle = "realistic" | "stylized";
export const ART_STYLE: ArtStyle = "realistic";

/**
 * Authored studio model. While null, the procedural studio is rendered.
 * When set, the GLB replaces the procedural room and furniture; interactive
 * objects are found by node name (station_<id>, see docs/BLENDER.md).
 */
export const STUDIO_MODEL: { url: string | null } = {
  url: "/models/studio.glb",
};
