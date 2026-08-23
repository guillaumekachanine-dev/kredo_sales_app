# Cockpit Intelligence Mobile — Actions contextuelles par page

**Statut :** Cadrage v0.2 — pré-chantiers requis  
**Date :** 23/08/2026  
**Périmètre principal :** panneau latéral / drawer mobile « Cockpit Intelligence » hors Cockpit Intelligence des comptes  
**Repo :** `guillaumekachanine-dev/kredo_sales_app`  
**Branche de référence :** `main`

---

## 1. Objectif du chantier principal

Refondre le panneau mobile **Cockpit Intelligence** pour restaurer sa fonction d’origine : proposer des actions réellement contextualisées à la **page fonctionnelle consultée**.

Règle canonique :

> **1 page fonctionnelle = 1 jeu stable de 3 à 4 actions prioritaires.**

Les onglets internes d’une page ne modifient pas les actions. Une entité ouverte peut enrichir le contexte d’exécution et le titre affiché, mais ne doit pas créer une taxonomie parallèle.

---

## 2. Exclusion absolue — Cockpit Intelligence d’un compte

Les pages `/prospection/accounts/[companyId]` possèdent déjà un Cockpit Intelligence mobile **spécifique, riche et contextualisé au compte**.

Cette expérience est **hors périmètre du chantier principal**.

Le chantier principal ne doit donc pas :

- remplacer `AccountMobileContent` par le rendu registry générique ;
- modifier sa structure Actions / Ressources ;
- modifier son header, son thème ou ses interactions ;
- faire hériter ses boutons de la cartographie globale par page ;
- supprimer ou simplifier ses capacités spécialisées ;
- utiliser cette page comme terrain de refactor du registry mobile générique.

Le Cockpit compte reste une **exception produit assumée**.

### Pré-chantiers obligatoires avant le chantier principal

Deux actions du Cockpit compte doivent être finalisées séparément :

1. **Simuler** — à traiter en premier.
2. **Recruter** — à cadrer et implémenter ensuite dans un lot indépendant.

Ces deux pré-chantiers doivent être terminés et validés avant de commencer la refonte globale.

---

## 3. Cartographie globale encore provisoire

La cartographie des boutons du chantier principal n’est pas encore figée.

Certains boutons seront modifiés avant le démarrage de la refonte. Les intitulés et capacités listés ci-dessous constituent donc une **baseline de travail**, pas un contrat définitif.

Avant le Lot 1 du chantier principal, un jalon explicite de **freeze de la cartographie** devra valider :

- les actions retenues par page ;
- leur libellé final ;
- leur statut `active` / `coming_soon` ;
- leur handler réel ;
- les éventuelles suppressions ou remplacements.

---

# 4. Pré-chantier A — Bouton « Simuler » du Cockpit compte

## 4.1 Objectif

Transformer le bouton **Simuler** du Cockpit Intelligence d’un compte en point d’entrée unique vers les trois familles de simulation utiles au pilotage d’un compte.

Aujourd’hui, `Simuler` est un simple deep-link vers `/finance`. La cible est une **modale de sélection** proposant trois options.

## 4.2 Options proposées

### A — Modélisation financière Assistance Technique

**Statut : existant.**

Réutiliser le module canonique de modélisation financière, notamment le flow mobile existant :

`src/features/financial-modeling/components/mobile/FinancialModelingMobileFlow.tsx`

Le module accepte déjà un `FinancialModelingLaunchPreset` avec notamment :

- `companyId` ;
- `companyName` ;
- `opportunityId` ;
- `opportunityTitle` ;
- `salesDailyRate`.

Depuis le Cockpit d’un compte, le lancement doit au minimum présélectionner **le compte courant** via `companyId` + `companyName`.

Aucun nouveau moteur financier ne doit être créé.

### B — Coûts des automatisations / Simulateur de cadence

**Statut : existant.**

Réutiliser le module actuel :

- `src/components/automations/VeilleSimulatorCard.tsx`
- `src/components/automations/VeilleSimulatorModal.tsx`
- `src/lib/automations/veille-cadence.ts`

Le calcul existant s’appuie sur les coûts observés de `account_watch_refresh` et les cadences actives. Il ne doit pas être recopié dans `IntelligenceFAB.tsx`.

Si un chargement ciblé est nécessaire depuis le Cockpit, extraire le **plus petit helper serveur réutilisable** permettant d’obtenir `VeilleSimulatorBaseline`, plutôt que de charger tout le dashboard Automatisations ou de dupliquer les formules.

### C — Scénarios financiers de revenus

**Statut : module à créer ultérieurement.**

Finalité future : modéliser des scénarios de revenus à partir d’hypothèses de gain / perte d’opportunités.

Dans ce pré-chantier :

- ne créer aucun moteur ;
- ne créer aucune table ;
- ne créer aucun workflow n8n ;
- afficher uniquement une option clairement marquée **« Bientôt disponible »** / désactivée.

Le placeholder doit rendre la future capacité visible sans simuler un fonctionnement inexistant.

## 4.3 UX cible

Flux :

```text
Cockpit Intelligence compte
→ Simuler
→ modale « Choisir une simulation »
   ├─ Modélisation financière AT
   ├─ Coûts des automatisations
   └─ Scénarios financiers de revenus — bientôt disponible
```

La modale de sélection doit :

- utiliser les primitives KREDO existantes (`AppDialog` / surface mobile adaptée) ;
- proposer 3 cartes / options lisibles ;
- respecter les touch targets ≥ 44 px ;
- rester cohérente avec le design du Cockpit compte ;
- se fermer proprement avant d’ouvrir le module choisi ;
- préserver la possibilité de revenir au Cockpit.

## 4.4 Architecture

Modification principale attendue :

`src/components/intelligence/IntelligenceFAB.tsx`

Règles :

- ne pas refactorer `AccountMobileContent` au-delà du câblage strictement nécessaire ;
- remplacer le `href: "/finance"` du bouton `simulate` par un handler local ;
- réutiliser `FinancialModelingMobileFlow` ;
- réutiliser le simulateur de cadence existant ;
- ne pas toucher au bouton `Recruter` dans ce lot ;
- aucun changement Supabase attendu ;
- aucun changement n8n attendu.

## 4.5 Definition of Done

- clic sur **Simuler** ouvre une modale à 3 options ;
- option AT ouvre le flow de modélisation existant avec le compte courant présélectionné ;
- option Coûts automatisations ouvre le simulateur de cadence existant avec ses vraies données ;
- option Scénarios financiers est visible mais non exécutable et explicitement marquée comme future ;
- le reste du Cockpit compte est inchangé ;
- `Recruter` est inchangé ;
- aucun nouveau moteur, workflow ou table ;
- typecheck + tests ciblés verts.

---

# 5. Pré-chantier B — Bouton « Recruter » — cadrage réservé

**Ne pas implémenter dans le lot Simuler.**

Le bouton `Recruter` devra couvrir deux axes distincts.

## Axe 1 — Synthèse des besoins et environnement technique du compte

Construire une synthèse transverse de toutes les opportunités / besoins connus du compte afin de :

1. synthétiser les besoins identifiés et traités ;
2. extraire les attendus techniques observés ;
3. déduire un environnement technique probable du client à partir des technologies, périmètres et besoins connus ;
4. synthétiser l’adéquation des profils et offres KREDO à cet environnement.

### Exigence fondamentale de confiance

Cette vue comporte nécessairement des inférences.

Chaque information affichée devra donc distinguer explicitement :

- fait observé / source directe ;
- inférence forte ;
- hypothèse faible / à confirmer.

Aucune hypothèse ne doit être présentée comme un fait client.

## Axe 2 — Matching profils anticipé

Donner accès à une variante du matching CV permettant :

- soit de sélectionner un besoin ouvert existant du compte ;
- soit de construire un besoin personnalisé temporaire ;
- puis d’exécuter un matching anticipé sur les consultants / profils disponibles.

La cible doit réutiliser le moteur de matching existant plutôt que créer un second moteur.

Le cadrage technique détaillé et le prompt d’implémentation seront produits **après validation du lot Simuler**.

---

# 6. Règles du chantier principal

## D-1 — La page est l’unité de contextualisation

Le Cockpit générique ne suit pas l’onglet actif.

Exemples :

- Engagements : même jeu d’actions sur Synthèse, Missions, Projets ;
- Équipe : même jeu sur Synthèse, Pool de compétences, Activité & congés ;
- Business Intelligence : même jeu sur les 6 chapitres ;
- Rapports & Rédaction : même jeu sur Documents, Connaissances, Générer.

Aucun `contextKey`, store d’onglet ou synchronisation supplémentaire.

## D-2 — L’entité enrichit le contexte

Une entité peut fournir :

- son `entityType` ;
- son `entityId` ;
- son `label` métier réel ;
- les IDs utiles aux handlers.

Elle ne choisit pas une nouvelle famille d’actions.

## D-3 — Réutiliser le registre existant

`src/lib/intelligence/intelligence-registry.ts` reste la source unique des actions du Cockpit générique.

Interdits :

- second registry mobile ;
- mapping par onglet ;
- nouveau store global ;
- nouvelle table pour piloter l’UI ;
- workflow n8n créé uniquement pour afficher / router un bouton.

## D-4 — 3 à 4 actions maximum par page

Une action est retenue si elle :

1. répond à un besoin fréquent de la famille ;
2. reste utile dans tous les onglets ;
3. exploite des données réellement disponibles ;
4. ne duplique pas une action plus générale ;
5. dispose d’un handler existant ou d’une capacité clairement planifiée.

## D-5 — Pas de faux comportement

Une capacité non développée reste `coming_soon` ou affiche un placeholder explicite. Aucun faux résultat.

---

# 7. Contrat UI du Cockpit générique cible

## Header

Le header générique contient uniquement :

**Cockpit Intelligence**

- texte `brand-brass` / jaune KREDO ;
- fermeture à droite ;
- aucun nom de page dans le header.

**Cette règle ne s’applique pas au Cockpit compte existant, hors périmètre.**

## Carte de contexte

Sous le header générique :

- grand titre = contexte métier le plus précis ;
- petit libellé = famille / type.

Priorité :

```text
entityContext.label
→ contexte métier de page disponible
→ label canonique de route
```

## Actions

- grille mobile 2 colonnes ;
- 3 à 4 actions maximum ;
- touch targets ≥ 44 px ;
- aucun changement selon l’onglet ;
- pas de `Plus d’actions` générique utilisé comme fallback universel.

---

# 8. Cartographie produit — baseline provisoire

> À figer après les pré-chantiers Simuler / Recruter et les derniers arbitrages produit.

| Page fonctionnelle | Actions baseline |
|---|---|
| **Cockpit** | Priorités d’action · Brief hebdomadaire · Insights pipeline |
| **Agenda** | Préparer la journée · RDV à préparer · Priorités d’action |
| **CRM — Comptes & Contacts** | Prioriser les comptes · Scanner les contacts · Rédiger une approche · Bilan d’activité CRM |
| **Besoins & Staffing** | Prioriser le pipeline · Matcher les profils · Analyser les besoins · Simuler la rentabilité |
| **Engagements** | Détecter les risques · Analyser les marges · Prévoir le CA |
| **Business Intelligence** | Actualiser l’intelligence sectorielle · Identifier les fenêtres commerciales · Préparer un argumentaire · Analyse approfondie |
| **Prospection Intelligence** | Prioriser les comptes · Prioriser les relances · Construire une approche · Créer une campagne |
| **Rapports & Rédaction** | Générer un document · Rédiger un message · Synthétiser un corpus · Analyse approfondie |
| **Veille & Actualités** | Qualifier les signaux · Transformer en action commerciale · Rédiger une approche · Analyse périodique de la veille |
| **Équipe** | Analyser l’activité · Analyser compétences & besoins · Prévoir les disponibilités · Matcher les profils |
| **Recrutement** | Analyser le funnel · Matcher les profils · Préparer une communication candidat · Initier une offre |
| **Finance** | Analyser les marges · Prévoir le CA · Détecter les anomalies · Simuler un scénario |
| **Knowledge Hub** | Interroger la connaissance · Synthétiser un corpus · Construire un corpus · Générer un livrable |
| **Automatisations** | Diagnostiquer une exécution · Analyser la fiabilité · Analyser les coûts · Prioriser les corrections |
| **Paramètres** | Aucune action |

### Hors cartographie globale

`/prospection/accounts/[companyId]` → **Cockpit Intelligence compte spécialisé**, conservé tel quel et géré indépendamment.

---

# 9. Architecture cible du chantier principal

```text
pathname
   ↓
route → page family
   ↓
Intelligence Registry
   ↓
3–4 actions
   +
entityContext optionnel
   ↓
Cockpit Intelligence générique Mobile
```

Aucune évolution Supabase n’est prévue pour la contextualisation globale.

Desktop reste une référence fonctionnelle ; le chantier de rendu est Mobile-only.

---

# 10. Roadmap d’implémentation

## PHASE PRÉLIMINAIRE — avant chantier principal

### P0-A — Simuler

Implémenter et valider le cadrage de la section 4.

**DoD :** bouton opérationnel sur les deux modules existants + placeholder scénario financier.

### P0-B — Recruter

Lot distinct, après validation de P0-A.

**DoD :** à définir dans son document de cadrage dédié.

### P0-C — Freeze cartographie globale

Revalider tous les boutons de la section 8 après les arbitrages produit restants.

**DoD :** mapping final approuvé avant refactor du registry.

---

## LOT 0 — Baseline et garde-fous

### Objectif

Figer le comportement réel avant refactor.

### Travaux

- inventorier `resolveIntelligenceActions`, `resolveEntityActions`, `useIntelligenceContext`, `IntelligenceFAB`, `IntelligenceActionCard`, `IntelligenceActionResultContent` ;
- lister les handlers déjà actifs ;
- vérifier les routes de `main-menu.config.ts` ;
- ajouter / compléter les tests de résolution ;
- ajouter un test de non-régression garantissant que le mode `company` continue de rendre `AccountMobileContent`.

### DoD

Aucun changement UX ; tests ciblés verts.

---

## LOT 1 — Registry au niveau Page

### Objectif

Faire de la page fonctionnelle l’unique niveau de sélection des actions du Cockpit générique.

### Travaux

- consolider les sous-routes Engagements sous une même famille ;
- consolider les sous-routes Équipe ;
- ajouter `/prospection-intelligence`, `/reports`, `/knowledge`, `/automations` ;
- appliquer la cartographie figée en P0-C ;
- réduire le fallback `COMMON_ACTION_IDS` ;
- préserver les statuts `active` / `coming_soon` ;
- **ne pas modifier la résolution du Cockpit compte**.

### DoD

Chaque page fonctionnelle renvoie son jeu stable ; les onglets ne changent rien ; compte spécialisé inchangé.

---

## LOT 2 — Rendu mobile générique contextualisé

### Objectif

Remplacer le menu mobile générique codé en dur par le rendu du registry.

### Travaux

- refactor ciblé de `RegistryMobileContent` ;
- header générique canonique ;
- carte de contexte ;
- grille d’actions issue du registry ;
- suppression du fallback générique actuel ;
- conservation stricte de `AccountMobileContent`.

### DoD

Le Cockpit générique est contextualisé par page ; le Cockpit compte est visuellement et fonctionnellement inchangé.

---

## LOT 3 — Contextes d’entités hors compte

### Objectif

Fiabiliser les labels et IDs des pages détail sans multiplier les mappings.

### Travaux

- opportunité ;
- mission / projet ;
- collaborateur ;
- candidat ;
- document ;
- secteur / événement si nécessaire.

Réutiliser `useIntelligenceContext` sans nouveau store.

### DoD

La carte de contexte affiche le vrai libellé métier et les handlers reçoivent les bons IDs.

---

## LOT 4 — Raccordement des handlers

### Objectif

Brancher les actions du registry sur les capacités déjà existantes.

Ordre de préférence :

1. résultat déterministe existant ;
2. composer / modal existant ;
3. deep-link existant ;
4. `coming_soon` explicite si capacité absente.

Aucun nouveau workflow n8n n’est créé uniquement pour compléter le panneau.

### DoD

Chaque action `active` produit un comportement réel ; aucune action factice.

---

## LOT 5 — QA Mobile et documentation

### Parcours QA minimum

- Cockpit ;
- Agenda ;
- CRM ;
- Besoins & Staffing ;
- Engagements ;
- BI ;
- Prospection Intelligence ;
- Rapports ;
- Veille ;
- Équipe ;
- Recrutement ;
- Finance ;
- Knowledge ;
- Automatisations ;
- Paramètres ;
- **Cockpit compte : contrôle explicite de non-régression**.

### DoD final

- contextualisation au niveau page uniquement ;
- aucun état d’onglet ;
- compte spécialisé intact ;
- titres métier précis hors compte ;
- actions actives réellement fonctionnelles ;
- aucun changement Supabase / n8n non justifié ;
- typecheck, tests ciblés, tests globaux pertinents et build verts ;
- handoff final documenté.

---

# 11. Hors périmètre

- refonte du Cockpit Intelligence des comptes ;
- implémentation du bouton Recruter dans le lot Simuler ;
- moteur « scénarios financiers » dans le lot Simuler ;
- redesign Desktop ;
- registry par onglet ;
- nouveau store global ;
- nouvelle table de configuration des actions ;
- nouveaux workflows n8n créés uniquement pour la navigation du panneau ;
- activation artificielle d’actions non développées.

---

# 12. Ordre de travail canonique

```text
P0-A Simuler
→ validation
→ P0-B Recruter
→ validation
→ P0-C Freeze cartographie
→ Lot 0 Baseline
→ Lot 1 Registry Page
→ Lot 2 Rendu mobile
→ Lot 3 Contextes entités
→ Lot 4 Handlers
→ Lot 5 QA / Handoff
```

Ne pas lancer le chantier principal avant validation des deux pré-chantiers et du freeze de cartographie.
