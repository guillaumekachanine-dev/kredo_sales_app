# 12 — Outillage · qui fait quoi, et faut-il des Projets

---

## 1. La répartition, tranchée

Chaque outil a une chose qu'il fait mieux que les autres, prouvée sur les runs de 2026. Et une
chose qu'il ne doit plus faire.

| Outil | Ce qu'il fait le mieux, prouvé | Ce qu'il ne doit plus faire |
|---|---|---|
| **ChatGPT Deep Research** | **E4 — la couche COMPRENDRE.** Meilleur rapport preuve/effort observé : 90 sources numérotées avec URL, hiérarchie officiel → primaire → sectoriel respectée, et la discipline de distinguer une proposition législative d'un texte applicable | Produire la couche compte, prioriser, scorer |
| **Gemini Deep Research** | **E3 — la découverte de sources.** Les deux référentiels produits sont structurellement conformes au standard, complets sur les 11 sections | **Remplir sa propre scorecard.** L'auto-notation `production_ready` sur un journal de 5 requêtes est le défaut à éliminer |
| **Claude Opus** (Projet ou Code) | **E5 — la couche ATTAQUER**, et tous les gates. Respect d'un schéma, refus d'inventer, détection de contradictions internes. C'est ce qui a trouvé la contradiction top 3 / tableau et les champs `null` | Faire la recherche primaire à la place d'un Deep Research |
| **Claude Code (ce dépôt)** | Orchestration, lecture de la base, conversion commerciale, **ingestion Supabase**, G1 | Produire E4 de mémoire quand l'accès web est limité |
| **n8n + APIs publiques** | **E2, le régime déterministe.** Sirene, RNE/BODACC, France Travail, Légifrance, TED/BOAMP | Scraper ce qu'une API expose |
| **NotebookLM** | **G2, la passe red team.** On y dépose les sources + le livrable : le modèle ne répond que depuis le corpus, donc **il ne peut pas combler un trou par mémoire** | Produire du contenu |
| **Apollo / Lusha** | Décideur SI et organigramme, **sur les comptes prioritaires uniquement** | Un enrichissement de masse sur 109 comptes |
| **Bright Data** | Pages « devenir fournisseur » et offres d'emploi difficiles d'accès | Toute aspiration que les CGU interdisent |

**Ce qu'on n'ajoute pas** : un quatrième moteur de recherche générative — le goulot n'est pas
la découverte, c'est l'acquisition déterministe et la vérification ; une base payante type
Infogreffe/Diane en V1 — Sirene + BODACC couvrent 90 % du besoin gratuitement ; un crawler
maison.

**Point de vigilance opérationnel** : les connecteurs Apollo et Lusha sont présents dans
l'environnement mais **non authentifiés**, et l'authentification OAuth est **impossible depuis
une session agent** — elle se fait en session interactive. Tant que ce n'est pas fait, le
sous-bloc « décideur SI » de A6 reste humain.

---

## 2. Faut-il des Projets Claude ou des GPTs ?

**Oui pour un Projet Claude. Non pour un GPT. Et surtout : un Projet par _méthode_, jamais un
par secteur.**

### 2.1 Pourquoi un Projet, et pas un simple prompt collé

Les prompts de ce corpus font entre 200 et 400 lignes et s'accompagnent de quatre fichiers de
contexte (`cadrage`, `socle`, `sources`, `secteur`). Les recoller à chaque run, c'est trois
choses :

- une dérive garantie (on colle la version qu'on a sous la main, pas la version courante) ;
- une perte des documents de référence, donc un modèle qui improvise le schéma ;
- aucune trace de ce qui a été réellement fourni au modèle, donc un run non reproductible.

Un Projet règle les trois : les documents de connaissance du projet **sont** ce corpus, et ils
sont les mêmes pour tous les runs.

### 2.2 Pourquoi un Projet par méthode, pas par secteur

Un Projet par secteur, c'est 53 projets. Chacun accumulerait un état, une conversation, des
préférences, et **ils divergeraient** — exactement le mécanisme par lequel les skills ont fini
par référencer une table inexistante.

Le secteur n'est pas une méthode : c'est un **paramètre**. Il entre en pièce jointe au moment du
run (`00-cadrage.json`, `02-socle.json`, `03-sources.json`) et il en ressort dans le livrable.

### 2.3 La configuration recommandée — trois Projets, pas plus

| Projet | Outil | Documents de connaissance | Ce qu'on y lance |
|---|---|---|---|
| **KREDO · Étude sectorielle** | ChatGPT (Deep Research) | `00-DOCTRINE.md` · `07-ETAPE-E4…` · `prompts/E4-etude-sectorielle.md` · `schemas/sector-knowledge.schema.json` | E4, et E4 seulement |
| **KREDO · Cartographie & comptes** | Claude (Opus) | `00-DOCTRINE.md` · `08-ETAPE-E5…` · `prompts/E5-cartographie-comptes.md` · `schemas/competitive-map.schema.json` · `11-VARIANTES.md` | E5, V1, V2, V3 |
| **KREDO · Sources sectorielles** | Gemini ou ChatGPT | `06-ETAPE-E3…` · `prompts/E3-corpus-sources.md` · `04_SCHEMA_SORTIE…json` · `01_METHODE_STANDARD…md` | E3 |

**Instructions personnalisées de chaque Projet** — trois lignes, toujours les mêmes :

```
Tu appliques le corpus MASTER-STUDY de KREDO, joint en documents de connaissance.
En cas de conflit entre ta mémoire et un document joint, le document gagne.
Tu ne produis jamais un champ marqué « régime déterministe » : tu le reçois ou tu le laisses vide.
```

### 2.4 Pourquoi pas un GPT

Un GPT (ChatGPT Store) apporte trois choses : une persona persistante, des actions API, et le
partage. Aucune des trois ne sert ici :

- **La persona** est déjà dans le prompt, versionné dans le dépôt — c'est mieux, parce que
  c'est diffable.
- **Les actions API** supposeraient d'exposer Supabase à ChatGPT. C'est un risque de sécurité
  sans contrepartie : l'ingestion se fait par Claude Code, qui est déjà dans le dépôt et sous
  RLS.
- **Le partage** ne sert pas un usage à un opérateur.

Et un GPT a un coût réel : **sa configuration n'est pas versionnée**. Elle dérive du dépôt sans
que rien ne le signale. C'est le mode d'échec qu'on a déjà payé deux fois.

**Un cas justifierait un GPT** : si plusieurs commerciaux devaient lancer des V2 (compte
unique) eux-mêmes, sans passer par Guillaume. Ce n'est pas le besoin actuel — mais c'est le
signal à surveiller.

### 2.5 Les skills du dépôt

Deux skills existent, `kredo-sector-intelligence` et `kredo-sources-sectorielles`. Ils sont
bien conçus — ils portent le **comment** (l'ordre, les gates, les arrêts) et délèguent le
**quoi** à un document de référence, ce qui est exactement la bonne séparation.

🔴 **Mais `kredo-sector-intelligence` pointe vers `docs/PROCESS-ETUDE-SECTORIELLE.md`, qui
n'existe plus** — le fichier a été déplacé dans `_legacy_kredo_(studies_v1)/` lors de la
réorganisation d'août. La référence est cassée dans le frontmatter, dans le corps, dans deux
fichiers de `references/` et dans `scripts/audit_fiche.py`.

**Un agent qui déclenche ce skill aujourd'hui ne trouve pas sa référence et improvise le
schéma** — précisément le mode d'échec que le skill dit avoir payé une session entière.

Traitement recommandé, dans cet ordre :
1. Repointer `kredo-sector-intelligence` sur `docs/MASTER-STUDY/07-ETAPE-E4-ETUDE-SECTORIELLE.md`
   (et non sur l'archive), en conservant sa doctrine — ses six règles sont excellentes et sont
   reprises dans `00-DOCTRINE.md`.
2. Repointer `kredo-sources-sectorielles` sur `06-ETAPE-E3-CORPUS-DE-SOURCES.md`, en gardant sa
   délégation au standard `sources_intelligence_standards/`, qui reste normatif.
3. Généraliser les deux scripts d'audit en un seul `scripts/audit-master-study.py` (G1).

---

## 3. Le déclenchement — ce qui est manuel, et pourquoi

**La Master Study n'est ni automatisée ni déclenchable depuis l'interface. C'est délibéré.**

| Étape | Déclenchement | Motif |
|---|---|---|
| E0, E1 | Manuel | Trois décisions de périmètre. Un LLM ne les prend pas |
| **E2** | **Cron / webhook** | Déterministe, sans jugement — c'est le seul bloc automatisable |
| E3 | Manuel, dans un Projet | 1 à 2 h de Deep Research |
| E4, E5 | Manuel, dans un Projet | Coût élevé, jugement requis, gates humaines |
| E6 | Manuel | Conditionnel, et exige un arbitrage sur la captation |
| G1 | Script, automatique | Comptage |
| G2 | Manuel, contexte séparé | Le point clé est **le changement de contexte** |
| G3 | Humain | Irremplaçable |
| Ingestion E5 | **Manuel, par le wizard** | La résolution `ambiguous` est un arbitrage (ADR-0019) |

**Automatiser E4/E5 serait une erreur de conception**, pas une économie : le coût réel d'une
étude n'est pas le temps de production, c'est le temps de vérification. Une étude produite sans
gate est un document qu'il faudra relire entièrement, donc plus cher qu'une étude produite
lentement.

---

## 4. Dette d'outillage connue

| # | Dette | Effet |
|---|---|---|
| 1 | Skills pointant vers un fichier disparu (§2.5) | Un agent improvise le schéma |
| 2 | Le générateur de référentiels tronque au `minimum_pack` | Aucun nouveau référentiel avant correction |
| 3 | `slice(0, 40)` positionnel dans la veille hebdomadaire | Ajouter des sources ne change rien, silencieusement |
| 4 | 12 workflows n8n patchés non réimportés sur le VPS, dont `intel-010-refresh` | Le bloc de classification n'est jamais produit ; `n8n:status` ne voit pas cette dérive (il compare des compteurs de nœuds) |
| 5 | Deux variantes divergentes d'INTEL-033 en dépôt (`workflows/` 42 nœuds vs `wokflows_patchs/` 37) | On ignore laquelle tourne |
| 6 | Apollo / Lusha non authentifiés | Le décideur SI reste manuel |
| 7 | `Récupérer Secteurs Actifs` lit les 53 fiches sans filtre et les injecte dans le prompt système | Coûteux, faux (macro et segments mélangés), et contraire à la doctrine segment |

**Les dettes 1, 2 et 3 bloquent l'exécution de ce corpus.** Les autres dégradent, sans bloquer.
