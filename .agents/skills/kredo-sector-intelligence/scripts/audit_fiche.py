#!/usr/bin/env python3
"""
audit_fiche.py — Gate 3 mécanique d'une étude sectorielle KREDO.

Note la moitié objective de la grille de docs/PROCESS-ETUDE-SECTORIELLE.md §10
sur un brouillon JSON, AVANT injection en base.

Pourquoi ce script existe : l'agent qui vient de produire une fiche est le plus
mal placé pour la noter. Il la trouve bonne — il vient de l'écrire. Tout ce qui
est comptable (sources présentes, longueur des titres, accents, cohérence
fréquence/preuves, plafond de score) est donc calculé ici, sans état d'âme, et
n'est pas laissé à l'appréciation.

Ce qui reste au jugement (25 pts) est listé en fin de rapport, avec ses
préconditions mécaniques déjà vérifiées.

Aucune dépendance : stdlib seulement, python3.8+.

    python3 audit_fiche.py brouillon.json
    python3 audit_fiche.py --schema
    python3 audit_fiche.py brouillon.json --json      # sortie machine
    python3 audit_fiche.py brouillon.json --today 2026-07-16
"""

import argparse
import datetime as dt
import json
import re
import sys

# ── Barème (miroir de §10.1) ────────────────────────────────────────────────
# Mécanique = calculable sans jugement. Jugement = laissé à l'agent/humain.
#
# Le partage entre les deux n'est pas fixe : B3, D1 et D2 basculent en mécanique
# (et tombent à 0) quand leur précondition échoue — un angle commercial vide ou
# un persona sans peur n'a rien à juger. Les totaux sont donc calculés à
# l'exécution, jamais posés en constante.
INJECT_THRESHOLD = 70
AXIS_A_MAX = 35
AXIS_A_REJECT_BELOW = 20

# Plafonds de score par classe de corpus (§6.3)
CORPUS_CEILINGS = {"riche": 5.0, "moyen": 4.5, "mince": 4.0, "vide": 3.5}
NO_REGULATORY_CEILING = 3.5  # Gate 2 échoué (§6.3)

MAX_PAIN_TITLE_LEN = 60  # §8.2 — le titre est lu à voix haute dans le pitch

# Mots français dont la forme sans accent ne peut pas être légitime.
# Détecte la désaccentuation défensive qui est réellement partie en production
# sur nutraceutique-sante-naturelle (§7.2) — un test "aucun accent du tout"
# produirait des faux positifs, une liste de marqueurs est bien plus précise.
DESACCENT_MARKERS = [
    "reglementaire", "reglementaires", "reglementation", "reglement",
    "tracabilite", "echeance", "echeances", "referentiel", "referentiels",
    "conformite", "securite", "qualite", "strategie", "strategique",
    "donnees", "annees", "developpement", "complementaire", "proprietaire",
    "activite", "specialise", "specificite", "prealable", "decouvrir",
    "generation", "integrite", "apres", "deja", "tres", "etre", "meme",
]
DESACCENT_RE = re.compile(
    r"\b(" + "|".join(DESACCENT_MARKERS) + r")\b", re.IGNORECASE
)

# Une source citée dans le texte de l'argument (§6.2), pas en annexe.
# On teste l'intention, pas le gabarit : « Source: Synadiet, janvier 2026 » et
# « (validé sur diagnostic Robertet) » répondent aussi bien l'un que l'autre à
# « vous tenez ça d'où ? » — n'accepter que le premier serait un faux négatif
# sur des arguments réellement défendables.
SOURCE_RE = re.compile(
    r"\bsources?\s*:"
    r"|\b(valid|vérifi|verifi|constat|mesur|observ)\w*\s+(sur|chez|lors)\b"
    r"|\bd['’]après\b|\bd['’]apres\b|\bselon\b",
    re.IGNORECASE,
)

# Reformulation honnête d'un ROI non sourcé — vaut une source (§6.2).
ESTIMATE_RE = re.compile(r"\b(estim|à valider|a valider|potentiel)", re.IGNORECASE)

ENTRY_POINT_ARCHETYPES = {
    "reglementaire": ("reglementaire", "réglementaire"),
    "quick_win": ("quick-win", "quick win"),
    "transformation": ("transformation", "patrimoine", "structurant"),
    "reseau": ("reseau", "réseau"),
}


class Check:
    """Un critère de la grille."""

    def __init__(self, code, label, points, max_points, kind, evidence):
        self.code = code
        self.label = label
        self.points = points
        self.max_points = max_points
        self.kind = kind  # "mecanique" | "jugement"
        self.evidence = evidence

    @property
    def ok(self):
        return self.points >= self.max_points

    def as_dict(self):
        return {
            "code": self.code,
            "label": self.label,
            "points": self.points,
            "max_points": self.max_points,
            "kind": self.kind,
            "evidence": self.evidence,
        }


def scaled(numerator, denominator, max_points):
    """Barème linéaire. Les ancres de §10.1 tombent juste : 3/5 → 6/10, 1/2 → 5/10."""
    if denominator == 0:
        return 0
    return int(round(max_points * numerator / denominator))


def find_desaccented(text):
    if not isinstance(text, str):
        return []
    return sorted({m.group(0).lower() for m in DESACCENT_RE.finditer(text)})


def walk_strings(node, path="$"):
    """Parcourt tout le brouillon et rend (chemin, texte) pour chaque chaîne."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, dict):
        for key, value in node.items():
            yield from walk_strings(value, f"{path}.{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from walk_strings(value, f"{path}[{index}]")


def parse_date(value):
    if not value:
        return None
    try:
        return dt.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


# ── Axe A — Traçabilité (35 pts, 100 % mécanique) ───────────────────────────
# C'est l'axe du rejet automatique. Qu'il soit entièrement objectif n'est pas
# un hasard : "est-ce sourcé ?" se compte, ça ne se discute pas.

def check_a1(draft):
    args = draft.get("playbook", {}).get("roi_arguments", []) or []
    if not args:
        return Check("A1", "Chaque argument ROI porte sa source dans son texte", 0, 10,
                     "mecanique", "Aucun argument ROI.")
    sourced = [a for a in args if isinstance(a, str) and (SOURCE_RE.search(a) or ESTIMATE_RE.search(a))]
    unsourced = [a for a in args if a not in sourced]
    pts = scaled(len(sourced), len(args), 10)
    ev = f"{len(sourced)}/{len(args)} argument(s) sourcé(s) ou reformulé(s) en estimation."
    if unsourced:
        ev += " Sans source : " + " | ".join(f'"{a[:70]}…"' for a in unsourced[:3])
    return Check("A1", "Chaque argument ROI porte sa source dans son texte", pts, 10, "mecanique", ev)


def check_a2(draft):
    pains = draft.get("pain_points", []) or []
    if not pains:
        return Check("A2", "source_company_ids peuplé sur tous les pain points", 0, 10,
                     "mecanique", "Aucun pain point.")
    traced = [p for p in pains if p.get("source_company_ids")]
    pts = scaled(len(traced), len(pains), 10)
    ev = f"{len(traced)}/{len(pains)} pain point(s) avec preuve de comptage."
    missing = [p.get("title", "?") for p in pains if not p.get("source_company_ids")]
    if missing:
        ev += (" Sans preuve : " + " | ".join(missing[:3])
               + " — la fréquence de ces points sera invérifiable à jamais,"
                 " et l'insertion échouera (colonne NOT NULL).")
    return Check("A2", "source_company_ids peuplé sur tous les pain points", pts, 10, "mecanique", ev)


def check_a3(draft):
    items = draft.get("reglementation", []) or []
    dated = [i for i in items if parse_date(i.get("deadline_date"))]
    if not dated:
        return Check("A3", "Chaque deadline vérifiée sur source officielle", 0, 10, "mecanique",
                     "Aucune échéance datée — rien à vérifier (voir B1).")
    verified = [i for i in dated if i.get("source_url")]
    pts = scaled(len(verified), len(dated), 10)
    ev = f"{len(verified)}/{len(dated)} échéance(s) datée(s) avec source officielle."
    unverified = [i.get("name", "?") for i in dated if not i.get("source_url")]
    if unverified:
        ev += (" Sans source : " + " | ".join(unverified[:3])
               + " — une date non confirmée n'est pas une date : passe-la à NULL"
                 " et écris « échéance à confirmer ».")
    return Check("A3", "Chaque deadline vérifiée sur source officielle", pts, 10, "mecanique", ev)


def check_a4(draft):
    caveats = draft.get("caveats") or {}
    filled = [k for k, v in caveats.items() if v and (not isinstance(v, str) or v.strip())]
    if not filled:
        return Check("A4", "Section caveats rédigée", 0, 5, "mecanique",
                     "Aucun caveat. Une fiche sans trous déclarés est une fiche qui les cache.")
    return Check("A4", "Section caveats rédigée", 5, 5, "mecanique",
                 f"Caveats renseignés : {', '.join(sorted(filled))}."
                 " (Leur honnêteté reste à ton jugement — le script ne vérifie que la présence.)")


# ── Axe B — La fenêtre (20 pts) ─────────────────────────────────────────────

def check_b1(draft):
    items = draft.get("reglementation", []) or []
    dated = [i for i in items if parse_date(i.get("deadline_date"))]
    n = len(dated)
    pts = 10 if n >= 3 else (5 if n >= 1 else 0)
    return Check("B1", "≥3 items réglementaires avec date précise", pts, 10, "mecanique",
                 f"{n} échéance(s) datée(s) sur {len(items)} item(s)."
                 + ("" if n >= 3 else " Sous 3, la fiche perd son étage n°1 : plafond de score à 3.5."))


def check_b2(draft, today):
    items = draft.get("reglementation", []) or []
    horizon = today + dt.timedelta(days=365)
    hot = [
        i for i in items
        if i.get("urgency") in ("critical", "high")
        and (d := parse_date(i.get("deadline_date")))
        and today <= d <= horizon
    ]
    pts = 5 if hot else 0
    ev = (f"{len(hot)} échéance(s) critical/high dans les 12 mois : "
          + ", ".join(i.get("name", "?") for i in hot[:3])) if hot else (
        "Aucune échéance critical/high dans les 12 mois — rien qui crée l'urgence du rendez-vous.")
    return Check("B2", "≥1 échéance critical/high dans les 12 mois", pts, 5, "mecanique", ev)


def check_b3(draft):
    items = draft.get("reglementation", []) or []
    if not items:
        return Check("B3", "commercial_angle rempli et spécifique", 0, 5, "mecanique",
                     "Aucun item réglementaire.")
    empty = [i.get("name", "?") for i in items
             if not (i.get("commercial_angle") or "").strip()]
    if empty:
        return Check("B3", "commercial_angle rempli et spécifique", 0, 5, "mecanique",
                     "Angle commercial manquant sur : " + " | ".join(empty[:3])
                     + ". Une échéance sans réponse KREDO n'est pas un point d'entrée.")
    return Check("B3", "commercial_angle rempli et spécifique", None, 5, "jugement",
                 f"Les {len(items)} angles sont remplis (précondition OK)."
                 " À toi de juger s'ils sont spécifiques ou interchangeables.")


# ── Axe C — La douleur (20 pts) ─────────────────────────────────────────────

def check_c1(draft):
    n = len(draft.get("pain_points", []) or [])
    pts = 5 if 5 <= n <= 8 else (3 if 3 <= n <= 4 else (1 if 1 <= n <= 2 else 0))
    ev = f"{n} pain point(s)."
    if n > 8:
        ev += " Au-delà de 8, tu as probablement complété avec du plausible."
    elif n < 5:
        ev += " Sous 5 : acceptable si le corpus est mince, à condition de le dire en caveat."
    return Check("C1", "5-8 pain points", pts, 5, "mecanique", ev)


def check_c2(draft):
    pains = draft.get("pain_points", []) or []
    if not pains:
        return Check("C2", "Titres ≤60 car., oraux, accentués", 0, 8, "mecanique", "Aucun pain point.")
    problems = []
    for p in pains:
        title = p.get("title", "") or ""
        faults = []
        if len(title) > MAX_PAIN_TITLE_LEN:
            faults.append(f"{len(title)} car.")
        bad = find_desaccented(title)
        if bad:
            faults.append("désaccentué : " + ", ".join(bad))
        if faults:
            problems.append(f'"{title[:55]}…" → ' + " ; ".join(faults))
    pts = max(0, 8 - 2 * len(problems))
    if problems:
        ev = (f"{len(problems)}/{len(pains)} titre(s) en faute (-2 chacun). "
              + " | ".join(problems[:4])
              + " — rappel : ce titre est lu à voix haute, le pitch en est dérivé (§8.2).")
    else:
        ev = f"Les {len(pains)} titres tiennent en {MAX_PAIN_TITLE_LEN} caractères et sont accentués."
    ev += " Leur caractère vague ou générique reste à ton jugement (ça ne peut que baisser la note)."
    return Check("C2", "Titres ≤60 car., oraux, accentués", pts, 8, "mecanique", ev)


def check_c3(draft):
    pains = draft.get("pain_points", []) or []
    with_verbatim = [p for p in pains if (p.get("verbatim") or "").strip()]
    caveat = (draft.get("caveats") or {}).get("verbatims")
    if with_verbatim:
        return Check("C3", "≥1 verbatim réel, ou caveat explicite sur leur absence", 4, 4, "mecanique",
                     f"{len(with_verbatim)} verbatim(s).")
    if caveat and str(caveat).strip():
        return Check("C3", "≥1 verbatim réel, ou caveat explicite sur leur absence", 4, 4, "mecanique",
                     "Aucun verbatim, mais l'absence est déclarée en caveat — c'est la conduite attendue.")
    return Check("C3", "≥1 verbatim réel, ou caveat explicite sur leur absence", 0, 4, "mecanique",
                 "Ni verbatim, ni caveat déclarant leur absence. N'en invente pas : déclare le trou.")


def check_c4(draft):
    """frequency_count doit égaler le nombre de comptes cités : c'est la définition d'un comptage."""
    pains = draft.get("pain_points", []) or []
    if not pains:
        return Check("C4", "frequency_count = comptage réel", 0, 3, "mecanique", "Aucun pain point.")
    mismatches = []
    for p in pains:
        ids = p.get("source_company_ids") or []
        freq = p.get("frequency_count")
        if freq is None or len(ids) != freq:
            mismatches.append(f'"{p.get("title", "?")[:40]}" → freq={freq}, {len(ids)} compte(s) cité(s)')
    pts = 0 if mismatches else 3
    ev = ("Incohérence(s) : " + " | ".join(mismatches[:3])
          + " — si la fréquence ne correspond pas aux comptes listés, ce n'est pas un comptage,"
            " c'est une impression."
          ) if mismatches else f"Les {len(pains)} fréquences correspondent aux comptes cités."
    return Check("C4", "frequency_count = comptage réel", pts, 3, "mecanique", ev)


# ── Axe D — La bascule (15 pts, jugement) ───────────────────────────────────

def check_d1(draft):
    personas = draft.get("playbook", {}).get("personas", []) or []
    missing = [p.get("role", "?") for p in personas if not (p.get("peur") or "").strip()]
    if not personas:
        return Check("D1", "4 personas avec de vraies peurs", 0, 5, "mecanique", "Aucun persona.")
    if missing:
        return Check("D1", "4 personas avec de vraies peurs", 0, 5, "mecanique",
                     "Peur manquante sur : " + ", ".join(missing))
    return Check("D1", "4 personas avec de vraies peurs", None, 5, "jugement",
                 f"{len(personas)} persona(s), tous avec une peur (précondition OK)."
                 " À juger : est-ce une vraie peur, ou l'enjeu reformulé à la négative ? (-1 chacun)"
                 " Test : remplaçable par « audit raté » / « perte de confiance du COMEX » ?")


def check_d2(draft):
    objections = draft.get("playbook", {}).get("objections", []) or []
    if len(objections) < 3:
        return Check("D2", "3 objections spécifiques au métier", 0, 5, "mecanique",
                     f"{len(objections)} objection(s) — il en faut 3.")
    return Check("D2", "3 objections spécifiques au métier", None, 5, "jugement",
                 f"{len(objections)} objections (précondition OK)."
                 " À juger : spécifiques au métier, ou génériques ? (-2 chacune)"
                 " « C'est trop cher » = tu n'as pas creusé.")


def check_d3(draft):
    entries = draft.get("playbook", {}).get("entry_points", []) or []
    blob = " ".join(e.lower() for e in entries if isinstance(e, str))
    found = {name for name, keys in ENTRY_POINT_ARCHETYPES.items()
             if any(k in blob for k in keys)}
    missing = set(ENTRY_POINT_ARCHETYPES) - found
    pts = max(0, 5 - len(missing))
    ev = f"{len(entries)} point(s) d'entrée. Archétypes détectés : {', '.join(sorted(found)) or 'aucun'}."
    if missing:
        ev += f" Manquant(s) : {', '.join(sorted(missing))} (-1 chacun)."
    return Check("D3", "4 entry points, un par archétype", pts, 5, "mecanique", ev)


# ── Axe E — Cohérence (10 pts) ──────────────────────────────────────────────

def resolve_ceiling(draft):
    corpus = (draft.get("corpus") or "").strip().lower()
    ceiling = CORPUS_CEILINGS.get(corpus)
    reason = f"corpus {corpus or '(non déclaré)'}"
    if ceiling is None:
        return None, "corpus non déclaré — impossible de vérifier le plafond"
    dated = [i for i in (draft.get("reglementation") or []) if parse_date(i.get("deadline_date"))]
    if len(dated) < 3 and NO_REGULATORY_CEILING < ceiling:
        return NO_REGULATORY_CEILING, f"{reason}, mais moins de 3 échéances datées (Gate 2 échoué)"
    return ceiling, reason


def check_e1(draft):
    score = draft.get("score")
    ceiling, reason = resolve_ceiling(draft)
    if score is None:
        return Check("E1", "Score cohérent avec le plafond de corpus", 0, 5, "mecanique",
                     "Aucun score déclaré.")
    if ceiling is None:
        return Check("E1", "Score cohérent avec le plafond de corpus", 0, 5, "mecanique",
                     "Corpus non déclaré : déclare riche | moyen | mince | vide.")
    if score > ceiling:
        return Check("E1", "Score cohérent avec le plafond de corpus", 0, 5, "mecanique",
                     f"Score {score} > plafond {ceiling} ({reason}). Le plafond bat toujours le calcul.")
    return Check("E1", "Score cohérent avec le plafond de corpus", 5, 5, "mecanique",
                 f"Score {score} ≤ plafond {ceiling} ({reason}).")


def check_e2(draft):
    n = len(draft.get("companies", []) or [])
    return Check("E2", "Aucun compte manifestement hors secteur", None, 3, "jugement",
                 f"{n} compte(s) rattaché(s). Relis la liste : un seul intrus décrédibilise toute la fiche.")


def check_e3(draft):
    fit = draft.get("practices_fit") or {}
    return Check("E3", "practices_fit honnête", None, 2, "jugement",
                 f"practices_fit = {fit or '(absent)'}."
                 " À juger : as-tu gonflé la practice que tu préfères vendre ?")


# ── Détection globale de désaccentuation (§7.2) ─────────────────────────────

def scan_desaccentuation(draft):
    hits = []
    for path, text in walk_strings(draft):
        if path.startswith("$.caveats"):
            continue
        bad = find_desaccented(text)
        if bad:
            hits.append((path, sorted(bad), text[:70]))
    return hits


# ── Rapport ─────────────────────────────────────────────────────────────────

def run_checks(draft, today):
    return [
        check_a1(draft), check_a2(draft), check_a3(draft), check_a4(draft),
        check_b1(draft), check_b2(draft, today), check_b3(draft),
        check_c1(draft), check_c2(draft), check_c3(draft), check_c4(draft),
        check_d1(draft), check_d2(draft), check_d3(draft),
        check_e1(draft), check_e2(draft), check_e3(draft),
    ]


def build_report(draft, today):
    checks = run_checks(draft, today)
    by_code = {c.code: c for c in checks}

    mech = [c for c in checks if c.kind == "mecanique"]
    judged = [c for c in checks if c.kind == "jugement"]

    mech_points = sum(c.points for c in mech)
    mech_max = sum(c.max_points for c in mech)
    judged_max = sum(c.max_points for c in judged)

    axis_a = sum(by_code[c].points for c in ("A1", "A2", "A3", "A4"))
    desaccent = scan_desaccentuation(draft)

    ceiling, ceiling_reason = resolve_ceiling(draft)
    best_case = mech_points + judged_max

    rejects = []
    if axis_a < AXIS_A_REJECT_BELOW:
        rejects.append(
            f"Axe A (traçabilité) = {axis_a}/{AXIS_A_MAX}, sous le seuil de {AXIS_A_REJECT_BELOW}. "
            "Rejet automatique quelle que soit la note totale : une fiche non traçable est un risque, "
            "pas un actif.")
    if by_code["E1"].points == 0 and draft.get("score") is not None and ceiling is not None:
        if draft["score"] > ceiling:
            rejects.append(
                f"Score {draft['score']} au-dessus du plafond {ceiling} ({ceiling_reason}). "
                "Baisse le score — le plafond n'est pas négociable.")
    if best_case < INJECT_THRESHOLD:
        rejects.append(
            f"Même en t'attribuant la totalité des {judged_max} points de jugement, tu plafonnes à "
            f"{best_case}/100, sous le seuil d'injection de {INJECT_THRESHOLD}. Retour en P2 ou P3.")
    if desaccent:
        rejects.append(
            f"{len(desaccent)} champ(s) désaccentué(s). C'est le défaut qui est réellement parti en "
            "production : la fiche la plus rigoureuse du projet a l'air bâclée à cause de ça. "
            "Le dollar-quoting règle l'échappement — ne mutile pas le texte.")

    return {
        "checks": checks,
        "mech_points": mech_points,
        "mech_max": mech_max,
        "judged": judged,
        "judged_max": judged_max,
        "axis_a": axis_a,
        "best_case": best_case,
        "ceiling": ceiling,
        "ceiling_reason": ceiling_reason,
        "desaccentuation": desaccent,
        "rejects": rejects,
    }


def print_report(rep, draft):
    w = 78
    print("=" * w)
    print(f" AUDIT — {draft.get('secteur', '(secteur non nommé)')}  [{draft.get('slug', '?')}]")
    print(f" Grille : docs/PROCESS-ETUDE-SECTORIELLE.md §10")
    print("=" * w)

    current_axis = None
    for c in rep["checks"]:
        axis = c.code[0]
        if axis != current_axis:
            names = {"A": "TRAÇABILITÉ (35) — l'axe du rejet automatique",
                     "B": "LA FENÊTRE (20)", "C": "LA DOULEUR (20)",
                     "D": "LA BASCULE (15)", "E": "COHÉRENCE (10)"}
            print(f"\n── Axe {axis} · {names[axis]}")
            current_axis = axis
        if c.kind == "jugement":
            mark, score = "?", f"  ?/{c.max_points}"
        else:
            mark = "✔" if c.ok else ("✖" if c.points == 0 else "~")
            score = f"{c.points:3d}/{c.max_points}"
        print(f"  {mark} {c.code} {score}  {c.label}")
        for line in _wrap(c.evidence, w - 12):
            print(f"           {line}")

    print("\n" + "=" * w)
    print(f" Mécanique      : {rep['mech_points']}/{rep['mech_max']}")
    print(f" Jugement       : à toi — {rep['judged_max']} points en attente "
          f"({', '.join(c.code for c in rep['judged'])})")
    print(f" Axe A          : {rep['axis_a']}/{AXIS_A_MAX}"
          f"{'  ⚠ SOUS LE SEUIL' if rep['axis_a'] < AXIS_A_REJECT_BELOW else ''}")
    print(f" Meilleur cas   : {rep['best_case']}/100  (seuil d'injection : {INJECT_THRESHOLD})")
    if rep["ceiling"] is not None:
        print(f" Plafond corpus : {rep['ceiling']}  ({rep['ceiling_reason']})")
    print("=" * w)

    if rep["desaccentuation"]:
        print("\n⚠ DÉSACCENTUATION DÉTECTÉE")
        for path, words, extract in rep["desaccentuation"][:12]:
            print(f"   {path}")
            print(f"     → {', '.join(words)}   « {extract}… »")
        if len(rep["desaccentuation"]) > 12:
            print(f"   … et {len(rep['desaccentuation']) - 12} autre(s).")

    if rep["rejects"]:
        print("\n" + "!" * w)
        print(" VERDICT : NE PAS INJECTER")
        print("!" * w)
        for r in rep["rejects"]:
            for i, line in enumerate(_wrap(r, w - 4)):
                print(("  • " if i == 0 else "    ") + line)
        return 1

    print("\n✔ Aucun blocage mécanique.")
    print(f"  Attribue-toi les {rep['judged_max']} points de jugement en étant dur : tu viens d'écrire")
    print("  cette fiche, tu es le plus mal placé pour la trouver mauvaise. Sous 70/100 au total,")
    print("  n'injecte pas. Et rappelle-toi la vraie question, qui n'est pas dans la grille :")
    print("  un commercial qui ne connaît rien au secteur tiendrait-il 15 minutes avec ça ?")
    return 0


def _wrap(text, width):
    words, lines, cur = str(text).split(), [], ""
    for word in words:
        if len(cur) + len(word) + 1 > width:
            lines.append(cur)
            cur = word
        else:
            cur = f"{cur} {word}".strip()
    if cur:
        lines.append(cur)
    return lines or [""]


SCHEMA = """\
Format d'entrée — miroir de docs/PROCESS-ETUDE-SECTORIELLE.md §6.1 (JSON).
Le document fait autorité : en cas d'écart, c'est lui qui a raison.

{
  "secteur": "Nutraceutique, Santé Naturelle & Compléments",
  "slug": "nutraceutique-sante-naturelle",
  "corpus": "riche | moyen | mince | vide",     // fixe le plafond de score
  "score": 4.3,
  "practices_fit": {"data_ai": 5, "cloud_eng": 3, "product": 2, "cyber": 4},
  "companies": [{"id": "uuid", "name": "Arkopharma"}],

  "reglementation": [{
    "name": "PPWR", "authority": "EU",
    "deadline_date": "2026-08-12",              // null si non confirmée
    "urgency": "critical | high | medium | low",
    "description": "...", "commercial_angle": "...",
    "is_commercial_window": true,
    "source_url": "https://eur-lex.europa.eu/..."   // requis pour A3
  }],

  "pain_points": [{
    "title": "...",                             // ≤60 car., lu à voix haute
    "frequency_count": 2,                       // doit égaler len(source_company_ids)
    "source_company_ids": ["uuid", "uuid"],     // la preuve du comptage
    "kredo_practice": "data_ai",
    "verbatim": null,                           // jamais inventé
    "description": "..."
  }],

  "playbook": {
    "personas":      [{"role": "...", "enjeu": "...", "peur": "..."}],
    "roi_arguments": ["... Source: Synadiet, janvier 2026."],
    "objections":    [{"objection": "...", "reponse": "..."}],
    "entry_points":  ["Réglementaire: ...", "Quick-win: ...",
                      "Transformation: ...", "Réseau: ..."]
  },

  "caveats": {
    "verbatims": "Aucun verbatim réel disponible — à valider terrain",
    "frequences": "Comptage sur 5 comptes, non exhaustif",
    "marche": "...", "sources": ["https://..."]
  }
}

Ce que le script NE fait pas : juger si une peur est une vraie peur, si une
objection est spécifique, si un angle commercial est interchangeable, ou si un
compte est hors secteur. Ces 25 points restent à toi — le script se contente de
vérifier leurs préconditions et de ne pas te laisser tricher sur le reste.
"""


def main():
    ap = argparse.ArgumentParser(
        description="Gate 3 mécanique d'une étude sectorielle KREDO (§10).")
    ap.add_argument("draft", nargs="?", help="brouillon JSON (§6.1)")
    ap.add_argument("--schema", action="store_true", help="affiche le format d'entrée")
    ap.add_argument("--json", action="store_true", help="sortie machine")
    ap.add_argument("--today", help="date de référence ISO (défaut : aujourd'hui)")
    args = ap.parse_args()

    if args.schema:
        print(SCHEMA)
        return 0
    if not args.draft:
        ap.print_help()
        return 2

    try:
        with open(args.draft, encoding="utf-8") as fh:
            draft = json.load(fh)
    except FileNotFoundError:
        print(f"Brouillon introuvable : {args.draft}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as exc:
        print(f"JSON invalide : {exc}", file=sys.stderr)
        return 2

    today = parse_date(args.today) or dt.date.today()
    rep = build_report(draft, today)

    if args.json:
        print(json.dumps({
            "secteur": draft.get("secteur"),
            "slug": draft.get("slug"),
            "mecanique": rep["mech_points"],
            "mecanique_max": rep["mech_max"],
            "jugement_max": rep["judged_max"],
            "axe_a": rep["axis_a"],
            "meilleur_cas": rep["best_case"],
            "plafond": rep["ceiling"],
            "injectable": not rep["rejects"],
            "blocages": rep["rejects"],
            "desaccentuation": [{"champ": p, "mots": w} for p, w, _ in rep["desaccentuation"]],
            "criteres": [c.as_dict() for c in rep["checks"]],
        }, ensure_ascii=False, indent=2))
        return 1 if rep["rejects"] else 0

    return print_report(rep, draft)


if __name__ == "__main__":
    sys.exit(main())
