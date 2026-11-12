"""Dagens idé – ett "Deepstash via SMS".

Varje morgon väljs (eller genereras med Claude) en kort, kraftfull idé från en bok,
artikel, podcast eller studie och skickas som SMS. På söndagar skickas en
repetition av en tidigare idé, så att kunskapen fastnar.

Kör:  python daily_idea.py            (skickar om klockan passerat send_hour och inget skickats idag)
      python daily_idea.py --dry-run  (skriver ut SMS:et utan att skicka)
      python daily_idea.py --force    (skickar direkt, oavsett tid)
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

ROOT = Path(__file__).parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
LIBRARY_PATH = ROOT / "ideas_library.json"
HISTORY_PATH = ROOT / "history.json"

WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


# ---------- Historik ----------

def load_history() -> list[dict]:
    if HISTORY_PATH.exists():
        return json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    return []


def save_history(history: list[dict]) -> None:
    HISTORY_PATH.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------- Idékällor ----------

def generate_with_claude(history: list[dict]) -> dict | None:
    """Be Claude om en ny idé anpassad efter intressen, som inte upprepar tidigare."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
    except ImportError:
        return None

    recent = [f"{h['title']} ({h['source']})" for h in history[-60:]]
    topic = random.choice(CONFIG["interests"])
    max_chars = CONFIG["max_sms_chars"]

    prompt = f"""Du är redaktör för en tjänst som liknar Deepstash: varje morgon får läsaren
EN kort, kraftfull idé hämtad från en riktig bok, artikel, podcast eller vetenskaplig studie.
Målet är att läsaren ska bli lite klokare varje dag på under en minut, och kunna använda idén direkt.

Dagens ämne: {topic}
Läsarens favoritkällor (för inspiration, men variera gärna med andra kvalitetskällor):
{", ".join(CONFIG["favorite_sources"])}

Idéer läsaren redan fått (upprepa INTE dessa, varken titel eller kärnidé):
{chr(10).join("- " + r for r in recent) or "- (inga ännu)"}

Krav:
- Språk: {CONFIG["language"]}.
- Källan måste vara verklig och korrekt attribuerad (titel – författare). Hitta inte på citat eller siffror.
- Idén ska vara konkret och överraskande, inte en allmän klyscha.
- "takeaway" är en enda handling läsaren kan göra idag.
- Hela SMS:et (titel + idé + takeaway + källa) ska få plats på max {max_chars} tecken.

Svara ENDAST med JSON på formen:
{{"title": "...", "idea": "...", "takeaway": "...", "source": "Titel – Författare", "topic": "..."}}"""

    client = anthropic.Anthropic()
    try:
        response = client.beta.messages.create(
            model="claude-opus-5-5",
            max_tokens=4000,
            output_config={"effort": "medium"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as e:
        print(f"Claude-anrop misslyckades, använder biblioteket istället: {e}", file=sys.stderr)
        return None

    if response.stop_reason == "refusal":
        return None
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        idea = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not all(k in idea for k in ("title", "idea", "takeaway", "source")):
        return None
    return idea


def pick_from_library(history: list[dict]) -> dict:
    library = json.loads(LIBRARY_PATH.read_text(encoding="utf-8"))
    sent_titles = {h["title"] for h in history}
    unused = [i for i in library if i["title"] not in sent_titles]
    if not unused:  # Alla använda – börja om, men undvik de senaste 10
        recent = {h["title"] for h in history[-10:]}
        unused = [i for i in library if i["title"] not in recent] or library
    return random.choice(unused)


def pick_review(history: list[dict]) -> dict | None:
    """Repetition: plocka en idé som skickades för minst 7 dagar sedan."""
    candidates = [h for h in history[:-7] if h.get("kind") != "review"]
    return random.choice(candidates) if candidates else None


# ---------- SMS ----------

def format_sms(idea: dict, review: bool = False) -> str:
    header = "🔁 Veckans repetition" if review else "💡 Dagens idé"
    msg = (
        f"{header}: {idea['title']}\n\n"
        f"{idea['idea']}\n\n"
        f"👉 {idea['takeaway']}\n\n"
        f"📖 {idea['source']}"
    )
    limit = CONFIG["max_sms_chars"]
    return msg if len(msg) <= limit else msg[: limit - 1] + "…"


def send_sms(message: str) -> None:
    to = os.environ["SMS_TO"]
    provider = os.environ.get("SMS_PROVIDER", "46elks").lower()

    if provider == "46elks":
        r = requests.post(
            "https://api.46elks.com/a1/sms",
            auth=(os.environ["ELKS_API_USERNAME"], os.environ["ELKS_API_PASSWORD"]),
            data={"from": os.environ.get("SMS_FROM", "DagensIde"), "to": to, "message": message},
            timeout=30,
        )
    elif provider == "twilio":
        sid = os.environ["TWILIO_ACCOUNT_SID"]
        r = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            auth=(sid, os.environ["TWILIO_AUTH_TOKEN"]),
            data={"From": os.environ["SMS_FROM"], "To": to, "Body": message},
            timeout=30,
        )
    else:
        raise SystemExit(f"Okänd SMS_PROVIDER: {provider} (använd 46elks eller twilio)")

    if r.status_code >= 300:
        raise SystemExit(f"SMS misslyckades ({r.status_code}): {r.text}")
    print("SMS skickat.")


# ---------- Main ----------

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Visa SMS:et utan att skicka")
    parser.add_argument("--force", action="store_true", help="Skicka oavsett tid/historik")
    args = parser.parse_args()

    now = datetime.now(ZoneInfo(CONFIG["timezone"]))
    today = now.date().isoformat()
    history = load_history()

    if not args.force and not args.dry_run:
        if any(h["date"] == today for h in history):
            print("Redan skickat idag – hoppar över.")
            return
        if now.hour < CONFIG["send_hour"]:
            print(f"Klockan är {now:%H:%M}, väntar till {CONFIG['send_hour']}:00.")
            return

    is_review_day = WEEKDAYS[now.weekday()] == CONFIG.get("weekly_review_day")
    review = pick_review(history) if is_review_day else None

    if review:
        idea, kind = review, "review"
    else:
        idea = generate_with_claude(history) or pick_from_library(history)
        kind = "new"

    message = format_sms(idea, review=kind == "review")
    print(message)
    print(f"\n({len(message)} tecken)")

    if args.dry_run:
        return

    send_sms(message)
    history.append({
        "date": today,
        "kind": kind,
        "title": idea["title"],
        "idea": idea["idea"],
        "takeaway": idea["takeaway"],
        "source": idea["source"],
        "topic": idea.get("topic", ""),
    })
    save_history(history)


if __name__ == "__main__":
    main()
