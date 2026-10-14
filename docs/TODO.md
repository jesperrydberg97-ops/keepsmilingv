# Living checklist

Legend: ✅ implemented & verified · 🟡 implemented, needs credentials / real assets / real-device check · ⏳ not started · 🔒 blocked on owner

## Acceptance criteria

| # | Criterion | Status | Evidence / what's missing |
| --- | --- | --- | --- |
| 1 | Explore on desktop & mobile without getting stuck | 🟡 | Unit test walks from spawn to **every** station approach point through the real controller; e2e on desktop + Pixel 7 emulation. Needs a pass on real phones. |
| 2 | WASD, click-to-move, mobile controls without conflicts | ✅ | Click vs drag separated by a 6 px slop; manual input cancels auto-walk; keys ignored in form fields/dialogs (e2e). |
| 3 | Founder placeholder playable & swappable; NPC separate | ✅ | `lib/config/avatars.ts` slots; error-boundary fallback; guide is its own component/controller. |
| 4 | All stations discoverable and open working UI | ✅ | 10 stations + 3 easter eggs; Stations menu, minimap, signage, prompts. |
| 5 | TV plays configured YouTube videos, categories/search | 🟡 | Player, rails, filters, search, detail, error states built. **No real video IDs yet** — all seed projects show "Video not available yet". |
| 6 | Inquiry validates, submits securely, confirms only real success | 🟡 | Server validation, honeypot, time trap, origin check, rate limit, 503 → mailto fallback (e2e). **Email delivery needs Resend credentials.** |
| 7 | Prints viewable; purchase real or honestly an inquiry | ✅ | Zoom, crop preview, room mockup, sizes; "Request a print" only; no cart. |
| 8 | About, blog, projects as accessible, indexable pages | ✅ | SSR/SSG routes, metadata, canonical, sitemap, robots, JSON-LD. Placeholders are `noindex`. |
| 9 | Sound opt-in; no unexpected autoplay with sound | ✅ | SFX off by default; videos/music load only on click. |
| 10 | Acceptable performance; low-graphics/2D fallback | 🟡 | Device-capability tiering, PerformanceMonitor DPR, low tier, frameloop paused under overlays, WebGL/context-loss fallback. Needs profiling on target devices. |
| 11 | CMS editing without code changes | 🔒 | Interim: edit `/content/*.json` (validated by tests/CI). Sanity integration blocked on account. |
| 12 | No dead controls, fake checkout, invented projects | ✅ | Placeholders badged; no tel:/social links without data; tests assert commerce disabled and prices null. |

## Phase 1 — Prototype ✅
- [x] Next.js + TS + Tailwind tokens, fonts, security headers
- [x] Greybox loft from data (`game/layout.ts`), colliders, signage
- [x] Collision (circle vs AABB), navmesh A* click-to-move
- [x] Third-person camera: orbit, zoom limits, wall/column/ceiling avoidance, focus reframing
- [x] Keyboard (WASD/arrows/Shift/E), mouse drag/wheel, touch joystick, tap-to-move, pinch
- [x] Placeholder founder avatar with walk cycle; GLB slot
- [x] Overlay system: focus trap, Esc, close button, mobile Back, focus restore, input suppression
- [x] Loading/entry screen with progress, "View work without 3D", WebGL detection, context-loss UI
- [x] Settings: quality, reduced motion, sensitivity, sound, minimap, guide
- [x] Unit tests (69) + e2e (19)
- [ ] **Verify on real iOS + Android hardware** (owner/QA)

## Phase 2 — Functional stations ✅ (seed content)
- [x] Project TV: featured hero, populated rails, search, filters, detail, related, YouTube player with error recovery
- [x] Booking desk: 3-step inquiry, session-only draft, server endpoint, honest failure states
- [x] Gallery: frames from content, print detail, request flow; `/prints` storefront
- [x] About noticeboard, reading lounge (blog list/article), timeline shelf, music corner, showreel wall, phone
- [x] Scripted welcome guide: greeting, 4 options, guided tour, skip / don't greet again
- [x] Easter eggs: shutter flash, clapper animation, hidden polaroid (configurable)

## Owner-directed update (first person, founder host, game look) ✅
- [x] First-person camera with arms viewmodel (drag/swipe to look, ←/→ to turn, head bob, eased turn toward used objects); third person kept as a setting
- [x] Founder stands at the front edge of the rug, turns to face visitors, waves while greeting; `HOST_AVATAR` slot for `founder.glb` (Idle/Wave/Talk clips)
- [x] Stylised game look: toon materials + shared light ramp, ink outlines and rounded props (high tier), floating station markers, light motes, bloom + vignette (high tier)
- [x] Personal-space collider so the first-person camera can't clip into the founder (unit-tested)
- [ ] 🔒 Founder model + name + approved greeting (see OWNER_CHECKLIST.md §1)
- [ ] 🔒 Style references to fine-tune the look (OWNER_CHECKLIST.md §3)

## Visual fidelity pass ✅
- [x] New **Ultra** tier (auto-selected on desktops with a discrete/Apple-silicon GPU): 4096 shadow maps, MSAA ×8 + SMAA, ambient occlusion (N8AO)
- [x] High tier: MSAA ×4 + SMAA in the post chain; low tier: native MSAA, DPR floor raised to 1
- [x] Soft cel shading (smooth 64-step ramp instead of 4 hard bands), softer PCF shadows
- [x] Higher-poly characters, props and plants; rounder edges (RoundedBox smoothness 4–6)
- [x] Generated textures supersampled ×2 on high/ultra, 16× anisotropic filtering
- [x] Removed AdaptiveDpr (it lowered resolution and softened the image)
- [x] Fixed the booking-desk laptop lid (was lying flat)
- [ ] Verify Ultra/High frame rate on real hardware (sandbox renders on the CPU only)

## Phase 3 — Art pass ⏳
- [ ] Authored studio GLB with baked lightmaps, KTX2, atlases
- [ ] Replace procedural textures; refine lighting; subtle ambient animation pass
- [ ] Licensed ambient audio loop with separate mute (deliberately not shipped without an asset — no dead toggle)
- [ ] Performance budget verification (see PLAN §5)

## Phase 4 — CMS & commerce 🔒
- [ ] Sanity schemas mirroring `schemas/content.ts`, embedded Studio route, GROQ provider in `lib/content`
- [ ] On-demand revalidation webhook
- [ ] Optional YouTube Data API sync (server-side, cached) — curated IDs work without it
- [ ] Stripe Checkout (hosted) once business decisions are made

## Phase 5 — Avatars 🔒
- [ ] Import `founder-player.glb`, `welcome-guide.glb`; validate scale/orientation/clips

## Phase 6 — Hardening ⏳
- [ ] Lighthouse/WebPageTest on target devices; bundle analysis (home first-load JS is 155 kB; 3D chunk loads lazily)
- [ ] Manual screen-reader pass (VoiceOver, NVDA), colour-contrast audit
- [ ] Cloudflare Turnstile on forms if spam appears
- [ ] Content Security Policy (needs final list of embed hosts)
- [ ] Analytics provider + dashboard for inquiry conversion and station discovery
- [ ] Legal review of privacy/terms; release checklist

## Known limitations
- In-memory rate limiting is per serverless instance — configure Upstash for production.
- Software-rendered browsers (no GPU) are detected as low tier and look soft by design.
- The minimap is hidden below the `md` breakpoint (the Stations menu covers mobile).
