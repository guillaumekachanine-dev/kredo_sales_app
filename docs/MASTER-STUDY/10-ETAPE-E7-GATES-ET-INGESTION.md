# E7 — Gates et ingestion

> **Le producteur n'est jamais son propre jury** (A10). Une scorecard remplie à la main est une
> décoration ; un taux calculé est une contrainte. C'est le seul changement structurel que le
> diagnostic d'août appelait, et c'est celui qui n'avait pas été fait.

---

## 1. Axiomes

- **Quatre gates. G0 avant, G1 G2 G3 après. Deux d'entre eux s'exécutent hors du contexte de
  production.**
- **Aucune étude ne se déclare `production_ready` elle-même.**
- **Une étude non ingérée est un document orphelin.** Les deux études du spatial ont été
  produites hors de KREDO, dans des outils qui ne lisent pas la base et dont les résultats n'y
  reviennent pas. C'est la raison profonde pour laquelle chaque étude repart d'une page blanche
  et reproduit les mêmes trous. **Un défaut qui se reproduit à l'identique sur deux secteurs,
  deux outils et deux auteurs n'est pas un défaut de rédaction : c'est un défaut
  d'architecture.**
- **Rien n'est écrit sans estampillage** : date de snapshot, date de péremption calculée,
  verdict de gate, identifiant de run.

---

## 2. G0 — Le droit de lancer

Le gate qui n'existait pas, et celui qui économise le plus. Il s'exécute après E1, avant E2.

| Condition | Seuil | Si échec |
|---|---|---|
| Le segment existe avec `level='segment'` et un `parent_id` | obligatoire | Créer le segment (E1 §4.2) **ou** renoncer |
| Comptes KREDO rattachés au segment, `mapped` exclus, **clients compris** | ≥ 3 | Étudier le macro, ou attendre — une carte à 2 comptes ne se priorise pas |
| Les 5 axes toujours renseignables (`segment`, `relation_type`, `regime_achat`, `modele_eco`, `tier`) | 100 % | Passer par INTEL-010 + `apply_account_classification()` |
| Les 2 axes conditionnels (`moment`, `vertical_client`) renseignés **ou** légitimement NULL | 100 % | Documenter le NULL dans `classification_note` — ne jamais l'inventer |
| Un corpus de sources existe ou est budgété | E3 planifié | Lancer E3 d'abord |
| Un objectif commercial est déclaré | 1 des 4 valeurs | Retour E0 |

Deux précisions qui ont coûté un run avant d'être écrites (amendement 1.1, 13/08/2026) :

**Les 7 axes ne se contrôlent pas de la même façon.** `companies.segment_id` et `relation_type`
sont `NOT NULL` ; `regime_achat`, `modele_eco` et `tier` sont obligatoires ensemble (référentiel
§10 contrôle 2). Mais `moment` et `vertical_client` sont **nullables par décision du
`REFERENTIEL-CLASSIFICATION.md`** — §5.5 interdit de renseigner `moment` sans fait daté et
sourçable, §5.7 réserve `vertical_client` aux fournisseurs d'une filière. Exiger « 7 axes à
100 % » revenait donc à exiger la violation du document que ce gate déclare normatif : en base,
`moment` valait 1 compte sur 96, et **aucun run n'aurait jamais pu franchir G0, sur aucun
segment**.

**Un compte client compte dans le seuil, et figure dans la cartographie.** Le positionner face
aux concurrents étudiés est un actif commercial, pas du bruit : c'est même l'une des lectures que
la carte doit rendre possible. `comptes_exclus` d'E0 signifie « **hors cibles de prospection** »,
pas « hors périmètre d'étude » — voir `03-ETAPE-E0…` §3.

**Verdict** : `go` · `go_avec_reserve` (avec la réserve nommée) · `no_go` (avec ce qui manque).
Il s'écrit dans `registre/<run>/01-taxonomie.json`.

---

## 3. G1 — Conformité · script déterministe

Exécuté par un script du dépôt, sur les fichiers JSON du run. **Aucun jugement, que du
comptage.** Bloquant.

| Famille | Contrôle |
|---|---|
| **Parsabilité** | Chaque `.json` du run charge. Aucun JSON collé dans un markdown |
| **Invariant A9** | Pour chaque liste : `compteurs.<liste> == len(<liste>)` |
| **Sources** | Chaque `src_id` cité existe dans `sources[]`. Chaque URL répond (HEAD 2xx/3xx) |
| **Cohérence éditeur** | `publisher` cohérent avec `domain` ; sinon dégradation automatique du tier |
| **Arithmétique** | `appetence.total` recalculé = `capacite + intensite + 2×moment + 2×accessibilite + fit`. Chaque score sous son plafond |
| **Autorité du score** | Le top 3 déclaré **est** le top 3 du tableau trié, ou un champ `justification_ecart_top3` est présent |
| **Plancher de preuve** | Aucun compte du top 3 sans identité, sans taille, sans trigger daté, ou avec moins de 2 sources dont une T1/T2 |
| **Couche ESN** | `taux_couche_esn = comptes_prioritaires_complets / comptes_prioritaires` = 1,0 |
| **Régime déterministe** | Aucun champ interdit rempli par le modèle (`identifiant_national`, `code_activite`, `convention_collective`, `effectif_france`) |
| **Échéance pivot** | `02-socle.json > reglementaire.echeance_pivot` non nul, `deadline_date` future, `source_url` officielle |
| **Journal** | ≥ 25 requêtes distinctes en E4/E5, ≥ 15 en E3 |
| **Vocabulaire** | Aucune occurrence de « besoins SI probables » ou équivalent non marqué |
| **Portée** | `segment_slug` renseigné et `level='segment'` sur toute écriture sectorielle |

**Sortie** : un rapport texte non éditable, `registre/<run>/07-g1.txt`, avec un verdict binaire.

> Un script existe déjà pour la moitié de ce travail sur les fiches sectorielles v1
> (`.agents/skills/kredo-sector-intelligence/scripts/audit_fiche.py`) et pour les référentiels
> de sources (`.agents/skills/kredo-sources-sectorielles/scripts/audit_referentiel.py`). Ils
> sont à généraliser en un seul `scripts/audit-master-study.py`, pas à dupliquer.

---

## 4. G2 — Red team · hors du contexte de production

Exécuté **dans un contexte séparé** du producteur : NotebookLM sur le corpus fermé (les
sources + le livrable), ou Claude dans une session neuve.

**Pourquoi NotebookLM précisément** : le modèle ne répond que depuis le corpus déposé, donc
**il ne peut pas combler un trou par mémoire**. C'est exactement le contrôle qui manque à une
relecture par le producteur, qui comble sans s'en apercevoir.

Six questions. Les quatre premières sont bloquantes.

1. **Qu'est-ce qu'un DSI de ce secteur trouverait faux, daté ou naïf dans ce document ?**
2. Quelle affirmation décisive repose sur une source unique, ou sur une source qui en cite une
   autre sans que la primaire ait été consultée ?
3. Quel chiffre mélange deux périmètres ou deux millésimes ?
4. Quelle inférence est présentée comme une observation ?
5. Quel bloc de la couche 2 n'a pas de conséquence commerciale exploitable ?
6. Qu'est-ce qui manque et que le document ne déclare pas comme manquant ?

**Sortie** : les trois points les plus exposés sont corrigés, et on dit lesquels.

---

## 5. G3 — Recette métier · Guillaume

Une seule question, et elle est suffisante :

> **« Est-ce que je décrocherais mon téléphone avec ça ? »**

Elle se décline en trois vérifications de 5 minutes :

1. Ouvrir la fiche du **compte étalon** et la confronter à ce qu'on sait déjà. Chaque écart est
   un symptôme de la méthode, pas un accident.
2. Lire le **message sectoriel** à voix haute. S'il pourrait être prononcé par n'importe quelle
   ESN généraliste, il est faux.
3. Prendre le **compte n°1** du top 3 et essayer de formuler l'appel : motif daté, interlocuteur,
   accroche. Si un des trois manque, la couche ESN n'est pas finie.

**Le rôle de relecteur métier est celui qu'on saute en premier et celui qu'il ne faut jamais
sauter** : c'est la seule barrière qui attrape les erreurs *plausibles* — correctement sourcées
mais mal interprétées — qu'aucune vérification de source ne détecte.

---

## 6. L'ingestion

### 6.1 Ordre d'application

```
1. Migrations éventuelles (valeurs d'enum, nouveaux fact_type)      → supabase/migrations/
2. E3 → intelligence_sources + intelligence_source_links            → idempotent, sur src_id
3. E2 → account_facts identité + sector_regulatory_items            → déjà branché (073)
4. E4 → sector_intelligence (fiche segment) + playbook + items      → migration idempotente
5. E5 → CompetitiveMapImportWizard (bac d'arbitrage, humain)        → jamais automatique
6. E6 → value_chain_* + build.py                                    → régénérable
7. Document → intelligence_documents + versions + links             → type master_study
8. Recette SQL puis recette écran                                   → §6.4
```

**L'étape 5 n'est pas automatisable et ne doit pas l'être** (ADR-0019 écarte explicitement un
workflow n8n sur ce lot) : la résolution d'entité produit trois états — `resolved`,
`ambiguous`, `not_found` — et l'arbitrage des `ambiguous` est un jugement.

### 6.2 Règles d'écriture

| Règle | Motif |
|---|---|
| **Migrations idempotentes**, dollar-quoting pour le texte | Un rejeu ne doit ni dupliquer ni casser |
| **Écrire avec les accents** | Une fiche désaccentuée par « sécurisation » de l'échappement SQL a l'air bâclée alors qu'elle est la meilleure. Le dollar-quoting règle l'échappement ; rien ne justifie de mutiler le texte |
| **Playbook fusionné clé par clé**, jamais le blob | 37 segments sur 38 portent un squelette vide qui écraserait les playbooks macro remplis (migration 071) |
| **`source_company_ids` obligatoire** sur les pain points | Une fréquence est un comptage. Sans les UUID, elle est invérifiable à jamais |
| **`sector_id` n'est jamais écrit directement** | C'est une projection de `segment.parent_id`, écrite par `apply_account_classification()` seule |
| **Les chiffres vont dans `account_facts`, le narratif dans `profile_json`** | ADR-0019 D-4. Un chiffre dans un blob JSON n'est ni requêtable ni sourçable |

### 6.3 Les migrations préalables à ce corpus

Trois écritures de schéma, toutes additives, aucune table nouvelle :

| # | Objet | Portée |
|---|---|---|
| 1 | `intelligence_document_type` += `master_study` | 1 valeur d'enum. Débloque la consultation dans le Knowledge Hub. `intelligence_entity_type` contient déjà `sector` |
| 2 | `ai_intelligence_results.result_type` : `sector_study`, `competitive_map`, `sector_source_registry` | Colonne `text`, pas d'enum — aucune migration si c'est bien un `text` : **à vérifier avant** |
| 3 | Familles `fact_type` accessibilité et technologie | Convention, pas contrainte : `account_facts.fact_type` est libre. À documenter, pas à contraindre |

### 6.4 Recette

**SQL** — les compteurs avant/après, par bloc de `01-CARTE-DE-LA-CONNAISSANCE.md`.
**Écran** — les six points du test d'acceptation :

1. BI · Étude sectorielle → tenir 3 minutes.
2. BI · Chaîne de valeur → savoir à quel maillon KREDO se branche et qui y est.
3. BI · Calendrier → une échéance datée, vérifiable, prononçable.
4. BI · Concurrence → savoir quel compte appeler en premier, et pourquoi celui-là.
5. Prospection · Fenêtres → l'angle, l'offre, les comptes, la prochaine action.
6. Cockpit · Socle → savoir à qui on parle et si KREDO a le droit d'intervenir.
7. Cockpit · Roadmap → le contenu commercial prêt.
8. Et si le DSI demande « vous tenez ça d'où ? » → **ouvrir la source**.

### 6.5 Rollback

Chaque ingestion est réversible par son `run_id`. Une étude retirée laisse la base dans l'état
antérieur, à l'exception des comptes `mapped` créés — qui sont conservés avec leur `origin`, et
supprimés explicitement s'ils n'ont jamais été promus.

---

## 7. Destination et finalité

E7 n'a pas de destination propre : **il est la destination**. Sa finalité est que la base et
l'étude cessent de s'ignorer.

Le verdict de gate s'écrit sur la **page de garde du livrable** et dans
`ai_intelligence_runs.input_snapshot`, avec le taux de renseignement calculé par bloc. Ce n'est
pas une décoration de rapport : c'est ce qui permet à `02-DISTRIBUTION-DANS-KREDO.md` §7
d'appliquer le seuil de confiance à l'entrée du brief stratégique.

---

## 8. Livrables et formalisme

| Livrable | Forme | Emplacement |
|---|---|---|
| Rapport G1 | Texte, sortie de script, non éditable | `registre/<run>/07-g1.txt` |
| Rapport G2 | Markdown : 6 questions, réponses, 3 corrections appliquées | `registre/<run>/07-g2.md` |
| Verdict G3 | Une ligne dans le journal du registre | `registre/README.md` |
| Migration d'ingestion | SQL idempotent | `supabase/migrations/` |
| Estampille | JSON | `registre/<run>/07-verdict.json` |

```json
{
  "run_id": "", "segment_slug": "", "date_snapshot": "2026-08-13",
  "gates": { "g0": "go", "g1": "pass", "g2": "pass", "g3": "pass" },
  "verdict": "production_ready | usable_with_caveats | rejected",
  "taux": { "couche_esn": 1.0, "identite_top3": 1.0, "sources_resolvables": 1.0,
            "blocs_avec_donc": 1.0 },
  "peremption": { "triggers": "2026-11-13", "financier": "2027-08-13",
                  "cartographie": "2027-08-13", "economie": "2028-08-13" },
  "reserves": [""]
}
```

**`usable_with_caveats` est un verdict normal et fréquent.** C'est `production_ready` qui doit
être rare — et interdit tant qu'une source reste non probée ou qu'un compte prioritaire porte
un « non vérifié ».
