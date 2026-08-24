# Cockpit Intelligence Mobile — Actions contextuelles et modules par page

**Statut :** Cadrage v0.3 — matrice Actions / Modules définie, freeze final à confirmer  
**Date :** 24/08/2026  
**Périmètre principal :** panneau latéral / drawer mobile « Cockpit Intelligence » hors Cockpit Intelligence des comptes  
**Repo :** `guillaumekachanine-dev/kredo_sales_app`  
**Branche de référence :** `main`

---

# 1. Objectif du chantier principal

Refondre le panneau mobile **Cockpit Intelligence générique** pour proposer, sur chaque page fonctionnelle, un accès court et cohérent aux capacités les plus utiles.

Le panneau est désormais structuré en **3 sections canoniques** :

1. **Actions contextuelles** — propres à la page fonctionnelle consultée ;
2. **Modules** — propres à cette même page ;
3. **Raccourcis** — ligne fixe de 4 accès vers des pages retirées du futur menu de navigation mobile principal.

Règles fondamentales :

> **La page fonctionnelle est l’unité de contextualisation. Les onglets internes ne modifient ni les Actions ni les Modules.**

> **Le Cockpit Intelligence d’un compte reste une expérience spécialisée et hors périmètre de cette refonte générique.**

---

# 2. Exclusion absolue — Cockpit Intelligence d’un compte

Les pages `/prospection/accounts/[companyId]` possèdent déjà un Cockpit Intelligence mobile spécifique et contextualisé au compte.

Cette expérience reste **hors périmètre du chantier principal**.

Le chantier générique ne doit pas :

- remplacer `AccountMobileContent` par le rendu registry générique ;
- modifier sa structure actuelle ;
- modifier ses actions spécialisées ;
- lui appliquer la matrice Actions / Modules de ce document ;
- utiliser cette page comme terrain de refactor du registry générique.

## Pré-chantiers Cockpit compte

### P0-A — Simuler

**Statut : TERMINÉ ET VALIDÉ.**

Le bouton donne accès à :

- Modélisation financière AT ;
- Coûts des automatisations / simulateur de cadence ;
- Scénarios financiers de revenus — placeholder dans l’attente du module futur.

### P0-B — Recruter

**Statut : TERMINÉ ET VALIDÉ.**

Le bouton donne accès à :

- Besoins & environnement technique du compte, avec provenance et confiance ;
- Matching profils sur besoin existant ou besoin personnalisé temporaire.

Ces deux fonctionnalités sont désormais considérées comme une baseline protégée contre les régressions.

---

# 3. Contrat UI canonique du Cockpit générique

## 3.1 Header

Le header contient uniquement :

**Cockpit Intelligence**

Règles :

- libellé en `brand-brass` / jaune KREDO ;
- bouton de fermeture à droite ;
- aucun nom de page dans le header ;
- aucun nom d’entité dans le header.

Cette règle ne s’applique pas au Cockpit compte spécialisé.

## 3.2 Carte de contexte

Immédiatement sous le header :

- titre principal = contexte métier le plus précis disponible ;
- libellé secondaire = famille / type.

Priorité :

```text
entityContext.label
→ contexte métier de page disponible
→ label canonique de route
```

L’entité enrichit le contexte d’exécution mais ne change pas la famille d’Actions / Modules.

## 3.3 Section 1 — Actions contextuelles

Les Actions sont des **commandes métier** : analyser, générer, prioriser, préparer, matcher, prévoir, déclencher, organiser, etc.

Règles :

- propres à chaque page fonctionnelle ;
- stables quel que soit l’onglet interne ;
- 3 à 4 actions en cible lorsque le besoin le justifie ;
- grille mobile 2 colonnes ;
- touch targets ≥ 44 px ;
- aucune action factice : capacité absente = `coming_soon` ou placeholder explicite.

## 3.4 Section 2 — Modules

Les Modules sont des **surfaces fonctionnelles interactives** accessibles depuis la page courante : mini-workspace, vue métier, simulateur, bibliothèque, planning, atlas, etc.

Ils ne doivent pas devenir de simples doublons de navigation.

Règles :

- propres à chaque page ;
- stables quel que soit l’onglet ;
- privilégier la réutilisation des composants existants ;
- sur mobile, utiliser un composant dédié / light si le module Desktop est lourd ;
- ne jamais monter un composant Desktop lourd pour le masquer en CSS ;
- un module non développé reste explicitement à venir.

## 3.5 Section 3 — Raccourcis fixes

Afficher en bas du panneau une **ligne fixe de 4 petits boutons carrés** :

| Libellé mobile | Destination |
|---|---|
| **Documents** | `/reports` — page « Rapports & Rédaction » |
| **KB** | `/knowledge` — Knowledge Hub |
| **Workflows** | `/automations` — Automatisations |
| **Paramètres** | `/settings` |

Principes :

- cette ligne est commune aux Cockpits génériques ;
- ces raccourcis compensent leur absence du futur menu mobile principal ;
- ils sont de simples accès de navigation et ne font pas partie du registry métier des Actions ;
- conserver les 4 positions stables sur toutes les pages ;
- si le raccourci correspond à la page courante, conserver sa position et afficher un état actif/non navigant plutôt que modifier la géométrie.

Sur les pages sans Actions / Modules, notamment Knowledge Hub et Paramètres, ne pas afficher de section vide : la ligne de raccourcis reste disponible.

---

# 4. Matrice produit Actions / Modules — v0.3

> Cette matrice remplace la baseline précédente. Elle constitue désormais la référence produit de travail avant le freeze final P0-C.

| Page fonctionnelle | Actions contextuelles | Modules |
|---|---|---|
| **Cockpit** | Priorités · Brief hebdomadaire · Insights pipeline · Organiser la prospection **(à venir)** | Modélisation financière · Activité & congés **(module à créer : consultants, activité, congés prévus, fermetures de site, rentabilité)** |
| **Agenda** | Préparer la journée · Préparer un RDV · Répartir la charge | Métriques activité · Rédiger |
| **Besoins & Staffing** | Prioriser le pipeline · Matcher les profils · Modélisation financière · Préparer un candidat | Initier un devis |
| **Engagements** | Intel Mission : Analyser les prestations · Détecter les risques · Prévoir le CA · Anticiper les échéances **(runway des engagements)** | Atlas du portefeuille · Activité & congés |
| **Business Intelligence** | Générer une analyse · Prioriser les fenêtres commerciales · Paramétrer la veille | Bibliothèque **(consulter les documents)** · Playbooks |
| **Prospection Intelligence** | Organiser la prospection · Générer synthèse / analyse · Construire une approche · Créer une campagne | Playbooks · Agenda **(module light)** |
| **Rapports & Rédaction** | Générer un document · Analyse transverse **(analyse personnalisée avec 3 sources)** · Regroupement thématique **(classement automatique selon un critère utilisateur : thème, client, actualité, date, etc.)** | Gestion de la connaissance |
| **Veille & Actualités** | Déclenchement manuel · Intel Mission : Analyse mensuelle de la veille · Analyse transverse · Suggérer des actions **(ex. convertir en fenêtre d’opportunité, contacter une personne sur un signal, ajouter au corpus sectoriel)** | Gestion des sources informationnelles · Gestion de la connaissance |
| **Équipe** | Anticiper les disponibilités · Compétences VS besoins · Matcher les profils · Identifier les écarts **(faible rentabilité, absences, etc.)** | Pool de compétences **(transformer la page actuelle en module interactif)** |
| **Recrutement** | Analyser le funnel · Candidats VS besoins · Préparer une communication candidat · Matching profil | Métriques activité · Planning de recrutement |
| **Finance** | Intel Mission : Analyser les marges · Prévoir le CA · Identifier les écarts · Modélisation forecast | Atlas portefeuille · Activité & congés |
| **Knowledge Hub** | Aucune action | Aucun module défini |
| **Automatisations** | Générer un rapport · Analyser la fiabilité · Analyser les coûts · Prioriser les corrections | Métriques · Simuler la cadence |
| **Paramètres** | Aucune action | Aucun module défini |

## Point restant à arbitrer

La page **CRM — Comptes & Contacts** figurait dans la matrice précédente mais n’est pas définie dans cette nouvelle matrice produit.

Conséquence :

- ne pas inventer son mapping pendant l’implémentation ;
- la conserver comme **point ouvert P0-C** tant qu’une décision produit explicite n’a pas été donnée.

Le Cockpit Intelligence spécialisé d’un compte reste, lui, explicitement hors matrice globale.

---

# 5. Distinction fonctionnelle à préserver

## Action contextuelle

Une Action répond à une intention immédiate :

```text
Prioriser
Analyser
Préparer
Générer
Matcher
Prévoir
Déclencher
Organiser
```

Elle déclenche un traitement ou ouvre un flow orienté résultat.

## Module

Un Module ouvre une surface fonctionnelle réutilisable :

```text
Modélisation financière
Atlas portefeuille
Activité & congés
Playbooks
Bibliothèque
Planning
Métriques
Gestion de la connaissance
```

Il peut être interactif et persistant, mais il ne constitue pas une nouvelle page métier dans la taxonomie du Cockpit.

## Raccourci

Un Raccourci est uniquement un accès de navigation vers :

```text
Documents
KB
Workflows
Paramètres
```

Cette distinction doit rester explicite dans le code et dans le design.

---

# 6. Architecture cible

```text
pathname
   ↓
route → page family
   ↓
PAGE_COCKPIT_CONFIG
   ├─ actions[]
   └─ modules[]
   +
entityContext optionnel
   +
MOBILE_COCKPIT_SHORTCUTS fixes
   ↓
Cockpit Intelligence générique Mobile
```

## Source de vérité

`src/lib/intelligence/intelligence-registry.ts` reste la source canonique du Cockpit générique.

Le modèle cible doit permettre de représenter, par famille de page :

```ts
{
  label: string
  actionIds: string[]
  moduleIds: string[]
}
```

Les 4 raccourcis fixes doivent rester une configuration transverse séparée du mapping métier, sans créer un second registry concurrent.

## Matching des routes

Le resolver doit être :

- boundary-aware ;
- déterministe ;
- basé sur la route fonctionnelle ;
- insensible aux onglets internes.

Éviter un `startsWith()` naïf pouvant confondre des routes proches comme `/prospection` et `/prospection-intelligence`.

Les routes les plus spécifiques doivent être résolues avant leur parent.

## Contextes d’entité

Réutiliser `useIntelligenceContext` pour :

- `entityType` ;
- `entityId` ;
- `label` ;
- IDs nécessaires aux handlers.

Ne pas créer de store d’onglet ou de second store Cockpit.

---

# 7. Data / Supabase / n8n

## Data

La cartographie Actions / Modules elle-même ne nécessite :

- aucune nouvelle table ;
- aucune migration ;
- aucun changement RLS ;
- aucun RPC de configuration UI.

Chaque Action ou Module métier devra ensuite réutiliser sa source de données canonique.

## n8n

Le simple routage du panneau ne doit jamais créer un workflow n8n.

Les traitements longs ou IA réellement nécessaires à certaines capacités pourront utiliser les workflows existants ou faire l’objet de chantiers dédiés.

## Règle anti-faux comportement

Une entrée peut être visible si elle représente une capacité produit planifiée, mais son état doit être explicite :

- `active` si réellement fonctionnelle ;
- `coming_soon` / placeholder si non livrée.

Ne jamais produire de résultat simulé pour donner l’impression qu’une feature existe.

---

# 8. Desktop / Mobile

## Desktop

Le chantier est Mobile-only côté rendu.

Desktop peut servir de référence fonctionnelle pour retrouver :

- composants existants ;
- handlers ;
- données ;
- règles métier.

Ne pas refondre les surfaces Desktop dans ce chantier.

## Mobile

Le panneau mobile doit utiliser :

- composants dédiés ;
- modules light lorsque nécessaire ;
- touch targets ≥ 44 px ;
- structure compacte ;
- aucun graceful degradation d’un composant Desktop lourd.

---

# 9. Capacités explicitement futures ou à transformer

La matrice produit identifie déjà plusieurs capacités qui ne doivent pas être maquillées en fonctionnalités existantes :

- **Organiser la prospection** depuis Cockpit — à venir ;
- **Activité & congés** — module transverse à créer ;
- **Regroupement thématique** des documents — fonctionnalité à implémenter ;
- **Agenda light** pour Prospection Intelligence — module mobile dédié à cadrer ;
- **Pool de compétences** — page actuelle à transformer en module interactif.

Le statut réel de toutes les autres entrées doit être audité en Lot 0 avant activation.

---

# 10. Roadmap d’implémentation

## PHASE PRÉLIMINAIRE

### P0-A — Simuler

**Statut : TERMINÉ / VALIDÉ.**

### P0-B — Recruter

**Statut : TERMINÉ / VALIDÉ.**

### P0-C — Freeze final de la matrice

**Statut : EN ATTENTE DE VALIDATION FINALE.**

Travaux :

- valider la matrice Actions / Modules de la section 4 ;
- arbitrer le cas CRM — Comptes & Contacts ;
- confirmer les intitulés mobiles finaux ;
- confirmer le statut `active` / `coming_soon` attendu de chaque entrée.

**DoD :** matrice figée avant tout refactor du registry.

---

## LOT 0 — Audit de readiness et garde-fous

### Objectif

Établir la correspondance exacte entre la matrice produit et l’état réel du code avant modification.

### Travaux

1. Inventorier :
   - `resolveIntelligenceActions` ;
   - `resolveEntityActions` ;
   - `useIntelligenceContext` ;
   - `IntelligenceFAB` ;
   - composants de résultats ;
   - composers / modales / modules réutilisables.
2. Pour chaque Action de la matrice, classer :
   - existante et réutilisable ;
   - existante mais à adapter ;
   - à créer ;
   - future / placeholder.
3. Faire la même chose pour chaque Module.
4. Identifier les sources de données et handlers existants.
5. Vérifier les routes réelles via `main-menu.config.ts`.
6. Ajouter / compléter les tests de résolution de routes.
7. Ajouter un garde-fou de non-régression du mode `company` / `AccountMobileContent`.

### DoD

- inventaire Action / Module exhaustif ;
- statuts techniques documentés ;
- aucune modification UX ;
- aucun changement Supabase / n8n ;
- tests ciblés verts.

---

## LOT 1 — Registry Page : Actions + Modules

### Objectif

Faire du registry la source unique de la configuration métier du Cockpit générique.

### Travaux

1. Introduire la notion de `moduleIds` aux côtés des `actionIds`.
2. Consolider les sous-routes d’une même page fonctionnelle.
3. Ajouter les pages manquantes du registry.
4. Appliquer la matrice P0-C figée.
5. Supprimer la dépendance au fallback générique codé en dur.
6. Conserver une configuration transverse pour les 4 raccourcis fixes.
7. Implémenter un matching boundary-aware des routes.
8. Ne pas toucher à la résolution du Cockpit compte spécialisé.

### Tests

- chaque page renvoie ses Actions exactes ;
- chaque page renvoie ses Modules exacts ;
- changement d’onglet = même configuration ;
- `/prospection` ne capture pas `/prospection-intelligence` ;
- compte spécialisé inchangé ;
- pages sans Action gérées proprement.

### DoD

Le registry représente toute la matrice sans logique parallèle mobile.

---

## LOT 2 — Structure UI mobile en 3 sections

### Objectif

Remplacer le menu générique actuel par le contrat UI canonique.

### Travaux

1. Header générique canonique.
2. Carte de contexte.
3. Section **Actions contextuelles**.
4. Section **Modules**.
5. Ligne fixe **Documents / KB / Workflows / Paramètres**.
6. Ne pas afficher de titre de section vide.
7. État actif/non navigant du raccourci correspondant à la page courante.
8. Suppression du fallback `Plus d’actions` universel.
9. Conservation stricte de `AccountMobileContent`.

### DoD

- architecture visuelle identique sur toutes les pages génériques ;
- contenu Actions / Modules réellement contextualisé ;
- raccourcis fixes cohérents ;
- Cockpit compte visuellement et fonctionnellement inchangé.

---

## LOT 3 — Raccordement des Modules

### Objectif

Brancher les Modules déjà existants avant de développer les nouveaux.

### Ordre de préférence

1. composant mobile existant ;
2. composant partagé léger ;
3. adapter / extraire une surface mobile dédiée ;
4. placeholder explicite si module non encore développé.

### Travaux

Auditer puis raccorder en priorité les modules déjà disponibles, notamment :

- Modélisation financière ;
- Playbooks ;
- Bibliothèque ;
- Gestion de la connaissance ;
- Gestion des sources ;
- Simulateur de cadence ;
- métriques existantes lorsqu’elles sont déjà disponibles.

Ne pas développer dans ce lot les gros modules futurs uniquement pour remplir la matrice.

### DoD

Chaque Module marqué `active` ouvre une vraie surface fonctionnelle ; aucun composant Desktop lourd monté sur mobile.

---

## LOT 4 — Raccordement des Actions contextuelles

### Objectif

Brancher les Actions sur les handlers et moteurs existants, puis identifier les chantiers manquants.

### Ordre de préférence

1. résultat déterministe existant ;
2. Intel Mission existante ;
3. composer / modal existant ;
4. deep-link uniquement si c’est réellement le comportement produit attendu ;
5. `coming_soon` si capacité non développée.

### Travaux

- raccorder les actions déjà opérationnelles ;
- injecter les bons contextes de page / entité ;
- préserver les contrats existants ;
- ne pas créer un nouveau workflow n8n pour une simple action déterministe ;
- lister séparément les capacités nécessitant un chantier métier dédié.

### DoD

Chaque Action `active` produit un comportement réel et contextuel ; aucune Action factice.

---

## LOT 5 — Contextes d’entités et fiabilisation

### Objectif

Fiabiliser les labels, IDs et préremplissages sans créer une seconde taxonomie.

### Périmètre potentiel

- opportunité ;
- mission / projet ;
- collaborateur ;
- candidat ;
- document ;
- secteur ;
- événement si nécessaire.

### DoD

- carte de contexte précise ;
- handlers correctement préremplis ;
- aucune dépendance à l’onglet actif ;
- aucun nouveau store global.

---

## LOT 6 — QA Mobile et handoff

### Parcours QA minimum

- Cockpit ;
- Agenda ;
- Besoins & Staffing ;
- Engagements ;
- Business Intelligence ;
- Prospection Intelligence ;
- Rapports & Rédaction ;
- Veille & Actualités ;
- Équipe ;
- Recrutement ;
- Finance ;
- Knowledge Hub ;
- Automatisations ;
- Paramètres ;
- CRM si son mapping est arbitré en P0-C ;
- Cockpit compte : contrôle explicite de non-régression.

### Vérifications transverses

- Actions conformes à la matrice ;
- Modules conformes à la matrice ;
- raccourcis fixes présents ;
- état actif du raccourci courant ;
- aucun changement sur changement d’onglet ;
- contexte d’entité correct ;
- aucune action active factice ;
- aucun composant Desktop lourd sur mobile ;
- aucun changement Supabase / n8n non justifié.

### DoD final

- typecheck vert ;
- tests ciblés verts ;
- suite globale pertinente verte ;
- server-boundary vert ;
- build production vert ;
- handoff final documenté.

---

# 11. Hors périmètre

- refonte du Cockpit Intelligence des comptes ;
- modification des boutons Simuler / Recruter du Cockpit compte validés ;
- redesign Desktop ;
- registry par onglet ;
- nouveau store d’onglet ;
- nouvelle table de configuration UI ;
- workflow n8n créé uniquement pour router un bouton ;
- développement implicite de toutes les capacités futures dans le chantier de structure ;
- activation artificielle d’une feature absente.

---

# 12. Ordre de travail canonique

```text
P0-A Simuler ✅
→ P0-B Recruter ✅
→ P0-C Freeze final matrice
→ Lot 0 Audit readiness
→ Lot 1 Registry Actions + Modules
→ Lot 2 UI 3 sections + raccourcis
→ Lot 3 Modules existants
→ Lot 4 Actions contextuelles
→ Lot 5 Contextes entités
→ Lot 6 QA / Handoff
```

Ne pas lancer le refactor principal avant validation explicite de P0-C.