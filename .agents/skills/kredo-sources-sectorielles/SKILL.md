---
name: kredo-sources-sectorielles
description: Construit et contrôle le référentiel de sources d'un secteur — l'étape amont qui détermine la qualité de toute étude sectorielle KREDO. Cadre le périmètre, fabrique le prompt autonome que Guillaume exécute dans Gemini, puis reprend la main pour normaliser, auditer et noter le retour avant qu'il serve de corpus de recherche. Utilise ce skill dès qu'il est question de sources sur un secteur : référentiel de sources, « où chercher », préparer ou paramétrer une recherche Gemini / deep research, vérifier ou noter un référentiel existant, pack minimal, scorecard sources, journal de recherche, tiers T1-T4 — et aussi quand Guillaume veut attaquer un secteur dont on n'a pas encore les sources (ex. « on part sur l'agroalimentaire, il nous faut les sources », « ce référentiel tient la route ? », « prépare-moi le prompt Gemini pour la logistique », « d'où sort ce chiffre ? », « on a quoi comme sources sur le BTP ? »). À distinguer de kredo-sector-intelligence, qui conduit l'étude elle-même une fois le référentiel validé.
---

# KREDO — Référentiel de sources sectorielles

> 🟢 **Ce skill reste la conduite de l'étape E3.** Le corpus de référence est
> **`docs/MASTER-STUDY/`** ; voir `06-ETAPE-E3-CORPUS-DE-SOURCES.md` pour l'articulation, et
> `prompts/E3-corpus-sources.md` pour le prompt à jour (il remplace `03_PROMPT_CANONIQUE`,
> périmé). Le standard `sources_intelligence_standards/` reste normatif sur la qualification
> d'une source.


## Ce skill conduit et contrôle ; il ne cherche pas

Deux choses ne sont pas dans ce fichier, et c'est volontaire.

**Le QUOI** — méthode en 9 étapes, grille des tiers, barème /100, schéma JSON,
templates, les 24 critères de la scorecard — vit dans
**`docs/FEATURES/sector_intelligence/sources_intelligence_standards/`**. Le skill
frère `kredo-sector-intelligence` a payé une session entière pour apprendre
qu'un skill qui recopie un référentiel finit par en décrire une version
périmée. **Ne recopie rien ici.** Ouvre le fichier du standard qui te concerne :

| Besoin | Fichier |
|---|---|
| Méthode complète, familles d'information, barème d'utilité | `01_METHODE_STANDARD_REFERENTIEL_SOURCES.md` |
| Statuts de faits, corroboration, tests de cohérence, red team | `02_CONTROLE_QUALITE_SOURCES_ET_FAITS.md` |
| Le prompt à donner à Gemini | `03_PROMPT_CANONIQUE_RECHERCHE_SOURCES.md` |
| Le schéma de sortie | `04_SCHEMA_SORTIE_REFERENTIEL_SOURCES.json` |
| Journal de recherche | `06_TEMPLATE_JOURNAL_RECHERCHE.md` |
| Les 24 critères et la règle de verdict | `07_SCORECARD_VALIDATION.md` |
| Consommation en aval (n8n, étude) | `08_MODE_EMPLOI_N8N.md` |

**Préséance :** le standard > ce skill > `CLAUDE.md` > ta mémoire.

**La recherche non plus n'est pas ton travail.** Guillaume l'exécute dans
Gemini, qui a l'accès web profond et le temps long. Ton rôle est celui que
personne d'autre ne tient : cadrer avant, et contrôler après.

## Pourquoi le contrôle est le cœur du sujet

Le premier référentiel produit avec ce standard (Tourisme, 09/08/2026) se
déclare `production_ready`, zéro échec. Voilà ce qu'il contenait réellement :

| Ce que le document affirme | Ce que le contrôle a trouvé |
|---|---|
| Export JSON conforme au schéma | **Le JSON ne parsait pas** — échappements markdown hérités de l'export |
| Registre de 13 sources | Le JSON en portait **5** ; 8 sources invisibles pour tout consommateur en aval |
| Pack enrichi de 8 sources | Ses 8 identifiants **n'existaient dans aucun registre** |
| Scorecard : 12 critères, tous validés | 24 critères existent. Les 12 non affichés étaient les plus dérangeants — régulateur, deadline officielle, chaînes d'origine, contrôles aléatoires |
| Matrice de couverture complète | Trois cases remplies par des noms sans `SRC-id` : couverture affichée, inexistante |
| Régulateur du secteur identifié | Absent. Pour le tourisme, c'est **Atout France** et son registre obligatoire des opérateurs de voyages : la meilleure source T1 de longlist du secteur, jamais citée |
| Journal de recherche | **5 requêtes** pour un standard qui en exige 15 à 25 |

Aucun de ces défauts ne se voit à la lecture — le markdown était excellent. Ils
se voient en essayant de parser le JSON et en refaisant les additions. C'est
tout le métier de cette étape : **le mode d'échec n'est pas « on ne trouve pas
de sources », c'est un livrable élégant qui se note lui-même avec indulgence.**

## Le déroulé — cinq phases, deux arrêts

| Phase | Ce que tu fais | Réf. |
|---|---|---|
| **P0 Cadrage** | Figer les 9 paramètres. Vérifier si le secteur existe déjà en base et sous quel slug | §4 de `01_` |
| *Arrêt* | **Guillaume valide le périmètre.** Un périmètre faux invalide 25 requêtes | §4, test d'arrêt |
| **P1 Handoff** | Fabriquer le prompt autonome et le lui remettre | ci-dessous |
| *Arrêt* | **Guillaume exécute dans Gemini** et te rend le retour | — |
| **P2 Normalisation** | Extraire le JSON, réparer, écrire les deux fichiers | ci-dessous |
| **P3 Contrôle** | Script, puis les 24 critères, puis verdict | `07_` + script |
| **P4 Remise** | Classer, annoncer le verdict et les caveats à transmettre à l'étude | `08_` |

### P0 — Cadrage

Les neuf paramètres sont listés au §4 de `01_`. Trois méritent un effort
particulier parce qu'ils commandent tout le reste :

- **`DEFINITION_DU_MARCHE`** sert de test d'inclusion. Écrite en deux phrases
  molles, elle laisse entrer n'importe qui et la longlist part en vrille.
- **`SEGMENT_CIBLE`** décide de la presse professionnelle pertinente. « Tourisme »
  et « tour-operating » n'ont pas la même presse ni le même syndicat.
- **`OFFRE_ESN`** décide de ce qui compte comme signal. Sans lui, Gemini produit
  une étude de marché au lieu d'un corpus de prospection.

Le secteur existe très probablement déjà dans `sector_intelligence` — 53 fiches,
96 comptes classifiés. Cherche son slug plutôt que d'en inventer un.

### P1 — Fabriquer le prompt

Gemini ne lit pas ce dépôt : le prompt doit être **autonome**. Assemble un seul
fichier, dans cet ordre :

1. le corps de `03_PROMPT_CANONIQUE_RECHERCHE_SOURCES.md` — tel quel, il est
   conçu pour ça ;
2. le bloc de paramétrage **rempli** avec les valeurs de P0 ;
3. `assets/durcissement-gemini.md`, intégralement.

Ce troisième bloc est la seule chose que ce skill ajoute au standard : onze
consignes qui ferment les portes par lesquelles le run précédent est sorti. Il
est court, il tient à la fin du prompt, et il coûte moins cher que de rattraper
le référentiel après coup.

Écris le résultat dans le dossier du secteur (voir P4) sous `prompt-gemini.md`,
et **conserve-le**. Le standard exige un livrable rejouable : sans le prompt
exact qui a produit le référentiel, la rejouabilité est une déclaration
d'intention.

### P2 — Normalisation

Le retour de Gemini arrive en markdown, avec le JSON en section 11. Deux
opérations, dans cet ordre :

```bash
python3 .claude/skills/kredo-sources-sectorielles/scripts/audit_referentiel.py \
    retour-gemini.md --fix-escapes -o referentiel.json
```

Cette commande isole le bloc JSON et retire les backslashes que l'export
markdown a semés. Elle échoue bruyamment si le JSON est tronqué — auquel cas
**redemande la section 11 complète à Gemini** plutôt que de la reconstituer à la
main : un JSON rafistolé par tes soins n'est plus l'export de personne.

Écris ensuite le markdown reçu dans `referentiel.md`, sans le retoucher. Il est
la pièce d'origine ; les corrections se négocient, elles ne se glissent pas.

### P3 — Contrôle

```bash
python3 .claude/skills/kredo-sources-sectorielles/scripts/audit_referentiel.py \
    referentiel.json --markdown referentiel.md
```

Le script valide la structure contre le schéma V1, refait les additions des
scores d'utilité, et compare les identifiants du markdown à ceux du JSON. Il ne
juge rien d'autre. Ce qu'il rend est un **plancher**, pas une note.

> **Tu vas être indulgent, comme le run précédent l'a été.** Ce biais est
> prévisible : le document est bien écrit, il a l'air complet, et le contredire
> demande d'ouvrir des URLs. Fais-le quand même. Les 24 critères de `07_` se
> passent un par un ; ceux que le script ne couvre pas sont précisément ceux qui
> ont sauté la dernière fois. Trois valent qu'on s'y arrête :
>
> - **critère 6** — ouvre réellement chaque URL du pack minimal. Pas le domaine :
>   la page. Une URL qui ne contient pas ce qu'on lui attribue est une source
>   perdue, et c'est invisible autrement.
> - **critère 10** — deux articles qui reprennent le même communiqué ne font pas
>   deux corroborations. Regarde d'où viennent réellement les chiffres.
> - **critère 19** — prends trois affirmations au hasard dans « ce qu'elle
>   atteste » et vérifie-les. Si l'une tombe, le bloc entier repasse en revue.

**Verdict** (règle exacte dans `07_`) : un seul échec critique suffit à faire
`draft`. `usable_with_caveats` n'est pas un échec — c'est le statut normal d'un
premier référentiel honnête, et il reste consommable à condition que les gaps
soient transmis. `production_ready` sans aucun échec sur 24 critères est
possible mais rare : si tu y arrives du premier coup, c'est le signal qu'il faut
recompter.

### P4 — Remise

Un dossier par secteur, dans
`docs/FEATURES/sector_intelligence/sources_intelligence_standards/sector_sources_lists/<slug>/` :

```
prompt-gemini.md    le prompt exact, pour la rejouabilité
referentiel.md      le retour Gemini, non retouché
referentiel.json    l'export réparé et validé
```

Annonce le verdict, le nombre de sources réellement au registre, les familles
d'information non couvertes, et **ce qui doit être transmis au workflow d'étude**.
Ce dernier point est une obligation de `08_` : quand le verdict est
`usable_with_caveats`, les gaps voyagent avec le référentiel, sinon l'étude les
comblera implicitement — c'est-à-dire les inventera.

## La doctrine

**Le tier mesure la force probante, le score d'utilité mesure la valeur
opérationnelle. Les confondre casse les deux.** Une source T4 peut valoir 90 en
utilité pour détecter un signal et rester incapable de fonder quoi que ce soit.
Une source T1 peut valoir 55 parce qu'elle n'apprend rien de vendable. Un
référentiel qui aligne les deux colonnes n'a pas fait l'exercice.

**Une source qui n'a pas été ouverte n'est pas une source.** C'est une
supposition avec une URL. La règle de dégradation dit la même chose autrement :
citer une source primaire ne rend pas primaire ; il faut l'avoir ouverte.

**Un trou nommé bat une couverture affichée.** Une famille d'information
déclarée `gap` avec ses recherches journalisées est une information stratégique
utile — elle dit que ce secteur est difficile à attaquer par cet angle. Une case
de matrice remplie par un nom sans identifiant est un mensonge poli.

**La question qui tranche, pour chaque source :** peut-elle changer la priorité
d'un compte, l'angle du discours, le choix de l'interlocuteur, ou le moment de
l'appel ? Si non, et si elle n'a pas de fonction de preuve indispensable, elle
descend au pack enrichi ou elle sort. La notoriété d'une source n'est pas un
critère de sélection.

**Écris en français, avec les accents.** Le référentiel finit lu par des humains
et copié dans des prompts ; un texte désaccentué a l'air bâclé même quand il est
juste.

## Les pièges

| Piège | Ce que ça donne | La parade |
|---|---|---|
| Faire la recherche toi-même « pour aller plus vite » | 5 requêtes au lieu de 20, les sources auxquelles on pensait déjà, zéro acteur régional | Gemini cherche. Toi tu cadres et tu contrôles |
| Retoucher le markdown de Gemini au passage | On ne sait plus ce qui vient du run et ce qui vient de toi ; la rejouabilité est morte | `referentiel.md` reste intact ; les écarts se listent à part |
| Lire le JSON au lieu de le parser | Le run Tourisme est passé pour conforme pendant des mois | Le script, systématiquement |
| Croire la scorecard du livrable | Elle est écrite par celui qui vient de produire le livrable | Refais-la, les 24 lignes |
| Un rediffuseur classé T1 parce qu'il republie un registre | Le pack minimal repose sur une source qui n'est pas primaire | Règle de dégradation : T3 tant que le registre n'est pas ouvert |
| Pack enrichi = pack minimal redécoupé | On croit avoir 30 sources, on en a 13 | Les deux listes sont disjointes, le script le vérifie |
| Recommander un scraping parce que la page est publique | Public ne veut pas dire aspirable | `automation_fit` documente l'accès réel, conditions d'utilisation comprises |

## Ce qu'on ne construit pas en V1

`08_MODE_EMPLOI_N8N.md` a déjà tranché, et ces limites tiennent : **pas de table
Supabase dédiée** avant que l'usage soit confirmé, pas de crawler maison, pas de
scraping de réseaux professionnels, pas de source inventée pour combler une
famille vide. Le référentiel vit en fichiers versionnés. S'il faut le persister
en base un jour, ce sera un `ai_intelligence_results` avec
`result_type = 'sector_source_registry'` — et ce sera une décision, pas un effet
de bord de ce skill.

## Comment on sait que c'est bon

La grille /24 dit si le référentiel a le droit de servir. Elle ne dit pas s'il
sert à quelque chose. Pour ça, une seule question, celle du §15 de `01_` :

> **Un analyste qui ne connaît rien à ce secteur peut-il, avec ce seul document,
> lancer l'étude sans dépendre de sa mémoire — trouver les sources primaires,
> distinguer la preuve du discours corporate, et défendre chaque affirmation
> devant quelqu'un qui connaît le marché de l'intérieur ?**

Si la réponse est non, le référentiel est complet mais inutile — et c'est un
échec plus discret, donc plus coûteux, qu'un référentiel visiblement troué.
