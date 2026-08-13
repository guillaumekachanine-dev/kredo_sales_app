# E2 — Socle déterministe

> **Aucun modèle de langage n'intervient dans cette étape.** C'est la brique qui manquait
> entièrement et qui explique la majorité des trous des études précédentes : le SIREN de
> Thales Alenia Space est public, gratuit et instantané, et il valait `null` sur 10 comptes
> sur 10 parce qu'on l'avait demandé à un LLM.

---

## 1. Axiomes

- **Subsidiarité** (A1). Ce que ce document liste ne se demande jamais à un LLM. Le prompt de
  E4/E5 **interdit explicitement** de renseigner ces champs : le modèle les reçoit, ou il les
  laisse vides.
- **100 % ou erreur explicite.** Le régime déterministe n'a pas de « à peu près ». Un compte
  sans SIREN porte un motif d'échec nommé, pas un champ vide.
- **Un fait sans source ne s'écrit pas.** `origin`, `primary_source_id`, `effective_at`,
  `confidence_score` sont obligatoires sur chaque ligne de `account_facts`.
- **Le socle s'exécute AVANT l'étude et devient son contexte d'entrée.** C'est le corollaire
  opérationnel de A1, et la différence entre une chaîne et deux outils qui s'ignorent.
- **Une échéance réglementaire se revalide au jour du run.** C'est le seul bloc dont la
  péremption est « immédiate » : on ne cite jamais une date sans l'avoir revue le jour même.

---

## 2. Moyens employés

| Sous-bloc | Outil | Statut au 13/08 |
|---|---|---|
| **A1 — Identité France** | n8n `intel-040-identite-france` : API Sirene INSEE → RNE/INPI → BODACC | Livré (migration 073) — **28 SIREN / 109**, 48 faits `legal_id` sur 26 comptes |
| **S7 — Réglementaire daté** | Légifrance (API PISTE, DILA) + EUR-Lex + curation humaine | 64 items, 51 datés, 35 futurs — **13 fiches sur 53** |
| **A7 — Intensité SI** | API France Travail « Offres d'emploi » par SIREN/NAF | Non branché — 22 signaux |
| **A6 partiel — Marchés publics** | TED (UE), BOAMP (DILA), PLACE | Non branché |
| **A3 partiel — Dirigeants** | RNE/INPI, communiqués de nomination | 0 DSI sur 644 contacts |

**Durée** : le branchement coûte ~8 jours une fois ; l'exécution par secteur est un cron.

> ⚠️ **Piège documenté** : `entreprise.api.gouv.fr` (API Entreprise) est **réservée aux
> administrations**. KREDO est une entreprise privée. Le socle est **Sirene + open data
> (+ Pappers si besoin)**, jamais API Entreprise.

---

## 3. Origine de l'information

| Donnée | Source | Tier | Accès |
|---|---|:-:|---|
| SIREN/SIRET, dénomination, NAF/APE, tranche d'effectif par établissement, dates de création/fermeture, siège | **API Sirene, INSEE** | T1 | Ouverte, gratuite sur clé |
| Dirigeants, mandataires, forme juridique, actionnariat | **RNE / INPI** ; à défaut **Pappers** | T1/T2 | Ouverte / payante |
| Fusions, cessions, procédures collectives | **BODACC** (DILA, data.gouv) | T1 | Open data |
| **IDCC / convention collective par SIRET** | Jeu de données ouvert « conventions collectives par établissement » (data.gouv / annuaire-entreprises) | T1 | À confirmer au branchement |
| Textes réglementaires, dates d'entrée en vigueur | **Légifrance** (PISTE) et **EUR-Lex** | T1 | API |
| Offres d'emploi par entreprise | **API France Travail** | T1 | Sur clé |
| Marchés publics attribués | **TED**, **BOAMP**, PLACE | T1 | Ouverts |

---

## 4. Méthode

### 4.1 A1 — Identité France

1. Résolution par dénomination + géographie → candidats Sirene.
2. **Promotion `companies.siren` / `naf_code` uniquement après résolution non ambiguë.** Une
   résolution ambiguë écrit un fait avec `confidence_score` bas et laisse `companies` intact.
3. Écriture dans `account_facts` : `legal_id`, `naf_code`, `collective_agreement`,
   `headcount_france`, `establishment`, `executive`, `incorporation_date`, avec
   `origin = 'relational'` et `primary_source_id` renseigné.
4. Les comptes non résolus sortent avec un motif : homonymie, entité étrangère sans
   établissement France, structure non immatriculée.

> Le code NAF est **découplé** de la résolution d'identité : un compte peut avoir un SIREN sans
> NAF exploitable. `Groupe IDEC`, constructeur-promoteur de 500 M€, porte `8299Z` — « services
> administratifs divers ». **Un contrôle par la NAF serait trompeur** ; la NAF est du contexte,
> jamais un critère de classification.

### 4.2 S7 — Le calendrier réglementaire

Une échéance n'entre que si elle porte **les cinq champs** : `deadline_date`, `authority`,
`source_url` officiel, `commercial_angle`, `kredo_practice`. Une échéance sans texte officiel
consultable ne rentre pas.

Trois actions, dans cet ordre :

1. **Brancher la lecture avant de produire.** L'étude reçoit en entrée les échéances futures de
   son segment **et de son macro parent**. C'est ce qui empêche le défaut observé : une étude
   déclarant sa rubrique « échéances communes » vide alors que la base contenait la matière.
2. Compléter les 40 segments non couverts, via Légifrance/EUR-Lex + curation.
3. Rattacher au **segment** quand c'est spécifique, au **macro** sinon. C'est l'un des rares
   cas légitimes d'écriture au macro (axiome A4).

**La règle du run BTP, à faire remonter partout** : sur le BTP, la facturation électronique au
01/09/2026 était le seul motif d'appel valable pour les 14 comptes. **Une étude sans au moins
une échéance datée, vérifiée sur source officielle et prononçable telle quelle, n'est pas
livrable** (gate G1).

### 4.3 A7 — L'intensité SI, la mesure qui remplace l'inférence

C'est le gain le plus spectaculaire du socle, et la requête que le retour de test BTP a
désignée comme **la plus rentable de toute la méthode** — celle qui a révélé une équipe Data &
IA d'une vingtaine de personnes en recrutement chez un grand constructeur, qu'aucun communiqué
ne mentionnait.

```
API France Travail par SIREN
  → classification des postes par practice KREDO (8 practices en base)
    → account_fact `it_hiring_intensity`          (la mesure, datée)
    → account_signal `hiring_signal`              (émis au franchissement de seuil)
```

**Effet contractuel** : « besoins SI probables » disparaît du vocabulaire des études,
remplacé par un comptage sourcé. Le prompt E5 refuse la formulation (axiome A11).

### 4.4 A6 — Ce qui est déterministe dans l'accessibilité

L'accessibilité n'est pas un bloc insoluble : c'est un bloc mal décomposé. Trois de ses six
sous-blocs relèvent du déterministe :

| Sous-bloc | Canal | Régime |
|---|---|---|
| Marchés et donneurs d'ordre | TED, BOAMP, PLACE | **Déterministe** — élevé sur le public, nul sur le privé |
| Intensité SI observable | France Travail | **Déterministe** |
| Décideur SI | CRM interne d'abord, puis fonctions publiques (mandataires, communiqués) | Mixte |
| Panel, référencement, canal d'achat | Pages « devenir fournisseur », CGA, chartes achats | OSINT + humain → E5 |
| Habilitation, nationalité, zone protégée | Documentation publique des donneurs d'ordre | Humain → E5 |
| ESN déjà en place | Offres d'emploi (co-traitance citée), références publiques | Mixte → E5 |

---

## 5. Articulation logique

**Amont** : E1 (le périmètre de comptes est connu).
**Aval** : E3, E4, E5 — **tous** consomment le socle en entrée.

```
E2 ──► contexte déterministe d'entrée ──┬──► E3 (le registre de sources connaît déjà les régulateurs)
                                        ├──► E4 (les échéances ne sont pas réinventées)
                                        └──► E5 (les fiches n'ont plus de champ identité null)
```

**Ce que E2 débloque** : le plancher de preuve (axiome A7). Sans identité France, aucun compte
ne peut entrer en shortlist — donc sans E2, E5 ne peut produire aucun top 3 légitime.

**Blocage connu** : A7 (intensité SI) dépend de A1 (il s'interroge par SIREN). L'ordre interne
du socle est donc `A1 → A7`, et `S7` en parallèle.

---

## 6. Contrôle qualité

Le déterministe se contrôle par comptage, pas par jugement. C'est ce qui en fait le seul bloc
dont la qualité est **mesurable en continu**.

| Métrique | Cible | 13/08/2026 |
|---|---|---|
| Comptes avec SIREN ou motif d'échec explicite | 109/109 | **28/109** |
| Faits d'identité avec `primary_source_id` | 100 % | 100 % ✅ (48/48) |
| Segments étudiés avec ≥ 1 échéance datée future | 100 % | 13 fiches / 53 |
| Comptes prioritaires avec `it_hiring_intensity` | 100 % | 0 |
| Échéances revalidées le jour du run | 100 % | non instrumenté |

**Aucune de ces métriques n'est cochée à la main** — elles se calculent (axiome A10) et
s'affichent sur la page de garde de l'étude.

---

## 7. Destination et finalité

| Bloc | Table | Écran |
|---|---|---|
| A1 | `account_facts` + promotion `companies.siren`/`naf_code` | Cockpit → **Socle** |
| S7 | `sector_regulatory_items` | BI → **Calendrier** · Cockpit → **Enjeux** · Prospection → **Fenêtres** |
| A7 | `account_facts` `it_hiring_intensity` + `account_signals` `hiring_signal` | Cockpit → **Entreprise** · Prospection → **Brief** |
| A6 partiel | `account_facts` `access_channel` | Cockpit → **Entreprise** |

**Finalité** : répondre à Q4 (« pourquoi maintenant ») avec une date vérifiable, et rendre Q1
décidable en donnant un plancher de preuve à chaque compte.

---

## 8. Livrables et formalisme

E2 ne produit pas de document : **il produit des lignes en base**. Son livrable de run est un
rapport de couverture.

**Fichier** : `registre/<run>/02-socle.json`

```json
{
  "date_execution": "2026-08-13",
  "identite": {
    "comptes_cibles": 0, "resolus": 0, "ambigus": 0,
    "echecs": [{ "company_id": "", "motif": "homonymie | hors_france | non_immatricule" }]
  },
  "reglementaire": {
    "items_segment": 0, "items_macro": 0, "futurs": 0,
    "revalides_le": "2026-08-13",
    "echeance_pivot": { "libelle": "", "date": "", "source_url": "", "kredo_practice": "" }
  },
  "intensite_si": { "comptes_mesures": 0, "signaux_emis": 0, "seuil": 0 },
  "marches_publics": { "comptes_avec_attribution": 0, "source": "TED | BOAMP" }
}
```

`echeance_pivot` est le champ que E4 et E5 consomment directement : **c'est le motif d'appel
universel du secteur.** S'il est nul, G1 échoue.
