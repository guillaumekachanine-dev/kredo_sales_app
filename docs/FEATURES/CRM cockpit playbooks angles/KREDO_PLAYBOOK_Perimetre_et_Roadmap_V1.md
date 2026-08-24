# KREDO — Feature « Préparer / Angles »
## Périmètre fonctionnel figé & Roadmap d'implémentation

**Version :** 1.0
**Date :** 17 août 2026
**Auteur :** Claude — Lead Dev / Architecte
**Statut :** périmètre à geler par Dosta avant démarrage du Lot 1
**Documents amont :** `KREDO_Note_precadrage_Playbook_Commercial.md`, `KREDO_Analyse_Playbook_Commercial_V1.md`, `KREDO_Cartographie_Workflows_n8n_Roadmap_Fonctionnelle_20260614.pdf`, `INTEL-020-REDACTION-ASSISTEE-V1.md`

---

# PARTIE A — PÉRIMÈTRE FONCTIONNEL FIGÉ

> Cette partie est un **contrat**. Une fois validée, toute demande hors de ce périmètre est refusée par défaut et versée au backlog V1.5/V2. C'est la seule protection contre la dérive qui a déjà touché INTEL-020 (70 scénarios proposés, 8 retenus).

## A.1 — Définition en une phrase

> **Depuis la fiche d'un compte ou d'un contact, KREDO assemble en moins d'une seconde les angles d'attaque disponibles et sourcés, guide le commercial par un parcours à embranchements de 3 niveaux, et produit un plan de rendez-vous actionnable convertible en tâches, en opportunité et en message.**

## A.2 — Vocabulaire officiel (à respecter en base, dans le code et dans l'UI)

| Terme | Définition | Où il vit |
|---|---|---|
| **Playbook sectoriel** | L'existant. Connaissance de référence, statique, liée au secteur. **On n'y touche pas.** | `sector_intelligence.playbook`, `/ressources/playbook/[slug]` |
| **Angle** | L'objet nouveau. Un vecteur d'entrée commercial : compte + persona + intention + preuve datée + offre + action. | `playbook_angles` |
| **Perspective** | Le point de vue adopté = une persona. Niveau 1 de la ramification. | `personas` |
| **Parcours** | La session de navigation d'un commercial. | `playbook_sessions` |
| **Plan** | Le livrable : les angles épinglés + les actions retenues. | `playbook_sessions.state_json` → `account_roadmap_actions` |
| **Préparer** | Le libellé utilisateur du bouton d'entrée. | UI |

**Règle de nommage :** on ne dit jamais « playbook » pour désigner la nouvelle feature. Ni en réunion, ni dans le code, ni dans les commits. Cette discipline évite une dette de nommage irréversible.

## A.3 — Le parcours canonique V1, écran par écran

**Intention unique en V1 : préparer un rendez-vous (premier RDV ou RDV de suivi).**

| Étape | Écran | Ce que fait le système | Ce que fait l'utilisateur |
|---|---|---|---|
| **E0** | Fiche compte / fiche contact | Affiche un bouton « Préparer » + un compteur d'angles disponibles | Clique |
| **E1** | Contexte | Résume le compte : secteur, statut, dernière interaction, fraîcheur de la donnée. Pré-sélectionne le contact si l'entrée s'est faite depuis la fiche contact | Confirme ou choisit le contact |
| **E2** | **Perspective** (niveau 1) | Propose les personas présentes chez ce compte, avec pour chacune le nombre d'angles adossés à de la donnée | Choisit une perspective |
| **E3** | **Angles** (niveau 2) | Affiche 3 à 5 Cartes d'Angle triées par score, chacune avec sa preuve datée et son badge de provenance | Épingle un ou plusieurs angles |
| **E4** | **Développement** (niveau 3) | Pour l'angle épinglé : points de discours, objection probable + réponse, offre Kredo associée, preuves réutilisables (documents Kredo `ready`) | Épingle les éléments retenus |
| **E5** | **Plan** | Récapitule le plan constitué, réorganisable | Exporte / convertit |
| **E6** | Sorties | Crée les tâches, l'opportunité ou l'événement calendrier ; déclenche INTEL-020 pour le message | Valide |

**Retour arrière possible à tout moment.** Le parcours est persisté à chaque étape.

## A.4 — Périmètre IN (V1) — liste contractuelle

1. Point d'entrée contextuel : bouton « Préparer » sur fiche compte **et** fiche contact. Pas d'entrée par le menu principal.
2. Une seule intention : préparation de rendez-vous.
3. Ramification à **exactement 3 niveaux** : Perspective → Angle → Développement.
4. Composant **Carte d'Angle** unique, identique desktop et mobile (structure figée en A.6).
5. Affichage systématique de la **provenance** (3 niveaux) et de la **date de la preuve**.
6. Tri des angles par score déterministe, calculé côté serveur, sans LLM.
7. Angles **pré-calculés** en asynchrone. Aucun appel LLM dans le chemin de navigation.
8. Persistance du parcours dès le premier clic (reprise possible).
9. Panier « Mon plan » alimenté par les épinglages.
10. Sorties : export du plan (markdown/impression), création de tâches, matérialisation dans `account_roadmap_actions`, déclenchement d'INTEL-020 avec le plan injecté en contexte.
11. Vue Desktop 3 colonnes / vue Mobile séquentielle — deux composants distincts, **jamais** de masquage CSS.
12. Mode consultation mobile : si un plan existe déjà pour ce contact, l'ouverture affiche le plan, pas le parcours.
13. Message explicite + CTA d'enrichissement sur les comptes sans donnée suffisante.
14. Restriction assumée au sous-ensemble de comptes couverts (~15 à 45), sans le masquer à l'utilisateur.

## A.5 — Périmètre OUT — et horizon de réouverture

| Exclu de V1 | Motif | Horizon |
|---|---|---|
| Moteur générique multi-scénarios | Coût ×2–3 avant validation ; donnée insuffisante pour remplir la surface | V2, après 2 scénarios éprouvés |
| Autres intentions (soutenance, prospection, situation sensible, qualification) | Chacune exige un contrat de sortie différent | V1.5, une par une |
| Référentiel persona enrichi (matrice persona × secteur × enjeux) | Le référentiel minimal suffit au parcours | V1.5 |
| « Situations comparables » / raisonnement par cas | **Aucune donnée d'issue commerciale en base.** Serait de la fiction. | V2 minimum, après instrumentation |
| Scoring de confiance calibré | `confidence_score` existe mais n'est pas calibré | V2 |
| Partage / collaboration entre commerciaux | 1 workspace, 1 profil en base | Sans objet |
| Mesure de l'efficacité commerciale | Pas de donnée d'issue. **Mais on instrumente dès la V1.** | V2 |
| Langage naturel libre / chat | C'est CORE-006 (copilot). Le parcours reste guidé. | P3 |
| Génération LLM au clic | Décision d'architecture ferme | Jamais |
| Édition manuelle d'un Angle | `playbook_angles` est dérivée, jamais saisie | V1.5 (override humain) |

## A.6 — Structure figée de la Carte d'Angle

Sept blocs, dans cet ordre, sans exception :

1. **Titre** — l'angle en une phrase actionnable
2. **Pourquoi maintenant** — le signal, l'échéance ou la problématique, **avec sa date**
3. **Provenance** — badge à 3 crans, réutilisant l'enum `intelligence_provenance` existante :
   - `Fait vérifié` ← `relational`, `human_verified`
   - `Analyse IA` ← `engine_researched`, `folio_legacy`
   - `Hypothèse` ← `inferred`
4. **Ce qu'on dit** — 2 à 3 points de discours
5. **Objection probable** + réponse
6. **Offre Kredo associée** — lien vers `offers`
7. **Prochaine action** — un bouton, un seul

## A.7 — Les huit règles invariantes

| # | Règle | Pourquoi |
|---|---|---|
| **R1** | Un Angle sans au moins une `source_ref` datée n'est jamais affiché comme un fait. Il apparaît en registre « Hypothèse » ou pas du tout. | C'est LE risque n°1 : des angles plausibles et creux détruisent la crédibilité devant un DSI |
| **R2** | Aucun appel LLM dans le chemin de navigation. | Latence, coût imprévisible, expérience morte |
| **R3** | L'orchestration (sélection, scoring, tri) est déterministe, en TypeScript, côté serveur. | Traçable, testable, cacheable, gratuit |
| **R4** | La feature est **consommatrice** de INTEL-030/031/032. Elle ne re-génère aucun fait. | Éviter un deuxième cerveau parallèle et deux sources de vérité |
| **R5** | `playbook_angles` est une table **dérivée**. Jamais de saisie manuelle en V1. | Garantit la traçabilité vers la source |
| **R6** | Desktop et mobile sont deux composants distincts. Aucun `hidden md:block` sur un composant lourd. | Règle d'architecture KREDO |
| **R7** | Le parcours est persisté dès le premier clic, même si l'exploitation analytique vient plus tard. | Seule source future d'apprentissage du scoring |
| **R8** | La fraîcheur est affichée partout. Un signal expiré n'alimente aucun angle actif. | `expires_at` existe déjà sur `account_signals` |

## A.8 — Critères d'acceptation de la V1 (testables)

- [ ] Sur un compte pilote, le bouton « Préparer » ouvre le parcours en **< 1 s** (P95).
- [ ] Aucune requête LLM n'est émise entre E1 et E5 (vérifiable dans `ai_intelligence_runs`).
- [ ] Chaque angle affiché en registre « Fait vérifié » ou « Analyse IA » porte une source consultable et datée.
- [ ] Un parcours interrompu puis rouvert restitue exactement l'état précédent.
- [ ] Le plan produit génère au moins une ligne dans `account_roadmap_actions` **et** une tâche réelle dans `tasks`.
- [ ] Le déclenchement INTEL-020 depuis le plan injecte les angles retenus dans le contexte du prompt.
- [ ] Sur mobile 375px : aucune barre de défilement horizontale, toutes les cibles tactiles ≥ 44px, parcours complet réalisable au pouce.
- [ ] Un compte sans donnée affiche un état vide explicite avec CTA d'enrichissement, jamais une page blanche ni un angle inventé.
- [ ] Un second scénario (autre intention) peut être ajouté sans modifier le schéma ni la Carte d'Angle.

---

# PARTIE B — ROADMAP D'IMPLÉMENTATION

## B.0 — Doctrine de sélection des agents

Avant les lots, la règle générale. Le choix de l'agent n'est pas une question de préférence, c'est une question de **nature de la tâche**.

| Agent | Ce pour quoi il est le meilleur | Ce pour quoi il ne faut pas l'utiliser |
|---|---|---|
| **Claude Code** | Travail ancré dans le dépôt : respect des conventions existantes, refactors multi-fichiers, migrations Supabase, composants Next/React dans le design system. **Agent par défaut de ce projet.** | Transformations de données en très gros volume (coûteux) |
| **Codex (ChatGPT)** | Tâche isolée, spécification serrée, contrat de test clair : fonction de scoring pure, utilitaires TypeScript, script one-shot. Un fichier, une spec, des tests. | Tout ce qui exige de comprendre la cohérence globale du dépôt |
| **Gemini (Antigravity)** | Volume : lecture de longs documents, transformation en masse (639 intitulés de poste → mapping), génération de gros JSON/SQL à partir d'un snapshot, exploration de variantes UI à partir d'une capture. | Écriture directe en base ; toute tâche où une erreur silencieuse coûte cher |

**Sur les modèles.** Ma connaissance des gammes s'arrête à mai 2026 ; les noms commerciaux ont pu bouger. La règle est donc formulée en niveau, pas en nom : pour un lot marqué **« raisonnement élevé »**, prendre le modèle le plus capable disponible chez le fournisseur au moment du lot (Claude Opus, GPT-5.x en mode reasoning high, Gemini Pro). Pour un lot marqué **« standard »**, le modèle de milieu de gamme suffit (Claude Sonnet 4.6). **Ne jamais descendre sous Sonnet 4.6 / équivalent sur un lot qui écrit en base.**

---

## LOT 0 — Gel du périmètre

| | |
|---|---|
| **Objectif** | Valider la Partie A. Aucun code. |
| **Prérequis** | Aucun |
| **Agent** | Aucun — décision humaine |
| **Effort** | 1 h de lecture + arbitrage |

**Attendus :** la Partie A signée, les 3 arbitrages tranchés (nommage « Préparer/Angle », séquencement enrichissement-avant-orchestration, pré-calculation). Le document est commité dans `docs/playbook/`.

**Point de vigilance :** ne pas démarrer le Lot 1 tant que le nommage n'est pas tranché. Un renommage après le Lot 3 coûte une migration.

---

## LOT 1 — Référentiel Persona

| | |
|---|---|
| **Objectif** | Créer le référentiel des personas et rattacher les 642 contacts. |
| **Prérequis** | Lot 0 validé |
| **Effort** | 1,5 jour |
| **Valeur autonome** | **Oui** — rentable même si la feature était abandonnée (améliore ciblage et prompting INTEL-020) |

**Contenu**
- Migration : table `personas` (12–15 lignes canoniques ESN : DSI, DSI adjoint, RSSI, Directeur Digital, Directeur Data/IA, DAF, Directeur Métier, Directeur Achats, Directeur R&D, Directeur Conformité, DRH, DG, Directeur Delivery/Production), avec `code`, `label`, `family`, `typical_titles text[]`, `default_enjeux jsonb`.
- Colonne `contacts.persona_id` + index.
- Classification des **639** `job_title` en texte libre → `persona_id`, avec `persona_confidence` et revue humaine des cas ambigus.
- Vue de contrôle : distribution des personas par compte.

**Agents**

| Sous-tâche | Agent | Modèle | Skills / MCP |
|---|---|---|---|
| Conception du référentiel + migration | **Claude Code** | raisonnement élevé | `data:sql-queries`, MCP Supabase (`apply_migration`) |
| Classification en masse des 639 intitulés | **Gemini (Antigravity)** | Pro | Export CSV depuis Supabase → mapping CSV en retour. Aucune écriture directe. |
| Injection du mapping + vérification | **Claude Code** | standard | MCP Supabase |

**Points de vigilance**
- **Ne jamais laisser Gemini écrire en base.** Il produit un CSV, Claude Code l'injecte via une table de staging (`staging_persona_mapping`) puis un UPDATE par CTE. C'est le pattern d'import déjà éprouvé sur le projet.
- Prévoir une persona `unknown` plutôt que de forcer un rattachement. Un faux rattachement est pire qu'une absence.
- `decision_power` est vide sur 642 contacts : **ne pas essayer de le remplir dans ce lot.** Hors périmètre, tentation forte, coût élevé.
- Conserver `job_title` intact. La persona s'ajoute, ne remplace pas.

**Definition of Done**
- ≥ 85 % des contacts rattachés à une persona autre que `unknown`.
- Un échantillon de 30 rattachements revu manuellement, taux d'erreur < 10 %.
- Requête de contrôle fournie et exécutable.
- **Handoff L1→L2 rédigé.**

---

## LOT 2 — Enrichissement des comptes pilotes

| | |
|---|---|
| **Objectif** | Faire passer 15 à 20 comptes d'un socle vide à un socle exploitable. |
| **Prérequis** | Lot 1 |
| **Effort** | 2 jours (majoritairement du temps machine + QA humaine) |
| **Nature** | **Lot de données, pas de code.** |

**Contenu**
- Sélection des comptes pilotes : les 6 clients + les 7 `qualified` + 7 `active` à plus fort potentiel.
- Exécution des workflows existants sur ces comptes : `intel-030-account-knowledge`, `intel-031-issues-map`, `intel-010-refresh`.
- QA humaine des sorties : c'est là que la crédibilité se joue.
- Passage de documents clés de `draft` à `ready` (aujourd'hui : **107 draft / 11 ready**). Objectif : ≥ 25 documents `ready`.

**Agents :** Claude en session de chat avec MCP Supabase pour le pilotage et la vérification. Pas d'agent de coding.

**Points de vigilance**
- **Le lot le plus facile à bâcler et le plus coûteux à bâcler.** Un playbook sur des données médiocres échouera, et l'échec sera imputé à la feature.
- Objectif chiffré, non négociable : **≥ 15 comptes avec ≥ 3 `account_issues` et ≥ 2 signaux événementiels vivants.** Aujourd'hui : 8 comptes ont des issues, tous comptes confondus.
- Vérifier `expires_at` sur les signaux : un signal périmé n'alimentera aucun angle.
- Ne pas élargir à 40 comptes. 15 bien faits valent mieux que 40 approximatifs.

**Definition of Done**
- Requête de couverture retournant ≥ 15 comptes qualifiés.
- ≥ 25 `intelligence_documents` en statut `ready`.
- **Handoff L2→L3 rédigé**, incluant la liste nominative des comptes pilotes.

---

## LOT 3 — Schéma Angle & Sessions

| | |
|---|---|
| **Objectif** | Poser le modèle de données définitif. |
| **Prérequis** | Lots 1 et 2 |
| **Effort** | 1 jour |
| **Criticité** | **Maximale.** C'est le lot où une erreur coûte le plus cher à corriger. |

**Contenu**
- `playbook_angles` : `company_id`, `contact_id`, `persona_id`, `intent`, `angle_type`, `title`, `rationale`, `talking_points jsonb`, `objections jsonb`, `offer_ids uuid[]`, `proof_document_ids uuid[]`, `evidence_level`, `provenance`, `source_refs jsonb`, `source_issue_id`, `source_signal_id`, `score numeric`, `score_details jsonb`, `freshness_at`, `expires_at`, `status`, `generated_by_run_id`.
- `playbook_sessions` : `company_id`, `contact_id`, `intent`, `state_json`, `started_at`, `completed_at`, `outcome`.
- `playbook_session_steps` : `session_id`, `step_index`, `node_type`, `node_ref_id`, `choice_json`.
- RLS sur les trois tables, alignée sur le pattern workspace existant.
- Réutilisation des enums existants : `intelligence_provenance`, `account_issue_evidence_level`, `account_issue_category`.

**Agent :** **Claude Code**, raisonnement élevé, MCP Supabase (`apply_migration`), skill `engineering:architecture` + `data:sql-queries`.

**Points de vigilance**
- **Réutiliser les enums existants, ne pas en créer de nouveaux.** `intelligence_provenance` porte déjà exactement les 5 valeurs nécessaires.
- Contrainte d'intégrité matérialisant R1 : un angle en `provenance` autre que `inferred` **doit** avoir `source_refs` non vide. À poser en `CHECK`, pas en convention.
- `expires_at` obligatoire, dérivé de la source. Un angle survit rarement à son signal.
- Migration **additive uniquement**. Aucun `DROP`. Souvenir de l'incident de mars 2026.
- Numérotation séquentielle des migrations, commit dans `supabase/migrations/`.
- Générer les types TypeScript dans la foulée (`generate_typescript_types`).

**Definition of Done**
- Migration appliquée, RLS testée avec et sans contexte d'auth.
- Types TS régénérés et commités.
- 3 lignes de test insérées puis supprimées, contrainte CHECK vérifiée en échec volontaire.
- **Handoff L3→L4 rédigé** avec le DDL exact et les décisions de modélisation.

---

## LOT 4 — Moteur de matérialisation des Angles

| | |
|---|---|
| **Objectif** | Remplir `playbook_angles` à partir de l'existant. |
| **Prérequis** | Lot 3 |
| **Effort** | 3 jours (2 + 1) |

### Lot 4a — Amorçage par script one-shot

Script Node/TS exécuté en local qui, pour les 15 comptes pilotes, produit les angles en croisant `account_issues` × `account_signals` × `personas` × `sector_intelligence.playbook` × `offers`, puis appelle un LLM **une seule fois par angle** pour la rédaction du `title`, des `talking_points` et de l'`objection`.

- **Agent : Codex**, raisonnement élevé. Tâche isolée, spécification serrée, contrat d'entrée/sortie clair — profil idéal.
- Sortie : un JSON validé, injecté ensuite par Claude Code via MCP.

### Lot 4b — Industrialisation n8n

Le même traitement porté en workflow n8n (`INTEL-035-angle-materialization`), déclenché hebdomadairement sur les comptes actifs.

- **Agent : Claude en session de chat** pour la spécification nœud par nœud, puis **Claude Code** pour le JSON du workflow. MCP n8n disponible.
- Dépend de CORE-004 si l'on veut la mutualisation des coûts LLM. **Peut être livré sans**, en appel direct, avec log manuel — décision réversible.

**Points de vigilance**
- **Le prompt de rédaction ne doit produire aucun fait.** Il reformule un contexte fourni. S'il « complète », R1 est violée en silence. Instruction explicite : « n'ajoute aucune information absente du contexte ; si le contexte est insuffisant, retourne `insufficient_context: true` ».
- Idempotence : une `dedupe_key` sur (company, persona, source_issue/signal, intent). Un rerun ne doit pas dupliquer.
- Ne pas générer plus de **5 angles par couple compte × persona**. Au-delà, on ne guide plus.
- Sur n8n v2 : `createOrUpdate` non supporté dans la version installée → utiliser `Create` + `Continue on Error`. Nœud HTTP Request plutôt que le nœud Anthropic natif (bug d'auth documenté). Parsing JSON en nœud Code, pas en Structured Output Parser (bug backtick).
- Budget : ~15 comptes × ~3 personas × ~4 angles = ~180 générations en amorçage. Volume maîtrisé, à vérifier avant lancement.

**Definition of Done**
- ≥ 150 angles en base sur les 15 comptes pilotes.
- 100 % des angles non-`inferred` ont une `source_refs` datée.
- Revue manuelle de 20 angles : ≥ 80 % jugés « je dirais ça en RDV ».
- **Handoff L4→L5 rédigé** avec le prompt exact et les métriques de génération.

---

## LOT 5 — Composant Carte d'Angle

| | |
|---|---|
| **Objectif** | Construire et valider l'unité de valeur, **isolément**. |
| **Prérequis** | Lot 4 (données réelles à afficher) |
| **Effort** | 1,5 jour |

**Contenu**
- Le composant à 7 blocs (A.6), variantes desktop et mobile.
- Les 3 badges de provenance, l'affichage de fraîcheur.
- États : chargement, vide, angle expiré, hypothèse.
- Une page de démonstration interne affichant 10 angles réels.

**Agent : Claude Code**, standard, skill **`frontend-design`** obligatoire + `modern-web-guidance`. Design system Cobalt Franc, Tailwind v4 `@theme` uniquement, shadcn/ui.

**Points de vigilance**
- **Ce lot est le juge de paix.** Si la carte ne donne pas envie d'agir en la lisant, aucune arborescence ne sauvera la feature. Le valider **avant** de coder le parcours est une décision de séquencement délibérée.
- Aucune ombre, aucun dégradé — design flat premium.
- La date de la preuve doit être lisible sans interaction. Pas dans un tooltip.
- Cible tactile ≥ 44px sur le bouton d'action, dès la variante desktop.
- Pas de graphique. Aucune librairie de dataviz.

**Definition of Done**
- Carte validée visuellement par Dosta sur desktop **et** sur mobile réel.
- 4 états implémentés et démontrables.
- **Handoff L5→L6 rédigé** avec les props du composant figées.

---

## LOT 6 — Parcours Desktop

| | |
|---|---|
| **Objectif** | Le workspace 3 colonnes, E1 à E5. |
| **Prérequis** | Lot 5 |
| **Effort** | 3 jours |

**Contenu**
- Layout 3 colonnes : fil d'Ariane + contexte / cartes du niveau courant / panier « Mon plan ».
- Fonction de sélection et de scoring déterministe côté serveur (Server Component + fonction pure testée).
- Persistance de session à chaque choix.
- Retour arrière, reprise de parcours.
- États vides avec CTA d'enrichissement.

**Agents**

| Sous-tâche | Agent | Modèle | Skills |
|---|---|---|---|
| Fonction de scoring et de sélection (pure, testée) | **Codex** | raisonnement élevé | Spec + tests fournis en entrée |
| Intégration Next 15 / Server Components / UI | **Claude Code** | raisonnement élevé | `frontend-design`, `engineering:testing-strategy` |

**Points de vigilance**
- Le scoring doit être une **fonction pure isolée et testée unitairement**, pas de la logique dispersée dans les composants. C'est elle qu'on ajustera pendant des mois.
- Server Components pour le chargement, Client Components uniquement pour l'interaction du panier.
- Pas de `useEffect` de chargement en cascade — c'est le piège classique qui tue le budget de 1 s.
- Vérifier en fin de lot qu'aucune ligne n'a été créée dans `ai_intelligence_runs` pendant un parcours complet (preuve de R2).
- Limiter strictement à 5 cartes par niveau.

**Definition of Done**
- Parcours complet E1→E5 sur 3 comptes pilotes.
- P95 < 1 s mesuré.
- Tests unitaires du scoring, ≥ 8 cas dont les cas limites (0 angle, angles à égalité, angle expiré).
- **Handoff L6→L7 rédigé.**

---

## LOT 7 — Parcours Mobile

| | |
|---|---|
| **Objectif** | Le parcours séquentiel et le mode consultation. |
| **Prérequis** | Lot 6 |
| **Effort** | 2 jours |

**Contenu**
- Écran unique séquentiel, une décision par écran.
- Bottom sheet « Mon plan » persistant.
- Détection d'appareil côté serveur et distribution du sous-composant approprié.
- **Mode consultation prioritaire** : si un plan existe pour ce contact, on l'ouvre directement.

**Agent : Claude Code**, standard, skills `frontend-design`, `design:accessibility-review`, `modern-web-guidance`.

**Points de vigilance**
- **Interdiction absolue de `hidden md:block`.** Deux composants, distribution serveur. C'est la règle d'or du projet et le lot où elle est le plus tentante à contourner.
- Le cas d'usage mobile réel : le commercial dans sa voiture 10 minutes avant le RDV. Il **consulte**, il ne construit pas. D'où le mode consultation prioritaire — c'est la fonctionnalité mobile la plus utile, pas le parcours.
- Test sur appareil réel, pas seulement en devtools.
- Aucun tableau, aucun graphique, aucune ombre.

**Definition of Done**
- Parcours complet réalisable au pouce sur 375px.
- Aucun défilement horizontal, toutes cibles ≥ 44px.
- Mode consultation vérifié.
- **Handoff L7→L8 rédigé.**

---

## LOT 8 — Sorties & bouclage CRM

| | |
|---|---|
| **Objectif** | Transformer le plan en action réelle. **C'est le lot qui justifie la feature.** |
| **Prérequis** | Lot 6 (Lot 7 non bloquant) |
| **Effort** | 2 jours |

**Contenu**
- Plan → `account_roadmap_actions` (**la table est vide depuis la conception ; ce lot la remplit enfin**).
- Matérialisation : `materialized_task_id`, `materialized_opportunity_id`, `materialized_calendar_event_id`.
- Export du plan (markdown / impression).
- Déclenchement d'INTEL-020 avec les angles retenus injectés dans le contexte du prompt.

**Agent : Claude Code**, raisonnement élevé. MCP Supabase. Lecture obligatoire de `INTEL-020-REDACTION-ASSISTEE-V1.md` avant écriture.

**Points de vigilance**
- **Ne pas reconstruire INTEL-020.** On l'appelle avec un contexte enrichi. 87 runs prouvent qu'il fonctionne.
- Respecter les statuts existants de `account_roadmap_actions` : `draft | validated | dismissed | materialized | done`. Ne pas en inventer.
- Validation humaine obligatoire avant matérialisation — règle déjà actée dans la cartographie n8n pour tout livrable commercial.
- La matérialisation doit être idempotente : re-valider un plan ne doit pas créer de doublons de tâches.

**Definition of Done**
- Un plan produit ≥ 1 ligne `account_roadmap_actions` **et** ≥ 1 ligne `tasks`.
- Un message INTEL-020 généré depuis le plan cite au moins un angle retenu.
- **Handoff L8→L9 rédigé.**

---

## LOT 9 — Instrumentation & recette

| | |
|---|---|
| **Objectif** | Rendre la feature mesurable et la valider. |
| **Prérequis** | Lots 6, 7, 8 |
| **Effort** | 1 jour |

**Contenu**
- Événements minimaux : parcours ouvert, perspective choisie, angle épinglé, angle ignoré, plan exporté, action matérialisée.
- Vue d'analyse : quels angles sont retenus, lesquels ne le sont jamais.
- Recette complète contre les critères A.8.

**Agent : Claude Code**, standard, skills `product-tracking-skills:product-tracking-design-tracking-plan`, `engineering:code-review`.

**Points de vigilance**
- **C'est le lot le plus facile à sacrifier et le plus coûteux à sacrifier.** Sans lui, le scoring restera une heuristique aveugle pour toujours. Les données de choix collectées ici sont le seul chemin vers un scoring qui s'améliore.
- Instrumentation locale (Supabase), pas d'outil externe. On mesure pour apprendre, pas pour reporter.

**Definition of Done**
- Les 9 critères de A.8 passent.
- Une requête donne le taux d'épinglage par `angle_type`.
- **Handoff de clôture rédigé** avec le backlog V1.5 priorisé.

---

## B.10 — Récapitulatif

| Lot | Objet | Agent principal | Modèle | Effort | Bloquant pour |
|---|---|---|---|---|---|
| 0 | Gel du périmètre | — | — | 1 h | tout |
| 1 | Référentiel Persona | Claude Code + Gemini | élevé / Pro | 1,5 j | 2, 3 |
| 2 | Enrichissement pilote | Claude (chat + MCP) | élevé | 2 j | 4 |
| 3 | Schéma Angle | Claude Code | élevé | 1 j | 4 |
| 4 | Matérialisation | Codex → Claude Code | élevé | 3 j | 5 |
| 5 | Carte d'Angle | Claude Code | standard | 1,5 j | 6 |
| 6 | Parcours Desktop | Codex + Claude Code | élevé | 3 j | 7, 8 |
| 7 | Parcours Mobile | Claude Code | standard | 2 j | — |
| 8 | Sorties & CRM | Claude Code | élevé | 2 j | 9 |
| 9 | Instrumentation | Claude Code | standard | 1 j | — |

**Total : ~17 jours-homme.** À rythme solo réaliste avec le reste du projet en parallèle : **6 à 8 semaines calendaires**.

**Chemin critique : 0 → 1 → 3 → 4 → 5 → 6 → 8.** Les lots 2, 7 et 9 sont parallélisables ou décalables sans bloquer la chaîne — mais le lot 2 conditionne la **qualité** du lot 4, pas son exécution.

**Trois jalons de démonstration**
- **J1 (fin lot 5)** — « la carte » : montrable, c'est déjà 60 % de l'effet démonstratif.
- **J2 (fin lot 6)** — « le parcours desktop » : la feature est réelle.
- **J3 (fin lot 8)** — « la boucle » : la feature est utile.

---

# PARTIE C — PROTOCOLE DE HANDOFF OBLIGATOIRE

## C.1 — La règle

> **Aucun lot ne démarre sans le handoff du lot précédent. Aucun lot n'est clos sans avoir produit le sien.**
> Le handoff est un livrable du lot, au même titre que le code. Un lot sans handoff est un lot non terminé.

**Emplacement :** `docs/playbook/handoffs/HANDOFF_L{n}_to_L{n+1}.md`, commité avec le code du lot.

## C.2 — Pourquoi c'est non négociable ici

Trois agents différents, des sessions séparées de plusieurs jours, aucune mémoire partagée entre eux. Sans handoff, chaque reprise coûte 30 à 60 minutes de re-découverte, et surtout produit des **décisions contradictoires** entre lots — le mode d'échec classique du développement multi-agent.

## C.3 — Template obligatoire

```markdown
# HANDOFF — Lot {n} → Lot {n+1}
**Date :** {date}
**Agent sortant :** {Claude Code | Codex | Gemini} — modèle {x}
**Agent entrant recommandé :** {…} — modèle {…}
**Skills/MCP à charger :** {…}

## 1. État vérifié (pas déclaré — vérifié)
Requêtes exécutées et résultats :
```sql
-- requête de contrôle 1 → résultat
```
Fichiers créés ou modifiés (chemins exacts) :

## 2. Ce qui a été fait
{liste factuelle}

## 3. Ce qui N'A PAS été fait (et pourquoi)
{le plus important de tout le document}

## 4. Décisions prises, avec justification
| Décision | Alternative écartée | Pourquoi |

## 5. Pièges rencontrés
{bugs, comportements inattendus, contournements}

## 6. Contrat d'entrée du lot suivant
- Prérequis vérifiables : {…}
- Interfaces/types/props figés : {…}
- Ce qu'il est INTERDIT de modifier : {…}

## 7. Commandes de vérification
{à exécuter par l'agent entrant AVANT de coder}

## 8. Règles invariantes rappelées
R1 (source datée) · R2 (aucun LLM en navigation) · R6 (pas de graceful degradation)
```

## C.4 — Règles d'usage

1. **L'agent entrant re-vérifie l'état avant de coder.** Le handoff oriente, il ne fait pas foi. La base ou le dépôt ont pu bouger entre-temps.
2. **La section 3 (« ce qui n'a pas été fait ») est la plus importante.** C'est celle qui évite qu'un agent reconstruise ce qui existe ou suppose fait ce qui ne l'est pas.
3. **Les règles invariantes sont rappelées à chaque handoff.** Répétition volontaire : elles se perdent en 3 sessions sinon.
4. **Un handoff ne dépasse pas 2 pages.** Au-delà, il n'est pas lu.
5. **Handoff rédigé par l'agent sortant, relu par Dosta avant clôture du lot.** Cette relecture est le point de contrôle qualité le moins coûteux du dispositif.

## C.5 — CLAUDE.md

`CLAUDE.md` à la racine est mis à jour à chaque fin de lot avec **3 lignes maximum** : lot en cours, dernier handoff, règle invariante la plus menacée. C'est le contexte que tout agent lit en premier.

---

# PARTIE D — RISQUES DE PROJET

| Risque | Probabilité | Traitement |
|---|---|---|
| **Le lot 2 (enrichissement) est bâclé** parce qu'il ne produit pas de code visible | **Élevée** | Objectif chiffré et vérifiable par requête. Jalon bloquant avant le lot 4. |
| **R1 violée en silence** par le prompt de génération | Élevée | Contrainte CHECK en base (lot 3) + revue manuelle de 20 angles (lot 4) |
| **Dérive de périmètre** vers d'autres intentions pendant le lot 6 | Élevée | La Partie A est un contrat. Tout ajout va au backlog V1.5, sans discussion. |
| **Le lot 9 est sacrifié** faute de temps | Moyenne | Le placer avant le lot 7 si le calendrier glisse. Mobile différable, instrumentation non. |
| **Un agent ignore le handoff** et refait ou casse | Moyenne | Section 7 « commandes de vérification » obligatoire, exécutée avant écriture |
| **Conflit avec CORE-001/004** en cours | Faible | Le lot 4b peut être livré sans CORE-004 (appel direct + log manuel), décision réversible |
| **Renommage tardif** Playbook → Angle | Faible si lot 0 tranché | C'est précisément l'objet du lot 0 |

---

*Document produit le 17 août 2026. Les chiffres de couverture (28 comptes avec le trio, 8 avec issues, 162 signaux vivants, 11 documents `ready`, 0 ligne dans `account_roadmap_actions`) sont issus de requêtes exécutées ce jour sur `jvzgmhvwirsbdkjpmvla` et sont datés.*
