/**
 * Mapping between node names in an authored studio.glb and the site's
 * stations. Names follow docs/BLENDER.md (and the generated blockout):
 *   station_booking, station_tv, station_npc_guide, station_egg_shutter,
 *   station_gallery_1 … station_gallery_4  (frames, in order)
 * Blender may append ".001" etc. to duplicated names; that suffix is ignored.
 */
export function stationIdFromNodeName(name: string, printSlugs: readonly string[]): string | null {
  const clean = name.replace(/\.\d+$/, "");
  const m = /^station_(.+)$/.exec(clean);
  if (!m) return null;
  const key = m[1]!;
  const gallery = /^gallery_(\d+)$/.exec(key);
  if (gallery) {
    const slug = printSlugs[Number(gallery[1]) - 1];
    return slug ? `print-${slug}` : null;
  }
  return key.replace(/_/g, "-");
}

/** Screen surfaces whose material is replaced by live content. */
export const SCREEN_NODES = {
  screen_tv: "tv",
  screen_showreel: "showreel",
  screen_laptop: "laptop",
} as const;

/** `print_1` … `print_4`: picture surfaces inside the gallery frames. */
export function printIndexFromNodeName(name: string): number | null {
  const m = /^print_(\d+)$/.exec(name.replace(/\.\d+$/, ""));
  return m ? Number(m[1]) - 1 : null;
}
