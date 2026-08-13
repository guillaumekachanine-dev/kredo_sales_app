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

## Ce qui est livré

| | État |
|---|---|
| `domain/hiring-intensity.types.ts` — contrat de données | ✅ |
| `domain/build-search-envelope.ts` — enveloppe depuis le registre | ✅ |
| `domain/classify-offer.ts` — offre → practice (slugs base) | ✅ |
| `domain/match-employer.ts` — appariement prudent | ✅ |
| `domain/compute-hiring-intensity.ts` — agrégat, seuil, couverture | ✅ |
| `data/france-travail-client.ts` — OAuth, recherche, pagination | ✅ écrit contre l'API réelle |
| 30 tests, dont 4 de régression sur intitulés réels | ✅ |
| Écriture en `account_facts` / `account_signals` | ❌ **décision en attente** |
| Workflow n8n | ❌ après la décision d'écriture |

Outils :

```bash
npm run ft:check     # les identifiants fonctionnent-ils ? (n'affiche aucun secret)
npm run ft:probe     # sonde la forme de l'API
npm run ft:measure   # mesure A7 sur les comptes du Spatial — LECTURE SEULE
```

## Ce que la première mesure réelle a corrigé

Deux défauts du classement, invisibles hors ligne, révélés par les données réelles :

1. **Appariement en sous-chaîne.** `ssi` matchait « mi**ssi**on », `soc` « **soc**iété »,
   `ux` « fl**ux** » : « Technicien Méthode Microélectronique » partait en `cybersecurity`.
   Corrigé par un appariement sur frontière de mot, avec suffixe `*` pour les préfixes
   légitimes (`cryptograph*`, `ergonom*`).
2. **Classement sur la description.** Elle énumère l'environnement de travail, pas le poste.
   Un « Technicien production érosion » dont la description cite « données » partait en
   `data-ai`. Le classement porte désormais sur le **seul intitulé** ; le rappel perdu est
   couvert par le garde-fou ROME, qui garde l'offre dans le périmètre sans la ventiler.
   Compter juste sans ventiler vaut mieux que ventiler faux.

Les fixtures hors ligne étaient des intitulés courts ; la prose française ne l'est pas.
Quatre tests de régression portent maintenant les intitulés qui ont piégé la première version.

## Résultat sur le Spatial-Défense — 2026-08-13

9 comptes résolus, couverture 75 à 100 %, **1 seule offre SI sur tout le segment**
(Thales Alenia Space, « Responsable Produit Space Edge Computing », M1879).
**0 compte sur 9** franchit le seuil de 3.

À comparer aux « 18 signaux » et « 91 offres actives » qu'annonçait la version fabriquée
du 13/08 après-midi.

## Décision en attente

Faut-il écrire ces neuf mesures en base ? Deux lectures défendables :

- **Écrire** — la mesure est datée, sourcée et porte sa couverture ; elle évite qu'on
  refasse le travail, et rend le canal comparable d'un segment à l'autre.
- **Ne pas écrire** — neuf faits dont huit à zéro encombrent le compte sans rien apprendre ;
  mieux vaut consigner dans `02-socle.json` que le canal ne convient pas à ce segment.

Le tableau de densité ci-dessus plaide pour écrire : c'est ce qui permettra de dire, dans six
mois, que le gisement a bougé.
