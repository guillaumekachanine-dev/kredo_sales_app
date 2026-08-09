---
name: kredo-sector-intelligence
description: Conduit une étude sectorielle complète pour Kredo et construit le playbook commercial associé — de l'audit du corpus Supabase existant jusqu'à l'injection en base et la validation front-end. Utilise impérativement ce skill dès que Dosta demande de lancer une nouvelle étude sectorielle, d'ajouter un secteur à l'onglet "Approche sectorielle", de construire un "playbook" commercial, de préparer un pitch DSI pour un secteur, ou plus généralement de documenter/rechercher une nouvelle industrie cible (même sans dire explicitement "étude" ou "playbook" — par exemple "go secteur Aéronautique", "j'ai besoin d'un argumentaire pour le secteur Santé", "ajoute la Travel Tech à Kredo"). Couvre la recherche de marché, le calendrier réglementaire, les pain points, les personas, les arguments ROI, les objections et le pitch 15 minutes.
---

# Kredo — Étude Sectorielle & Playbook Commercial

## Pourquoi ce skill existe

Dosta est un consultant IA freelance en phase de lancement (objectif : poste salarié ou mandats avant septembre 2026). Chaque fiche sectorielle dans Kredo sert un double objectif : c'est un **outil de prospection réel** (qui doit tenir la route en rendez-vous client) et une **pièce de portfolio** (qui démontre sa capacité à produire de l'intelligence commerciale de niveau ESN/cabinet conseil).

Deux fiches de référence existent déjà et fixent la barre : **Parfumerie, Arômes & Cosmétique** (score 4.8/5, appuyée sur un diagnostic réel chez Robertet) et **Banque, Finance & Assurance** (score 4.4/5, corpus plus mince mais compensé par une recherche réglementaire solide sur le GAFI/DORA). Toute nouvelle fiche doit les égaler en rigueur, même si le sujet est moins documenté en interne.

Le risque principal de ce type d'exercice, c'est l'enthousiasme qui pousse à "compléter" un trou de donnée par une invention plausible — un faux verbatim, une fréquence gonflée, un chiffre ROI sans source. C'est exactement ce que ce skill est construit pour empêcher : **mieux vaut une fiche avec des trous visibles et assumés qu'une fiche complète mais fragile.** Un client qui détecte une seule statistique inventée perd confiance dans tout le reste — y compris les parties vraies.

## Vue d'ensemble — 5 phases

| Phase | Contenu | Temps indicatif |
|---|---|---|
| 0 | Cadrage : récupérer les inputs nécessaires | 5 min |
| 1 | Audit du corpus Supabase existant | 30-45 min |
| 2 | Recherche externe (marché, réglementation, trigger events) | 1-2h |
| 3 | Synthèse + construction du playbook commercial | 45 min |
| 4 | Injection transactionnelle en Supabase | 30 min |
| 5 | Validation front-end + remise à Dosta | 15 min |

Ne saute jamais la Phase 1 pour foncer sur la recherche web — c'est la différence entre **diagnostiquer** (s'appuyer sur ce que Kredo sait déjà des comptes réels) et **inventer**. Un pain point appuyé sur un diagnostic réel vaut dix fois plus qu'une généralité plausible trouvée sur le web.

---

## Phase 0 — Cadrage

Avant de lancer quoi que ce soit, assure-toi d'avoir ces informations. Si Dosta ne les a pas toutes données dans sa demande initiale, pose les questions manquantes — mais essaie d'abord de les déduire du contexte (nom du secteur cité, conversation récente) avant de demander.

| Variable | Exemple | Comment l'obtenir si absente |
|---|---|---|
| `SECTEUR_NOM` | "Aéronautique, Défense & Spatial" | Demandé explicitement par Dosta |
| `SECTEUR_KEYWORDS` | aerospace, defense, spatial, aviation, drone | Tu peux les déduire toi-même du nom du secteur |
| `SECTEUR_ACTEURS_CLES` | Airbus, Thales Alenia Space, Naval Group | Recherche rapide si Dosta ne les liste pas |
| `WORKSPACE_ID` | UUID | `SELECT id, name FROM workspaces;` via le connecteur Supabase — normalement un seul résultat |
| `GEOGRAPHIE_PRIORITAIRE` | PACA | Par défaut PACA sauf indication contraire |
| `PRACTICE_FIT_ATTENDU` | data_ai, cyber | Ton hypothèse de travail, à affiner en Phase 3 |

Si le connecteur Supabase MCP n'est pas disponible dans la conversation, dis-le clairement à Dosta avant de continuer — ce skill dépend de cet accès pour les Phases 1 et 4.

---

## Phase 1 — Audit du corpus existant

**Objectif** : déterminer ce que Kredo sait déjà sur ce secteur avant d'aller chercher ailleurs.

Exécute ces trois requêtes via le connecteur Supabase, dans cet ordre :

```sql
-- Requête 1 : comptes déjà rattachables à ce secteur
SELECT c.id, c.name, c.lifecycle_status, c.revenue, c.workspace_id, c.ai_score
FROM companies c
WHERE c.sector ILIKE '%[KEYWORD]%'
   OR c.name IN ('[ACTEUR_1]', '[ACTEUR_2]', ...)
ORDER BY c.lifecycle_status DESC, c.revenue DESC NULLS LAST;

-- Requête 2 : diagnostics IA réels déjà en base (la vraie mine d'or)
SELECT a.company_id, c.name, a.json_output
FROM company_audit a
JOIN companies c ON a.company_id = c.id
WHERE a.company_id IN (SELECT id FROM companies WHERE sector ILIKE '%[KEYWORD]%')
  AND a.json_output IS NOT NULL;

-- Requête 3 : opportunités gagnées/perdues (signaux de marché réels)
SELECT o.id, o.title, o.status, o.close_date, o.amount_eur, c.name
FROM opportunities o
JOIN companies c ON o.company_id = c.id
WHERE c.sector ILIKE '%[KEYWORD]%'
ORDER BY o.close_date DESC NULLS LAST
LIMIT 20;
```

Classe le résultat : **corpus riche** (3+ comptes avec données substantielles, comme Parfumerie) ou **corpus mince** (0-2 comptes, comme Finance/Monaco). Ce classement détermine combien tu vas devoir t'appuyer sur la recherche externe en Phase 2 — un corpus mince n'est pas un échec, c'est juste un signal qu'il faut compenser et le dire honnêtement dans la fiche finale.

Schéma complet des tables : voir `references/schema-supabase.md`.

---

## Phase 2 — Recherche externe

**Objectif** : combler les gaps du corpus avec des données actuelles et sourcées, en particulier sur le calendrier réglementaire — c'est lui qui transforme une fiche descriptive en outil de prospection (une échéance datée crée une urgence commerciale qu'aucun concurrent généraliste ne peut improviser).

Quatre blocs de recherche à couvrir, dans cet ordre de priorité :
1. **Marché & taille** — CAGR, maturité digitale, TJM observable
2. **Réglementation & calendrier** — le bloc le plus important, voir ci-dessous
3. **Trigger events** — acquisitions, incidents concurrents, nominations DSI
4. **Cas d'usage IA / fit practice** — pour calibrer l'angle technique

La méthodologie détaillée (requêtes types, sources à privilégier, comment vérifier qu'une deadline réglementaire est fiable) est dans `references/methodologie-recherche.md` — lis ce fichier avant de lancer tes recherches.

**Documente systématiquement la source de chaque chiffre.** Tu en auras besoin en Phase 3 pour la transparence de la fiche, et c'est ce qui permet à Dosta de défendre chaque donnée en rendez-vous client si on lui pose la question.

---

## Phase 3 — Synthèse & Playbook

**Objectif** : transformer le corpus + la recherche en deux livrables structurés — la fiche sectorielle et le playbook commercial.

Le template de synthèse (fiche complète : marché, acteurs, réglementation, pain points, score d'attractivité) et le template du playbook (4 personas, 5 arguments ROI, 3 objections, 4 points d'entrée, + structure du pitch 15 minutes) sont dans `references/playbook-template.md`.

Trois règles structurent absolument cette phase :
- Une **peur** de persona n'est pas un enjeu reformulé. "Peur de l'audit raté" ≠ "enjeu de conformité". La peur est ce qui empêche de dormir, l'enjeu est ce qui est écrit dans sa fiche de poste.
- Un **argument ROI** sans source identifiable se réécrit en "potentiel estimé à X%, à valider" plutôt que d'être présenté comme un fait.
- Une **objection** doit ressembler à une phrase qu'un vrai prospect dirait, pas à une généralité de manuel commercial ("c'est trop cher" est faible ; "vous allez remplacer mes parfumeurs" est réel et spécifique).

---

## Phase 4 — Injection Supabase

**Objectif** : écrire la fiche complète en base, en une seule transaction atomique (tout passe, ou rien n'est inséré — pas d'état intermédiaire cassé).

Le template SQL transactionnel complet (sector_intelligence → pain_points → regulatory_items → events → rattachement des comptes) est dans `references/injection-sql-template.md`.

Après l'injection, vérifie systématiquement par un SELECT que chaque table contient bien les lignes attendues avant de passer à la validation front-end. Une transaction qui "semble" avoir réussi sans vérification a déjà fait planter une fiche par le passé (contrainte UNIQUE sur `source_url` dans `sector_events` — vérifie que tes URLs de sources sont uniques avant d'insérer).

---

## Phase 5 — Validation & remise

1. Vérifie dans l'app que la nouvelle fiche apparaît dans `/prospection/approche-sectorielle` (le front-end est générique — si l'injection Supabase est correcte, aucune modification de code n'est nécessaire).
2. Ouvre la fiche détail et vérifie que les 6 blocs chargent (pain points triés par fréquence, calendrier avec badges de couleur, comptes rattachés, playbook navigable).
3. Présente la synthèse à Dosta avec, explicitement : ce qui est solide (appuyé sur du diagnostic réel ou une source officielle) et ce qui reste une hypothèse à confirmer terrain.

La checklist complète de validation et le tableau des standards de qualité (ce qui distingue une fiche "production-ready" d'un brouillon) sont dans `references/standards-qualite.md` — relis ce fichier avant de déclarer la fiche terminée.

---

## Les 5 règles non-négociables (résumé)

1. **Jamais de verbatim inventé.** Pas de citation client si elle n'existe pas réellement dans le corpus — champ vide plutôt qu'invention.
2. **Fréquence = comptage réel.** "5/7 comptes" signifie que tu as compté chez 5 sur 7, pas que ça "semble fréquent".
3. **Chaque argument ROI cite sa source** (diagnostic interne ou recherche externe).
4. **Le score d'attractivité est transparent** — afficher le nombre d'études sources à côté du score pour que la confiance reste lisible.
5. **Une transparence explicite sur les manques** vaut mieux qu'une fiche qui a l'air complète mais ne l'est pas. Le bandeau "à valider terrain" est un atout, pas un aveu de faiblesse.

Si tu te retrouves bloqué sur un point précis (recherche infructueuse, corpus vide, ambiguïté sur l'angle commercial), la section troubleshooting de `references/standards-qualite.md` couvre les cas les plus fréquents.
