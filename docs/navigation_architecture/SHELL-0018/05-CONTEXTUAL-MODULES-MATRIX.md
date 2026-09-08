# SHELL-0018 — Matrice des modules contextuels Desktop

**Lot :** 3.1  
**Date d'audit :** 2026-09-08  
**Baseline auditée :** `4c8ca03bbce262170aa6b4462c119a7c7dacaeca`

## Règle appliquée

La section `Modules` contient uniquement une capacité directement contextualisée par la page ou
l'entité courante, réellement disponible au rendu et dotée d'une action fonctionnelle. Une
capacité transverse, un raccourci global, un placeholder ou une action durablement désactivée
reste hors du rail.

La classification ci-dessous suit les composants et callbacks réellement raccordés sur `main`,
pas seulement leur libellé ni le ledger historique.

## Matrice finale

| Page | Module | Contexte | Décision | Justification |
|---|---|---|---|---|
| Account Intelligence | Répertoire (`contacts`) | `ContactDirectoryDialog` reçoit `initialCompanyId={company.id}` depuis la fiche compte affichée. | Conservé si `onOpenContactDirectory` existe. | Le répertoire s'ouvre directement sur le compte courant et le callback ouvre une modale fonctionnelle. |
| Account Intelligence | Bibliothèque (`documents`) | `CompanyDocumentsModal` reçoit le `companyId` et le `companyName` courants. | Conservé si `onOpenDocuments` existe. | La bibliothèque est pré-contextualisée sur le compte affiché, contrairement à une bibliothèque globale demandant un choix manuel. |
| Account Intelligence | Playbook (`playbook`) | Le slug est résolu depuis le runtime ou le segment du compte courant, puis injecté dans `/ressources/playbook/{slug}`. | Conservé si `playbookSlug` existe. | Le lien ouvre directement le playbook sectoriel du compte ; l'entrée disparaît sans slug exploitable. |
| Business Intelligence | Études sectorielles (`studies`) | `SectorStudiesModal` reçoit la connaissance, le segment et le macro du workspace segmentaire actif. | Conservé si `coverage.study.available` et `onStudiesClick` sont vrais. | La capacité est propre au segment affiché ; la garde de couverture empêche désormais d'ouvrir une étude absente. |
| Business Intelligence | Playbooks (`playbooks`) | `SectorPlaybooksModal` reçoit la connaissance, le segment, le macro, les acteurs et les comptes prioritaires du segment actif. | Conservé si `coverage.playbook.available` et `onPlaybooksClick` sont vrais. | Le playbook est déjà contextualisé sur le segment affiché ; la garde de couverture supprime le fallback « en préparation » du rail. |
| Veille & actualités | Gestion des sources (`source-management`) | `SourceManagementDialogDesktop` reçoit le snapshot des sources et corpus chargé par la page Veille. | Conservé si `onOpenSourceManagement` existe. | La capacité administre directement le socle éditorial de la page ; le callback et le snapshot sont disponibles au rendu. |
| Knowledge Hub | Ateliers (`workshop`) | `KnowledgeHubModuleModal` consomme les ateliers et connaissances du Hub courant. | Conservé si `onOpenModal` existe. | La consultation et la sélection d'un atelier sont fonctionnelles ; l'état actif existant reflète l'ouverture de la modale. |
| Knowledge Hub | Interroger (`ask`) | La modale présente les scopes du Hub, mais la soumission affiche « Bientôt disponible » et `Envoyer` est désactivé en permanence. | Retiré du rail. | La capacité finale n'est pas disponible : elle constitue un placeholder malgré l'existence du callback d'ouverture. Aucun déplacement vers Cockpit Intelligence n'est réalisé dans ce lot. |
| Rapports & rédaction | Aucun | Aucun outil contextuel distinct des chapitres n'est raccordé au rail. | `contextualModules: undefined`. | Aucun module artificiel n'est créé. |
| Automatisations | Aucun | Aucun outil contextuel n'est raccordé au rail. | `contextualModules: undefined`. | Les capacités transverses restent hors du rail. |
| Engagements | Aucun | Le consommateur direct de `SectionRail` ne déclare aucun module. | Propriété omise, donc `undefined`. | Aucun module artificiel n'est créé. |
| Prospection | Aucun | Aucun outil contextuel distinct des chapitres n'est raccordé au rail. | `contextualModules: undefined`. | Les actions globales restent hors du rail. |
| Finance | Aucun | Aucun outil contextuel n'est raccordé au rail secondaire gauche. | `contextualModules: undefined`. | Le rail analytique droit et les actions du header sont d'autres contrats ; l'URLisation Finance reste intacte. |

## Contrat d'absence

Les builders conditionnels Account Intelligence, Business Intelligence et Veille normalisent
désormais leur tableau de travail en `undefined` lorsqu'aucune entrée n'est disponible. Knowledge
Hub produisait déjà `undefined` sans callback. Rapports, Automatisations, Prospection et Finance
déclarent explicitement `undefined`, tandis qu'Engagements omet la propriété.

`SectionRailEntry` impose déjà au niveau TypeScript une union exclusive entre `href` et
`onSelect`. Aucun registre global n'est ajouté : chaque page conserve son propre contrat de
contexte et son propre mécanisme d'ouverture.
