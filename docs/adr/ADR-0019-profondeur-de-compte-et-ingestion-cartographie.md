# ADR-0019 — Profondeur de compte et ingestion des cartographies concurrentielles

- **Statut** : Accepté
- **Date** : 2026-08-10
- **Décideur** : Guillaume Kasanin
- **Migrations** : `20260810110011_066_companies_rationalisation_lot1`, `20260810110343_067_account_depth_socle`, `20260810204816_068_account_classification_apply`
- **Remplace / amende** : rien. Complète l'ADR-0008 (Client Intelligence Hub) et l'ADR-0012 (chaîne de décision).

---

## Contexte

Deux besoins convergent vers le même objet.

1. **Créer un compte ex nihilo** doit pouvoir aller du simple pense-bête (« je situe
   ce nom, je le retrouverai ») jusqu'à l'analyse complète du cockpit, par paliers
   activables de façon asynchrone et non obligatoire.

2. **Les cartographies concurrentielles** produisent une dizaine de comptes par
   secteur étudié, aujourd'hui prisonniers d'un livrable Markdown. Ils doivent
   devenir visibles dans le CRM sans y être confondus avec de vrais comptes.

Trois constats de l'état réel ont cadré la décision :

- **Le cockpit existe déjà pour tous les comptes.** `/prospection/accounts/[companyId]`
  est une route dynamique universelle, atteinte depuis un lien inconditionnel du
  drawer. « Créer un cockpit » ne crée rien : c'est un état à déclarer, pas une page
  à générer.
- **La machine à étapes séquencées non obligatoires existe déjà**
  (`INTELLIGENCE_PROCESS_STEPS` + `getProcessStepStatus`, ADR-0012). Il lui manque
  une étape 0 « Socle », pas une refonte.
- **Aucune colonne existante ne pouvait porter la profondeur.** `knowledge_state`
  porte la provenance FOLIO vs moteur ; `relation_type` porte le statut commercial ;
  `lifecycle_status` n'en est qu'une projection (migration 066). Les surcharger
  aurait créé une quatrième sémantique cachée dans une colonne déjà ambiguë.

---

## Décision

### D-1 — Un axe de profondeur dédié, monotone croissant

`companies.depth_level` ∈ `mapped | noted | qualified | active`.

| Palier | Sens | Support | Créé par |
|---|---|---|---|
| `mapped` | Cité par une cartographie. Aucune donnée canonique. | Drawer minimal | Ingestion cartographie |
| `noted` | Pense-bête CRM. | Drawer standard | Bouton « Nouveau compte » |
| `qualified` | Socle vérifié (SIREN, NAF, taille, taxonomie). | Drawer + cockpit | Scan appliqué |
| `active` | Chaîne de décision ADR-0012 engagée. | Cockpit complet | Workflows intelligence |

La profondeur **ne redescend jamais automatiquement**. Un compte `active` dont la
veille est désactivée reste `active` : sinon les badges clignoteraient au gré des
runs. Seule une action explicite la fait redescendre.

`companies.origin` (`manual | competitive_map | scan | import | folio`) trace ce
qui a fait naître la fiche.

### D-2 — Une seule transition, trois portes d'entrée

La case « créer cockpit intelligence » à la création, le bouton « Convertir » d'un
compte cartographié et le bouton « Ouvrir le cockpit » du drawer déclenchent **la
même Server Action**. Construire « convertir » comme un parcours distinct
produirait deux vérités à maintenir.

### D-3 — `mapped` est un état de citation, pas un compte

Un compte `mapped` n'entre pas dans les statistiques du header, n'apparaît pas dans
les combobox d'opportunité ni de mission, et ne peut pas porter de contact. C'est
la garantie que ~530 comptes potentiels (53 segments × ~10 concurrents) ne
noieront pas les 96 comptes réels.

### D-4 — Les chiffres de cartographie ne touchent pas les colonnes canoniques

Les livrables qualifient eux-mêmes leurs chiffres de « provisoires », « non
audités », et avertissent qu'un CA groupe n'est pas un CA de périmètre. Écrire
13,4 Md€ dans `companies.revenue` perdrait le caveat, et un commercial le citerait
en rendez-vous.

- Les **faits sourcés** (CA, effectif) vont dans `account_facts`, avec provenance
  et `intelligence_sources`.
- L'**analyse cartographique** (catégorie, positionnement, forces, vulnérabilité,
  angle d'entrée, appétence /35) va dans `competitive_map_entries`, qui ne porte
  délibérément aucun chiffre d'affaires ni effectif.
- Les colonnes canoniques de `companies` ne sont remplies **qu'à la conversion**,
  après passage du scan sourcé sur registre officiel.

`competitive_map_entries.appetence_provisoire` reste visible à l'écran tant que la
composante « accessibilité » n'a pas été auditée compte par compte.

### D-5 — Aucune création automatique en cas d'ambiguïté

L'ingestion d'une cartographie résout chaque compte avant de créer quoi que ce
soit :

```
resolved existant  → rattachement de l'analyse, aucune création
ambiguous          → bac d'arbitrage
not_found          → création `mapped` + faits sourcés
```

Le mécanisme de résolution existe déjà (`AccountScanResolution`, INTEL-010) et est
réutilisé plutôt que réinventé. Deux clés protègent le CRM :

- `companies_siren_unique_idx` — unicité dure sur `(workspace_id, siren)` ;
- `companies.name_normalized` — colonne générée (minuscules, sans accent,
  ponctuation réduite), indexée, pour le rapprochement flou. « Thalès Alénia
  Space » et « Thales Alenia Space » s'y rejoignent : c'est précisément le doublon
  qu'aurait produit la cartographie Spatial.

### D-6 — Une seule action suivante par compte

Sur un compte neuf, les six chapitres du cockpit afficheraient tous « À venir ».
Le cockpit expose donc **une seule action recommandée**, dérivée de l'état par
`getProcessStepStatus` ; les autres restent accessibles mais démotées. Le
séquencement est une suggestion forte, pas un menu plat.

---

## Ce qui a été écarté

- **Surcharger `knowledge_state`, `lifecycle_status` ou `tags[]`** — trois
  sémantiques déjà distinctes ; en ajouter une quatrième par surcharge est la
  dette que la migration 066 vient précisément de rembourser.
- **`lifecycle_status` pour marquer les comptes cartographiés** — impossible :
  son domaine est fermé à 4 valeurs relationnelles, dont il n'est que la
  projection de `relation_type`.
- **Modulariser INTEL-030 dans ce chantier** — le contrat n'est pas stabilisé.
  L'interface (sections déclarées, rafraîchissement ciblé) est posée ; le
  remplissage devient un chantier séparé.
- **Un workflow n8n d'ingestion dès le premier lot** — les cartographies sont
  produites à la main par le skill sectoriel, et 11 workflows patchés attendent
  déjà d'être réimportés sur le VPS. Un import JSON manuel dans le bac
  d'arbitrage couvre le besoin réel sans allonger cette file.

---

## Conséquences

**Positives**

- Le groupement de la liste comptes passe de `companies.sector` (texte libre figé)
  à la taxonomie, condition pour que les comptes cartographiés atterrissent dans
  leur section sectorielle.
- La vue `v_crm_account_list` reprend la charge de la taxonomie et de la
  profondeur : la seconde requête `companies` jointe en JavaScript disparaît, et
  avec elle la divergence de `limit` (300 sur la vue, 1000 sur `companies`) qui
  aurait tronqué la liste en silence dès la 4ᵉ étude sectorielle.

**Négatives / à surveiller**

- `depth_level` est un axe de plus sur une table qui en porte déjà beaucoup. Sa
  légitimité tient à sa monotonie et à son unicité de source : toute écriture doit
  passer par l'action de promotion, jamais par un `update` direct.
- La règle D-3 doit être appliquée à **chaque** nouveau consommateur de
  `companies` : un `mapped` oublié dans une combobox et l'invariant tombe.

---

## Suivi

| Lot | Contenu | État |
|---|---|---|
| 0 | ADR + migrations 066/067 + vue + loader + normalisation des actions | **Fait** |
| 1 | Groupement de la liste sur la taxonomie | Fait par le commit `07b49c88`, à revalider |
| 2 | `promoteAccountDepth` + modale « Créer et qualifier » | À faire |
| 3 | Étape 0 « Socle » dans le cockpit + action suivante unique | **Fait** |
| 4 | Scan affiné : 7 axes de classification ajoutés au contrat INTEL-010 | **Fait, en production, durci sur 4 correctifs post-livraison** (migration 068 ; workflow n8n réimporté et étendu d'un harnais de test versionné — `docs/adr/HANDOFF-ADR-0019.md` §5bis/§5ter) |
| 5 | Contrat `CompetitiveMapOutput` + ingestion + bac d'arbitrage | **Fait** (migration 074, `src/features/competitive-map/`) |
| 6 | Sous-section `mapped` dans la liste + drawer minimal + « Convertir » | À faire |
| 7 | Modularisation INTEL-030 | Différé |
