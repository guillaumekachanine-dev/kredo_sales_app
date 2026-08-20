# ADR-0021 — Master Study : ingestion canonique, projections et distribution dans KREDO

- **Statut** : **Proposé à l’adoption**
- **Date** : 2026-08-20
- **Décideur attendu** : Guillaume Kasanin
- **Portée** : Master Study, Business Intelligence, Cockpit Intelligence compte, Études sectorielles, Prospection, Knowledge Hub
- **Compte pilote** : ROBERTET
- **Segment pilote** : `seg-parfumerie-compositions-b2b` — Compositions & ingrédients B2B
- **Complète** :
  - `docs/MASTER-STUDY/01-CARTE-DE-LA-CONNAISSANCE.md`
  - `docs/MASTER-STUDY/02-DISTRIBUTION-DANS-KREDO.md`
  - `docs/MASTER-STUDY/10-ETAPE-E7-GATES-ET-INGESTION.md`
- **Ne remplace pas** la nomenclature S/C/A/P ni les étapes E0→E7.
- **Objet de cette ADR** : définir la couche qui manquait entre **« la Master Study produit de la connaissance »** et **« chaque surface KREDO la consomme avec une finalité différente »**.

> **Décision proposée**
>
> Une Master Study est **un corpus versionné unique**. Elle est **ingérée une seule fois** vers la connaissance canonique de KREDO.  
> Les différentes surfaces ne possèdent pas leur propre copie de l’étude : elles construisent des **projections de lecture** adaptées à leur question.
>
> - **Business Intelligence** explore la connaissance de manière exhaustive.
> - **Études sectorielles** en fournit un digest rapide et transversal.
> - **Cockpit > Secteur** en fournit la perspective synthétique d’un compte nommé.
> - **Prospection** convertit cette connaissance en discours et en action.
> - **Knowledge Hub** conserve le document source, ses versions et la preuve.

---

## 0. Pourquoi cette décision devient nécessaire maintenant

Le chantier a commencé par un symptôme simple : l’onglet **Secteur** du Cockpit Intelligence d’un compte n’était pas alimenté par la nouvelle analyse sectorielle et, notamment, par la cartographie Master Study.

ROBERTET a été choisi comme compte pilote. L’analyse du dépôt et de Supabase a alors montré que la cartographie E5 existait déjà en base et pouvait être reliée au Cockpit avec un lot très léger : lecture du dernier snapshot du segment, identification du compte courant et restitution de sa position parmi les acteurs.

Cette première recommandation était correcte mais **trop étroite**.

Le questionnement suivant a changé le niveau du problème :

> La Master Study du segment Parfumerie contient-elle réellement les informations attendues par l’onglet Secteur ?

La réponse a été double :

1. **Oui, la Master Study E4 contient déjà une matière sectorielle riche et très proche du contrat S1→S14.**
2. **Non, cette matière n’est pratiquement pas matérialisée aujourd’hui dans les tables segment de Supabase.**

Puis une clarification fonctionnelle a imposé le dernier changement de perspective :

- le **Cockpit > Secteur** ne doit pas devenir une mini-page Business Intelligence ;
- **Business Intelligence** doit exploiter la totalité de la Master Study, distribuée dans ses onglets spécialisés ;
- le **Cockpit > Secteur** doit produire une lecture courte, orientée vers le compte consulté ;
- le module **Études sectorielles** doit, lui, permettre de parcourir rapidement une version synthétique de l’étude.

Le problème n’est donc plus seulement :

> « Comment afficher E5 dans le Cockpit ? »

Il devient :

> **« Comment faire de la Master Study une source de connaissance unique, versionnée et traçable, puis en distribuer plusieurs lectures cohérentes sans duplication, sans contradiction et sans sur-ingénierie ? »**

C’est l’objet de cette ADR.

---

# 1. Cheminement de décision

## 1.1 Étape 1 — Le besoin initial : enrichir Cockpit > Secteur

La première intuition était de connecter `competitive_map_entries` au Cockpit.

Le raisonnement était légitime :

- E5 est déjà ingéré ;
- le Cockpit connaît le `segment_id` du compte ;
- `competitive_map_entries` contient le positionnement, l’appétence, l’accessibilité, la confiance, le compte étalon et l’angle d’entrée ;
- la page BI possède déjà un presenter et une matrice utilisables comme références techniques.

Le lot R0 a donc été cadré autour d’un `competitiveContext`.

Cette brique reste valide.

## 1.2 Étape 2 — GATE A : la cartographie est une sous-brique, pas la finalité

La GATE A a confirmé une architecture saine :

```text
companyId + segmentId
        ↓
dernier snapshot concurrentiel du segment
        ↓
currentActor + acteurs comparables
        ↓
competitiveContext
```

Elle a également confirmé qu’il ne fallait :

- ni charger tout `getCompetitiveMapWorkspace()` dans le Cockpit ;
- ni réutiliser `SectorActorMap`, qui repose sur d’autres axes ;
- ni recopier `profile_json` comme nouvelle source de vérité ;
- ni hardcoder ROBERTET.

Cette décision est conservée.

## 1.3 Étape 3 — Audit de la Master Study Parfumerie

L’étude E4 du segment `seg-parfumerie-compositions-b2b`, snapshot 2026-08-14, contient notamment :

- périmètre et hors-champ ;
- cinq thèses de marché avec conséquence commerciale ;
- un message sectoriel ;
- des incertitudes explicites ;
- des blocs clients ;
- cinq modèles économiques ;
- une amorce détaillée de chaîne de valeur ;
- des fronts technologiques ;
- des dépendances critiques ;
- de la réglementation ;
- une chronologie ;
- des risques/opportunités ;
- des pain points ;
- des personas, objections, ROI et points d’entrée ;
- un registre de sources.

L’étude fait également quelque chose de très important : elle sait dire **« non publié »** au lieu d’inventer. Pour ce segment, la taille exacte du marché France et sa croissance ne sont pas publiées de manière suffisamment propre.

Le contenu existe donc. Le problème principal n’est pas la production de connaissance.

## 1.4 Étape 4 — Audit live : E5 est matérialisé, E4 ne l’est pas

Au 2026-08-20, le segment Supabase `Compositions & ingrédients B2B` présente l’état suivant :

| Élément | État live |
|---|---|
| `sector_intelligence.description` | vide |
| `sector_intelligence.caveats` | vide |
| `market_size_eur_bn` | `NULL` |
| `market_growth_pct` | `NULL` |
| `playbook.personas` | 0 |
| `playbook.objections` | 0 |
| `playbook.entry_points` | 0 |
| `playbook.roi_arguments` | 0 |
| `playbook.economic_models` | absent / 0 |
| `playbook.tech_fronts` | absent / 0 |
| `playbook.risks` | absent / 0 |
| `playbook.market_thesis` | absent / 0 |
| `sector_events` segment | 0 |
| `sector_pain_points` segment | 0 |
| `sector_regulatory_items` segment | 0 |
| `competitive_map_entries` segment | **8** |
| document `master_study` rattaché au segment | **0** |

Conclusion :

> **La base a reçu E5 mais pas E4.**

KREDO possède donc une étude riche dans le registre Git, mais seulement une partie de sa connaissance est aujourd’hui exploitable par les écrans.

## 1.5 Étape 5 — Le malentendu fonctionnel est levé

Deux finalités ont été explicitement séparées :

### Business Intelligence

Question :

> **« Que faut-il savoir de ce marché pour le comprendre, le comparer, le prioriser et préparer une campagne ? »**

Réponse attendue :

- exhaustive ;
- analytique ;
- segment-centric ;
- répartie dans plusieurs onglets spécialisés ;
- permettant de remonter au détail et aux sources.

### Cockpit compte > Secteur

Question :

> **« Qu’est-ce que ce segment signifie pour CE compte ? »**

Réponse attendue :

- courte ;
- contextualisée ;
- focalisée sur le compte ;
- orientée vers la compréhension et l’action ;
- non redondante avec les onglets Enjeux et Stratégie.

Cette distinction est structurante.

## 1.6 Étape 6 — Un troisième usage apparaît : le digest

Le module **Études sectorielles** doit permettre une lecture rapide de la Master Study sans obliger l’utilisateur à parcourir tous les onglets de Business Intelligence.

Il faut donc distinguer trois profondeurs de lecture :

| Produit de lecture | Temps cible | Question |
|---|---:|---|
| **BI analytique** | 10–30 min | « Que savons-nous de ce segment ? » |
| **Digest Master Study** | 2–5 min | « Qu’est-ce que je dois retenir de cette étude ? » |
| **Perspective compte** | 30–90 s | « Qu’est-ce que cela signifie pour ce compte ? » |

Prospection constitue ensuite une quatrième destination, mais non une quatrième profondeur de connaissance : elle **transforme la connaissance en action**.

---

# 2. Les attentes fonctionnelles à satisfaire

## 2.1 Une seule vérité métier

Une information issue d’une Master Study ne doit pas exister sous trois formulations persistées indépendantes pour :

- Business Intelligence ;
- Études sectorielles ;
- Cockpit.

Sinon, chaque nouvelle étude ou mise à jour implique trois réingestions, trois invalidations et trois risques de dérive.

La règle devient :

> **On duplique les formes de lecture, jamais la vérité.**

## 2.2 Une profondeur adaptée au moment utilisateur

La même donnée peut être :

- principale dans une vue ;
- secondaire dans une autre ;
- absente d’une troisième.

Exemple :

- la totalité de S7 est principale dans **BI > Calendrier** ;
- une ou deux échéances majeures peuvent apparaître dans le **Digest** ;
- une échéance pertinente pour ROBERTET peut apparaître comme contexte dans **Cockpit > Secteur** ;
- son traitement détaillé appartient à **Cockpit > Enjeux**.

Ce n’est pas une duplication fonctionnelle : c’est une distribution par intention.

## 2.3 La perspective compte doit être réelle

Une perspective compte ne peut pas être obtenue en ajoutant simplement le nom du compte devant un résumé sectoriel.

Elle doit composer :

```text
ce qui est vrai du segment
        +
ce que E5 sait de ce compte
        +
sa position concurrentielle
        +
sa place dans la chaîne de valeur
        +
les faits canoniques du compte
        ↓
ce qui est particulièrement pertinent pour CE compte
```

Pour ROBERTET, par exemple, la perspective doit naturellement faire remonter les thèmes NaturIA / IA gouvernée et IFRA 52 parce qu’ils existent à la fois dans le contexte sectoriel et dans l’angle d’entrée du compte.

## 2.4 La synthèse ne doit pas halluciner

La V1 ne doit pas demander à un LLM, à chaque ouverture :

> « Résume-moi toute la Master Study pour ROBERTET. »

Ce serait :

- non déterministe ;
- plus lent ;
- plus coûteux ;
- difficile à tester ;
- susceptible de reformuler ou d’amplifier un fait ;
- inutile puisque la Master Study produit déjà des blocs structurés et des « DONC, commercialement ».

La V1 doit **sélectionner, ordonner et présenter**.

## 2.5 La provenance doit survivre à toutes les transformations

Un utilisateur doit pouvoir remonter :

```text
écran
→ bloc canonique
→ run Master Study
→ document/version
→ source/preuve
```

La synthèse ne doit jamais casser la chaîne de preuve.

---

# 3. Les problèmes techniques réellement constatés

## 3.1 Le schéma live n’assure pas encore le versionnement annoncé par E7

E7 affirme :

> « Rien n’est écrit sans estampillage : date de snapshot, verdict de gate, identifiant de run. »

et :

> « Chaque ingestion est réversible par son `run_id`. »

Or, au 2026-08-20 :

- `sector_intelligence` ne possède ni `source_run_id` ni `study_snapshot_date` ;
- `sector_events` ne possède ni `source_run_id` ni `study_snapshot_date` ;
- `sector_pain_points` ne possède ni `source_run_id` ni `study_snapshot_date` ;
- `sector_regulatory_items` ne possède ni `source_run_id` ni `study_snapshot_date` ;
- `value_chain_nodes` ne possède ni `source_run_id` ni `study_snapshot_date`.

À l’inverse, `competitive_map_entries` possède déjà :

- `source_document_id` ;
- `study_snapshot_date`.

Il manque donc une doctrine de provenance homogène.

## 3.2 Le document E7 est partiellement dépassé par la base live

E7 mentionne encore l’ajout nécessaire de la valeur enum `master_study`.

La base live contient déjà :

```text
intelligence_document_type = ... | master_study | ...
```

Cette migration ne doit donc pas être rejouée.

Ce constat rappelle une règle simple :

> **les documents définissent la doctrine ; le schéma live définit l’état technique réel.**

## 3.3 Le lien de preuve sectoriel promis par la documentation n’existe pas encore

La documentation cible `intelligence_sources + intelligence_source_links` pour S14.

Mais le schéma live de `intelligence_source_links.object_type` n’accepte actuellement que :

```text
proposal | fact | signal
```

Il ne peut donc pas relier directement une source à :

- `sector_intelligence` ;
- `sector_event` ;
- `sector_pain_point` ;
- `sector_regulatory_item` ;
- `competitive_map_entry` ;
- `value_chain_node`.

C’est un drift réel entre doctrine et schéma.

## 3.4 `NULL` ne signifie pas toujours « hériter »

Le cas Parfumerie est le meilleur exemple.

E4 dit explicitement :

- taille du segment : **non publiée** ;
- croissance : **non publiée**.

Or la résolution segment → macro peut interpréter un `NULL` segment comme :

> « pas de donnée spécifique, donc j’hérite du macro ».

Ce comportement peut faire apparaître un chiffre macro comme s’il caractérisait le segment, alors que l’étude a explicitement décidé de **ne pas faire cette assimilation**.

Il faut distinguer :

```text
ABSENT
= aucune connaissance segment ; héritage autorisé

EXPLICIT_UNKNOWN
= le segment a été étudié et la valeur n’est pas publiable ; héritage interdit
```

C’est une exigence de vérité, pas un détail d’UI.

## 3.5 Les contrats E4/E5 ne permettent pas encore une orientation compte totalement déterministe

`sector-knowledge.schema.json` fournit un `id` stable aux thèses.

Mais la plupart des autres ensembles E4 — fronts technologiques, risques, pain points, chronologie — n’ont pas aujourd’hui d’identifiants stables de bloc.

E5 contient une analyse riche du compte mais ne référence pas explicitement :

- les thèses E4 particulièrement pertinentes ;
- les fronts technologiques concernés ;
- les risques/opportunités associés ;
- les pain points associés ;
- les nœuds E6 associés.

Pour une perspective compte fine, le système doit donc actuellement :

- soit sélectionner des éléments globaux ;
- soit faire du rapprochement textuel ;
- soit demander une synthèse LLM.

La meilleure optimisation future est de **faire porter les relations par les données elles-mêmes**.

## 3.6 `SectorStudiesModal` est déjà un digest… sur l’ancien contrat

Le composant actuel affiche une lecture condensée :

- synthèse marché ;
- personas ;
- pain points ;
- ROI ;
- objections ;
- réglementaire ;
- acteurs ;
- entry points ;
- limites/sources.

Son intuition produit est bonne.

En revanche, son `BusinessIntelligenceSectorProfile` ne représente pas encore proprement la nouvelle Master Study et ses blocs E4/E5/E6.

Il doit donc être **migré**, pas nécessairement remplacé dans son principe.

---

# 4. Options d’architecture challengées

## Option A — Une ingestion différente par destination

```text
Master Study
├─ ingestion BI
├─ ingestion Cockpit
└─ ingestion Études sectorielles
```

### Avantages

- très simple à imaginer ;
- chaque écran reçoit exactement son format.

### Défauts

- trois copies de la même connaissance ;
- invalidation multiple ;
- divergence inévitable ;
- coûts de maintenance croissants ;
- provenance plus difficile ;
- chaque nouvelle destination crée une nouvelle branche d’ingestion.

### Verdict

**REJETÉE.**

---

## Option B — Conserver uniquement le JSON brut et le lire directement partout

```text
04-secteur.json + 05-comptes.json + 06-chaine.json
        ↓
chaque écran parse ce dont il a besoin
```

### Avantages

- très peu d’ingestion ;
- le document brut reste la vérité.

### Défauts

- requêtes relationnelles difficiles ;
- jointures avec CRM et offres pénibles ;
- filtrage, scoring et vues transverses dégradés ;
- chaque écran réimplémente le parsing ;
- très mauvaise base pour Prospection, scoring et fenêtres ;
- contredit le modèle S/C/A déjà construit.

### Verdict

**REJETÉE.**

Le document brut est une archive et une preuve, pas le datastore applicatif.

---

## Option C — Pré-générer et persister un résumé par destination

Exemple :

```text
master_study_summary_for_bi
master_study_summary_for_cockpit
master_study_summary_for_studies
```

### Avantages

- affichage rapide ;
- UI simple.

### Défauts

- réintroduit plusieurs vérités ;
- invalidation complexe ;
- textes figés ;
- difficile de garantir qu’une correction canonique se propage ;
- multiplication des objets persistés.

### Verdict

**REJETÉE EN V1.**

Une synthèse éditoriale persistée pourra exister plus tard comme **document dérivé versionné**, jamais comme vérité métier.

---

## Option D — Résumé LLM dynamique à chaque lecture

### Avantages

- très flexible ;
- perspective compte potentiellement élégante.

### Défauts

- non déterministe ;
- coût et latence ;
- tests difficiles ;
- dépendance à un prompt ;
- risque de reformulation abusive ;
- impossible de garantir la même vérité entre BI et Cockpit.

### Verdict

**REJETÉE COMME MÉCANISME PRINCIPAL.**

Un LLM pourra ultérieurement améliorer la rédaction d’une synthèse déjà résolue, mais il ne doit pas décider de la connaissance.

---

## Option E — Une ingestion canonique + plusieurs projections déterministes

```text
Master Study versionnée
        ↓
connaissance canonique Supabase
        ↓
read models / presenters spécialisés
        ↓
BI | Digest | Cockpit | Prospection
```

### Avantages

- une seule vérité ;
- provenance conservée ;
- chaque surface garde sa finalité ;
- testable ;
- réutilise le schéma existant ;
- compatible avec le modèle S/C/A/P ;
- permet de faire évoluer l’UI sans réingérer la connaissance.

### Inconvénients

- exige de formaliser la notion de projection ;
- exige un vrai versionnement de la matérialisation ;
- nécessite de corriger quelques drifts de schéma.

### Verdict

**RETENUE.**

---

# 5. Architecture retenue — trois couches, plusieurs projections

## 5.1 Couche 1 — Artefact source versionné

La Master Study complète reste archivée telle qu’elle a été produite.

Elle doit être consultable via :

```text
intelligence_documents
+ intelligence_document_versions
```

avec :

```text
document_type = master_study
primary_entity_type = sector
primary_entity_id = <segment_id>
```

Le document doit conserver :

- le contenu structuré du run ;
- le rendu lisible ;
- la date de snapshot ;
- le verdict de gates ;
- les sources ;
- les caveats ;
- la version des schémas.

### Rôle

Répondre à :

> « Qu’a réellement produit cette étude, à cette date ? »

Cette couche est historique et probante.

---

## 5.2 Couche 2 — Connaissance canonique matérialisée

Les blocs S/C/A sont écrits dans leurs structures métier :

```text
sector_intelligence
sector_events
sector_pain_points
sector_regulatory_items
competitive_map_entries
value_chain_*
account_facts
intelligence_sources
...
```

### Rôle

Répondre à :

> « Qu’est-ce que KREDO sait actuellement et peut requêter ? »

Cette couche est la source de vérité applicative.

Elle permet :

- filtrage ;
- jointures ;
- scoring ;
- croisement avec CRM ;
- composition de produits d’action ;
- résolution macro/segment ;
- utilisation transverse.

---

## 5.3 Couche 3 — Projections de lecture

Les écrans ne deviennent pas propriétaires des données.

Ils construisent des contrats adaptés :

```text
connaissance canonique
        ↓
projections
        ├─ BI analytique
        ├─ MasterStudyDigest
        ├─ AccountSectorPerspective
        └─ SectorPlaybookProjection
```

### Rôle

Répondre à :

> « Parmi ce que KREDO sait, qu’est-ce qui est utile pour cette question, maintenant ? »

---

# 6. Les quatre projections officielles

## 6.1 Business Intelligence — lecture exhaustive et distribuée

### Finalité

> **Explorer toute la connaissance de la Master Study sans la compresser artificiellement.**

Mais il ne faut pas créer un énorme objet `MasterStudyWorkspace` chargé partout.

La solution la plus légère est de conserver des **read models spécialisés par onglet**.

### Distribution

#### BI > Étude sectorielle

Consomme principalement :

```text
S1 S2 S3 S4 S5 S6 S9 S13
```

Donc E4.

#### BI > Environnement concurrentiel

Consomme :

```text
C1 C2 C2b C3 C4 C5 C6
```

Donc E5 + facts compte.

#### BI > Chaîne de valeur

Consomme :

```text
S8 + A12
```

Donc E6 + position des comptes.

#### BI > Calendrier réglementaire

Consomme :

```text
S7
```

Donc le socle réglementaire daté.

### Décision

> **BI est exhaustive fonctionnellement, mais pas monolithique techniquement.**

Chaque onglet charge le domaine dont il est responsable.

---

## 6.2 `MasterStudyDigest` — lecture rapide de l’étude

### Destination principale

Module **Études sectorielles**.

### Finalité

> **Comprendre l’essentiel d’une Master Study en 2 à 5 minutes sans parcourir tous les onglets BI.**

Le Digest n’est pas seulement un résumé d’E4. Il représente la Master Study dans son ensemble.

Contrat conceptuel :

```ts
type MasterStudyDigest = {
  segment: {
    id: string
    name: string
    snapshotDate: string
    confidence: string
    verdict: string
  }

  scope: {
    definition: string
    caveats: string[]
  }

  keyTheses: SectorThesis[]
  market: {
    size: number | null
    growth: number | null
    disclosure: string | null
  }

  economicHighlights: EconomicModel[]
  techFronts: TechFront[]
  currentDynamics: SectorEvent[]
  regulatoryFocus: RegulatoryItem[]
  keyPainPoints: PainPoint[]
  riskOpportunities: RiskOpportunity[]

  competitiveHighlights: {
    benchmarkAccount: Actor | null
    priorityActors: Actor[]
    actorCount: number
  }

  valueChainHighlights: {
    keyNodes: ValueChainNode[]
    criticalDependencies: string[]
  }

  messageSectoriel: string

  provenance: {
    runId: string
    sourceCount: number
    documentId: string | null
  }
}
```

### Règles de sélection V1

La V1 doit rester déterministe :

- thèses : ordre éditorial E4, 3 maximum ;
- fronts : `zone_de_transition=true` en priorité, 3 maximum ;
- réglementation : futures / commerciales / plus proches, 3 maximum ;
- dynamique : plus récente, 3 maximum ;
- pain points : fréquence décroissante, 3 maximum ;
- concurrence : compte étalon + top 3 de la carte de priorisation ;
- chaîne : nœuds à plus forte captation / criticité, 3 maximum ;
- message sectoriel : repris tel quel d’E4.

### Ce que le Digest ne fait pas

- il ne génère pas une nouvelle analyse ;
- il ne modifie pas la connaissance ;
- il ne devient pas une table ;
- il ne remplace pas BI.

---

## 6.3 `AccountSectorPerspective` — perspective sectorielle du compte

### Destination

Cockpit Intelligence > **Secteur**.

### Finalité

> **Expliquer le segment depuis le point de vue du compte consulté.**

Contrat conceptuel :

```ts
type AccountSectorPerspective = {
  segment: {
    id: string
    name: string
    snapshotDate: string
  }

  essentialContext: {
    definition: string
    keyTheses: SectorThesis[]
  }

  whyNow: {
    relevantDynamics: SectorEvent[]
    relevantRegulatoryItems: RegulatoryItem[]
    relevantTechFronts: TechFront[]
  }

  competitivePosition: AccountCompetitiveContext | null

  valueChainPosition: {
    node: ValueChainNode | null
    dependencies: string[]
  }

  accountInterpretation: {
    positioning: string | null
    angleEntree: string | null
    commercialTranslation: string | null
  }

  provenance: {
    runId: string
    snapshotDate: string
    documentId: string | null
  }
}
```

### Sources

```text
E4
+ E5 du compte
+ E6
+ account_facts courants
```

### Règle de focalisation

Le compte courant est le sujet.

Les concurrents ne sont qu’un contexte.

La Master Study n’est pas affichée « en plus » de la fiche compte : elle sert à expliquer le compte.

### ROBERTET

Le `competitiveContext` déjà cadré en GATE A devient une sous-brique directe :

```text
AccountSectorPerspective
├─ essentialContext
├─ whyNow
├─ competitiveContext   ← Gate A conservée
├─ valueChainPosition
└─ accountInterpretation
```

Le travail GATE A n’est donc pas perdu. Il est replacé au bon niveau.

---

## 6.4 `SectorPlaybookProjection` — conversion en action

### Destination

Prospection > Playbook, et contexte de Cockpit > Stratégie.

### Finalité

> **Transformer la connaissance en discours commercial.**

Consomme principalement :

```text
S9 → S13
+ C1/C3
+ réglementation pertinente
+ offers
```

Cette projection ne doit pas être stockée comme une nouvelle vérité.

Le playbook reste :

> **calculé, jamais recopié.**

---

# 7. Frontières fonctionnelles du Cockpit

Le fait que Cockpit > Secteur soit une synthèse de la Master Study ne signifie pas qu’il doit absorber tous les blocs des autres onglets.

## 7.1 Secteur

Question :

> « Dans quel environnement ce compte évolue-t-il, où se situe-t-il, et qu’est-ce qui est particulièrement important pour lui ? »

Peut afficher :

- définition courte du segment ;
- 2–3 thèses ;
- 1–3 changements de contexte ;
- position concurrentielle ;
- position chaîne de valeur ;
- un angle commercial ;
- quelques points de vigilance contextuels.

## 7.2 Enjeux

Reste propriétaire du détail :

- enjeux du compte ;
- conséquences réglementaires ;
- criticité ;
- urgence ;
- preuves.

Secteur peut signaler « IFRA 52 est structurant pour ce compte », mais Enjeux porte le détail exploitable.

## 7.3 Stratégie

Reste propriétaire du détail :

- personas ;
- objections ;
- arguments ROI ;
- messages ;
- pitchs ;
- angles d’offres.

Secteur peut présenter **l’angle d’entrée du compte**, mais ne doit pas recopier tout le playbook.

### Principe

> **Une synthèse peut citer un bloc voisin ; elle ne doit pas refaire l’écran voisin.**

---

# 8. Stratégie d’ingestion retenue

## 8.1 Une seule ingestion logique par Master Study

La chaîne cible devient :

```text
RUN MASTER STUDY
E0 → E1 → E2 → E3 → E4 → E5 → E6 → gates
                         │
                         ▼
                  ingestion canonique
                         │
                         ▼
               connaissance Supabase
                         │
                         ▼
                   projections
```

Il n’existe pas :

```text
ingestion BI
ingestion Cockpit
ingestion Digest
```

## 8.2 `ai_intelligence_runs` devient le registre d’exécution

Aucune table `master_study_runs` n’est nécessaire.

Le schéma existant sait déjà porter :

- `run_type` text ;
- `primary_entity_type` ;
- `primary_entity_id` ;
- `input_snapshot` ;
- `config` ;
- statuts et timestamps.

Convention proposée :

```text
run_type = master_study
primary_entity_type = sector
primary_entity_id = <segment_id>
```

Dans `input_snapshot` / `config` :

```json
{
  "segment_slug": "...",
  "snapshot_date": "2026-08-14",
  "schemas": {
    "sector_knowledge": "1.x",
    "competitive_map": "1.x",
    "value_chain": "1.x"
  },
  "gates": {
    "g0": "go",
    "g1": "pass",
    "g2": "pass",
    "g3": "pass"
  },
  "verdict": "production_ready"
}
```

### Pourquoi c’est mieux

- aucune table supplémentaire ;
- réutilise le registre existant ;
- les coûts, erreurs, audit et historique restent dans l’infrastructure intelligence ;
- le `run_id` devient la clé de cohérence entre E4, E5, E6 et le document.

---

# 9. Provenance et versionnement — correction indispensable

## 9.1 Principe

Chaque objet matérialisé par une Master Study doit pouvoir répondre à :

```text
qui m’a produit ?
quand ?
dans quel snapshot ?
avec quel document source ?
```

## 9.2 Extension minimale recommandée

Ajouter de manière additive, là où la donnée est réellement possédée par un run :

```text
source_run_id uuid NULL
study_snapshot_date date NULL
```

aux tables principales suivantes :

```text
sector_intelligence
sector_events
sector_pain_points
sector_regulatory_items
value_chain_nodes
```

Et ajouter :

```text
source_run_id
```

à `competitive_map_entries`, qui possède déjà `study_snapshot_date`.

### Pourquoi ne pas ajouter ces colonnes partout

- `value_chain_actors` et `value_chain_links` peuvent hériter du run via leur `node_id` ;
- les faits compte possèdent déjà leur propre provenance ;
- il faut estampiller le niveau où l’ownership est clair, pas répéter le même UUID dans tout le graphe.

## 9.3 Document source

Le `documentId` peut être retrouvé via le run et le segment.

`source_document_id` peut être ajouté ultérieurement aux objets qui nécessitent un accès direct ultra-fréquent, mais il n’est pas obligatoire partout pour la V1.

## 9.4 Rollback

Pour les tables d’items :

```text
supprimer/remplacer les lignes du source_run_id concerné
```

Pour `sector_intelligence`, qui est aussi l’entité de taxonomie et ne doit pas être versionnée en plusieurs lignes :

```text
rejouer la matérialisation du dernier run accepté précédent
depuis le document/version archivé
```

On garde ainsi :

- une seule ligne taxonomique par segment ;
- un historique documentaire complet ;
- une matérialisation courante explicite.

---

# 10. Ne plus utiliser les migrations de schéma comme importeur métier récurrent

E7 recommande aujourd’hui une « migration idempotente » pour E4.

Cette solution est acceptable pour initialiser un pilote, mais elle est mauvaise comme régime permanent.

## 10.1 Pourquoi

Une migration Supabase doit principalement répondre à :

> « Comment le schéma évolue-t-il ? »

Une Master Study répond à :

> « Quelle nouvelle connaissance métier est acceptée ? »

Mélanger les deux entraîne :

- historique des migrations pollué par du contenu ;
- difficulté de rollback métier ;
- rejeu opérationnel confondu avec évolution de schéma ;
- nouvelle migration à chaque étude ;
- couplage inutile entre contenu et déploiement DB.

## 10.2 Solution retenue

Créer un importeur déterministe versionné dans le repo, par exemple :

```text
scripts/master-study/materialize.ts
```

ou un module équivalent.

Responsabilités :

1. charger le run ;
2. valider les JSON contre les contrats ;
3. vérifier le verdict des gates ;
4. créer / rattacher le `ai_intelligence_run`;
5. archiver le document Master Study ;
6. matérialiser E3/E4/E6 ;
7. transmettre le même `source_run_id` à E5 ImportWizard ;
8. exécuter la recette ;
9. proposer un `--dry-run`.

### Les migrations restent utilisées pour

- ajouter une colonne ;
- modifier une contrainte ;
- ajouter une valeur d’enum ;
- créer une fonction/RPC technique.

### Elles ne servent plus à

- importer la connaissance récurrente d’un nouveau segment.

---

# 11. E5 reste humain — et c’est cohérent

La cartographie concurrentielle a une particularité :

```text
resolved | ambiguous | not_found
```

La résolution d’entité peut nécessiter un jugement humain.

Il faut donc conserver :

```text
E5 JSON
→ CompetitiveMapImportWizard
→ arbitrage
→ competitive_map_entries
```

Mais l’import doit recevoir le même :

```text
source_run_id
study_snapshot_date
```

que le reste de la Master Study.

Ainsi, une étape humaine n’interrompt pas la cohérence du run.

---

# 12. Cohérence de snapshot : règle non négociable

Une projection ne doit jamais combiner silencieusement :

```text
E4 août
+
E5 novembre
+
E6 février
```

comme s’il s’agissait d’une seule étude.

## 12.1 Résolveur de version accepté

Une fonction métier doit résoudre le run de référence :

```text
getAcceptedMasterStudyRun(segmentId)
```

Elle retourne le dernier run :

- gates acceptées ;
- verdict exploitable ;
- non rejeté ;
- identifié par `snapshot_date`.

Puis les loaders demandent en priorité les objets liés à ce run.

## 12.2 Dégradation explicite

Un run peut ne pas encore avoir E6.

Dans ce cas :

```text
E4 présent
E5 présent
E6 absent
```

est un état valide, affiché comme tel.

Il ne faut pas injecter silencieusement une vieille E6 dans le snapshot courant.

Une donnée ancienne peut être proposée en fallback **uniquement si son millésime est visible et si la règle métier l’autorise explicitement**.

---

# 13. Héritage macro/segment : distinguer absence et inconnu explicite

## 13.1 Le problème

```text
segment.market_size = NULL
```

peut signifier :

A. le segment n’a jamais été étudié ;  
B. le segment a été étudié et la taille n’est pas publiée.

Ces deux états ne peuvent pas produire la même résolution.

## 13.2 Solution V1 pragmatique

Faire évoluer le contrat E4 pour porter explicitement l’état de la mesure :

```json
{
  "marche": {
    "taille_eur_bn": null,
    "taille_statut": "not_published",
    "croissance_pct": null,
    "croissance_statut": "not_published"
  }
}
```

Valeurs possibles :

```text
published
not_published
not_applicable
unknown
```

Puis l’importeur matérialise un verrou léger dans le JSONB `caveats`, sans nouvelle colonne V1 :

```json
{
  "resolution_overrides": {
    "market_size_eur_bn": "explicit_unknown",
    "market_growth_pct": "explicit_unknown"
  }
}
```

La vue de résolution applique :

```text
NULL + aucun override
→ héritage autorisé

NULL + explicit_unknown
→ héritage interdit
```

### Pourquoi cette solution

- elle résout immédiatement le cas Parfumerie ;
- elle n’ajoute pas une colonne par champ ;
- elle ne crée pas de table ;
- elle reste machine-readable ;
- elle conserve la logique d’héritage existante.

---

# 14. Preuves et `intelligence_source_links`

## 14.1 Drift à corriger

Le live n’autorise actuellement que :

```text
proposal | fact | signal
```

dans `intelligence_source_links.object_type`.

La doctrine sectorielle a besoin de plus.

## 14.2 Solution retenue

Étendre l’allowlist existante, plutôt que créer une nouvelle table générique.

Cibles à prévoir selon usage :

```text
sector_intelligence
sector_event
sector_pain_point
sector_regulatory_item
competitive_map_entry
value_chain_node
```

### Pourquoi

- réutilise la table existante ;
- permet « ouvrir la preuve » depuis BI ;
- simplifie l’audit ;
- rapproche enfin le schéma live de S14.

### Limite V1

Il n’est pas obligatoire de peupler toutes les relations au premier lot.

La priorité est :

1. source du document Master Study ;
2. source des items réglementaires ;
3. source des faits décisifs affichés ;
4. extension progressive aux autres objets.

---

# 15. Orienter la Master Study vers un compte sans LLM

## 15.1 V1 — composition déterministe

La V1 sélectionne :

- contexte sectoriel prioritaire ;
- données E5 du compte ;
- position concurrentielle ;
- position chaîne de valeur ;
- triggers compte ;
- quelques items S pertinents ;
- angle d’entrée E5.

Aucune nouvelle interprétation n’est nécessaire.

## 15.2 Optimisation structurante — références croisées E4 ↔ E5 ↔ E6

Le contrat E4 donne déjà un `id` aux thèses.

Il faut progressivement généraliser des IDs stables aux blocs qui doivent être cités :

```text
theses
fronts_technologiques
risques_opportunites
pain_points
chronologie
```

Puis E5 peut porter, par compte, un objet léger :

```json
{
  "sector_relevance_refs": {
    "thesis_ids": [3, 4],
    "tech_front_ids": ["TF-IA", "TF-REG-DATA"],
    "risk_ids": ["R-IFRA"],
    "pain_point_ids": ["PP-TRACEABILITY"],
    "value_chain_keys": ["formulation", "regulatory"]
  }
}
```

### Ce que cela change

`AccountSectorPerspective` ne demande plus :

> « Quels blocs semblent parler de ROBERTET ? »

Il lit :

> « Quels blocs le run E5 a explicitement reliés à ROBERTET ? »

C’est :

- déterministe ;
- traçable ;
- plus précis ;
- sans fuzzy matching ;
- sans LLM à la lecture.

## 15.3 Déploiement progressif

Cette évolution n’est pas bloquante pour le pilote.

Fallback V1 :

- thèses globales prioritaires ;
- angle E5 ;
- triggers E5 ;
- position compte ;
- réglementation prioritaire du segment.

Les références croisées deviennent ensuite une optimisation de qualité.

---

# 16. Ce que chaque destination consomme réellement

| Source Master Study | BI | Études sectorielles | Cockpit > Secteur | Prospection | Knowledge |
|---|---|---|---|---|---|
| **E2 — socle/réglementaire** | exhaustif dans Calendrier | échéances clés | contexte pertinent seulement | fenêtres / why now | preuve |
| **E3 — sources** | drill-down | compteur + réserves | provenance légère | grounding | **principal** |
| **E4 — étude sectorielle** | **exhaustif** | **synthèse** | **sélection orientée compte** | messages / contexte | document |
| **E5 — comptes/cartographie** | **exhaustif** | benchmark + top acteurs | **compte courant + pairs** | priorisation | document |
| **E6 — chaîne de valeur** | **exhaustif** | maillons clés | **position du compte** | contexte | document/export |
| **account_facts courants** | enrichissement compte | non prioritaire | contexte compte | grounding | preuve |
| **offers** | fit analytique | non prioritaire | implication KREDO légère | **principal** | référentiel |

---

# 17. Pourquoi cette architecture est meilleure

## 17.1 Elle évite les doubles vérités

Une correction de thèse ou d’échéance est faite dans le canon.

Toutes les surfaces la relisent.

## 17.2 Elle respecte la finalité des pages

BI n’est pas appauvrie pour ressembler au Cockpit.

Le Cockpit n’est pas noyé dans l’exhaustivité de BI.

## 17.3 Elle rend le module Études sectorielles réellement utile

Le Digest devient une vue de lecture rapide, et non une ancienne fiche sectorielle parallèle.

## 17.4 Elle réduit le besoin de génération IA

La Master Study a déjà fait le travail analytique lourd.

L’application doit exploiter cette valeur au lieu de redemander au LLM de la résumer à chaque clic.

## 17.5 Elle conserve la preuve

Le document source, le run et les sources restent accessibles.

## 17.6 Elle est extensible sans être sur-ingénierée

Ajouter demain une nouvelle surface revient à créer un nouveau presenter/read model.

Pas une nouvelle ingestion.

## 17.7 Elle rend les tests possibles

Une projection pure peut être testée sur un snapshot fixé.

---

# 18. Stratégie de cache et performance

La V1 ne doit pas pré-matérialiser des dizaines de JSON de synthèse.

## Niveau 1 — suffisant au départ

- loaders `server-only` ;
- `cache()` / memoization par requête ;
- requêtes spécialisées ;
- limitation stricte des champs envoyés au client.

## Niveau 2 — si la mesure le justifie

Cache persistant par :

```text
segmentId + acceptedRunId
```

Le changement de run invalide naturellement le cache.

## À éviter

- table `sector_digest_cache` ;
- table `account_sector_perspectives` ;
- résumé persistant par compte ;
- duplication Desktop/Mobile de la donnée.

La séparation Desktop/Mobile doit être une séparation de **présentation**, pas de vérité.

---

# 19. Tests architecturaux obligatoires

## 19.1 Ingestion

- un run rejeté n’est jamais matérialisé comme courant ;
- un rejeu du même run est idempotent ;
- E5 humain reste rattaché au même run ;
- les lignes d’un ancien run ne contaminent pas le courant ;
- une erreur d’étape ne produit pas un mélange invisible.

## 19.2 Résolution segment/macro

- absence segment → héritage macro autorisé ;
- `explicit_unknown` → héritage bloqué ;
- la provenance `segment | macro` reste identifiable.

## 19.3 Digest

Pour un même run :

```text
input canonique identique
→ digest identique
```

Aucun LLM.

## 19.4 Perspective compte

- pas de donnée d’un autre segment ;
- pas de donnée d’un autre snapshot ;
- compte courant correctement identifié ;
- absence E6 gérée sans erreur ;
- `appetence_provisoire` conservé ;
- un champ `NULL` n’est jamais inventé ;
- les peers restent secondaires.

## 19.5 Cohérence inter-surfaces

Une donnée canonique affichée à plusieurs endroits doit être identique.

Exemple :

```text
IFRA 52
```

ne peut pas avoir deux dates, deux statuts ou deux formulations factuelles contradictoires entre BI, Digest et Cockpit.

---

# 20. Séquence d’implémentation recommandée

## Lot D0 — Ratifier cette architecture

Objectif :

- figer les principes ;
- amender ensuite `01-CARTE`, `02-DISTRIBUTION` et E7 sur les points contradictoires.

Aucun code.

## Lot D1 — Provenance + contrat d’ingestion

Livrer :

- `source_run_id` / `study_snapshot_date` minimalement nécessaires ;
- correction de l’allowlist `intelligence_source_links` ;
- règle `explicit_unknown` ;
- registre de run Master Study ;
- importeur déterministe en `dry-run`.

## Lot D2 — Ingestion E4 Parfumerie

Pilote :

```text
seg-parfumerie-compositions-b2b
```

Objectif :

- matérialiser E4 ;
- archiver le document `master_study` ;
- conserver les 8 entrées E5 existantes ;
- vérifier que les deux partagent le même snapshot/run logique.

## Lot D3 — `MasterStudyDigest`

Créer le presenter et migrer `SectorStudiesModal`.

Objectif :

> valider que la connaissance canonique permet une lecture utile de 2–5 minutes.

## Lot R0 élargi — `AccountSectorPerspective` ROBERTET

Conserver la Gate A :

```text
competitiveContext
```

et l’intégrer dans :

```text
AccountSectorPerspective
```

avec E4 et E6 si disponible.

## GATE B — Product/UI Design

Seulement à ce moment.

Le design doit porter la **Perspective sectorielle du compte**, pas uniquement la matrice concurrentielle.

## Lot BI — lecture analytique exhaustive

Brancher progressivement :

- Étude sectorielle E4 ;
- Calendrier S7 ;
- environnement E5 déjà avancé ;
- chaîne E6.

## Lot Prospection — projections d’action

Playbook, fenêtres et brief lisent les mêmes blocs canoniques.

---

# 21. Ce qu’il faut suspendre immédiatement

Tant que D1/D2 ne sont pas cadrés :

> **Ne pas valider le redesign final de Cockpit > Secteur.**

La GATE B actuelle était construite autour de la seule cartographie.

Or l’écran cible doit exprimer :

```text
perspective sectorielle du compte
=
E4 synthétisé
+ E5 focalisé
+ E6 focalisé
+ faits compte
```

Dessiner l’écran définitif avant d’avoir ce contrat provoquerait très probablement un second redesign.

---

# 22. Décisions normatives proposées

| ID | Décision |
|---|---|
| **MS-1** | Une Master Study est un **corpus versionné unique** ; aucune destination ne possède sa propre ingestion. |
| **MS-2** | Supabase porte la **connaissance canonique normalisée** ; le document Master Study reste l’artefact historique et probant. |
| **MS-3** | Business Intelligence consomme la Master Study **de manière exhaustive mais via des loaders spécialisés**, pas via un mega-workspace monolithique. |
| **MS-4** | Le module Études sectorielles consomme un **`MasterStudyDigest` calculé**, non persisté en V1. |
| **MS-5** | Cockpit > Secteur consomme une **`AccountSectorPerspective`** : synthèse de la Master Study depuis le point de vue du compte. |
| **MS-6** | La GATE A `competitiveContext` est conservée comme sous-brique de `AccountSectorPerspective`. |
| **MS-7** | Prospection consomme des **produits dérivés** ; le playbook n’est pas une nouvelle vérité stockée. |
| **MS-8** | Aucun LLM n’est requis à la lecture pour produire Digest ou Perspective V1. |
| **MS-9** | `ai_intelligence_runs` est le registre des runs Master Study ; **aucune table `master_study_runs`** n’est créée. |
| **MS-10** | Les objets matérialisés par une étude portent un `source_run_id` et un snapshot là où leur ownership l’exige. |
| **MS-11** | Une projection ne mélange jamais silencieusement plusieurs snapshots. |
| **MS-12** | `NULL` ne vaut pas automatiquement « hériter » : un inconnu explicite bloque l’héritage macro. |
| **MS-13** | Les migrations Supabase servent au schéma ; l’ingestion récurrente de contenu passe par un importeur métier versionné. |
| **MS-14** | E5 conserve son arbitrage humain, mais il partage le même run/snapshot que le reste de l’étude. |
| **MS-15** | La relation source → connaissance sectorielle réutilise `intelligence_source_links`, dont l’allowlist est étendue au lieu de créer une table parallèle. |
| **MS-16** | Les contrats E4/E5 évoluent progressivement vers des **références croisées stables**, afin de rendre la perspective compte déterministe. |
| **MS-17** | Le design final de Cockpit > Secteur ne reprend qu’après matérialisation E4 et stabilisation du contrat `AccountSectorPerspective`. |

---

# 23. Critères de réussite du chantier

La solution est réussie si, pour ROBERTET :

## Business Intelligence

Un utilisateur peut explorer :

- le marché et ses thèses ;
- les modèles économiques ;
- les fronts technologiques ;
- les risques ;
- les pain points ;
- la réglementation ;
- les huit acteurs ;
- la chaîne de valeur ;

sans perdre la provenance.

## Études sectorielles

Le même utilisateur peut comprendre le segment en quelques minutes sans ouvrir chaque onglet BI.

## Cockpit > Secteur

En moins de 90 secondes, il peut répondre :

1. Dans quel segment ROBERTET évolue-t-il ?
2. Quelles forces de contexte comptent réellement maintenant ?
3. Où ROBERTET se situe-t-il face aux autres acteurs ?
4. Où se situe-t-il dans la chaîne de valeur ?
5. Pourquoi ce compte est-il intéressant pour KREDO ?
6. Quel angle faut-il garder en tête ?
7. De quelle étude et de quel snapshot cela vient-il ?

## Prospection

Les discours et actions sont dérivés des mêmes blocs, sans réécriture manuelle de la connaissance.

## Knowledge

Un clic permet de retrouver :

- la Master Study ;
- sa version ;
- son run ;
- ses sources.

---

# 24. Formule de synthèse

> **La Master Study est le corpus versionné.**  
> **Supabase en matérialise la connaissance canonique.**  
> **Business Intelligence l’explore exhaustivement.**  
> **Études sectorielles la résume.**  
> **Le Cockpit Secteur la regarde depuis le compte.**  
> **Prospection la transforme en action.**  
> **Knowledge Hub en conserve la preuve.**
>
> Une seule vérité. Plusieurs lectures. Chaque lecture répond à une question différente.

---

# 25. Conséquences attendues

## Positives

- disparition de la duplication de connaissance entre écrans ;
- meilleure exploitation de chaque Master Study produite ;
- Cockpit plus pertinent sans devenir plus lourd ;
- BI plus riche sans imposer sa profondeur partout ;
- Digest réellement utile ;
- provenance et versioning plus solides ;
- meilleure testabilité ;
- beaucoup moins de génération IA inutile ;
- ajout futur de nouveaux consommateurs beaucoup moins coûteux.

## Coûts assumés

- une petite migration de provenance ;
- une correction du contrat de sources ;
- un importeur métier à écrire ;
- quelques évolutions de schéma JSON E4/E5 ;
- refactoring du read model de `SectorStudiesModal`.

Ces coûts sont structurels mais limités. Ils remplacent une dette beaucoup plus coûteuse : plusieurs versions persistées de la même étude.

---

# 26. Points à ratifier avant passage en statut « Accepté »

Les principes MS-1→MS-17 peuvent être adoptés en bloc.

Trois détails d’implémentation doivent néanmoins être confirmés lors du Lot D1 :

1. **Forme exacte de l’importeur**
   - CLI TypeScript direct ;
   - ou CLI TypeScript + RPC transactionnelle légère.
   
   Recommandation : commencer par le chemin le plus simple permettant `dry-run`, idempotence et tests.

2. **Étendue initiale de `intelligence_source_links`**
   - ne créer que les types nécessaires au pilote ;
   - étendre ensuite à mesure des usages.
   
   Recommandation : privilégier le pilote, ne pas préouvrir tous les types.

3. **Références croisées E4/E5**
   - ne pas bloquer ROBERTET dessus ;
   - les introduire après validation du premier `AccountSectorPerspective`.
   
   Recommandation : fallback déterministe en V1, références explicites en V1.1.

Ces trois arbitrages ne remettent pas en cause l’architecture retenue.

---

## Sources de cadrage utilisées pour cette ADR

### Références Git

- `docs/MASTER-STUDY/README.md`
- `docs/MASTER-STUDY/01-CARTE-DE-LA-CONNAISSANCE.md`
- `docs/MASTER-STUDY/02-DISTRIBUTION-DANS-KREDO.md`
- `docs/MASTER-STUDY/10-ETAPE-E7-GATES-ET-INGESTION.md`
- `docs/MASTER-STUDY/schemas/sector-knowledge.schema.json`
- `docs/MASTER-STUDY/schemas/competitive-map.schema.json`
- `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/04-secteur.md`
- `src/features/business-intelligence/studies/SectorStudiesModal.tsx`
- Gate A du chantier ROBERTET — architecture `competitiveContext`

### Audit Supabase live

État contrôlé le **2026-08-20** :

- `sector_intelligence`
- `sector_events`
- `sector_pain_points`
- `sector_regulatory_items`
- `competitive_map_entries`
- `value_chain_nodes`
- `intelligence_sources`
- `intelligence_source_links`
- `intelligence_documents`
- `intelligence_document_versions`
- `ai_intelligence_runs`

Les constats « live » de cette ADR doivent être réévalués si le schéma évolue. Les décisions MS-1→MS-17, elles, décrivent la doctrine cible.
