# Character models

Asset slots (see `lib/config/avatars.ts` and `docs/ASSET_PIPELINE.md`):

| File | Purpose | Status |
| --- | --- | --- |
| `founder-player.glb` | Playable founder likeness | **Not yet supplied** — placeholder mannequin in use |
| `welcome-guide.glb` | Welcome NPC (not the founder) | **Not yet supplied** — placeholder mannequin in use |

Keep files small (target < 3 MB each, Meshopt-compressed, KTX2 textures).
Larger assets belong on a CDN; reference them by absolute URL in the config.
