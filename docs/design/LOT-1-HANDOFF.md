# LOT 1 — Document de reprise (HANDOFF)

> **STATUT : TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**
> Dernière mise à jour : 2026-08-04 CEST

## État global

- [x] Préflight
- [x] Lecture Lot 0
- [x] Inventaire captures
- [x] Audit legacy Desktop rendu à 1440×900
- [x] Audit legacy Mobile rendu à 390×844
- [x] Inspection DOM et styles calculés
- [x] Inspection code
- [x] Validation Supabase lecture seule — 81 études mesurées, trois profils identifiés
- [x] Charte graphique
- [x] Component map
- [x] Visual QA
- [x] Relocalisation des blocs
- [x] Interaction réelle, console, clavier et reflow équivalent 200 %
- [x] Validation finale Lot 1 — écarts consignés pour les Lots d'implémentation

## Commandes exécutées

| # | Commande | Résultat |
|---|---------|----------|
| 1 | `git status --short` | Quatre livrables Lot 1 et `n8n/workflows/folio_legacy/` non suivis ; aucun autre changement |
| 2 | `git branch --show-current` | `main` ; aucune branche créée |
| 3 | `git log --oneline -10` | Historique récent inspecté ; aucun commit créé |
| 4 | Recherche `rg` des routes/composants | Chemins legacy, modales, parsers, contrats et styles localisés sans supposition |
| 5 | Mesure des cinq PNG | Dimensions, profil Display P3, aplats et géométrie 2× inspectés |
| 6 | Supabase `WITH … SELECT` | 81 études mesurées ; profils dense/intermédiaire/pauvre identifiés ; aucune écriture |
| 7 | Démarrage local Next.js | Application disponible localement ; session authentifiée reprise dans le Browser in-app |
| 8 | Inspection Browser | Catalogue + recherche réelle + détails Experis/Groupe IDEC/Audemard + état sans FOLIO ; Desktop 1440×900, Mobile 390×844 et reflow 720×450 |
| 9 | Test Vitest ciblé modale | 1 fichier, 7 tests passés (focus trap et contrats responsives) |
| 10 | Validation Git intermédiaire | `git diff --check` propre avant la passe Browser ; validation finale rejouée après mise à jour des preuves |

## Fichiers inspectés

### Documents Lot 0
- `docs/intelligence/INTEL-030-ACCOUNT-KNOWLEDGE-V3-CONTRACT.md` — intégralement lu
- `docs/design/COCKPIT-INTELLIGENCE-FOLIO-REFERENCE-MANIFEST.md` — intégralement lu
- `docs/design-systems/cockpit_intelligence_design.md` — intégralement lu
- `docs/design-systems/edito_bright_design.md` — intégralement lu

### Composants FOLIO legacy
- `src/features/legacy/folio/FolioSectorAnalysisPanel.tsx` — Desktop, 280 lignes
- `src/features/legacy/folio/FolioMobileAnalysisSections.tsx` — Mobile, 223 lignes
- `src/features/legacy/folio/FolioSectorStudyDetail.tsx` — Wrapper, 97 lignes
- `src/features/legacy/folio/FolioSectorStudiesCatalogue.tsx` — Liste, 276 lignes
- `src/features/legacy/folio/FolioBanner.tsx` — Banner archive, 19 lignes
- `src/features/legacy/folio/icons.tsx` — 7 icônes SVG, 62 lignes
- `src/features/legacy/folio/types.ts` — Types SectorAnalysisData, 64 lignes
- `src/features/legacy/folio/utils.ts` — Parsers, 88 lignes
- `src/features/legacy/folio/folio-loader.ts` — Data loader Supabase, 95 lignes

### Routes
- `src/app/(app)/legacy/folio/sector-studies/page.tsx` — Liste
- `src/app/(app)/legacy/folio/sector-studies/[companyId]/page.tsx` — Détail

### Composants Intelligence
- `src/components/intelligence/IntelligenceSplitModalShell.tsx` — Modale split, 164 lignes
- `src/components/accounts-contacts/intelligence/CompanyDocumentsModal.tsx` — Documents, 1002 lignes
- `src/lib/dashboard/dashboard-device.ts` — distribution serveur Desktop/Mobile
- `src/lib/intelligence/folio-legacy-contracts.ts` — Contrats legacy, 201 lignes

### Styles
- `src/app/globals.css` — L190-206 : tokens edito-*, L340-467 : thème edito-bright-cockpit
- `src/app/layout.tsx` — Lato (400, 700) `--font-sans` ; Manrope (500, 600, 700) `--font-heading`
- `postcss.config.mjs` — Tailwind v4 (`@tailwindcss/postcss`)

## Captures historiques inspectées

Cinq captures fournies dans la conversation (Lot 1) :
1. **Réf. 01 — Marché**, 1004 × 1394, bas recadré
2. **Réf. 02 — Synthèse sectorielle**, 2026 × 912, carte complète
3. **Réf. 04 — Concurrence**, 1006 × 1418, bas recadré
4. **Réf. 05 — Clientèle**, 1002 × 1422, bas recadré
5. **Réf. 06 — Chaîne de valeur**, 992 × 1402, bas recadré

Les Réf. 03, 07, 08 et 09 ne sont pas des références manquantes. Elles montrent la mise en page Kredo actuelle à remplacer et ont été explicitement exclues comme cibles graphiques. Elles n'ont servi à aucune mesure ni décision FOLIO.

## Documents vérifiés et corrigés

1. `docs/design/COCKPIT-INTELLIGENCE-FOLIO-CHARTER.md`
2. `docs/design/COCKPIT-INTELLIGENCE-FOLIO-COMPONENT-MAP.md`
3. `docs/design/COCKPIT-INTELLIGENCE-FOLIO-VISUAL-QA.md`
4. `docs/design/LOT-1-HANDOFF.md`

## Décisions prises

1. Tailwind v4 confirmé (pas de tailwind.config, `@tailwindcss/postcss`)
2. Polices : Lato (400/700) → `--font-sans`, Manrope (500/600/700) → `--font-heading`
3. Le thème `edito-bright-cockpit` remplace `--font-heading` par `--font-sans` → tout en Lato
4. Les composants Desktop et Mobile sont séparés côté serveur (pas de hide/show CSS)
5. Les couleurs CSS `edito-*` concordent avec les captures après conversion Display P3 → sRGB ; le canvas réellement visible est le token global `#F4F2ED`
6. Filet synthèse confirmé à 2px CSS ; header section confirmé à 38px CSS ; carte de grille à 484px et synthèse à 992px au conteneur max
7. CSS Grid étire les cartes d'une même rangée par défaut ; `items-start` est une correction `V3_EXTENSION`, pas une propriété historique prouvée
8. Disclosure : aucune avant 11 items ; le maximum Supabase actuel est 10
9. Toute variante Mobile graphique et toute fiche d'identité sont `V3_EXTENSION` faute de capture historique canonique
10. Relocalisation : Organisation → espace relationnel, Activités op. → diagnostic process, Relation commerciale → timeline CRM

## Supabase — lecture seule

- Projet : Kredo Sales App, aucune donnée modifiée.
- 81 études FOLIO observées.
- Synthèse : 1 504 à 3 011 caractères, moyenne 2 143.
- JSON `sector_analysis` : 17 647 à 35 159 octets, moyenne 27 260.
- Maxima : 6 concurrents, 7 segments, 8 réglementations, 9 certifications, 7 risques de conformité, 10 maillons clés.
- Profils retenus : Groupe IDEC (dense), Audemard (intermédiaire), Griesser (pauvre/sans FOLIO).
- Requêtes exclusivement `WITH … SELECT` ; aucun INSERT, UPDATE, DELETE, RPC, migration, RLS ou type généré.

## Résultats et écarts QA

1. Rendu authentifié des deux routes confirmé ; aucune erreur ni aucun warning console observé.
2. Desktop 1440×900 : pas d'overflow de page ; synthèse 992px, cartes 484px, header Marché 37px, étirement Grid legacy confirmé.
3. Mobile 390×844 : détail dense en une colonne, texte non tronqué et sans overflow de page.
4. Catalogue Mobile : tableau dans un conteneur `overflow-x-auto` (292px visibles sur 1 101px) ; l'action est hors champ initial.
5. Accessibilité : `html lang="en"` confirmé ; recherche 34px Desktop, 42px Mobile et selects 39,5px Mobile, sous la cible 44px.
6. Clavier : focus visuel présent, mais `Tab` laisse le focus sur la recherche du catalogue au lieu d'avancer.
7. Reflow équivalent zoom 200 % à 720×450 : aucun overflow de page sur le détail Experis.
8. Modale : sept tests unitaires passent et les contrats sont documentés ; l'exécution Browser de la modale reste un critère Lot 5.

## Limites assumées du Lot 1

- Aucun test Playwright permanent ni aucune dépendance de navigateur n'ont été ajoutés.
- Zoom natif, axe/Lighthouse, contraste automatisé et interaction Browser de la modale sont reportés au Lot 5.
- Aucune correction de production n'est incluse dans ce lot documentaire.

## Navigateur

Le Browser in-app authentifié a été utilisé. Les preuves couvrent le catalogue, une recherche réelle, Experis (comparaison canonique), Groupe IDEC (dense), Audemard (intermédiaire), l'état sans FOLIO, les viewports 1440×900 et 390×844, le reflow 720×450, les snapshots DOM, les styles calculés et la console.

## Sécurité

- ✅ Aucun secret reproduit dans les livrables
- ✅ Aucun workflow n8n modifié
- ✅ Aucune donnée Supabase modifiée
- ✅ Aucun fichier `.env*` modifié
- ✅ Aucun commit créé
- ✅ Aucun déploiement
- ✅ Exports n8n non ajoutés au dépôt (restent dans `n8n/workflows/folio_legacy/`, non suivi)

## Prochaine action

Faire valider humainement les quatre livrables, puis reprendre les écarts consignés (`lang`, ordre Tab, cibles 44px, tableau Mobile et modale réelle) dans les Lots d'implémentation concernés.
