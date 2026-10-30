# Att göra — det här behöver jag från dig

Allt nedan är i dag antingen en tydligt markerad platshållare eller avstängt. Inget påhittat visas som fakta.
Bocka av eftersom. Viktigast först inom varje avsnitt.

---

## 1. Din 3D-modell (du som värd vid mattan)

Du står vid mattans framkant och hälsar besökare välkomna.

- [x] **Modell levererad** (`me_for_website.glb`): optimerad från 19,5 MB till 0,8 MB och inlagd som `public/models/founder.glb`. Den har inget skelett, så just nu andas den, nickar när den pratar, hoppar lite av glädje när den hälsar och gör **bakåtvolt** via knappen "Backflip" (eller tangenten B).
- [ ] Valfritt, nästa nivå: en **riggad** version (t.ex. ladda upp modellen i Mixamo, auto-rigg, ladda ner med animationerna Idle, Wave och Talk). Då kan den vinka och gestikulera på riktigt. Det kräver ingen kodändring.
- [ ] Bekräfta **din längd** (modellen är nu skalad till 1,80 m)

Ursprunglig specifikation (gäller en framtida riggad version):

- [x] **`founder.glb`**: en 3D-modell av dig i **semi-realistisk** stil som passar rummet (som en karaktär i ett modernt spel, inte en fotoskanning). Detaljerad specifikation finns i [`ASSET_PIPELINE.md`](./ASSET_PIPELINE.md). Kort version:
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

## 3. Rummet i 3D (semi-realistiskt, beslutat)

Studion visas nu i semi-realistisk stil med riktiga material. Den slutliga, detaljerade rummodellen (`studio.glb`) byggs i Blender ovanpå blockout-filen. Allt står i [`BLENDER.md`](./BLENDER.md). Färdiga prompter för Higgsfield (Blender, cinematic ljus) finns i [`HIGGSFIELD_STUDIO_PROMPT.md`](./HIGGSFIELD_STUDIO_PROMPT.md).
- [ ] **Välj väg:** bygga själv i Blender, beställa av en 3D-artist (skicka `BLENDER.md` + `docs/blender/ksv-studio-blockout.glb`) eller kombinera med köpta möbelpaket
- [ ] **3–8 referensbilder** på studior/loft du gillar (ljus, material, möbler, färger)
- [ ] Säg om **någon station ska bytas, flyttas eller tas bort** innan modelleringen börjar. Planlösningen ändras lättast nu.
- [ ] **Logga** i SVG (till skyltar och neon-skylten i rummet)
- [ ] Leverera **`studio.glb` + `.blend`-filen + texturer**

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
