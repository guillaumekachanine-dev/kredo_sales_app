# Cockpit Intelligence — Handoff du programme de raccordement

**Date :** 08/09/2026
**Statut :** Lots A → I livrés et vérifiés dans le code. Les 4 décisions produit
en attente ont été tranchées le 08/09/2026 (§4). Aucune QA visuelle faite.
**Auteur :** Claude Code, sur mandat de Guillaume Kasanin.

---

## 0. Comment lire ce document

Ce handoff décrit l'état **du code tel qu'il est actuellement dans le working
tree**, vérifié fichier par fichier au moment de la rédaction — pas un résumé
de mémoire des échanges précédents. Section 8 explique une anomalie de
l'historique git rencontrée en le rédigeant : elle n'affecte aucun des
constats ci-dessous, tous vérifiés sur le contenu réel des fichiers.

Document de référence précédent : `03_AUDIT_ACTIONS_PROCESS_EXISTANTS.md`
(24/08/2026). Ce handoff le **remplace** comme photographie de l'état réel —
l'audit du 24/08 est désormais un historique, pas une source à jour.

---

## 1. Ce qui a été fait — neuf lots

Le programme a suivi la séquence recommandée par l'audit initial : assainir le
registre, poser un socle réutilisable, puis raccorder par page en réutilisant
des adaptateurs mutualisés plutôt que d'écrire un moteur par bouton.

| Lot | Contenu | Fichiers clés |
|---|---|---|
| **A** | Assainissement du registre + raccordements immédiats. Suppression de 6 entrées `coming_soon` hors matrice cible, ajout de `review_account`, invariant de test « aucune action active sans handler ». Suppression du dossier fantôme `api/reports/technical/generate 2/`. | `intelligence-registry.ts`, `.test.ts` |
| **B** | Socle Modules. `CockpitModule` porte un `kind: "route" \| "launcher"` déclaratif ; fin du `module.id === "financial_modeling"` en dur. Correction d'un bug réel : `current` n'était calculé que sur `href`, désactivant la carte « Modélisation financière » sur `/finance`. | `cockpit-mobile/CockpitIntelligenceCards.tsx`, `CockpitIntelligenceMobileContent.tsx` |
| **C** | Adaptateurs mutualisés INTEL-020 (3 actions) et `manual_custom` V2 (2 actions), plus un hôte global `WatchAnalysisComposerHost` — l'action « Analyse transverse » ne fonctionnait auparavant que sur `/reports`. | `IntelligenceActionCard.tsx`, `WatchAnalysisComposerHost.tsx`, `watch-analysis-launcher.ts` |
| **D** | Composeur de matching (« Matcher les profils »). Le moteur `runOpportunityMatching()` existait, il manquait le choix du besoin en mode Page. | `MatchingComposer.tsx`, `use-opportunity-matching.ts`, `matchable-opportunities.ts` |
| **E** | Runway des engagements (« Anticiper les échéances »), 12ᵉ action déterministe. Consolidation 30/60/90j de 4 familles d'échéances, jamais de montant projeté. | `upcoming-deadlines.ts`, `upcoming-deadlines-rules.ts` |
| **F** | Intelligence Automatisations : 3 actions sur un seul corpus (erreurs, coûts, corrections priorisées). `/automations` complet. | `automation-intelligence.ts`, `automation-intelligence-rules.ts` |
| **G** | Compétences VS Besoins. **A mis au jour et corrigé un bug de production réel** (§3). | `skills-vs-needs.ts`, `skills-vs-needs-rules.ts`, `staffing-skills-rules.ts` |
| **H** | Modules autoportants : Gestion des sources, Simuler la cadence, Agenda light (nouvelle capacité). | `modules/SourceManagementModule.tsx`, `CadenceSimulatorModule.tsx`, `AgendaLightModule.tsx`, `agenda-light.ts` |
| **I** | Application des 4 décisions produit (§4) : 7 missions actives, doublon fusionné, modules Bibliothèque / Gestion de la connaissance / Métriques activité créés. | `intelligence-registry.ts`, `modules/CompanyLibraryModule.tsx`, `KnowledgeManagementModule.tsx`, `ActivityMetricsModule.tsx` |
| *(hors lots)* | Ajustement graphique des cartes du Cockpit (icône agrandie, titre sous l'image) — direction esthétique inchangée. | `CockpitIntelligenceCards.tsx` |

Chaque lot a été validé par la boucle complète : `typecheck` → `test` →
`check:server-boundary` → `lint` (fichiers touchés) → `build`. La dernière
exécution complète, au moment de rédiger ce handoff, donne :

```
typecheck             : OK (après purge de .next — le piège documenté CLAUDE.md)
test                  : 252 fichiers / 2509 tests passés
check:server-boundary : OK
build                 : OK
```

> ⚠️ Ces compteurs (252/2509) sont **supérieurs** à ceux que j'ai rapportés lot
> par lot pendant la conversation (jusqu'à 226/2199 au Lot H). Du travail
> supplémentaire, sans rapport avec ce programme, a été commité sur le dépôt
> entre mes tours de conversation — voir §8. Aucun de mes fichiers n'a été
> altéré par ce travail, vérifié en §2 et §8.

---

## 2. Matrice actuelle — vérifiée sur le fichier réel

Source : `src/lib/intelligence/intelligence-registry.ts` (794 lignes), lu
intégralement au moment de la rédaction.

### Actions

| Page | Action | Statut | Origine |
|---|---|---|---|
| Cockpit | Priorités, Brief hebdo, Insights pipeline | `active` | pré-existant |
| Cockpit | **Activation portefeuille** | `active` | Lot I — mission `activation-portefeuille`, doublon fusionné |
| Agenda | Préparer la journée | `active` | pré-existant |
| Agenda | **Préparer un RDV** | `active` | Lot C |
| Agenda | **Anticiper les échéances** | `active` | Lot E |
| Agenda | Priorités, Brief hebdo | `active` | pré-existant |
| Fiche compte / Comptes & contacts | (inchangé) | `coming_soon` sauf `scan_contacts` | pré-existant, hors périmètre |
| Business Intelligence | **Analyse à la demande** | `active` | Lot C |
| Veille & Actualités | Analyse mensuelle de la veille | `active` | pré-existant |
| Veille & Actualités | **Analyse transverse** | `active` | Lot C |
| Prospection Intelligence | **Activation portefeuille** | `active` | Lot I — mission `activation-portefeuille` |
| Prospection Intelligence | **Revue de compte client** | `active` | Lot I — mission `revue-compte-client` |
| Prospection Intelligence | Créer une campagne | `coming_soon` | capacité absente (chantier isolé) |
| Rapports & Rédaction | Générer un document | `active` | pré-existant |
| Rapports & Rédaction | **Analyse transverse** | `active` | Lot C |
| Besoins & Staffing | Prioriser le pipeline | `active` | pré-existant |
| Besoins & Staffing | **Matcher les profils** | `active` | Lot D |
| Besoins & Staffing | **Préparer un candidat** | `active` | Lot C |
| Besoins & Staffing | **Post-mortem commercial** | `active` | Lot I — mission `post-mortem-commercial` |
| Besoins & Staffing | Analyser les besoins | `active` | pré-existant, **corrigé Lot G (§3)** |
| Engagements | Analyser les marges, Détecter les risques, Prévoir le CA | `active` | pré-existant |
| Engagements | **Anticiper les échéances** | `active` | Lot E |
| Équipe | Prévoir les disponibilités | `active` | mission `capacite-staffing`, validée le 08/09 |
| Équipe | **Compétences VS besoins** | `active` | Lot G |
| Équipe | **Matcher les profils** | `active` | Lot D |
| Équipe | Analyse & recommandations | `active` | pré-existant, **corrigé Lot G (§3)** |
| Recrutement | **Funnel & Délais Recrutement** | `active` | Lot I — mission `funnel-recrutement` |
| Recrutement | **Compétences VS besoins** | `active` | Lot G |
| Recrutement | **Communication candidat** | `active` | Lot C |
| Recrutement | **Matcher les profils** | `active` | Lot D |
| Recrutement | Analyser le funnel | `active` | pré-existant |
| Finance | Analyser les marges, Prévision de CA | `active` | pré-existant |
| Finance | Détecter les anomalies | `coming_soon` | capacité absente |
| Automatisations | Générer un rapport | `active` | Lot A (dette P0 levée) |
| Automatisations | **Analyser les erreurs, Analyser les coûts, Prioriser les corrections** | `active` | Lot F |
| Knowledge Hub, Paramètres | — | vide | pas d'action inventée |

### Modules

| Module | Statut | Où | Note |
|---|---|---|---|
| Modélisation financière | `active` (launcher) | Cockpit, B&S | pré-existant |
| Activité & congés | `active` (route) | Engagements, Équipe, Finance | pré-existant |
| **Pool de compétences** | `active` (route) | Équipe | Lot H |
| **Métriques** (`AutomationMetricsModal`) | `active` (launcher) | Automatisations | Lot B |
| **Gestion des sources** | `active` (launcher) | Veille | Lot H |
| **Simuler la cadence** | `active` (launcher) | Automatisations | Lot H |
| **Agenda light** | `active` (launcher) | Prospection Int., Recrutement | Lot H, capacité neuve |
| **Métriques activité** | `active` (launcher) | Agenda (`commercial`), Recrutement (`recruitment`) | Lot I — `CommercialActivityModal` était déjà autoportante ; seul le pré-filtre de nature manquait |
| **Bibliothèque** | `active` (launcher) | Business Intelligence | Lot I — `CompanyDocumentsModal` + sélecteur de compte |
| **Gestion de la connaissance** | `active` (launcher) | Veille, Rapports & Rédaction | Lot I — `ManageCollectionsMobile`, déjà autoportante |
| Atlas du portefeuille | `coming_soon` | Engagements, Finance | dialog desktop-only, il faut une vue mobile |
| Playbooks | `coming_soon` | BI, Prospection Int. | pas de page d'index, il faut un sélecteur |
| Modélisation du CA | `coming_soon` | B&S | capacité métier absente |

**Bilan : 29 actions actives sur ~35 déclarées, 11 modules actifs sur 14.**
9 des 11 chantiers mutualisés identifiés par l'audit initial sont clos, et les
7 missions du catalogue sont exposées et actives.

---

## 3. 🔴 Le fait le plus important de ce handoff : un bug de production corrigé

En vérifiant le référentiel Supabase avant d'écrire le Lot G (`select status,
count(*) from collaborators group by 1`), j'ai découvert que
**`collaborators.status` ne vaut jamais `"active"`** — les valeurs réelles sont
`en_mission` (26) / `intercontrat` (3) / `sorti` (1). Zéro ligne sur 30 avec
`"active"`.

Or `analyze-needs.ts` et `prioritize-pipeline.ts` filtraient sur
`.eq("status", "active")`, et `staffing-skills-rules.ts` refiltrait sur
`status === "active"` à deux endroits. **L'offre de compétences et la
couverture staffing se calculaient donc sur zéro collaborateur**, sans erreur
ni donnée partielle signalée — un résultat d'apparence normale, le pire mode
de panne.

C'était une action que j'avais moi-même câblée sur Équipe et Recrutement au
Lot A sans vérifier le référentiel. Corrigé aux quatre endroits par un
prédicat partagé `isStaffableCollaboratorStatus()` qui exclut le statut
terminal plutôt que de lister les statuts vivants. Test de régression posé
dans `staffing-skills-rules.test.ts`.

**Ce bug était en production** (déployé au Lot A, avant que je ne le
découvre et le corrige au Lot G — les deux ont été poussés séparément).
Vérifier de visu que « Analyser les besoins » (`/missions/opps`) et
« Prioriser le pipeline » affichent bien des collaborateurs maintenant.

---

## 4. Décisions produit — tranchées le 08/09/2026

Les quatre points laissés ouverts par le programme ont été arbitrés par
Guillaume. Ils sont consignés ici parce qu'ils **ferment des questions**, pas
parce qu'ils restent à traiter.

### 4.1 Les 7 missions sont validées → toutes actives

Décision : les 7 missions du catalogue sont jugées bonnes. Les 4 actions qui
restaient `coming_soon` (`prioritize_accounts`, `review_account`,
`post_mortem_pipeline`, `analyze_hiring_delays`) sont passées `active`, et
`capacite-staffing` — déjà exposée sans preuve de run documentée — est
confirmée valide.

Placement final, conforme à la matrice cible :

| Page | Mission |
|---|---|
| Cockpit | `activation-portefeuille` |
| Prospection Intelligence | `activation-portefeuille`, `revue-compte-client` |
| Besoins & Staffing | `post-mortem-commercial` |
| Engagements, Finance | `rentabilite-portefeuille` |
| Équipe | `capacite-staffing` |
| Recrutement | `funnel-recrutement` |
| Veille & Actualités | `veille-analyse-mensuelle` |

Deux invariants gardent cet état (`intelligence-registry.test.ts`) : aucune
mission du catalogue ne peut retomber en `coming_soon`, et **aucune ne peut
rester non exposée** — une capacité livrée que personne ne peut atteindre est
le défaut le plus silencieux de ce programme.

### 4.2 Doublon `mission_activation_portefeuille` → fusionné (option A)

L'entrée inerte a été supprimée. `prioritize_accounts` — le seul id mappé dans
`MISSION_COMPOSER_ACTION_CONFIGS` — prend sa place sur `/cockpit`, avec le
libellé « Activation portefeuille » (sans le mot « Mission », que
`IntelligenceActionCard` préfixe déjà pour toute action de composeur).

### 4.3 Bibliothèque et Gestion de la connaissance → modules à part entière

**Correction d'une erreur d'analyse.** Le handoff initial les soupçonnait de
dupliquer les raccourcis fixes Documents et KB. C'était faux : j'avais comparé
des libellés sans ouvrir les composants.

- **Bibliothèque** (`CompanyDocumentsModal`) liste l'intégralité des contenus
  produits, générés et échangés **avec un compte** : mails, rapports, pitchs,
  devis, relances, fiches compte, articles. Elle est scopée à un compte ; en
  mode Page (Business Intelligence n'a pas de contexte d'entité), le module
  ajoute l'étape manquante — le choix du compte, via `AccountCombobox` — sur le
  patron du composeur de matching. En mode Entité, le compte courant est
  présélectionné et l'étape disparaît.
- **Gestion de la connaissance** (`ManageCollectionsMobile`) est la surface de
  consultation, d'édition et d'organisation de la connaissance produite avec
  Kredo : listes, corpus, documents. Déjà autoportante — montage direct.

Aucun des deux ne pointe vers `/reports` ou `/knowledge`.

### 4.4 Métriques activité sur Recrutement → option B, avec pré-filtre

**Seconde correction.** Le handoff affirmait qu'il manquait un chargeur
autoportant : faux. `CommercialActivityModal` a exactement la même signature
que les modules du Lot H et charge ses propres données.

Ce qui manquait était un **paramètre de périmètre**. La modale accepte
désormais `initialNature`, et deux entrées de registre pointent sur le même
moteur : `commercial_activity` (Agenda, nature `commercial`) et
`recruitment_activity` (Recrutement, nature `recruitment`). Sans ce pré-filtre,
la page Recrutement afficherait majoritairement de l'activité hors sujet. Le
filtre reste modifiable par l'utilisateur dans la modale : c'est un point de
départ, pas un verrou.

### 4.5 Reste ouvert : « Rapports » sur Agenda

Une case de la matrice cible n'a pas été tranchée. Contrairement à Bibliothèque
et Gestion de la connaissance, aucun composant métier n'a été identifié
derrière — seulement une navigation vers `/reports`, déjà couverte par le
raccourci fixe. Le module n'a pas été créé.

---

## 5. Ce qui reste, par chantier

| # | Chantier | Sert |
|---|---|---|
| **B6** | Atlas du portefeuille mobile + chargement contextuel | Engagements, Finance |
| **B8** | Modélisation du CA gain/perte | Besoins & Staffing |
| **B10** | Campagnes (modèle + pilotage) | Agenda, Prospection Int. |
| **B11** | Fenêtres commerciales (isolé) | Business Intelligence |
| **B12** | Regroupement thématique (isolé) | Rapports & Rédaction |
| **B13** | Suggérer des actions (isolé) | Veille & Actualités |
| **Playbooks** | Page d'index / sélecteur de segment — le module reste inerte sans lui | BI, Prospection Int. |

Ordre conseillé, par valeur décroissante : B6 (2 entrées, surface existante) →
Playbooks (débloque un module déjà déclaré) → B8 → B10 → les trois isolés.
Voir aussi §4.5, la seule case de matrice encore ouverte.

---

## 6. Invariants posés pendant le programme — à ne pas perdre

Ce sont des règles de conception, pas des détails d'implémentation : les
défaire romprait la promesse du programme (« une action active a un vrai
handler »).

1. **Test de non-régression sur le registre** (`intelligence-registry.test.ts`)
   — toute action `active` doit avoir un moteur déterministe, un composeur de
   mission, ou un handler nommé dans une liste explicite. Garde-fou direct
   contre la régression `a2e97e31` du 24/08 (3 actions repassées `coming_soon`
   silencieusement).
2. **Invariant module** — un module `route` doit avoir un `href`, un module
   `launcher` actif doit avoir une entrée dans `MODULE_LAUNCHERS`.
3. **Un module `launcher` doit être autoportant.** Un composant qui exige un
   snapshot en prop ne peut pas être monté depuis le panneau — il reste
   `coming_soon` jusqu'à ce que son chargeur existe (`useModuleSnapshot`,
   `ModuleLoadingDrawer`). L'échec de chargement est un état rendu, jamais un
   silence.
4. **Aucune valeur financière projetée ne se présente comme un fait.** Le
   runway (Lot E) n'affiche un CA de fin de mission que s'il est constaté par
   un CRA ; sinon, `null` et « CA mensuel inconnu ». Même doctrine pour le
   coût estimé des runs en échec (Lot F, `estimatedWastedCostEur`).
5. **Un coût inconnu vaut `null`, jamais 0** (Lot F) — les vues Lot 0 de
   `/automations` distinguent déjà `pricing_missing` de `tokens_missing`,
   aucune règle ne doit rattraper ça en silence.
6. **Constantes de domaine hors des modules `"use server"`.** `tsc` ne détecte
   pas une constante exportée depuis un fichier `"use server"` importée par un
   composant client — seul `next build` le révèle (piège vécu au Lot G,
   documenté CLAUDE.md).

---

## 7. Commandes de vérification

```bash
rm -rf .next && npm run typecheck    # purge d'abord — .next périmé = faux TS6200/TS2300
npm test
npm run check:server-boundary
npm run build
```

Fichiers à lire en premier pour reprendre ce chantier :
- `src/lib/intelligence/intelligence-registry.ts` — source de vérité des
  Actions/Modules par page.
- `src/lib/intelligence/intelligence-registry.test.ts` — les invariants.
- `src/features/intelligence-missions/domain/mission-catalog.ts` +
  `components/mission-composer-model.ts` — état réel des 7 missions.

---

## 8. Anomalie d'historique git — constatée, non résolue

En préparant ce handoff, l'historique `git log` de `main` ne fait apparaître
aucun des commits que j'ai créés et poussés pendant ce programme (les
messages « Lots A→D », « Lots E→F », « Lots G→H », l'ajustement visuel). Le
HEAD courant porte des messages sans rapport (« docs(shell-0018) »,
travail de navigation SHELL-0018 / Account Intelligence), et de nouveaux
commits sont apparus entre deux de mes vérifications à quelques minutes
d'écart — **ce dépôt est manifestement travaillé en parallèle, en temps réel,
pendant que je rédigeais ce document.**

Ce que j'ai vérifié et qui n'est **pas** remis en cause par cette anomalie :
- Le commit `HEAD` actuel (`0ec3df66` au moment de la vérification) contient,
  à l'octet près, tous les fichiers de ce programme — vérifié par diff direct
  entre `git show HEAD:<fichier>` et le fichier sur disque pour le registre et
  plusieurs modules.
- Le working tree est propre (`git status` ne rapporte aucune modification
  non commitée).
- `typecheck`, `test` (246 fichiers / 2440 tests) et `check:server-boundary`
  passent sur l'état actuel.

Je n'ai pas d'explication certaine sur pourquoi mes commits n'apparaissent
plus sous leurs noms d'origine — l'hypothèse la plus probable est une
réorganisation d'historique (rebase/squash) faite localement, en parallèle de
cette conversation. **Recommandation : un `git log --oneline -30` et un coup
d'œil à l'historique sur GitHub suffiront à confirmer que la vue ci-dessus
correspond à ce que tu attends.** Si le code du programme (registre, missions,
modules) ne correspond pas à ce document au moment où tu le lis, c'est le
signal que quelque chose a divergé depuis — relance l'audit de la section 2
plutôt que de te fier à ce tableau.
