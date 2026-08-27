# E2 — Journal des requêtes

Run `2026-08-btp-materiaux` · exécuté le **26/08/2026** · régime déterministe, aucun LLM
sollicité pour un champ du socle (axiome A1).

Chaque ligne est une requête réellement jouée. Les identifiants France Travail vivent dans
`.env.local` et ne transitent ni par cette conversation ni par ce fichier.

## Registre national des entreprises — `recherche-entreprises.api.gouv.fr`

Relais ouvert de Sirene. `entreprise.api.gouv.fr` est écartée : elle est réservée aux
administrations (E2 §2).

| # | Requête | Résultat |
|---|---|---|
| 1 | `GET /search?q=Audemard&per_page=5` | 476 résultats. Le premier — AUDEMARD, SIREN 950399014, Lyon, NAF 51.4C, 0 établissement ouvert — est celui déjà écrit en base, et il ne correspond pas au compte |
| 2 | `GET /search?q=Ciffreo Bona&per_page=5` | 18 résultats, 5 entités NAF 46.73A : graphe de groupe |
| 3 | `GET /search?q=Richardson&per_page=5` | 1 140 résultats ; RICHARDSON 054800958 (130 étab., tranche 51) se détache sans ambiguïté |
| 4 | `GET /search?q=GROUPE AUDEMARD` | Aucun résultat pertinent — la dénomination « Groupe Audemard » n'existe pas au registre |
| 5 | `GET /search?q=AUDEMARD BETON` / `q=AUDEMARD GRANULATS` | 0 résultat sur les deux |
| 6 | `GET /search?q=AUDEMARD&activite_principale=23.63Z,08.12Z,23.51Z,23.61Z,46.73A,23.99Z` | 13 filiales opérationnelles : TRANSBETON, TERALTA GRANULAT BETON REUNION, LES BETONS NICOIS, PROVENCE GRANULATS, SGDG, MADININA BETON, TURBIE BETON… — implantation 06/83/DROM concordante avec le CRM |
| 7 | `GET /search?q=AUDEMARD&departement=06,83,13` | ENTREPRISES AUDEMARD (961801313, Carros) et SOC FINANCIERE AUDEMARD (414368365, Carros) — les deux têtes candidates |
| 8 | `GET /search?q=<siren>` × 7 (961801313, 414368365, 498217561, 054800958, 487652257, 954801999, 323778860) | Dirigeants, catégorie, tranche, nombre d'établissements. C'est ce qui établit qu'ETS CIFFREO ET BONA est dirigeant personne morale des deux autres entités Ciffreo, donc la tête de groupe |

## API France Travail — Offres d'emploi v2 (A7)

Aucun filtre SIREN/SIRET n'existe sur cette API : l'enveloppe par division NAF est le seul
chemin d'exécution (`src/features/hiring-intensity/README.md`).

| # | Requête | Résultat |
|---|---|---|
| 9 | `POST /connexion/oauth2/access_token` (scope `api_offresdemploiv2 o2dsoffre`) | Jeton obtenu, 1 499 s |
| 10 | `GET /offres/search?secteurActivite=23&range=0-0` | 384 offres |
| 11 | `GET /offres/search?secteurActivite=23&domaine=M18&range=0-0` | **0 offre SI** |
| 12 | `GET /offres/search?secteurActivite=46&range=0-0` | 8 477 offres |
| 13 | `GET /offres/search?secteurActivite=46&domaine=M18&range=0-0` | **81 offres SI** (1,0 %) |
| 14 | `GET /offres/search?secteurActivite=46&domaine=M18&range=0-149` | Les 81 offres détaillées : 65 employeurs nommés, 6 offres anonymisées → couverture nominative 93 % |
| 15 | Contrôle de densité comparée : `secteurActivite=08 / 41 / 42 / 43 / 68` (× 2 appels chacun) | 08 : 1 offre SI / 62 · 41 : 1 / 645 · 42 : 7 / 648 · 43 : 24 / 7 787 · 68 : 19 / 2 502. Confirme que `seg-btp-materiaux` porte le meilleur gisement A7 des quatre segments BTP |

## Revalidation réglementaire — au jour du run

Une échéance ne se cite jamais sans avoir été revue le jour même (E2 §1).

| # | Requête | Résultat |
|---|---|---|
| 16 | `HEAD/GET https://entreprendre.service-public.gouv.fr/actualites/A15683` | 200 |
| 17 | `GET` du même, lecture du contenu | Page mise à jour le 27/02/2026 : réception au 01/09/2026 pour toutes les entreprises ; émission au 01/09/2026 pour GE et ETI, au 01/09/2027 pour PME/TPE |
| 18 | `HEAD https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/` | 200 |
| 19 | `HEAD https://www.ecologie.gouv.fr/presse/refondation-rep-pmcb-…` | 200 |
| 20 | `HEAD https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053378848` | **403** — protection anti-robot, ne prouve rien sur l'existence du texte |
| 21 | `HEAD https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050873122` | **403**, même cause |
| 22 | Lecture par second canal de `JORFTEXT000053378848` | Décret n° 2026-16 du 15/01/2026, JORF n°0014 du 17/01/2026, entrée en vigueur 01/05/2026, 13 catégories de bâtiments. **Identifiant authentique, libellé concordant avec la base** |
| 23 | Lecture par second canal de `JORFTEXT000050873122` | Décret n° 2024-1258 du 30/12/2024, plafonds distincts 2025-2027 puis à partir de 2028. **Identifiant authentique, libellé concordant** |

## Lectures Supabase (contexte, pas source externe)

| # | Objet | Résultat |
|---|---|---|
| 24 | Segments franchissant la condition d'axes de G0 | 5 segments, dont 3 BTP ; `seg-btp-materiaux` retenu |
| 25 | Les 3 comptes et leurs 7 axes, `sector_id` vs `segment.parent_id` | 3/3 cohérents, confiance haute, `moment` et `vertical_client` NULL |
| 26 | Corpus du segment et de son macro | 0 item au segment ; 5 réglementaires, 6 pain points, 4 événements au macro ; playbook macro à 16 entrées, playbook segment = squelette vide |
| 27 | `account_facts` des 3 comptes | 14 faits, **tous sur Audemard**, dont le `legal_id` erroné |
| 28 | Opportunités ouvertes | 1 — Ciffreo Bona, « Architecte Cloud, cadrage move-to-Cloud », stade `recherche_profil`, créée le 26/08/2026 |
| 29 | `offer_practices` et `offers` | 8 practices, 41 offres — lues en base pour `00-cadrage.json`, jamais saisies |

**Total : 29 requêtes distinctes**, dont 23 vers des sources externes.

## Ce que ce socle a trouvé et qu'aucune étude n'aurait produit

1. **Un fait faux en base.** `Audemard.legal_id = 950399014` désigne une entité lyonnaise sans
   établissement ouvert. Un LLM à qui l'on aurait demandé « le SIREN d'Audemard » aurait très
   probablement recopié celui-là, puisqu'il est déjà écrit.
2. **Deux graphes de groupe.** Ciffreo Bona et Audemard sont des ensembles d'entités, pas des
   sociétés. Le registre tranche le premier (ETS CIFFREO ET BONA est dirigeant des deux autres)
   et pas le second.
3. **Un zéro mesuré à 93 % de couverture**, qui n'a de valeur que parce qu'il est encadré par
   le contraste avec huit concurrents qui, eux, recrutent du SI.
4. **Une échéance périmée depuis 117 jours** que la base annonce toujours comme telle quelle.
