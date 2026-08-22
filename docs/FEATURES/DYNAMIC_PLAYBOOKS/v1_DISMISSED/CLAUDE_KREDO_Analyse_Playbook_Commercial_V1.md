# KREDO — Analyse critique de la feature « Playbook Commercial »

**Objet :** avis d'architecture et de produit sur la note de pré-cadrage
**Méthode :** audit de la base live `jvzgmhvwirsbdkjpmvla` (79 tables, 17 août 2026) + lecture croisée avec la cartographie des workflows n8n v1.0 et le contrat INTEL-020
**Auteur :** Claude — Lead Dev / Architecte
**Statut :** à arbitrer avant toute conception détaillée

---

## 0. Avertissement de forme

Les deux fichiers joints sont **identiques** (même contenu, même titre). Je suppose une erreur d'upload. L'analyse porte donc sur un seul document de cadrage.

---

## 1. Ce que dit la base — l'audit qui change tout

La note affirme (§2) que « KREDO accumule ou génère déjà de nombreuses briques de connaissance utiles » et que « la difficulté n'est donc pas d'obtenir davantage d'information ». **C'est vrai sur le plan des types de données, et faux sur le plan des volumes.** La base contient bien tous les types de briques annoncés. Elle ne les contient pas pour la plupart des comptes.

### 1.1 Couverture réelle du portefeuille (112 comptes)

| Brique | Comptes couverts | Lecture |
|---|---|---|
| Contacts | 88 / 112 | OK |
| Signaux (toutes catégories) | 93 / 112 | Trompeur — voir 1.2 |
| Faits d'entreprise (`account_facts` courants) | 45 / 112 | Moyen |
| Résultats IA (analyses, pitchs) | 72 / 112 | Bon |
| Interactions (historique relationnel) | 24 / 112 | **Faible** |
| Opportunités | 16 / 112 | Faible |
| Problématiques structurées (`account_issues`) | **8 / 112** | **Critique** |

**Comptes disposant du trio faits + signaux + contacts : 28.**
**Comptes disposant du quatuor avec problématiques structurées : 4.**

Le portefeuille se décompose par ailleurs en 63 prospects « noted » (fiches quasi vides), 23 « active », 12 « mapped », 7 « qualified », 6 clients. **Le périmètre réellement adressable par un playbook riche est donc de l'ordre de 30 à 45 comptes, pas 112.**

### 1.2 Les signaux sont moins nombreux qu'ils n'en ont l'air

835 lignes dans `account_signals`, mais **673 sont de catégorie `company_context`** — ce sont des éléments de contexte statique, pas des événements. Après filtrage de la fraîcheur (`expires_at`), il reste **162 signaux événementiels vivants** répartis sur ~93 comptes, soit **moins de 2 signaux exploitables par compte**. Parmi eux : 36 événements de croissance, 16 transformations SI, 13 réglementaires, 5 changements de dirigeants, 1 appel d'offres.

C'est suffisant pour un pilote. C'est très insuffisant pour promettre au commercial que chaque compte ouvrira sur « des signaux et des enjeux ».

### 1.3 La jointure persona est absente

C'est le point le plus structurant, et la note ne le voit pas.

Le parcours vitrine de la note (§4.2, « adresser le Directeur Digital ») suppose qu'on sache relier un interlocuteur à une persona. Or :

- `contacts.job_title` : rempli pour **639 / 642** contacts — mais en **texte libre**.
- `contacts.decision_power` : rempli pour **0 / 642**.
- `contacts.relationship_role` : rempli pour 109 contacts, sur **4 valeurs distinctes** seulement.
- Les personas existent, mais **côté secteur uniquement**, dans le JSON `sector_intelligence.playbook.personas` (structure `role` / `enjeu` / `peur`), sans aucune clé étrangère vers `contacts`.

**Conséquence :** en l'état, une branche « perspective Directeur Digital » ne peut être qu'une inférence LLM à la volée sur un intitulé de poste. Non déterministe, non traçable, non cacheable. C'est le contraire du principe de provenance que la note pose elle-même en §8.

### 1.4 La couche « playbook sectoriel » actuelle est un mur, pas un moteur

Les 53 fiches secteur possèdent toutes un champ `playbook` JSON, structuré en 4 clés — `personas`, `entry_points`, `objections`, `roi_arguments` — pour **environ 1 000 caractères au total par secteur**. La qualité rédactionnelle est excellente (j'ai lu Parfumerie et Banque-Finance : angles datés, objections avec réponses, ROI chiffrés). Mais c'est un **contenu statique, sectoriel, non contextualisé au compte** — exactement la « page de synthèse » que la note veut dépasser.

Statuts : 12 macro-secteurs `active`, 36 segments `development`, 0 `published`.

### 1.5 Ce qui est déjà là et qu'il faut absolument réutiliser

- **405 runs IA** dont 176 `intel-010-refresh`, 87 `intel-020-communication`, 26 `intel-030-account-knowledge`, 10 `intel-031-issues-map`, 7 `intel-032-strategy`. La chaîne de génération existe et tourne.
- **`account_signals` porte déjà un mini-moteur de playbook** : `global_score`, `score_justification`, `recommended_action`, `recommended_practice_id`, `suggested_contact_id`. C'est-à-dire : signal → action recommandée → practice Kredo → contact à viser. **La logique d'orchestration que la note appelle de ses vœux est déjà amorcée dans le schéma.**
- **`account_issues`** porte `criticality`, `importance`, `urgency`, `kredo_fit`, `accessibility`, `contact_ids`, `recommended_next_probe`, `evidence_level`, `provenance`, `source_refs`. C'est la meilleure colonne vertébrale de ramification disponible.
- **`account_roadmap_actions`** : structure complète (`action_type`, `target_contact_id`, `materialized_task_id`, `materialized_opportunity_id`, `materialized_calendar_event_id`) et **0 ligne**. Le schéma a anticipé la boucle « analyse → action CRM ». Rien ne la remplit.
- **41 offres actives** avec `use_cases`, `keywords`, `typical_deliverables` : la matière argumentaire côté Kredo.
- **`intelligence_documents`** : 119 documents, dont **107 en `draft` et seulement 11 en `ready`**.

---

## 2. Pertinence de l'idée

**L'intuition est juste. Le diagnostic posé en §2 de la note est le bon diagnostic.** Le problème du commercial d'ESN n'est pas l'accès à l'information, c'est le coût cognitif de sa recomposition avant chaque interaction. Un outil qui répond « voici ce que tu peux faire maintenant, et pourquoi » vaut structurellement plus qu'un outil qui répond « voici ce que je sais ».

Trois arguments renforcent cette pertinence, et la note ne les mobilise pas :

1. **La feature comble un trou identifié du schéma.** `account_roadmap_actions` est vide depuis la conception. Le playbook est précisément la surface d'interaction qui la remplirait. Ce n'est donc pas une couche cosmétique ajoutée sur un existant : c'est le chaînon manquant entre l'intelligence produite et l'action CRM.

2. **C'est la version bornée et livrable du copilot transverse (CORE-006).** La cartographie classe CORE-006 en P3, effort XL, confiance faible, « suppose un catalogue d'outils mûr ». Le playbook offre 80 % de la promesse du copilot — orchestration par intention, routage multi-source, deep-links — sur un périmètre borné (un compte, un interlocuteur, une intention) et sans langage naturel libre. **Construire le playbook, c'est dérisquer le copilot en le rendant testable.**

3. **C'est la feature démonstrative la plus forte du produit.** Il faut le nommer sans détour : KREDO est aussi une pièce de portfolio destinée à convaincre des clients ESN. Une navigation par ramifications qui recompose la connaissance en direct est infiniment plus démonstrative qu'un tableau de bord. Ce driver est légitime, mais il doit être explicite — car il modifie les arbitrages (il plaide pour la finition UX plutôt que pour la largeur fonctionnelle).

---

## 3. Là où la note se trompe — trois critiques de fond

### Critique 1 — La note conçoit une interface là où il manque un objet métier

La note décrit un « moteur de parcours ». C'est une métaphore de navigation. Mais **le blocage réel de KREDO n'est pas la navigation, c'est l'absence d'objet persistant représentant une décision commerciale.**

Aujourd'hui la base sait dire :
- ce qu'est le compte (`account_facts`),
- ce qui lui arrive (`account_signals`),
- quels sont ses problèmes (`account_issues`),
- ce que Kredo vend (`offers`),
- ce qu'on a écrit pour lui (`intelligence_documents`).

Elle ne sait **pas** dire : *« l'angle A sur le compte X, pour la persona Y, dans l'intention Z, adossé à telle preuve datée, associé à telle offre, avec telle objection probable, et telle prochaine action »*. Cet objet — appelons-le **l'Angle** — n'existe nulle part. `ai_intelligence_results` en contient des fragments, mais sous forme de snapshots textuels non requêtables, non scorables, non réutilisables.

**Si on construit une arborescence d'UI par-dessus des données brutes sans matérialiser l'Angle, on obtient un explorateur de données déguisé en copilote.** L'utilisateur cliquera, verra de l'information, et devra toujours faire lui-même la synthèse — exactement le problème de départ.

**Inversion recommandée : l'arborescence n'est pas le moteur, c'est la vue. Le moteur, c'est la matérialisation d'Angles scorés et sourcés.**

### Critique 2 — Le « moteur générique » est un piège pour une équipe solo

La note recommande (§7, §8) « un moteur léger d'orchestration » plutôt que des parcours codés écran par écran. Le raisonnement est sain en théorie. En pratique, pour un développeur seul :

- Un moteur générique coûte **2 à 3 fois** un parcours spécifique bien fait.
- Il n'est validé que lorsqu'il porte au moins 3 scénarios réels — donc son coût est payé bien avant que sa valeur soit démontrée.
- Il produit une surface de scénarios que la donnée ne peut pas remplir (voir §1 : 8 comptes avec problématiques structurées).

C'est exactement le schéma de sur-scoping déjà rencontré sur INTEL-020 (70 scénarios proposés, 8 retenus).

**Position recommandée : générique sur la donnée, spécifique sur l'UI.** Le modèle de données (Angle, Session, Persona) doit être générique dès le départ — c'est là que la migration coûte cher plus tard. Le parcours, lui, est codé en dur pour un seul scénario. Le deuxième scénario ne coûtera alors qu'un composant, pas une refonte.

### Critique 3 — La promesse de capitalisation n'est pas tenable telle qu'écrite

La note promet (§3, §6) de « capitaliser sur les situations comparables » et de réutiliser « les éléments qui ont de la valeur ». Cela suppose un raisonnement par cas : savoir ce qui a marché ailleurs.

Or la base ne contient **aucune donnée d'issue commerciale** : 29 opportunités, 24 comptes avec historique d'interactions, aucune table win/loss, aucun retour de terrain sur les pitchs envoyés. Toute affirmation du type « cet angle a fonctionné sur un compte similaire » serait **de la fiction**.

Ce qui est réellement tenable : **la réutilisation de mes propres productions antérieures** (retrieval sur `intelligence_documents`, qui dispose déjà d'un `search_vector`). Mais attention : 107 documents sur 119 sont en statut `draft`. Le corpus réellement validé et donc citable **compte 11 documents**.

**À reformuler dans la spec : « ne pas repartir de zéro » (faisable), et non « s'appuyer sur ce qui a fonctionné » (non faisable avant plusieurs mois d'usage instrumenté).**

---

## 4. Valeur métier réelle — l'analyse honnête

Il faut distinguer la valeur affichable de la valeur réelle, et ne pas se raconter d'histoire sur le ROI.

| Source de valeur | Réalité à court terme | Réalité à 12 mois |
|---|---|---|
| **Gain de temps de préparation** | Réel mais modeste : 45–90 min → 10–15 min, sur un volume de RDV faible. Quelques heures par mois. | Croît linéairement avec le volume de RDV. |
| **Non-régression du discours** | Faible en solo (le discours est dans la tête du fondateur). | **Fort dès le 2ᵉ commercial** : c'est l'actif qui rend le discours transmissible. C'est la vraie valeur latente. |
| **Boucle d'enrichissement** | **Immédiate et sous-estimée.** Un playbook vide sur un compte est un signal d'action ; il transforme l'enrichissement d'un devoir en un besoin ressenti. | Se stabilise. |
| **Valeur démonstrative (portfolio)** | **Maximale immédiatement.** C'est la feature la plus vendeuse de KREDO. | Se banalise. |
| **Amélioration du taux de conversion** | **Non démontrable. Ne pas la revendiquer.** | Mesurable seulement si on instrumente les issues dès maintenant. |

**Conclusion de valeur :** la justification économique du playbook à court terme n'est **pas** l'efficacité commerciale — c'est la démonstration produit et la boucle d'enrichissement. Sa justification à moyen terme est la transmissibilité du savoir commercial. Ces deux justifications sont solides. Elles n'imposent pas le même niveau d'ambition fonctionnelle : elles plaident pour **peu de scénarios, très bien finis**.

---

## 5. Périmètre fonctionnel optimal

### 5.1 Le vertical slice — plus étroit que ce que propose la note

La note propose « préparer un rendez-vous avec une persona donnée ». Je recommande de resserrer d'un cran :

> **« Préparer un rendez-vous avec un contact identifié, sur un compte identifié. »**

Trois raisons :

1. Partir d'un **contact réel** contourne le blocage persona (§1.3) : on infère la persona une fois, sur un contact, avec possibilité de correction manuelle — au lieu de construire d'emblée un référentiel complet.
2. Cela force la vraie jointure de données et révèle immédiatement les trous, plutôt que de les masquer derrière une abstraction.
3. Le livrable est concret : un **plan de RDV** exportable + un message généré via INTEL-020 (déjà opérationnel, 87 runs).

### 5.2 Point d'entrée : contextuel, pas dans le menu

**Le playbook ne doit pas être une rubrique de navigation.** Il doit se déclencher depuis un bouton « Préparer » sur la fiche compte et sur la fiche contact. Un outil de préparation qu'on doit aller chercher dans un menu n'est pas utilisé ; un bouton là où on regarde déjà le compte l'est.

L'espace de travail immersif décrit en §4 reste pertinent — mais comme **destination**, pas comme point d'entrée.

### 5.3 Dans le périmètre V1

- 1 intention : préparation de rendez-vous (premier RDV ou RDV de suivi).
- Ramification à **3 niveaux maximum** : perspective (persona) → angle → développement (arguments, objections, preuves, action).
- Cartes d'Angle avec provenance affichée et source datée.
- Panier « mon plan de RDV » alimenté par les choix.
- Sortie : export du plan + création de tâches + déclenchement INTEL-020.
- Persistance de session dès le jour 1.
- Restriction volontaire aux comptes disposant de la donnée (~28–45), avec message explicite et CTA d'enrichissement sur les autres.

### 5.4 Hors périmètre V1 — et pourquoi

| Élément | Raison |
|---|---|
| Moteur générique multi-scénarios | Coût x2–3 non justifié avant validation (§3.2) |
| Référentiel persona complet | 1 seul prérequis minimal suffit (§6.1) ; le référentiel complet vient en V1.5 |
| « Situations comparables » / case-based reasoning | Donnée inexistante (§3.3) |
| Scoring de confiance sophistiqué | `confidence_score` existe mais n'est pas calibré ; afficher un niveau à 3 crans suffit |
| Partage / collaboration | 1 workspace, 1 profil en base. Sans objet. |
| Mesure d'efficacité commerciale | Pas de donnée d'issue. À instrumenter maintenant, à exploiter plus tard. |
| Génération LLM à chaque clic | Décision d'architecture, voir §7.2 |

---

## 6. Les trois prérequis non négociables

### 6.1 Prérequis A — un référentiel persona minimal

Sans lui, la branche persona est une hallucination. Le coût est faible :

- Une table `personas` : 12 à 15 personas canoniques ESN (DSI, DSI adjoint, RSSI, Directeur Digital, Directeur Data, DAF, Directeur Métier, Directeur Achats, Directeur R&D, Directeur Conformité, DRH, DG), avec `typical_titles text[]` pour le matching.
- Une colonne `contacts.persona_id`.
- Une classification one-shot des 639 `job_title` par LLM, avec revue manuelle des cas ambigus.

Ce référentiel ne sert pas que le playbook : il améliore immédiatement le ciblage, le prompting d'INTEL-020, et l'exploitation des personas sectorielles existantes (qui sont de très bonne qualité, cf. §1.4).

### 6.2 Prérequis B — l'objet Angle

C'est le cœur de ma recommandation d'architecture. Table `playbook_angles`, **dérivée** (jamais saisie à la main), reliée en amont à `account_issues` / `account_signals` / `sector_intelligence`, et en aval à `account_roadmap_actions` (qu'elle vient enfin remplir).

Champs structurants : `company_id`, `contact_id`, `persona_id`, `intent`, `angle_type`, `title`, `rationale` (le « pourquoi maintenant »), `talking_points jsonb`, `objections jsonb`, `offer_ids uuid[]`, `proof_document_ids uuid[]`, `evidence_level`, `provenance`, `source_refs jsonb`, `score` + `score_details jsonb`, `freshness_at`, `expires_at`, `status`, `generated_by_run_id`.

**Règle d'affichage absolue : un Angle sans au moins une `source_ref` datée n'est jamais affiché comme un fait. Il peut apparaître dans un registre visuellement distinct « hypothèse à vérifier », ou pas du tout.** C'est la seule protection contre le fléau réel de ce type de feature : des angles plausibles, bien écrits, et parfaitement creux.

### 6.3 Prérequis C — la pré-calculation

Voir §7.2. C'est une décision technique, mais elle conditionne la viabilité de l'expérience.

---

## 7. Architecture

### 7.1 Data

Trois ajouts, aucune refonte :

```
personas                  (référentiel, ~15 lignes)
contacts.persona_id       (colonne ajoutée)
playbook_angles           (objet dérivé, matérialisé)
playbook_sessions         (id, company_id, contact_id, intent, state_json, outcome)
playbook_session_steps    (session_id, step_index, node_type, node_ref_id, choice_json)
```

La note place la persistance des sessions hors périmètre (§9). **Je suis en désaccord.** C'est deux tables triviales, et c'est la **seule** source de données permettant d'apprendre quels angles sont réellement choisis. Sans elle, le scoring restera à jamais une heuristique aveugle. On persiste dès le jour 1, on exploite plus tard.

`account_roadmap_actions` est réactivée en aval : Angle retenu → action → tâche / opportunité / événement calendrier. La boucle CRM se referme enfin.

### 7.2 Orchestration — la décision technique déterminante

**L'orchestration est déterministe et côté serveur (TypeScript). Elle n'appelle pas de LLM.**

Étant donné (intention, compte, contact), une fonction sélectionne et classe les Angles disponibles selon des critères déjà présents en base : `global_score` du signal source, `criticality` × `kredo_fit` de la problématique, fraîcheur, correspondance persona. C'est une requête SQL avec une pondération, pas un agent.

**Les Angles sont pré-calculés en asynchrone, pas générés au clic.**

C'est la décision la plus importante du dossier. Un LLM dans le chemin de navigation, c'est 15 à 30 secondes d'attente par ramification. Sur un parcours à 4–6 choix, l'expérience est morte, et le coût devient imprévisible. Avec la pré-calculation : ~30–45 comptes actifs × 1 rafraîchissement hebdomadaire = un volume de runs négligeable, une navigation instantanée, un coût plafonné et prévisible.

**Le LLM n'intervient que sur le dernier mètre** : la formulation du message final. C'est-à-dire INTEL-020, qui existe déjà. Le playbook ne génère rien — il assemble, classe, et délègue.

### 7.3 Frontière n8n

- **n8n** : génération/rafraîchissement des Angles (nouveau workflow, dépend de CORE-004), et rédaction finale (INTEL-020 existant).
- **Next / Supabase** : orchestration, scoring, sélection, session, matérialisation des actions. Aucun calcul métier dans n8n — conformément à la règle déjà posée dans la cartographie.

### 7.4 Vue Desktop — l'analyse

Espace de travail en 3 colonnes :

- **Gauche (fixe)** — fil d'Ariane des choix effectués + contexte du compte et du contact. Permet de revenir en arrière sans perdre le fil.
- **Centre** — les cartes d'Angle du niveau courant, triées par score, avec badge de provenance et date de la preuve. 3 à 5 cartes maximum par niveau ; au-delà, on ne guide plus, on submerge.
- **Droite** — « Mon plan de RDV » en construction : éléments épinglés, réorganisables, avec le bouton de sortie (export, tâches, message).

Densité assumée, tableau de détail dépliable sur chaque carte, filtres sur la fraîcheur et le niveau de preuve.

### 7.5 Vue Mobile — l'action

**Pas la même interface réduite : un autre parcours.** Le cas d'usage mobile est le commercial dans sa voiture 10 minutes avant le RDV. Il ne construit pas un plan, il le consulte.

- Écran unique séquentiel, une décision par écran, cibles tactiles > 44px.
- Bottom sheet persistant « Mon plan » accessible en un geste.
- **Mode consultation prioritaire** : si un plan existe déjà pour ce contact, l'ouverture mobile affiche directement le plan, pas le parcours de construction.
- Zéro graphique, zéro tableau. Cartes, jauges en pur Tailwind, boutons d'action.

L'arborescence n'est jamais affichée comme un arbre. Un arbre est un bon modèle mental et une mauvaise interface — illisible sous 400px, et il expose la complexité au lieu de l'absorber.

### 7.6 La carte d'Angle — l'unité de valeur

Composant unique, identique desktop et mobile, structuré ainsi :

1. **Titre** — l'angle en une phrase actionnable
2. **Pourquoi maintenant** — le signal ou l'échéance, **daté**
3. **Provenance** — badge à 3 niveaux : `Fait vérifié` / `Analyse IA` / `Suggestion générée`
4. **Ce qu'on dit** — 2 à 3 points de discours
5. **Objection probable** + réponse
6. **Offre Kredo associée**
7. **Prochaine action** — bouton unique

Si un composant tient cette promesse, la feature fonctionne. S'il ne la tient pas, aucune arborescence ne la sauvera.

---

## 8. Difficultés et risques

| Risque | Gravité | Traitement |
|---|---|---|
| **Branches vides** — 8 comptes sur 112 ont des problématiques structurées | Élevée | N'afficher que les branches adossées à de la donnée. Compteur de preuves visible. CTA d'enrichissement sur compte pauvre. |
| **Généricité des angles** — plausibles mais creux | **Critique** | Règle de la source datée obligatoire (§6.2). C'est le risque n°1 : c'est celui qui détruit la crédibilité devant un DSI. |
| **Latence** | Élevée | Pré-calculation (§7.2) |
| **Fraîcheur** — présenter un signal de 6 mois comme un « pourquoi maintenant » | Élevée | `expires_at` existe déjà sur `account_signals` : l'exploiter, afficher l'âge de la preuve systématiquement |
| **Ambiguïté de nommage** | Moyenne | Voir §9 |
| **Dérive vers le copilot (CORE-006)** | Moyenne | Interdire le langage naturel libre en V1. Le parcours reste guidé. |
| **Conflit de séquencement avec la roadmap** | Moyenne | Voir §10 |
| **Reconstruction d'un cerveau parallèle** | Élevée | Le playbook est **consommateur** de INTEL-030/031/032, jamais re-générateur. Aucun LLM factuel propre. |

### Promesses de la note : ce qui est atteignable

**Atteignable en V1 :** assemblage contextuel de la connaissance existante ; ramification sur 2–3 niveaux ; cartes d'Angle sourcées ; sortie vers message et tâches ; persistance de session ; couverture de ~30 comptes.

**Non atteignable — à retirer de la spec :** « situations comparables » et apprentissage de ce qui a marché (§3.3) ; niveau de confiance calibré ; collaboration entre commerciaux ; mesure de l'efficacité commerciale.

**Atteignable mais à reformuler :** la capitalisation sur le corpus existant, qui doit être présentée comme « ne pas repartir de zéro » — et qui porte aujourd'hui sur 11 documents validés, pas 119.

---

## 9. Un problème de nommage à trancher maintenant

« Playbook » désigne déjà, dans KREDO et dans le code, un objet **sectoriel et statique** : `sector_intelligence.playbook`, la route `/ressources/playbook/[slug]`. La nouvelle feature est **liée au compte et dynamique**. Deux objets différents sous un même nom, c'est une confusion produit garantie et une dette de nommage dans le code.

**Recommandation :**
- L'existant reste **« Playbook sectoriel »** — la connaissance de référence, le socle.
- La nouvelle feature devient **« Préparation »** (un verbe, une action) ou **« Angles »** (l'objet produit).

Ma préférence : **« Préparer »** comme libellé de bouton, **« Angle »** comme nom de l'objet en base et dans le code. Cela nomme l'action côté utilisateur et l'objet côté système — la meilleure convention possible.

---

## 10. Séquencement — la vraie question

La cartographie n8n place F1 (IA Hub) et F2 (Prospection) avant tout le reste, et les fondations CORE-001/002/003/004 comme bloquantes. Le playbook n'y figure pas.

**Argument pour le faire maintenant :** le vertical slice tel que je le définis est **quasi intégralement en lecture** sur des données existantes. Il ne dépend d'aucun nouveau workflow n8n en V1 (la génération d'Angles peut, en amorçage, être faite manuellement ou par un run one-shot). Il ne bloque rien et ne dépend de rien.

**Argument contre :** il consomme du temps de développement sur une feature dont la valeur d'usage immédiate est modeste (§4), pendant que 63 comptes sur 112 restent des coquilles vides.

**Arbitrage recommandé :** séquence en deux temps.

- **Temps 1 (prioritaire) — enrichir avant d'orchestrer.** Faire passer 15–20 comptes du statut « noted » à un socle exploitable (faits + signaux + problématiques), et poser le référentiel persona (§6.1). Sans cela, le playbook sera une belle interface sur du vide, et l'échec sera imputé à la feature alors qu'il viendra de la donnée.
- **Temps 2 — construire le vertical slice** sur ces 15–20 comptes, avec l'objet Angle et la pré-calculation.

Le référentiel persona du Temps 1 a une valeur autonome, indépendamment du playbook. C'est donc un investissement sans risque : même si le playbook était abandonné, il resterait rentable.

---

## 11. Avis final

**Verdict : GO, sur un périmètre resserré, conditionné à trois prérequis, et séquencé après un effort d'enrichissement de données.**

Trois affirmations pour résumer ma position.

**1. La note a raison sur le problème et se trompe sur la nature de la solution.** Le diagnostic — l'information existe mais n'est pas articulée au bon moment — est exact. Mais la note en déduit qu'il faut construire une **interface de parcours**, alors qu'il faut d'abord construire un **objet métier manquant**. L'Angle — compte + persona + intention + preuve datée + offre + action — n'existe nulle part dans les 79 tables. Tant qu'il n'existe pas, toute arborescence sera un explorateur de données déguisé, et l'utilisateur devra encore faire lui-même la synthèse. Le moteur, ce sont les Angles matérialisés ; l'arborescence n'en est que la vue.

**2. Le facteur limitant n'est ni l'architecture ni l'IA : c'est la couverture des données.** 28 comptes sur 112 disposent du trio faits + signaux + contacts. 8 ont des problématiques structurées. 162 signaux événementiels vivants pour 93 comptes. Aucune persona structurée sur 642 contacts. Construire un moteur générique sur cette base, c'est construire une usine pour une production qui n'existe pas encore. **L'ordre correct est : enrichir 15–20 comptes, poser le référentiel persona, puis orchestrer.** L'inverse produira une démonstration impressionnante et un outil inutilisé.

**3. La valeur immédiate est démonstrative et auto-renforçante, pas opérationnelle — et c'est acceptable, à condition de l'assumer.** Le gain de temps de préparation est réel mais faible au volume actuel. La vraie valeur à court terme est double : c'est la feature la plus vendeuse du produit auprès d'un prospect ESN, et c'est le mécanisme qui transformera l'enrichissement de la base d'une corvée en un besoin ressenti. À moyen terme, sa valeur est ailleurs et elle est considérable : **c'est l'actif qui rend le savoir commercial transmissible à un deuxième commercial.** Cette lecture change les arbitrages : elle plaide pour **un seul scénario impeccablement fini plutôt que six scénarios approximatifs**, et pour une exigence de sourçage sans compromis — car un angle générique et non sourcé, présenté devant un DSI, coûte plus cher en crédibilité que l'absence totale d'outil.

**Ce que je refuserais de construire en l'état :** un moteur générique multi-scénarios ; une génération LLM déclenchée à chaque ramification ; toute promesse de capitalisation sur « ce qui a fonctionné » ; l'affichage d'un angle non adossé à une source datée.

**Ce que je construirais en premier, dans l'ordre :** le référentiel persona et la classification des 639 intitulés de poste ; la table `playbook_angles` avec sa règle de sourçage ; un job de pré-calculation sur 15–20 comptes ; le composant Carte d'Angle ; puis, seulement, le parcours « Préparer un RDV » en dur.

---

*Analyse produite le 17 août 2026, adossée à l'audit direct de la base live `jvzgmhvwirsbdkjpmvla`. Tous les chiffres de couverture sont issus de requêtes exécutées ce jour et sont donc datés — ils évolueront avec l'enrichissement du portefeuille.*
