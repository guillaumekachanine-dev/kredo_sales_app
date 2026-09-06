# Lot 1 — Résolution d'entité et arrêt de la contamination

**Statut :** livré le 2026-09-07. Code, tests et assainissement de la base faits.
**Reste à la main de Guillaume :** réimport du workflow sur le VPS, et arbitrage de 10 comptes (§5).
**Cadrage :** `ACCOUNT-KNOWLEDGE-V4-CADRAGE.md` §18, Lot 1.

---

## 1. Le défaut corrigé

Le run `intel-030` du 2026-09-04 sur le compte **Tournaire** (fabricant d'emballages, Grasse,
NAF 25.92Z, SIREN 415550110) a publié une étude décrivant **`TOURNAIRE`, SIREN 505063438, Lyon,
NAF 43.99C — une entreprise de travaux de construction**.

Trois défauts cumulés, tous dans `V3 Consult & Normalize Sources` :

1. la requête au registre partait de `companies.name` (« Tournaire »), le score comparait
   `legal_name` (« Groupe Tournaire (Tournaire SA) ») — deux chaînes différentes ;
2. `per_page=3` : la bonne entité arrive en **5ᵉ position**, elle n'était jamais candidate.
   *Vérifié le 2026-09-07 : même avec `per_page=10`, la requête sur le seul nom d'usage ne la
   ramène toujours pas.* Une requête unique ne peut donc pas suffire ;
3. l'appariement était accepté sur `target.includes(candidate)` → score 0,6, **exactement le
   seuil**, sans aucun contrôle croisé sur la commune, le code NAF ou la taille — tous présents au
   CRM et tous contradictoires.

Rien n'a arrêté l'erreur en aval : le « vérificateur indépendant » a rendu 5 `confirmed`, les
**12 `qa_flags` étaient `passed: true`**, et 4 propositions d'enrichissement à 0,85-0,95 de
confiance attendaient d'écrire cette identité dans `companies`.

---

## 2. Le module

**`src/lib/intelligence/entity-resolution.ts`** — pur, sans I/O, 29 tests
(`entity-resolution.test.ts`). C'est la **spécification exécutable** ; le nœud n8n en est une
transcription, jamais l'inverse.

### 2.1 Doctrine

> **Le nom est une porte, jamais une décision.** Trois entités « TOURNAIRE » existent au registre.
> Ce sont la géographie et l'activité qui tranchent. Quand elles se taisent ou se contredisent, le
> module ne devine pas : il rend `needs_human_confirmation`, et l'appelant s'interdit alors toute
> écriture sur les données canoniques.

**Invariant central, structurel :** `RESOLVED_MIN_SCORE` (4) > `WEIGHTS.name` (3). Un nom, même
identique, plafonne sous le seuil de publication. Il faut en plus une **confirmation indépendante** :
commune du siège concordante, ou code NAF déjà connu du CRM.

### 2.2 Signaux et poids

| Signal | Poids | +1 | 0 | −1 |
|---|--:|---|---|---|
| `name` | 3 | cœurs identiques | — | sous 0,4 → candidat **écarté** |
| `geography` | 3 | code postal ou commune concordants | siège inconnu au CRM | département incompatible (**verrou**) ; −0,5 si les libellés divergent sans code postal pour arbitrer |
| `activity_section` | 1 | section NAF cohérente avec le secteur KREDO | NAF de holding/support, ou secteur inconnu | section inattendue |
| `known_naf` | 2,5 | code NAF identique au CRM (+0,6 si même division) | absent | incompatible (**verrou**) |
| `size` | 0,8 | effectifs du même ordre (ratio ≤ 3) | non comparable | ordres différents |
| `administrative_state` | 1 | — | entité active | entité cessée (**verrou**) |
| `known_siren` | 10 | le CRM impose déjà l'entité | — | — |

Trois choix explicites, tous nés de l'examen du portefeuille réel :

- **« groupe », « group », « holding », « france » ne sont pas retirés** des noms : ce sont eux qui
  séparent `TOURNAIRE SA` de `TOURNAIRE GROUP HOLDING`. Seules les formes juridiques et les
  mots-outils le sont.
- **Les NAF de holding et de support** (`70.10Z`, `82.99Z`, `64.20Z`, `74.90B`…) rendent le signal
  d'activité **neutre** au lieu de négatif — sans quoi Domusvi, Cogepart et Groupe IDEC seraient
  pénalisés à tort.
- **Une inclusion très diluée ne prouve plus l'identité.** « BUREAU DES ETUDIANTS INFIRMIERS DU
  CENTRE HOSPITALIER UNIVERSITAIRE DE NICE » contient bien « CHU de Nice », et n'est pas le CHU de
  Nice : au-delà de 2 mots ajoutés, l'inclusion tombe de 0,65 à 0,50. Ce cas a été **découvert par
  l'audit du stock**, pas anticipé.

### 2.3 Trois issues, jamais deux

| Décision | Sens | Écriture canonique |
|---|---|---|
| `resolved` | un candidat domine, sans signal contradictoire | **autorisée** |
| `needs_human_confirmation` | candidat plausible, mais géographie/NAF/état le contredisent, ou deux candidats trop proches | **interdite** |
| `unresolved` | rien d'exploitable | **interdite** |

Le chemin `crm_siren` court-circuite tout : un compte qui porte déjà un SIREN voit son entité
**imposée**, jamais remplacée. Si les signaux contredisent ce SIREN, l'écriture canonique reste
interdite — c'est le symptôme d'une donnée fausse quelque part, et cela appelle un humain.

---

## 3. Le workflow

Patché par `scripts/patch-intel-030-entity-resolution.py`, **sans modification de topologie**
(4 nœuds édités, 0 nœud ajouté ou supprimé, 0 connexion touchée).

| Nœud | Modification |
|---|---|
| `V3 Fetch Public Registry` | `per_page` 3 → 10 |
| `V3 Consult & Normalize Sources` | résolution d'entité transcrite ; interroge lui-même le registre sur les variantes de raison sociale ; **ne produit une preuve d'identité que si `resolved`** |
| `V3 Build Source Catalogue` | porte `entityResolution` vers l'aval |
| `V3 Build Enrichment Proposals` | garde `can_propose_canonical_writes` sur les six attributs d'identité |
| `V3 Prepare Callback` | `qa_flags.entity_resolution` + `contextSnapshot.entityResolution` (candidats écartés compris) |

**Validation.** `node --check` sur chaque nœud modifié, puis exécution réelle : le harnais
`intel-030-account-knowledge-v3.test.js` rejoue la régression Tournaire **sur le code exporté**,
avec un mock de `this.helpers.httpRequest`. **90 assertions, 0 échec** (78 avant, +12).

> ⚠️ **Le réimport sur le VPS est indispensable et n'est pas fait.** Rappel du cadrage §D5 : le
> `researchDiagnostic` du run du 04/09 rend `no_safe_url` sur `https://www.tournaire.fr/`, que le
> garde-fou du dépôt accepte — **le workflow qui tourne n'est déjà pas celui du dépôt**. La
> réconciliation doit précéder toute mesure de terrain.

---

## 4. Assainissement de la base — fait

**15 propositions d'enrichissement rejetées** le 2026-09-07, sur trois comptes dont l'identité
proposée appartenait démonstrativement à une autre personne morale :

| Compte | Identité proposée | Réalité |
|---|---|---|
| **Tournaire** (4) | `TOURNAIRE` · SIREN 505063438 · LYON 69006 · NAF 43.99C | TOURNAIRE SA · 415550110 · Grasse · 25.92Z |
| **MMV** (6) | `DEPIL TECH (DEPIL TECH)` · SIREN 529850455 · Nice · NAF 96.02B | exploitant de résidences de montagne. **Le SIREN proposé est celui d'un autre compte du CRM** (« Depil Tech ») |
| **D-Orbit** (5) | `ORBIT` · SIREN 400276754 · Paris 15e · NAF 56.10C (restauration) | acteur spatial |

`decision_reason` porte la trace : *« Lot 1 Account Knowledge V4 — audit de résolution d'entité du
2026-09-07 »*. Rien n'a été supprimé ; un rejet est réversible.

**Le défaut n'est pas propre à `intel-030`** : sur les 9 jeux de propositions d'identité en attente,
**6 venaient de `intel-010-refresh`** (dont MMV et D-Orbit). Voir §6.

---

## 5. Ce qui reste à arbitrer — 10 comptes

`npx tsx --env-file=.env.local scripts/audit-entity-resolution.mts`
Sur 46 comptes audités : **28 cohérents**, 2 propositions confirmées, **1 rejetée**, 9 SIREN
suspects, 6 propositions à arbitrer.

### 5.1 SIREN déjà enregistrés en base, à contrôler

| Compte | SIREN | Signal |
|---|---|---|
| **Ascoma** | 499118248 | siège **EYRAGUES** (CRM : Monaco) **et entité cessée au registre** — le plus douteux |
| **CHU de Nice** | 504155490 | apparié à « BUREAU DES ETUDIANTS INFIRMIERS DU CHU DE NICE » — vraisemblablement faux |
| **Thales — systèmes défense, cyber et critiques** | 383470937 | aucun rapport de nom (`legal_name` vide, le nom est un libellé KREDO) |
| Domusvi | 519158794 | Suresnes vs Antibes, 38 000 vs ~375 salariés — SIREN d'une filiale, pas du groupe |
| Cogepart | 803489186 | Marseille vs Clichy, 3 300 vs ~15 salariés |
| Pro BTP | 394164966 | Paris vs Cagnes-sur-mer |
| Geostock | 434023032 | Rueil-Malmaison vs Martigues |
| Thalès Alénia Space | 414725101 | Toulouse vs Cannes |
| Groupe Transcan | 352611362 | Le Broc vs Carros (communes voisines — probablement bénin) |

Les cinq derniers relèvent très probablement du même écart légitime : **le CRM enregistre le site
opérationnel, le registre le siège juridique**. Ce n'est pas une erreur, c'est une ambiguïté de
maille — celle-là même que le cadrage §19.6 laisse ouverte (entité juridique ou groupe).

### 5.2 Propositions laissées en attente, à trancher

| Compte | SIREN proposé | Pourquoi le module ne tranche pas |
|---|---|---|
| **Banque Populaire Méditerranée** | 058801481 | **La proposition est juste** (le siège est bien à Nice) ; c'est le CRM qui porte « Puteaux ». Aucune donnée ne permettait de le savoir |
| Ciffréo Bona | 487652257 | commune Cannes ≠ Carros au CRM, et un homonyme au même score |
| CCI Nice Côte d'Azur | 180600017 | nom trop éloigné de « CHAMB COMMERC INDUSTRIE NICE COTE D'AZUR » |
| Keller Williams France | 821579448 | `SAS TEAM FRANCE`, siège Le Plessis-Robinson vs « Sophia » |
| MMV | — | proposition rejetée (§4) ; le module trouve deux candidats à égalité |
| D-Orbit | — | proposition rejetée (§4) ; entité italienne, sans immatriculation française évidente |

Aucun faux positif : les 28 comptes cohérents passent sans bruit.

---

## 6. Recommandation immédiate hors périmètre

**`intel-010-refresh` porte le même défaut et produit six fois plus de propositions
d'identité que `intel-030`** (124 runs contre 18). Le module est écrit pour être partagé ; le
transposer dans `intel-010-refresh-account-infos.json` est un patch du même ordre — quelques
heures — et c'est aujourd'hui **la principale source de contamination restante**.

À arbitrer avant le Lot 2.

---

## 7. Rollback

- **Module et tests** : purement additifs, aucun consommateur applicatif. Les supprimer ne change
  rien au runtime.
- **Workflow** : réimporter la version précédente (`git show HEAD~1:n8n/workflows/intel-030-account-knowledge.json`).
- **Base** : les 15 propositions rejetées sont réversibles
  (`update enrichment_proposals set status = 'proposed', decision_at = null, decision_reason = null where …`).
  Aucune donnée canonique n'a été modifiée.

## 8. Fichiers

| Fichier | Nature |
|---|---|
| `src/lib/intelligence/entity-resolution.ts` | module, source de vérité |
| `src/lib/intelligence/entity-resolution.test.ts` | 29 tests Vitest |
| `scripts/patch-intel-030-entity-resolution.py` | patch reproductible du workflow |
| `scripts/audit-entity-resolution.mts` | contrôle du stock, lecture seule |
| `n8n/workflows/intel-030-account-knowledge.json` | 4 nœuds modifiés |
| `n8n/workflows/intel-030-account-knowledge.SETUP.md` | §2 bis — consigne de réimport |
| `n8n/workflows/__tests__/intel-030-account-knowledge-v3.test.js` | +12 assertions (90 au total) |
