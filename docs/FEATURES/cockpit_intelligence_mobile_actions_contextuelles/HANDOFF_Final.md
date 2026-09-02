# HANDOFF — PROGRAMME DE RACCORDEMENT GLOBAL
# Cockpit Intelligence mobile

## 1. ÉTAT DE RÉFÉRENCE

Le Lot 2 `/cockpit` est VALIDÉ comme GOLDEN MASTER.

Baseline validée :

- QA mobile réelle : 480 × 960
- build production : exit code 0
- Vitest : 2106 / 2106
- server-boundary : OK
- lint : OK
- mode Company spécialisé : non-régression validée

Le design du Cockpit Intelligence est désormais FIGÉ.

Il ne doit plus être redessiné page par page.

Référence :

`docs/DESIGN/explorations/cockpit-intelligence-mobile-final-2026-08-24/`

Le `/cockpit` réel constitue également la référence d’implémentation.

---

# 2. OBJECTIF DU PROGRAMME

Raccorder toutes les Actions et tous les Modules du Cockpit Intelligence à leurs fonctionnalités réelles sur l’ensemble des pages KREDO.

Principe absolu :

> Une entrée `active` doit être réellement fonctionnelle.
> Une capacité absente ou incomplète reste `coming_soon`.
> Aucune simulation métier ne doit être inventée.

---

# 3. ARCHITECTURE FIGÉE

Le registry constitue la source de vérité des configurations contextuelles.

Structure :

- Header
- Actions
- Modules
- Raccourcis

Les raccourcis transverses restent :

- Documents → `/reports`
- KB → `/knowledge`
- Workflows → `/automations`
- Paramètres → `/settings`

Les onglets internes d’une même page ne changent pas la configuration métier du Cockpit.

Le matching de routes reste boundary-aware.

Le mode Company spécialisé reste prioritaire et hors registry générique.

---

# 4. MATRICE PRODUIT CIBLE

## Cockpit — GOLDEN MASTER

Actions :
- Priorités
- Brief hebdomadaire
- Insights pipeline
- Intelligence Mission — Activation portefeuille

Modules :
- Modélisation financière
- Activité & congés

---

## Agenda

Actions :
- Préparer la journée
- Préparer un RDV
- Anticiper les échéances
- Piloter la prospection

Modules :
- Métriques activité
- Rapports

---

## Besoins & Staffing

Actions :
- Prioriser le pipeline
- Matcher les profils
- Préparer un candidat
- Intelligence Mission — post-mortem-commercial

Modules :
- Modélisation financière
- Modélisation du CA

---

## Engagements

Actions :
- Analyser les prestations
- Détecter les risques
- Prévoir le CA
- Anticiper les échéances

Modules :
- Atlas du portefeuille
- Activité & congés

Note :
`Analyser les prestations` = entrée produit vers la mission existante
`rentabilite-portefeuille`.

---

## Business Intelligence

Actions :
- Analyse à la demande
- Prioriser les fenêtres commerciales
- Paramétrer la veille

Modules :
- Bibliothèque
- Playbooks

---

## Prospection Intelligence

Actions :
- Intelligence Mission — activation portefeuille
- Générer synthèse / analyse
- Intelligence Mission — revue-compte-client
- Créer une campagne

Modules :
- Playbooks
- Agenda light

---

## Rapports & Rédaction

Actions :
- Générer un document
- Analyse transverse
- Regroupement thématique

Modules :
- Gestion de la connaissance

---

## Veille & Actualités

Actions :
- Déclenchement manuel
- Intelligence Mission — Analyse mensuelle de la veille
- Analyse transverse
- Suggérer des actions

Modules :
- Gestion des sources informationnelles
- Gestion de la connaissance

---

## Équipe

Actions :
- Intelligence Mission — capacité-staffing
- Compétences VS besoins
- Matcher les profils
- Identifier les écarts

Modules :
- Pool de compétences
- Activité & congés

---

## Recrutement

Actions :
- Intelligence Mission — funnel-recrutement
- Compétences VS Besoins
- Préparer une communication candidat
- Matching profil

Modules :
- Métriques activité
- Agenda light

Attention :

`Compétences VS Besoins` n’est PAS un matching individuel.

Il s’agit d’une analyse de cohérence globale entre :

- collaborateurs ;
- candidats ;
- pool qualifié ;
- compétences disponibles ;
- besoins réellement reçus/traités.

Baseline cible :
- 12 mois glissants ;
- tendance complémentaire 90 jours.

---

## Finance

Actions :
- Diagnostic IA du workspace
- Intelligence Mission — Analyser les marges
- Modélisation du CA
- Synthèse à la direction

Modules :
- Atlas portefeuille
- Activité & congés

---

## Automatisations

Actions :
- Générer un rapport
- Analyser les erreurs
- Analyser les coûts
- Prioriser les corrections

Modules :
- Métriques
- Simuler la cadence

Le rapport technique ne doit plus contenir aucun fallback de démonstration.

---

## Knowledge Hub

Aucune Action.
Aucun Module.

## Paramètres

Aucune Action.
Aucun Module.

---

# 5. BASELINE DES CAPACITÉS CONNUES

À REVALIDER impérativement contre le working tree avant toute modification.

Capacités connues comme déjà existantes lors du dernier audit :

- action_priorities
- weekly_brief
- pipeline_insights
- prepare_day
- briefing RDV / INTEL-020
- prioritize_pipeline
- matching profils
- briefing candidat
- rentabilite-portefeuille
- detect_risks
- forecast_revenue
- analyse à la demande / manual_custom
- génération de documents
- déclenchement manuel veille
- veille-analyse-mensuelle
- analyse transverse
- analyze_activity
- workspace diagnostic
- manager summary
- métriques/coûts automations
- simulateur cadence
- FinancialModelingMobileFlow

Capacités historiquement partielles ou absentes :

- runway 30/60/90
- pilotage/campagnes prospection
- fenêtres commerciales
- regroupement thématique
- modélisation CA gain/perte
- priorisation corrections Automatisations
- Compétences VS Besoins avancé Recrutement
- Activité & congés
- Agenda light
- Métriques activité

Intelligence Missions historiquement en développement :

- activation-portefeuille
- capacite-staffing
- revue-compte-client
- post-mortem-commercial
- funnel-recrutement

NE PAS considérer cette liste comme l’état actuel.
Le working tree local est la source technique prioritaire.

---

# 6. STRATÉGIE D’EXÉCUTION

## Phase A — Audit actualisé

Avant tout code, produire une matrice :

| Page | Entrée | Type | Statut réel | Moteur | Handler | Travail |
|---|---|---|---|---|---|---|

Statuts autorisés :

- ACTIVE
- PARTIEL
- EN DÉVELOPPEMENT
- ABSENT

Identifier également les capacités réutilisées par plusieurs pages.

STOP après cet audit pour validation.

---

## Phase B — Raccordement des capacités existantes

Ordre :

1. Agenda
2. Besoins & Staffing
3. Engagements
4. Équipe
5. Recrutement
6. Finance
7. Business Intelligence
8. Veille & Actualités
9. Rapports & Rédaction
10. Automatisations
11. Prospection Intelligence
12. Knowledge Hub / Paramètres

Pour chaque page :

1. config registry
2. handlers existants
3. modules existants
4. `coming_soon` honnêtes
5. tests
6. QA mobile
7. validation

Une page ne doit pas déclencher la construction silencieuse d’une capacité métier manquante.

---

## Phase C — Capacités mutualisées manquantes

Créer dans des chantiers séparés :

1. Runway 30/60/90
2. Activité & congés
3. Métriques activité
4. Agenda light
5. Modélisation CA gain/perte
6. Compétences VS Besoins avancé
7. Fenêtres commerciales
8. Regroupement thématique
9. Suggestions d’actions Veille
10. Priorisation corrections Automatisations
11. Campagnes / pilotage prospection

Une fois une capacité terminée :
activer simplement ses entrées registry correspondantes.

---

## Phase D — Intelligence Missions

Auditer puis terminer séparément les missions encore incomplètes.

Ne jamais développer une Intelligence Mission à l’intérieur d’un composant UI.

---

# 7. DATA

Pour chaque nouveau chantier métier :

- réutiliser les tables/RPC existants si possible ;
- conserver Supabase comme Single Source of Truth ;
- RLS actif ;
- aucune donnée fake ;
- aucune duplication d’état métier.

Toute opération longue, scraping, LLM, vectorisation ou cron doit rester déléguée à n8n.

---

# 8. ADAPTATIVE DESIGN

Le nouveau Cockpit est MOBILE.

Ne jamais :

- monter un composant Desktop lourd puis le masquer ;
- importer statiquement un module lourd inutilisé.

Préférer :

- composants mobiles dédiés ;
- `next/dynamic` pour les flows lourds ;
- montage uniquement lors de l’ouverture.

---

# 9. QA DE CHAQUE LOT

Minimum :

- tests ciblés registry/handlers
- typecheck
- server-boundary
- ESLint ciblé
- Vitest global
- build production
- QA mobile réelle
- interactions réelles
- non-régression Company

Le design doit rester conforme au Golden Master `/cockpit`.

Pas de nouvelle exploration graphique.

---

# 10. INTERDITS

- aucun bouton `active` fictif ;
- aucun faux handler ;
- aucune donnée inventée ;
- aucun nouveau registry parallèle ;
- aucun big-bang sur toutes les pages ;
- aucune modification Account Intelligence hors chantier dédié ;
- aucun commit/push sans accord explicite.