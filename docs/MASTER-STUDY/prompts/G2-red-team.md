# Prompt G2 — Passe red team

`version: 1.0` · `date: 2026-08-13` · gate **G2** · outil : **NotebookLM sur corpus fermé**, ou Claude en session neuve

---

## A. Le point clé : le changement de contexte

**G2 ne s'exécute jamais dans la session qui a produit le livrable.** Ce n'est pas une
précaution de forme : un modèle qui relit sa propre production comble les trous sans s'en
apercevoir, parce qu'il a encore en mémoire ce qu'il *voulait* écrire.

**NotebookLM est l'outil de référence** parce qu'il ne répond que depuis le corpus déposé : il
**ne peut pas** combler un trou par mémoire. C'est exactement le contrôle qui manque partout
ailleurs.

**Contexte à déposer** : le livrable (`04-secteur.json` + `05-comptes.json` et leurs rapports)
et **ses sources**. Rien d'autre. Surtout pas ce corpus méthodologique — on teste le livrable,
pas sa conformité à la méthode (c'est G1).

---

## B. Le prompt

```text
========== MISSION G2 — PASSE RED TEAM ==========

RÔLE
Tu es le directeur des systèmes d'information de l'un des acteurs cartographiés dans ce
document. Tu le lis parce qu'une ESN te l'a envoyé pour obtenir un rendez-vous.

Tu connais ton secteur mieux que son auteur. Tu as vu passer dix documents de ce genre cette
année. Tu cherches la raison de ne pas prendre le rendez-vous.

CONTRAINTE ABSOLUE
Tu ne réponds QUE depuis les documents déposés. Si une information n'y est pas, tu écris
« absent du corpus » — tu ne la complètes JAMAIS depuis ce que tu sais par ailleurs. C'est
tout l'intérêt de cette passe : détecter ce que le document ne dit pas.

--------------------------------------------------------------------
LES SIX QUESTIONS
--------------------------------------------------------------------
Réponds aux six, dans l'ordre. Les quatre premières sont bloquantes : si tu trouves quelque
chose, le livrable ne passe pas.

1. QU'EST-CE QUE JE TROUVERAIS FAUX, DATÉ OU NAÏF DANS CE DOCUMENT ?
   Faux : contredit par une autre partie du même document, ou par une source citée.
   Daté : présenté au présent alors que la source a plus de 18 mois.
   Naïf : une évidence de mon métier présentée comme un constat, ou une simplification qu'un
   praticien ne ferait pas.

2. QUELLE AFFIRMATION DÉCISIVE REPOSE SUR UNE SOURCE UNIQUE ?
   Ou sur une source qui en cite une autre sans que la primaire ait été consultée.
   « Décisive » = elle change un classement, un angle d'attaque ou un interlocuteur.

3. QUEL CHIFFRE MÉLANGE DEUX PÉRIMÈTRES OU DEUX MILLÉSIMES ?
   Cherche en particulier : un chiffre de groupe utilisé pour une branche, une comparaison
   entre deux exercices différents, un ratio CA/effectif invraisemblable.

4. QUELLE INFÉRENCE EST PRÉSENTÉE COMME UNE OBSERVATION ?
   Cherche les formulations : « probable », « sans doute », « vraisemblablement », « devrait »,
   et toute affirmation de besoin technologique qui n'est pas adossée à une offre d'emploi,
   un communiqué, un marché ou une référence éditeur.

5. QUEL BLOC N'A PAS DE CONSÉQUENCE COMMERCIALE EXPLOITABLE ?
   Un bloc dont je ne vois pas ce qu'il change pour celui qui m'appelle.

6. QU'EST-CE QUI MANQUE, ET QUE LE DOCUMENT NE DÉCLARE PAS COMME MANQUANT ?
   La question la plus importante. Un trou déclaré est honnête ; un trou silencieux est un
   mensonge par omission.
   Vérifie en particulier : sais-je par quelle porte cette ESN pense entrer chez moi ?
   sait-elle qui travaille déjà avec moi ? a-t-elle une raison DATÉE de m'appeler maintenant ?

--------------------------------------------------------------------
FORMAT DE RÉPONSE
--------------------------------------------------------------------
Pour chaque question : la liste des points trouvés, chacun avec la citation exacte du
document et le motif. Puis, en conclusion :

  LES TROIS POINTS LES PLUS EXPOSÉS — ceux qui, si je les relève en rendez-vous, mettent
  l'ESN en difficulté immédiate. Classés par gravité.

  VERDICT : est-ce que je prends le rendez-vous ? oui / non / oui mais.
  Et en une phrase : pourquoi.
========== FIN DE LA MISSION ==========
```

---

## C. Traitement du résultat

**Les trois points les plus exposés sont corrigés, et on dit lesquels.** La correction se fait
en relançant l'étape concernée avec le point en entrée — jamais en éditant le JSON à la main
(un JSON corrigé à la main n'est plus reproductible).

**Sortie** : `registre/<run>/07-g2.md` — les six questions, les réponses, les trois
corrections appliquées et leur effet.

**Verdict G2** : `pass` si les quatre premières questions ne remontent rien de bloquant après
correction. Sinon `fail`, et retour à E4 ou E5.

> Une variante rapide (V2, V3) peut sauter G2, à condition que le verdict final soit
> `usable_with_caveats` et jamais `production_ready`. G3 ne saute jamais.
