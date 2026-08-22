# HANDOFF FINAL — BUSINESS INTELLIGENCE MONO-SEGMENT
## KREDO — Lots 1 à 4 clôturés

Date de clôture : 22/08/2026
Projet : KREDO
Repo : `guillaumekachanine-dev/kredo_sales_app`
Branche de travail : état local validé, sans commit/push/déploiement réalisé dans le cadre du chantier

Stack :
- Next.js 15 — App Router
- React
- Tailwind CSS
- Supabase PostgreSQL / RLS
- n8n pour les traitements asynchrones
- architecture Adaptive Design Desktop / Mobile

---

# 1. STATUT GLOBAL

Le chantier de transformation de Business Intelligence en workspace mono-segment est TERMINÉ.

Lots réalisés :

- LOT 1 — Socle mono-segment Data / URL : TERMINÉ
- LOT 2 — Shell / Landing / Navigation / Accueil : TERMINÉ
- LOT 3 — 5 chapitres métier : TERMINÉ
- LOT 4 — Études / Playbook / Battle Cards / Analyse approfondie / Documentation : TERMINÉ

Business Intelligence fonctionne désormais selon le principe canonique :

1 segment actif
→ 1 workspace
→ 6 chapitres
→ plusieurs projections de la même connaissance
→ modules transverses partageant exactement le même contexte

Il n’existe plus de sélection de segment indépendante par chapitre ou module.

---

# 2. URL CANONIQUE

Route :

`/intelligence?segment=<uuid>&tab=<chapter>`

`segment` est l’unique source de vérité du segment actif.

Valeurs canoniques de `tab` :

- `home`
- `sector-analysis`
- `competitive-environment`
- `regulatory-calendar`
- `value-chain`
- `sector-news`

Compatibilité historique :

`competitiveSegment`

reste accepté temporairement en lecture et est canonicalisé vers `segment`.

Règles absolues :

- `segment` est prioritaire sur tout alias ;
- aucun fallback vers le premier segment disponible ;
- aucun fallback vers un autre segment lorsqu’une ressource manque ;
- un segment invalide ou un macro-secteur ramène vers la landing avec état explicite ;
- changer de chapitre conserve toujours `segment` ;
- changer de segment conserve le chapitre courant.

---

# 3. ARCHITECTURE FINALE

Structure fonctionnelle :

/intelligence
│
├── Aucun segment actif
│   └── Catalogue léger macro → segments
│
└── segment=<uuid>
    │
    ├── Accueil
    ├── Analyse sectorielle
    ├── Environnement concurrentiel
    ├── Calendrier réglementaire
    ├── Chaîne de valeur
    ├── Actualités sectorielles
    │   └── Analyse approfondie / manual_custom
    │
    └── Modules transverses
        ├── Étude Light
        ├── Playbook
        │   └── Battle Cards
        └── CRM Launcher

Un seul `BusinessIntelligenceSegmentWorkspace` alimente l’ensemble du workspace.

---

# 4. INVARIANTS D’ARCHITECTURE

Ces règles sont désormais CANONIQUES.

Ne pas réintroduire :

- deuxième `activeSegment` côté client ;
- picker local de segment dans un chapitre ;
- picker local dans Études ou Playbook ;
- Zustand BI ;
- Context global BI ;
- localStorage pour le segment ;
- fallback `catalog[0]` ;
- chargement portefeuille-wide pour alimenter BI ;
- chargement de tous les segments depuis un chapitre ;
- reconstruction locale d’une Master Study ;
- copie persistée d’une synthèse BI ;
- table dédiée Battle Cards ;
- génération LLM à la lecture ;
- nouveau workflow n8n pour une projection déjà disponible ;
- composant Desktop lourd monté puis masqué sur Mobile.

L’URL et le payload serveur restent la source de vérité.

---

# 5. LOT 1 — SOCLE DATA / URL

## 5.1 Résolution de route

Principaux fichiers :

`src/app/(app)/intelligence/page.tsx`

`src/features/business-intelligence/data/resolve-business-intelligence-route.ts`

La résolution de route distingue :

- catalogue ;
- workspace ;
- redirection legacy ;
- route invalide.

Le segment est validé comme véritable entrée de niveau `segment` avant tout chargement métier.

---

## 5.2 Deux chemins exclusifs

Sans segment actif :

`getBusinessIntelligenceCatalog()`

Avec segment valide :

`getBusinessIntelligenceSegmentWorkspace(segmentId)`

La page ne charge pas simultanément catalogue complet et workspace complet.

---

## 5.3 Catalogue léger

Loader principal :

`get-business-intelligence-catalog.ts`

Le catalogue fournit notamment :

- macro-secteurs ;
- segments ;
- nombre de comptes ;
- statut taxonomique ;
- disponibilité des ressources ;
- origine / résolution lorsqu’elles existent.

Ressources suivies :

- Étude
- Playbook
- Concurrence
- Réglementation
- Chaîne de valeur
- Actualités

Aucun pourcentage arbitraire de complétude.

Les comptes `depth_level='mapped'` sont exclus des statistiques portefeuille.

---

## 5.4 Workspace

Loader principal :

`get-business-intelligence-segment-workspace.ts`

Contrat central :

`BusinessIntelligenceSegmentWorkspace`

Projections principales :

- `segment`
- `knowledge`
- `portfolio`
- `competitiveMap`
- `valueChain`
- `news`
- `coverage`

Toutes les requêtes sont limitées :

- au segment actif ;
- à ses comptes ;
- ou aux IDs issus des projections sélectionnées.

---

## 5.5 Master Study

Source canonique :

`SectorKnowledgeReadModel`

Loader :

`getSectorKnowledgeReadModel(segmentId)`

Vues canoniques :

- `v_sector_knowledge_resolved`
- `v_sector_knowledge_items`

Ne jamais reconstruire cette connaissance en relisant les tables sectorielles brutes depuis BI.

La résolution conserve les niveaux / statuts tels que :

- segment ;
- macro ;
- locked ;
- estimated.

---

## 5.6 Concurrence

La cartographie est strictement segment-scoped.

Aucun fallback vers :

- le premier segment ;
- une autre cartographie ;
- un autre compte.

Absence de cartographie :

→ `null` / empty state explicite.

---

## 5.7 Chaîne de valeur

Résolution centrale :

segment exact
→ sinon macro parent

La provenance est exposée explicitement.

Les graphes segment et macro ne sont jamais fusionnés.

---

## 5.8 Validations Lot 1

- Typecheck : OK
- Tests : 174 fichiers / 1 714 tests
- Server boundary : OK
- Lint ciblé : OK
- Build production : OK

Aucune migration Supabase.
Aucun changement n8n.

---

# 6. LOT 2 — SHELL / LANDING / NAVIGATION / ACCUEIL

## 6.1 Adaptive Design

Deux branches réellement distinctes :

- Desktop
- Mobile

Sélection via `getDashboardDevice`.

Un seul rendu est monté côté serveur.

Principaux shells :

`BusinessIntelligenceDesktop.tsx`

`BusinessIntelligenceMobile.tsx`

---

## 6.2 Landing

Sans segment :

Desktop :
- macros structurées ;
- une seule macro ouverte ;
- segments ;
- compteurs ;
- couverture factuelle.

Mobile :
- liste tactile ;
- sélection macro ;
- segments via `AppDrawer`.

La sélection crée uniquement :

`pendingSegment`

Elle n’active jamais immédiatement le segment.

---

## 6.3 Confirmation

Flux :

segment choisi
→ pendingSegment
→ confirmation
→ navigation
→ Server Component
→ nouveau workspace

Annuler :

`pendingSegment = null`

sans modifier :

- URL ;
- workspace ;
- segment actif ;
- chapitre.

---

## 6.4 Changer de segment

L’action est disponible depuis le workspace actif.

Le catalogue est chargé à la demande via :

`load-business-intelligence-catalog.ts`

Server Action existante.

L’ancien workspace reste affiché pendant la transition.

Un voile `aria-busy` neutralise les interactions incohérentes.

Le nouveau nom de segment n’est jamais affiché avant le commit du nouveau payload serveur.

---

## 6.5 Navigation

Desktop :

adaptation de `BusinessIntelligenceLocalNavigation`.

Mobile :

rail horizontal tactile.

Six chapitres canoniques.

Un chapitre sans données reste sélectionné et affiche un empty state.

---

## 6.6 Accueil

Composants dédiés Desktop / Mobile.

Il affiche uniquement les données réellement disponibles :

- identité ;
- macro ;
- statut ;
- nombre de comptes ;
- fraîcheur ;
- synthèse canonique ;
- KPI disponibles ;
- couverture analytique.

Aucune nouvelle synthèse LLM.

---

## 6.7 Couverture analytique

Ordre :

Étude
→ Concurrence
→ Réglementation
→ Chaîne de valeur
→ Actualités
→ Playbook

Informations distinctes :

- disponibilité ;
- origine ;
- résolution.

Aucun score ou pourcentage artificiel.

---

## 6.8 Validations Lot 2

- Typecheck : OK
- Tests : 177 fichiers / 1 724 tests
- Server boundary : OK
- ESLint ciblé : OK
- Build : OK
- `git diff --check` : OK

---

# 7. LOT 3 — CHAPITRES MÉTIER

Les 5 chapitres consomment désormais exclusivement le workspace mono-segment.

---

# 8. ANALYSE SECTORIELLE

Fichiers créés :

`SectorAnalysisChapterDesktop.tsx`

`SectorAnalysisChapterMobile.tsx`

Source :

`workspace.knowledge`

soit le `SectorKnowledgeReadModel` canonique.

Contenus utilisés selon disponibilité :

- description ;
- taille de marché ;
- croissance ;
- attractivité ;
- maturité numérique ;
- TJM ;
- pain points ;
- événements ;
- acteurs PACA ;
- acteurs nationaux ;
- limites / caveats.

Desktop :

- bandeau de métriques ;
- synthèse ;
- pain points ;
- événements ;
- acteurs ;
- sources / limites.

Mobile :

- synthèse compacte ;
- indicateurs clés ;
- sections progressives tactiles.

Les sections vides sont omises.

La provenance est conservée.

---

# 9. ENVIRONNEMENT CONCURRENTIEL

Principaux fichiers adaptés :

`CompetitiveMapToolbar.tsx`

`CompetitiveEnvironmentWorkspace.tsx`

`CompetitiveEnvironmentMobile.tsx`

Suppression définitive du sélecteur local de segment.

Desktop :

- matrice interactive ;
- liste d’acteurs ;
- sélection synchronisée ;
- fiche acteur.

Mobile :

- matrice compacte adaptée ;
- liste ;
- fiche progressive.

Invariants :

- `mapped` hors statistiques portefeuille ;
- appétence /35 conservée ;
- `account_score_current` reste distinct ;
- aucun score composite inventé ;
- aucun fallback vers un autre segment.

---

# 10. CALENDRIER RÉGLEMENTAIRE

Fichiers créés :

`RegulatoryCalendarChapterDesktop.tsx`

`RegulatoryCalendarChapterMobile.tsx`

Source exclusive :

`workspace.knowledge.regulatory`

Le chapitre ne mélange plus :

- news ;
- événements marché ;
- opportunités commerciales ;
- fenêtres CRM.

Desktop :

- timeline ;
- inventaire ;
- détail sélectionné.

Mobile :

- chronologie verticale ;
- détail tactile.

Le calendrier est désormais strictement réglementaire.

---

# 11. CHAÎNE DE VALEUR

Source :

`workspace.valueChain`

Le composant React ne résout pas le fallback.

Il consomme la résolution déjà effectuée :

segment
→ macro

Principaux composants historiques conservés/adaptés :

- `SectorValueDesktop`
- `SectorMapMobile`
- `SectorMapContextSelector`

Le sélecteur de secteur historique a été neutralisé en contexte BI mono-segment.

Le focus compte reste disponible.

---

# 12. ACTUALITÉS SECTORIELLES

Fichier principal :

`SectorNewsChapter.tsx`

Source :

`workspace.news`

La bibliothèque utilise :

- actualités ;
- événements marché pertinents ;
- signaux actionnables du segment.

Filtres simples :

- type ;
- période.

Les éléments réglementaires restent séparés du calendrier.

Le bruit legacy `company_context` est exclu selon le contrat du workspace.

---

# 13. VALIDATIONS LOT 3

- Typecheck : OK
- Tests : 178 fichiers / 1 732 tests
- Server boundary : OK
- ESLint ciblé : OK
- Build : OK
- `git diff --check` : OK

Aucune extension du contrat `BusinessIntelligenceSegmentWorkspace` n’a été nécessaire.

C’est un invariant important : le socle Lot 1 couvre correctement les besoins des cinq chapitres.

---

# 14. LOT 4 — MODULES TRANSVERSES

Lot final du chantier.

Modules concernés :

- Études sectorielles Light ;
- Playbook ;
- Battle Cards ;
- Analyse approfondie ;
- CRM Launcher ;
- documentation canonique.

---

# 15. ÉTUDES SECTORIELLES LIGHT

Fichier principal :

`SectorStudiesModal.tsx`

L’ancien catalogue multi-segments est supprimé.

Le module fonctionne exclusivement sur le segment actif.

Le shell existant `IntelligenceSplitModalShell` est conservé lorsque pertinent.

Navigation actuelle :

1. Essentiel
2. Économie & modèles
3. Technologies & dépendances
4. Risques & dynamiques
5. Pain points & acteurs
6. Sources & limites

Règle :

une section vide n’est pas affichée.

Source :

`workspace.knowledge`

Aucune nouvelle synthèse LLM.

---

# 16. ÉTUDE LIGHT — POSITIONNEMENT

L’Étude Light n’est PAS :

- une seconde Master Study ;
- une copie du document canonique ;
- une synthèse persistée.

C’est un lecteur structuré du read model existant.

La connaissance reste fournie par les vues et projections Master Study canoniques.

---

# 17. PLAYBOOK

Fichier principal :

`SectorPlaybooksModal.tsx`

L’ancien catalogue multi-segments est supprimé.

Le calcul artificiel de complétude en pourcentage est supprimé.

Le Playbook fonctionne uniquement sur le segment actif.

Navigation :

1. Enjeux
2. Personas
3. Angles d’approche
4. Objections
5. ROI & offres
6. Pourquoi maintenant
7. Battle Cards

Source :

- `workspace.knowledge.playbook`
- pain points ;
- réglementation ;
- événements ;
- `practicesFit` ;
- projections concurrentielles ;
- offres/practices existantes lorsque jointes.

Aucune nouvelle source de vérité.

---

# 18. BATTLE CARDS

Composant :

`BattleCardsSection.tsx`

Les Battle Cards sont calculées à la volée.

Source principale :

`competitive_map_entries.profile_json`

et attributs existants des entrées concurrentielles.

Aucune table `battle_cards`.

Aucune persistance.

Aucun LLM à l’ouverture.

Projection actuelle :

« 90 secondes avant l’appel »

Sections exploitées selon disponibilité :

- Identité & chiffres clés
- Trigger / Pourquoi appeler maintenant
- À qui parler / organisation SI
- Angle d’entrée
- Accroches
- Ce qu’il ne faut pas dire
- Chantiers observés
- Forces / vulnérabilités
- Inconnues à qualifier
- Sources

---

# 19. PROFILE_JSON UTILISÉ

Structures réellement identifiées lors du Lot 4 :

`traduction_commerciale`
- angle
- accroches
- a_ne_pas_dire

`couche_esn`
- organisation_si
- decideur_si
- modele_achat
- modele_achat_statut
- conditions_acces
- esn_en_place
- chantiers_observes
- voie_entree_probable

`grilles`
- avantages
- vulnerabilite_principale
- ia_annonce_vs_deploye
- trajectoire
- financiere

Autres champs exploités lorsqu’ils existent :

- metier_chaine_valeur
- maillon
- contrats_majeurs
- trigger_events
- angle_entree
- a_ne_pas_dire
- trous
- sources

Attributs directs de l’entrée :

- name
- category
- categoryLabel
- appetenceScore
- accessibiliteScore
- confiance
- positioning
- isBenchmarkAccount
- revenueMeur
- effectifFrance

Ne pas définir un nouveau contrat Battle Card concurrent si ces données suffisent.

---

# 20. ABSENCE DE BATTLE CARD

Si aucun `profile_json` exploitable n’existe :

→ empty state explicite.

Interdictions :

- fallback vers un autre acteur ;
- fallback vers un autre segment ;
- génération d’une fiche fictive ;
- présentation d’une information générique comme donnée spécifique.

---

# 21. ANALYSE APPROFONDIE

Le moteur existant est conservé.

Composants existants :

- `WatchAnalysisComposerDesktop`
- `WatchAnalysisComposerMobile`

Contrat :

- `schemaVersion: 2`
- `triggerMode: "manual_custom"`

Kinds de sources actuellement supportés :

- `account_signals`
- `intelligence_documents`
- `digest`
- `knowledge_collection`

Le chapitre Actualités possède désormais un déclencheur :

`Analyse approfondie`

qui ouvre le compositeur existant.

Aucun nouveau workflow n8n.

Aucun nouveau moteur d’analyse.

Les `account_signals` issus du segment sont directement compatibles lorsqu’ils sont exposés avec leurs IDs.

Une source non supportée par le contrat V2 ne doit pas être artificiellement rendue sélectionnable.

---

# 22. POINT DE CONTRÔLE FUTUR — ANALYSE APPROFONDIE

À la prochaine reprise du chantier, vérifier manuellement une fois le comportement exact du préfiltrage / présélection des sources lors de l’ouverture depuis Actualités.

Le contrat technique est compatible.

Le déclencheur est intégré.

Mais toute évolution future doit préserver la distinction entre :

- contexte segment ;
- source réellement éligible au contrat `manual_custom`.

Ne pas modifier n8n uniquement pour permettre la sélection d’un type non supporté.

---

# 23. CRM LAUNCHER

Le CRM Launcher n’a nécessité aucune modification.

Mécanisme actuel :

`useCrmAccountLauncherStore.getState().open()`

Il conserve :

- `segment`
- `tab`
- URL BI courante

à l’ouverture et à la fermeture.

Le store du CRM Launcher n’est PAS un store de contexte Business Intelligence et ne doit pas être utilisé comme tel.

---

# 24. DOCUMENTATION CANONIQUE

Documents mis à jour lors du Lot 4 :

`02-DISTRIBUTION-DANS-KREDO.md`

`ADR-0021-master-study-ingestion-projections-distribution.md`

`LOT-3-PLAYBOOKS.md`

Principales corrections :

- passage de « BI, 4 onglets » à un workspace mono-segment à 6 chapitres ;
- ajout des modules transverses ;
- suppression / supersession des anciens comportements multi-segments ;
- clarification de la distribution Étude / Playbook / Battle Cards ;
- conservation du principe de projections multiples depuis une vérité unique.

Ne pas réécrire l’historique comme si les anciennes décisions n’avaient jamais existé.

Les anciens contrats devenus obsolètes doivent rester identifiables comme historiques / superseded.

---

# 25. CONTRAT FINAL MASTER STUDY → BI

Principe :

1 Master Study
→ 1 corpus canonique
→ ingestion unique
→ projections déterministes
→ plusieurs lecteurs
→ aucune duplication de vérité

Business Intelligence est un lecteur.

Étude Light est un lecteur.

Playbook est un lecteur.

Battle Cards est une projection.

Aucun de ces éléments ne possède sa propre vérité persistée.

---

# 26. DISTRIBUTION FINALE

## Accueil

Rôle :
synthèse immédiate du segment.

Sources :
- scalaires résolus ;
- description ;
- portefeuille scoped ;
- coverage.

## Analyse sectorielle

Rôle :
lecture analytique de la connaissance résolue.

Source :
`SectorKnowledgeReadModel`.

## Environnement concurrentiel

Rôle :
analyse des acteurs du segment.

Source :
`competitive_map_entries` + faits projetés.

## Calendrier réglementaire

Rôle :
lecture stricte des échéances et dispositions réglementaires.

Source :
`knowledge.regulatory`.

## Chaîne de valeur

Rôle :
lecture de la structure sectorielle.

Source :
projection value-chain avec résolution segment→macro.

## Actualités sectorielles

Rôle :
lecture du flux sectoriel et des signaux actionnables.

Source :
`workspace.news`.

## Étude Light

Rôle :
lecture structurée et synthétique de l’étude active.

Source :
read model canonique.

## Playbook

Rôle :
traduction commerciale opérationnelle.

Source :
projections existantes à la lecture.

## Battle Cards

Rôle :
préparation opérationnelle face aux acteurs.

Source :
`profile_json` + attributs concurrentiels.

---

# 27. ADAPTIVE DESIGN — CONTRAT FINAL

Règle KREDO :

Desktop = Analyse

Mobile = Action

Desktop et Mobile consomment les mêmes contrats métier mais disposent de rendus dédiés.

Ne pas utiliser la graceful degradation consistant à charger un gros composant Desktop puis le masquer avec CSS.

Touch targets Mobile :

≥ 44 px.

Les visualisations lourdes Desktop ne doivent être conservées sur Mobile que si une variante réellement utilisable existe.

---

# 28. DATA VISUALISATION

Interdictions :

- recharts
- chart.js
- react-chartjs-2

Desktop :

réutiliser les composants autorisés / existants du projet.

Mobile :

HTML/Tailwind pur privilégié pour les représentations simples.

Aucune nouvelle dépendance de visualisation n’a été nécessaire sur ce chantier.

---

# 29. DESIGN SYSTEM

Business Intelligence doit rester cohérent avec KREDO :

- Tailwind CSS ;
- flat ;
- minimaliste ;
- premium ;
- bordures fines ;
- peu d’ombres décoratives ;
- tokens existants ;
- cobalt / brass selon les conventions du produit ;
- pas de palette parallèle ;
- pas de nettoyage opportuniste de composants historiques hors périmètre.

Ne pas transformer chaque bloc en `Card`.

Utiliser selon le besoin :

- surfaces ouvertes ;
- sections ;
- rails ;
- tableaux ;
- listes ;
- séparateurs ;
- panneaux.

---

# 30. VALIDATION FINALE LOT 4

Résultats fournis à la clôture :

- `npm run typecheck` : OK
- `npm test` : OK
- 180 fichiers de tests
- 1 737 assertions OK
- `npm run check:server-boundary` : OK
- ESLint ciblé : OK
- `npm run build` : OK
- `git diff --check` : OK

Aucune erreur introduite par le Lot 4 signalée.

---

# 31. WARNINGS / DETTES PRÉEXISTANTES

Warnings historiques connus au build :

`DYNAMIC_SERVER_USAGE`

sur certaines routes Legacy / Missions.

Ils ne sont pas issus du chantier BI.

Des erreurs ESLint historiques existaient également dans certains anciens fichiers BI non modifiés lors des Lots précédents.

Ne pas lancer un nettoyage global lors d’une évolution BI sans chantier dédié.

---

# 32. MODIFICATIONS SUPABASE / N8N

Sur l’ensemble des Lots 1–4 :

Aucune nouvelle table BI.

Aucune table Battle Cards.

Aucune migration métier spécifique au chantier.

Aucun changement RLS.

Aucun nouvel index.

Aucun nouveau workflow n8n.

Aucun nouveau webhook.

Aucun nouveau contrat LLM.

Les changements ont été réalisés essentiellement dans :

- routing ;
- loaders ;
- read models ;
- composants ;
- projections ;
- documentation.

---

# 33. CORRECTION TECHNIQUE À PRÉSERVER

Lors du Lot 2, deux jointures Supabase auto-référentielles incompatibles avec le schéma réellement exposé ont été corrigées dans les loaders.

Cette correction n’a pas changé les contrats fonctionnels du Lot 1.

Ne pas réintroduire ces jointures lors d’un refactor futur.

Si les loaders concernés sont modifiés :

inspecter le diff historique avant de réécrire les relations Supabase.

---

# 34. FICHIERS / ZONES PRINCIPALES À CONNAÎTRE

## Route

`src/app/(app)/intelligence/page.tsx`

## BI

`src/features/business-intelligence/`

Sous-ensembles principaux :

- `desktop/`
- `mobile/`
- `catalog/`
- `home/`
- `coverage/`
- `navigation/`
- `states/`
- `chapters/`
- `actions/`
- `playbooks/`
- `data/`
- `__tests__/`

## Concurrence

`src/features/competitive-map/`

## Chaîne de valeur

`src/features/sector-mapping/`

## Analyse transverse

`src/features/watch-analysis/`

## Master Study

read model sectoriel canonique et documentation Master Study existante.

---

# 35. DEFINITION OF DONE DU CHANTIER

Le chantier Business Intelligence mono-segment est considéré terminé parce que :

1. le segment actif est unique ;
2. l’URL est la source de vérité ;
3. aucun chapitre ne maintient son propre segment ;
4. le chargement est segment-scoped ;
5. la landing n’exécute qu’un catalogue léger ;
6. l’Accueil consomme le workspace ;
7. les 5 chapitres métier sont finalisés ;
8. le calendrier est strictement réglementaire ;
9. la concurrence n’a aucun fallback ;
10. la chaîne utilise segment→macro ;
11. Actualités possède une bibliothèque dédiée ;
12. Étude Light est mono-segment ;
13. Playbook est mono-segment ;
14. Battle Cards sont projetées, non persistées ;
15. `manual_custom` est réutilisé ;
16. CRM Launcher conserve le contexte ;
17. Desktop et Mobile sont adaptatifs ;
18. aucun chargement portefeuille-wide n’a été réintroduit ;
19. aucun nouveau workflow n8n n’a été créé ;
20. aucune seconde source de vérité n’a été créée ;
21. la documentation canonique a été réalignée ;
22. les validations techniques sont vertes.

---

# 36. RÈGLES POUR TOUTE ÉVOLUTION FUTURE

Avant de modifier Business Intelligence, vérifier systématiquement :

### Data

La donnée existe-t-elle déjà dans :

`BusinessIntelligenceSegmentWorkspace`

ou dans une projection canonique existante ?

Si oui :

la réutiliser.

Ne pas créer un second fetch par facilité.

### Segment

Toute nouvelle fonctionnalité doit recevoir le segment actif du workspace.

Elle ne doit pas posséder son propre picker sauf besoin produit explicitement distinct.

### Master Study

Ne jamais persister une nouvelle synthèse simplement parce qu’une vue différente est nécessaire.

Créer un nouveau lecteur / presenter.

### Mobile

Créer une intention Mobile propre.

Ne pas adapter uniquement le CSS Desktop.

### n8n

Tout traitement long, scraping, vectorisation, cron ou LLM lourd reste externe à Vercel.

Ne pas créer de workflow lorsqu’une projection déterministe côté application suffit.

---

# 37. PROCHAINE REPRISE RECOMMANDÉE

Il n’existe pas de Lot 5 fonctionnel prévu pour ce chantier.

Avant toute nouvelle évolution majeure :

1. conserver ce document comme handoff de référence ;
2. vérifier l’état réel du repo ;
3. vérifier les derniers commits intervenus depuis cette clôture ;
4. ne pas repartir des anciens contrats multi-segments ;
5. considérer l’architecture mono-segment Lots 1–4 comme baseline.

Petit contrôle résiduel recommandé si nécessaire :

vérifier manuellement le comportement précis de préfiltrage / présélection des sources `manual_custom` depuis Actualités.

Ce contrôle ne remet pas en cause la clôture du chantier.

---

# 38. GOUVERNANCE À LA CLÔTURE

Au moment de ce handoff :

- aucun commit n’a été demandé dans le cadre du dernier lot ;
- aucun push n’a été demandé ;
- aucun déploiement n’a été demandé ;
- aucune modification Supabase n’a été réalisée ;
- aucune modification n8n n’a été réalisée.

Avant commit final :

- vérifier `git status`;
- vérifier `git diff --stat`;
- vérifier les fichiers non suivis ;
- ne pas embarquer d’artefacts temporaires ou hors périmètre ;
- conserver les documents de référence voulus ;
- effectuer le commit explicitement lorsque validé.

---

# 39. SYNTHÈSE EXÉCUTIVE

Business Intelligence est désormais un workspace KREDO mono-segment cohérent de bout en bout.

L’architecture finale ne repose pas sur une duplication des Master Studies mais sur leur distribution sous forme de projections spécialisées :

Master Study
→ Read Models canoniques
→ Workspace segment-scoped
→ Accueil
→ Analyse sectorielle
→ Concurrence
→ Réglementation
→ Chaîne de valeur
→ Actualités
→ Étude Light
→ Playbook
→ Battle Cards

La donnée reste centralisée.

Les lecteurs changent selon l’intention utilisateur.

Le segment reste unique.

Le Desktop privilégie l’analyse.

Le Mobile privilégie l’action.

La base de données, n8n et les sources de vérité n’ont pas été inutilement complexifiés.

CETTE ARCHITECTURE CONSTITUE DÉSORMAIS LA BASELINE CANONIQUE DE BUSINESS INTELLIGENCE DANS KREDO.
