# 💡 Dagens idé – Deepstash via Claude

Varje morgon får du här i Claude **en kort, kraftfull idé** från en bok, artikel, podcast eller studie, plus en sak du kan göra med den samma dag.

## Vad Deepstash vill uppnå, och hur appen gör det

| Deepstash | Den här appen |
|---|---|
| Insikter från böcker, artiklar och poddar destillerade till "bite-sized ideas" | Varje meddelande är en idé med källa (titel – författare) |
| "Lär dig något nytt på 5 minuter om dagen", alltså en daglig vana | Ett meddelande i Claude varje morgon, går att läsa på under en minut |
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

## Så levereras idén: via Claude (gratis)

Varje morgon kl. 06:50 (svensk tid) startar en schemalagd uppgift i Claude-konversationen. Claude:
1. läser `config.json` (dina intressen) och `history.json` (vad du redan fått),
2. skriver dagens idé direkt i chatten (på söndagar en repetition av en äldre idé),
3. sparar idén i `history.json` och pushar, så att ingen idé upprepas.

Det kostar inga SMS-avgifter och kräver ingen API-nyckel, eftersom allt ingår i Claude-abonnemanget.
Den schemalagda uppgiften hanterar du i Claude-appen under schemalagda uppgifter.

### (Valfritt) SMS istället
`daily_idea.py` kan fortfarande skicka SMS via 46elks eller Twilio
(miljövariablerna `SMS_TO`, `ELKS_API_USERNAME`, `ELKS_API_PASSWORD`, eventuellt `ANTHROPIC_API_KEY`),
till exempel från en GitHub Actions-workflow eller ett cron-jobb.

## Anpassa

Redigera `config.json`:
- `interests`: ämnen du vill lära dig om
- `favorite_sources`: böcker eller författare du gillar
- `send_hour`: används bara av SMS-varianten (tiden i Claude styrs av den schemalagda uppgiften)
- `weekly_review_day`: dag för repetition (`sunday`), eller `""` för att stänga av
- `max_sms_chars`: maxlängd på meddelandet

Lägg till egna idéer i `ideas_library.json`.

## Köra lokalt

```bash
pip install -r requirements.txt
python daily_idea.py --dry-run     # visar dagens SMS utan att skicka
```

## Idéer för nästa steg
- Svara "⭐" på dagens idé i chatten för att spara den som favorit
- Veckobrev via e-post med veckans alla idéer
- Spaced repetition: favoriter kommer tillbaka efter 1, 7 och 30 dagar
