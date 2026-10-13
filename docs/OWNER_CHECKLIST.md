# What we need from Keep Smiling Visuals

Everything below is currently a clearly-marked placeholder or disabled. Nothing invented is shown as fact.

## Accounts & credentials (set as environment variables — never commit them)

| Needed | Used for | Env vars | Blocking |
| --- | --- | --- | --- |
| **Resend** account + verified sending domain | Inquiry & print-request emails to the KSV inbox | `RESEND_API_KEY`, `INQUIRY_FROM_EMAIL`, `INQUIRY_TO_EMAIL` | Online inquiry sending (mailto fallback works today) |
| **Upstash Redis** (free tier is fine) | Rate limiting shared across serverless instances | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Production-grade anti-abuse |
| **Sanity** project | CMS editing without code (Phase 4) | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN` | Acceptance criterion 11 |
| **Vercel** project + domain | Hosting, previews | `NEXT_PUBLIC_SITE_URL` | Launch |
| Analytics endpoint (e.g. Plausible / Umami, cookieless) | Station discovery, conversion | `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Optional |
| **Stripe** (or Shopify) — only after business decisions below | Hosted print checkout | TBD | Online print sales |

## Factual content

- [ ] **YouTube video IDs** for each portfolio project, plus title, category, one-line summary, date, client (only if permitted), KSV roles
- [ ] **Showreel** YouTube ID
- [ ] Confirm the categories to show (Commercials, Events, Music Videos, Documentaries, Padel / Sports, Travel / Moving Postcards, Behind the Scenes)
- [ ] **Photographs for prints**: high-res files, titles, stories/locations, which sizes & papers, edition sizes
- [ ] **About**: confirm/replace the draft founder text, mission, services; list *verified* collaborations you have permission to name
- [ ] **Timeline**: real milestones with dates (or "undated")
- [ ] **Blog**: first posts (or permission to launch without the journal)
- [ ] **Free Music Plug**: description, platform links, embeddable playlists (Spotify / SoundCloud / Bandcamp / YouTube)
- [ ] **Social profiles** (exact URLs) and whether to show a public phone number
- [ ] Brand assets: logo files (SVG), any existing brand colours/typefaces to match
- [ ] Budget ranges for the inquiry form (currently SEK placeholders)
- [ ] Legal entity name / org number for the privacy policy

## Decisions

- [ ] **Print commerce**: Stripe Checkout vs Shopify · delivery regions · shipping costs · VAT handling · lead times · returns/withdrawal policy · print lab / fulfilment partner
- [ ] Data retention period for inquiries
- [ ] Legal review of `/privacy` and `/terms` (drafts are marked as such)
- [ ] Target devices for performance sign-off (e.g. iPhone 12+, mid-range Android 2021+)
- [ ] Welcome-guide name and personality (currently "Studio guide")

## Assets

- [ ] `founder-player.glb` — playable founder likeness (spec: `ASSET_PIPELINE.md`)
- [ ] `welcome-guide.glb` — separate guide character (must not be the founder)
- [ ] Optional: ambient studio audio loop (licensed), shutter/clap SFX (synthesised versions exist)
- [ ] Optional: art direction references for the studio art pass
