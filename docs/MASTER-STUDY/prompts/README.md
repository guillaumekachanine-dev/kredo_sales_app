# Prompts — mode d'emploi

**Un déclenchement = un fichier. On copie, on ne compose pas.**

Un prompt improvisé produit un livrable non comparable au précédent, donc inutilisable en
mise à jour différentielle. C'est la raison technique ; la raison pratique est qu'un prompt de
300 lignes recomposé de mémoire perd toujours les mêmes garde-fous — ceux qui coûtent quelque
chose à respecter.

---

## Structure commune

Chaque prompt porte quatre parties, dans cet ordre :

| Partie | Rôle |
|---|---|
| **En-tête de version** | `version` + `date` + étape. Se recopie dans `meta` du livrable |
| **A — Contexte injecté** | Les fichiers à joindre. Jamais retapés à la main |
| **B — Le prompt** | Se copie **tel quel**. Aucune adaptation |
| **C — Rappel de sortie** | Le schéma attendu et l'invariant de comptage |

---

## Les fichiers

| Fichier | Étape | Outil recommandé | Contexte à joindre |
|---|---|---|---|
| `E0-cadrage.md` | E0 | Aucun (humain) | — |
| `E3-corpus-sources.md` | E3 | Gemini / ChatGPT Deep Research | `00-cadrage.json` |
| `E4-etude-sectorielle.md` | E4 | ChatGPT Deep Research | `00-cadrage` `02-socle` `03-sources` |
| `E5-cartographie-comptes.md` | E5 | Claude Opus (Projet) | + `04-secteur.json` |
| `E6-chaine-de-valeur.md` | E6 | Claude Opus | `04-secteur` `05-comptes` + comptes KREDO |
| `G2-red-team.md` | G2 | NotebookLM, ou Claude en session neuve | Le livrable + ses sources, **rien d'autre** |
| `V1-tier-du-compte.md` | V1 | Claude Opus | `00-cadrage` `02-socle` + le compte pivot |
| `V2-compte-unique.md` | V2 | Claude Opus | `02-socle` + connaissance sectorielle lue |
| `V3-mise-a-jour.md` | V3 | Claude Opus | Le `05-comptes.json` précédent |

---

## Les trois interdits communs à tous les prompts

Ils sont répétés dans chaque fichier — la redondance est délibérée : c'est ce qui est répété
qui est respecté.

1. **Ne jamais renseigner un champ du régime déterministe.** SIREN, NAF, IDCC, effectif par
   établissement, dates réglementaires officielles sont **reçus**, ou laissés vides. Les
   produire, c'est fabriquer une donnée fausse qui a l'air juste.
2. **Ne jamais inventer.** Un chiffre, un nom de contrat, une citation ou une nomination sans
   source consultable ne figure pas dans le livrable. « Non trouvé » est une réponse attendue.
3. **Ne jamais présenter une inférence comme une observation.** « Chantiers observés » adossés
   à une preuve ; « hypothèse » avec sa méthode. Jamais « probable » tout court.

---

## Les cinq règles absolues, à la fin de chaque prompt

1. Ne jamais mélanger les périmètres ni les millésimes dans une même comparaison.
2. Ne jamais présenter une estimation comme un fait : écrire « estimation, méthode : … ».
3. Ne pas produire de données personnelles au-delà des fonctions publiques de dirigeants.
4. Ne pas utiliser d'information non publique, y compris celle qui proviendrait de
   collaborateurs en mission chez ces acteurs.
5. Écrire en français, **avec les accents**, dans un registre professionnel sobre, sans emphase
   commerciale. Les phrases doivent pouvoir être reprises telles quelles devant un client.

> La cinquième n'est pas de la typographie. La fiche la plus rigoureuse jamais produite est
> partie en production désaccentuée — « Directrice Qualite / Affaires Reglementaires » — parce
> qu'un agent a « sécurisé » l'échappement SQL en mutilant le texte. Elle avait l'air bâclée
> alors qu'elle était la meilleure.
