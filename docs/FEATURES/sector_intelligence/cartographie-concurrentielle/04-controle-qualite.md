> 🔴 **PÉRIMÉ — ne plus appliquer** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Scorecard administrée par le producteur lui-même — le défaut E1 diagnostiqué par le document 09. Remplacée par G0/G1/G2/G3, dont deux hors du contexte de production.
> **Référence à appliquer : `MASTER-STUDY/10-ETAPE-E7-GATES-ET-INGESTION.md`**

---

# 04 — Contrôle et validation de l'information

Le mode d'échec de ce type d'étude n'est pas l'erreur visible : c'est **l'erreur plausible**. Un CA arrondi au mauvais périmètre, un contrat attribué à la mauvaise filiale, une échéance réglementaire décalée d'un an — rien de tout cela ne se voit à la lecture, et tout cela se voit immédiatement en rendez-vous, en face d'un interlocuteur qui connaît son marché.

Le principe directeur : **une étude avec des trous visibles est utilisable ; une étude complète mais fausse quelque part est inutilisable en entier**, parce que le lecteur ne sait pas quelle partie jeter.

---

## 1. Les cinq niveaux de qualification d'une donnée

Chaque donnée du livrable porte, implicitement ou explicitement, l'un de ces statuts. En cas de doute, on descend d'un niveau.

| Niveau | Condition | Comment il s'écrit dans le livrable |
|---|---|---|
| **Fait vérifié** | Source T1, ou 2 sources indépendantes T2/T3 concordantes | Écrit simplement, avec millésime et source |
| **Fait déclaré** | Source T2 unique (l'entreprise parle d'elle-même) | « selon son rapport annuel [année] » |
| **Source unique** | Une seule source T3, non corroborée | Mention explicite « source unique » |
| **Estimation** | Calculée ou déduite par l'analyste | « estimation — méthode : … » ; jamais présentée comme un chiffre publié |
| **Non trouvé** | Recherche menée, sans résultat | « non trouvé (recherches : … ) ». **Statut légitime et attendu** |

**Règle de triangulation** : toute donnée qui *fonde une décision* — catégorie d'un acteur, priorisation d'un compte, échéance réglementaire, montant d'un contrat — exige deux sources indépendantes, sauf si elle est T1.
**Test d'indépendance** : deux sources qui citent la même source primaire ne sont **pas** indépendantes. C'est le piège le plus fréquent : un chiffre erroné repris par quatre sites donne l'illusion d'une confirmation quadruple.

---

## 2. Les six tests de cohérence

Ces tests sont mécaniques : ils s'appliquent sans connaissance du secteur et attrapent la majorité des erreurs.

### Test 1 — Cohérence de périmètre *(le plus important)*
Pour chaque chiffre : *périmètre juridique* (groupe / branche / société) × *périmètre géographique* (monde / France / région) × *exercice*.
**Échec typique** : « Le groupe X réalise 8 Md€ » utilisé pour caractériser sa branche française, qui en pèse 900 M€.
**Correction** : si le chiffre du bon périmètre n'existe pas, on écrit « non publié ». On ne descend jamais un chiffre consolidé au niveau d'une branche par une règle de trois.

### Test 2 — Ratio CA / effectif
Calculer CA ÷ effectif pour chaque compte, puis comparer à la médiane du panel étudié.
**Seuil d'alerte** : un écart supérieur à un facteur 2 par rapport à la médiane du panel.
**Trois causes possibles, dans cet ordre de fréquence** : périmètres croisés (CA groupe / effectif France), modèle économique réellement différent (forte sous-traitance, négoce, ou au contraire main-d'œuvre intensive), donnée fausse.
Le seuil se calcule **sur le panel**, jamais sur une valeur absolue mémorisée : les ordres de grandeur varient d'un facteur 4 entre secteurs.

### Test 3 — Cohérence des millésimes
Aucun tableau comparatif ne mélange des exercices différents sans le signaler colonne par colonne. Si un acteur n'a publié que N-2, la ligne le mentionne explicitement plutôt que d'être lissée.

### Test 4 — Identité de l'entité
Chaque acteur est identifié par son identifiant national, pas par son nom commercial. Vérifier qu'une même entité n'apparaît pas deux fois sous deux noms (marque commerciale et raison sociale), et qu'une filiale n'est pas comptée à part de son groupe si le périmètre retenu est le groupe.

### Test 5 — Fraîcheur
Toute donnée de plus de 24 mois est signalée. Tout trigger event de plus de 12 mois est écarté ou requalifié en élément de contexte : il ne justifie plus un motif d'appel.

### Test 6 — Cohérence de la segmentation
Recalculer les parts relatives et vérifier qu'aucune affectation ne contredit la table de décision. Toute exception assumée doit être écrite et justifiée en une ligne.

---

## 3. Protocole de résolution des contradictions

Quand deux sources donnent deux chiffres différents :

1. **Comparer les tiers.** T1 l'emporte sur T2, qui l'emporte sur T3, qui l'emporte sur T4.
2. **À tier égal, comparer les périmètres.** Neuf fois sur dix, la contradiction n'en est pas une : les deux chiffres sont justes sur des périmètres différents. Identifier le périmètre demandé et retenir le chiffre correspondant.
3. **À périmètre égal, comparer les dates.** La publication la plus récente sur le même exercice l'emporte (comptes retraités, correction).
4. **Si le désaccord persiste** : afficher une fourchette et les deux sources. Ne jamais trancher arbitrairement, ne jamais faire la moyenne.
5. **Consigner** la contradiction dans l'annexe des sources. Elle réapparaîtra à la prochaine mise à jour ; l'avoir tracée fait gagner du temps.

---

## 4. Les huit signaux d'alerte d'une donnée inventée

À passer en revue sur le livrable produit. Chacun a déjà été observé sur des sorties d'assistants réputés fiables.

| Signal | Ce qu'il indique | Action |
|---|---|---|
| Un chiffre rond et élégant (« 2,5 Md€ », « 15 000 collaborateurs ») sans source | Reconstruction de mémoire | Vérifier ou supprimer |
| Un nom de projet ou de contrat crédible mais introuvable en recherche exacte | Invention plausible — le mode d'échec le plus dangereux | Supprimer ; écrire « non trouvé » |
| Une citation de dirigeant sans média ni date identifiés | Fabrication | Supprimer systématiquement |
| Une date d'échéance réglementaire « en 2027 » sans texte cité | Approximation | Reformuler en « échéance à confirmer » |
| Des fiches d'une régularité parfaite, toutes rubriques remplies | Comblement automatique des trous | Suspecter les rubriques les moins documentables (R&D, réputation) |
| Un pourcentage de part de marché à la décimale | Faux précis : ces données ne sont pas publiques à ce niveau | Remplacer par une position ordinale |
| Un vocabulaire sectoriel générique, interchangeable entre deux secteurs | Production de mémoire, sans recherche réelle | Rejouer la phase d'approfondissement |
| Une source citée sans URL, ou une URL non consultable | Référence reconstituée | Retrouver la source ou déclasser la donnée |

**Test rapide et efficace, en 2 minutes** : prendre trois affirmations au hasard dans le livrable et essayer de les retrouver par une recherche exacte. Si une seule des trois est introuvable, le livrable entier doit repasser en vérification.

---

## 5. Passe « red team »

À exécuter **dans une conversation séparée**, sans le contexte de production, avec ce prompt :

```text
Tu es le directeur des systèmes d'information de [ACTEUR], acteur du secteur [SECTEUR].
On te met sous les yeux le document ci-dessous, produit par une ESN qui veut te démarcher.
Tu connais ton marché mieux que quiconque.

1. Qu'est-ce qui est factuellement faux ou daté ?
2. Qu'est-ce qui est juste mais naïf — la vision d'un observateur extérieur qui n'a jamais
   travaillé dans ce secteur ?
3. Quelle affirmation te ferait cesser de prendre cette ESN au sérieux ?
4. Qu'est-ce qui manque, et qui est évident pour quelqu'un du métier ?
5. Sur quel point ce document est-il, au contraire, réellement pertinent ?

[coller le livrable]
```

Traiter les points 1 et 3 en priorité. Le point 4 alimente la prochaine version. Le point 5 identifie ce qu'il faut mettre en avant dans la synthèse exécutive.

Une **relecture humaine par un praticien du secteur** reste supérieure à cette passe pour le point 2 : la naïveté sectorielle est très difficile à détecter par un modèle, précisément parce qu'elle est cohérente. Si vous ne devez garder qu'un seul contrôle humain, gardez celui-là.

---

## 6. Scorecard de livraison (bloquante)

À remplir avant toute diffusion. **Un seul critère critique en échec interdit la diffusion.**

| # | Critère | Criticité | OK / KO |
|---|---|---|---|
| 1 | Accès web confirmé et journal de recherche présent en annexe | **Critique** | |
| 2 | Chaque chiffre porte millésime + périmètre + source | **Critique** | |
| 3 | Aucun chiffre groupe utilisé pour caractériser une branche (test 1) | **Critique** | |
| 4 | Aucune échéance réglementaire datée sans source officielle | **Critique** | |
| 5 | Aucun nom de contrat, de personne ou de citation sans source | **Critique** | |
| 6 | Ratios CA/effectif calculés, écarts > ×2 expliqués (test 2) | Majeur | |
| 7 | Chaque affectation de catégorie justifiée par la table de décision | Majeur | |
| 8 | Toute donnée décisive corroborée par 2 sources indépendantes, ou marquée « source unique » | Majeur | |
| 9 | Passe red team effectuée, 3 points les plus exposés corrigés | Majeur | |
| 10 | Trous explicitement listés, non comblés | Majeur | |
| 11 | Niveau de confiance affiché par fiche | Mineur | |
| 12 | Aucune donnée personnelle au-delà des fonctions publiques | **Critique** | |
| 13 | JSON conforme au schéma et matrice générée | Mineur | |
| 14 | Snapshot daté, version et auteur estampillés | Mineur | |
| 15 | Relecture par un praticien du secteur | Majeur | |

**Interprétation** : 0 critique en échec et ≤ 2 majeurs → diffusable. 1 critique en échec → correction obligatoire. Plus de 4 majeurs en échec → l'étude est un brouillon, la signaler comme telle en tête de document si elle doit tout de même circuler.

---

## 7. Boucle d'amélioration

La qualité réelle de l'étude ne se mesure pas à la scorecard mais à ce qu'elle produit commercialement. Trois indicateurs suffisent, relevés à 90 jours :

| Indicateur | Ce qu'il révèle si dégradé |
|---|---|
| Taux d'obtention de rendez-vous sur les comptes prioritaires | La priorisation ou les angles d'entrée sont faux → revoir l'indice d'appétence et le bloc 5 |
| Nombre de corrections factuelles remontées par les commerciaux après rendez-vous | Le contrôle qualité a été bâclé → durcir la scorecard, remonter le budget de vérification |
| Taux d'utilisation réelle des battle cards | Le format ne convient pas → raccourcir, passer à une page unique par compte |

**Rituel** : à chaque étude, tenir un court journal des erreurs détectées après coup, et transformer chaque erreur récurrente en un point de la scorecard. C'est ainsi que la présente scorecard a vocation à grossir — chaque ligne doit avoir été payée par une erreur réelle.
