# KREDO — Page Prospection
## Note de pré-cadrage

**Date :** 24/08/2026  
**Statut :** Pré-cadrage fonctionnel — avant conception détaillée et implémentation  
**Dossier canonique :** `docs/FEATURES/page_prospection/`

---

# 1. Objet du chantier

La page **Prospection** doit devenir le **poste de commandement de l’activité de prospection intelligente** de KREDO.

Elle ne doit pas produire une nouvelle couche de connaissance, ni dupliquer Business Intelligence, le Cockpit Intelligence, le CRM, l’Agenda, les Playbooks ou la Rédaction assistée.

Sa responsabilité est différente :

> **Transformer la connaissance existante en décisions commerciales concrètes, puis organiser et piloter leur exécution.**

La page doit permettre au commercial de répondre rapidement à trois questions :

1. **Où agir maintenant ?**
2. **Comment adresser le compte ?**
3. **Est-ce que l’activité de prospection est correctement exécutée ?**

---

# 2. Positionnement fonctionnel dans KREDO

La séparation cible est la suivante :

- **Business Intelligence** = comprendre le marché et les segments.
- **Cockpit Intelligence compte** = comprendre un compte.
- **Prospection** = décider qui adresser, comment et quand.
- **CRM / Agenda** = enregistrer les actions réalisées et planifiées.

Prospection est donc un **workspace transverse et portfolio-wide**, volontairement non limité à un secteur ou à un segment métier.

Contrairement à Business Intelligence, désormais mono-segment, Prospection doit comparer les opportunités commerciales **entre tous les comptes du portefeuille**.

---

# 3. Baseline technique actuelle

## 3.1 Page existante

La page technique actuellement exploitable est :

`src/app/(app)/prospection-intelligence/page.tsx`

Elle charge aujourd’hui :

- `getBusinessIntelligenceSnapshot()` ;
- `buildBusinessIntelligenceDesktopModel()` ;
- `ProspectionIntelligenceDesktop`.

La version Mobile est encore un placeholder.

La route :

`src/app/(app)/prospection/page.tsx`

redirige actuellement vers `/intelligence`.

Le chantier devra donc clarifier ultérieurement la **route canonique finale** de Prospection, sans traiter ce point comme une priorité du pré-cadrage.

## 3.2 Navigation actuelle

La navigation locale contient actuellement :

- Brief ;
- Fenêtres d’opportunités ;
- Approches commerciales ;
- Playbooks ;
- CRM Launcher.

Les trois onglets après Brief sont encore essentiellement des placeholders.

## 3.3 Moteur de priorisation existant

Le socle transverse existe déjà dans :

`src/lib/prospection/portfolio-account-metrics.ts`

Il produit notamment par compte :

- potentiel ;
- reach / couverture relationnelle ;
- momentum ;
- risque d’inactivité ;
- priorité d’action ;
- prochaine décision ;
- activité récente ;
- engagements planifiés ;
- opportunités ouvertes ;
- couverture intelligence.

Ce socle doit être **réutilisé et progressivement fiabilisé**, pas remplacé par un nouveau moteur de scoring.

## 3.4 Données existantes utiles

La base Supabase contient déjà les principales sources nécessaires :

- `companies`
- `contacts`
- `interactions`
- `tasks`
- `calendar_events`
- `opportunities`
- `account_signals`
- `account_score_runs`
- `account_score_components`
- `account_issues`
- `account_roadmap_actions`

Snapshot au 24/08/2026 :

- 841 signaux compte ;
- 183 interactions ;
- 535 événements Agenda ;
- 34 tâches ;
- 29 opportunités ;
- 46 enjeux structurés.

Limites actuelles à conserver visibles :

- le scoring natif ne couvre encore qu’un nombre réduit de comptes ;
- `account_issues` couvre actuellement peu de comptes ;
- une partie de la priorisation repose encore sur des proxys ou sur l’héritage FOLIO.

La page ne doit donc pas présenter ses recommandations comme plus certaines que les données qui les alimentent.

---

# 4. Architecture fonctionnelle cible

La page est ramenée à **3 onglets principaux**.

```text
PROSPECTION
│
├── BRIEF
├── STRATÉGIE D’ADRESSAGE
└── PILOTAGE DE L’ACTIVITÉ
```

Les anciens onglets `Fenêtres d’opportunités` et `Playbooks` ne sont plus des destinations autonomes.

Les Playbooks, analyses sectorielles, CRM Launcher, Rédaction assistée et Agenda deviennent des **outils contextuels transverses**.

---

# 5. Onglet 1 — Brief

## Finalité

Répondre à :

> **Quels comptes méritent mon attention maintenant, et pourquoi ?**

Le Brief ne doit pas être un simple dashboard de scores.

Il doit produire une lecture directement exploitable de la situation commerciale.

## Contenu cible

### A. Ce qui requiert l’attention

Synthèse courte et déterministe, par exemple :

- comptes à traiter aujourd’hui ;
- opportunités ou relations qui refroidissent ;
- nouveaux signaux forts ;
- comptes prioritaires déjà couverts par une action planifiée ;
- échéances ou retards importants.

### B. Comptes prioritaires

La liste doit expliquer chaque priorité par des éléments lisibles :

- pourquoi maintenant ;
- signal / enjeu principal ;
- angle recommandé ;
- interlocuteur cible ;
- dernière interaction ;
- prochaine action ;
- niveau de confiance / provenance.

Le score reste une aide au classement, **pas la réponse métier**.

### C. Groupes d’intention

Préférer quelques catégories explicables à un nouveau scoring complexe :

- **Agir maintenant**
- **À préparer**
- **À relancer**
- **Sous contrôle**

La catégorie `Sous contrôle` est essentielle : KREDO doit être capable de recommander de **ne pas solliciter inutilement** un compte déjà correctement traité.

---

# 6. Onglet 2 — Stratégie d’adressage

## Finalité

Répondre à :

> **Comment dois-je adresser ce compte maintenant ?**

## Concept d’« unité de prospection »

Une unité de prospection représente :

> **un compte prioritaire + la thèse commerciale qui justifie son adressage maintenant.**

Elle agrège, sans dupliquer :

- compte ;
- signal / enjeu ;
- angle commercial ;
- offre / practice pertinente ;
- interlocuteurs cibles ;
- historique récent ;
- prochaine action.

### Décision de pré-cadrage

**Ne pas créer de table `prospection_units` en V1.**

L’unité de prospection reste d’abord un **read model / concept d’interface** composé depuis les entités existantes.

Une persistance dédiée ne sera justifiée que si plusieurs motions commerciales indépendantes doivent être gérées simultanément sur un même compte avec leur propre cycle de vie.

## Contenu cible Desktop

Master/detail :

- rail des unités actives ;
- compte sélectionné ;
- pourquoi maintenant ;
- enjeu / signal ;
- interlocuteurs ;
- angle d’approche ;
- messages clés ;
- objections / ROI ;
- historique récent ;
- prochaine action.

Actions principales :

- Rédiger ;
- Planifier ;
- Playbook ;
- Analyse sectorielle ;
- Cockpit compte.

---

# 7. Onglet 3 — Pilotage de l’activité

## Finalité

Répondre à :

> **Qu’est-ce qui a été fait, qu’est-ce qui doit être fait et où faut-il corriger la méthode ?**

Cet onglet constitue la **mémoire opérationnelle de Prospection**, sans créer une nouvelle base d’actions.

Les sources de vérité restent :

- `interactions`
- `tasks`
- `calendar_events`
- `opportunities`

## Contenu cible

### A. Exécution immédiate

- À faire aujourd’hui ;
- relances en retard ;
- actions à venir ;
- contacts récemment sollicités ;
- comptes prioritaires sans action planifiée.

### B. Métriques V1

Limiter la première version aux métriques réellement fiables :

- comptes contactés ;
- contacts uniques sollicités ;
- actions réalisées ;
- actions planifiées ;
- actions en retard ;
- appels / mails / relances / RDV ;
- couverture des comptes prioritaires ;
- temps depuis la dernière interaction.

Ne pas introduire avant que les données soient suffisamment structurées :

- taux de réponse email ;
- performance des templates ;
- meilleur canal ;
- ROI précis des séquences.

### C. Recommandations d’optimisation

Commencer par des recommandations **déterministes**, par exemple :

- sur-sollicitation ;
- compte prioritaire sans action ;
- relation qui refroidit ;
- décideur absent ;
- action en retard ;
- momentum à exploiter.

Un LLM n’est pas nécessaire pour les règles simples et explicables.

---

# 8. Modules transverses à réutiliser

## Playbooks

Réutiliser le module existant :

`src/features/business-intelligence/playbooks/SectorPlaybooksModal.tsx`

Ouverture contextualisée sur le segment du compte et, si possible, sur la section utile :

- angles ;
- objections ;
- ROI ;
- personas ;
- pourquoi maintenant.

Aucun Playbook spécifique Prospection.

## Analyse sectorielle

Réutiliser la projection existante des Master Studies.

Prospection ne duplique pas la connaissance sectorielle : elle l’expose seulement dans le contexte du compte sélectionné.

## CRM Launcher

Conserver le launcher existant comme outil transversal de navigation portefeuille / comptes / contacts.

## Rédaction assistée

Réutiliser impérativement le moteur générique actuel :

`src/components/communication/CommunicationComposerHost.tsx`

Prospection doit lui transmettre le contexte déjà connu :

- compte ;
- contact ;
- signal / enjeu ;
- offre / practice ;
- objectif.

Aucun nouveau moteur de rédaction.

## Agenda Light

Ne pas créer de deuxième Agenda.

Réutiliser le moteur existant :

`src/lib/agenda/aggregate-agenda-snapshot.ts`

Prospection n’en consomme qu’une projection commerciale simplifiée :

- aujourd’hui ;
- à venir ;
- en retard.

---

# 9. Data — architecture cible légère

Prospection ne doit pas dépendre du `BusinessIntelligenceSegmentWorkspace`, dont la responsabilité est désormais mono-segment.

Le socle recommandé est le portefeuille transverse existant.

Créer à terme un **`ProspectionWorkspace` léger**, constitué uniquement de :

```text
portfolio accounts
+ current account scores
+ relevant account signals
+ account issues
+ latest interactions
+ planned calendar events
+ open tasks
+ open opportunities
```

Puis, **uniquement lorsqu’un compte est sélectionné**, charger le contexte riche :

```text
account intelligence
+ commercial strategy
+ contacts
+ Master Study du segment
+ Playbook du segment
```

Principe :

> **liste légère → détail riche à la demande**

Ne jamais charger toutes les Master Studies du portefeuille uniquement pour produire la liste du Brief.

---

# 10. Vue Desktop

Principe : **Desktop = analyse et arbitrage.**

### Brief

- vue dense ;
- classement et groupes d’intention ;
- filtres simples ;
- justification des priorités ;
- sélection compte synchronisée.

### Stratégie d’adressage

- master/detail ;
- plusieurs unités visibles ;
- contenu dense du compte sélectionné ;
- toolbox contextuelle.

### Pilotage

- tableau / timeline d’activité ;
- KPI fiables ;
- exceptions et anomalies ;
- recommandations d’optimisation.

---

# 11. Vue Mobile

Principe : **Mobile = action.**

Ne pas monter les composants Desktop puis les masquer en CSS.

Créer des sous-composants dédiés.

### Brief Mobile

Cartes prioritaires :

- compte ;
- raison principale ;
- dernière interaction ;
- prochaine action ;
- CTA `Préparer`.

### Stratégie Mobile

Une seule unité à la fois :

- pourquoi maintenant ;
- interlocuteur ;
- angle ;
- trois points à dire ;
- gros boutons `Rédiger` et `Planifier`.

### Pilotage Mobile

Vue synthétique :

- Aujourd’hui ;
- À relancer ;
- À venir ;
- Récemment contactés.

Touch targets ≥ 44 px.

---

# 12. Principes d’architecture à préserver

1. **Aucune nouvelle source de vérité.**
2. **Aucune duplication de Business Intelligence ou du Cockpit compte.**
3. **Aucun nouveau moteur de rédaction.**
4. **Aucun nouvel Agenda.**
5. **Aucun nouveau Playbook Prospection.**
6. **Pas de `prospection_units` persisté en V1.**
7. **Pas de nouveau super-score tant que la donnée native n’est pas suffisamment couverte.**
8. **Priorité aux règles déterministes pour les recommandations simples.**
9. **Chargement riche du compte à la demande.**
10. **Adaptive Design réel Desktop / Mobile.**
11. **n8n uniquement pour les traitements longs / IA lourde réellement nécessaires.**
12. **Supabase reste la Single Source of Truth.**

---

# 13. Points à cadrer avant implémentation

Les prochains travaux du dossier devront préciser :

1. route canonique finale (`/prospection` vs `/prospection-intelligence`) ;
2. contrat TypeScript exact de `ProspectionWorkspace` ;
3. définition déterministe des quatre groupes d’intention ;
4. règles de sélection et de construction d’une unité de prospection ;
5. règles anti-sur-sollicitation ;
6. métriques exactes de Pilotage V1 ;
7. contenu et interaction Desktop ;
8. contenu et interaction Mobile ;
9. stratégie de migration / réutilisation des composants de la page actuelle ;
10. séquence de lots d’implémentation.

---

# 14. Hors périmètre du pré-cadrage

Cette note ne décide pas encore :

- des composants UI finaux ;
- du design précis ;
- des migrations éventuelles ;
- d’un nouveau workflow n8n ;
- des formules finales de priorisation ;
- des seuils exacts de cadence commerciale ;
- des contrats de tests.

Ces éléments seront traités lors du cadrage détaillé et des lots d’implémentation.

---

# 15. North Star

La page Prospection doit permettre à un commercial d’ouvrir KREDO et de savoir rapidement :

> **qui contacter, pourquoi maintenant, avec quel angle, qui viser, ce qui a déjà été fait et quelle est la prochaine meilleure action.**

Elle ne doit pas demander au commercial de reconstruire lui-même le raisonnement en naviguant entre Business Intelligence, CRM, Cockpit compte, Playbooks, Agenda et outils de rédaction.

**Prospection est la couche d’orchestration commerciale qui assemble ces briques sans les dupliquer.**
