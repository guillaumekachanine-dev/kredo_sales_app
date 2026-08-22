# Lot 2 - Business Intelligence Desktop

## Composants créés

L'architecture UI de la page Business Intelligence a été structurée autour des composants suivants (`src/features/business-intelligence/desktop/`) :

- **`BusinessIntelligenceDesktop.tsx`** : Le layout principal de la page, qui maintient l'état des filtres locaux et du compte/fenêtre sélectionnés.
- **`BusinessIntelligenceHeader.tsx`** : L'en-tête de page avec le titre, le sous-titre et les actions principales.
- **`StrategicBrief.tsx`** : Le résumé éditorial déterministe qui met en avant les fenêtres chaudes et le compte critique à arbitrer.
- **`IntelligenceKpiStrip.tsx`** : Les quatre KPIs globaux (Comptes prioritaires, Fenêtres ouvertes, Secteurs actifs, Confiance moyenne).
- **`AccountPriorityBoard.tsx`** : Le tableau de couverture et de priorisation des comptes, triable et sélectionnable.
- **`PotentialReachMatrix.tsx`** : Matrice croisant Potentiel et Reach. (Implémentation SVG pure performante sans librairie tierce pour respecter les consignes).
- **`AccountAttackPanel.tsx`** : Le panneau latéral d'attaque qui affiche le plan d'action (drivers, practice, angle, etc.) pour le compte sélectionné.
- **`SectorWindowsLedger.tsx`** : Le registre des fenêtres de marché actives, classées par urgence.
- **`SectorPanorama.tsx`** : La vue synthétique des secteurs (actifs et en veille).

## Modèle Présentateur

- **`buildBusinessIntelligenceDesktopModel.ts`** : Transforme le `BusinessIntelligenceSnapshot` global en un `BusinessIntelligenceDesktopViewModel` optimisé pour la lecture UI. Toutes les agrégations de KPIs et les requêtes métier (ex: top arbitrations, top windows) sont exécutées purement côté serveur via ce constructeur.

## Corrections apportées au Lot 1

Avant de connecter l'UI, les modèles purs du Lot 1 ont été durcis selon les directives :
1. **Types de retours explicites** : Ajout des interfaces pour `buildAccountPrioritizationModel`, `buildAccountAttackModel` et `buildSectorPlaybookModel`.
2. **`nextAction` déterministe** : Retrait du fallback `"A définir"`. Utilisation de l'action suggérée du signal principal, puis de la prochaine décision de l'agenda, puis `null`.
3. **Fallbacks stricts pour le plan d'attaque** : Suppression de la confiance inventée, de "Data & IA" et de "Approche directe" par défaut. Ils renvoient `null` en l'absence de données réelles.

## Interactions Fonctionnelles

- **Filtrage local** : L'utilisateur peut filtrer par période (30/90/180j), par secteur et via un champ de recherche. Ces filtres actualisent instantanément le tableau de couverture et les points de la matrice.
- **Sélection synchronisée** : Le clic sur un compte dans le tableau (ou un point dans la matrice) met à jour le *Plan d'attaque* affiché à droite.
- **Sélection depuis le Ledger** : Le clic sur une fenêtre sectorielle sélectionne automatiquement le premier compte exposé et affiche son plan d'attaque.

## Validations réalisées

1. **Typage strict** : Aucune valeur `any` n'est transmise aux composants de la vue. Le projet compile sans erreur (`npm run typecheck`).
2. **Tests Automatisés** : Création de `build-business-intelligence-desktop-model.test.ts` qui vérifie le déterminisme du modèle présentateur, l'absence de fallbacks inventés et l'inclusion discrète des données synthétiques (data quality).
3. **Qualité de code** : Aucun avertissement TypeScript. Utilisation des variables CSS du système.

## Limitations laissées aux Lots 3 et 4

- Le parcours Mobile actuel affiche une page temporaire (conformément à l'instruction de ne pas monter/masquer l'UI desktop).
- Le bouton "Consulter les playbooks" n'ouvre pas encore la modale dédiée au Lot 3, mais prépare le terrain pour cette intégration.
- L'URL n'est pas encore visible dans le menu principal (navigation désactivée).

## Verdict

**GO pour le Lot 3 (Playbooks).** L'architecture Desktop est complète, testée et connectée de manière performante au Snapshot métier.
