# KREDO — Processus de réalisation d'une étude sectorielle

> **Document de référence.** Il définit ce qu'est une étude sectorielle KREDO, comment on la produit, ce qu'elle doit contenir, et comment on juge qu'elle est bonne.
> Il est écrit pour être exécuté par un agent (Claude, ChatGPT, Gemini) **sans contexte préalable du projet**, ou par un humain.
>
> **Propriétaire :** Guillaume Kasanin · **Version :** 1.0 · **Date :** 2026-07-16 · **Revue :** à chaque nouvelle fiche produite, puis trimestrielle
> **Statut des données citées :** vérifiées en base live le 2026-07-16 (projet Supabase `jvzgmhvwirsbdkjpmvla`).

---

## 0. Comment lire ce document

| Vous êtes… | Lisez |
|---|---|
| Un agent qui doit **produire** une fiche | §1 → §9, dans l'ordre, sans sauter §4 |
| Un agent qui doit **évaluer** une fiche existante | §10 (grille de notation) |
| Guillaume, pour **décider** de lancer une étude | §2, §3, §11 (métriques), §14 |
| Quelqu'un qui reprend le sujet à froid | §1 (genèse) puis §13 (dettes connues) |

**Règle de préséance :** en cas de contradiction entre ce document et le skill `kredo-sector-intelligence`, **ce document fait foi** (le skill est daté et diverge du schéma réel — voir §12).

---

## 1. Genèse — d'où vient ce processus

Comprendre l'histoire évite de refaire les erreurs déjà payées.

### 1.1 Les trois couches successives

**Couche 1 — L'héritage FOLIO (juin 2026, import unique du 09/06).**
FOLIO était l'outil précédent. Il a laissé en base, dans `companies.metadata`, deux blocs JSON par compte :
- `metadata.sector_analysis` — **81 comptes sur 96**. Une analyse de marché en 7 sections (`acteurs_cles`, `chaine_valeur`, `volume_marche`, `segment_clientele`, `synthese_sectorielle`, `environnement_normatif`, `analyse_concurrentielle`). Dense, structurée, souvent excellente.
- `metadata.analysis_data` — **93 comptes**. 5 clés (`actualites_recentes`, `tendance_croissance`, `recrutements_recents`, `indices_maturite_digitale`, `signaux`).

**Le défaut fondamental de FOLIO : aucune source.** Pas une URL, pas une date de publication, pas un nom de rapport. Le contenu est plausible, souvent juste, parfois périmé — et **invérifiable**. C'est exactement ce qui a motivé la doctrine de traçabilité de KREDO.

**Le second défaut : c'est du sectoriel vu depuis UN compte.** L'analyse « secteur » de Robertet parle en réalité de Robertet — parts de marché exprimées en « % du CA Robertet », concurrents définis comme « concurrents de Robertet ». Ce n'est pas mutualisable tel quel. C'est de la matière première, pas un livrable.

**Couche 2 — Les deux fiches fondatrices (14-15 juin 2026).**
- `parfumerie-aromes` — score 4.8/5, adossée à un diagnostic réel chez Robertet (`lifecycle_status='client'`). **Corpus riche.** 8 pain points dont 7 avec verbatim.
- `banque-finance-assurance` — score 4.4/5, corpus mince (peu de comptes exploitables), compensé par une recherche réglementaire solide (GAFI, DORA, Solvabilité II). **0 verbatim, assumé.**

Ces deux fiches ont établi le principe structurant : **une fiche à corpus mince n'est pas une fiche ratée, c'est une fiche qui le dit.**

**Couche 3 — La fiche de maturité (30 juin 2026).**
- `nutraceutique-sante-naturelle` — score 4.3/5. C'est **la référence de méthode actuelle**, pas parfumerie.

Ce qu'elle apporte et que les deux premières n'ont pas :
- **Chaque argument ROI porte sa source dans le texte** : « Source: projet interne ARKO-2026-001 », « Source: Synadiet, janvier 2026 », « Source: Uriach 2024 results, 28 mai 2025 ».
- **La distinction fait/estimation est explicite** : « potentiel estimé a -30% a -50% […] a valider sur le contexte client. Source: estimation Kredo ».
- **`source_company_ids` est réellement peuplé** (2 comptes par pain point) — donc `frequency_count` est *vérifiable*. Sur parfumerie et banque, ce champ est **NULL partout** : leurs fréquences (6/5/5/4…) sont invérifiables a posteriori.

> **Conclusion de genèse :** parfumerie est la référence de **densité**, nutraceutique est la référence de **rigueur**. Une fiche cible doit atteindre les deux. Toute nouvelle fiche se calibre sur nutraceutique pour la méthode, sur parfumerie pour le volume.

### 1.2 La leçon transversale

Le risque n°1 de cet exercice n'est pas le manque de données. C'est **l'enthousiasme qui comble un trou par une invention plausible** — un verbatim reconstitué, une fréquence arrondie au feeling, un ROI qui « sonne bien ».

> Un DSI qui détecte **une seule** statistique inventée cesse de croire **tout le reste**, y compris les 90 % qui étaient vrais.

D'où l'axiome du processus : **une fiche avec des trous assumés bat une fiche complète mais fragile.**

---

## 2. Objectif — ce qu'une étude sectorielle doit produire

### 2.1 La définition

> Une étude sectorielle KREDO transforme un secteur d'activité en **capacité de décrocher et de tenir un rendez-vous commercial**, en s'appuyant sur des faits traçables.

Ce n'est **pas** un rapport de marché. Un rapport de marché décrit. Une étude KREDO **arme**.

### 2.2 Le test de recette unique

Toute la fiche se juge sur une seule question :

> **« Un commercial KREDO qui ne connaît rien à ce secteur peut-il, après 20 minutes de lecture, décrocher son téléphone, appeler un DSI du secteur, et tenir 15 minutes sans bluffer ? »**

Si oui : la fiche est finie. Si non : identifier lequel des 4 étages manque.

### 2.3 Les 4 étages de valeur (ordre de priorité décroissant)

| # | Étage | Question à laquelle il répond | Sans lui… |
|---|---|---|---|
| 1 | **La fenêtre** (réglementaire/événementielle) | *Pourquoi je l'appelle aujourd'hui et pas dans 6 mois ?* | Pas de motif d'appel → pas de RDV |
| 2 | **La douleur** (pain points) | *Qu'est-ce qui l'empêche de dormir, précisément ?* | On parle de nous, pas de lui → RDV mort en 4 min |
| 3 | **La preuve** (corpus, ROI sourcés, référence client) | *Pourquoi il devrait me croire ?* | Discours = celui de toutes les ESN |
| 4 | **La bascule** (offres, personas, objections) | *Qu'est-ce que je lui propose et comment je tiens le choc ?* | Pas de conversion |

**L'étage 1 est le cœur.** Une échéance réglementaire datée et vérifiée crée une urgence qu'aucune ESN généraliste ne peut improviser. C'est le seul étage qui produit des rendez-vous *entrants dans la logique du client*.

### 2.4 Hors périmètre (explicite)

Ce qui n'est **pas** une étude sectorielle et ne doit pas y être fait :

| Hors scope | Où ça va |
|---|---|
| Analyse d'un compte particulier | Cockpit compte `/prospection/accounts/[id]` (ADR-0012, étape 1 « Connaissance compte ») |
| Rédaction du mail/pitch final | Workflow `intel-020-communication` (ADR-0009) |
| Scoring de priorité d'un compte | Moteur `account-scoring` (ADR-0011) |
| Veille continue post-étude | `sector_news` (alimenté par n8n), `account_watch_settings` |
| Cadrage d'une mission quick-win | Objet séparé, non traité |

Une étude sectorielle produit du **mutualisable** — ce qui est vrai pour 5 comptes du même marché. Tout ce qui n'est vrai que pour un compte appartient au cockpit compte.

---

## 3. État des lieux — le terrain réel (au 2026-07-16)

**À vérifier avant chaque étude, ces chiffres dérivent.**

### 3.1 Les 14 secteurs en base

| Slug | Statut | Score | Comptes | Pains | Réglo | Events | News | Verdict |
|---|---|---|---|---|---|---|---|---|
| `parfumerie-aromes` | active | 4.8 | 10 | 8 | 5 | 5 | 7 | **Fiche complète** — référence densité |
| `banque-finance-assurance` | active | 4.4 | 5 | 8 | 5 | 5 | 0 | **Fiche complète** — référence corpus mince |
| `nutraceutique-sante-naturelle` | active | 4.3 | 2 | 6 | 3 | 5 | 0 | **Fiche complète** — référence méthode |
| `transport-mobilite-regionale` | watch | — | 6 | 0 | 0 | 0 | 0 | Coquille vide |
| `btp-construction-immobilier` | watch | — | 11 | 0 | 0 | 0 | 0 | Coquille vide |
| `ehpad-residences-seniors` | watch | — | 2 | 0 | 0 | 0 | 0 | Coquille vide |
| `aeronautique-spatial-defense` | watch | — | 3 | 0 | 0 | 0 | 0 | Coquille vide |
| `logiciels-saas-services-numeriques` | watch | — | 9 | 0 | 0 | 0 | 0 | Coquille vide |
| `secteur-public-enseignement-recherche` | watch | — | 11 | 0 | 0 | 0 | 0 | Coquille vide |
| `sante-medtech-medico-social` | watch | — | 10 | 0 | 0 | 0 | 0 | Coquille vide |
| `commerce-distribution-services-specialises` | watch | — | 12 | 0 | 0 | 0 | 0 | Coquille vide |
| `tourisme-hotellerie-loisirs` | watch | — | 5 | 0 | 0 | 0 | 0 | Coquille vide |
| `energie-petrochimie-environnement` | watch | — | 5 | 0 | 0 | 0 | 0 | Coquille vide |
| `industrie-manufacturiere-electronique-equipements` | watch | — | 5 | 0 | 0 | 0 | 0 | Coquille vide |

**Lecture :** **96/96 comptes** sont rattachés à un secteur. **3 secteurs sur 14 sont réellement étudiés.** Les 11 « watch » sont des **conteneurs de rattachement**, pas des études — ils ont un `playbook` squelette vide (75 caractères) et zéro contenu.

C'est un état **sain et voulu** : un `status = 'watch'` dit honnêtement « on a rangé les comptes ici, on n'a pas encore étudié le marché ». Ne jamais afficher un score sur un `watch`.

### 3.2 Les prérequis — à quelles conditions une étude vaut le coup

Une étude coûte 5 heures. La question « ce secteur est-il prêt ? » se calcule.

> ⚠️ **`lifecycle_status` n'a que 4 valeurs** : `prospect` · `client` · `ancien_client` · `partenaire` (CHECK vérifié le 2026-07-16, migration `restrict_company_lifecycle_statuses`). **`client_actif`, `cible`, `client_dormant`, `non_prioritaire`, `exclu` n'existent plus** — CLAUDE.md les liste encore, il a tort. Une requête qui filtre sur `client_actif` renvoie toujours 0.

#### Les 5 prérequis, par ordre d'importance

| # | Prérequis | Seuil | Pourquoi | Si absent |
|---|---|---|---|---|
| 1 | **Une ancre de preuve** — un compte `client`, **ou** un `process_diagnostic` réel | ≥ 1 | C'est l'étage 3 (§2.3). Sans elle, tu n'as aucune référence vérifiable à opposer à « prouvez-le » | Plafond **4.5**, jamais plus |
| 2 | **De la matière FOLIO** — comptes avec `metadata.sector_analysis` | ≥ 3 | C'est la mine de la Phase 1. Sans elle, tu pars du web = fiche générique | Plafond **4.0** |
| 3 | **Des interactions** — la seule source légitime de verbatim | ≥ 5 | Sans elles, `verbatim` reste NULL partout et C3 ne tient que par le caveat | Caveat verbatims obligatoire |
| 4 | **Une pression réglementaire trouvable** (test externe, pas en base) | ≥ 3 échéances datables | C'est l'étage 1, celui qui crée le RDV | Plafond **3.5** (Gate 2) |
| 5 | **Des missions ou opportunités** dans le secteur | ≥ 1 | Preuve de fit : on a déjà vendu ici | Fit = hypothèse, pas fait |

**Réponse directe à « faut-il les études FOLIO ? »** — Non, ce n'est pas bloquant, mais **c'est le prérequis n°2 et il change la nature du livrable**. Avec FOLIO tu *diagnostiques* (tu t'appuies sur ce que KREDO sait des comptes réels) ; sans FOLIO tu *documentes* (tu produis ce que n'importe quelle ESN aurait trouvé). Les deux sont utiles, mais seul le premier est différenciant — et FOLIO n'est **jamais une source**, seulement une matière à re-vérifier (§1.1).

**Réponse directe à « combien d'analyses clients ? »** — Le seuil pratique est **3 comptes avec `sector_analysis`**. En dessous, tu peux produire une fiche honnête (précédent `banque-finance-assurance` : 4 comptes, score 4.4 assumé), mais tu dois le déclarer en caveat et baisser le score. À **0**, c'est une fiche réglementaire pure (§9), plafond 3.5.

#### État de préparation mesuré (2026-07-16)

Les 11 secteurs sous veille, classés par ce qui compte réellement — **pas par nombre de comptes** :

| Secteur | Comptes | FOLIO | Ancre de preuve | Interactions | Missions | Opps | Verdict |
|---|---|---|---|---|---|---|---|
| **`sante-medtech-medico-social`** | 10 | **10/10** | 1 diagnostic | **16** | 3 | **4** | 🥇 **Le plus prêt.** Corpus complet, verbatims disponibles, fit déjà prouvé |
| **`tourisme-hotellerie-loisirs`** | 5 | 3 | **Voyage Privé (client)** + 2 diagnostics | 10 | **8** | 2 | 🥈 Peu de comptes, mais la **preuve de delivery la plus profonde** |
| **`transport-mobilite-regionale`** | 6 | 6/6 | 1 diagnostic | **18** | 1 | **4** | 🥉 Le plus de verbatims potentiels |
| `btp-construction-immobilier` | 11 | 8 | **Audemard (client)** + 3 diagnostics | 1 | 0 | 0 | Bonne ancre, mais **1 seule interaction** → pas de verbatim |
| `logiciels-saas-services-numeriques` | 9 | 9/9 | 2 diagnostics (+1 ancien client) | 2 | 0 | 1 | Corpus complet, relationnel faible |
| `aeronautique-spatial-defense` | 3 | 2 | **Exail Robotics (client)** | 7 | 1 | 3 | Ancre + pipe, mais corpus mince (plafond 4.0) |
| `industrie-manufacturiere-…` | 5 | 5/5 | — | 7 | 0 | 2 | Pas d'ancre → plafond 4.5 |
| `commerce-distribution-…` | **12** | 10 | — | 2 | 2 | 0 | ⚠️ **Le plus de comptes, et pourtant faible** : aucune ancre, 2 interactions |
| `secteur-public-enseignement-…` | 11 | 7 | — | 0 | 2 | 1 | ⚠️ **0 interaction** → aucun verbatim possible |
| `energie-petrochimie-environnement` | 5 | 5/5 | — | 1 | 0 | 0 | Corpus sans relationnel |
| `ehpad-residences-seniors` | 2 | 2 | 1 diagnostic | 2 | 0 | 0 | Corpus mince (plafond 4.0) |

> **Ce que ce tableau corrige :** l'intuition « on attaque le secteur qui a le plus de comptes » désigne `commerce-distribution` (12 comptes) — qui est en réalité un des plus faibles : aucune ancre de preuve, 2 interactions, 0 opportunité. Le nombre de comptes ne dit rien de la qualité d'une étude. **`sante-medtech-medico-social` est le prochain à faire.**

Requête à rejouer avant de choisir (les chiffres dérivent) :

```sql
SELECT s.slug, s.status,
       COUNT(c.id)                                                         AS comptes,
       COUNT(*) FILTER (WHERE c.metadata->'sector_analysis' IS NOT NULL)   AS folio,
       COUNT(*) FILTER (WHERE c.lifecycle_status = 'client')               AS clients,
       (SELECT COUNT(*) FROM interactions i JOIN companies c2 ON c2.id = i.company_id
          WHERE c2.sector_id = s.id)                                       AS interactions,
       (SELECT COUNT(*) FROM missions m JOIN companies c3 ON c3.id = m.company_id
          WHERE c3.sector_id = s.id)                                       AS missions,
       (SELECT COUNT(*) FROM opportunities o JOIN companies c4 ON c4.id = o.company_id
          WHERE c4.sector_id = s.id)                                       AS opportunites,
       (SELECT COUNT(DISTINCT r.id) FROM ai_intelligence_results r
          JOIN ai_intelligence_runs run ON run.id = r.run_id
          JOIN companies c5 ON c5.id = run.company_id
          WHERE c5.sector_id = s.id AND r.result_type = 'process_diagnostic'
            AND r.status = 'succeeded')                                    AS diagnostics
FROM sector_intelligence s
LEFT JOIN companies c ON c.sector_id = s.id
WHERE s.status = 'watch'
GROUP BY s.id, s.slug, s.status
ORDER BY COUNT(*) FILTER (WHERE c.metadata->'sector_analysis' IS NOT NULL) DESC;
```

---

## 4. Les sources — d'où vient l'information

**L'ordre est impératif : interne d'abord, externe ensuite.** Un pain point adossé à un diagnostic réel vaut dix généralités plausibles trouvées sur le web. Chercher sur le web en premier, c'est produire une fiche que n'importe quelle ESN aurait pu écrire.

### 4.1 Sources internes (Phase 1) — la mine

| Source | Volume réel | Ce qu'on y trouve | Fiabilité |
|---|---|---|---|
| `companies.metadata.sector_analysis` | **81/96 comptes** | Analyse marché 7 sections, dense | ⚠️ **Aucune source, non daté, vu depuis un compte** |
| `companies.metadata.analysis_data` | **93/96 comptes** | Actualités, croissance, recrutements, maturité digitale | ⚠️ Idem, import unique du 09/06/2026 |
| `ai_intelligence_results` (`result_type='process_diagnostic'`) | **4 comptes seulement** | Diagnostic process réel, structuré | ✅ **La meilleure source disponible** |
| `account_signals` | ~745 lignes, 93 comptes | Signaux d'achat (dont 79/93 issus de FOLIO, non quantifiés) | ⚠️ Mixte — voir §4.3 |
| `interactions` | 140 lignes | Historique relationnel réel, verbatims potentiels | ✅ Source des verbatims |
| `missions` / `opportunities` | 23 / 24 | Ce qu'on a réellement vendu dans ce secteur | ✅ Preuve de fit |
| `offers` / `offer_pricing_grids` | 41 / 120 | Catalogue réel + TJM par practice | ✅ Factuel |

### 4.2 Le paquet de requêtes Phase 1 (à exécuter tel quel)

> ⚠️ **Ces requêtes remplacent celles du skill `kredo-sector-intelligence`, qui référencent des tables inexistantes** (`company_audit`) et des colonnes renommées (`ai_score`, `opportunities.status`, `opportunities.amount_eur`). Voir §12.

```sql
-- 0. Contexte
SELECT id, name FROM workspaces;                       -- un seul workspace attendu
SELECT id, slug, name, status FROM sector_intelligence ORDER BY slug;

-- 1. Les comptes du secteur (le corpus)
SELECT c.id, c.name, c.lifecycle_status, c.revenue, c.employee_count,
       c.hq_location, c.website, c.legacy_folio_score
FROM companies c
JOIN sector_intelligence s ON s.id = c.sector_id
WHERE s.slug = '[SLUG]'
ORDER BY (c.lifecycle_status = 'client') DESC, c.revenue DESC NULLS LAST;
-- lifecycle_status ∈ prospect | client | ancien_client | partenaire — PAS 'client_actif'

-- 2. LA MINE : les analyses sectorielles FOLIO du secteur
SELECT c.name, c.lifecycle_status,
       c.metadata->'sector_analysis'->>'synthese_sectorielle'          AS synthese,
       c.metadata->'sector_analysis'->'environnement_normatif'         AS normatif,
       c.metadata->'sector_analysis'->'volume_marche'                  AS marche,
       c.metadata->'sector_analysis'->'analyse_concurrentielle'        AS concurrence,
       c.metadata->'sector_analysis'->'chaine_valeur'                  AS chaine_valeur,
       c.metadata->'sector_analysis'->'segment_clientele'              AS clientele,
       c.metadata->'analysis_data'                                     AS folio_signaux
FROM companies c
JOIN sector_intelligence s ON s.id = c.sector_id
WHERE s.slug = '[SLUG]'
  AND c.metadata->'sector_analysis' IS NOT NULL;

-- 3. Les diagnostics moteur réels (rares mais en or) — matcher par result_type, JAMAIS par phase
SELECT c.name, r.result_type, r.content_json, r.created_at
FROM ai_intelligence_results r
JOIN ai_intelligence_runs run ON run.id = r.run_id
JOIN companies c ON c.id = run.company_id
JOIN sector_intelligence s ON s.id = c.sector_id
WHERE s.slug = '[SLUG]'
  AND r.result_type IN ('process_diagnostic', 'account_knowledge')
  AND r.status = 'succeeded';

-- 4. Ce qu'on a réellement vendu / perdu dans ce secteur
SELECT o.title, o.stage, o.estimated_gain, o.target_daily_rate, o.expected_close_date, c.name
FROM opportunities o
JOIN companies c ON c.id = o.company_id
JOIN sector_intelligence s ON s.id = c.sector_id
WHERE s.slug = '[SLUG]'
ORDER BY o.expected_close_date DESC NULLS LAST;

SELECT m.title, m.practice, m.tjm, m.status, m.start_date, m.end_date, c.name
FROM missions m
JOIN companies c ON c.id = m.company_id
JOIN sector_intelligence s ON s.id = c.sector_id
WHERE s.slug = '[SLUG]';

-- 5. Verbatims potentiels (la seule source légitime de citation)
SELECT i.occurred_at, i.type, i.summary, i.details, c.name
FROM interactions i
JOIN companies c ON c.id = i.company_id
JOIN sector_intelligence s ON s.id = c.sector_id
WHERE s.slug = '[SLUG]'
ORDER BY i.occurred_at DESC;

-- 6. Signaux déjà captés
SELECT sig.signal_type, sig.title, sig.description, sig.confidence_score,
       sig.relevance_score, sig.urgency_score, sig.detected_at, c.name
FROM account_signals sig
JOIN companies c ON c.id = sig.company_id
JOIN sector_intelligence s ON s.id = c.sector_id
WHERE s.slug = '[SLUG]'
  AND (sig.expires_at IS NULL OR sig.expires_at > now())
ORDER BY sig.urgency_score DESC, sig.detected_at DESC;

-- 7. Ancrage tarifaire réel (pour avg_tjm_min / avg_tjm_max)
SELECT p.slug AS practice, MIN(g.daily_rate_min) AS tjm_min, MAX(g.daily_rate_max) AS tjm_max
FROM offer_pricing_grids g
JOIN offer_practices p ON p.id = g.practice_id
GROUP BY p.slug;
```

**Classement du corpus à l'issue de la Phase 1 :**

| Classe | Critère | Conséquence sur la fiche |
|---|---|---|
| **Riche** | ≥ 3 comptes avec `sector_analysis` **et** une ancre de preuve — un compte `lifecycle_status='client'` **ou** un `process_diagnostic` réel | Score plafond 5.0 · verbatims attendus · fréquences vérifiables |
| **Moyen** | 2-3 comptes avec matière, **aucune ancre de preuve** | Score plafond **4.5** · caveat corpus obligatoire |
| **Mince** | 0-1 compte exploitable | Score plafond **4.0** · caveat en tête de fiche · compenser par le réglementaire |

> Un corpus mince n'est **jamais** un motif d'abandon. C'est un motif de **baisser le score et de le dire**. Précédent : `banque-finance-assurance`, 4.4 assumé, 0 verbatim déclaré.

### 4.3 Sources externes (Phase 2) — les 4 blocs

**Budget : 8 à 12 requêtes.** Au-delà, on ne cherche plus, on procrastine. Si un point reste flou après 12 requêtes → il est marqué « à confirmer », pas creusé indéfiniment.

#### Bloc B1 — Marché & taille (2-3 requêtes)
- `"[secteur] France marché taille 2026"` · `"[secteur] market size CAGR 2026"`
- Sources à privilégier : fédération professionnelle du secteur (Synadiet, FEBEA, UIMM…), INSEE, Xerfi, IDC/Gartner, rapports annuels d'acteurs cotés.
- **Le rapport annuel d'un acteur coté du secteur est souvent la meilleure source gratuite** — chiffres audités, datés, citables. (Précédent : Robertet 843,9 M€ CA 2025, +7,6 % organique.)
- Livrable : `market_size_eur_bn`, `market_growth_pct`, `digital_maturity`.

#### Bloc B2 — Réglementation & calendrier ⭐ **LE BLOC CRITIQUE** (4-5 requêtes)

C'est l'étage 1 (§2.3). C'est ce bloc qui produit les rendez-vous.

```
1. "réglementation [secteur] France 2026 2027 obligatoire"
2. "[nom réglementation] date application échéance"
3. "[réglementation] impact DSI SI conséquences" ← en français, articles business, PAS le texte juridique
```

**Sources officielles obligatoires pour valider une date** — une deadline non confirmée sur l'une d'elles ne rentre **pas** avec une date précise :

| Source | Périmètre |
|---|---|
| EUR-Lex | Droit européen (règlements, directives) |
| Legifrance | Droit français (lois, décrets, JORF) |
| Le régulateur sectoriel | ACPR/AMF (finance), ANSM (santé), DGCCRF (conso), ANSSI (cyber), ADEME |
| CNIL | Données personnelles |
| Site de la Commission européenne (DG concernée) | Calendriers d'application progressive |

**Règle de fiabilité :** date non confirmée sur source officielle → `deadline_date = NULL` + `description` contenant « échéance à confirmer ». **Jamais** une date approximative présentée comme certaine.

**Piège documenté :** FOLIO cite des réglementations avec des échéances vagues (« 2026-2030 (mise en œuvre progressive) », « En cours, révisions régulières »). **Ne jamais recopier une échéance FOLIO telle quelle** — elle doit être re-vérifiée sur source officielle, ou dégradée en « à confirmer ».

#### Bloc B3 — Trigger events (2-3 requêtes)
- Acquisitions / levées : `"[acteurs] acquisition levée de fonds 2025 2026"`
- Incidents concurrents : `"[secteur] incident cyberattaque rappel produit 2026"`
- Nominations DSI/CDO : `"[acteurs] nomination DSI CTO 2026"` — signal de remise à plat du SI
- Rapports récents : `"[secteur] rapport 2026 transformation digitale IA"`

**Fenêtre :** 6-12 derniers mois. Au-delà, l'événement perd sa valeur d'urgence et encombre la fiche.

#### Bloc B4 — Fit practice & cas d'usage (1-2 requêtes)
- `"[secteur] cas d'usage IA data"` · `"[secteur] cybersécurité enjeux 2026"`
- Sert à calibrer `practices_fit` **honnêtement**. Ne pas gonfler une practice parce qu'on aimerait la vendre.

### 4.4 Traçabilité des sources — obligatoire

Pour **chaque** chiffre retenu, conserver : URL + date de consultation + ce que la source confirme exactement.

Format imposé dans les `roi_arguments` (précédent nutraceutique, à généraliser) :

```
"[Affirmation chiffrée]. Source: [nom source précis], [date]."
"[Affirmation]. Potentiel estimé à X%, à valider sur le contexte client. Source: estimation Kredo, justifiée par [raison factuelle]."
```

> Test de survie : un DSI demande « vous tenez ça d'où ? ». Si la réponse est « nulle part, ça sonnait bien » → l'affirmation se reformule en estimation explicite ou disparaît.

---

## 5. Le processus — 7 phases

### 5.1 Vue d'ensemble

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │ P0  CADRAGE            30 min   Choisir le secteur, vérifier l'accès│
  └───────────────────────────┬─────────────────────────────────────────┘
                              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ P1  AUDIT CORPUS       1-1h30   Ce que KREDO sait déjà              │
  │     ▸ 7 requêtes SQL (§4.2) ▸ classement riche/moyen/mince          │
  └───────────────────────────┬─────────────────────────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ GATE 1 : corpus classé ?      │──non──▶ Corpus vide total :
              │ ≥1 compte avec matière ?      │         remonter à P0, changer
              └───────────────┬───────────────┘         de secteur ou assumer
                              │ oui                     une fiche "réglementaire pure"
                              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ P2  RECHERCHE EXTERNE  1-2h     Combler les trous, PAS tout chercher│
  │     ▸ B1 marché ▸ B2 réglo ⭐ ▸ B3 triggers ▸ B4 fit               │
  │     ▸ 8-12 requêtes max ▸ chaque date vérifiée sur source officielle│
  └───────────────────────────┬─────────────────────────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ GATE 2 : ≥3 items réglo avec  │──non──▶ Fiche sans étage 1.
              │ dates vérifiées ?             │         Autorisé mais score
              └───────────────┬───────────────┘         plafonné à 3.5 + caveat
                              │ oui
                              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ P3  SYNTHÈSE           45 min   Le brouillon YAML (§6)              │
  │     ▸ pain points ▸ personas ▸ ROI ▸ objections ▸ score            │
  └───────────────────────────┬─────────────────────────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ GATE 3 : AUTO-CONTRÔLE (§10)  │──<70──▶ Retour P2 ou P3.
              │ score qualité ≥ 70/100 ?      │         Ne JAMAIS injecter
              └───────────────┬───────────────┘         une fiche sous 70.
                              │ ≥70
                              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ P4  INJECTION          30 min   apply_migration, transactionnel     │
  │     ▸ 1 fichier SQL ▸ tout ou rien ▸ vérif post-injection          │
  └───────────────────────────┬─────────────────────────────────────────┘
                              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ P5  VALIDATION FRONT   15 min   3 pages à ouvrir (§8.4)             │
  └───────────────────────────┬─────────────────────────────────────────┘
                              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ P6  REMISE             15 min   Solide vs à valider terrain         │
  └─────────────────────────────────────────────────────────────────────┘

  Budget total : 4h30 – 6h
```

### 5.2 RACI

| Phase | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| P0 Cadrage | Agent | **Guillaume** | — | — |
| P1 Audit corpus | Agent | Agent | — | Guillaume |
| P2 Recherche externe | Agent | Agent | — | — |
| P3 Synthèse | Agent | Agent | **Guillaume** (si doute stratégique sur l'angle) | — |
| **Gate 3 Auto-contrôle** | Agent | **Guillaume** | — | — |
| P4 Injection | Agent | **Guillaume** | — | — |
| P5 Validation front | Agent | Agent | — | Guillaume |
| P6 Remise | Agent | **Guillaume** | — | Équipe commerciale |

> **Guillaume est Accountable sur P0, Gate 3, P4 et P6.** Ce sont les 4 points où une erreur coûte : mauvais secteur choisi, fiche faible injectée, base corrompue, fiche fausse utilisée en RDV.

### 5.3 Détail par phase

#### P0 — Cadrage (30 min)

**Qui :** Agent, décision Guillaume · **Déclencheur :** demande explicite, ou file d'attente §3.2

Variables à figer :

| Variable | Comment l'obtenir |
|---|---|
| `SECTEUR_SLUG` | Existe déjà en `watch` (voir §3.1) → **le réutiliser**, ne jamais créer un doublon |
| `SECTEUR_NOM` | Le nom en base fait foi si le secteur existe |
| `WORKSPACE_ID` | `SELECT id FROM workspaces;` — un seul attendu |
| `GEOGRAPHIE` | PACA par défaut |
| `ACTEURS_CLES` | Déduits de la requête 1 (§4.2) + recherche rapide |

**Contrôles bloquants :**
- [ ] Connecteur Supabase disponible ? Sinon → **stop**, le dire.
- [ ] Le slug existe-t-il déjà ? Si `status='active'` → c'est une **mise à jour**, pas une création (voir §9.2).
- [ ] Combien de comptes rattachés ? < 2 → alerter Guillaume avant d'engager 5h.

**Output :** fiche de cadrage (6 variables + décision go/no-go).

#### P1 — Audit du corpus (1h – 1h30)

**Qui :** Agent · **Comment :** exécuter les 7 requêtes de §4.2 dans l'ordre

**Ne jamais sauter cette phase pour foncer sur la recherche web.** C'est la différence entre diagnostiquer et inventer.

Ce qu'on extrait :
1. **Le récurrent** — un enjeu cité dans 3 `sector_analysis` sur 5 est un pain point sectoriel. Cité une fois → c'est un enjeu de compte, il reste au cockpit compte.
2. **Les verbatims** — uniquement depuis `interactions` ou un diagnostic réel. Rien d'autre n'est une citation.
3. **La preuve de fit** — `missions` gagnées dans le secteur = argument étage 3.
4. **Le comptage** — pour chaque pain point pressenti, **noter les UUID des comptes** où il apparaît. Ces UUID vont dans `source_company_ids`. **C'est ce qui rend `frequency_count` vérifiable.**

**Output :** tableau des pains candidats (titre, comptes sources UUID, fréquence), liste verbatims réels, classement corpus.

#### P2 — Recherche externe (1h – 2h)

**Qui :** Agent · **Comment :** §4.3, blocs B1→B4, 8-12 requêtes, priorité absolue à B2

**Output :** items réglementaires datés+sourcés, chiffres marché sourcés, trigger events datés, tableau URL → fait confirmé.

#### P3 — Synthèse (45 min)

**Qui :** Agent · Consulter Guillaume si l'angle commercial est ambigu.

**Output :** le brouillon YAML complet (§6) + auto-contrôle §10.

#### P4 — Injection (30 min)

**Qui :** Agent · **Accountable :** Guillaume · **Comment :** §7

#### P5 — Validation front (15 min)

**Qui :** Agent · **Comment :** §8.4

#### P6 — Remise (15 min)

**Qui :** Agent · **Format imposé :**

```markdown
## Fiche [SECTEUR] — livrée

**Score : X.X/5** (corpus : riche|moyen|mince, N comptes, M avec matière FOLIO)

### ✅ SOLIDE — défendable en RDV sans réserve
- [fait] — Source : [source précise + date]

### ⚠️ À VALIDER TERRAIN — à formuler comme hypothèse en RDV
- [hypothèse] — Pourquoi non confirmé : [raison]

### ❌ TROUS ASSUMÉS
- [ex : aucun verbatim client réel — corpus sans interaction exploitable]

### 🔗 Liens
- Fiche : /prospection/approche-sectorielle/[slug]
- Playbook : /ressources/playbook/[slug]
```

> Cette section n'est pas une formalité. **C'est le livrable le plus important pour Guillaume** : elle dit ce qu'il peut affirmer et ce qu'il doit formuler au conditionnel.

---

## 6. Le livrable — structure exacte

### 6.1 Brouillon de synthèse (P3, document de travail)

```yaml
SECTEUR: "[Nom officiel]"
SLUG: "[kebab-case — RÉUTILISER le slug watch existant]"
STATUS: active            # 'watch' → 'active' au moment où la fiche est réellement remplie

MARCHE:
  market_size_eur_bn: X.X          # NULL si non trouvé — jamais inventé
  market_growth_pct: Y.Y
  digital_maturity: low|medium|high
  justification: "[1 phrase] Source: [source + date]"

ACTEURS:
  paca:      # 4-8 — nominatifs, avec CA si connu
    - {name: "X", size: "164 M€", note: "[2 lignes : position + pourquoi ça nous intéresse]"}
  national:  # 4-5
    - {name: "Y", size: "Géant", note: "[...]"}

REGLEMENTATION:   # ⭐ 3-5 items — LE CŒUR
  - name: "[Nom officiel exact de la directive/loi]"
    authority: EU|FR|Monaco
    deadline_date: YYYY-MM-DD      # NULL si non confirmé sur source officielle
    urgency: critical|high|medium|low
    description: "[1 phrase compréhensible par un DSI, pas le texte juridique]"
    commercial_angle: "[Ce que KREDO fait précisément face à cette échéance]"
    is_commercial_window: true|false
    source_url: "[URL EUR-Lex/Legifrance/régulateur]"

PAIN_POINTS:   # 5-8
  - title: "[Problème SPÉCIFIQUE et actionnable — pas 'complexité IT']"
    frequency_count: N             # comptage RÉEL
    source_company_ids: [uuid, uuid]   # ⚠️ OBLIGATOIRE — c'est la preuve du comptage
    kredo_practice: data_ai|cloud_eng|product|cyber|multi
    verbatim: "[citation EXACTE depuis interactions/diagnostic]"   # NULL sinon
    description: "[impact chiffré si disponible]"

TRIGGER_EVENTS:   # 3-5, datés < 12 mois
  - title: "[...]"
    event_type: regulatory|market|competitor|appointment|tender|report|other
    event_date: YYYY-MM-DD
    commercial_opportunity: "[l'action commerciale que ça déclenche]"
    source_url: "[URL — UNIQUE dans toute la table]"

PLAYBOOK:
  personas: [4 max]
  roi_arguments: [5 max — chacun avec sa source dans le texte]
  objections: [3 max]
  entry_points: [4 max]

SCORE:
  value: X.X
  detail: "[le calcul §6.3, composante par composante]"

CAVEATS:   # ⚠️ NE JAMAIS OMETTRE
  verbatims: "[ex: 'Aucun verbatim réel — corpus sans interaction exploitable']"
  frequences: "[ex: 'Comptage sur 5 comptes, non exhaustif']"
  marche: "[ex: 'Taille marché non trouvée en source publique']"
  sources: [liste URL + date de consultation]
```

### 6.2 Le playbook JSONB — règles de qualité

Structure imposée par le type TS `SectorPlaybook` (`src/types/sector.ts`) — **4 clés exactement, ni plus ni moins** : `personas`, `roi_arguments`, `objections`, `entry_points`.

#### Personas (4 max) — `{role, enjeu, peur}`

> **`peur` ≠ `enjeu` reformulé.** L'enjeu est ce qui est écrit dans sa fiche de poste. La peur est ce qui l'empêche de dormir.

| ❌ Faux (enjeu déguisé) | ✅ Vrai (peur) |
|---|---|
| « Ne pas être conforme » | « Voir l'avantage concurrentiel historique érodé par la technologie des géants » *(parfumerie, DSI)* |
| « Manque d'efficacité » | « Perdre des briefs au profit de concurrents plus rapides + perte de savoir-faire au départ des parfumeurs seniors » *(parfumerie, R&D)* |
| « Difficulté à piloter » | « Découvrir trop tard un angle mort qui bloque un audit ou une intégration post-M&A » *(nutraceutique, DSI)* |

**Test :** la peur doit être remplaçable par « audit raté », « perte de confiance du COMEX », « se faire distancer ». Sinon, recommencer.

**Les 4 personas ne doivent pas être interchangeables.** Si les 4 « veulent de l'efficacité », il n'y en a qu'un.

#### ROI arguments (5 max) — `string[]`

Format imposé (précédent nutraceutique) :
```
"[Métrique] : [état initial] → [état final], impact [€/temps/%]. Source: [source précise + date]."
```

| ❌ | ✅ |
|---|---|
| « Nous réduisons les coûts de 50 % » | « Screening réglementaire IA : de 2-4 semaines à 2-3 jours par formule (validé sur diagnostic Robertet) » |
| « Gain de productivité important » | « Cartographie outillée du parc : chez Arkopharma, ~20 serveurs non documentés ont ajouté 4 jours sur 22 à la phase d'audit, soit ~18 % d'effort récupérable. Source: projet interne ARKO-2026-001. » |
| « Réduction de 40 % du time-to-market » *(sans source)* | « Potentiel estimé à -30 % à -50 %, à valider sur le contexte client. Source: estimation Kredo, justifiée par [fait]. » |

#### Objections (3 max) — `{objection, reponse}`

> Une objection générique est le signe qu'on n'a pas creusé le métier.

| ❌ Générique | ✅ Spécifique au métier |
|---|---|
| « C'est trop cher » | « **L'IA va remplacer nos parfumeurs / notre savoir-faire** » — crainte identitaire propre à un métier artisanal séculaire *(parfumerie)* |
| « On n'a pas le temps » | « **Le réglementaire est déjà sous l'eau ; si on lance un chantier data maintenant, on bloque les mises en marché** » *(nutraceutique)* |
| « On verra plus tard » | « **On sort d'une intégration ; ce n'est pas le moment d'ajouter un système** » *(nutraceutique)* |

La `reponse` doit contenir un exemple réel si disponible.

#### Entry points (4 max) — `string[]`

Les 4 archétypes, **un de chaque** :
1. **Réglementaire** — échéance datée : crée le RDV sans avoir à « vendre »
2. **Quick-win** — audit 2-6 semaines : crée la confiance avant le structurant
3. **Patrimoine / transformation** — le projet 6-12 mois
4. **Réseau** — l'introduction par un pair du bassin (ex : « GIP Parfums de Grasse : porte d'entrée institutionnelle »)

### 6.3 Le score d'attractivité — formule explicite

`attractiveness_score` ∈ [0, 5], contrainte SQL `CHECK (>= 0 AND <= 5)`.

| Composante | Poids | Barème 0-5 |
|---|---|---|
| **Potentiel CA** | 30 % | Nb comptes × taille moyenne × TJM observable |
| **Fit practices** | 25 % | `max(practices_fit)` — le meilleur fit, pas la moyenne |
| **Accessibilité géo** | 20 % | 5 = cluster PACA dense · 1 = aucun ancrage local |
| **Urgence réglementaire** | 15 % | 5 = ≥2 échéances `critical` < 12 mois · 0 = aucune |
| **Concurrence** | 10 % | 5 = aucune ESN spécialisée présente · 1 = marché saturé |

```
score_brut = 0.30·CA + 0.25·FIT + 0.20·GEO + 0.15·REGLO + 0.10·CONC
score_final = min(score_brut, plafond_corpus)
```

**Plafonds de corpus (non négociables) :**

| Corpus | Plafond |
|---|---|
| Riche (≥3 comptes avec matière + une ancre de preuve : compte `client` ou diagnostic) | 5.0 |
| Moyen (2-3 comptes, aucune ancre de preuve) | **4.5** |
| Mince (0-1 compte exploitable) | **4.0** |
| Aucun item réglementaire daté (Gate 2 échoué) | **3.5** |

> **Le plafond bat toujours le calcul.** Un 4.8/5 sur un corpus d'un compte n'est pas un score, c'est un mensonge. Précédent contraire : parfumerie 4.8 sur 10 comptes + client actif + diagnostic réel = mérité.

Le champ `description` doit rendre le score lisible : mentionner le nombre de comptes sources.

---

## 7. Injection en base — contrat technique

### 7.1 Le schéma réel (vérifié live le 2026-07-16)

> Ce schéma **fait autorité**. L'ancien skill en portait une copie qui avait dérivé sur trois points bloquants — c'est pourquoi le skill réécrit n'en contient plus aucune (§12.6).

```sql
sector_intelligence (
  id uuid PK,
  workspace_id uuid NOT NULL → workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,                     -- UNIQUE (workspace_id, slug) ← PAS unique seul
  description text,
  status text NOT NULL,                   -- CHECK IN ('active','development','watch')
  attractiveness_score numeric,           -- CHECK 0..5
  market_size_eur_bn numeric,
  market_growth_pct numeric,              -- ⚠️ PAS 'growth_rate_pct'
  digital_maturity text,                  -- CHECK IN ('low','medium','high')
  practices_fit jsonb NOT NULL,           -- ⚠️ NOT NULL
  key_players_paca jsonb NOT NULL,        -- ⚠️ NOT NULL
  key_players_national jsonb NOT NULL,    -- ⚠️ NOT NULL
  avg_tjm_min integer, avg_tjm_max integer,
  playbook jsonb NOT NULL,                -- ⚠️ NOT NULL
  caveats jsonb,                          -- ⭐ migration 058 — la transparence (§6.1), affichée en prod.
                                          --    Clés : verbatims, frequences, corpus, marche, sources[].
                                          --    NULL = aucune réserve déclarée → l'UI le signale comme un risque.
  image_url text,                         -- ⭐ migration 057 — visuel de la carte. NULL = fond navy.
  created_at, updated_at timestamptz NOT NULL
)

sector_pain_points (
  id, workspace_id uuid NOT NULL,         -- ⚠️ ABSENT DU TEMPLATE DU SKILL → échec
  sector_id uuid NOT NULL → sector_intelligence(id) ON DELETE CASCADE,
  title text NOT NULL, description text,
  frequency_count integer NOT NULL,       -- ⚠️ NOT NULL
  source_company_ids uuid[] NOT NULL,     -- ⚠️ NOT NULL, ABSENT DU SKILL — mettre '{}' au pire
  kredo_practice text,                    -- CHECK IN ('data_ai','cloud_eng','product','cyber','multi')
  verbatim text, created_at, updated_at
)

sector_regulatory_items (
  id, workspace_id uuid NOT NULL,         -- ⚠️ ABSENT DU SKILL
  sector_id uuid NOT NULL → CASCADE,
  name text NOT NULL, authority text, description text,
  deadline_date date,
  urgency text NOT NULL,                  -- CHECK IN ('critical','high','medium','low')
  kredo_practice text,                    -- CHECK IN (5 valeurs)
  commercial_angle text,
  is_commercial_window boolean NOT NULL,
  source_url text,                        -- ⭐ migration 058 — source officielle confirmant deadline_date.
                                          --    NULL + deadline_date renseignée → l'UI affiche
                                          --    « Date non vérifiée — à confirmer ». C'est le critère A3.
  created_at, updated_at
)

sector_events (
  id, workspace_id uuid NOT NULL, sector_id uuid NOT NULL → CASCADE,
  title text NOT NULL,
  event_type text NOT NULL,               -- CHECK IN ('regulatory','market','competitor','appointment','tender','report','other')
  description text, event_date date,
  source_url text,                        -- ⚠️ UNIQUE (sector_events_source_url_unique)
  commercial_opportunity text,
  status text NOT NULL,                   -- CHECK IN ('pending','acted','dismissed')
  created_at, updated_at
)

sector_news (                             -- ⚠️ NE PAS écrire ici manuellement : alimenté par n8n
  id, workspace_id, sector_id → CASCADE,
  title NOT NULL, source, url,            -- UNIQUE (url)
  summary, published_at,
  relevance_score numeric,                -- CHECK 0..1
  tags text[] NOT NULL, is_trigger_event boolean NOT NULL, created_at
)
```

**Les 4 pièges qui font échouer l'injection :**

| # | Piège | Conséquence | Fix |
|---|---|---|---|
| 1 | `workspace_id` omis sur pains/réglo/events | `null value violates not-null constraint` → **transaction annulée** | Le passer explicitement partout |
| 2 | `source_company_ids` omis | Idem (NOT NULL) | `ARRAY[...]::uuid[]` ou `'{}'::uuid[]` |
| 3 | Deux `sector_events` avec la même `source_url` | Violation UNIQUE → **tout annulé** | Dédupliquer AVANT |
| 4 | Apostrophes françaises dans le JSON/texte | Erreur de parsing | **Dollar-quoting** `$KREDO$…$KREDO$` |

### 7.2 Le piège n°5 — celui qui est passé en production

> **Défaut réel constaté sur `nutraceutique-sante-naturelle` (30/06/2026) : tous les accents ont été mangés.**
>
> En base et donc **affiché en production** : *« Decouvrir trop tard un angle mort »*, *« Directrice Qualite / Affaires Reglementaires »*, *« Referentiel reglementaire et packaging disperse »*, *« tracabilite »*, *« echeances »*…
>
> **Cause :** une désaccentuation défensive à l'écriture pour contourner les problèmes d'échappement. **Le remède est pire que le mal** : la fiche la plus rigoureuse méthodologiquement est aussi la seule qui a l'air d'avoir été écrite à la va-vite. En RDV, un playbook non accentué décrédibilise le contenu qu'il porte.
>
> **Règle :** les accents sont **obligatoires**. On règle l'échappement par le dollar-quoting (`$KREDO$`), jamais par la mutilation du texte.
>
> **Dette à corriger :** réinjecter le playbook et les pain points de `nutraceutique-sante-naturelle` avec les accents. Non fait à ce jour.

### 7.3 Le template d'injection

**Utiliser `apply_migration`, pas `execute_sql`.** Raisons : (1) c'est un changement de contenu de référentiel qui doit être versionné dans `supabase/migrations/`, (2) `execute_sql` passe par une session soumise à la RLS.

**Nom du fichier :** `supabase/migrations/YYYYMMDDHHMMSS_sector_[slug].sql` — le timestamp doit correspondre **exactement** à celui réellement enregistré dans `supabase_migrations.schema_migrations` (piège récurrent du projet, cf. drift de migrations).

```sql
-- Étude sectorielle : [NOM SECTEUR]
-- Corpus : [riche|moyen|mince] — N comptes, M avec sector_analysis FOLIO
-- Score : X.X/5 (plafond corpus : Y.Y)
-- Sources : voir la section CAVEATS de la fiche de remise

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  -- 1. La fiche (UPSERT : les 11 secteurs 'watch' existent déjà)
  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$[Nom officiel]$KREDO$,
    '[slug]',
    $KREDO$[Description : positionnement + gap de marché + fit practice. Mentionner le nb de comptes sources.]$KREDO$,
    'active',
    [X.X], [market_size], [growth],
    '[low|medium|high]',
    '{"data_ai": 5, "cloud_eng": 3, "product": 2, "cyber": 4}'::jsonb,
    $KREDO$[{"name":"X","size":"164 M€","note":"..."}]$KREDO$::jsonb,
    $KREDO$[{"name":"Y","size":"Géant","note":"..."}]$KREDO$::jsonb,
    [tjm_min], [tjm_max],
    $KREDO${
      "personas":      [{"role":"...","enjeu":"...","peur":"..."}],
      "roi_arguments": ["... Source: ..."],
      "objections":    [{"objection":"...","reponse":"..."}],
      "entry_points":  ["Réglementaire: ...", "Quick-win: ...", "Transformation: ...", "Réseau: ..."]
    }$KREDO$::jsonb,
    -- ⭐ Les caveats vont EN BASE, pas seulement dans ta note de remise :
    -- c'est ce que le commercial lit avant d'appeler. Ne les laisse jamais NULL
    -- « parce que la fiche est bonne » — une fiche sans limites déclarées est
    -- une fiche dont on ignore où elle s'arrête, et l'UI le dit.
    $KREDO${
      "verbatims":  "[Réels, ou 'Aucun verbatim client réel — à valider terrain']",
      "frequences": "[Comptage tracé, ou 'Comptage sur N comptes, non exhaustif']",
      "corpus":     "[Taille et nature du corpus + ancre de preuve]",
      "marche":     "[Provenance et fraîcheur des chiffres]",
      "sources":    ["https://…"]
    }$KREDO$::jsonb,
    '/images/sectors/[fichier].jpeg'   -- ou NULL : la carte rend un fond navy
  )
  ON CONFLICT (workspace_id, slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status,
    attractiveness_score = EXCLUDED.attractiveness_score,
    market_size_eur_bn = EXCLUDED.market_size_eur_bn,
    market_growth_pct = EXCLUDED.market_growth_pct,
    digital_maturity = EXCLUDED.digital_maturity,
    practices_fit = EXCLUDED.practices_fit,
    key_players_paca = EXCLUDED.key_players_paca,
    key_players_national = EXCLUDED.key_players_national,
    avg_tjm_min = EXCLUDED.avg_tjm_min, avg_tjm_max = EXCLUDED.avg_tjm_max,
    playbook = EXCLUDED.playbook,
    caveats = EXCLUDED.caveats,
    image_url = COALESCE(EXCLUDED.image_url, sector_intelligence.image_url)
  RETURNING id INTO v_sector_id;

  -- 2. Pain points — purge des lignes du secteur puis réinsertion (idempotent)
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$[Titre spécifique]$KREDO$,
     $KREDO$[Description avec impact chiffré]$KREDO$,
     6,
     ARRAY['[uuid1]','[uuid2]']::uuid[],   -- ⚠️ la preuve du comptage
     'data_ai',
     $KREDO$[Verbatim exact]$KREDO$);      -- ou NULL

  -- 3. Réglementaire ⭐
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$[Nom officiel]$KREDO$, 'EU',
     $KREDO$[1 phrase pour un DSI]$KREDO$,
     '2026-08-12',                          -- NULL si non confirmé sur source officielle
     'critical', 'data_ai',
     $KREDO$[Réponse KREDO]$KREDO$, true,
     -- ⭐ La source officielle qui confirme la date. Une date sans source s'affiche
     -- « Date non vérifiée — à confirmer » : mieux vaut ça qu'un prospect qui te corrige.
     'https://eur-lex.europa.eu/…');

  -- 4. Trigger events — source_url UNIQUE au niveau de la table entière
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$[Titre]$KREDO$, 'market',
     $KREDO$[Description]$KREDO$, '2026-05-28',
     $KREDO$[Action commerciale déclenchée]$KREDO$, 'pending',
     'https://source-unique.example/article');

  -- 5. Rattachement des comptes (souvent déjà fait : 96/96 rattachés)
  UPDATE companies SET sector_id = v_sector_id
  WHERE workspace_id = v_workspace_id
    AND id IN ('[uuid1]','[uuid2]');

  RAISE NOTICE 'Secteur % injecté : %', '[slug]', v_sector_id;
END
$migration$;
```

> **Pourquoi `DELETE` + `INSERT` plutôt que `ON CONFLICT` sur les tables filles :** elles n'ont pas de clé naturelle unique (`title` n'est pas unique). La purge par `sector_id` rend la migration **rejouable** sans doublon — indispensable quand on itère sur une fiche.

### 7.4 Vérification post-injection (obligatoire)

```sql
SELECT s.slug, s.status, s.attractiveness_score,
       jsonb_array_length(s.playbook->'personas')      AS personas,
       jsonb_array_length(s.playbook->'roi_arguments') AS roi,
       jsonb_array_length(s.playbook->'objections')    AS objections,
       jsonb_array_length(s.playbook->'entry_points')  AS entry_points,
       (SELECT count(*) FROM sector_pain_points p WHERE p.sector_id = s.id)          AS pains,
       (SELECT count(*) FROM sector_pain_points p WHERE p.sector_id = s.id
          AND p.verbatim IS NOT NULL)                                                AS pains_avec_verbatim,
       (SELECT count(*) FROM sector_pain_points p WHERE p.sector_id = s.id
          AND array_length(p.source_company_ids,1) > 0)                              AS pains_traçables,
       (SELECT count(*) FROM sector_regulatory_items r WHERE r.sector_id = s.id)     AS reglo,
       (SELECT count(*) FROM sector_regulatory_items r WHERE r.sector_id = s.id
          AND r.deadline_date IS NOT NULL)                                           AS reglo_datees,
       (SELECT count(*) FROM sector_regulatory_items r WHERE r.sector_id = s.id
          AND r.deadline_date IS NOT NULL AND r.source_url IS NULL)                  AS dates_non_verifiees,
       (s.caveats IS NOT NULL)                                                       AS caveats_declares,
       (SELECT count(*) FROM sector_events e WHERE e.sector_id = s.id)               AS events,
       (SELECT count(*) FROM companies c WHERE c.sector_id = s.id)                   AS comptes
FROM sector_intelligence s WHERE s.slug = '[slug]';

-- Contrôle anti-régression accents (§7.2)
SELECT title FROM sector_pain_points
WHERE sector_id = (SELECT id FROM sector_intelligence WHERE slug='[slug]')
  AND title !~ '[éèêàçûôîùäëïö]' AND length(title) > 40;
-- ⚠️ Un titre français de +40 caractères SANS aucun accent est presque toujours un bug d'encodage.
```

**Ne jamais déclarer l'injection terminée sans ces SELECT.** Une transaction sans erreur ne garantit pas que tout est arrivé où prévu.

---

## 8. Où la fiche est consommée — et pourquoi ça contraint sa rédaction

Comprendre l'aval change la façon d'écrire. **Ce n'est pas cosmétique : le front dérive du contenu généré automatiquement.**

### 8.1 Les 3 surfaces

| Route | Rôle | Source |
|---|---|---|
| `/prospection/approche-sectorielle` | Liste des secteurs — vitrine | Desktop : `getSectorActivationData()` (DB) · **Mobile : `STRATEGIC_SECTOR_CONFIG` (hardcodé)** |
| `/prospection/approche-sectorielle/[slug]` | **La fiche** — 6 blocs | `getSectorBySlug()` → DB |
| `/ressources/playbook/[slug]` | **Le notebook commercial** — 4 sections | `getSectorBySlug()` → DB |

### 8.2 ⚠️ La contrainte cachée : le pitch est DÉRIVÉ des pain points

Dans `PlaybookPage.tsx`, le pitch 15 minutes n'est **pas** stocké. Il est **généré à la volée** depuis les 3 premiers pain points, triés par `frequency_count DESC` :

```ts
const firstPain  = sector.pain_points[0]?.title ?? "la pression opérationnelle et réglementaire"
const secondPain = sector.pain_points[1]?.title ?? "la fragmentation des processus et des outils"
const thirdPain  = sector.pain_points[2]?.title ?? "la difficulté à capitaliser le savoir-faire métier"
```

**Conséquences directes sur la rédaction :**

1. **Le `title` d'un pain point est du texte de pitch, pas un libellé de base.** Il sera lu à voix haute en RDV. « Screening réglementaire manuel » fonctionne. « Referentiel reglementaire et packaging disperse sur des catalogues larges » (nutraceutique, 73 caractères, sans accents) est illisible dans une accroche.
   → **Contrainte : `title` ≤ 60 caractères, formulation orale, accentuée.**

2. **`frequency_count` détermine l'ordre du pitch.** Le pain le plus fréquent devient l'accroche. Un comptage bâclé produit un pitch qui attaque par le mauvais angle.

3. Les sections du notebook sont : **Brief** (« Lire le terrain ») → **Pitch 15 min** (« Conduire le RDV ») → **Playbook** (« Adapter l'angle ») → **Actions IA** (« Transformer en livrable »).

### 8.3 Les 6 blocs de la fiche détail

Marché/score · Practices fit · Pain points (tri `frequency_count DESC`) · Calendrier réglementaire (tri `deadline_date ASC`, badges couleur par `urgency`) · Trigger events · Comptes rattachés.

`sector_news` est **volontairement absent** du front (alimenté par n8n, non branché).

### 8.4 Checklist de validation front (P5)

- [ ] `/prospection/approche-sectorielle` — la fiche apparaît, score et maturité corrects
- [ ] `/prospection/approche-sectorielle/[slug]` — les 6 blocs chargent sans erreur
- [ ] Pain points triés par fréquence décroissante
- [ ] Badges d'urgence cohérents (rouge = `critical`)
- [ ] Comptes rattachés : **aucun compte manifestement hors secteur** (un intrus décrédibilise toute la fiche)
- [ ] `/ressources/playbook/[slug]` — les 4 sections naviguent
- [ ] **Le pitch généré est lisible à voix haute** (§8.2) — c'est le test qui rate le plus souvent
- [ ] **Accents présents partout** (§7.2)

---

## 9. Exceptions et cas limites

| Scénario | Conduite à tenir |
|---|---|
| **Corpus totalement vide** (0 compte) | Fiche « réglementaire pure » autorisée : réglementaire + acteurs + marché, **0 pain point inventé**, `status='development'`, score plafond 3.5, caveat en tête. |
| **Un seul pain point réel** | On en met **un**. Jamais 8 dont 7 supposés. Caveat : « corpus limité, pain points à compléter aux prochains RDV ». |
| **Aucune deadline réglementaire vérifiable** | Gate 2 échoué → score plafond 3.5. La fiche perd son étage 1 : le dire explicitement à Guillaume, c'est un secteur difficile à attaquer à froid. |
| **Sources contradictoires sur une date** | Source officielle tranche. Si elle reste ambiguë : `deadline_date = NULL` + « échéance à préciser, source officielle non univoque ». |
| **Réglementation abrogée/remplacée** | Toujours vérifier la version **en vigueur aujourd'hui**, pas celle d'un article de 2024. Piège classique via FOLIO. |
| **Le secteur existe déjà en `active`** | C'est une **mise à jour**. Charger l'existant, ne réécrire que ce qui a changé, **ne jamais supprimer un verbatim réel**. Le template §7.3 est idempotent. |
| **Le slug n'existe pas mais des comptes proches sont ailleurs** | Ne pas créer un doublon sémantique. Vérifier `SELECT slug FROM sector_intelligence`. 96/96 comptes sont déjà rattachés → le secteur existe probablement en `watch`. |
| **`sector_analysis` FOLIO contredit une source externe récente** | **La source externe datée gagne.** FOLIO n'a ni source ni date. Consigner la contradiction en caveat. |
| **Le mandant demande un score plus élevé** | Le plafond de corpus n'est pas négociable. Si le score paraît trop bas, la réponse est d'enrichir le corpus, pas de monter le chiffre. |
| **Deux `sector_events` partagent une source** | Contrainte UNIQUE sur `source_url`. Garder l'événement le plus commercialement actionnable, l'autre passe `source_url = NULL`. |
| **Connecteur Supabase absent** | **Stop.** Les phases 1 et 4 en dépendent. Le dire immédiatement, ne pas produire une fiche « hors sol » invérifiable. |

---

## 10. Évaluer une fiche — grille de notation /100

**Gate 3 : sous 70/100, on n'injecte pas.** Auto-appliquée par l'agent en fin de P3, re-vérifiable par n'importe qui a posteriori.

### 10.1 La grille

| # | Critère | Pts | Barème |
|---|---|---|---|
| **A. Traçabilité (35 pts) — l'axe non négociable** ||||
| A1 | Chaque `roi_argument` porte sa source dans le texte | 10 | 10 = 5/5 · 6 = 3/5 · 0 = aucun |
| A2 | `source_company_ids` peuplé sur **tous** les pain points | 10 | 10 = 100 % · 5 = ≥50 % · 0 = aucun |
| A3 | Chaque `deadline_date` vérifiée sur source officielle | 10 | 10 = toutes · 5 = ≥ moitié · 0 = aucune |
| A4 | Section caveats rédigée et honnête | 5 | 5 = explicite · 0 = absente |
| **B. Étage 1 — la fenêtre (20 pts)** ||||
| B1 | ≥3 items réglementaires avec date précise | 10 | 10 = ≥3 · 5 = 1-2 · 0 = 0 |
| B2 | ≥1 échéance `critical`/`high` dans les 12 mois | 5 | binaire |
| B3 | `commercial_angle` rempli et spécifique sur chaque item | 5 | 5 = tous · 0 = génériques |
| **C. Étage 2 — la douleur (20 pts)** ||||
| C1 | 5-8 pain points | 5 | 5 = 5-8 · 3 = 3-4 · 1 = 1-2 |
| C2 | Titres **spécifiques**, ≤60 car., oraux, accentués (§8.2) | 8 | -2 par titre vague/trop long/désaccentué |
| C3 | ≥1 verbatim réel **ou** caveat explicite sur leur absence | 4 | 4 = verbatim ou caveat · 0 = ni l'un ni l'autre |
| C4 | `frequency_count` = comptage réel (cohérent avec A2) | 3 | binaire |
| **D. Étage 4 — la bascule (15 pts)** ||||
| D1 | 4 personas avec de vraies **peurs** (test §6.2) | 5 | -1 par peur = enjeu reformulé |
| D2 | 3 objections **spécifiques au métier** | 5 | -2 par objection générique |
| D3 | 4 entry points, un par archétype | 5 | -1 par archétype manquant/doublé |
| **E. Cohérence (10 pts)** ||||
| E1 | Score cohérent avec le plafond de corpus (§6.3) | 5 | 5 = respecté · **0 = plafond dépassé** |
| E2 | Aucun compte manifestement hors secteur | 3 | binaire |
| E3 | `practices_fit` honnête (pas gonflé sur la practice préférée) | 2 | binaire |

### 10.2 Interprétation

| Score | Verdict |
|---|---|
| **90-100** | Production-ready. Utilisable en RDV sans réserve. |
| **75-89** | Bonne fiche. Injectable. Les manques sont dans les caveats. |
| **70-74** | Limite basse. Injectable **seulement** si les points perdus sont sur B/C (matière) et pas sur A (traçabilité). |
| **< 70** | **Ne pas injecter.** Retour P2 ou P3. |
| **A < 20/35** | **Rejet automatique quel que soit le total.** Une fiche non traçable est un risque, pas un actif. |

### 10.3 Étalonnage sur les fiches existantes

**Mesuré** le 2026-07-16 en passant les fiches réelles dans `.agents/skills/kredo-sector-intelligence/scripts/audit_fiche.py` (partie mécanique de la grille — la partie « jugement » est comptée ici au maximum, donc ces chiffres sont le **meilleur cas** de chaque fiche) :

| Fiche | Axe A (traçabilité) | Meilleur cas | Injectable ? | Ce qui coûte |
|---|---|---|---|---|
| `parfumerie-aromes` | **2/35** | **63/100** | ❌ Rejet | **A2 = 0** (`source_company_ids` vide sur les 8 pains → fréquences 6/5/5/4 invérifiables), **C4 = 0** (fréquence sans preuve), A1 = 2 (1 seul ROI sourcé). En face : C2 = 8/8 et C3 = 4/4 (7 verbatims) — sa vraie force. |
| `nutraceutique-sante-naturelle` | **20/35** | **72/100** | ❌ Rejet | **C2 = 0** et **22 champs désaccentués** (§7.2). En face : **A1 = 10 et A2 = 10** — personne d'autre n'y arrive. |

> ⚠️ **Ce test n'était pas tout à fait équitable pour ces deux fiches au moment de la mesure** : `source_url` et `caveats` n'étaient alors stockés nulle part, donc A3 et A4 (15 points) tombaient mécaniquement à 0 sur un export. **La migration 058 a corrigé ça** — les caveats des 3 fiches actives ont été backfillés depuis les faits mesurés, et A3/A4 sont désormais auditables après injection. Les scores ci-dessus restent ceux de la mesure d'origine ; les critères discriminants (A1, A2, C2, C3, C4) ne sont pas affectés.

**Ce que ça dit, et qui est la thèse de tout ce document :** les deux fiches de référence sont **rejetées, pour des raisons exactement opposées**. Parfumerie a la densité sans la traçabilité ; nutraceutique a la traçabilité sans la finition. Aucune ne passerait le gate aujourd'hui.

La fiche cible combine **la densité de parfumerie** (10 comptes, 7 verbatims réels) + **la traçabilité de nutraceutique** (sources dans le texte, `source_company_ids` peuplé) + **des titres courts et accentués**. Elle n'existe pas encore. C'est l'objet de la prochaine étude.

> 📌 **Gap produit repéré au passage** (hors périmètre, non corrigé) : les `caveats` — « aucun verbatim réel, à valider terrain » — sont exactement ce dont le commercial a besoin en rendez-vous, et ils ne survivent nulle part après l'injection. Ils vivent dans le brouillon (§6.1) et la remise (§5.3), pas dans la base, donc pas dans l'app. Le champ `description` pourrait les porter.

---

## 11. Métriques du processus

| Métrique | Cible | Mesure |
|---|---|---|
| Note qualité de la fiche | ≥ 75/100 | Grille §10, auto-appliquée en Gate 3 |
| Traçabilité (axe A) | ≥ 28/35 | Grille §10 |
| Temps de production | 4h30 – 6h | Chrono par phase |
| Requêtes externes | 8-12 | Comptage P2 |
| Couverture réglementaire | ≥ 3 items datés | `SELECT count(*) … WHERE deadline_date IS NOT NULL` |
| Traçabilité des pains | 100 % avec `source_company_ids` | Requête §7.4 |
| **Secteurs étudiés / rattachés** | 3/14 aujourd'hui → **6/14 fin 2026** | §3.1 |
| **Taux de transformation** ⭐ | à instrumenter | Opportunités créées dans les 90 j suivant une fiche, sur les comptes du secteur |
| Fraîcheur | < 12 mois | `updated_at` vs `deadline_date` passées |

> **La seule métrique qui compte vraiment est le taux de transformation.** Aujourd'hui elle n'est pas mesurée — c'est le trou le plus important du dispositif. Une fiche notée 95/100 qui ne produit aucun RDV en 90 jours est un échec, et il faut pouvoir le voir. Proposition d'instrumentation en §14.

**Requête de fraîcheur (à passer trimestriellement) :**

```sql
SELECT s.slug, s.updated_at::date AS derniere_maj,
       count(*) FILTER (WHERE r.deadline_date < current_date) AS echeances_perimees,
       count(*) FILTER (WHERE r.deadline_date BETWEEN current_date AND current_date + 180) AS fenetres_ouvertes
FROM sector_intelligence s
LEFT JOIN sector_regulatory_items r ON r.sector_id = s.id
WHERE s.status = 'active'
GROUP BY s.slug, s.updated_at
ORDER BY s.updated_at;
```

Une fiche dont **toutes** les échéances sont passées a perdu son étage 1 : elle ne produit plus de RDV. → Re-passer P2/B2.

---

## 12. Analyse du skill `kredo-sector-intelligence`

**Demande explicite de Guillaume : « je ne l'ai jamais éprouvé sur le terrain et je ne sais pas ce qu'il vaut ».** Verdict après lecture intégrale des 6 fichiers (652 lignes) et confrontation au schéma live.

> ### ✅ Traité le 2026-07-16 — le skill a été réécrit
>
> Il vit désormais dans **`.agents/skills/kredo-sector-intelligence/`**, versionné à côté de ce document pour qu'ils ne puissent plus dériver l'un de l'autre. Il ne contient **plus une seule ligne de schéma ni de SQL** : il porte la conduite (ordre, gates, arrêts, doctrine) et délègue tout le reste ici.
>
> **Cette section reste** parce que le diagnostic explique *pourquoi* le nouveau skill est construit comme il l'est. Lis §12.4 (le paradoxe) et §12.6 (ce qui a été fait) — le reste est de l'histoire.

### 12.1 Verdict (sur l'ancienne version)

> **La doctrine valait de l'or. La plomberie était cassée.**
>
> **Utilisable en l'état ? Non.** Il échouait en Phase 1 (tables inexistantes) et en Phase 4 (contraintes NOT NULL violées).
> **À jeter ? Surtout pas.** Sa partie « jugement » est ce que ce document — et le nouveau skill — reprennent presque intégralement.

### 12.2 Ce qui est excellent — à conserver

| Élément | Pourquoi ça vaut |
|---|---|
| **La doctrine anti-invention** | « Mieux vaut une fiche avec des trous visibles qu'une fiche complète mais fragile » — c'est l'axiome juste, formulé mieux que je ne l'aurais fait. |
| **Le test « vous tenez ça d'où ? »** | Test de recette opérationnel, applicable ligne par ligne. Exceptionnel. |
| **La distinction peur / enjeu** | Le meilleur passage du skill. Non trivial, avec un test de validation qui marche. |
| **« Corpus mince ≠ échec »** | Évite la faute la plus coûteuse : gonfler pour faire joli. |
| **Le tableau des pièges** | 7 pièges tirés d'incidents réels (apostrophes, `window` réservé, `source_url` UNIQUE). C'est de la connaissance chèrement acquise. |
| **La section « Si tu bloques »** | Anticipe les 5 vrais points de blocage. Rare et précieux. |
| **Le budget 8-12 requêtes** | Garde-fou contre la recherche infinie. |
| **La structure progressive disclosure** | SKILL.md court + 5 références chargées à la demande. Architecture correcte. |

### 12.3 Ce qui est cassé — bloquant

| # | Défaut | Gravité | Preuve |
|---|---|---|---|
| 1 | **Table `company_audit` n'existe pas** | 🔴 Bloquant | Requête 2 de la Phase 1 échoue. La vraie source est `ai_intelligence_results` + `companies.metadata.sector_analysis`. |
| 2 | **`companies.ai_score` renommé `legacy_folio_score`** | 🔴 Bloquant | Migration 027 / ADR-0011 Lot 0. |
| 3 | **`opportunities.status` / `.amount_eur` n'existent pas** | 🔴 Bloquant | Vrais champs : `stage`, `estimated_gain`, `weighted_gain`. |
| 4 | **Template d'injection omet `workspace_id`** sur pains/réglo/events | 🔴 Bloquant | NOT NULL → transaction annulée. |
| 5 | **Template omet `source_company_ids`** (NOT NULL) | 🔴 Bloquant | Idem. Ironie : c'est le champ qui matérialise sa propre règle « fréquence = comptage réel ». |
| 6 | **`sector_intelligence.slug` déclaré UNIQUE seul** | 🟠 Faux | Réel : `UNIQUE (workspace_id, slug)`. |
| 7 | **`sector_news.url` déclaré `NOT NULL`** | 🟠 Faux | Réel : nullable. |
| 8 | **`BEGIN … COMMIT` via le connecteur** | 🟠 Fragile | `execute_sql` ne garantit pas la transaction attendue. Utiliser `apply_migration` + bloc `DO $$`. |
| 9 | **« 2 secteurs en production »** | 🟠 Périmé | **14 secteurs**, 3 actifs. Un agent suivant le skill créerait un doublon. |
| 10 | **Mauvais destinataire** | 🟠 Structurel | « Dosta est un consultant IA freelance en phase de lancement (objectif : poste salarié avant septembre 2026) ». KREDO est l'outil d'un **centre de profit en ESN**, et l'utilisateur est **Guillaume**. Le skill optimise pour un « portfolio », pas pour une équipe commerciale. Ça biaise tout son cadrage. |
| 11 | **Aucune règle sur l'ordre/longueur des pain points** | 🟠 Manque | Il ignore que le pitch est dérivé de `pain_points[0..2]` (§8.2) — la contrainte la plus structurante du livrable. |
| 12 | **Aucune grille de notation** | 🟠 Manque | « Standard minimum » qualitatif, pas de gate chiffré. On ne peut pas dire si une fiche passe. |

### 12.4 Le paradoxe

**Le skill énonce la bonne règle et fournit l'outil qui l'empêche.**

- Règle n°2 : « **Fréquence = comptage réel.** "5/7 comptes" signifie que tu as compté chez 5 sur 7. »
- Son template d'injection **n'inclut pas `source_company_ids`** — le champ qui stocke *quels* comptes.

Résultat observable en base : `parfumerie-aromes` et `banque-finance-assurance` (les deux fiches produites à l'époque du skill) ont **`source_company_ids = NULL` sur leurs 16 pain points**. Les fréquences 6/5/5/4 sont **invérifiables**. La règle n°2 n'a jamais été appliquable.

**La seule fiche qui la respecte — nutraceutique — est postérieure et a été produite hors du skill.** C'est le signe le plus clair que la maturité du processus a dépassé son outil.

### 12.5 Que vaut le dispositif, selon ce qu'on lui donne

Les lignes barrées décrivent l'ancien skill, gardées pour mémoire.

| Configuration | Résultat attendu |
|---|---|
| ~~Ancien skill seul~~ | ❌ **Échec en Phase 1.** `company_audit` n'existe pas. S'il contournait, il produisait une fiche **hors sol** (web pur), puis échouait en Phase 4 sur les NOT NULL. |
| ~~Ancien skill + Supabase~~ | 🟡 ~60-70/100. L'agent corrigeait les requêtes en tâtonnant. `source_company_ids` restait vide → **A2 = 0**. |
| **Ce document seul** | ✅ **~85/100.** Schéma vérifié, requêtes exécutables, gates chiffrés. |
| **Ce document + le nouveau skill + le prompt (Annexe A)** | ✅ **~90/100 — la configuration cible.** Le document porte la référence, le skill porte la conduite et les arrêts, le script rend le Gate 3 objectif. |
| **Agent sans MCP Supabase** (ChatGPT, Gemini) | 🟠 **~50/100 plafond.** P1 et P4 impossibles. Mode dégradé viable **pour la recherche réglementaire**, avec le corpus collé par Guillaume — voir `references/agents-externes.md` du skill. |
| **CLAUDE.md comme source** | ❌ Périmé sur le sectoriel (« 27/95 comptes » alors que c'est 96/96, « 4 fiches » pour 14). Ne t'y fie pas. |

### 12.6 Ce qui a été fait (2026-07-16)

Le skill a été réécrit sur le principe posé ci-dessus : **une seule source de vérité pour le schéma**. Il vit dans `.agents/skills/kredo-sector-intelligence/`, à côté de ce document.

| Décision | Pourquoi |
|---|---|
| **Zéro schéma, zéro SQL dans le skill** | C'est leur duplication qui a produit toute la dérive de §12.3. Le skill pointe vers §4.2 et §7.3, il ne les recopie pas. |
| `references/schema-supabase.md` et `injection-sql-template.md` **supprimés** | Ils étaient la dérive. Rien ne les remplace : le document les porte. |
| **Emplacement : `.agents/skills/`** (+ symlink depuis `.claude/skills/`) | C'est le seul dossier lu **à la fois par Codex et par Antigravity**. Il était déjà là, avec l'ancienne version cassée committée (`02ca6710`) — les deux agents chargeaient donc déjà un skill qui référençait `company_audit`. Ce n'était pas un risque théorique. |
| Frontmatter réécrit | Destinataire = Guillaume / centre de profit ESN. L'ancien optimisait pour un « portfolio de consultant freelance », ce qui biaisait tout son cadrage. |
| **`scripts/audit_fiche.py` ajouté** | Le Gate 3 était le maillon faible : un agent qui vient d'écrire une fiche la trouve bonne. Le script note la moitié objective sans état d'âme (§10). |
| Avertissement « ce que tu crois savoir est faux » | Un agent peut avoir l'ancien schéma en mémoire. Il faut le lui dire. |
| Contrainte §8.2 (pitch dérivé des pain points) ajoutée | L'ancien skill l'ignorait — c'est pourtant la contrainte la plus structurante du livrable. |
| Règle des accents (§7.2) ajoutée | Le seul défaut réellement parti en production. |
| **Conservés tels quels** | Les règles non négociables, le test peur/enjeu, « si tu bloques », le budget 8-12 requêtes. C'est ce que l'ancien skill avait de meilleur. |

**Vérifié** : le script a été passé sur les fiches réelles et retrouve seul les défauts identifiés à la main (§10.3) — A2 = 0 sur parfumerie, 22 champs désaccentués sur nutraceutique. Il rejette les deux.

---

## 13. Dettes et bugs identifiés (constatés le 2026-07-16)

Découverts en instruisant ce document. Aucun n'est corrigé ici.

| # | Problème | Impact | Preuve |
|---|---|---|---|
| 1 | **Accents mangés sur `nutraceutique-sante-naturelle`** | 🔴 **Visible en production.** La fiche la plus rigoureuse a l'air bâclée. | `"Directrice Qualite / Affaires Reglementaires"`, `"tracabilite"`, `"echeances"` en base |
| 2 | **`STRATEGIC_SECTOR_CONFIG` = seconde source de vérité, et elle diverge** | 🔴 **Liens morts en mobile.** La liste mobile est construite depuis la config hardcodée. 3 de ses 6 slugs **n'existent pas en base** : `aeronautique-defense` (DB : `aeronautique-spatial-defense`), `travel-tech-ecommerce` (absent), `secteur-public-collectivites` (DB : `secteur-public-enseignement-recherche`). Un clic mobile sur ces cartes → redirect vers la liste. | `src/lib/prospection/sector-strategy-config.ts` vs `SELECT slug FROM sector_intelligence` |
| 3 | **La config contredit la base sur les fiches qui existent** | 🟠 Le mobile affiche un autre nom et d'autres scores que le desktop. Config : « Luxe, Chimie & Cosmétiques », `practicesFit {data_ai:4.8, cloud_eng:4.0, product:3.0, cyber:3.5}`. Base : « Parfumerie, Arômes & Cosmétique », `{data_ai:5, cloud_eng:3, product:3, cyber:2}`. | Idem |
| 4 | **Taxonomie de practices incompatible** | 🟠 Le module sectoriel utilise 4 clés legacy (`data_ai`, `cloud_eng`, `product`, `cyber`). Les vraies practices KREDO sont **8** (`offer_practices`). `product` et `cloud_eng` **n'existent pas** comme practices. → Impossible de relier automatiquement un pain point sectoriel à une offre du catalogue. | `src/types/sector.ts` vs `SELECT slug FROM offer_practices` |
| 5 | **`source_company_ids` vide sur les 2 fiches fondatrices** | 🟠 16 pain points aux fréquences invérifiables. | §12.4 |
| 6 | **`sector_news` mort sauf parfumerie** | 🟠 7 lignes sur parfumerie, 0 ailleurs. Absent du front. Le bloc « veille » du dispositif n'existe pas. | §3.1 |
| 7 | **CLAUDE.md périmé sur le sectoriel** | 🟠 Annonce « 14 fiches / 27 comptes sur 95 rattachés ». Réel : 14 fiches (dont 3 étudiées) / **96 sur 96**. | §3.1 |
| 8 | **La page liste dit « nos 6 secteurs cibles »** | 🟢 Cosmétique, mais faux (14 en base, 3 étudiés). | `approche-sectorielle/page.tsx` |

> **Recommandation :** traiter #1 et #2 en priorité — ce sont les deux seuls qui dégradent l'expérience réelle d'un commercial en situation. #4 est le plus structurant à moyen terme (c'est lui qui bloque le lien automatique secteur → offre → pitch).

---

## 14. Outillage — ce qui existe, ce qui manque

### 14.1 Ce qu'on utilise aujourd'hui

| Outil | Rôle | État |
|---|---|---|
| MCP Supabase (`execute_sql`, `apply_migration`) | P1 + P4 | ✅ **Indispensable.** Sans lui, plafond ~50/100. |
| WebSearch / WebFetch | P2 | ✅ Suffisant |
| Skill `kredo-sector-intelligence` | Déclencheur + doctrine | ⚠️ À corriger (§12.6) |
| Ce document | Référence | ✅ |

### 14.2 Ce que je recommande — par ROI décroissant

#### ~~🥇 1. Un skill assaini + ce document comme source unique~~ — ✅ **fait le 2026-07-16**
Livré : `.agents/skills/kredo-sector-intelligence/` (conduite + `scripts/audit_fiche.py` + `references/agents-externes.md`), zéro schéma dupliqué. Voir §12.6.

#### 🥈 2. Une RPC `get_sector_study_context(slug)` — la Phase 1 en un appel
**Effort : ~3 h. Gain : divise P1 par 3 et la rend infaillible.**

Aujourd'hui P1 = 7 requêtes manuelles qu'un agent peut mal recopier (c'est exactement ce qui casse le skill). Le projet a déjà **6 RPC de ce patron exact** (`get_pitch_context`, `get_account_knowledge_context`, `get_account_issues_context`, `get_commercial_strategy_context`, `get_account_score_context`, `get_matching_context`). Rien à inventer, juste à décliner.

Elle retournerait en un JSON : comptes + `sector_analysis` FOLIO + diagnostics réels + interactions + opportunités/missions + signaux + ancrage tarifaire + fiche existante.

**Bénéfice décisif : elle rend le processus exécutable par ChatGPT/Gemini via un simple appel**, au lieu de 7 requêtes SQL à ne pas rater. C'est la condition de la reproductibilité inter-agents demandée.

#### 🥉 3. Instrumenter le taux de transformation
**Effort : ~2 h (une vue SQL). Gain : la seule mesure d'efficacité réelle.**

```sql
CREATE VIEW v_sector_study_impact AS
SELECT s.slug, s.status, s.attractiveness_score, s.updated_at::date AS etude_maj,
       count(DISTINCT c.id)                                                   AS comptes,
       count(DISTINCT o.id) FILTER (WHERE o.created_at > s.updated_at)        AS opps_post_etude,
       count(DISTINCT o.id) FILTER (WHERE o.created_at > s.updated_at
                                      AND o.stage = 'gagne')                  AS gagnees_post_etude,
       sum(o.estimated_gain) FILTER (WHERE o.created_at > s.updated_at)       AS pipe_genere
FROM sector_intelligence s
LEFT JOIN companies c ON c.sector_id = s.id
LEFT JOIN opportunities o ON o.company_id = c.id
GROUP BY s.slug, s.status, s.attractiveness_score, s.updated_at;
```

Sans ça, on ne saura jamais si une fiche à 4.8 vaut mieux qu'une fiche à 4.0. **C'est le trou le plus important du dispositif** (§11).

#### 4. Réparer la double source de vérité (dette #2/#3)
**Effort : ~2 h. Gain : supprime des liens morts en production.** Supprimer `STRATEGIC_SECTOR_CONFIG` et faire lire la base au mobile comme au desktop. La config n'apporte que `imageUrl` — un champ `image_url` sur `sector_intelligence` suffirait.

#### 5. Table de correspondance practices legacy ↔ `offer_practices` (dette #4)
**Effort : ~3 h. Gain : débloque le lien secteur → offre → pitch.** Le précédent existe : `get_pitch_context` fait déjà un mapping heuristique en CASE SQL pour `missions.practice`. Même dette, même remède. C'est le préalable à toute automatisation du lien étude→offre.

#### 6. Workflow n8n `intel-04x-sector-refresh` — la veille, pas l'étude
**Effort : ~1 j. Gain : les fiches ne pourrissent plus.**

> **Ne pas automatiser la production d'une étude par LLM.** Le jugement (peur ≠ enjeu, plafond de corpus, vérification d'une date sur EUR-Lex) est précisément ce qu'un workflow non supervisé fera mal — et une fiche fausse en RDV coûte plus cher que pas de fiche.

En revanche le **rafraîchissement** est mécanique et sans risque : détecter les échéances passées, alimenter `sector_news` (table prévue pour ça et morte aujourd'hui, dette #6), proposer des `sector_events` en `status='pending'` — donc **soumis à curation humaine**, jamais publiés directement. Même doctrine que les `enrichment_proposals` du scan compte.

#### 7. Sous-agent `sector-researcher` pour P2
**Effort : ~1 h. Gain : marginal, à ne faire que si P2 devient un goulot.** Isole les 8-12 requêtes web dans un contexte séparé. Utile surtout pour paralléliser plusieurs secteurs.

### 14.3 Ce qu'il ne faut PAS faire

| Idée séduisante | Pourquoi non |
|---|---|
| Un workflow n8n qui génère la fiche complète par LLM | Le jugement est le cœur du livrable. Une fiche auto-générée sans corpus est exactement le FOLIO qu'on est en train de désintoxiquer (§1.1). |
| Embeddings / pgvector pour matcher secteur↔offre | 3 fiches. Le volume ne justifie rien, et un score cosinus contredit la doctrine anti-score-opaque (ADR-0011). Le CASE SQL suffit. |
| Créer les 11 fiches `watch` d'un coup | Le processus fait 5h. 11 × 5h = 55h pour un résultat probablement médiocre partout. Une fiche à la fois, priorisée par §3.2. |
| Un nouveau module front | Le front est générique. Une injection correcte suffit — aucune ligne de code par fiche. C'est un acquis, ne pas le casser. |

### 14.4 Séquence recommandée

```
Immédiat   ▸ #1 skill assaini (1-2h)  ▸ dette #1 accents (30 min)
Court terme▸ #2 RPC get_sector_study_context (3h)  ▸ #4 double source (2h)
           ▸ Puis produire la prochaine fiche → viser 90/100, valider le dispositif
Moyen terme▸ #3 vue d'impact (2h)  ▸ #5 mapping practices (3h)
Après usage▸ #6 workflow de veille — seulement quand 5-6 fiches existent
```

> **La prochaine fiche est le vrai test.** Le dispositif ne sera validé que quand une étude produite avec ce document atteindra 90/100 et générera une opportunité réelle. Tout le reste est de la préparation.

---

## 15. Documents liés

| Document | Rôle |
|---|---|
| `CLAUDE.md` | Contexte projet · ⚠️ périmé sur le sectoriel (dette #7) |
| **`.agents/skills/kredo-sector-intelligence/SKILL.md`** | **La conduite** : déclencheur, préflight, doctrine, gates, arrêts. Réécrit le 2026-07-16 (§12.6) |
| `.agents/skills/.../scripts/audit_fiche.py` | Gate 3 mécanique : note la moitié objective de la grille §10 sur un brouillon JSON, avant injection |
| `.agents/skills/.../references/agents-externes.md` | Exécution sur Codex/ChatGPT/Gemini + modes dégradés sans Supabase |
| `docs/adr/ADR-0012-cockpit-intelligence-chaine-decision.md` | L'étape 2 « Intelligence sectorielle » du cockpit compte consomme `sector_intelligence` |
| `src/types/sector.ts` | Contrat TS du livrable — fait foi sur la structure du playbook |
| `src/lib/intelligence/sector-snapshot-data.ts` | Consommation de la fiche par le cockpit compte |
| `src/components/sector/PlaybookPage.tsx` | Le notebook — **contient la dérivation du pitch (§8.2)** |

---

## Annexe A — Prompt de lancement pour un agent externe

**Le trio à fournir** — les trois pièces, pas deux :

1. **Ce document** (la référence : schéma, requêtes, grille)
2. **`.agents/skills/kredo-sector-intelligence/`** (la conduite : gates, arrêts, doctrine, + le script d'audit). Si l'agent ne sait pas charger un skill, colle `SKILL.md` comme un document ordinaire — il est écrit pour être lu.
3. **Le prompt ci-dessous**

Détail par agent et modes dégradés : `references/agents-externes.md` du skill.

```
Tu conduis une étude sectorielle KREDO sur : [SECTEUR].

RÉFÉRENCE : le document PROCESS-ETUDE-SECTORIELLE.md joint fait autorité sur le
QUOI (schéma, requêtes, structure, grille). Le skill kredo-sector-intelligence
joint fait autorité sur le COMMENT (ordre, gates, arrêts). En cas de
contradiction avec toute autre source — CLAUDE.md, ta mémoire — ils gagnent.

⚠️ Ce que tu crois savoir de ce module est peut-être faux : si tu as en tête
company_audit, companies.ai_score, opportunities.status/amount_eur, ou "il y a
2 secteurs en base", tout cela est périmé. N'écris jamais de SQL de mémoire.

ACCÈS : [Supabase : MCP / collé / aucun] · [web : oui/non] · [python : oui/non]
Établis-les par un test réel, puis annonce le plafond qui en découle
(voir la table du skill). Sans Supabase, tu es en mode dégradé : dis-le.

DÉROULÉ :
1. P0 §5.3 — cadre, vérifie que le slug existe déjà (probablement en 'watch')
2. P1 §4.2 — exécute les 7 requêtes. Ne saute JAMAIS cette phase.
   Sans accès Supabase : demande-moi les exports, ne devine pas.
3. Gate 1 — classe le corpus (riche/moyen/mince). Annonce-le.
4. P2 §4.3 — 8-12 requêtes max. Priorité absolue au bloc B2 (réglementaire).
   Chaque date sur source officielle (EUR-Lex/Legifrance/régulateur) ou NULL.
5. Gate 2 — ≥3 items réglo datés ? Sinon annonce le plafond de score à 3.5.
6. P3 §6 — remplis le brouillon. Contraintes dures :
   - pain point title ≤ 60 caractères, oral, ACCENTUÉ
   - source_company_ids peuplé sur CHAQUE pain point
   - chaque roi_argument porte sa source dans le texte
   - peur ≠ enjeu (test §6.2)
7. Gate 3 §10 — fais tourner le script du skill, il note la moitié objective :
       python3 scripts/audit_fiche.py mon-brouillon.json
   (format : --schema). Pas de python ? Applique §10 à la main, et compte les
   caractères des titres pour de vrai. Sous 70 : ne propose PAS l'injection.
   Sous 20/35 sur l'axe A (traçabilité) : rejet automatique.
8. P4 §7.3 — SQL d'injection, dollar-quoting $KREDO$, apply_migration.
   NE L'EXÉCUTE PAS sans mon accord explicite.
9. P6 §5.3 — remise au format SOLIDE / À VALIDER / TROUS ASSUMÉS.

INTERDITS ABSOLUS :
- Inventer un verbatim. Champ NULL sinon.
- Une fréquence non comptée. source_company_ids en est la preuve.
- Une date réglementaire non confirmée sur source officielle.
- Un ROI sans source → reformuler en "potentiel estimé à X%, à valider".
- Dépasser le plafond de score du corpus (§6.3).
- Écrire du français sans accents (§7.2).
- Recopier une échéance FOLIO sans la re-vérifier.

À la fin de chaque phase, annonce : ce que tu as trouvé, ce qui manque,
et ta note d'auto-contrôle provisoire.
```

## Annexe B — Aide-mémoire des valeurs autorisées

```
sector_intelligence.status         : active | development | watch
sector_intelligence.digital_maturity : low | medium | high
sector_intelligence.attractiveness_score : 0.0 → 5.0
practices_fit (clés)               : data_ai | cloud_eng | product | cyber   ← legacy, ≠ offer_practices
kredo_practice                     : data_ai | cloud_eng | product | cyber | multi
sector_regulatory_items.urgency    : critical | high | medium | low
sector_events.event_type           : regulatory | market | competitor | appointment | tender | report | other
sector_events.status               : pending | acted | dismissed
sector_news.relevance_score        : 0.0 → 1.0
playbook (clés, exactement 4)      : personas | roi_arguments | objections | entry_points
persona                            : {role, enjeu, peur}
objection                          : {objection, reponse}
key_player                         : {name, size, note}
```
