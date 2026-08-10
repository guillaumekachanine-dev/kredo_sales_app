#!/usr/bin/env python3
"""
audit_referentiel.py — contrôle mécanique d'un référentiel de sources sectorielles KREDO.

Vérifie la conformité au schéma V1 et la cohérence arithmétique des scores, AVANT
que le référentiel serve de corpus de recherche à une étude sectorielle.

Pourquoi ce script existe
─────────────────────────
Le premier référentiel produit avec le standard (Tourisme, 09/08/2026) s'est
déclaré `production_ready` sans aucun échec. Le contrôle a posteriori a montré :

  - l'export JSON ne parsait pas (échappements markdown `\\_` et `\\[` hérités
    de l'outil de rédaction) ;
  - il contenait 5 sources sur les 13 du registre markdown, et 9 familles sur 11 ;
  - les `utility_score` étaient posés à l'intuition, sans que les 6 sous-scores
    soient renseignés ni qu'ils tombent juste.

Aucun de ces défauts n'est visible à la lecture : le markdown était impeccable.
Ils ne se voient qu'en essayant réellement de parser le JSON et de refaire les
additions — ce que personne ne fait à la main. D'où ce script.

Le JSON est le livrable qui compte : c'est lui que consommeront le workflow
d'étude et n8n. Un markdown parfait adossé à un JSON tronqué est un référentiel
qui n'existe pas pour la machine.

Ce que le script NE fait pas
────────────────────────────
Il ne juge ni la pertinence d'une source, ni la justesse d'un tier, ni la
qualité de la couverture. Les 24 critères de `07_SCORECARD_VALIDATION.md`
restent à instruire ; ce script en sécurise la partie comptable pour que
l'attention se porte sur le reste.

Aucune dépendance : stdlib seulement, python3.8+.

    python3 audit_referentiel.py referentiel.json
    python3 audit_referentiel.py referentiel.json --markdown referentiel.md
    python3 audit_referentiel.py referentiel.json --json          # sortie machine
    python3 audit_referentiel.py brut.md --fix-escapes -o referentiel.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

# Le schéma fait autorité et vit dans le dossier du standard, pas ici : le
# recopier reproduirait la dérive que ce projet a déjà payée une fois.
SCHEMA_RELPATH = os.path.join(
    "docs", "FEATURES", "sector_intelligence", "sources_intelligence_standards",
    "04_SCHEMA_SORTIE_REFERENTIEL_SOURCES.json",
)

SCHEMA_ENV = "KREDO_SOURCES_SCHEMA"

# Le script vit dans <dépôt>/.claude/skills/<skill>/scripts/ : on remonte à la
# racine plutôt que de dépendre du répertoire depuis lequel on l'appelle.
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), *[os.pardir] * 4))


def default_schema() -> str:
    for candidate in (os.path.join(_REPO_ROOT, SCHEMA_RELPATH), SCHEMA_RELPATH):
        if os.path.exists(candidate):
            return candidate
    return SCHEMA_RELPATH

# Les neuf seules séquences d'échappement que JSON reconnaît. Tout autre
# backslash est invalide par définition : le retirer est donc toujours la
# réparation correcte, et raisonner par liste blanche évite de courir après
# les caractères que tel ou tel éditeur markdown décide d'échapper (le run
# Tourisme en portait sur `_ [ ] &`, la liste n'a pas de fin).
JSON_ESCAPES = set('"\\/bfnrtu')

SRC_ID_RE = re.compile(r"SRC-\d{3,}")
JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


# ── Mini-validateur JSON Schema ─────────────────────────────────────────────
# Ne couvre que les mots-clés réellement utilisés par le schéma V1. Piloté par
# le fichier de schéma, donc il suit automatiquement ses évolutions : rien à
# maintenir ici quand le schéma bouge.

def validate(node, schema: dict, path: str, errors: list) -> None:
    def err(msg: str) -> None:
        errors.append("{}: {}".format(path or "$", msg))

    if "const" in schema and node != schema["const"]:
        err("attendu {!r}, trouvé {!r}".format(schema["const"], node))
        return

    if "enum" in schema and node not in schema["enum"]:
        err("valeur {!r} hors des valeurs permises {}".format(node, schema["enum"]))
        return

    expected = schema.get("type")
    if expected and not _type_ok(node, expected):
        err("type {} attendu, trouvé {}".format(expected, _type_name(node)))
        return

    if isinstance(node, bool):
        return

    if isinstance(node, (int, float)):
        if "minimum" in schema and node < schema["minimum"]:
            err("{} < minimum {}".format(node, schema["minimum"]))
        if "maximum" in schema and node > schema["maximum"]:
            err("{} > maximum {}".format(node, schema["maximum"]))

    if isinstance(node, str) and "pattern" in schema:
        if not re.search(schema["pattern"], node):
            err("{!r} ne respecte pas le motif {}".format(node, schema["pattern"]))

    if isinstance(node, list):
        item_schema = schema.get("items")
        if item_schema:
            for i, item in enumerate(node):
                validate(item, item_schema, "{}[{}]".format(path, i), errors)
        if schema.get("uniqueItems"):
            seen, dupes = set(), set()
            for item in node:
                key = json.dumps(item, sort_keys=True, ensure_ascii=False)
                if key in seen:
                    dupes.add(key)
                seen.add(key)
            if dupes:
                err("doublons interdits : {}".format(", ".join(sorted(dupes))))

    if isinstance(node, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in node:
                err("champ obligatoire absent : {}".format(key))
        if schema.get("additionalProperties") is False:
            for key in node:
                if key not in props:
                    err("champ inattendu : {}".format(key))
        for key, sub in props.items():
            if key in node:
                validate(node[key], sub, "{}.{}".format(path, key), errors)


def _type_ok(node, expected) -> bool:
    types = expected if isinstance(expected, list) else [expected]
    for t in types:
        if t == "object" and isinstance(node, dict):
            return True
        if t == "array" and isinstance(node, list):
            return True
        if t == "string" and isinstance(node, str):
            return True
        if t == "integer" and isinstance(node, int) and not isinstance(node, bool):
            return True
        if t == "number" and isinstance(node, (int, float)) and not isinstance(node, bool):
            return True
        if t == "boolean" and isinstance(node, bool):
            return True
        if t == "null" and node is None:
            return True
    return False


def _type_name(node) -> str:
    if node is None:
        return "null"
    if isinstance(node, bool):
        return "boolean"
    if isinstance(node, str):
        return "string"
    if isinstance(node, int):
        return "integer"
    if isinstance(node, float):
        return "number"
    if isinstance(node, list):
        return "array"
    if isinstance(node, dict):
        return "object"
    return type(node).__name__


# ── Contrôle arithmétique des scores ────────────────────────────────────────

def check_scores(data: dict) -> list:
    """Le score d'utilité est une somme, pas une impression.

    Le standard §8.2 pose six critères pondérés dont le total fait 100. Un
    `utility_score` qui ne tombe pas sur la somme de ses composantes signale
    une note posée à l'intuition puis habillée après coup — auquel cas la
    hiérarchie entre les sources n'est plus comparable d'un secteur à l'autre.
    """
    problems = []
    for src in data.get("sources", []) or []:
        if not isinstance(src, dict):
            continue
        sid = src.get("id", "?")
        detail = src.get("utility_score_detail")
        score = src.get("utility_score")
        if not isinstance(detail, dict):
            problems.append("{} : utility_score_detail absent — le score {} n'est pas justifiable".format(sid, score))
            continue
        values = [v for v in detail.values() if isinstance(v, (int, float))]
        if len(values) != len(detail):
            problems.append("{} : utility_score_detail contient une valeur non numérique".format(sid))
            continue
        total = sum(values)
        if not isinstance(score, (int, float)):
            problems.append("{} : utility_score absent ou non numérique (somme des composantes = {})".format(sid, total))
        elif total != score:
            problems.append("{} : utility_score = {} mais la somme des 6 composantes fait {} (écart {:+d})".format(
                sid, score, total, int(total - score)))
    return problems


# ── Contrôle de parité markdown ↔ JSON ──────────────────────────────────────

def check_parity(data: dict, md_text: str) -> list:
    """Le JSON doit être un export du référentiel, pas un résumé.

    Sur le run Tourisme, le markdown portait 13 sources et le JSON 5. Le
    document se lisait parfaitement ; le corpus réellement transmis en aval
    était amputé des deux tiers. La comparaison des identifiants SRC des deux
    faces est le seul contrôle qui l'aurait montré.
    """
    problems = []
    md_ids = set(SRC_ID_RE.findall(md_text))
    json_ids = {s.get("id") for s in data.get("sources", []) or [] if isinstance(s, dict)}
    json_ids.discard(None)

    missing = sorted(md_ids - json_ids)
    if missing:
        problems.append(
            "{} source(s) présentes dans le markdown mais absentes du JSON : {}".format(
                len(missing), ", ".join(missing)))

    extra = sorted(json_ids - md_ids)
    if extra:
        problems.append(
            "{} source(s) présentes dans le JSON mais jamais citées dans le markdown : {}".format(
                len(extra), ", ".join(extra)))

    # Les packs ne peuvent référencer que des sources déclarées : un pack qui
    # pointe un identifiant inexistant est un pack vide qui se croit rempli.
    for pack in ("minimum_pack", "extended_pack"):
        unknown = sorted(set(data.get(pack, []) or []) - json_ids)
        if unknown:
            problems.append("{} référence des identifiants absents du registre : {}".format(
                pack, ", ".join(unknown)))

    return problems


# ── Réparation des échappements ─────────────────────────────────────────────

def extract_json_block(text: str) -> str:
    """Isole l'objet JSON dans un document markdown.

    Un bloc clôturé ```json fait foi quand il existe ; sinon on prend la plus
    large accolade du document, ce qui suffit tant que le JSON est en fin de
    livrable comme le prévoit le format de sortie §11.
    """
    fenced = JSON_FENCE_RE.search(text)
    if fenced:
        return fenced.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise SystemExit("Aucun objet JSON trouvé dans l'entrée (pas de { ... }).")
    return text[start:end + 1]


def strip_invalid_escapes(raw: str) -> str:
    """Ramène les backslashes d'un export markdown à ce que JSON accepte.

    Deux dégâts se superposent dans un export Gemini/Docs :
      - des backslashes ajoutés devant la ponctuation markdown  (`\\_`, `\\[`, `\\&`) ;
      - les backslashes légitimes du JSON eux-mêmes redoublés  (`\\"` devenu `\\\\"`).

    La règle : réduire toute suite de backslashes à un seul, puis le garder
    s'il introduit une des neuf séquences que JSON reconnaît, le retirer sinon.

    Elle a une limite assumée : un backslash littéral voulu dans le contenu
    serait perdu. Dans un référentiel de sources il n'y en a jamais — les seuls
    backslashes rencontrés sont les deux artefacts ci-dessus — et l'alternative
    est un fichier qui ne parse pas du tout.
    """
    out, i, n = [], 0, len(raw)
    while i < n:
        if raw[i] != "\\":
            out.append(raw[i])
            i += 1
            continue
        run = i
        while run < n and raw[run] == "\\":
            run += 1
        nxt = raw[run] if run < n else ""
        if nxt in JSON_ESCAPES and nxt:
            out.append("\\")
            out.append(nxt)
            i = run + 1
        else:
            i = run  # suite de backslashes parasites : supprimée
    return "".join(out)


def fix_escapes(text: str) -> str:
    return strip_invalid_escapes(extract_json_block(text))


# ── Rapport ─────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Contrôle mécanique d'un référentiel de sources sectorielles KREDO.")
    ap.add_argument("fichier", help="referentiel.json (ou le markdown brut avec --fix-escapes)")
    ap.add_argument("--markdown", metavar="MD",
                    help="referentiel.md — active le contrôle de parité markdown ↔ JSON")
    ap.add_argument("--schema-file", default=os.environ.get(SCHEMA_ENV) or default_schema(),
                    help="chemin du schéma V1 (défaut : {})".format(SCHEMA_RELPATH))
    ap.add_argument("--fix-escapes", action="store_true",
                    help="extrait le JSON du fichier et retire les échappements markdown")
    ap.add_argument("-o", "--output", help="fichier de sortie pour --fix-escapes")
    ap.add_argument("--json", dest="as_json", action="store_true", help="rapport machine")
    args = ap.parse_args()

    raw = open(args.fichier, encoding="utf-8").read()

    if args.fix_escapes:
        fixed = fix_escapes(raw)
        try:
            json.loads(fixed)
        except json.JSONDecodeError as exc:
            # La réparation ne couvre que les échappements. Si ça casse encore,
            # c'est une vraie malformation (JSON tronqué, virgule manquante) :
            # montrer l'endroit plutôt qu'une trace de pile.
            around = fixed[max(0, exc.pos - 70):exc.pos + 70].replace("\n", " ")
            print("Réparation insuffisante — le JSON reste invalide : {}".format(exc.msg))
            print("Ligne {}, colonne {}. Contexte :".format(exc.lineno, exc.colno))
            print("    …{}…".format(around))
            print("\nCause la plus fréquente : le bloc JSON a été tronqué à la génération.")
            print("Redemander l'export §11 complet plutôt que de rafistoler à la main.")
            return 2
        if args.output:
            with open(args.output, "w", encoding="utf-8") as fh:
                fh.write(fixed)
            print("JSON réparé et valide → {}".format(args.output))
        else:
            sys.stdout.write(fixed)
        return 0

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print("PARSE ÉCHEC — {}".format(exc))
        print("\nSi l'entrée vient d'un export markdown, les échappements `\\_` et `\\[` en sont")
        print("probablement la cause. Réparer d'abord :")
        print("    python3 {} {} --fix-escapes -o referentiel.json".format(
            os.path.basename(__file__), args.fichier))
        return 2

    errors, score_problems, parity_problems = [], [], []

    if os.path.exists(args.schema_file):
        schema = json.load(open(args.schema_file, encoding="utf-8"))
        validate(data, schema, "", errors)
    else:
        errors.append("schéma introuvable ({}) — validation structurelle non exécutée. "
                      "Passer --schema-file ou définir {}.".format(args.schema_file, SCHEMA_ENV))

    score_problems = check_scores(data)

    if args.markdown:
        parity_problems = check_parity(data, open(args.markdown, encoding="utf-8").read())

    sources = data.get("sources", []) or []
    meta = data.get("meta", {}) or {}
    declared = meta.get("status")
    total = len(errors) + len(score_problems) + len(parity_problems)

    if args.as_json:
        print(json.dumps({
            "sources_count": len(sources),
            "schema_errors": errors,
            "score_problems": score_problems,
            "parity_problems": parity_problems,
            "declared_status": declared,
            "mechanical_pass": total == 0,
        }, ensure_ascii=False, indent=2))
        return 0 if total == 0 else 1

    print("╭─ Référentiel : {} / {}".format(meta.get("sector", "?"), meta.get("segment", "?")))
    print("│  snapshot {}   sources {}   pack min {}   pack étendu {}".format(
        meta.get("snapshot_date", "?"), len(sources),
        len(data.get("minimum_pack", []) or []), len(data.get("extended_pack", []) or [])))
    print("╰─ statut déclaré : {}".format(declared))

    _section("Conformité au schéma V1", errors)
    _section("Arithmétique des scores d'utilité", score_problems)
    if args.markdown:
        _section("Parité markdown ↔ JSON", parity_problems)

    print()
    if total == 0:
        print("CONTRÔLE MÉCANIQUE : OK — {} source(s) conformes.".format(len(sources)))
        print("Restent à instruire à la main les 24 critères de 07_SCORECARD_VALIDATION.md :")
        print("tiers réellement attribués, sources du pack minimal réellement ouvertes,")
        print("indépendance des corroborations, gaps documentés. Le script ne les couvre pas.")
        return 0

    print("CONTRÔLE MÉCANIQUE : {} anomalie(s).".format(total))
    if declared == "production_ready":
        print("Le référentiel se déclare production_ready alors qu'il échoue au contrôle")
        print("comptable. Corriger, puis relancer avant de le donner au workflow d'étude.")
    return 1


def _section(title: str, problems: list) -> None:
    print("\n── {} ".format(title) + "─" * max(0, 58 - len(title)))
    if not problems:
        print("   OK")
        return
    for p in problems:
        print("   ✗ {}".format(p))


if __name__ == "__main__":
    sys.exit(main())
