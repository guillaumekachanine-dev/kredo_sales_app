# Cockpit Intelligence Mobile — Actions contextuelles par page

**Statut :** Cadrage initial  
**Date :** 23/08/2026  
**Périmètre :** panneau latéral / drawer mobile « Cockpit Intelligence »  
**Repo :** `guillaumekachanine-dev/kredo_sales_app`  
**Branche de référence :** `main`

---

## 1. Objectif du chantier

Refondre le panneau mobile **Cockpit Intelligence** pour restaurer sa fonction d’origine : proposer des **actions réellement contextualisées à la page consultée**.

Le niveau de contextualisation retenu est volontairement simple :

> **1 page fonctionnelle = 1 jeu stable de 3 à 4 actions prioritaires.**

Les onglets internes d’une page ne modifient pas les actions du panneau. Ils appartiennent à la même famille d’activité et doivent partager les mêmes capacités principales.

Une entité ouverte (compte, opportunité, mission, candidat, document, etc.) peut enrichir le **contexte d’exécution** et le **titre affiché**, mais ne doit pas créer une nouvelle taxonomie d’actions si elle appartient déjà à une page fonctionnelle couverte.

---

## 2. Problème actuel

Le projet possède déjà une architecture de contextualisation :

- `src/lib/intelligence/intelligence-registry.ts` contient les actions et leur résolution par route ;
- `src/hooks/use-intelligence-context.ts` transporte un contexte d’entité (`entityType`, `entityId`, `label`, `pathname`) ;
- `src/components/intelligence/IntelligenceFAB.tsx` sait rendre plusieurs variantes du panneau mobile ;
- plusieurs actions déterministes sont déjà actives et possèdent leur composant de résultat ;
- le Cockpit compte possède déjà une variante mobile riche et réellement contextualisée.

Le problème vient principalement de la dérive du rendu mobile : une partie des pages retombe sur une logique générique / codée en dur au lieu d’exploiter systématiquement la cartographie canonique.

Le registre lui-même a également dérivé :

- il descend trop bas sur certaines sous-routes (`/missions/actives`, `/missions/projets`, `/consultants/pool-competences`, etc.) ;
- plusieurs pages récentes ne disposent pas encore d’une cartographie satisfaisante (`/prospection-intelligence`, `/reports`, `/knowledge`, `/automations`) ;
- certaines actions historiques sont encore présentes mais ne correspondent plus au meilleur niveau de synthèse produit.

---

## 3. Décisions de cadrage

### D-1 — La page est l’unité de contextualisation

Le Cockpit Intelligence ne doit **pas** suivre l’onglet actif.

Exemples :

- `Engagements` conserve le même jeu d’actions sur Synthèse, Missions et Projets ;
- `Équipe` conserve le même jeu d’actions sur Synthèse, Pool de compétences et Activité & congés ;
- `Business Intelligence` conserve le même jeu d’actions sur ses six chapitres ;
- `Rapports & Rédaction` conserve le même jeu d’actions sur Documents, Connaissances et Générer.

Aucun `contextKey`, store d’onglet ou synchronisation supplémentaire n’est nécessaire.

### D-2 — L’entité précise le contexte, pas la famille fonctionnelle

Quand une entité est ouverte, le panneau doit utiliser son libellé métier réel :

- `Migration Cloud Azure — Eiffage` plutôt que `Opportunité` ;
- `Marie Dupont` plutôt que `Collaborateur` ;
- `Master Study — Travaux publics` plutôt que `Document`.

L’entité sert à :

- alimenter la carte de contexte ;
- préremplir les actions ;
- transmettre les bons IDs aux handlers existants ;
- améliorer le deep-linking.

Elle ne doit pas introduire une seconde source de vérité pour choisir les actions.

### D-3 — Réutiliser le registre existant

`intelligence-registry.ts` reste la source unique de vérité des actions du panneau.

Le chantier ne doit pas créer :

- un second registre mobile ;
- un mapping par onglet ;
- un nouveau store global ;
- une nouvelle table Supabase ;
- un nouveau workflow n8n uniquement pour piloter l’UI.

### D-4 — 3 à 4 actions maximum par page

Le Cockpit doit rester un outil d’action rapide.

Une action est retenue si :

1. elle répond à un besoin fréquent de la famille fonctionnelle ;
2. elle est utile quel que soit l’onglet de la page ;
3. elle peut être exécutée avec le contexte métier déjà disponible ;
4. elle ne duplique pas une autre action plus générique ;
5. elle possède déjà un handler, ou correspond à une capacité clairement planifiable sans refaire l’architecture.

Il n’est pas nécessaire de remplir artificiellement quatre cases.

### D-5 — Pas de faux comportement

Si une action sélectionnée n’est pas encore implémentée :

- conserver son statut `coming_soon` ;
- ne pas simuler un résultat ;
- ne pas créer un nouveau workflow pour rendre le bouton artificiellement actif.

Le chantier de contextualisation et le chantier d’implémentation d’une nouvelle capacité métier restent distincts.

---

## 4. Contrat UI mobile cible

### 4.1 Header

Le header du panneau contient uniquement :

**Cockpit Intelligence**

Règles :

- texte en `brand-brass` / jaune KREDO ;
- bouton de fermeture à droite ;
- aucun nom de page dans le header ;
- aucun eyebrow métier ;
- aucun nom d’entité dans le header.

### 4.2 Carte de contexte

Immédiatement sous le header, afficher une carte dédiée contenant :

- **titre principal** : libellé métier le plus précis disponible ;
- **type / famille** : petit libellé secondaire.

Exemples :

| Contexte | Titre principal | Libellé secondaire |
|---|---|---|
| CRM | Comptes & Contacts | CRM |
| Compte | Eiffage | Compte |
| Opportunité | Migration Cloud Azure — Eiffage | Opportunité |
| Engagements | Engagements | Pilotage delivery |
| Collaborateur | Marie Dupont | Collaborateur |
| Business Intelligence | BTP — Travaux publics | Business Intelligence |
| Document | Master Study — Travaux publics | Document |
| Automatisations | Automatisations | Supervision |

Priorité du titre :

```text
entityContext.label
→ contexte métier de page si disponible
→ label canonique de route
```

### 4.3 Zone Actions

Sous la carte de contexte :

- grille mobile en 2 colonnes ;
- touch targets ≥ 44 px ;
- 3 à 4 actions maximum ;
- aucun changement au passage d’un onglet à un autre ;
- labels courts et orientés action ;
- réutilisation des icônes et composants existants.

La section générique `Plus d’actions` ne doit plus servir de fallback universel. Si une page nécessite réellement une seconde section, elle doit être explicitement définie pour cette page.

---

## 5. Cartographie produit cible

| Page fonctionnelle | Actions prioritaires |
|---|---|
| **Cockpit** | Priorités d’action · Brief hebdomadaire · Insights pipeline |
| **Agenda** | Préparer la journée · RDV à préparer · Priorités d’action |
| **CRM — Comptes & Contacts** | Prioriser les comptes · Scanner les contacts · Rédiger une approche · Bilan d’activité CRM |
| **Cockpit Intelligence d’un compte** | Actualiser la connaissance · Analyse approfondie · Rédiger une approche · Roadmap commerciale |
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
| **Paramètres** | Aucune action Cockpit Intelligence |

### Cas des pages détail

Les pages détail réutilisent la famille fonctionnelle de leur page mère et injectent l’entité sélectionnée.

Exemples :

```text
/missions/opps
→ Besoins & Staffing
→ Prioriser / Matcher / Analyser / Simuler

/missions/opps/[id]
→ mêmes capacités
→ contexte = opportunité courante
```

```text
/consultants
→ Équipe
→ Activité / Compétences / Disponibilités / Matching

fiche collaborateur ouverte
→ mêmes capacités
→ contexte = collaborateur courant
```

Exception assumée : la page **Cockpit Intelligence d’un compte** est une page fonctionnelle distincte et peut conserver son expérience spécialisée actuelle, tout en adoptant le header et la carte de contexte communs.

---

## 6. Architecture cible

### 6.1 Résolution

```text
pathname
   ↓
Intelligence Registry — page family
   ↓
3–4 actions
   +
entityContext optionnel
   ↓
Cockpit Intelligence Mobile
```

### 6.2 Source de vérité

Le registre doit distinguer :

- le **mapping de page** : sélection des actions ;
- le **contexte d’entité** : libellé + IDs pour exécution ;
- le **handler d’action** : résultat inline, composer existant, modal existante ou deep-link.

Ne pas mélanger ces responsabilités.

### 6.3 Data / Supabase

Aucune évolution de schéma n’est prévue.

Les données nécessaires existent déjà dans les tables et vues actuelles : comptes, contacts, opportunités, missions, CRA, collaborateurs, candidats, matching, finance, signaux, documents, collections/corpus, runs IA et intelligence sectorielle.

Le chantier ne nécessite donc :

- aucune migration ;
- aucune nouvelle table ;
- aucun changement RLS ;
- aucun nouveau RPC uniquement pour l’affichage du panneau.

### 6.4 Desktop

Le chantier est **Mobile-first et Mobile-only côté rendu**.

Desktop sert de référence fonctionnelle pour retrouver les actions et handlers historiques.

Ne pas refondre le panneau Desktop dans ce chantier, sauf extraction technique strictement nécessaire pour partager un handler ou une définition d’action.

### 6.5 Mobile

Le mobile est la surface cible :

- rendu dédié ;
- aucun composant Desktop lourd monté puis masqué ;
- actions immédiates ;
- contexte visible ;
- hiérarchie compacte ;
- navigation et fermeture compatibles avec la bottom bar existante.

---

# 7. Roadmap d’implémentation

## LOT 0 — Baseline, inventaire et garde-fous

### Objectif

Figer le comportement actuel avant refactor et sécuriser les invariants du chantier.

### Travaux

1. Inventorier les consommateurs de :
   - `resolveIntelligenceActions` ;
   - `resolveEntityActions` ;
   - `useIntelligenceContext` ;
   - `IntelligenceFAB` ;
   - `IntelligenceActionCard` ;
   - `IntelligenceActionResultContent`.
2. Identifier les variantes mobiles actuellement rendues :
   - compte ;
   - entité générique ;
   - page générique.
3. Lister les handlers déjà opérationnels :
   - résultats déterministes ;
   - rédaction assistée ;
   - analyses ;
   - modales ;
   - deep-links.
4. Ajouter / compléter les tests de résolution de routes avant de modifier le registry.
5. Vérifier les routes réellement exposées par `main-menu.config.ts`.

### Livrable

Une baseline testée permettant de savoir précisément ce qui change dans les lots suivants.

### Definition of Done

- routes principales couvertes par tests ;
- aucune modification fonctionnelle visible ;
- aucun changement Supabase / n8n ;
- `typecheck` et tests ciblés verts.

---

## LOT 1 — Refactor du registre au niveau Page

### Objectif

Faire de la **page fonctionnelle** l’unique source de sélection des actions.

### Fichier principal

`src/lib/intelligence/intelligence-registry.ts`

### Travaux

1. Consolider les sous-routes d’une même famille.

Exemples :

```text
/missions
/missions/actives
/missions/projets
→ famille ENGAGEMENTS
```

```text
/consultants
/consultants/pool-competences
/consultants/activite-conges
→ famille TEAM
```

2. Ajouter les pages manquantes :
   - `/prospection-intelligence` ;
   - `/reports` ;
   - `/knowledge` ;
   - `/automations`.
3. Conserver les routes réellement distinctes :
   - `/prospection/accounts` = CRM ;
   - `/prospection/accounts/[companyId]` = Cockpit Intelligence compte.
4. Aligner chaque famille sur la cartographie produit de la section 5.
5. Ne créer aucune règle par onglet.
6. Réduire le rôle des `COMMON_ACTION_IDS` : ils ne doivent plus créer un menu générique identique partout.
7. Préserver les statuts `active` / `coming_soon` existants.

### Architecture recommandée

Préférer une structure simple :

```ts
PAGE_ACTIONS = {
  cockpit: [...],
  agenda: [...],
  crm: [...],
  accountCockpit: [...],
  needsStaffing: [...],
  engagements: [...],
  businessIntelligence: [...],
  prospectionIntelligence: [...],
  reports: [...],
  watch: [...],
  team: [...],
  recruitment: [...],
  finance: [...],
  knowledge: [...],
  automations: [...],
}
```

Puis conserver un mapping route → famille.

Ne pas introduire de moteur de règles supplémentaire.

### Tests

- une route de chaque page renvoie le bon jeu d’actions ;
- les sous-routes d’Engagements renvoient exactement les mêmes actions ;
- les sous-routes d’Équipe renvoient exactement les mêmes actions ;
- `/settings` ne renvoie aucune action ;
- aucune collision de préfixe entre `/prospection` et `/prospection-intelligence`.

### Definition of Done

- registre ramené à une quinzaine de familles fonctionnelles ;
- aucune logique d’onglet ;
- tests de résolution verts ;
- aucun changement UI encore requis pour valider le lot.

---

## LOT 2 — Refactor du panneau mobile et suppression du fallback générique

### Objectif

Faire consommer le registry page-level par **toutes les pages mobiles**.

### Fichier principal

`src/components/intelligence/IntelligenceFAB.tsx`

### Travaux

1. Supprimer le fallback mobile générique codé en dur comme source fonctionnelle.
2. Faire rendre les actions issues de `resolveIntelligenceActions(pathname)`.
3. Réutiliser les composants existants :
   - `IntelligenceActionCard` ;
   - composants de résultat déterministe ;
   - icônes Cockpit existantes.
4. Uniformiser le shell mobile :
   - header ;
   - carte de contexte ;
   - section Actions ;
   - éventuelle section secondaire explicitement définie.
5. Conserver le thème Cobalt / Indigo existant du panneau.
6. Ne pas refondre les handlers métiers dans ce lot.

### Header cible

```text
Cockpit Intelligence                         ×
```

- `Cockpit Intelligence` en brass ;
- aucun autre texte.

### Carte de contexte cible

```text
┌─────────────────────────────────────┐
│ Migration Cloud Azure — Eiffage     │
│ OPPORTUNITÉ                         │
└─────────────────────────────────────┘
```

### Definition of Done

- aucune page mobile ne retombe sur un menu d’actions générique codé en dur ;
- les actions correspondent à la page ;
- changer d’onglet ne change pas les actions ;
- header conforme ;
- carte de contexte présente ;
- comportement Desktop inchangé.

---

## LOT 3 — Contexte d’entité et libellés métier précis

### Objectif

Afficher le bon objet métier et fournir son ID aux actions sans laisser l’entité piloter la taxonomie.

### Sources existantes

`src/hooks/use-intelligence-context.ts`

`src/components/intelligence/RegisterIntelligenceContext.tsx`

### Travaux

1. Conserver `entityContext` comme contexte léger :

```ts
{
  entityType,
  entityId,
  label,
  pathname,
}
```

2. Généraliser l’enregistrement du contexte aux pages détail qui en ont besoin.
3. Ne pas ajouter :
   - activeTab ;
   - chapter ;
   - subView ;
   - contextKey.
4. S’assurer que le label correspond à la donnée métier réelle.
5. Prioriser `entityContext.label` dans la carte de contexte.
6. Transmettre `entityId` / `entityType` aux handlers qui savent les exploiter.
7. Faire en sorte qu’un changement d’entité mette immédiatement à jour le contexte sans conserver l’ancienne entité.

### Entités prioritaires

- company ;
- opportunity ;
- mission ;
- project ;
- collaborator ;
- candidate ;
- contact ;
- sector lorsque pertinent ;
- calendar_event ;
- document si une vue détail du panneau doit le supporter.

### Choix d’implémentation

Réutiliser le composant d’enregistrement existant si sa généralisation reste simple.

Sinon, créer un registrar générique minimal dédié au store. Ne pas créer de nouveau Context React global.

### Definition of Done

- la carte affiche le nom réel de l’entité ;
- aucune action n’est choisie via `entityType` seule ;
- les actions héritent toujours de la page fonctionnelle ;
- aucun état périmé après navigation.

---

## LOT 4 — Raccordement des actions sélectionnées aux capacités existantes

### Objectif

Faire en sorte que chaque bouton retenu utilise le meilleur handler existant, sans dupliquer les fonctionnalités.

### Principe

Pour chaque action de la cartographie :

```text
1. handler existant inline ? → réutiliser
2. composer / modal existante ? → ouvrir
3. destination fonctionnelle existante ? → deep-link
4. capacité non implémentée ? → coming_soon
```

### Réutilisations prioritaires

- actions déterministes via `IntelligenceActionResultContent` ;
- `openCommunicationComposer` pour rédaction / approche / communication ;
- moteurs de simulation financière existants ;
- analyse de veille / mission composer existant ;
- modales compte existantes ;
- Knowledge collections / corpus existants ;
- drill-down des runs d’automatisation existant.

### Contraintes

- aucun faux résultat ;
- aucun nouveau workflow n8n pour un simple calcul ou deep-link ;
- aucune nouvelle table ;
- aucune duplication de la rédaction assistée INTEL-020 ;
- aucune duplication du moteur financier TypeScript.

### Definition of Done

- chaque action `active` possède un comportement réel ;
- chaque action non disponible est explicitement `coming_soon` ;
- aucun bouton actif sans handler ;
- les handlers reçoivent le contexte de page / entité attendu.

---

## LOT 5 — QA mobile, non-régression et documentation finale

### Objectif

Valider le comportement sur les familles de pages réelles et fermer le chantier proprement.

### QA fonctionnelle

Tester au minimum :

1. Cockpit ;
2. Agenda ;
3. CRM liste ;
4. Cockpit compte ;
5. Besoins & Staffing ;
6. opportunité détail ;
7. Engagements Synthèse ;
8. Engagements Missions ;
9. Engagements Projets ;
10. Business Intelligence sur plusieurs chapitres ;
11. Rapports sur les 3 sections ;
12. Veille ;
13. Équipe sur les 3 onglets ;
14. Recrutement ;
15. Finance ;
16. Knowledge Hub ;
17. Automatisations ;
18. Paramètres.

### Invariants à vérifier

- les actions ne changent pas avec l’onglet ;
- le titre de contexte change avec l’entité ;
- aucune action d’une page précédente ne fuit après navigation ;
- fermeture / réouverture du drawer correcte ;
- bottom navigation non cassée ;
- touch targets ≥ 44 px ;
- aucun composant Desktop lourd monté sur mobile ;
- aucune régression du Cockpit compte.

### Validations techniques

Au minimum :

```bash
npm run typecheck
npm run lint
npm test
```

Ajouter des tests ciblés sur :

- `intelligence-registry` ;
- résolution de page ;
- contexte d’entité ;
- rendu du panneau mobile si l’infrastructure de test existante le permet.

### Documentation finale

Mettre à jour ce dossier avec :

- cartographie finale réellement livrée ;
- fichiers modifiés ;
- actions laissées `coming_soon` ;
- résultats de tests ;
- éventuelles dettes hors périmètre.

### Definition of Done

- QA mobile validée sur viewport iPhone 14 / 390 × 844 ;
- tests verts ;
- Desktop non régressé ;
- documentation synchronisée avec le code ;
- aucun changement Supabase / n8n non justifié.

---

## 8. Hors périmètre explicite

Ce chantier ne doit pas devenir une refonte générale de l’Intelligence KREDO.

Hors périmètre :

- refaire les pages Desktop ;
- implémenter toutes les actions `coming_soon` ;
- créer un Copilot transverse ;
- créer une taxonomie par onglet ;
- refondre INTEL-020 ;
- refondre le moteur de modélisation financière ;
- modifier les Master Studies ;
- modifier la logique métier des pages ;
- créer de nouveaux workflows n8n sans besoin métier autonome ;
- introduire une nouvelle dépendance UI ou data-viz.

---

## 9. Ordre recommandé d’exécution

```text
LOT 0 — Baseline / tests
        ↓
LOT 1 — Registry page-level
        ↓
LOT 2 — Shell mobile + suppression fallback générique
        ↓
LOT 3 — Contexte d’entité précis
        ↓
LOT 4 — Raccordement handlers
        ↓
LOT 5 — QA + documentation finale
```

Les Lots 1 et 2 constituent le **cœur de la correction**.

Le Lot 3 améliore la précision contextuelle sans augmenter la taxonomie.

Le Lot 4 doit rester strictement opportuniste : réutiliser ce qui existe et ne pas transformer ce chantier UI/UX en programme de développement de nouvelles features IA.

---

## 10. Critères d’acceptation globaux

Le chantier est terminé lorsque :

1. le Cockpit Intelligence mobile est contextuel sur toutes les pages fonctionnelles ;
2. chaque page possède au maximum 3 à 4 actions prioritaires ;
3. les onglets ne modifient pas la liste d’actions ;
4. les sous-pages d’une même famille partagent la même cartographie ;
5. la carte de contexte affiche le titre métier le plus précis disponible ;
6. le header contient uniquement `Cockpit Intelligence` en brass ;
7. le fallback mobile générique codé en dur n’est plus la source fonctionnelle du panneau ;
8. le registry reste la source unique de vérité ;
9. l’entité enrichit le contexte sans devenir un second registre ;
10. les handlers existants sont réutilisés avant toute nouvelle implémentation ;
11. aucune migration Supabase n’est requise pour ce chantier ;
12. aucun nouveau workflow n8n n’est requis pour ce chantier ;
13. Desktop reste fonctionnel sans refonte ;
14. les tests et la QA mobile sont verts.

---

## 11. Fichiers principaux à auditer / modifier

### Cœur du chantier

- `src/components/intelligence/IntelligenceFAB.tsx`
- `src/lib/intelligence/intelligence-registry.ts`
- `src/hooks/use-intelligence-context.ts`
- `src/components/intelligence/RegisterIntelligenceContext.tsx`
- `src/components/intelligence/IntelligenceActionCard.tsx`
- `src/components/intelligence/action-results/IntelligenceActionResultContent.tsx`

### Références de navigation

- `src/lib/navigation/main-menu.config.ts`

### Références fonctionnelles à réutiliser

- Cockpit Intelligence compte ;
- communication / INTEL-020 ;
- actions déterministes ;
- financial modeling ;
- watch analysis / intelligence missions ;
- Knowledge collections ;
- Automations drill-down.

---

## 12. Conclusion

La correction recherchée n’exige pas une nouvelle architecture.

Le système existe déjà : registry, store de contexte, handlers, composants de résultat et variantes mobiles.

Le chantier consiste essentiellement à :

1. **ramener la cartographie au bon niveau : la page ;**
2. **faire du registry la vraie source du rendu mobile ;**
3. **supprimer le fallback générique qui dilue la contextualisation ;**
4. **afficher un contexte métier précis sous un header minimal ;**
5. **réutiliser les capacités déjà implémentées.**

C’est volontairement une refonte légère, adaptée à l’existant et sans sur-ingénierie.
