#!/usr/bin/env python3
"""
Lot 0.5 — Backfill ETL FOLIO agent → KREDO
═══════════════════════════════════════════════════════════════════════════════
Rapatrie les études sectorielles (phase 2) et les pitchs depuis
agent_business_analyst (projet FOLIO) vers public.companies.metadata dans KREDO.

Stockage temporaire dans metadata (clés sector_analysis + pitches) :
→ ces données seront migrées vers les tables ai_intelligence_* lors du Lot 1.

Usage :
  export FOLIO_AGENT_SERVICE_ROLE="eyJ..."
  python3 scripts/backfill-folio-intelligence.py

Le script est idempotent : relançable sans risque.
═══════════════════════════════════════════════════════════════════════════════
"""

import os, json, time, sys
from pathlib import Path
import urllib.request, urllib.error

# ── Config ────────────────────────────────────────────────────────────────────

FOLIO_URL = "https://ssrxraibinzmpndzudrs.supabase.co"
FOLIO_KEY = os.environ.get("FOLIO_AGENT_SERVICE_ROLE", "")

KREDO_URL = "https://jvzgmhvwirsbdkjpmvla.supabase.co"
KREDO_KEY = ""

REPORT_PATH = Path(__file__).parent / "backfill-report.json"

# ── Lecture de la service_role KREDO depuis .env.local ───────────────────────

def read_kredo_service_role():
    env_path = Path(__file__).parent.parent / ".env.local"
    if not env_path.exists():
        print(f"❌  .env.local introuvable : {env_path}")
        sys.exit(1)
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            val = line.split("=", 1)[1].strip().strip('"').strip("'")
            if val:
                return val
    print("❌  SUPABASE_SERVICE_ROLE_KEY absent du .env.local")
    sys.exit(1)

# ── HTTP helpers ──────────────────────────────────────────────────────────────

def http_get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code} — {body[:200]}")

def folio_get(table, params=""):
    url = f"{FOLIO_URL}/rest/v1/{table}{'?' + params if params else ''}"
    data, _ = http_get(url, {
        "apikey": FOLIO_KEY,
        "Authorization": f"Bearer {FOLIO_KEY}",
        "Accept-Profile": "agent_business_analyst",
    })
    return data

def kredo_get(table, params=""):
    url = f"{KREDO_URL}/rest/v1/{table}{'?' + params if params else ''}"
    data, _ = http_get(url, {
        "apikey": KREDO_KEY,
        "Authorization": f"Bearer {KREDO_KEY}",
    })
    return data

def kredo_patch(table, data, params=""):
    url = f"{KREDO_URL}/rest/v1/{table}{'?' + params if params else ''}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": KREDO_KEY,
        "Authorization": f"Bearer {KREDO_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} — {e.read().decode()[:200]}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    global KREDO_KEY

    # Guards
    if not FOLIO_KEY:
        print("❌  Variable FOLIO_AGENT_SERVICE_ROLE non définie.")
        print("    Lance : export FOLIO_AGENT_SERVICE_ROLE='eyJ...'")
        sys.exit(1)

    KREDO_KEY = read_kredo_service_role()

    print()
    print("═" * 62)
    print("  Lot 0.5 — Backfill FOLIO agent → KREDO")
    print("═" * 62)

    # ── 1. Comptes KREDO avec legacy_prospect_id ─────────────────────────────
    print("\n[1/5] Chargement des comptes KREDO...")
    companies = kredo_get("companies", "select=id,name,metadata&limit=200")
    prospect_map = {}   # legacy_prospect_id (str) → company dict
    for c in companies:
        lpid = (c.get("metadata") or {}).get("legacy_prospect_id")
        if lpid:
            prospect_map[str(lpid)] = c
    print(f"      {len(prospect_map)} comptes avec legacy_prospect_id")

    # ── 2. Clients FOLIO avec source_prospect_id ─────────────────────────────
    print("\n[2/5] Chargement des clients FOLIO agent...")
    clients = folio_get("clients",
        "select=id,source_prospect_id&source_prospect_id=not.is.null&limit=200")
    client_map = {}     # source_prospect_id (str) → client_id
    for cl in clients:
        spid = cl.get("source_prospect_id")
        if spid:
            client_map[str(spid)] = cl["id"]
    print(f"      {len(client_map)} clients FOLIO avec source_prospect_id")

    # ── 3. Dernières missions par client_id ───────────────────────────────────
    print("\n[3/5] Chargement des missions FOLIO...")
    missions_raw = folio_get("missions",
        "select=id,client_id,created_at&order=created_at.desc&limit=1000")
    latest_mission = {}     # client_id → mission_id (premier = le plus récent)
    for m in missions_raw:
        cid = m["client_id"]
        if cid not in latest_mission:
            latest_mission[cid] = m["id"]
    print(f"      {len(latest_mission)} missions ({len(missions_raw)} au total)")

    # ── 4. Études sectorielles phase 2 ───────────────────────────────────────
    print("\n[4/5] Chargement des études sectorielles (phase 2)...")
    results_raw = folio_get("resultats_phases",
        "select=id,mission_id,phase,statut,contenu_json,completed_at,updated_at,"
        "tokens_input,tokens_output,cout_estime"
        "&phase=eq.2&contenu_json=not.is.null&limit=200")
    sector_by_mission = {}  # mission_id → result dict
    for r in results_raw:
        sector_by_mission[r["mission_id"]] = r
    print(f"      {len(sector_by_mission)} études sectorielles exploitables")

    # ── 5. Pitchs ─────────────────────────────────────────────────────────────
    print("\n[5/5] Chargement des pitchs...")
    pitch_by_mission = {}   # mission_id → list of pitch dicts
    try:
        pitches_raw = folio_get("pitch_prospection",
            "select=id,mission_id,destinataire,ton,format_mail,objet_mail,"
            "corps_mail,points_cles,statut,completed_at"
            "&statut=in.(review,completed)&limit=200")
        for p in pitches_raw:
            mid = p.get("mission_id")
            if mid:
                pitch_by_mission.setdefault(mid, []).append(p)
        print(f"      {len(pitches_raw)} pitchs (sur {len(pitch_by_mission)} missions)")
    except Exception as e:
        print(f"      ⚠️  Pitchs ignorés ({e})")

    # ── Application dans KREDO ────────────────────────────────────────────────
    print()
    print("─" * 62)
    print("  Application dans KREDO companies.metadata")
    print("─" * 62)

    matched = skipped = errors = 0
    report = []

    for prospect_id, company in prospect_map.items():
        company_id   = company["id"]
        company_name = company["name"]

        client_id  = client_map.get(prospect_id)
        mission_id = latest_mission.get(client_id) if client_id else None
        sector     = sector_by_mission.get(mission_id) if mission_id else None
        pitches    = pitch_by_mission.get(mission_id, []) if mission_id else []

        if not sector and not pitches:
            skipped += 1
            report.append({"company": company_name, "status": "skipped",
                            "reason": "no sector analysis and no pitches"})
            continue

        # Merge dans le metadata existant (on préserve toutes les clés existantes)
        patch = dict(company.get("metadata") or {})

        if sector:
            patch["sector_analysis"]              = sector.get("contenu_json")
            patch["sector_analysis_status"]        = sector.get("statut")
            patch["sector_analysis_at"]            = (sector.get("completed_at")
                                                       or sector.get("updated_at"))
            patch["sector_analysis_tokens_input"]  = sector.get("tokens_input")
            patch["sector_analysis_tokens_output"] = sector.get("tokens_output")
            patch["sector_analysis_cost"]          = str(sector.get("cout_estime") or "")

        if pitches:
            patch["pitches"] = [{
                "id":           p.get("id"),
                "destinataire": p.get("destinataire"),
                "ton":          p.get("ton"),
                "format_mail":  p.get("format_mail"),
                "objet_mail":   p.get("objet_mail"),
                "corps_mail":   p.get("corps_mail"),
                "points_cles":  p.get("points_cles"),
                "statut":       p.get("statut"),
                "completed_at": p.get("completed_at"),
            } for p in pitches]

        try:
            kredo_patch("companies", {"metadata": patch}, f"id=eq.{company_id}")
            sector_ok = "✅" if sector else "—"
            pitch_n   = len(pitches)
            print(f"  ✅  {company_name[:42]:<42} | secteur {sector_ok} | pitchs {pitch_n}")
            matched += 1
            report.append({"company": company_name, "status": "ok",
                            "sector": bool(sector), "pitches": len(pitches)})
        except Exception as e:
            print(f"  ❌  {company_name[:42]:<42} | {e}")
            errors += 1
            report.append({"company": company_name, "status": "error", "error": str(e)})

        time.sleep(0.05)    # rate limit léger

    # ── Rapport ───────────────────────────────────────────────────────────────
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2))

    print()
    print("═" * 62)
    print(f"  ✅  Mis à jour : {matched}")
    print(f"  ⏭️   Ignorés   : {skipped}  (pas de données sectorielles)")
    print(f"  ❌  Erreurs   : {errors}")
    print(f"  📄  Rapport   : scripts/backfill-report.json")
    print("═" * 62)

    if errors == 0:
        print()
        print("  Backfill terminé sans erreur.")
        print("  Les données sont dans companies.metadata :")
        print("    • sector_analysis       — étude sectorielle (JSON)")
        print("    • sector_analysis_at    — date de génération")
        print("    • pitches               — pitchs (tableau)")
        print()
        print("  Prochaine étape → Lot 1 : migration ai_intelligence_*")
    else:
        print(f"\n  ⚠️  {errors} erreur(s). Le script est idempotent, relance-le.")

    print()

if __name__ == "__main__":
    main()
