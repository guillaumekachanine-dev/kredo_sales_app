# 02 — Distribution de la connaissance dans KREDO

**Ce document fait autorité sur la destination.** Un bloc de `01-CARTE-DE-LA-CONNAISSANCE.md`
qui n'apparaît nulle part ici n'a pas de raison d'être produit ; un écran qui affiche une
donnée absente de la carte est une deuxième vérité à maintenir.

Principe de découpe : **une page = un lecteur, un moment, une question.** Si deux pages
répondent à la même question, l'une des deux est de trop.

---

## 1. Les quatre surfaces

| Surface | Route | Lecteur | Moment | Question unique |
|---|---|---|---|---|
| **Business Intelligence** | `/intelligence` | Directeur commercial, business developer en préparation | Une fois par secteur, relu avant chaque campagne | *« Que faut-il savoir de ce marché pour y être crédible et y choisir ses cibles ? »* |
| **Prospection** | `/prospection-intelligence` | Business developer en action | Chaque matin, avant chaque appel | *« Que fais-je aujourd'hui, avec qui, avec quel discours ? »* |
| **Cockpit compte** | `/prospection/accounts/[id]` | Business developer sur un compte nommé | Avant un rendez-vous | *« Que sais-je de ce compte, et quelle est la meilleure prochaine action ? »* |
| **Knowledge Hub** | `/knowledge` | Tous, en recherche | Quand on cherche une preuve ou un précédent | *« Où est le document qui dit ça, et d'où il sort ? »* |

> **La page Prospection ne produit aucune connaissance.** Elle compose et convertit ce que BI
> et le cockpit détiennent. Toute donnée qui n'apparaîtrait que là serait une troisième vérité.
> C'est la règle qui empêche le « deuxième cockpit » interdit par l'ADR-0018.

---

## 2. Business Intelligence — 4 onglets

État du code au 13/08 : cinq onglets existent
(`BusinessIntelligenceLocalNavigation.tsx`) — Brief stratégique · Fenêtres · Analyse
sectorielle · Chaîne de valeur · Environnement concurrentiel.

**Cible : quatre.** « Brief stratégique » et « Fenêtres » migrent vers Prospection (ADR-0018
les y place déjà) : ce sont des produits d'action, pas de connaissance. **BI garde la matière,
Prospection garde l'usage.** Un onglet « Calendrier réglementaire » apparaît, aujourd'hui noyé.

| Onglet | Finalité | Ce qu'il produit chez le lecteur | Blocs | Composants existants |
|---|---|---|---|---|
| **Étude sectorielle** | Comprendre le marché comme un praticien | Tenir 3 minutes sans être interchangeable | S1 S2 S3 S4 S5 S6 S9 S13 | `SectorPanorama`, `SectorStudiesModal` |
| **Environnement concurrentiel** | Savoir qui est qui, et qui viser | Une file d'attente de comptes, ordonnée et justifiée | C1 C2 C2b C3 C4 C5 C6 | `CompetitiveEnvironmentWorkspace`, `CompetitiveMatrix`, `CompetitiveActorProfiles` ✅ livrés |
| **Chaîne de valeur** | Savoir où l'ESN se branche et de quoi le secteur dépend | Un angle d'entrée par maillon + un outil de découverte en rendez-vous | S8 A12 | `SectorEcosystemDesktop`, `SectorValueDesktop`, `SectorMapMobile` ✅ |
| **Calendrier réglementaire** | Savoir pourquoi maintenant | Un motif d'appel daté, vérifiable, prononçable | S7 | à construire — matière en base (64 items, 35 futures) |

### Contrat de l'onglet Environnement concurrentiel

C'est celui dont la chaîne complète est livrée : import → arbitrage → matrice → fiches.

```
CompetitiveMapOutput (JSON validé)
  → CompetitiveMapImportWizard (bac d'arbitrage, résolution resolved|ambiguous|not_found)
    → competitive_map_entries + companies.depth_level='mapped', origin='competitive_map'
      → CompetitiveMatrix          (C2  : empreinte × maturité, taille = CA)
      → matrice de priorisation    (C2b : appétence /35 × accessibilité)
      → CompetitiveActorProfiles   (C3  : profile_json, narratif de l'étude)
      → CompetitiveActorSummary    (C4  : tableau comparatif)
```

**Deux règles que tout nouveau consommateur doit appliquer** :
- Un compte `mapped` n'entre ni dans les statistiques, ni dans les combobox, ni ne porte de
  contact (ADR-0019 D-3). ~530 comptes `mapped` potentiels (53 segments × ~10) noieraient
  sinon les 109 comptes réels.
- L'appétence /35 et `account_score_current` ne se trient jamais ensemble (axiome A6).

---

## 3. Prospection — 4 onglets

| Onglet | Finalité | Contrat de composition |
|---|---|---|
| **Brief stratégique** | Recommandations argumentées, adossées à la connaissance **au-dessus d'un seuil de confiance** | Ne consomme que des blocs `verified_fact` / `declared_fact` ; cite ses sources ; **se tait sur ce qu'il ignore** |
| **Fenêtres d'opportunité** | Compiler toute source d'opportunité en objets actionnables | **Vue dérivée, jamais une table** : réglementaire ∪ événements ∪ pain points ∪ actualités ∪ enjeux ∪ signaux |
| **Roadmap & campagnes** | Séquencer dans le temps, avec objectifs mesurables | Écrit dans `account_roadmap_actions` en `draft` ; la matérialisation en `tasks`/`calendar_events`/`opportunities` reste **gatée** (ADR-0012 D-2) |
| **Playbook sectoriel** | Hub de préparation : réviser, rôder le discours, tester des approches | **Projection calculée**, jamais un document stocké |

### Anatomie d'une fenêtre d'opportunité — le contrat

```
déclencheur  (réglementaire | actualité | événement | pain point | signal | enjeu)
  → exposé de la fenêtre et des enjeux induits
  → argumentaire de l'intérêt commercial
  → adéquation offres KREDO (practice_id, offer_id)
  → synthèse de l'angle d'approche
  → comptes concernés, ordonnés par la carte de priorisation
  → prochaine meilleure action + interlocuteur
  → génération de contenu + export « fiche de fenêtre »
```

Les six premières lignes sont **calculables** dès que S7, S9 et C2b sont remplis. Les deux
dernières exigent A3 (contacts qualifiés) et A6 (accessibilité).

### Pourquoi le playbook est une projection

Il se calcule depuis `sector_intelligence.playbook` (personas, objections, entry_points,
roi_arguments, + les 4 clés ★) × `sector_pain_points` × `sector_regulatory_items` ×
`competitive_map_entries` × `offers`. **Écrire un playbook à la main, c'est dupliquer cinq
sources qui divergeront.** Les 13 playbooks macro existants deviennent 53 playbooks résolus
par la seule résolution segment → macro.

---

## 4. Cockpit compte — 7 onglets

L'arborescence est câblée et alignée ADR-0012 / ADR-0019
(`src/components/accounts-contacts/intelligence/intelligence-process.ts`). Reste à remplir.

| Onglet | Étape du process | Finalité | Blocs |
|---|---|---|---|
| **Accueil** | — | Une seule action recommandée | dérivé |
| **Socle** | `socle` | Fiche d'identité vérifiable · profondeur du compte | A1 A2 |
| **Entreprise** | `connaissance` | Connaissance factuelle + contacts et organisation | A3 A4 A5 A6 A7 |
| **Secteur** | `secteur` | Replacer le compte dans son segment, sur la matrice, dans la chaîne | A12 + héritage S/C |
| **Enjeux** | `enjeux` | Enjeux réglementaires, propres et événementiels | A9 (+ S7) |
| **Stratégie** | `strategie` | Angles, messages, pitchs adossés aux offres | A10 + S10-S13 |
| **Roadmap** | `roadmap` | Plan d'adressage + contenu commercial | A11 |

La « fiche d'identité » attendue — métiers, NAF, SIREN, secteur/segment, convention
collective, siège, création, effectifs, CA, croissance, **régime d'achat**, site, tier,
relation — recoupe exactement A1 + A2. Les 7 axes de la migration 068 couvrent déjà
`regime_achat`, `tier`, `relation_type`, `modele_eco`, `moment`, `vertical_client`, `segment`
sur **109/109 comptes**. **Le contrat existe ; il manque la moitié identité** (28 SIREN sur 109).

> **Un onglet « Actualités » est à trancher.** L'architecture du 12/08 en prévoyait un (A8) ;
> le code place les signaux dans « Entreprise ». Tant que 83 % des 808 signaux sont du
> `company_context` — du contexte, pas un signal —, un onglet dédié afficherait du bruit.
> Décision retenue : **pas d'onglet séparé tant que les signaux actionnables ne dépassent pas
> 3 par compte prioritaire.** A8 reste dans « Entreprise ».

---

## 5. Matrice bloc × surface

`●` bloc principal de la vue · `○` bloc consommé en contexte

| Bloc | BI Étude | BI Concur. | BI Chaîne | BI Calend. | Pro Brief | Pro Fenêtres | Pro Roadmap | Pro Playbook | Cockpit | Knowledge |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| S1 S2 | ● | | | | | | | ○ | ○ Secteur | ○ |
| S3 | ● | | ○ | | | ○ | | ○ | ○ Entreprise | |
| S4 | ● | ○ | | | | ○ | | ○ | ○ Secteur | |
| S5 | ● | | | ○ | ○ | ● | | | ○ Secteur | |
| S6 | ● | | | | ○ | ● | | ○ | | |
| **S7** | ○ | | | **●** | ○ | ● | ○ | ○ | ● Enjeux | |
| S8 | | ○ | ● | | | | | ○ | ● Secteur | ○ |
| S9 | ● | | | | ○ | ● | | ● | ○ Enjeux | |
| S10-S13 | ○ | | | | ● | ○ | | ● | ○ Stratégie | |
| S14 | ○ | ○ | ○ | ○ | | | | | ○ | ● |
| C1 C4 C5 | | ● | | | | | | ○ | | |
| **C2 C2b** | | **●** | | | ● | ○ | ● | | ● Secteur | |
| C3 | | ● | ○ | | | | | | ● fiche | |
| C6 | | ● | | | ○ | | ○ | ● | ● Entreprise | |
| A1 A2 | | ○ | | | | | | | ● Socle | |
| A3 | | | | | ● | ● | ● | | ● Entreprise | |
| A4 A5 | | ○ | | | ○ | | | | ● Entreprise | |
| **A6** | | **●** | | | ● | ● | ● | ○ | ● Entreprise | |
| A7 A8 | | | | | ● | ● | | | ● Entreprise | |
| A9 | | | | ○ | ● | ● | ● | | ● Enjeux | |
| A10 | | | | | ○ | | ● | | ● Stratégie | |
| A11 | | | | | ○ | ○ | ● | | ● Roadmap | |
| A12 | | ● | ● | | | | | | ● Secteur | |

**Lecture** : trois blocs traversent tout — **S7, C2b, A6**. Ce sont les trois qui manquent le
plus. Ce n'est pas une coïncidence (`01-CARTE` §6).

---

## 6. Le Knowledge Hub — où vit la Master Study elle-même

La Master Study n'est pas seulement de la matière dispersée en base : c'est aussi **un
document consultable**. C'est ce qui permet de répondre à « vous tenez ça d'où ? » sans quitter
l'application.

| Objet | Table | Rattachement | Consultation |
|---|---|---|---|
| Rapport Master Study (E4 + E5 rendus) | `intelligence_documents` | `primary_entity_type = 'sector'`, `primary_entity_id = <segment_id>` | Knowledge Hub → domaine **Clients & Marchés** |
| Versions successives | `intelligence_document_versions` | append-only | historique de l'étude |
| Liens vers les comptes cartographiés | `intelligence_document_links` | `entity_type = 'company'` | depuis le cockpit d'un compte `mapped` |
| Registre de sources (E3) | `intelligence_documents` + `intelligence_sources` | idem | « ouvrir la source » |
| Chaîne de valeur (E6) | `value_chain_*` + export JSON | `sector_id` macro | onglet BI + export A4 paysage |

**Une valeur d'enum manque** : `master_study` sur `intelligence_document_type`.
`intelligence_entity_type` contient déjà `sector` — le rattachement à un segment fonctionne
sans modification de structure. C'est une migration d'une ligne
(`10-ETAPE-E7-GATES-ET-INGESTION.md` §5).

---

## 7. La connaissance transverse — le « cerveau » de l'application

Au-delà des quatre surfaces, une partie de la connaissance doit être exploitable partout.
Elle l'est **par lecture, jamais par recopie**.

| Consommateur transverse | Ce qu'il lit | Règle |
|---|---|---|
| Génération de contenu (INTEL-020) | S10-S13 résolus, A4, A9, `offers` | Cite ses sources dans le corps du texte |
| Scan de compte (INTEL-010) | Taxonomie E1, `offer_practices` réelles | Ne propose jamais un axe de classification hors référentiel |
| Matching CV / staffing | `practices_fit`, `offers` | Le fit sectoriel est une pondération, pas un filtre |
| Veille (globale et compte) | S14 qualifié, segment du compte | Le corpus de sources paramètre le collecteur, il ne le remplace pas |
| Brief stratégique (P1) | Tout bloc `verified_fact` ou `declared_fact` | **Un bloc `single_source` ou `estimate` s'affiche en contexte mais ne fonde aucune recommandation** |
| Weekly manager, rapports | dérivés | Aucun accès direct à `companies.metadata` FOLIO |

**Le seuil de confiance à l'entrée du brief est ce qui empêche l'application de recycler du
FOLIO non sourcé sous couvert d'IA.** C'est un filtre à l'entrée du prompt, pas un
avertissement à la sortie.
