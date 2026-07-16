# Exécuter une étude sectorielle hors Claude Code

À lire quand tu tournes sur Codex, ChatGPT, Gemini, Antigravity — ou dès que **l'accès Supabase manque**, quel que soit l'agent.

## Où ce skill est installé, et pourquoi là

Ce skill vit dans **`.agents/skills/kredo-sector-intelligence/`**, à la racine du dépôt. Ce n'est pas un choix esthétique : c'est le seul emplacement que **Codex et Antigravity lisent tous les deux**, et il est versionné avec `docs/PROCESS-ETUDE-SECTORIELLE.md`, ce qui empêche les deux de dériver l'un de l'autre.

| Agent | Ce qu'il lit | Vérifié |
|---|---|---|
| **Codex** | `.agents/skills` — remonté depuis le dossier courant jusqu'à la racine du dépôt | 2026-07-16 |
| **Antigravity** | `<workspace-root>/.agents/skills/` (projet) · `~/.gemini/config/skills/` (global) | 2026-07-16 |
| **Claude Code** | `.claude/skills/` → **symlink** vers `../.agents/skills` | ce dépôt |

Le format SKILL.md est le même chez les trois (frontmatter `name` + `description`, chargement progressif : seule la description est en contexte, le corps ne se charge qu'au déclenchement). **Aucune adaptation n'est nécessaire.** Si tu clones ailleurs, copie le dossier tel quel.

## Le trio

Une étude autonome demande trois pièces. Aucune ne remplace les autres.

| Pièce | Rôle | Sans elle |
|---|---|---|
| **`docs/PROCESS-ETUDE-SECTORIELLE.md`** | La référence : schéma réel, requêtes, structure, grille | Tu écris du SQL de mémoire — il sera faux, le schéma a bougé |
| **Ce skill** | La conduite : ordre, gates, arrêts, doctrine | Tu produis une fiche plausible et invérifiable |
| **Le prompt de lancement** (Annexe A du doc) | L'amorce : la mission et les interdits | L'agent improvise son propre périmètre |

Colle les trois. Si ton agent ne sait pas charger un skill, colle ce `SKILL.md` comme un document ordinaire : il est écrit pour être lu, pas pour être exécuté par une mécanique particulière.

## Raisonne en capacités, pas en marques

Les produits changent tous les trimestres ; ce qui détermine ce que tu peux faire, ce sont quatre accès. Établis-les **avant** de commencer, et annonce le plafond qui en découle.

| Accès | Ce qu'il débloque | Sans lui |
|---|---|---|
| **Le dépôt** (le doc) | Tout | **Arrête-toi.** Demande le document. |
| **Supabase** (MCP, client SQL, psql) | P1 (audit corpus) et P4 (injection) | Mode dégradé ci-dessous |
| **Web** | P2, bloc réglementaire = l'étage n°1 | Gate 2 tombe : plafond 3.5 |
| **Exécution Python** | `scripts/audit_fiche.py` = Gate 3 objectif | Grille §10 à la main — compte les caractères pour de vrai |

**Plafonds réalistes selon les accès** (à annoncer d'emblée, pas à découvrir à la fin) :

| Configuration | Plafond | Pourquoi |
|---|---|---|
| Dépôt + Supabase + web + Python | **~90/100** | Le dispositif complet |
| Dépôt + web + Python, **sans Supabase** | **~50/100** | P1 et P4 impossibles : pas de corpus, pas d'injection |
| Dépôt + Supabase, **sans web** | **~55/100** | Aucune échéance vérifiable → la fiche perd sa raison d'être |
| **Sans le doc** | — | Ne commence pas |

## Mode dégradé — sans accès Supabase

C'est le cas courant sur ChatGPT ou Gemini. Il est **utile**, à condition d'être honnête sur ce qu'il est : un mode de **recherche réglementaire**, pas de production de fiche complète.

**Ce que tu peux faire :** P2 (recherche externe) et P3 (synthèse), à partir d'un corpus que Guillaume te colle.
**Ce que tu ne peux pas faire :** P1 et P4. Et **tu ne les simules pas**.

> **L'erreur à ne pas commettre :** compenser l'absence de corpus par du web. Tu produirais une fiche que n'importe quelle ESN aurait pu écrire — plausible, générique, sans le seul ingrédient qui la rend défendable. Le corpus KREDO **est** le différenciateur. Sans lui, dis-le et travaille sur ce que tu as.

### Ce qu'il faut demander

Demande en une fois, pas au fil de l'eau. Message type :

> Je n'ai pas d'accès Supabase. Pour l'audit de corpus (Phase 1), peux-tu exécuter les 7 requêtes de la **§4.2** du document sur le secteur `[SLUG]` et me coller les résultats ?
>
> Les plus déterminantes, si tu veux limiter :
> - **Requête 2** — les `metadata.sector_analysis` FOLIO du secteur. C'est la mine.
> - **Requête 1** — les comptes rattachés, avec leur `lifecycle_status`.
> - **Requête 5** — les `interactions` : c'est la seule source légitime de verbatim.
>
> Sans la requête 2, je ne peux pas faire de pain point sourcé. J'irais chercher sur le web, et ça produirait une fiche générique.

**N'invente jamais les UUID.** `source_company_ids` doit contenir des identifiants réels, venus de la requête 1. Si tu ne les as pas, laisse le champ vide **et dis que la fiche n'est pas injectable en l'état** — plutôt que d'inventer des UUID qui feront échouer l'insertion (clé étrangère) ou, pire, pointeront vers les mauvais comptes.

### Livrer en mode dégradé

Ta sortie est un **brouillon JSON** (§6.1, format détaillé par `python3 scripts/audit_fiche.py --schema`) plus la remise §5.3. Pas de migration SQL exécutée : tu la proposes, quelqu'un avec l'accès l'applique.

Annonce en tête de remise, sans l'enterrer en note de bas de page :

> ⚠️ Produit sans accès Supabase. Le corpus vient de ce qui m'a été fourni, pas d'un audit que j'ai conduit. Les fréquences et les rattachements de comptes sont **à vérifier avant injection**.

## Notes par famille d'agents

Écrites en juillet 2026 — vérifie plutôt que de croire, les capacités bougent vite.

**Codex** — le skill se déclenche seul si le dépôt est ouvert (`.agents/skills` est scanné). On peut aussi le forcer avec `$kredo-sector-intelligence`. Le doc est dans le dépôt : lis-le, ne le devine pas. Python est disponible → le script d'audit tourne. L'accès Supabase dépend d'un client et de credentials présents dans l'environnement : **ne suppose pas, teste** par `SELECT slug FROM sector_intelligence;`. S'il n'y en a pas, tu es en mode dégradé — et c'est le cas le plus probable.

**Antigravity** — même mécanique via `.agents/skills/` du workspace. Un `AGENTS.md` à la racine est lu depuis la v1.20.3, mais il n'est pas nécessaire ici : la description du skill suffit à le déclencher.

**ChatGPT / Gemini (chat)** — pas de dépôt : joins les trois pièces à la main. Sans connecteur base, mode dégradé — ne bricole pas une connexion, demande le collage. La recherche web y est bonne : le bloc réglementaire (§4.3 B2) est là que ces agents rendent le plus de valeur.

**Tout autre** — établis les quatre accès par un test réel, annonce le plafond, puis suis le déroulé. La méthode ne dépend d'aucun produit.

## Ce qui ne change jamais

Quel que soit l'agent, quel que soit le mode :

- Un verbatim vient d'une interaction réelle, ou le champ reste vide.
- Une fréquence est un comptage, et les UUID en sont la preuve.
- Une date non confirmée sur source officielle n'est pas une date.
- Le plafond de corpus bat le calcul du score.
- Les accents sont obligatoires.
- L'injection ne s'exécute jamais sans accord explicite de Guillaume.

Un mode dégradé change ce que tu **peux** faire. Il ne change rien à ce que tu as le droit d'affirmer.
