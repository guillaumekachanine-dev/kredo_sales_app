#!/usr/bin/env python3
"""Construit le schéma d'un secteur : injecte l'export JSON dans le générateur.

    python3 chaine-de-valeur/build.py btp

Le générateur (`assets/chaine-de-valeur.html`) reste vierge et réutilisable ;
le fichier produit (`<secteur>/chaine-<secteur>.html`) est autonome et publiable.
Regénérer après toute modification en base : réexporter `export.json`, relancer.
"""
import json
import sys
from pathlib import Path

RACINE = Path(__file__).parent
DEBUT, FIN = "/*__EMBED__*/", "/*__EMBED_END__*/"


def build(secteur: str) -> Path:
    gabarit = (RACINE / "assets" / "chaine-de-valeur.html").read_text(encoding="utf-8")
    export = RACINE / secteur / "export.json"
    donnees = json.loads(export.read_text(encoding="utf-8"))

    i, j = gabarit.index(DEBUT), gabarit.index(FIN)
    # </script> dans une chaîne JSON fermerait la balise : on le neutralise.
    charge = json.dumps(donnees, ensure_ascii=False).replace("</", "<\\/")
    sortie = RACINE / secteur / f"chaine-{secteur}.html"
    sortie.write_text(gabarit[:i] + DEBUT + charge + gabarit[j:], encoding="utf-8")

    # Variante artifact : la plateforme fournit elle-même doctype/html/head/body,
    # on ne livre que le contenu (title et style compris).
    corps = sortie.read_text(encoding="utf-8")
    for balise in ("<!doctype html>", '<html lang="fr">', "<head>",
                   '<meta charset="utf-8">',
                   '<meta name="viewport" content="width=device-width, initial-scale=1">',
                   "</head>", "<body>", "</body>", "</html>"):
        corps = corps.replace(balise + "\n", "").replace(balise, "")
    corps = corps.replace(
        "<title>Chaîne de valeur sectorielle — générateur</title>",
        f"<title>Chaîne de valeur — {donnees['meta']['secteur']}</title>")
    (RACINE / secteur / f"chaine-{secteur}.artifact.html").write_text(
        corps.strip() + "\n", encoding="utf-8")

    noeuds = donnees["noeuds"]
    acteurs = [a for n in noeuds for a in n["acteurs"]]
    orphelins = [a["nom"] for a in acteurs if not a["kredo"] and not a.get("source")]
    if orphelins:
        raise SystemExit(f"Acteur hors Kredo sans source : {', '.join(orphelins)}")
    print(f"{sortie} — {len(noeuds)} nœuds, {len(acteurs)} acteurs "
          f"({sum(a['kredo'] for a in acteurs)} Kredo), {len(donnees['liens'])} liens")
    return sortie


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "btp")
