# 02 — Contrôle qualité des sources et des informations

**Version 1.0 — KREDO Source Intelligence**

## 1. Objectif

Le principal risque n'est pas l'absence d'information ; c'est **l'information plausible mais fausse**. Une étude avec des trous visibles reste exploitable. Une étude contenant une affirmation inventée ou mal attribuée devient difficile à croire dans son ensemble.

Le contrôle qualité intervient donc à deux niveaux distincts :

1. **Qualité de la source** : est-elle légitime, actuelle, pertinente et correctement classée ?
2. **Qualité du fait** : l'affirmation est-elle réellement soutenue par les sources, sur le bon périmètre et le bon millésime ?

---

# 2. Contrôle d'admission d'une source

Avant d'intégrer une source au référentiel, vérifier :

- [ ] Le domaine et l'éditeur sont clairement identifiés.
- [ ] La page ou le service est réellement accessible à la date de contrôle.
- [ ] Le contenu est publié ou maintenu de manière identifiable.
- [ ] La source couvre bien le secteur, le segment ou l'acteur étudié.
- [ ] La géographie couverte correspond au besoin.
- [ ] Le tier attribué correspond à la nature réelle de la source.
- [ ] La source n'est pas une simple reprise non vérifiée d'une autre source.
- [ ] Le rôle (`proof`, `corroboration`, `discovery`, `watch`) est explicite.
- [ ] L'automatisabilité est documentée sans supposer qu'un accès web implique un droit de scraping.
- [ ] Les risques connus sont consignés : paywall, accès instable, source biaisée, contenu corporate, données non exhaustives.

Une source échouant à un critère critique peut rester dans le journal de recherche mais ne doit pas entrer dans le pack minimal.

---

# 3. Statuts normalisés d'une information

| Statut | Condition | Rendu autorisé |
|---|---|---|
| `verified_fact` | Source T1, ou 2 sources T2/T3 réellement indépendantes concordantes | Affirmation simple + date + source |
| `declared_fact` | Source T2 unique émanant de l'acteur concerné | « Selon [source]… » |
| `single_source` | Une source T3 unique, non corroborée | Mention explicite « source unique » |
| `estimate` | Calcul, extrapolation ou déduction | « Estimation — méthode : … » |
| `not_found` | Recherche menée sans résultat exploitable | « Non trouvé — recherches : … » |
| `contradicted` | Sources crédibles incompatibles après contrôle de périmètre/date | Fourchette ou désaccord explicite |

### Règle absolue

Un statut ne doit jamais être amélioré par simple confiance du modèle ou intuition de l'analyste.

---

# 4. Règles de corroboration

## Identité juridique

Une source T1 suffit généralement si elle correspond exactement à l'entité.

## Réglementation

Une date ou une obligation précise doit être confirmée par une source officielle compétente : texte, régulateur, autorité, journal officiel.

## Finance

Privilégier comptes déposés, rapport annuel ou document réglementé. Une donnée de presse doit être ramenée à sa source primaire lorsqu'elle existe.

## Intention stratégique

Une publication de l'entreprise peut suffire, mais le fait doit être formulé comme une intention déclarée, pas comme une réalisation.

## Contrats et marchés

Avis officiel d'attribution ou publication de l'acheteur = preuve forte. Communiqué du fournisseur = fait déclaré, à corroborer si le montant ou le périmètre est décisif.

## Technologie / feuille de route SI

Une offre d'emploi, une référence éditeur ou un communiqué isolé constitue généralement un indice. Pour conclure à un déploiement réel, rechercher au moins un deuxième signal indépendant.

## Réputation / litiges / incidents

Toujours dater, distinguer allégation, procédure, décision, incident déclaré et conséquence prouvée.

---

# 5. Contrôle du périmètre

Chaque chiffre ou fait quantitatif doit transporter trois attributs :

1. **Périmètre juridique** : groupe, société, branche, filiale ;
2. **Périmètre géographique** : monde, Europe, France, région ;
3. **Période / exercice** : année civile, exercice clos, date du snapshot.

### Échec critique

Un chiffre groupe ne doit jamais être utilisé pour décrire une branche ou une filiale si le chiffre de la branche n'est pas publié.

Dans ce cas : `non publié`.

---

# 6. Contrôle de fraîcheur

Les seuils ci-dessous constituent le standard V1 proposé pour l'automatisation.

| Type d'information | Fraîcheur cible | Règle |
|---|---:|---|
| Réglementation / deadline | Vérification au jour du run | Toujours revalider sur source officielle |
| Identité entreprise | ≤ 12 mois, ou registre courant | Réinterroger si doute |
| Données financières | Dernier exercice clos publié | Signaler l'exercice |
| Trigger commercial | ≤ 12 mois ; idéal ≤ 6 mois | >12 mois = contexte, plus trigger |
| Offre d'emploi / compétence recherchée | ≤ 6 mois idéal ; ≤12 mois max | Plus ancien = signal historique |
| Stack / technologie déployée | ≤ 12 mois idéal | Corroborer si source unique |
| Taille de marché / CAGR | ≤ 24 mois | Signaler explicitement si plus ancien |
| Plan stratégique | Plan en cours / dernière publication | Vérifier qu'il n'est pas remplacé |

Aucune donnée ancienne n'est supprimée automatiquement : elle est **requalifiée**.

---

# 7. Six tests de cohérence obligatoires

## Test 1 — Cohérence de périmètre

Le chiffre décrit-il exactement l'entité, la géographie et l'activité analysées ?

## Test 2 — Ratio CA / effectif

Comparer le ratio à la médiane du panel. Un écart supérieur à ×2 déclenche une vérification : périmètre différent, modèle économique particulier ou donnée incorrecte.

## Test 3 — Cohérence des millésimes

Un tableau comparatif ne doit jamais mélanger silencieusement des exercices différents.

## Test 4 — Identité de l'entité

Utiliser l'identifiant national lorsque disponible. Vérifier qu'une filiale et sa maison mère ne sont pas fusionnées par erreur.

## Test 5 — Fraîcheur

Toute donnée dépassant sa fenêtre cible est signalée.

## Test 6 — Cohérence de segmentation

L'acteur appartient-il réellement au marché tel que défini au départ ? Toute exception doit être écrite et justifiée.

---

# 8. Résolution des contradictions

Lorsqu'une contradiction apparaît :

1. Comparer les tiers : `T1 > T2 > T3 > T4` ;
2. À tier égal, comparer les périmètres ;
3. À périmètre égal, comparer les dates et exercices ;
4. Identifier si les deux sources dérivent en réalité de la même source primaire ;
5. Si le désaccord subsiste, ne pas arbitrer arbitrairement :
   - publier une fourchette ou les deux valeurs ;
   - expliquer le désaccord ;
   - enregistrer la contradiction dans le journal.

Ne jamais faire la moyenne de deux données contradictoires pour « résoudre » le problème.

---

# 9. Contrôle d'indépendance des sources

Deux articles ne constituent pas deux corroborations si :

- ils reprennent le même communiqué ;
- ils citent la même étude ;
- l'un copie explicitement l'autre ;
- leurs chiffres remontent à la même base primaire.

Le registre doit contenir un champ `origin_chain` ou une note de provenance lorsque ce risque existe.

---

# 10. Signaux d'alerte d'une donnée inventée ou fragile

- chiffre rond sans source consultable ;
- nom de projet introuvable en recherche exacte ;
- citation sans média, date et contexte ;
- échéance réglementaire datée sans texte officiel ;
- fiches artificiellement complètes et uniformes ;
- part de marché très précise sans publication méthodologique ;
- vocabulaire générique interchangeable entre secteurs ;
- URL reconstituée, cassée ou ne contenant pas le fait annoncé ;
- intitulé de poste ou nomination non retrouvable ;
- « déploiement IA » fondé uniquement sur un communiqué d'intention.

### Test rapide

Prendre trois affirmations importantes au hasard et tenter de les retrouver par recherche exacte. Si l'une d'elles n'est pas retrouvable, le bloc concerné repasse en vérification.

---

# 11. Fiche de preuve minimale par fait

Chaque fait important doit pouvoir être représenté ainsi :

```json
{
  "claim_id": "C-001",
  "claim": "...",
  "entity": "...",
  "legal_scope": "...",
  "geography": "...",
  "period": "...",
  "status": "verified_fact",
  "source_ids": ["SRC-001"],
  "checked_at": "YYYY-MM-DD",
  "notes": ""
}
```

Le registre des sources et le registre des faits sont liés par `source_ids`.

---

# 12. Passe Red Team

À exécuter après la première synthèse, idéalement dans un contexte séparé :

```text
Tu es un dirigeant ou un DSI expérimenté du secteur [SECTEUR].
Tu connais ce marché de l'intérieur.

Examine uniquement les affirmations du document ci-dessous.

1. Qu'est-ce qui est factuellement faux ou daté ?
2. Qu'est-ce qui repose sur un mauvais périmètre ?
3. Qu'est-ce qui est présenté comme certain alors que la source est trop faible ?
4. Quelle affirmation ferait perdre immédiatement confiance dans le document ?
5. Qu'est-ce qui manque et devrait être évident pour un praticien du secteur ?
6. Quelles trois affirmations doivent être reverifiées en priorité ?

Pour chaque critique, cite l'affirmation concernée et indique le type de contrôle à effectuer.
Ne remplace pas les faits par des connaissances de mémoire : signale les points à vérifier.

[DOCUMENT]
```

Les points 1 à 4 sont bloquants tant qu'ils ne sont pas traités ou explicitement caveatés.

---

# 13. Gate qualité avant utilisation du référentiel

Un référentiel n'est pas déclaré `production_ready` si l'un des points suivants échoue :

- une famille critique n'a aucune source et aucun gap documenté ;
- une source primaire obligatoire n'a pas été consultée ;
- une deadline réglementaire repose uniquement sur une source secondaire ;
- le pack minimal contient une source non vérifiée ;
- des sources présentées comme indépendantes ont la même origine ;
- les URLs ne sont pas consultables ou ne supportent pas les affirmations annoncées ;
- le journal de recherche est absent ;
- le snapshot n'est pas daté.

Au-delà de quatre échecs majeurs dans la scorecard, le référentiel reste un brouillon.

---

# 14. Principe final

Le test ultime est celui du rendez-vous :

> « Si un expert du secteur demande : “Vous tenez cette information d'où ?”, peut-on ouvrir la source, vérifier le bon périmètre et expliquer pourquoi elle a été retenue ? »

Si la réponse est non, l'information ne doit pas être présentée comme établie.
