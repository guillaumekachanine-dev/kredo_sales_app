# SHELL-0018 V2 — Ledger d'implémentation

> **Statut global : en cours**  
> **Baseline : 2026-09-07**  
> **Branche active : `feat/shell-0018-01-section-rail`**  
> **SHA de départ du chantier V2 : `d9c7fc9edb9d35cc6d2fc889d9e251ad0fa311a1`**

Ce ledger est la source de vérité de l'avancement opérationnel du chantier V2.

## 1. Protocole agent

Avant tout lot :

1. lire `README.md` ;
2. lire l'ADR V2 ;
3. lire le standard du rail ;
4. vérifier l'état réel du code concerné ;
5. consigner tout écart ici avant modification.

À la sortie de chaque lot :

1. mettre à jour le tableau de suivi ;
2. consigner les fichiers modifiés ;
3. consigner les gates réellement exécutées ;
4. consigner les limites / dettes ;
5. ne jamais déclarer `done` si une gate nécessaire n'a pas été exécutée ou si une régression connue subsiste.

## 2. Invariants V2

| ID | Invariant |
|---|---|
| V2-N1 | Largeur canonique du rail Desktop : `11.5rem` / `184px`. |
| V2-N2 | Chapeau = bouton navy avec titre de page principal en blanc, gras, centré. |
| V2-N3 | Le nom de l'onglet actif est toujours affiché dans le header principal. |
| V2-N4 | Le rail contient `Chapitres` et éventuellement `Modules`. |
| V2-N5 | `Modules` contient uniquement des modules contextuels réellement disponibles. |
| V2-N6 | Les actions transverses restent hors du rail et sont centralisées dans Cockpit Intelligence. |
| V2-N7 | L'état de navigation est reconstructible depuis l'URL. |
| V2-N8 | `SectionRail` reste présentationnel et client-safe. |
| V2-N9 | Aucune configuration de rail/navigation n'est persistée dans Supabase. |
| V2-N10 | Les dépendances Mobile partagées sont protégées jusqu'à migration explicite. |
| V2-N11 | Aucun changement métier non nécessaire dans un lot de migration de rail. |
| V2-N12 | Aucun bouton mort ou placeholder fonctionnel trompeur dans `Modules`. |

## 3. Gates

Pour un lot de code :

```bash
npm run typecheck
npm run build
npm test
npm run check:server-boundary
npx eslint <fichiers touchés>
```

QA minimale :

- render Desktop ;
- pas d'erreur runtime ;
- pas d'overflow horizontal ;
- scroll correct ;
- chapeau conforme ;
- header avec nom d'onglet ;
- si URL touchée : refresh + back + forward ;
- si contrat partagé touché : smoke test Mobile.

## 4. Lots

| Lot | Objet | Statut | Branche / note |
|---|---|---|---|
| **0A** | Audit complet code + DB | ✅ done | audit du 2026-09-07 |
| **0B** | Rebaseline documentaire V2 | ✅ done | `feat/shell-0018-00-rebaseline` |
| **1.0** | Contrat client-safe de `SectionRail` | 🟡 implémenté, validation en cours | `src/lib/navigation/section-rail.ts` |
| **1.1** | Primitive présentationnelle `SectionRail` | 🟡 implémentée, validation en cours | `src/components/layout/SectionRail.tsx` |
| **1.2** | Tests unitaires de la primitive | 🟡 écrits, exécution à confirmer | `SectionRail.test.ts` |
| **2.1** | Migration Account Intelligence | ⬜ todo | Golden Master |
| **2.2** | Migration Business Intelligence | ⬜ todo | conserver `?tab=` |
| **2.3** | Migration Veille | ⬜ todo | modules contextuels existants |
| **2.4** | Migration Rapports | ⬜ todo | extraire rail inline |
| **2.5** | Migration Automatisations | ⬜ todo | supprimer divergences visuelles |
| **2.6** | Migration Engagements | ⬜ todo | conserver `?vue=` |
| **2.7** | Migration Prospection | ⬜ todo | `15rem → 11.5rem` |
| **2.8** | Migration Knowledge Hub | ⬜ todo | conserver navigation contextuelle |
| **3.x** | Standardisation des modules contextuels | ⬜ todo | uniquement contexte page |
| **4.x** | URLisation des navigations client-state restantes | ⬜ todo | après stabilisation du rail |
| **5.x** | Migration Finance / mécanismes horizontaux | ⬜ todo | rail + URL |
| **6.x** | Refonte Shell global | ⬜ todo | sidebar / ancien mécanisme / Cockpit Intelligence |
| **7.x** | Architecture menu principal | ⬜ todo | chantier produit séparé |
| **8.x** | Nettoyage / clôture | ⬜ todo | suppression legacy prouvée sûre |

## 5. Journal des décisions de rebaseline

### 2026-09-07 — R-01

Le périmètre des Modules du rail est réduit aux **modules contextuels de la page**.

Les actions transverses sont hors rail et relèvent de Cockpit Intelligence.

### 2026-09-07 — R-02

Le chapeau canonique est un bouton navy. Son texte est le titre de page principal, blanc, gras et centré.

### 2026-09-07 — R-03

Le nom de l'onglet actif doit toujours apparaître dans le header de la section principale.

### 2026-09-07 — R-04

La règle historique « chapitre = route » est remplacée par « chapitre = état URL-addressable ». Pathname et query param sont tous deux autorisés.

### 2026-09-07 — R-05

Le Mobile est hors refonte visuelle mais ses dépendances partagées ne sont pas supprimables sans migration explicite.

### 2026-09-07 — R-06

Knowledge Hub n'est plus exempté du châssis commun : seule sa navigation métier contextuelle reste spécifique.

## 6. Écarts connus avant code

- plusieurs rails `11.5rem` sont encore des copies locales ;
- Prospection utilise `15rem` ;
- Knowledge Hub utilise `12.5rem` ;
- Finance utilise encore une barre de tabs horizontale ;
- `SectionNavBar` / `SectionNavBarSlot` restent consommés par des routes historiques ;
- plusieurs pages utilisent `useSidebarCollapse` ;
- certains rails ont un chapeau clair au lieu du chapeau navy canonique ;
- la section Modules n'est pas ancrée en bas partout ;
- certains headers affichent encore un titre générique plutôt que le nom exact de l'onglet actif.

## 7. Clôture du Lot 0B

Fichiers créés :

- `docs/navigation_architecture/SHELL-0018/README.md`
- `docs/navigation_architecture/SHELL-0018/00-CURRENT-STATE-AUDIT-2026-09-07.md`
- `docs/navigation_architecture/SHELL-0018/01-ADR-0018-SHELL-NAVIGATION-V2.md`
- `docs/navigation_architecture/SHELL-0018/02-SECONDARY-RAIL-STANDARD.md`
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`
- `docs/navigation_architecture/SHELL-0018/04-CURRENT-NAVIGATION-INVENTORY.md`

Vérifications documentaires :

- les Modules du rail sont définis uniquement comme contextuels ;
- les actions transverses sont explicitement hors rail ;
- la règle du chapeau navy centré est présente dans README + ADR + standard ;
- la règle du nom d'onglet dans le header principal est présente dans README + ADR + standard ;
- le Mobile est identifié comme dépendance protégée ;
- aucune migration Supabase n'est demandée ;
- aucun fichier applicatif n'a été modifié dans ce lot.

**Verdict Lot 0B : `done`.**

## 8. Lot 1 — état actuel

### Audit d'entrée effectué

- pattern de classes vérifié dans les rails existants ;
- helper `cn` vérifié comme client-safe ;
- pattern de tests par `renderToStaticMarkup` vérifié dans le dépôt ;
- usage de `line-clamp-2` vérifié dans plusieurs composants existants ;
- aucune dépendance Supabase / n8n / `server-only` introduite.

### Fichiers créés

- `src/lib/navigation/section-rail.ts`
- `src/components/layout/SectionRail.tsx`
- `src/components/layout/SectionRail.test.ts`

### Contrat implémenté

La primitive supporte :

- chapeau via `href` ou callback ;
- chapitres via `href` ou callback ;
- état actif ;
- icône optionnelle ;
- labels jusqu'à deux lignes ;
- modules contextuels facultatifs ;
- section Modules ancrée en bas ;
- largeur fixe `11.5rem` ;
- chapeau navy, blanc, gras et centré.

### Validation

- Vercel : déploiement preview déclenché, statut encore `pending` au dernier contrôle ;
- gates locales (`typecheck`, tests, server-boundary, lint ciblé) : non exécutables depuis le connecteur GitHub dans cette session ;
- aucune migration Supabase ;
- aucun changement métier ;
- aucune page encore migrée vers la primitive.

**Verdict lots 1.0–1.2 : `partial` tant que les gates ne sont pas confirmées.**

## 9. Prochaine étape

Après validation du socle : migration d'une première surface existante vers `SectionRail`, sans modification métier. Le choix du premier pilote doit respecter le contrat de chapeau et la présence du titre d'onglet dans le header principal.
