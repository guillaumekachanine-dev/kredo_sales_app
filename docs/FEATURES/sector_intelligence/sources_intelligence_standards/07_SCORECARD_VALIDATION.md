# 07 — Scorecard de validation du référentiel de sources

## Règle de décision

- **1 échec CRITIQUE** → statut `draft`, diffusion interdite comme référentiel de production.
- **0 critique + 1 à 4 échecs MAJEURS** → `usable_with_caveats`.
- **0 critique + 0 à 1 majeur mineur résiduel documenté** → `production_ready`.

| # | Critère | Criticité | Statut | Notes |
|---:|---|---|---|---|
| 1 | Accès web confirmé et journal de recherche présent | CRITIQUE | ☐ | |
| 2 | Périmètre secteur/segment/géographie explicitement défini | CRITIQUE | ☐ | |
| 3 | Presse professionnelle sectorielle identifiée et vérifiée | CRITIQUE | ☐ | |
| 4 | Fédération/syndicat professionnel principal identifié | CRITIQUE | ☐ | |
| 5 | Régulateur/autorité/organisme normatif identifié ou `non_applicable` justifié | CRITIQUE | ☐ | |
| 6 | Chaque source du pack minimal a été ouverte et vérifiée | CRITIQUE | ☐ | |
| 7 | Les tiers T1–T4 sont attribués selon la nature réelle des sources | CRITIQUE | ☐ | |
| 8 | Aucune reprise secondaire n'est présentée comme source primaire | CRITIQUE | ☐ | |
| 9 | Aucune deadline réglementaire n'est fondée uniquement sur une source secondaire | CRITIQUE | ☐ | |
| 10 | Les chaînes d'origine sont contrôlées pour éviter les fausses corroborations | CRITIQUE | ☐ | |
| 11 | Les besoins d'information critiques sont couverts ou les gaps sont documentés | MAJEUR | ☐ | |
| 12 | Pack minimal défini et justifié | MAJEUR | ☐ | |
| 13 | Pack enrichi défini sans quota artificiel | MAJEUR | ☐ | |
| 14 | Score d'utilité distinct du tier de fiabilité | MAJEUR | ☐ | |
| 15 | Accès, paywall et automatisabilité renseignés | MAJEUR | ☐ | |
| 16 | Requêtes types documentées par grande famille | MAJEUR | ☐ | |
| 17 | Sources régionales / mid-market recherchées lorsque pertinentes | MAJEUR | ☐ | |
| 18 | Test de couverture famille d'information × sources exécuté | MAJEUR | ☐ | |
| 19 | Trois contrôles aléatoires « la source atteste-t-elle vraiment cela ? » réussis | MAJEUR | ☐ | |
| 20 | Passe red team exécutée et points fragiles corrigés/caveatés | MAJEUR | ☐ | |
| 21 | Date de snapshot et date de vérification par source présentes | MINEUR | ☐ | |
| 22 | Export JSON conforme au schéma V1 | MINEUR | ☐ | |
| 23 | Les sources rejetées importantes sont conservées dans le journal avec motif | MINEUR | ☐ | |
| 24 | Le référentiel est compréhensible sans historique de conversation | MINEUR | ☐ | |

## Verdict

**Statut :** `production_ready | usable_with_caveats | draft`  
**Échecs critiques :**  
**Échecs majeurs :**  
**Caveats à transmettre au workflow d'étude :**
