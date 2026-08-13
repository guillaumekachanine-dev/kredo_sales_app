# Prompt V2 — Analyse concentrée sur un seul compte

`version: 1.0` · `date: 2026-08-13` · variante **V2** · outil : **Claude Opus**

**Le besoin** : un rendez-vous dans huit jours. Le livrable est une **battle card d'une page**
plus une demi-page sur les trois concurrents directs — et c'est cette demi-page qui crédibilise
le discours en rendez-vous.

**E2 est obligatoire et exécuté en premier.** Sans identité, sans échéance datée, sans mesure
d'intensité SI, la fiche est une page de généralités qu'un DSI a déjà lue dix fois.

---

## A. Contexte à joindre

`02-socle.json` (le compte + son segment) · la connaissance sectorielle lue en base
(`v_sector_knowledge_resolved`, `v_sector_knowledge_items`) · l'historique CRM du compte
(`interactions`, `opportunities`, `account_facts`, `account_signals`).

---

## B. Le prompt

```text
========== MISSION V2 — PRÉPARATION D'UN COMPTE ==========

RÔLE ET USAGE
Tu prépares un commercial d'ESN à un rendez-vous nommé, dans huit jours. Ton livrable est lu
90 secondes avant l'appel, puis une fois la veille au soir.

Le test de réussite est unique : « est-ce que j'entre en rendez-vous avec ça ? »
Un « non vérifié » sur le canal d'achat rend le livrable inutile — c'est précisément ce qu'on
est venu chercher.

CE QUE TU NE FAIS PAS
Tu ne refais pas l'étude sectorielle. Elle t'est fournie. Tu ne produis aucun champ du régime
déterministe (identifiant national, code d'activité, convention collective, effectif par
établissement, dates réglementaires officielles) : tu les reçois du socle.

--------------------------------------------------------------------
LES CINQ REQUÊTES, DANS CET ORDRE
--------------------------------------------------------------------
1. identité → REÇUE du socle, aucune requête
2. publications du compte : résultats, plan stratégique, rapport annuel
3. presse professionnelle, 12 derniers mois
4. OFFRES D'EMPLOI ET TECHNOLOGIES ← la plus rentable : les offres publiées révèlent la
   feuille de route RÉELLE, là où les communiqués révèlent la feuille de route SOUHAITÉE
5. « intelligence artificielle » + nom du compte

--------------------------------------------------------------------
LE LIVRABLE — quatre parties, dans cet ordre de lecture
--------------------------------------------------------------------

PARTIE 1 — LA BATTLE CARD (une page, c'est le seul format qui sera vraiment lu)
  · Identité en 4 lignes : raison sociale, taille, segment, régime d'achat  [reçu du socle]
  · LE MOTIF DE L'APPEL : une échéance datée ou un trigger des 12 derniers mois, sourcé,
    prononçable tel quel. Si tu n'en as pas, DIS-LE en tête — c'est l'information la plus
    importante du document.
  · L'INTERLOCUTEUR : qui, et si sa fonction est publique, depuis quand
  · L'ANGLE, en une phrase, adossé à une preuve
  · DEUX ACCROCHES, formulées telles qu'on les dit au téléphone
  · CE QU'IL NE FAUT PAS DIRE : sujet sensible, échec public, angle éculé
  · LES TROIS QUESTIONS à poser pour faire parler l'interlocuteur

PARTIE 2 — LA COUCHE ESN, INTÉGRALE
  C'est le cas d'usage où les 45 minutes de qualification humaine se justifient sans
  discussion. Aucune rubrique vide, aucun « non vérifié ».
  · organisation SI et décideur
  · modèle d'achat : panel, référencement, canal, accord-cadre
    Où chercher : page « devenir fournisseur », conditions générales d'achat, charte achats
    responsables, rapport de durabilité (chapitre achats), avis de marché.
    Rien trouvé → hypothèse qualifiée à partir de la taille et de la structure, marquée
    « hypothèse, à confirmer ».
  · conditions d'accès sectorielles : habilitation, nationalité, zone protégée
  · ESN déjà en place — sais-je qui tient déjà la porte ?
  · chantiers technologiques OBSERVÉS, chacun avec sa preuve datée
  · IA : ANNONCÉ vs DÉPLOYÉ, et l'écart. Obligatoire.
  → conclus par : « voie d'entrée la plus probable pour une ESN », en une phrase.

PARTIE 3 — LES TROIS CONCURRENTS DIRECTS (une demi-page, PAS optionnelle)
  Trois acteurs du même segment et du même tier. Pour chacun, trois lignes :
    · ce qu'il fait mieux que le compte visé
    · ce qu'il a industrialisé et que le compte n'a pas
    · ce que le compte peut en craindre
  C'est ce bloc qui fait la différence en rendez-vous : montrer qu'on connaît le métier du
  prospect ET la manière dont ses concurrents s'y prennent est ce qui distingue une ESN d'une
  autre. Sans lui, on est interchangeable.

PARTIE 4 — CE QU'ON NE SAIT PAS
  Les trous, nommés, avec ce qu'il faudrait pour les combler. Un trou déclaré protège ; un
  trou silencieux se paie en rendez-vous.

--------------------------------------------------------------------
SI LE SECTEUR A UNE CHAÎNE DE VALEUR MODÉLISÉE
--------------------------------------------------------------------
Rappelle en fin de document la formulation d'ouverture, mot pour mot :
  « Avant qu'on parle de nous, je voudrais vérifier que j'ai bien compris votre filière.
    Voilà comment je la vois. Où est-ce que je me trompe ? »
Et la règle : celui qui parle en premier a perdu. Ne défendre AUCUNE case.

--------------------------------------------------------------------
FORMAT DE SORTIE
--------------------------------------------------------------------
1. LE JSON (schemas/competitive-map.schema.json, meta.variante = "compte_unique",
   un seul compte dans "comptes", les trois concurrents en "concurrents_directs").
   En premier, unique bloc, parsable, "compteurs" obligatoire.
2. La battle card en markdown, une page, imprimable.

RÈGLES ABSOLUES : ne jamais inventer · pas de données personnelles au-delà des fonctions
publiques · pas d'information non publique, y compris venue de collaborateurs en mission chez
ce compte · rester factuel sur les concurrents, le document peut être lu par un tiers ·
français avec les accents.
========== FIN DE LA MISSION ==========
```

---

## C. Contrôle

**G3 devient** : *« est-ce que j'entre en rendez-vous avec ça ? »*

Trois vérifications de deux minutes :
1. Le motif de l'appel est daté, sourcé, et je peux le prononcer sans le reformuler.
2. La voie d'entrée est nommée — pas « à confirmer » sur les trois rubriques d'accès.
3. La demi-page concurrents me donne une phrase que je peux dire et qui n'est pas générique.

G2 peut sauter sur V2, à condition que le verdict reste `usable_with_caveats`.
