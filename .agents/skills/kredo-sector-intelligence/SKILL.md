---
name: kredo-sector-intelligence
description: Conduit une étude sectorielle KREDO de bout en bout — audit du corpus Supabase, recherche réglementaire sourcée, playbook commercial, injection en base, recette — en appliquant docs/PROCESS-ETUDE-SECTORIELLE.md, qui fait autorité sur le schéma, les gates et la grille qualité. Utilise ce skill dès que Guillaume demande de lancer ou mettre à jour une étude sectorielle, d'activer/ajouter un secteur dans "Approche sectorielle", de construire un playbook commercial, de préparer un argumentaire ou un angle d'attaque pour une industrie, de choisir le prochain secteur à travailler, ou d'évaluer/noter une fiche sectorielle existante — même sans les mots "étude" ou "playbook" (ex. "go secteur Aéronautique", "il nous faut un angle pour le BTP", "on attaque quoi après la parfumerie ?", "cette fiche vaut quoi ?", "ajoute la Travel Tech à Kredo"). Couvre la recherche marché, le calendrier réglementaire, les pain points, les personas, les arguments ROI, les objections et le pitch.
---

# KREDO — Étude sectorielle

## Ce skill est une conduite, pas une référence

Tout le **quoi** — schéma exact, requêtes, structure du livrable, template d'injection, grille de notation — vit dans **`docs/PROCESS-ETUDE-SECTORIELLE.md`**. Ce skill porte le **comment** : l'ordre, les gates, les arrêts, l'auto-contrôle.

Cette séparation n'est pas cosmétique. La version précédente de ce skill recopiait le schéma Supabase. La base a évolué, le skill non, et il a fini par référencer une table qui n'existe pas (`company_audit`), une colonne renommée (`ai_score`), et un template d'injection auquel manquaient deux colonnes `NOT NULL` — il échouait donc en Phase 1 **et** en Phase 4. **Ne recopie jamais de schéma ici.** Une seule source de vérité, sinon la dérive recommence.

> **Ce que tu crois savoir sur ce module est peut-être faux.** Si tu as en tête `company_audit`, `companies.ai_score`, `opportunities.status`, `opportunities.amount_eur`, ou « il y a 2 secteurs en base » : tout cela est périmé. Ne te fie qu'au document et à la base.

**Préséance :** `docs/PROCESS-ETUDE-SECTORIELLE.md` > ce skill > `CLAUDE.md` (périmé sur le sectoriel) > ta mémoire.

## Préflight — avant toute chose

Trois vérifications. Chacune peut arrêter la mission ; le dire est un livrable, pas un échec.

1. **Le document.** Lis `docs/PROCESS-ETUDE-SECTORIELLE.md`. Absent ? Demande-le. Sans lui tu n'as ni le schéma réel ni la grille : tu produirais une fiche qui ne s'injecte pas.
2. **L'accès Supabase.** Un connecteur MCP, un client SQL, ou rien. Si rien → tu es en **mode dégradé** : lis `references/agents-externes.md` avant de continuer. Ne devine jamais un corpus.
3. **La cible.** Le secteur existe presque sûrement déjà en base (les comptes y sont rattachés). Trouve son slug. N'en crée pas un doublon.

## La doctrine — six règles, et pourquoi

Ces règles sont ce que ce skill a de plus durable. Le reste est mécanique.

**1. Jamais de verbatim inventé.** Une citation vient d'une vraie interaction ou d'un vrai diagnostic, sinon le champ reste vide.
*Pourquoi :* un DSI qui détecte **une seule** phrase fabriquée cesse de croire tout le reste — y compris les 90 % qui étaient vrais. Le coût d'un trou assumé est nul ; celui d'une invention détectée est total.

**2. Une fréquence est un comptage, pas une impression.** « 5 comptes » veut dire que tu as listé les 5. Leurs UUID vont dans `source_company_ids` — c'est la preuve, et elle est vérifiable après coup par n'importe qui.
*Pourquoi :* les deux fiches fondatrices n'ont pas ce champ. Leurs fréquences (6/5/5/4) sont donc invérifiables à jamais. La règle existait déjà à l'époque ; l'outil ne la rendait pas applicable. Ne reproduis pas ça.

**3. Chaque argument ROI porte sa source dans son texte.** Pas en annexe : dans la phrase.
*Pourquoi :* l'argument est lu à voix haute en rendez-vous. La source doit être là au moment où la question « vous tenez ça d'où ? » tombe. Sans source → reformule en « potentiel estimé à X %, à valider », ce qui reste vendable et reste honnête.

**4. Une date réglementaire non confirmée sur source officielle n'est pas une date.** Elle devient « échéance à confirmer ».
*Pourquoi :* l'échéance datée est ce qui crée le rendez-vous. C'est le seul étage qu'aucune ESN généraliste n'improvise — et donc le seul endroit où une erreur se paie devant un prospect mieux informé que toi.

**5. Le plafond de corpus bat toujours le calcul du score.**
*Pourquoi :* un 4,8/5 sur un compte n'est pas un score, c'est un mensonge — et il décrédibilise les fiches qui, elles, méritent leur note. Un corpus mince n'est pas un échec : c'est une fiche qui le dit et qui compense par le réglementaire.

**6. Écris en français, avec les accents.**
*Pourquoi :* ce n'est pas de la typographie. La fiche la plus rigoureuse jamais produite est partie en production désaccentuée (« Directrice Qualite / Affaires Reglementaires ») parce qu'un agent a « sécurisé » l'échappement SQL en mutilant le texte. Elle a l'air bâclée alors qu'elle est la meilleure. Le dollar-quoting règle l'échappement ; rien ne justifie de casser le texte.

**La formulation générale de tout ça :** une fiche avec des trous visibles bat une fiche complète mais fragile. Quand tu hésites entre laisser vide et combler avec du plausible — laisse vide, et écris pourquoi.

## Le déroulé

Le document détaille chaque phase. Ton travail est de tenir l'ordre et les gates.

| Phase | Ce que tu fais | Réf. | Durée |
|---|---|---|---|
| **P0 Cadrage** | Figer secteur, slug existant, workspace, géo | §5.3 | 30 min |
| **P1 Audit corpus** | Les 7 requêtes, **telles qu'écrites** | **§4.2** | 1-1h30 |
| *Gate 1* | Classer le corpus : riche / moyen / mince | §4.1 | — |
| **P2 Recherche** | 8-12 requêtes, priorité absolue au bloc réglementaire | §4.3 | 1-2h |
| *Gate 2* | ≥3 items réglementaires datés et vérifiés ? | §4.3 | — |
| **P3 Synthèse** | Le brouillon complet | §6 | 45 min |
| *Gate 3* | **Auto-contrôle noté /100** | **§10** + script | — |
| **P4 Injection** | Migration idempotente, dollar-quoting | §7.3 | 30 min |
| **P5 Recette** | Vérifs SQL puis les 3 pages | §7.4, §8.4 | 15 min |
| **P6 Remise** | Solide / à valider / trous assumés | §5.3 | 15 min |

**Ne saute jamais P1 pour foncer sur le web.** C'est toute la différence entre diagnostiquer et inventer : une douleur adossée à un diagnostic réel vaut dix généralités que n'importe quelle ESN aurait trouvées en trois minutes. Un agent qui commence par chercher sur le web produit une fiche sans corpus — plausible, générique, sans valeur.

**Annonce à chaque fin de phase** ce que tu as trouvé, ce qui manque, et ta note provisoire. C'est ce qui permet d'être arrêté tôt plutôt que corrigé tard.

## Les gates

Un gate n'est pas une formalité de fin : c'est le droit de continuer.

**Gate 1 — corpus classé.** Le classement fixe le plafond de score (§4.1). Annonce-le explicitement : « corpus mince, plafond 4.0 ». Corpus totalement vide → §9, fiche réglementaire pure, plafond 3.5, et tu le dis avant d'engager 5 heures.

**Gate 2 — le réglementaire tient.** Moins de 3 échéances vérifiées → la fiche perd son étage n°1. Ce n'est pas rédhibitoire, mais le score plafonne à 3.5 et c'est une information stratégique : ce secteur est difficile à attaquer à froid. Dis-le.

**Gate 3 — la note.** Sous 70/100 → **n'injecte pas**, retourne en P2 ou P3. Axe A (traçabilité) sous 20/35 → **rejet automatique quelle que soit la note totale** : une fiche non traçable est un risque, pas un actif.

> **Tu vas être indulgent avec toi-même à ce gate.** C'est le biais le plus prévisible de l'exercice : tu viens de produire la fiche, tu la trouves bonne. Fais tourner `scripts/audit_fiche.py` sur ton brouillon — il note la moitié objective de la grille (traçabilité, longueur et accents des titres, cohérence fréquence/preuves, plafond de score) sans état d'âme. Ne t'auto-attribue que ce qu'il te laisse.

```bash
python3 scripts/audit_fiche.py mon-brouillon.json
```

Le script décrit son format d'entrée avec `--schema`. Pas d'interpréteur disponible ? Applique la grille §10 à la main, mais compte les caractères des titres pour de vrai.

## Les arrêts obligatoires

Quatre moments où tu t'arrêtes et où Guillaume décide (§5.2). Les franchir seul est la seule faute non rattrapable de ce processus.

- **Le choix du secteur** (P0) — sauf s'il l'a nommé. Il se calcule, il ne s'intuite pas : §3.2 donne les 5 prérequis et l'état de préparation mesuré de chaque secteur. Le nombre de comptes ne dit rien de la qualité d'une étude — le secteur qui en a le plus est l'un des moins prêts.
- **Gate 3 sous 70** — tu proposes, tu n'injectes pas.
- **L'injection** (P4) — tu écris la migration, tu la montres, **tu ne l'exécutes jamais sans accord explicite**. C'est une écriture en production.
- **Un doute stratégique** — « je ne vois pas comment ce secteur se vend » n'est pas un problème de méthode, c'est une vraie question. Pose-la plutôt que de deviner un angle.

## Modes dégradés

**Sans accès Supabase** (ChatGPT/Gemini sans connecteur) : P1 et P4 sont impossibles. Tu peux faire P2 et P3 avec le corpus collé par Guillaume — c'est un mode utile pour la recherche réglementaire, mais annonce le plafond honnêtement. Détail dans `references/agents-externes.md`.

**Sans accès web** : Gate 2 tombe. Tu ne peux pas vérifier une échéance. Dis-le ; ne recopie pas les échéances FOLIO, qui sont vagues (« 2026-2030, mise en œuvre progressive ») et sans source.

**Secteur déjà `active`** : c'est une mise à jour, pas une création. Le template §7.3 est idempotent. **Ne supprime jamais un verbatim réel existant** — c'est irremplaçable, alors que tout le reste se recalcule.

## Les pièges qui coûtent le plus

Par ordre de fréquence observée.

| Piège | Ce que ça donne | La parade |
|---|---|---|
| Titre de pain point long et technique | Le pitch du playbook est **dérivé** de `pain_points[0..2]` (§8.2) : ce titre sera lu à voix haute en RDV. « Referentiel reglementaire et packaging disperse sur des catalogues larges » est inutilisable. | ≤ 60 caractères, oral, accentué |
| Recopier une échéance FOLIO | FOLIO n'a ni source ni date. Ses échéances sont floues. | Re-vérifier sur source officielle, ou dégrader en « à confirmer » |
| Pain point vague | « Complexité IT », « transformation digitale » — vrai partout, donc utile nulle part | Cherche le chiffre : « 20 serveurs non documentés, +4 jours d'audit sur 22 » |
| Peur = enjeu reformulé | « Ne pas être conforme » n'est pas une peur, c'est l'enjeu à la négative | La peur empêche de dormir ; l'enjeu est dans la fiche de poste (§6.2) |
| Objection générique | « C'est trop cher » = tu n'as pas creusé le métier | « L'IA va remplacer nos parfumeurs » — une crainte identitaire, propre au métier |
| Chercher 40 requêtes web | Tu ne cherches plus, tu procrastines | 8-12, puis « à confirmer » |
| `frequency_count` sans `source_company_ids` | Colonne `NOT NULL` : l'injection échoue. Et la règle 2 devient inapplicable. | Note les UUID **pendant** P1, pas après |

## Comment on sait que c'est bon

Une seule question, et elle n'est pas dans la grille :

> **Un commercial qui ne connaît rien à ce secteur peut-il, après 20 minutes de lecture, appeler un DSI et tenir 15 minutes sans bluffer ?**

La grille /100 mesure si tu as le droit d'injecter. Cette question mesure si ça sert à quelque chose. Les deux fiches de référence donnent l'étalon : `parfumerie-aromes` pour la densité (10 comptes, 7 verbatims), `nutraceutique-sante-naturelle` pour la rigueur (sources dans le texte, preuves de comptage). Aucune n'atteint 90. **La cible est la première fiche qui combine les deux.**
