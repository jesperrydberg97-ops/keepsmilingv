# 💡 Dagens idé – Deepstash via SMS

Varje morgon kl. 07:00 får du ett SMS med **en kort, kraftfull idé** från en bok, artikel, podcast eller studie, plus en sak du kan göra med den samma dag.

## Vad Deepstash vill uppnå, och hur appen gör det

| Deepstash | Den här appen |
|---|---|
| Insikter från böcker, artiklar och poddar destillerade till "bite-sized ideas" | Varje SMS är en idé med källa (titel – författare) |
| "Lär dig något nytt på 5 minuter om dagen", alltså en daglig vana | Ett SMS varje morgon, går att läsa på under en minut |
| Personligt anpassat efter dina intressen | Du väljer ämnen och favoritkällor i `config.json` |
| Ett stort, växande bibliotek | Claude tar fram en ny idé varje dag, och det finns ett inbyggt bibliotek med 30 idéer som reserv |
| Spara ("stasha") idéer så att de fastnar | Alla idéer sparas i `history.json`, och på söndagar kommer en **repetition** av en äldre idé |
| Undvik att samma idéer upprepas (ett vanligt klagomål på Deepstash) | Historiken används så att ingen idé skickas två gånger |

Exempel:

```
💡 Dagens idé: Inversion

Charlie Munger löste problem baklänges: "Säg var jag kommer att dö,
så går jag aldrig dit." Fråga hur du garanterat misslyckas, och undvik det.

👉 Lista tre sätt du kan sabotera ditt viktigaste mål och undvik dem.

📖 Poor Charlie's Almanack – Charlie Munger
```

## Kom igång (cirka 10 minuter)

### 1. Skaffa en SMS-tjänst
**46elks** (svensk och billig, rekommenderas): skapa konto på 46elks.com och fyll på med lite saldo. Under *Account* hittar du API-användarnamn och lösenord.
Eller **Twilio**: du behöver Account SID, Auth Token och ett Twilio-nummer.

### 2. (Valfritt men rekommenderat) Skaffa en Claude API-nyckel
Skapa en nyckel på console.anthropic.com. Med den genereras en ny, personligt anpassad idé varje dag. Utan nyckel används det inbyggda biblioteket.

### 3. Lägg in hemligheterna i GitHub
Gå till repot → **Settings → Secrets and variables → Actions**.

**Secrets:**
| Namn | Värde |
|---|---|
| `SMS_TO` | Ditt mobilnummer i formatet `+46701234567` |
| `ELKS_API_USERNAME` / `ELKS_API_PASSWORD` | Från 46elks |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Bara om du använder Twilio |
| `ANTHROPIC_API_KEY` | Din Claude-nyckel (valfri) |

**Variables** (fliken bredvid, valfria):
| Namn | Värde |
|---|---|
| `SMS_PROVIDER` | `46elks` (standard) eller `twilio` |
| `SMS_FROM` | Avsändarnamn, t.ex. `DagensIde` (max 11 tecken). För Twilio: ditt Twilio-nummer |

### 4. Slå ihop till huvudgrenen
GitHub kör schemalagda workflows bara från repots standardgren (`main`). Merga den här grenen dit.

### 5. Testa
Gå till **Actions → Dagens idé (SMS) → Run workflow**, kryssa i *force* och kör. Om allt är rätt inställt kommer ett SMS inom någon minut.

## Anpassa

Redigera `config.json`:
- `interests`: ämnen du vill lära dig om
- `favorite_sources`: böcker eller författare du gillar
- `send_hour`: vilken timme SMS:et ska komma (svensk tid)
- `weekly_review_day`: dag för repetition (`sunday`), eller `""` för att stänga av
- `max_sms_chars`: maxlängd. Svenska tecken (å, ä, ö) och emojis gör att ett SMS-segment rymmer cirka 70 tecken, så 600 tecken motsvarar ungefär 8–9 segment.

Lägg till egna idéer i `ideas_library.json`.

## Köra lokalt

```bash
pip install -r requirements.txt
python daily_idea.py --dry-run     # visar dagens SMS utan att skicka
```

## Kostnad (ungefär)
- GitHub Actions: gratis
- 46elks: cirka 0,35 kr per SMS-segment, alltså några kronor om dagen för långa meddelanden. Kortare `max_sms_chars` ger billigare SMS.
- Claude: några öre per dag

## Idéer för nästa steg
- Svara på SMS:et med "⭐" för att spara en idé som favorit (kräver en liten webhook-server)
- Veckobrev via e-post med veckans alla idéer
- Spaced repetition: favoriter kommer tillbaka efter 1, 7 och 30 dagar
