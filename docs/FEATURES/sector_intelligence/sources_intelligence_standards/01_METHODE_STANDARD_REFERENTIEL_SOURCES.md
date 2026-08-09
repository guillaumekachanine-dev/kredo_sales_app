# 01 — Méthode standard de constitution d'un référentiel de sources sectorielles

**Version 1.0 — KREDO Source Intelligence**

## 1. Synthèse de la demande d'origine

La demande initiale consistait à identifier les sources d'information les plus pertinentes pour alimenter une automatisation d'étude concurrentielle sur un secteur donné, avec comme premier cas d'application le BTP / grands travaux / infrastructures publiques.

L'intention réelle allait au-delà d'une simple liste de médias ou de bases de données : le livrable devait permettre à une ESN de produire des analyses suffisamment solides pour être réutilisées en prospection commerciale, devant des interlocuteurs qui connaissent très bien leur marché.

Le destinataire implicite n'est pas un analyste sectoriel pur. C'est un directeur commercial d'ESN qui doit pouvoir répondre à quatre questions :

1. **Quels comptes attaquer en premier ?**
2. **À qui parler et par quelle porte entrer ?**
3. **Que dire pour être crédible immédiatement ?**
4. **Pourquoi contacter ce compte maintenant ?**

La cartographie concurrentielle n'est donc pas le produit final. Elle est un intrant de **légitimité métier et commerciale**.

## 2. Ce qui a été fait sur le cas BTP

Le travail réalisé sur le BTP a consisté à :

- distinguer les sources selon leur **force probante** (T1 à T4) ;
- identifier les familles de sources stables d'un secteur à l'autre ;
- instancier les familles propres au BTP : fédérations, presse professionnelle, donneurs d'ordre, marchés publics, organismes techniques, autorités ;
- séparer les sources destinées à **prouver** un fait de celles destinées à **détecter** un signal ;
- constituer un pack minimal et un pack enrichi ;
- proposer des requêtes types adaptées aux différents besoins d'information ;
- relier chaque famille de source à un usage commercial concret : priorisation, accessibilité, argumentaire, trigger event ;
- exclure les agrégateurs et contenus faibles comme sources finales lorsqu'une source primaire existe.

Cette approche devient ici une méthode sectoriellement neutre.

---

# 3. Principe directeur

La méthode ne cherche pas « toutes les sources possibles ». Elle cherche **le plus petit corpus de sources capable de couvrir correctement les besoins de l'étude**, avec une qualité suffisamment élevée pour résister à une vérification contradictoire.

Une bonne source est une source qui remplit au moins une fonction claire :

- **Prouver** un fait ;
- **Corroborer** un fait ;
- **Découvrir** un acteur, une tendance ou un signal ;
- **Surveiller** un déclencheur commercial dans le temps.

Une source n'est jamais retenue uniquement parce qu'elle est connue ou bien référencée.

---

# 4. Étape 0 — Cadrage du marché

Avant toute recherche, fixer les paramètres suivants :

| Paramètre | Description |
|---|---|
| `SECTEUR` | Secteur macro |
| `SEGMENT_CIBLE` | Sous-segment réellement étudié |
| `DEFINITION_DU_MARCHE` | Offre, clients, géographie ; sert de test d'inclusion |
| `GEOGRAPHIE` | France, Europe, région, etc. |
| `COMPTE_ETALON` | Acteur repère, si disponible |
| `ACTEURS_EXEMPLES` | 3 à 8 noms pour amorcer la recherche |
| `OBJECTIF_COMMERCIAL` | Ouverture, extension, AO, angle sectoriel, etc. |
| `OFFRE_ESN` | Practices et capacités vendues |
| `DATE_SNAPSHOT` | Date de référence de la recherche |

### Test d'arrêt

Si le périmètre est ambigu au point de modifier fortement la liste d'acteurs, l'analyste doit expliciter son hypothèse avant de continuer.

---

# 5. Étape 1 — Transformer le besoin commercial en besoins d'information

Construire une matrice des informations à obtenir avant de chercher des sources.

## Familles d'information canoniques

1. **Identité juridique & structure**  
   SIREN/identifiant, activité officielle, établissements, filiales, actionnariat.

2. **Financier & trajectoire**  
   CA, effectifs, rentabilité, segments, investissements, plan stratégique, risques.

3. **Marché & concurrence**  
   Taille, croissance, positionnement, longlist, parts relatives, acteurs régionaux.

4. **Contrats & clients**  
   Marchés attribués, grands contrats, carnet de commandes, donneurs d'ordre.

5. **Réglementation & normes**  
   Textes applicables, échéances, autorités, obligations, normes techniques.

6. **Technologie & SI**  
   ERP, cloud, data, IA, cyber, BIM/PLM/MES/SI métier, intégrateurs et éditeurs.

7. **Emploi & compétences**  
   Offres d'emploi, profils recherchés, tensions, nouvelles équipes, compétences.

8. **Achats & accessibilité commerciale**  
   Panels, appels d'offres, portails fournisseurs, achats responsables, modèle de décision.

9. **Trigger events**  
   Nominations, M&A, incidents, nouveaux sites, programmes d'investissement, contrats majeurs.

10. **Réputation & signaux faibles**  
    Litiges publics, distinctions, controverses, perception employeur, presse sectorielle.

11. **Ancrage local / régional**  
    Implantations, projets territoriaux, clusters, presse économique régionale.

Une famille peut être déclarée `non_applicable` avec justification. Elle ne doit pas être remplie artificiellement.

---

# 6. Étape 2 — Rechercher les familles de sources

## Familles de sources stables à examiner

| Famille | Rôle principal |
|---|---|
| Registres officiels d'entreprises | Identité et périmètre juridique |
| Statistiques publiques | Marché, emploi, activité |
| Régulateurs / autorités / journaux officiels | Réglementation |
| Dépôts légaux / documents financiers | Financier et trajectoire |
| Portails de marchés / appels d'offres | Contrats, donneurs d'ordre, accessibilité |
| Fédérations / syndicats / observatoires | Structure du secteur, acteurs, conjoncture |
| Presse professionnelle spécialisée | Actualité fine, longlist, signaux |
| Presse économique établie | Transactions, stratégie, dirigeants |
| Publications des entreprises | Plans, résultats, annonces, contrats déclarés |
| Pages carrières / offres d'emploi | Stack et feuille de route réelle |
| Organismes techniques / normalisation | Technologies métier et pratiques |
| Grands donneurs d'ordre / maîtres d'ouvrage | Programmes, AO, exigences fournisseurs |
| Éditeurs / intégrateurs / fournisseurs | Indices technologiques, références client |
| Sources régionales | Mid-market, projets locaux, accessibilité |

## Trois familles sectorielles obligatoires à instancier

Pour chaque nouveau secteur, identifier explicitement :

1. **La presse professionnelle de référence** ;
2. **La fédération / le syndicat professionnel principal** ;
3. **Le régulateur, l'autorité ou l'organisme normatif sectoriel**.

Une étude lancée sans ces trois recherches est considérée comme incomplètement paramétrée.

---

# 7. Étape 3 — Construire une longlist de sources candidates

La recherche se fait par passes, pas par requête unique.

## Passe A — Sources officielles

Objectif : trouver registres, statistiques, régulateurs, textes, appels d'offres, autorités.

Exemples de requêtes :

```text
[secteur] site:gouv.fr
[secteur] régulateur France
[secteur] fédération professionnelle
[secteur] observatoire chiffres clés
[secteur] marchés publics appels d'offres
[secteur] directive règlement norme France Europe
```

## Passe B — Écosystème professionnel

```text
[secteur] magazine professionnel
[secteur] revue professionnelle
[secteur] classement entreprises
[secteur] annuaire adhérents fédération
[segment] association professionnelle France
```

## Passe C — Intelligence commerciale

```text
[secteur] CIO CTO digital transformation
[secteur] ERP cloud data AI cybersecurity jobs
[secteur] procurement supplier portal
[secteur] investment program acquisition appointment
[acteurs] careers data cloud ERP cyber
```

## Passe D — Validation de couverture

Chercher délibérément les trous :

```text
[secteur] regional companies [région]
[secteur] mid market France
[secteur] regulation 2026 2027
[secteur] digital benchmark
[secteur] procurement panel suppliers
```

### Volume indicatif

Pour **initialiser un nouveau référentiel sectoriel**, viser environ 15 à 25 requêtes de recherche distinctes, puis arrêter lorsque :

- les familles d'information sont couvertes ;
- les résultats deviennent redondants ;
- les principaux acteurs et institutions renvoient vers les mêmes sources ;
- les trous résiduels sont explicitement documentés.

Ce volume est volontairement supérieur aux 8–12 requêtes recommandées dans la méthode KREDO existante pour une recherche externe déjà cadrée : ici, on crée le **référentiel de sources lui-même**, ce qui nécessite une phase de découverte plus large.

---

# 8. Étape 4 — Qualifier chaque source

Chaque source candidate reçoit deux évaluations séparées.

## 8.1 Tier de fiabilité

| Tier | Nature | Usage autorisé |
|---|---|---|
| **T1** | Registres officiels, textes, autorités, statistiques publiques, avis officiels | Peut établir un fait dans son périmètre |
| **T2** | Publications de l'entreprise ou de l'organisme directement concerné | Fait déclaré ; intentions à traiter comme discours |
| **T3** | Presse professionnelle/économique reconnue, fédérations, études établies | Corroboration ; donnée décisive à doubler si possible |
| **T4** | Agrégateurs, blogs, fournisseurs, avis, contenus IA, réseaux | Indice / découverte seulement |

**Règle de dégradation :** une source secondaire qui cite une source primaire ne devient pas primaire. Le tier supérieur n'est accordé que si la source primaire a été effectivement consultée.

## 8.2 Score d'utilité opérationnelle — /100

Le score ne mesure pas la vérité. Il mesure l'intérêt de la source pour l'étude.

| Critère | Poids |
|---|---:|
| Pertinence sectorielle / segment | 20 |
| Couverture des besoins d'information | 20 |
| Valeur commerciale / capacité à produire un signal actionnable | 15 |
| Fraîcheur et fréquence de mise à jour | 15 |
| Autorité / qualité éditoriale | 20 |
| Accessibilité et exploitabilité dans l'automatisation | 10 |
| **Total** | **100** |

### Interprétation

- **80–100 : cœur de référentiel**
- **65–79 : source importante**
- **50–64 : source complémentaire**
- **< 50 : découverte ponctuelle ou exclusion**

Une source T4 peut avoir un score d'utilité élevé pour la détection de signaux, mais elle reste T4 et ne peut pas prouver seule une affirmation.

---

# 9. Étape 5 — Attribuer un rôle explicite à chaque source

Valeurs normalisées :

- `proof` : source de preuve ;
- `corroboration` : confirme une autre source ;
- `discovery` : permet de trouver acteurs, mots-clés, projets ;
- `watch` : utile pour la veille récurrente.

Une même source peut avoir plusieurs rôles, mais un rôle principal doit être déclaré.

---

# 10. Étape 6 — Évaluer l'automatisabilité

Pour chaque source, documenter :

- URL ou domaine canonique ;
- accès libre / inscription / abonnement ;
- fréquence de publication ;
- moteur de recherche interne ;
- flux RSS/API/open data si disponibles ;
- structure des URLs ;
- robots / conditions d'utilisation lorsque l'aspiration automatisée est envisagée ;
- stabilité de la source ;
- risque de contenu dynamique ou anti-bot ;
- possibilité de recherche par moteur général plutôt que scraping direct.

### Valeur `automation_fit`

- `high` : API, open data, pages stables, RSS, moteur structuré ;
- `medium` : pages web accessibles et recherchables, mais parsing nécessaire ;
- `low` : paywall, session, contenu très dynamique, restrictions fortes ;
- `manual_only` : usage humain uniquement.

Le référentiel ne doit jamais présumer qu'une page publiquement consultable autorise une aspiration industrielle.

---

# 11. Étape 7 — Construire deux packs

## Pack minimal

Le plus petit ensemble de sources permettant de lancer une étude fiable.

Il doit couvrir, si applicables :

- identité ;
- financier ;
- réglementation ;
- marché / concurrence ;
- presse professionnelle ;
- fédération / syndicat ;
- contrats / appels d'offres ;
- technologie / emploi ;
- triggers récents.

En pratique : **8 à 15 sources fortes** suffisent souvent.

## Pack enrichi

Sources supplémentaires pour approfondir les comptes, sous-segments, signaux régionaux, technologies ou grands donneurs d'ordre.

En pratique : **15 à 30 sources**, sans quota forcé.

---

# 12. Étape 8 — Test de couverture

Construire une matrice `famille_information × source`.

Une famille critique est valide si :

- au moins une source forte la couvre ;
- le rôle de la source est adapté ;
- la source a été vérifiée et datée ;
- le périmètre géographique et métier correspond réellement au marché.

### Gaps autorisés

Un gap n'est pas un échec si :

- il est nommé ;
- les recherches effectuées sont journalisées ;
- aucune donnée n'est inventée pour le masquer.

---

# 13. Étape 9 — Relecture orientée usage ESN

Pour chaque source retenue, poser la question :

> « Cette source peut-elle modifier la priorité d'un compte, l'angle du discours, le choix de l'interlocuteur ou le timing de prise de contact ? »

Si la réponse est non et que la source n'a aucune fonction de preuve indispensable, elle est reléguée au pack enrichi ou exclue.

---

# 14. Livrable standard attendu

Le référentiel final doit contenir :

1. **Synthèse du périmètre** ;
2. **Carte des besoins d'information** ;
3. **Liste complète des sources retenues** ;
4. **Tier + rôle + score d'utilité par source** ;
5. **Ce que chaque source permet d'attester** ;
6. **Mode d'accès et automatisabilité** ;
7. **Pack minimal** ;
8. **Pack enrichi** ;
9. **Requêtes types par famille** ;
10. **Gaps et limites** ;
11. **Journal de recherche** ;
12. **Scorecard de validation** ;
13. **Export JSON conforme au schéma du dossier**.

---

# 15. Critère ultime de réussite

Le référentiel est réussi si un analyste qui ne connaît pas le secteur peut, à partir de lui seul :

- lancer une étude sans dépendre de sa mémoire ;
- trouver rapidement les sources primaires ;
- distinguer preuve, discours corporate et simple indice ;
- éviter les erreurs de périmètre ;
- produire une recherche rejouable ;
- défendre chaque affirmation importante devant un expert du secteur.
