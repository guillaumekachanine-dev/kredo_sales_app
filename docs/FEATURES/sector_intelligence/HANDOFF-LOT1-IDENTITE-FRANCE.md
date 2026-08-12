# HANDOFF-LOT1-IDENTITE-FRANCE — Socle identité France des comptes

> **Document de transfert et rapport de statut du Lot 1 & Lot 1.5**

---

## 1. Rappel des Objectifs du Lot 1

L'objectif du Lot 1 est de doter KREDO d'un **Socle Identité France** fiable et robuste :
- Identification univoque des comptes (SIREN).
- Attributs de base (Raison sociale, NAF, Effectifs) et faits déterministes A1 (`collective_agreement`, `headcount_france`, `incorporation_date`, `establishment`, `executive`).
- Gestion de la désambiguïsation (comptes avec homonymes ou multiples établissements) et des cas `not_found` / `ambiguous`.

---

## 2. Correctif d'Architecture : Le NAF n'est jamais un prérequis d'identité

À la suite d'un audit de régression, nous avons formellement séparé les **Inputs** (indices permettant de résoudre l'identité) des **Outputs** (données d'enrichissement récoltées après résolution) :
- Le `naf_code` est une **donnée d'enrichissement** produite *après* résolution de l'entreprise. Il ne constitue plus jamais un critère requis pour démarrer un scan ou valider une identité.
- **Règles de résolution cibles implémentées** :
  1. Si `companies.siren` est valide -> résolution directe par SIREN.
  2. Sinon -> recherche par nom (`name`/`legal_name`) + localisation (`hq_location`) si disponible.
  3. Si un candidat dominant se distingue -> promotion automatique du SIREN, puis enrichissement automatique du NAF et des faits A1.
  4. Si plusieurs candidats plausibles -> statut `ambiguous` avec présentation de l'interface de désambiguïsation (affichant Raison sociale, SIREN, localisation, NAF visuel). La sélection manuelle par l'utilisateur re-déclenche la résolution avec le SIREN choisi et complète l'enrichissement.
  5. Si aucun candidat -> statut `not_found`. Aucun NAF n'est demandé pour débloquer le scan.

### Fichiers Modifiés & Déployés
- [**Route Handler**](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/app/api/n8n/trigger/route.ts) : Suppression de l'obligation de passer `identityConfirmed` et `selectedSiren` pour lancer le scan. Le format du SIREN n'est validé que s'il est explicitement fourni.
- [**Composant de Scan**](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/scan/AccountScanDialog.tsx) : `prepareInformationScan` lance désormais directement le scan sans intercepter l'action par un écran de confirmation obligatoire de SIREN. L'écran de désambiguïsation n'apparaît qu'a posteriori en cas de statut réellement `ambiguous` renvoyé par le workflow.
- [**Script Batch**](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/scripts/lot1-batch-apply.ts) : Paramétrage dynamique de l'identité confirmée en fonction de la présence réelle du SIREN en base. `naf_code = NULL` ne bloque plus jamais l'analyse.

---

## 3. Tests de Non-Régression & Validation Technique

7 cas de tests unitaires ont été ajoutés et validés dans [`account-scan-utils.test.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/scan/__tests__/account-scan-utils.test.ts) :
1. *Compte avec nom seul* -> le scan démarre sans SIREN et sans NAF.
2. *Compte avec nom + siège* -> résolution possible sans NAF.
3. *Compte avec SIREN mais sans NAF* -> résolution directe via SIREN, NAF est en output à enrichir.
4. *Compte sans SIREN et sans NAF* -> recherche par nom seule lancée.
5. *Compte ambigu sans NAF* -> candidats renvoyés avec NAF informatif si dispo, sans blocage.
6. *Sélection manuelle par SIREN* -> reprise de la résolution et enrichissement NAF automatique.
7. *`naf_code = NULL`* -> ne bloque jamais la construction du payload.

### Résultats des validations locales
- **Tests unitaires** (`npm test`) : **1096 tests passés avec succès** (110 fichiers).
- **TypeScript** (`npm run typecheck`) : OK (0 erreur).
- **Garde frontière serveur** (`npm run check:server-boundary`) : OK (100% conforme).
- **Build de production Next.js** (`npm run build`) : Compilé avec succès.

---

## 4. Statut du Batch & Déploiement

- **Code validé & poussé en production** : Commit `4cc7c0fc` (`fix(lot1): disconnect NAF code from identity resolution prerequisites`) déployé sur la branche `main`.
- **Statut de l'exécution du batch** : Lancé sur les 98 comptes, arrêté à la demande de l'utilisateur après le traitement réussi de la première moitié des comptes (jusqu'à **Interima**). Tous les comptes traités ont vu leurs attributs légaux, NAF et faits déterministes A1 enrichis et appliqués dans Supabase avec succès et de manière 100% idempotente.

---

## 5. Prochaines Étapes pour la Reprise

1. **Reprendre le batch complet** :
   ```bash
   npx tsx --env-file=.env.local scripts/lot1-batch-apply.ts --full
   ```
2. **Mesurer les métriques finales** :
   ```bash
   node --env-file=.env.local scripts/lot1-baseline.mjs
   ```
3. **Clôturer officiellement le Lot 1** et initier le Lot 2.
