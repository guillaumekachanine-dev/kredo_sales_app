# A7 — Intensité SI (MASTER STUDY, action B2)

Fait autorité : `docs/MASTER-STUDY/05-ETAPE-E2-SOCLE-DETERMINISTE.md` §4.3.

## Le constat qui a rouvert le dossier

**L'API France Travail « Offres d'emploi v2 » n'expose aucun filtre SIREN ni SIRET.**
Vérifié le 2026-08-13 sur trois sources concordantes : la fiche produit officielle
([francetravail.io](https://francetravail.io/data/api/offres-emploi)), la fiche
[data.gouv.fr](https://www.data.gouv.fr/dataservices/api-offres-demploi) qui liste les filtres
disponibles (métiers, communes, départements, types de contrat, secteurs d'activité), et les
paramètres réellement émis par un client tiers en production.

L'énoncé d'origine de A7 — « interroger l'API par SIREN » — **n'a donc pas de chemin
d'exécution**. C'est un défaut de contrat, et très probablement l'explication de la première
livraison de B2, qui a écrit des mesures qu'aucun appel n'avait produites.

S'y ajoute une limite structurelle : une part des offres est publiée en **employeur
anonymisé**. Aucun appariement, si bon soit-il, ne les rattachera.

## La méthode retenue

Enveloppe déterministe, puis appariement mesuré :

```
faits du socle A1 (naf_code, establishment)   ← déjà en base depuis B1
   └── buildSearchEnvelope()   division NAF + départements + alias du nom légal
        └── [ adaptateur réseau — NON ÉCRIT ]
             └── classifyOffer()      offre → practice `offer_practices.slug`
                  └── matchEmployer() offre → compte, ou rien
                       └── computeHiringIntensity()
                            ├── account_fact  `it_hiring_intensity`
                            └── account_signal `hiring_signal` (au seuil)
```

**La mesure publie sa propre couverture.** `recall` = part des offres SI de l'enveloppe dont
l'employeur est identifiable, anonymes au dénominateur. Sans elle, « 18 offres » est
indéterminé : on ignore si c'est 18 sur 20 attribuables ou 18 sur 200 dont 180 anonymes.
`describeIntensity()` énonce toujours cette couverture — un comptage muet sur son angle mort
se lit comme une certitude, ce qu'interdit l'axiome A11.

## Où ce canal produit — mesuré le 2026-08-13

France Travail publie **9 467 offres SI** en France (`domaine=M18`, 96 métiers du
référentiel). Cette matière est très inégalement répartie selon la division NAF de
l'employeur — donc selon le segment travaillé :

| Div. NAF | Secteur | Offres SI | Part des offres du secteur |
|---|---|---|---|
| 62 | Programmation & conseil informatique (ESN) | 747 | **27,2 %** |
| 70 | Sièges sociaux & conseil de gestion | 458 | 4,0 % |
| 71 | Ingénierie & études techniques | 180 | 5,6 % |
| 85 | Enseignement | 83 | 0,8 % |
| 61 | Télécommunications | 37 | **21,6 %** |
| 74 | Autres activités spécialisées | 27 | 5,6 % |
| 26 | Produits informatiques & électroniques | 26 | 5,1 % |
| **30** | **Construction aéronautique & spatiale** | **22** | 3,7 % |
| 96 | Autres services personnels | 0 | 0,0 % |

**Le canal n'est donc pas inutile — il est sectoriel.** Sur `62`, `61`, `70` et `71`
il porte une matière dense. Sur `30`, il n'y a que 22 offres SI dans toute la France :
le zéro constaté sur le Spatial-Défense n'est pas un artefact de l'enveloppe ni du
classement, c'est la réalité du gisement.

### Deux conséquences de méthode

**1. Les groupes recrutent leur SI depuis d'autres entités que celle qu'on a résolue.**
Une offre « Ingénieur Cloud GCP » (M1805) est publiée par **Thales Services Numériques
SAS** en division 70 — invisible d'une enveloppe calée sur le NAF `2630Z` de Thales SIX
GTS. L'appariement la refuse à juste titre : c'est une autre personne morale, et c'est
d'ailleurs une ESN, donc un concurrent.
Ce n'est pas un défaut à corriger en silence, c'est une **question de périmètre** :
un compte Kredo désigne-t-il une entité juridique ou un groupe ? Le champ
`entite_retenue` de `02-socle.json` porte déjà cet arbitrage compte par compte.

**2. Avant de lancer A7 sur un segment, mesurer d'abord la densité de son gisement.**
Deux appels suffisent (`secteurActivite=XX` et `secteurActivite=XX&domaine=M18`).
En dessous de quelques dizaines d'offres SI au national, A7 ne rendra rien et il vaut
mieux le savoir avant que le corpus n'annonce un zéro.

## Ce qui est livré, ce qui ne l'est pas

| | État |
|---|---|
| `hiring-intensity.types.ts` — le contrat de données | ✅ |
| `build-search-envelope.ts` — enveloppe depuis le registre | ✅ 26 tests |
| `classify-offer.ts` — offre → practice (slugs base) | ✅ |
| `match-employer.ts` — appariement prudent | ✅ |
| `compute-hiring-intensity.ts` — agrégat, seuil, couverture | ✅ |
| Adaptateur réseau (OAuth, `/offres/search`, pagination) | ❌ **bloqué sur identifiants** |
| Workflow n8n + écriture en base | ❌ après un appel réel |

**Rien n'est écrit en base tant qu'un appel réel n'a pas tourné.** C'est la règle qui distingue
cette tentative de la précédente.

## Pourquoi l'adaptateur réseau n'est pas écrit

Ses noms de paramètres, ses scopes OAuth, la forme exacte de sa réponse et ses quotas ne se
devinent pas : ils se constatent contre l'API. Les écrire de mémoire produirait précisément le
genre de code qui a l'air juste et ne tourne jamais. Points à établir au premier appel réel :

1. Nom du paramètre de filtre secteur et granularité acceptée (division NAF sur 2 chiffres ?).
2. Nom du paramètre département, et s'il accepte plusieurs valeurs.
3. Champ portant le nom de l'employeur, et la façon dont l'anonymat se manifeste
   (champ absent, `null`, ou libellé générique — le calcul de couverture en dépend).
4. Validité du préfixe ROME `M18` contre `/referentiel/metiers` — le ROME a été renuméroté
   en v4 et ce préfixe n'a **pas** été vérifié en ligne.
5. Quotas réels (3 req/s annoncés, 1 150 offres maximum par requête) et pagination.

## Pour reprendre

1. Créer une application sur francetravail.io, souscrire à « Offres d'emploi v2 ».
2. Poser `FRANCE_TRAVAIL_CLIENT_ID` / `FRANCE_TRAVAIL_CLIENT_SECRET` dans `.env.local`
   **et sur Vercel** (prod + preview) — l'oubli côté Vercel est le mode d'échec le plus
   courant du projet.
3. Jouer un appel manuel sur un SIREN du segment Spatial-Défense, constater les cinq points
   ci-dessus, puis écrire l'adaptateur contre ce qui a été observé.
4. Mesurer la couverture réelle sur les 9 comptes résolus. **Si elle est basse, c'est un
   résultat, pas un échec** : il faut alors le dire dans `02-socle.json` plutôt que de
   compenser au jugé.
