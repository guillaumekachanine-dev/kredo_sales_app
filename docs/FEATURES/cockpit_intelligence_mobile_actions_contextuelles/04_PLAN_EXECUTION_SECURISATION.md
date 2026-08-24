# Cockpit Intelligence — Plan d’exécution et sécurisation

**Date :** 24/08/2026  
**Statut :** proposition d’exécution à valider avant refactor principal  
**Dossier :** `docs/FEATURES/cockpit_intelligence_mobile_actions_contextuelles/`

---

# 1. Décision de méthode recommandée

Ne pas procéder :

- ni par **grand lot horizontal « boutons faciles sur toutes les pages »**, qui augmenterait fortement le blast radius et laisserait plusieurs pages dans des états intermédiaires ;
- ni par **page totalement isolée sans socle commun**, qui conduirait à dupliquer les handlers, les états et la logique de résolution.

La méthode recommandée est **hybride** :

> **Socle transversal minimal → conception graphique validée → une page pilote end-to-end → déploiement vertical page par page → chantiers métier manquants séparés.**

Le principe de sécurisation est simple :

> une seule architecture commune, mais une seule page fonctionnelle à la fois pour l’intégration réelle.

---

# 2. Terminologie canonique à partir de ce chantier

## Cockpit Intelligence

Désigne désormais le **panneau latéral / drawer d’actions et modules contextuels** présent dans KREDO.

Sa responsabilité :

- exposer les meilleures actions disponibles dans le contexte courant ;
- ouvrir les modules utiles ;
- orchestrer les moteurs existants ;
- ne pas devenir une nouvelle source de vérité.

## Account Intelligence

Désignera la future **page d’étude approfondie d’un compte**, actuellement encore souvent appelée « Cockpit Intelligence compte » dans le code et la documentation historique.

Le renommage technique de cette page n’est **pas inclus automatiquement** dans le présent chantier.

Lors du futur chantier Account Intelligence :

- consacrer le nouveau nom dans l’UI ;
- renommer progressivement la documentation et les symboles lorsque cela est sans risque ;
- préserver la séparation entre le panneau global **Cockpit Intelligence** et le workspace compte **Account Intelligence**.

## Règle de transition documentaire

Dans les documents du chantier actuel :

- « Cockpit Intelligence » = panneau d’actions générique ;
- « Account Intelligence » = expérience approfondie compte, même si certains noms de fichiers historiques portent encore `Cockpit` / `AccountMobileContent`.

---

# 3. Phase D0 — Product Design avant code

La conception graphique doit précéder le refactor du panneau.

## Outil recommandé

Si un seul chantier design est lancé : **Product Design** en priorité.

Raison : le besoin principal n’est pas seulement esthétique ; il faut fixer :

- l’architecture d’information ;
- la hiérarchie Actions / Modules / Raccourcis ;
- les états du panneau ;
- le comportement après clic ;
- la navigation retour ;
- les états async ;
- la manière d’exposer provenance, confiance et erreurs.

Si les deux approches sont utilisées :

```text
Product Design
→ Creative Production
→ validation visuelle
→ implémentation
```

**Creative Production** intervient ensuite pour explorer 2–3 directions visuelles premium à partir du contrat UX déjà figé, sans remettre en cause l’architecture fonctionnelle.

---

# 4. Livrables attendus de la phase Design

Le design ne doit pas produire une simple capture statique. Il doit définir un **système de panneau**.

## 4.1 Anatomie

À concevoir :

1. Header `Cockpit Intelligence` ;
2. carte de contexte ;
3. section Actions ;
4. section Modules ;
5. raccourcis fixes ;
6. état résultat d’une Action ;
7. état Module ouvert ;
8. navigation retour vers la liste d’actions.

## 4.2 États obligatoires

Le design doit montrer au minimum :

- action disponible ;
- action `coming_soon` ;
- action en cours d’exécution ;
- action réussie ;
- action en erreur ;
- résultat vide factuel ;
- résultat avec provenance / confiance ;
- workflow async en `queued/running` ;
- module light ;
- page sans Actions ni Modules.

## 4.3 Adaptive Design

Deux compositions distinctes :

### Desktop

- panneau latéral d’analyse ;
- densité supérieure ;
- résultat pouvant présenter davantage de contexte et de détails.

### Mobile

- drawer / sheet orienté action ;
- touch targets ≥ 44 px ;
- résultats synthétiques ;
- pas de composant Desktop lourd monté puis masqué.

## 4.4 Écrans de référence à maquettiser

Pour couvrir les cas du système avec peu de maquettes :

1. **Cockpit** — mélange déterministe + report + Intelligence Mission ;
2. **Agenda** — actions rapides + temporalité ;
3. **Rapports & Rédaction** — génération / analyse / gestion de connaissance ;
4. **Automatisations** — données techniques + erreurs/coûts ;
5. un état **sans actions** type Paramètres.

Ces cinq cas suffisent à valider l’essentiel du design system du panneau avant généralisation.

---

# 5. P0 — Hygiène et freeze avant refactor

## P0-A / P0-B Account Intelligence

Les pré-chantiers `Simuler` et `Recruter` sont déjà validés et deviennent une baseline protégée.

Le chantier générique ne les refactore pas.

## P0-C — Freeze matrice

La matrice du 24/08/2026 est considérée comme suffisamment stable pour lancer le chantier, avec les décisions suivantes :

- `Analyser les prestations` = `rentabilite-portefeuille` ;
- Recrutement : `Candidats VS besoins` devient `Compétences VS Besoins` ;
- les 5 nouvelles Intelligence Missions restent `coming_soon` tant qu’elles ne sont pas réellement dans le catalogue exécutable.

## P0-D — Dette critique Rapport technique

Avant de raccorder **Générer un rapport** depuis Automatisations :

- supprimer le fallback de données de démonstration ;
- retourner un vrai empty state en absence de runs ;
- ajouter un test empêchant toute réintroduction de données factices.

Ce correctif est **isolé** et peut être réalisé immédiatement avant le refactor principal.

---

# 6. Lot 1 — Socle transversal, sans activation massive

Objectif : rendre l’architecture capable de représenter proprement la matrice, **sans brancher toutes les pages à la fois**.

## Travaux

- source de vérité page → Actions / Modules ;
- matching de routes boundary-aware ;
- statuts `active`, `coming_soon`, éventuellement `blocked` ;
- association Action → type de handler/capability ;
- association Module → surface réutilisable ;
- suppression des fallbacks génériques codés en dur ;
- séparation stricte du mode historique Account Intelligence ;
- tests de résolution.

## DoD

Le registry sait décrire toute la matrice, mais aucun déploiement large de comportements n’est encore nécessaire.

---

# 7. Lot 2 — Page pilote end-to-end

## Page pilote recommandée : Cockpit

Le Cockpit est un bon pilote car il réunit plusieurs catégories de comportement sans nécessiter beaucoup de nouveaux moteurs :

- `Priorités` — déterministe ;
- `Brief hebdomadaire` — génération async existante ;
- `Insights pipeline` — déterministe ;
- `Activation portefeuille` — Intelligence Mission en attente ;
- Modélisation financière — module réutilisable ;
- Activité & congés — module futur/placeholder.

Il permet donc de valider :

- le nouveau design ;
- la navigation liste → résultat → retour ;
- sync et async ;
- `active` et `coming_soon` ;
- action et module ;
- comportement Desktop/Mobile.

## Règle

Ne passer à la page suivante qu’après :

- QA fonctionnelle ;
- QA visuelle ;
- typecheck/tests ;
- handoff court ;
- validation utilisateur.

---

# 8. Lots suivants — vertical slices page par page

Après le pilote, traiter **une page fonctionnelle à la fois**.

Pour chaque page :

```text
1. Registry exact
2. Raccordement Actions déjà existantes
3. Raccordement Modules déjà existants
4. Placeholders explicites des capacités absentes
5. Contextes / préremplissages
6. Tests ciblés
7. QA visuelle Desktop + Mobile
8. Commit / handoff
9. Validation
→ page suivante
```

Cela évite de toucher simultanément 10 à 14 surfaces et permet de diagnostiquer immédiatement une régression.

---

# 9. Ordre de pages recommandé

## Vague 1 — socle opérationnel

1. **Cockpit** — pilote ;
2. **Agenda** ;
3. **Besoins & Staffing** ;
4. **Engagements**.

Ces pages exploitent beaucoup de moteurs déterministes déjà présents et permettent de stabiliser rapidement les principaux patterns d’actions.

## Vague 2 — capacité / rentabilité

5. **Équipe** ;
6. **Recrutement** ;
7. **Finance**.

Elles partagent compétences, staffing, activité et rentabilité et bénéficieront des patterns validés en Vague 1.

## Vague 3 — intelligence / connaissance / prospection

8. **Business Intelligence** ;
9. **Prospection Intelligence** ;
10. **Veille & Actualités** ;
11. **Rapports & Rédaction**.

Ces pages concentrent davantage de workflows async, d’analyses multi-sources et de composants transverses.

## Vague 4 — technique et pages simples

12. **Automatisations** ;
13. **Knowledge Hub** ;
14. **Paramètres**.

Knowledge Hub et Paramètres servent aussi à vérifier le comportement du Cockpit lorsqu’aucune Action/Module métier n’est défini.

---

# 10. Pourquoi ne pas brancher d’abord tous les « boutons faciles »

Cette stratégie donnerait un gain visuel rapide mais créerait plusieurs risques :

- modifications simultanées sur de nombreuses routes ;
- QA beaucoup plus difficile ;
- handlers partiellement normalisés ;
- états UX incohérents selon la page ;
- découverte tardive d’un défaut architectural reproduit partout ;
- impossibilité d’attribuer facilement une régression à un lot précis.

Les actions « faciles » sont très utiles pour le **pilote**, mais pas comme vague horizontale globale.

---

# 11. Chantiers métier spécifiques séparés

Le refactor du Cockpit ne doit pas devenir le prétexte pour développer toutes les features manquantes.

Une capacité absente peut être visible en `coming_soon`, tandis que son développement reste un chantier séparé.

Backlog métier identifié :

- 5 nouvelles Intelligence Missions ;
- Runway engagements ;
- Pilotage de la prospection / campagnes ;
- moteur Campagnes ;
- fenêtres commerciales BI ;
- regroupement thématique ;
- scénarios financiers gain/perte ;
- priorisation des corrections Automatisations ;
- extension `Compétences VS Besoins` collaborateurs + candidats + vivier qualifié.

Lorsqu’un chantier métier est terminé :

```text
capability validée
→ tests métier
→ passage `coming_soon` → `active` dans le registry
→ raccordement UI minimal
```

Ainsi le panneau n’est jamais bloqué par une feature encore en développement.

---

# 12. Règle de commit / validation

Pour sécuriser l’avancement :

- un lot structurel = un commit/handoff ;
- une page fonctionnelle = un lot/commit identifiable ;
- une nouvelle capacité métier = chantier/commit séparé ;
- pas de mélange refactor registry + gros nouveau moteur métier dans le même lot ;
- aucune donnée ou migration Supabase ajoutée pour la seule configuration du panneau ;
- n8n uniquement lorsque la capacité elle-même le justifie.

---

# 13. Séquence canonique proposée

```text
D0 Product Design
→ D0 Creative Production éventuelle
→ Validation graphique
→ P0-D suppression fallback rapport technique
→ Lot 1 Socle registry / handlers / routes
→ Lot 2 Cockpit pilote end-to-end
→ validation
→ Vague 1 page par page
→ Vague 2 page par page
→ Vague 3 page par page
→ Vague 4
→ QA transverse finale
```

Cette séquence permet de verrouiller d’abord **le système visuel et technique**, puis de limiter le risque en déployant les comportements **verticalement, une page à la fois**.
