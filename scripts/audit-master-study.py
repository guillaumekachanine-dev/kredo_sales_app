#!/usr/bin/env python3
"""
audit-master-study.py — G1, le gate de conformité d'un run MASTER STUDY.

    python3 scripts/audit-master-study.py docs/MASTER-STUDY/registre/<run>/
    python3 scripts/audit-master-study.py <run>/ --json
    python3 scripts/audit-master-study.py <run>/ --check-urls --today 2026-08-13

Fait autorité : `docs/MASTER-STUDY/10-ETAPE-E7-GATES-ET-INGESTION.md` §3.
« Aucun jugement, que du comptage. » Bloquant.

Pourquoi ce script existe
─────────────────────────
Axiome A10 : le producteur n'est jamais son propre jury. Une scorecard remplie à la
main par celui qui produit est une décoration ; un taux calculé est une contrainte.
Deux référentiels se sont déclarés `production_ready` en annonçant 15 et 13 sources
alors que leur JSON en contenait 7 et 5 — la troncature tombant exactement à la
frontière du pack minimal sur les deux. Aucun de ces défauts n'est visible à la
lecture : ils ne se voient qu'en parsant le JSON et en refaisant les additions.

Ce qu'il généralise, et ce qu'il ne duplique pas
────────────────────────────────────────────────
Deux scripts couvraient chacun la moitié du travail, sur des artefacts v1 et contre
un process aujourd'hui archivé :

  .agents/skills/kredo-sector-intelligence/scripts/audit_fiche.py       (fiche v1, grille §10)
  .agents/skills/kredo-sources-sectorielles/scripts/audit_referentiel.py (référentiel de sources v1)

Ce script en reprend les deux mécanismes utiles — le mini-validateur JSON Schema du
second, la structure `Check` + rapport du premier — et les GÉNÉRALISE sur un point
décisif : **le schéma n'est plus dans le code, il est lu sur disque** dans
`docs/MASTER-STUDY/schemas/`. Un contrat qui bouge ne demande donc aucune retouche ici.
Le validateur a été étendu aux mots-clés que les schémas MASTER STUDY utilisent
réellement et que le validateur v1 ignorait en silence : `$ref` / `$defs`, `minItems`,
`maxItems`, `minLength`, `format: uri`. Un `minItems` ignoré, c'est précisément la
troncature qui passe.

Les deux scripts d'origine restent en place : ils notent des artefacts v1 contre une
grille /100 qui n'est pas celle de ce corpus. Les remplacer est un autre chantier.

Aucune dépendance : stdlib seulement, python3.8+.
Le réseau n'est sollicité QUE sous `--check-urls`, jamais par défaut : un gate qui
dépend du réseau n'est pas déterministe.
"""

import argparse
import datetime as dt
import json
import os
import re
import sys
from urllib.parse import urlparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
SCHEMA_DIR = os.path.join(REPO_ROOT, "docs", "MASTER-STUDY", "schemas")

# Fichier de run -> schéma qui le contraint. E1 et E2 n'ont PAS de schéma dans le
# corpus : ils sont donc contrôlés par les familles de §3 mais pas structurellement.
FILE_SCHEMAS = {
    "00-cadrage.json": "cadrage.schema.json",
    "03-sources.json": "source-registry.schema.json",
    "04-secteur.json": "sector-knowledge.schema.json",
    "05-comptes.json": "competitive-map.schema.json",
    "06-chaine.json": "value-chain.schema.json",
    "01-taxonomie.json": None,
    "02-socle.json": None,
}

# §3 « Régime déterministe » — champs que le modèle n'a PAS le droit de remplir (A1).
CHAMPS_DETERMINISTES = [
    "identifiant_national", "code_activite", "convention_collective", "effectif_france",
]

# §3 « Vocabulaire » — A11. Une inférence non marquée est une donnée fausse en devenir.
VOCABULAIRE_INTERDIT = [
    r"besoins?\s+SI\s+probables?",
    r"besoins?\s+probables?",
]
# « non vérifié » est interdit sur un compte prioritaire (E5 §6 contrôle 3) ; une
# hypothèse qualifiée est acceptée. Traité séparément, sur le périmètre du top 3.
NON_VERIFIE_RE = re.compile(r"non\s+v[ée]rifi[ée]|non\s+renseign[ée]|non\s+audit[ée]", re.IGNORECASE)

SEUIL_JOURNAL = {"03-journal.md": 15, "04-journal.md": 25, "05-journal.md": 25}


class Check:
    """Un contrôle de §3. `ok=None` = non exécutable (précondition absente) — ce qui
    n'est ni un succès ni un échec, et doit se voir comme tel dans le rapport."""

    def __init__(self, famille, libelle, ok, detail="", bloquant=True):
        self.famille = famille
        self.libelle = libelle
        self.ok = ok
        self.detail = detail
        self.bloquant = bloquant

    @property
    def statut(self):
        if self.ok is None:
            return "SKIP"
        return "PASS" if self.ok else "FAIL"

    def to_dict(self):
        return {"famille": self.famille, "libelle": self.libelle, "statut": self.statut,
                "detail": self.detail, "bloquant": self.bloquant}


# ── Mini-validateur JSON Schema ─────────────────────────────────────────────
# Repris de audit_referentiel.py et étendu : $ref/$defs, minItems, maxItems,
# minLength, format uri. Piloté par le fichier de schéma, donc il suit ses
# évolutions sans maintenance ici.

def _resolve(ref, root):
    if not ref.startswith("#/"):
        return None
    node = root
    for part in ref[2:].split("/"):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def validate(node, schema, path, errors, root=None):
    root = root if root is not None else schema

    if "$ref" in schema:
        target = _resolve(schema["$ref"], root)
        if target is None:
            errors.append("{}: $ref non résolvable {}".format(path or "$", schema["$ref"]))
            return
        validate(node, target, path, errors, root)
        return

    def err(msg):
        errors.append("{}: {}".format(path or "$", msg))

    if "const" in schema and node != schema["const"]:
        err("attendu {!r}, trouvé {!r}".format(schema["const"], node))
        return
    if "enum" in schema and node not in schema["enum"]:
        err("valeur {!r} hors domaine {}".format(node, schema["enum"]))
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

    if isinstance(node, str):
        if "pattern" in schema and not re.search(schema["pattern"], node):
            err("{!r} ne respecte pas le motif {}".format(node, schema["pattern"]))
        if "minLength" in schema and len(node) < schema["minLength"]:
            err("longueur {} < minLength {}".format(len(node), schema["minLength"]))
        if schema.get("format") == "uri":
            parsed = urlparse(node)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                err("{!r} n'est pas une URI résolvable".format(node[:80]))
        if schema.get("format") == "date" and not re.match(r"^\d{4}-\d{2}-\d{2}$", node):
            err("{!r} n'est pas une date ISO AAAA-MM-JJ".format(node))

    if isinstance(node, list):
        if "minItems" in schema and len(node) < schema["minItems"]:
            err("{} éléments < minItems {}".format(len(node), schema["minItems"]))
        if "maxItems" in schema and len(node) > schema["maxItems"]:
            err("{} éléments > maxItems {}".format(len(node), schema["maxItems"]))
        item_schema = schema.get("items")
        if item_schema:
            for i, item in enumerate(node):
                validate(item, item_schema, "{}[{}]".format(path, i), errors, root)

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
                validate(node[key], sub, "{}.{}".format(path, key), errors, root)


def _type_ok(node, expected):
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


def _type_name(node):
    if node is None:
        return "null"
    for typ, name in ((bool, "boolean"), (str, "string"), (int, "integer"),
                      (float, "number"), (list, "array"), (dict, "object")):
        if isinstance(node, typ):
            return name
    return type(node).__name__


# ── Utilitaires de parcours ─────────────────────────────────────────────────

def walk(node, path="$"):
    """Émet (chemin, valeur) pour chaque feuille et chaque objet du document."""
    yield path, node
    if isinstance(node, dict):
        for key, value in node.items():
            yield from walk(value, "{}.{}".format(path, key))
    elif isinstance(node, list):
        for i, item in enumerate(node):
            yield from walk(item, "{}[{}]".format(path, i))


def collect_lists(node, path="$"):
    """Toutes les listes du document, indexées par leur nom de clé."""
    out = {}
    if isinstance(node, dict):
        for key, value in node.items():
            sub = "{}.{}".format(path, key)
            if isinstance(value, list):
                out.setdefault(key, []).append((sub, value))
            out.update({k: out.get(k, []) + v for k, v in collect_lists(value, sub).items()})
    elif isinstance(node, list):
        for i, item in enumerate(node):
            out.update({k: out.get(k, []) + v
                        for k, v in collect_lists(item, "{}[{}]".format(path, i)).items()})
    return out


# ── Les 13 familles de §3 ───────────────────────────────────────────────────

def check_parsabilite(run_dir, docs, checks):
    fichiers = sorted(f for f in os.listdir(run_dir) if f.endswith(".json"))
    illisibles = [f for f in fichiers if f not in docs]
    checks.append(Check("parsabilite", "Chaque .json du run charge",
                        not illisibles,
                        "{} fichier(s) JSON, {} illisible(s){}".format(
                            len(fichiers), len(illisibles),
                            " : " + ", ".join(illisibles) if illisibles else "")))

    colles = []
    for name in sorted(os.listdir(run_dir)):
        if not name.endswith(".md"):
            continue
        with open(os.path.join(run_dir, name), encoding="utf-8") as fh:
            if re.search(r"```(?:json)?\s*\{", fh.read()):
                colles.append(name)
    checks.append(Check("parsabilite", "Aucun JSON collé dans un markdown",
                        not colles, ", ".join(colles) if colles else "aucun"))


def check_compteurs(docs, checks):
    """Invariant A9 : compteurs.<liste> == len(<liste>), sur TOUT fichier."""
    for name, doc in sorted(docs.items()):
        compteurs = doc.get("compteurs")
        if compteurs is None:
            checks.append(Check("invariant_a9", "{} porte un bloc `compteurs`".format(name),
                                False, "absent — un livrable sans compteurs est rejeté avant d'être lu"))
            continue
        listes = collect_lists(doc)
        ecarts, introuvables = [], []
        for cle, attendu in compteurs.items():
            occurrences = listes.get(cle, [])
            if not occurrences:
                introuvables.append(cle)
                continue
            reel = max(len(v) for _, v in occurrences)
            if reel != attendu:
                ecarts.append("{} déclaré {} / réel {}".format(cle, attendu, reel))
        detail = "{} compteur(s)".format(len(compteurs))
        if ecarts:
            detail += " — écarts : " + " ; ".join(ecarts)
        if introuvables:
            detail += " — sans liste correspondante : " + ", ".join(introuvables)
        checks.append(Check("invariant_a9", "{} : compteurs == len(listes)".format(name),
                            not ecarts, detail))


def check_schemas(docs, checks):
    for name, doc in sorted(docs.items()):
        schema_name = FILE_SCHEMAS.get(name, "?")
        if schema_name is None:
            checks.append(Check("schema", "{} : schéma de contrat".format(name), None,
                                "aucun schéma dans docs/MASTER-STUDY/schemas/ pour cette étape",
                                bloquant=False))
            continue
        if schema_name == "?":
            continue
        path = os.path.join(SCHEMA_DIR, schema_name)
        if not os.path.exists(path):
            checks.append(Check("schema", "{} : schéma introuvable".format(name), False, path))
            continue
        with open(path, encoding="utf-8") as fh:
            schema = json.load(fh)
        errors = []
        validate(doc, schema, "$", errors)
        detail = "{} contre {}".format(
            "conforme" if not errors else "{} violation(s)".format(len(errors)), schema_name)
        if errors:
            detail += "\n" + "\n".join("      · " + e for e in errors[:40])
            if len(errors) > 40:
                detail += "\n      · … {} autres".format(len(errors) - 40)
        checks.append(Check("schema", "{} valide contre son schéma".format(name),
                            not errors, detail))


def check_sources(docs, checks, verifier_urls):
    for name in ("04-secteur.json", "03-sources.json"):
        doc = docs.get(name)
        if doc is None:
            continue
        sources = doc.get("sources") or []
        connus = {s.get("src_id") for s in sources if isinstance(s, dict)}
        orphelins, vides = set(), 0
        for path, node in walk(doc):
            if path.endswith(".src_ids") and isinstance(node, list):
                if not node:
                    vides += 1
                for sid in node:
                    if sid not in connus:
                        orphelins.add((path, sid))
        checks.append(Check("sources", "{} : chaque src_id cité existe dans sources[]".format(name),
                            not orphelins,
                            "{} source(s) déclarée(s), {} référence(s) orpheline(s)".format(
                                len(sources), len(orphelins))))
        checks.append(Check("sources", "{} : aucun bloc sans source".format(name),
                            vides == 0,
                            "{} bloc(s) portent un src_ids VIDE".format(vides)))

        sans_url = [s for s in sources if isinstance(s, dict) and not s.get("url")]
        checks.append(Check("sources", "{} : chaque source porte une URL".format(name),
                            not sans_url, "{} source(s) sans URL".format(len(sans_url))))

        if verifier_urls:
            checks.append(Check("sources", "{} : chaque URL répond (HEAD 2xx/3xx)".format(name),
                                *_head_all(sources)))
        else:
            checks.append(Check("sources", "{} : chaque URL répond (HEAD 2xx/3xx)".format(name),
                                None, "non exécuté — relancer avec --check-urls", bloquant=True))


def _head_all(sources):
    import urllib.request
    ko = []
    for s in sources:
        url = s.get("url") if isinstance(s, dict) else None
        if not url:
            continue
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if not 200 <= resp.status < 400:
                    ko.append("{} -> {}".format(url, resp.status))
        except Exception as exc:  # noqa: BLE001 — toute erreur réseau est un échec de résolution
            ko.append("{} -> {}".format(url, type(exc).__name__))
    return (not ko), ("{} URL en échec".format(len(ko)) + ("\n" + "\n".join("      · " + k for k in ko) if ko else ""))


def check_editeur(docs, checks):
    """Cohérence éditeur : le publisher annoncé doit être plausible au regard du domaine.
    Un cabinet privé déclaré « Commission Européenne » en tier 1 est passé en production."""
    doc = docs.get("04-secteur.json")
    if doc is None:
        return
    suspects = []
    for s in doc.get("sources") or []:
        url, publisher, tier = s.get("url", ""), (s.get("publisher") or ""), s.get("tier")
        host = urlparse(url).netloc.lower()
        officiel = host.endswith((".gouv.fr", ".europa.eu", "europa.eu")) or ".gouv." in host
        pretend = re.search(r"commission|conseil|minist|agence|autorit|anssi|insee|légifrance|legifrance",
                            publisher, re.IGNORECASE)
        if tier == 1 and not officiel:
            suspects.append("src {} : tier 1 sur un domaine non institutionnel ({})".format(s.get("src_id"), host))
        elif pretend and not officiel:
            suspects.append("src {} : éditeur « {} » sur le domaine {}".format(s.get("src_id"), publisher, host))
    checks.append(Check("editeur", "publisher cohérent avec le domaine",
                        not suspects,
                        "\n".join("      · " + x for x in suspects) if suspects else "aucune incohérence"))


def check_arithmetique(docs, checks):
    doc = docs.get("05-comptes.json")
    if doc is None:
        return
    ecarts, hors_domaine, plafond = [], [], []
    for c in doc.get("comptes") or []:
        app = c.get("appetence") or {}
        comp = {k: app.get(k) for k in
                ("capacite_a_payer", "intensite_it", "moment", "accessibilite", "fit_offre")}
        for k, v in comp.items():
            if v is not None and v not in (1, 3, 5):
                hors_domaine.append("{} · {} = {} (attendu 1/3/5)".format(c.get("nom"), k, v))
        if all(v is not None for v in comp.values()):
            canonique = (comp["capacite_a_payer"] + comp["intensite_it"]
                         + 2 * comp["moment"] + 2 * comp["accessibilite"] + comp["fit_offre"])
            if app.get("total") != canonique:
                ecarts.append("{} : total {} ≠ canonique {}".format(
                    c.get("nom"), app.get("total"), canonique))
        t = app.get("total")
        if t is not None and not 5 <= t <= 35:
            plafond.append("{} : total {} hors [5,35]".format(c.get("nom"), t))
    checks.append(Check("arithmetique", "total = c + i + 2×m + 2×a + f, sur 35",
                        not ecarts and not plafond,
                        "\n".join("      · " + x for x in ecarts + plafond) or "10/10 exacts"
                        if not (ecarts or plafond) else "\n".join("      · " + x for x in ecarts + plafond)))
    checks.append(Check("arithmetique", "notes en 1/3/5 uniquement",
                        not hors_domaine,
                        "\n".join("      · " + x for x in hors_domaine) if hors_domaine else "conforme"))


def check_autorite_du_score(docs, checks):
    doc = docs.get("05-comptes.json")
    if doc is None:
        return
    transverse = doc.get("transverse") or {}
    declare = transverse.get("comptes_prioritaires") or []
    tri = sorted((c for c in doc.get("comptes") or []),
                 key=lambda c: ((c.get("appetence") or {}).get("total") or -1), reverse=True)
    attendu = [c.get("nom") for c in tri[:3]]
    identique = set(declare) == set(attendu)
    justifie = bool(transverse.get("justification_ecart_top3"))
    checks.append(Check("autorite_score", "le top 3 déclaré EST le top 3 trié, ou l'écart est justifié",
                        identique or justifie,
                        "déclaré {} · trié {}{}".format(
                            declare, attendu,
                            "" if identique else " — justification_ecart_top3 " +
                            ("présente" if justifie else "ABSENTE"))))


def check_plancher(docs, checks):
    doc = docs.get("05-comptes.json")
    if doc is None:
        return
    transverse = doc.get("transverse") or {}
    prioritaires = set(transverse.get("comptes_prioritaires") or [])
    manquants = []
    for c in doc.get("comptes") or []:
        if c.get("nom") not in prioritaires:
            continue
        pbs = []
        if not c.get("identifiant_national"):
            pbs.append("identité")
        if c.get("ca_meur") is None and c.get("effectif_france") is None:
            pbs.append("taille")
        if not c.get("trigger_events"):
            pbs.append("trigger daté")
        srcs = c.get("sources") or []
        if len(srcs) < 2 or not any((s.get("tier") in (1, 2)) for s in srcs):
            pbs.append("2 sources dont une T1/T2")
        if pbs:
            manquants.append("{} : {}".format(c.get("nom"), ", ".join(pbs)))
    checks.append(Check("plancher_preuve", "aucun compte du top 3 sous le plancher de preuve (A7)",
                        not manquants,
                        "\n".join("      · " + x for x in manquants) if manquants
                        else "{}/{} conformes".format(len(prioritaires), len(prioritaires))))


def check_couche_esn(docs, checks):
    doc = docs.get("05-comptes.json")
    if doc is None:
        return
    transverse = doc.get("transverse") or {}
    prioritaires = set(transverse.get("comptes_prioritaires") or [])
    complets, incomplets = 0, []
    for c in doc.get("comptes") or []:
        if c.get("nom") not in prioritaires:
            continue
        esn = ((c.get("profil_compte") or {}).get("couche_esn") or {})
        rubriques = ("organisation_si", "decideur_si", "modele_achat",
                     "conditions_acces", "voie_entree_probable")
        vides = [r for r in rubriques
                 if not esn.get(r) or NON_VERIFIE_RE.search(str(esn.get(r)))]
        if vides:
            incomplets.append("{} : {}".format(c.get("nom"), ", ".join(vides)))
        else:
            complets += 1
    total = len(prioritaires) or 1
    taux = complets / total
    checks.append(Check("couche_esn", "taux_couche_esn = 1,0 sur les comptes prioritaires",
                        abs(taux - 1.0) < 1e-9,
                        "taux = {:.2f} ({}/{})".format(taux, complets, len(prioritaires))
                        + ("\n" + "\n".join("      · " + x for x in incomplets) if incomplets else "")))

    sans_ia = [c.get("nom") for c in doc.get("comptes") or []
               if not (((c.get("profil_compte") or {}).get("grilles") or {}).get("ia_annonce_vs_deploye"))]
    checks.append(Check("couche_esn", "grille IA annoncé vs déployé renseignée sur TOUS les comptes",
                        not sans_ia, "{} compte(s) sans grille".format(len(sans_ia))))


def check_regime_deterministe(docs, checks):
    doc = docs.get("05-comptes.json")
    if doc is None:
        return
    remplis = []
    for c in doc.get("comptes") or []:
        for champ in CHAMPS_DETERMINISTES:
            if c.get(champ) not in (None, ""):
                remplis.append("{} · {} = {!r}".format(c.get("nom"), champ, c.get(champ)))
    checks.append(Check("regime_deterministe",
                        "aucun champ du régime déterministe rempli par le modèle (A1)",
                        not remplis,
                        "\n".join("      · " + x for x in remplis) if remplis
                        else "{} champs contrôlés sur {} comptes".format(
                            len(CHAMPS_DETERMINISTES), len(doc.get("comptes") or []))))


def check_echeance_pivot(docs, checks, today):
    doc = docs.get("02-socle.json")
    if doc is None:
        checks.append(Check("echeance_pivot", "02-socle.json présent", False, "fichier absent"))
        return
    pivot = ((doc.get("reglementaire") or {}).get("echeance_pivot")) or {}
    if not pivot:
        checks.append(Check("echeance_pivot", "echeance_pivot non nulle", False, "absente"))
        return
    date_txt = pivot.get("date")
    future = None
    if date_txt:
        try:
            future = dt.date.fromisoformat(date_txt) > today
        except ValueError:
            future = False
    url = pivot.get("source_url") or ""
    host = urlparse(url).netloc.lower()
    officielle = host.endswith((".gouv.fr", ".europa.eu", "europa.eu")) or ".gouv." in host
    checks.append(Check("echeance_pivot", "echeance_pivot datée, future et sourcée officiellement",
                        bool(date_txt) and bool(future) and officielle,
                        "« {} » · {} · {} · source {}".format(
                            pivot.get("libelle"), date_txt,
                            "future" if future else "PASSÉE OU INVALIDE",
                            "officielle" if officielle else "NON OFFICIELLE ({})".format(host or "vide"))))

    revalide = (doc.get("reglementaire") or {}).get("revalides_le")
    checks.append(Check("echeance_pivot", "échéances revalidées le jour du run",
                        revalide == today.isoformat(),
                        "revalides_le = {!r}, run du {}".format(revalide, today.isoformat())))


def check_journaux(run_dir, checks):
    for fichier, seuil in sorted(SEUIL_JOURNAL.items()):
        path = os.path.join(run_dir, fichier)
        if not os.path.exists(path):
            checks.append(Check("journal", "{} : ≥ {} requêtes distinctes".format(fichier, seuil),
                                False, "fichier absent"))
            continue
        with open(path, encoding="utf-8") as fh:
            texte = fh.read()
        requetes = _extraire_requetes(texte)
        gabarits = {q for q in requetes if re.search(r"\[[A-ZÀ-Ÿ_]+\]", q)}
        jouees = requetes - gabarits
        detail = "{} requête(s) jouée(s)".format(len(jouees))
        if gabarits:
            detail += " ; {} gabarit(s) à variable non substituée, non comptés".format(len(gabarits))
        checks.append(Check("journal", "{} : ≥ {} requêtes distinctes".format(fichier, seuil),
                            len(jouees) >= seuil, detail))


def _extraire_requetes(texte):
    """Une requête, pas une ligne de prose.

    Le premier jet de ce contrôle comptait toute ligne de plus de douze caractères : un
    journal entièrement rédigé passait le seuil de 25 sans porter une seule requête. Le
    comptage ne retient donc que ce qui a la FORME d'une requête réellement jouée —
    contenu des blocs de code, ou chaîne explicitement citée. Une requête portant encore
    une variable de gabarit (« [ACTEUR] ») est relevée mais jamais comptée : c'est une
    requête à jouer, pas une requête jouée. C'est exactement la matière que l'étude A a
    livrée à la place de son journal.
    """
    candidats = set()
    for bloc in re.findall(r"```[a-z]*\n(.*?)```", texte, re.DOTALL):
        for ligne in bloc.splitlines():
            ligne = ligne.strip().strip('"').strip("«»").strip()
            if len(ligne) > 12 and not ligne.endswith(":"):
                candidats.add(ligne)
    for cite in re.findall(r'[«"“]([^«»"“”\n]{13,})[»"”]', texte):
        candidats.add(cite.strip())
    return candidats


def check_vocabulaire(docs, checks):
    trouve = []
    for name, doc in sorted(docs.items()):
        for path, node in walk(doc):
            if not isinstance(node, str):
                continue
            for motif in VOCABULAIRE_INTERDIT:
                if re.search(motif, node, re.IGNORECASE):
                    trouve.append("{} · {}".format(name, path))
                    break
    checks.append(Check("vocabulaire", "aucune inférence non marquée (A11)",
                        not trouve,
                        "\n".join("      · " + x for x in trouve[:15]) if trouve
                        else "aucune occurrence de « besoins SI probables » ou équivalent"))


def check_portee(docs, checks):
    """A4 — toute écriture sectorielle porte le segment, et le segment seul."""
    problemes = []
    cadrage = docs.get("00-cadrage.json") or {}
    slug_attendu = ((cadrage.get("segment") or {}).get("slug"))
    if not slug_attendu:
        problemes.append("00-cadrage.json : segment.slug absent")

    secteur = docs.get("04-secteur.json")
    if secteur is not None:
        slug = (secteur.get("meta") or {}).get("segment_slug")
        if not slug:
            problemes.append("04-secteur.json : meta.segment_slug absent")
        elif slug_attendu and slug != slug_attendu:
            problemes.append("04-secteur.json : segment_slug {!r} ≠ cadrage {!r}".format(slug, slug_attendu))
        au_macro = [r.get("libelle") for r in (secteur.get("regulation") or [])
                    if r.get("portee") == "macro"]
        if au_macro:
            problemes.append("04-secteur.json : {} item(s) réglementaire(s) écrits au MACRO "
                             "(légitime seulement si authentiquement transversal — à confirmer en G3)"
                             .format(len(au_macro)))
    taxo = docs.get("01-taxonomie.json")
    if taxo is not None and (taxo.get("segment") or {}).get("level") != "segment":
        problemes.append("01-taxonomie.json : level ≠ 'segment'")

    checks.append(Check("portee", "toute écriture sectorielle porte le segment (A4)",
                        not problemes,
                        "\n".join("      · " + x for x in problemes) if problemes
                        else "segment {} cohérent sur tous les fichiers".format(slug_attendu)))


# ── Rapport ─────────────────────────────────────────────────────────────────

def build(run_dir, today, verifier_urls):
    docs = {}
    illisibles = {}
    for name in sorted(os.listdir(run_dir)):
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(run_dir, name), encoding="utf-8") as fh:
                docs[name] = json.load(fh)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            illisibles[name] = str(exc)

    checks = []
    check_parsabilite(run_dir, docs, checks)
    check_compteurs(docs, checks)
    check_schemas(docs, checks)
    check_sources(docs, checks, verifier_urls)
    check_editeur(docs, checks)
    check_arithmetique(docs, checks)
    check_autorite_du_score(docs, checks)
    check_plancher(docs, checks)
    check_couche_esn(docs, checks)
    check_regime_deterministe(docs, checks)
    check_echeance_pivot(docs, checks, today)
    check_journaux(run_dir, checks)
    check_vocabulaire(docs, checks)
    check_portee(docs, checks)
    return docs, illisibles, checks


def main():
    ap = argparse.ArgumentParser(description="G1 — gate de conformité d'un run MASTER STUDY")
    ap.add_argument("run_dir", help="dossier registre/<AAAA-MM>-<segment-slug>/")
    ap.add_argument("--json", action="store_true", dest="as_json", help="sortie machine")
    ap.add_argument("--today", default=dt.date.today().isoformat())
    ap.add_argument("--check-urls", action="store_true",
                    help="vérifie que chaque URL répond (HEAD). Sollicite le réseau.")
    args = ap.parse_args()

    run_dir = os.path.abspath(args.run_dir)
    if not os.path.isdir(run_dir):
        print("dossier introuvable : {}".format(run_dir), file=sys.stderr)
        return 2

    today = dt.date.fromisoformat(args.today)
    docs, illisibles, checks = build(run_dir, today, args.check_urls)

    echecs = [c for c in checks if c.ok is False and c.bloquant]
    skips = [c for c in checks if c.ok is None]
    verdict = "pass" if not echecs and not skips else ("fail" if echecs else "pass_avec_non_executes")

    if args.as_json:
        print(json.dumps({"run": os.path.basename(run_dir), "date": today.isoformat(),
                          "verdict": verdict, "checks": [c.to_dict() for c in checks]},
                         ensure_ascii=False, indent=2))
        return 0 if verdict == "pass" else 1

    largeur = 78
    print("=" * largeur)
    print("G1 — CONFORMITÉ · {}".format(os.path.basename(run_dir)))
    print("MASTER-STUDY 10-ETAPE-E7 §3 · exécuté le {}".format(today.isoformat()))
    print("=" * largeur)
    print()
    if illisibles:
        print("FICHIERS ILLISIBLES")
        for name, exc in sorted(illisibles.items()):
            print("  {} : {}".format(name, exc))
        print()

    famille_courante = None
    for c in checks:
        if c.famille != famille_courante:
            famille_courante = c.famille
            print("── {} {}".format(famille_courante.upper().replace("_", " "),
                                    "─" * max(0, largeur - len(famille_courante) - 4)))
        print("  [{}] {}".format(c.statut, c.libelle))
        if c.detail:
            for i, ligne in enumerate(c.detail.split("\n")):
                print("      {}".format(ligne.strip()) if not ligne.startswith("      ") else ligne)
        print()

    print("=" * largeur)
    print("  PASS {}   FAIL {}   NON EXÉCUTÉ {}".format(
        sum(1 for c in checks if c.ok is True),
        sum(1 for c in checks if c.ok is False),
        len(skips)))
    print()
    print("  VERDICT G1 : {}".format(verdict.upper()))
    if echecs:
        print()
        print("  Bloquant. Les contrôles en échec ne se corrigent pas dans le JSON :")
        print("  ils se corrigent dans la matière, ou le contrat est faux.")
    print("=" * largeur)
    return 0 if verdict == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
