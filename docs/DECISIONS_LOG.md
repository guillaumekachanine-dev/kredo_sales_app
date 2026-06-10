# Journal des décisions

> Une ligne par décision. Forme synthétique, en parallèle de la documentation détaillée (ADR).
> Légende statut : ✅ actée · 🔄 à revisiter · ❌ abandonnée

| # | Date | Décision | Pourquoi (résumé) | ADR | Statut |
|---|------|----------|-------------------|-----|--------|
| D-01 | 2026-06 | Un seul outil (hub modulaire), pas plusieurs apps spécialisées | Préserver la source de vérité unique ; éviter la duplication de données | [0002](adr/ADR-0002-monolithe-modulaire.md) | ✅ |
| D-02 | 2026-06 | Cible repoussée du 30/06 au 01/09 | Périmètre commercial + recrutement irréaliste en 1 mois en solo | — | ✅ |
| D-03 | 2026-06 | Construire l'amont commercial d'abord, différer la finance/RH | Données d'entreprise indisponibles avant l'embauche (mais dataset récupéré) | — | ✅ |
| D-04 | 2026-06 | Stack : Next.js 15 + Supabase + n8n + Tailwind/shadcn | Lean, serverless, async externalisé ; Recharts écarté | [0001](adr/ADR-0001-stack-technique.md) | ✅ |
| D-05 | 2026-06 | Projet Supabase **dédié** à Kredo (pas mutualisé) | App complète (Auth, Realtime, pgvector), enveloppe gratuite pour Kredo seul | [0003](adr/ADR-0003-supabase-projet-dedie-schema-unique.md) | ✅ |
| D-06 | 2026-06 | Schéma `public` **unique** + préfixes par domaine (pas de schéma/brique) | Kredo vit de ses jointures cross-domaine ; le multi-schéma fragilise l'API auto | [0003](adr/ADR-0003-supabase-projet-dedie-schema-unique.md) | ✅ |
| D-07 | 2026-06 | Multi-tenant écarté (pas de table `workspaces`) | Outil mono-utilisateur ; sur-ingénierie inutile | [0004](adr/ADR-0004-modele-pivot-opportunite.md) | ✅ |
| D-08 | 2026-06 | L'opportunité est le pivot ; construite en première brique | Fixe ~60 % des relations de toute l'app | [0004](adr/ADR-0004-modele-pivot-opportunite.md) | ✅ |
| D-09 | 2026-06 | `stage` (tunnel) et `outcome` (issue) séparés ; argent en `numeric` ; pipe pondéré en colonne générée | Analyse « où je perds mes deals » ; zéro erreur d'arrondi ; calcul fiable par la base | [0004](adr/ADR-0004-modele-pivot-opportunite.md) | ✅ |
| D-10 | 2026-06 | Moteur de calcul financier isolé de la couche données | Survivre à un changement de schéma au moment de l'embauche | [0001](adr/ADR-0001-stack-technique.md) | ✅ |
| D-11 | 2026-06-10 | Device : **adaptive ciblé + responsive par défaut** (Desktop/Mobile séparés seulement sur écrans denses ; responsive CSS ailleurs ; corriger le mécanisme UA) | Coût 2× intenable en solo ; bug cache CDN / tablette ; thèse Desktop=Analyse/Mobile=Action préservée là où elle compte | [0006](adr/ADR-0006-strategie-device-adaptive-cible.md) | ✅ |
| D-12 | 2026-06-10 | Moteur d'intelligence commerciale internalisé : **3 tables `ai_intelligence_*`** (pas 5), `content_json` source unique, statut unifié + `needs_review`, **scoring déterministe 1–10**, orchestration **hybride durcie** (n8n worker + prompts/Zod in-repo, callback HMAC/idempotent/service-role), backfill ETL FOLIO | Reprendre les principes FOLIO sans recopier la dette (sources multiples, statuts incohérents, RLS contourné) ; KREDO autonome | [0007](adr/ADR-0007-moteur-intelligence-commerciale.md) | ✅ |
| D-13 | 2026-06-10 | Perf : **optimiser dans l'architecture actuelle**, PAS de PPR ni de routing segmenté par device. Livré : `getUser`→`getClaims` (proxy), `loading.tsx` par section, fetch parallèles (`getMissionDetail`), `cache()` sur `getDashboardDevice`, élagage fonts + fix mapping `--font-mono`. Le refactor device responsive reste **K-004** (non bundlé ici). | Goulot réel mesuré = aller-retour auth + absence de feedback + mode dev, **pas** le rendu dynamique (TTFB rendu ~5 ms en prod). PPR = complexité expérimentale sans gain sur la nav intra-app d'un outil interne authentifié. Éviter une N-ième bascule de direction. | [0006](adr/ADR-0006-strategie-device-adaptive-cible.md) | ✅ |
