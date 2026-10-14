# Att göra — det här behöver jag från dig

Allt nedan är i dag antingen en tydligt markerad platshållare eller avstängt. Inget påhittat visas som fakta.
Bocka av eftersom. Viktigast först inom varje avsnitt.

---

## 1. Din 3D-modell (du som värd vid mattan)

Du står vid mattans framkant och hälsar besökare välkomna. Tills din modell finns visas en tecknad platshållare med texten "Founder model: placeholder".

- [ ] **`founder.glb`**: en 3D-modell av dig, i spelstil som passar rummet (tecknad, lätt överdrivna proportioner, inte fotorealistisk). Detaljerad specifikation finns i [`ASSET_PIPELINE.md`](./ASSET_PIPELINE.md). Kort version:
  - glTF binär (`.glb`), meter-skala (din riktiga längd), står på origo, tittar mot +Z
  - Rig med humanoid-skelett (Mixamo-kompatibelt är enklast)
  - Animationer på plats (ingen rotförflyttning): **Idle**, **Wave** (vinka), **Talk** (pratar/gestikulerar). Walk är frivillig.
  - Max ~25 000 trianglar, max 3 material, texturer max 2048 px, under 3 MB efter komprimering
- [ ] Säg hur modellen tas fram (jag kan hjälpa till med vilket som helst):
  - **A. Beställa** av en 3D-artist (Fiverr/ArtStation): skicka referensbilderna nedan + specen
  - **B. Generera själv** från foton: AI-verktyg för bild till 3D, sedan auto-rigg i Mixamo
  - **C. Fotoskanna** (Polycam/RealityScan på mobilen) och stilisera
- [ ] **Referensbilder av dig** (om A eller B): helfigur rakt framifrån, från sidan och bakifrån, neutral bakgrund, armarna lite ut från kroppen (A-pose), samt närbild på ansiktet
- [ ] **Kläder och signatur-detaljer** som modellen ska ha (t.ex. mössa, jacka, kamera, färger)
- [ ] **Ditt namn som det ska stå** på namnskylten ovanför värden (i dag står "KSV founder")
- [ ] **Godkänn eller skriv om hälsningen.** Den visas nu som om du själv pratar: "Hi, welcome to Keep Smiling Visuals! Take a look around — or I can show you the highlights." Även guidade turens repliker (`content/npc.json`) ska godkännas av dig.
- [ ] Valfritt: **röstinspelning** av hälsningen (mp3, max 10 sek). Spelas bara om besökaren har slagit på ljud.

## 2. Besökarens armar (förstapersonsvyn)

- [ ] Valfritt: ska armarna ha en viss **ärm- eller handskfärg**, eller hålla något (t.ex. en kamera)? I dag är det enkla tecknade armar med grön ärm.

## 3. Spelstilen på rummet

Rummet har nu tecknad toon-shading, mörka konturer, rundade möbler, svävande markörer över stationerna, glöd och dammpartiklar i fönsterljuset. Jag behöver:
- [ ] **2–5 referensbilder eller speltitlar** vars stil du gillar (t.ex. "som Animal Crossing", "som Fortnite", "som Overcooked"), så vi kan finjustera färger, konturer och proportioner
- [ ] Säg om **någon station ska bytas, flyttas eller tas bort**, och om du vill ha fler (t.ex. en redigeringsdator, ett kamerarum)
- [ ] Säg om **möblerna ska bytas mot riktiga 3D-modeller** (köpta eller beställda, se ASSET_PIPELINE) eller om den procedurella stilen räcker tills vidare
- [ ] **Logga** i SVG (till skyltar och neon-skylten)

## 4. Innehåll (fakta)

- [ ] **YouTube-länkar** till varje projekt + titel, kategori, en mening om projektet, år, kund (bara om du får nämna den) och din roll
- [ ] **Showreel**: YouTube-länk
- [ ] Bekräfta **kategorierna** som ska visas: Commercials, Events, Music Videos, Documentaries, Padel / Sports, Travel / Moving Postcards, Behind the Scenes
- [ ] **Foton till printshopen** i hög upplösning, med titlar, plats/berättelse, storlekar, papper och eventuella upplagor
- [ ] **Om dig**: godkänn eller skriv om utkastet (det kommer från gamla `portfolio.html`), uppdrag och tjänster. Lista bara **samarbeten du får nämna**.
- [ ] **Tidslinjen**: riktiga milstolpar med datum (eller "odaterad")
- [ ] **Bloggen**: första inläggen, eller beslut att lansera utan blogg
- [ ] **Free Music Plug**: beskrivning, länkar och spellistor som går att bädda in (Spotify, SoundCloud, Bandcamp eller YouTube)
- [ ] **Sociala medier**: exakta länkar. Och: ska ett **telefonnummer** visas publikt?
- [ ] **Budgetintervall** till förfrågningsformuläret (i dag platshållare i SEK)
- [ ] **Företagsnamn och organisationsnummer** till integritetspolicyn

## 5. Konton och nycklar

Nycklarna läggs som miljövariabler i Vercel, aldrig i koden.

| Behövs | Till vad | Variabler | Blockerar |
| --- | --- | --- | --- |
| **Resend**-konto + verifierad avsändardomän | Förfrågningar mejlas till dig | `RESEND_API_KEY`, `INQUIRY_FROM_EMAIL`, `INQUIRY_TO_EMAIL` | Att skicka formuläret online (i dag får besökaren ett förifyllt mejl istället) |
| **Vercel**-projekt + domän | Hosting och förhandsvisning per branch | `NEXT_PUBLIC_SITE_URL` | Lansering |
| **Upstash Redis** (gratisnivå räcker) | Skydd mot spam och överbelastning | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Produktionsklart skydd |
| **Sanity**-projekt | Redigera innehåll utan kod | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN` | Redigering utan kod |
| Statistik-endpoint (t.ex. Plausible eller Umami) | Se vilka stationer som används | `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Valfritt |
| **Stripe** (eller Shopify), först efter besluten nedan | Riktig betalning för prints | — | Onlineförsäljning av prints |

## 6. Beslut

- [ ] **Printförsäljning**: Stripe eller Shopify, vilka länder du levererar till, fraktkostnad, moms, leveranstid, returer/ångerrätt och vilket tryckeri
- [ ] Hur länge förfrågningar får **sparas**
- [ ] **Juridisk granskning** av `/privacy` och `/terms` (de är utkast)
- [ ] **Vilka enheter** som måste fungera bra (t.ex. iPhone 12+, Android från 2021+)
- [ ] Ska **förstapersonsvyn** vara standard för alla, eller ska besökaren få välja vid start? (Tredjeperson finns redan under Inställningar.)

## 7. Testa på riktiga enheter

- [ ] Öppna förhandsvisningen på **din mobil** (iPhone/Android) och säg vad som känns fel: styrningen, att titta runt, läsbarheten och prestandan
