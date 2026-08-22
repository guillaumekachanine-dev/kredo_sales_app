# KREDO — Dynamic Playbooks
## Note de cadrage — Battle Cards interactives + génération de contenu

**Version :** 1.0  
**Date :** 23 août 2026  
**Statut :** cadrage de référence avant implémentation  
**Baseline repo :** `2464e0c9f927db8817dacd938d08b14450347589`  
**Dossier :** `docs/FEATURES/DYNAMIC_PLAYBOOKS/`

> Cette note devient la référence fonctionnelle et architecturale du chantier « Battle Cards interactives + génération de contenu ». Les documents plus anciens présents dans ce dossier restent utiles comme historique de réflexion, mais sont **superseded lorsqu'ils contredisent ce cadrage**.

---

# 1. Objet du chantier

Transformer la section actuelle **Battle Cards** du Playbook commercial en un **mode à part entière**, accessible depuis la modale Playbook par un retournement visuel fluide, permettant à un commercial ESN de :

1. sélectionner un compte du segment actif ;
2. **réviser** rapidement sa Battle Card sous une forme opérationnelle ;
3. décrire une **situation commerciale** à partir de paramètres structurés ;
4. générer un pitch adapté à cette situation via le moteur de rédaction assistée existant ;
5. retrouver automatiquement le livrable généré dans **Rapports & rédaction** ;
6. revenir au Playbook sans perdre le contexte du segment courant.

La feature ne crée pas un nouveau cerveau IA. Elle constitue une **interface métier spécialisée** branchée sur les projections Business Intelligence et sur le moteur INTEL-020 existant.

---

# 2. Problème métier adressé

Le Playbook actuel fournit de la connaissance commerciale : enjeux, personas, angles, objections, ROI, timing et Battle Cards. Cette connaissance reste toutefois principalement consultative.

Le besoin terrain est différent :

> « Pour ce compte, avec cet interlocuteur, sur cet enjeu, maintenant, face à cette objection et avec cette offre, qu'est-ce que je dois réellement dire ? »

La nouvelle expérience doit donc relier :

`CONNAISSANCE → SITUATION → DISCOURS`

et réduire le temps de préparation avant un appel, un premier rendez-vous ou une relance commerciale.

---

# 3. Valeur utilisateur attendue

## 3.1 Usage principal

Préparer une interaction commerciale en quelques minutes, sans devoir recomposer mentalement toutes les informations dispersées dans le Playbook, la cartographie concurrentielle, le CRM et le catalogue d'offres.

## 3.2 Moments d'usage

- juste avant un appel ;
- préparation d'un premier rendez-vous ;
- préparation d'une relance ;
- préparation d'un discours face à une objection ;
- préparation d'un angle de cross-sell ;
- remise en mémoire rapide d'un compte déjà étudié.

## 3.3 North Star V1

Un utilisateur doit pouvoir produire un pitch exploitable avec **4 décisions métier minimum** :

1. interlocuteur / persona ;
2. enjeu ;
3. angle ;
4. offre ;

puis enrichir facultativement la situation avec :

- timing ;
- objection ;
- contexte Knowledge.

La V1 ne doit pas devenir un formulaire administratif.

---

# 4. Baseline technique constatée

Le chantier part d'un socle déjà largement disponible.

## 4.1 Playbook Business Intelligence

Composant principal actuel :

`src/features/business-intelligence/playbooks/SectorPlaybooksModal.tsx`

Les sections existantes sont :

- Enjeux ;
- Personas ;
- Angles d'approche ;
- Objections ;
- ROI & offres ;
- Pourquoi maintenant ;
- Battle Cards.

Le Playbook consomme le contexte **mono-segment** de Business Intelligence. Le segment actif doit rester celui du workspace courant ; aucun picker local de segment ne doit être réintroduit.

## 4.2 Battle Cards actuelles

Composant :

`src/features/business-intelligence/playbooks/BattleCardsSection.tsx`

Le composant dispose déjà de :

- la liste des acteurs/comptes ;
- `companyId` pour chaque acteur ;
- catégorie ;
- scores d'appétence et d'accessibilité ;
- positionnement ;
- forces ;
- vulnérabilités ;
- angle d'entrée ;
- `profile_json` projeté vers des détails structurés ;
- triggers ;
- traduction commerciale ;
- organisation SI / couche ESN ;
- lignes rouges ;
- chantiers technologiques ;
- inconnues à qualifier.

La base Supabase live contient actuellement des `competitive_map_entries` et la majorité des entrées disposent d'un `profile_json` exploitable. Une Battle Card sans profil exploitable doit afficher un état vide explicite ; elle ne doit jamais inventer du contenu.

## 4.3 Rédaction assistée / INTEL-020

Le moteur existant repose sur :

- `src/components/communication/CommunicationComposerHost.tsx` ;
- `src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx` ;
- `src/lib/communication/communication-purpose.ts` ;
- `src/lib/communication/communication-scenario-registry.ts` ;
- `src/lib/n8n/types.ts` ;
- `n8n/workflows/intel-020-communication.json` ;
- `n8n/workflows/intel-020-communication.SETUP.md`.

INTEL-020 sait déjà produire :

- `written_message` ;
- `spoken_pitch` ;
- `structured_briefing`.

Il possède déjà plusieurs scénarios commerciaux de pitch et utilise le pattern canonique :

`trigger → runId → n8n → callback → ai_intelligence_results → document`

## 4.4 Bibliothèque documentaire

Le callback n8n et `save-as-document.ts` savent déjà transformer les résultats éligibles en `intelligence_documents`.

Le type `commercial_pitch` existe déjà dans le référentiel documentaire.

Conséquence : **aucun nouveau système de sauvegarde documentaire n'est nécessaire** pour cette feature.

## 4.5 Knowledge / contexte additionnel

`CommunicationBriefForm` sait déjà sélectionner des listes personnelles (`content_collections`) et ouvrir :

- `ManageCollectionsDesktop` ;
- `ManageCollectionsMobile`.

La feature doit réutiliser cette mécanique plutôt que créer une nouvelle gestion des sources.

---

# 5. Décisions d'architecture — invariants

Ces décisions sont considérées comme figées pour la V1, sauf découverte technique factuelle bloquante.

## D1 — Pas de nouvelle table Battle Cards

Les Battle Cards restent une **projection** des données existantes, principalement :

- `competitive_map_entries` ;
- `profile_json` ;
- données du workspace Business Intelligence.

Aucune table `battle_cards` ou équivalent.

## D2 — Pas de nouveau workflow n8n

La génération utilise exclusivement :

`intel-020-communication`

Une extension du scénario/prompt INTEL-020 est autorisée ; la duplication du workflow ne l'est pas.

## D3 — Pas de nouveau moteur de rédaction

La feature construit un `CommunicationBrief` compatible avec INTEL-020.

## D4 — Pas de migration Supabase prévue

La V1 doit fonctionner avec les structures existantes :

- `ai_intelligence_runs` ;
- `ai_intelligence_results` ;
- `intelligence_documents` ;
- `intelligence_document_versions` ;
- `intelligence_document_links` ;
- `competitive_map_entries` ;
- `content_collections` ;
- `content_collection_items`.

Une migration ne peut être introduite qu'après démonstration qu'un besoin ne peut pas être porté dans les JSON/contracts existants.

## D5 — Le segment BI reste la source de vérité

Le mode Battle Cards reçoit le segment courant du `BusinessIntelligenceSegmentWorkspace`.

Interdit :

- deuxième `activeSegment` ;
- localStorage ;
- Zustand BI ;
- picker segment local ;
- fallback vers un autre segment.

## D6 — Le compte sélectionné reste une vraie entité CRM

Chaque acteur sélectionné utilise son `companyId` existant afin de charger les contacts, offres et contextes INTEL-020 nécessaires.

## D7 — Le résultat est automatiquement documenté

Le pitch généré doit suivre le pipeline documentaire existant. L'UI affiche donc un statut de sauvegarde et un CTA « Ouvrir dans Rapports », plutôt qu'un second mécanisme de sauvegarde.

## D8 — L'UI spécialisée ne duplique pas `CommunicationBriefForm`

Le mode Situation possède une interface métier propre, mais construit le **même contrat de brief** et utilise les mêmes primitives de résolution lorsque pertinent.

## D9 — Desktop et Mobile sont distincts

Desktop = analyse + comparaison + configuration dense.  
Mobile = action rapide + sélection tactile + résultat immédiatement exploitable.

Aucun composant Desktop lourd ne doit être monté puis masqué par CSS sur Mobile.

---

# 6. Périmètre fonctionnel V1

## 6.1 Entrée Battle Cards

Dans le Playbook, Battle Cards ne doit plus être traité comme une simple section au même niveau que « Enjeux » ou « Objections ».

Il devient une **entrée de mode**.

Action :

`Playbook → Battle Cards → animation de retournement → Battle Workspace`

Une action permanente :

`← Revenir au Playbook`

réalise le retournement inverse.

## 6.2 Navigation du Battle Workspace

### Desktop

Colonne gauche : comptes/acteurs du segment courant.

Zone principale :

- onglet `Révision` ;
- onglet `Situation`.

### Mobile

Pas de colonne gauche Desktop réduite.

Le compte est sélectionné via un picker/drawer tactile puis l'utilisateur bascule entre :

- `Révision` ;
- `Situation`.

---

# 7. Mode Révision

Le mode Révision reprend les données actuelles de `BattleCardsSection` sans créer de nouvelles sources.

Objectif : transformer la fiche actuelle, encore proche d'un rapport, en fiche de préparation visuelle.

Sections recommandées :

- **Pourquoi maintenant** — triggers ;
- **Angle d'entrée** — angle et accroches ;
- **À qui parler** — organisation SI / interlocuteurs ;
- **Objections / lignes rouges** ;
- **Chantiers observés** ;
- **Forces / vulnérabilités** ;
- **À qualifier** — inconnues.

Règles UI :

- bullets courts ;
- sections très identifiables ;
- iconographie distinctive ;
- aucune densité textuelle de type rapport ;
- ne jamais transformer chaque bloc en Card si un simple rail, séparateur ou groupe de bullets suffit ;
- provenance et incertitude conservées lorsqu'elles sont disponibles.

---

# 8. Mode Situation

## 8.1 Paramètres

Le configurateur expose six dimensions.

### Persona / interlocuteur — obligatoire

Priorité : contact CRM réel du compte.

Afficher si possible :

`Nom du contact · fonction · persona`

Fallback : persona Playbook si aucun contact précis n'est sélectionnable.

### Enjeu — obligatoire

Sources possibles :

1. enjeu spécifique compte lorsqu'il existe ;
2. enjeux sectoriels `knowledge.painPoints`.

L'UI doit distinguer visuellement :

- `COMPTE` ;
- `SECTEUR`.

Un enjeu sectoriel ne doit jamais être présenté comme un fait spécifique au compte.

### Angle d'approche — obligatoire

Sources :

- `actor.angleEntree` ;
- traduction commerciale du `profile_json` ;
- angles du Playbook.

### Timing — facultatif

Sources :

- triggers compte ;
- réglementation ;
- événements sectoriels/commerciaux pertinents.

### Objection — facultatif

Source principale : objections du Playbook.

### Offre & ROI — offre obligatoire, ROI facultatif

Source offre : catalogue KREDO existant.  
Source ROI : arguments ROI du Playbook et éléments factuels disponibles.

Aucun ROI chiffré ne doit être inventé.

## 8.2 Contexte Knowledge — facultatif

Action :

`+ Ajouter du contexte`

Réutiliser les listes personnelles / collections déjà supportées par INTEL-020.

Le parcours recommandé est :

- sélection rapide de listes directement dans Situation ;
- bouton « Gérer la connaissance » pour ouvrir le gestionnaire complet ;
- retour à Situation avec la sélection conservée.

## 8.3 Résumé de situation

Avant génération, l'UI doit produire une phrase lisible résumant la configuration :

> « DSI · modernisation SI · angle cloud souverain · avant échéance NIS2 · objection fournisseurs en place · offre Cloud Assessment »

Ce résumé ne remplace pas le brief structuré ; il améliore la compréhension humaine.

---

# 9. Contrat de génération

## 9.1 Scénario recommandé

Ajouter un scénario INTEL-020 dédié :

`battle_situation_pitch`

Il reste traité par :

`intel-020-communication`

Configuration cible :

- `scope: account` ;
- `outputKind: spoken_pitch` ;
- catégorie commerciale dérivée du contexte compte ;
- `offerRef` obligatoire ;
- longueur par défaut courte/standard ;
- aucun envoi automatique.

## 9.2 Extension légère du brief

Le besoin spécifique peut être porté par un objet optionnel dans le contexte du brief, sans nouvelle colonne SQL :

```ts
battleSituation?: {
  competitiveEntryId?: string
  issue?: {
    id?: string
    label: string
    source: "account" | "sector"
  }
  angle?: string
  timing?: string
  objection?: string
  roiArgument?: string
}
```

Les informations déjà canoniques restent dans leurs champs existants :

- `contactId` / persona ;
- `offerRef` ;
- `preferredCollectionIds` ;
- tone ;
- length ;
- language ;
- formality.

Le nouveau bloc ne doit pas dupliquer ces champs.

## 9.3 Prompt

Le nœud `Assemble Prompt` du workflow existant doit disposer d'une mission explicite pour `battle_situation_pitch` :

- respecter d'abord les choix structurés de Situation ;
- utiliser le contexte compte/secteur comme grounding, pas comme catalogue à réciter ;
- intégrer naturellement le timing et l'objection lorsqu'ils existent ;
- faire le lien avec l'offre sélectionnée ;
- ne jamais inventer un chiffre ou un ROI ;
- produire un pitch oral directement exploitable.

---

# 10. Restitution du résultat

Après génération, le résultat s'affiche dans la même modale, sur une surface claire distincte visuellement du cockpit.

La restitution doit laisser accessible :

- le compte actif ;
- l'action « Revenir au Playbook » ;
- l'action « Modifier la situation ».

Actions V1 :

- Copier ;
- Régénérer ;
- Modifier la situation ;
- Ouvrir dans Rapports.

Le document est créé par le pipeline documentaire existant. Aucun second bouton de sauvegarde n'est nécessaire sauf découverte d'un écart réel lors du Lot d'intégration.

---

# 11. Animation de retournement

Le retournement est une transition de mode, pas un nouveau shell de modale.

Shell à préserver :

`src/components/intelligence/IntelligenceSplitModalShell.tsx`

Recommandation :

1. animation `rotateY(0 → 90deg)` ;
2. swap du contenu au point médian ;
3. animation `rotateY(90deg → 0)`.

Cela évite de maintenir simultanément deux arbres React lourds dos à dos.

Contraintes :

- 280 à 340 ms cible ;
- pas de nouvelle dépendance animation ;
- `prefers-reduced-motion` → fondu simple ;
- focus clavier et Escape doivent rester conformes au shell existant.

---

# 12. Architecture de composants cible

Structure indicative, à adapter après audit de code du Lot 0 :

```text
SectorPlaybooksModal
│
├── PlaybookMode
│   └── sections existantes
│
└── BattleCardsWorkspace
    ├── Desktop
    │   ├── BattleAccountRail
    │   ├── BattleModeSwitcher
    │   ├── BattleRevisionView
    │   ├── BattleSituationView
    │   └── BattlePitchResult
    │
    └── Mobile
        ├── BattleAccountPicker
        ├── BattleModeSwitcherMobile
        ├── BattleRevisionMobile
        ├── BattleSituationMobile
        └── BattlePitchResultMobile
```

Les noms sont des cibles de conception, pas une obligation de créer un fichier par bloc. Éviter les composants artificiels de quelques lignes sans valeur de réutilisation.

---

# 13. Data loading

## 13.1 Données Battle Card

Réutiliser les données déjà fournies par `BusinessIntelligenceSegmentWorkspace` et les `CompetitiveMapActor`.

Ne pas refaire des requêtes Supabase côté client pour les informations déjà présentes.

## 13.2 Données spécifiques au compte sélectionné

Lazy-load uniquement lorsque nécessaire :

- contacts ;
- contexte de communication ;
- offres pertinentes ;
- références CRM nécessaires à INTEL-020.

Ne jamais charger le contexte complet de tous les comptes du segment pour alimenter Situation.

## 13.3 Sources de vérité

| Besoin | Source |
|---|---|
| comptes Battle Cards | `competitive_map_entries` / workspace BI |
| détails Battle Card | `profile_json` + projections actor |
| enjeux sectoriels | `SectorKnowledgeReadModel` |
| personas / objections / angles / ROI | Playbook sectoriel résolu |
| contacts | CRM compte |
| offres | catalogue `offers` / `offer_practices` |
| contexte additionnel | `content_collections` |
| génération | INTEL-020 |
| livrable | `ai_intelligence_results` → `intelligence_documents` |

---

# 14. Périmètre OUT V1

Ne pas introduire dans ce chantier :

- nouvelle table `battle_cards` ;
- nouvelle table de sessions Battle Cards ;
- nouveau moteur de scoring ;
- génération automatique au simple changement de paramètre ;
- chat conversationnel ;
- envoi automatique email/LinkedIn ;
- séquence de prospection multi-canal ;
- apprentissage automatique sur les pitchs ;
- nouvelle taxonomie persona ;
- nouveau catalogue d'offres ;
- nouveau système de versions documentaire ;
- nouveau workflow n8n ;
- refonte générale du Playbook hors besoins de ce mode ;
- refonte de Business Intelligence ;
- nettoyage opportuniste de code historique.

---

# 15. Gouvernance multi-agents IA

Plusieurs agents IA peuvent intervenir, mais **un seul agent doit posséder un lot d'écriture à la fois**.

## 15.1 Règles communes obligatoires

Avant toute modification, chaque agent doit :

1. lire `AGENTS.md` ;
2. lire les sections pertinentes de `CLAUDE.md` ;
3. lire cette note ;
4. lire `01-ROADMAP-MULTI-AGENTS.md` ;
5. inspecter les fichiers qu'il va modifier ;
6. vérifier l'état réel du repo au moment de son intervention ;
7. ne jamais travailler à partir d'une copie mentale d'un handoff ancien.

`CLAUDE.md` et `AGENTS.md` restent les autorités pour les conventions techniques du repo.

## 15.2 Un agent = un périmètre de fichiers explicite

Chaque lot doit définir :

- fichiers autorisés ;
- fichiers interdits ;
- dépendances ;
- tests obligatoires ;
- résultat attendu ;
- handoff de sortie.

Un agent ne doit pas corriger une anomalie hors scope sans l'inscrire dans son handoff.

## 15.3 Pas d'écritures parallèles sur les mêmes zones

En particulier, ne pas faire travailler simultanément deux agents sur :

- `SectorPlaybooksModal.tsx` ;
- `BattleCardsSection.tsx` / nouveaux composants Battle ;
- `src/lib/n8n/types.ts` ;
- `communication-scenario-registry.ts` ;
- `intel-020-communication.json`.

## 15.4 Handoff obligatoire

Chaque lot se termine par un document ou commentaire structuré indiquant :

- objectif ;
- fichiers modifiés ;
- décisions prises ;
- écarts avec le cadrage ;
- tests exécutés ;
- résultats ;
- dette / warnings ;
- commit SHA si commit réalisé ;
- instructions précises pour l'agent suivant.

## 15.5 Agent de revue indépendant

Les lots touchant INTEL-020 ou n8n doivent être revus par un agent différent de celui qui les a écrits.

Le reviewer vérifie notamment :

- absence de nouveau workflow ;
- absence de second contrat métier concurrent ;
- synchronisation front ↔ workflow ;
- non-régression des autres scénarios INTEL-020 ;
- persistence documentaire ;
- HMAC/callback inchangés sauf nécessité démontrée.

---

# 16. Règles repo à rappeler à tous les agents

Selon `AGENTS.md` actuel :

- lire les guides Next.js locaux si une API Next est touchée ;
- composants/visualisations maison selon les règles du repo ;
- Tailwind v4, pas de `tailwind.config.*` ;
- pas de HEX ajouté en dur dans le JSX ;
- aucune `SUPABASE_SERVICE_ROLE_KEY` exposée côté client ;
- workflows n8n versionnés dans `n8n/workflows/` ;
- import/activation n8n sur le VPS réalisés manuellement par Guillaume ;
- tout nœud Code n8n modifié doit être validé syntaxiquement et réellement sur mocks.

Ordre de validation canonique :

```bash
npm run typecheck
npm test
npm run check:server-boundary
npm run lint
npm run build
```

---

# 17. Critères de succès V1

La feature est considérée terminée lorsque :

- [ ] Battle Cards n'est plus une simple section du rail Playbook ;
- [ ] l'entrée Battle Cards déclenche une transition de retournement fluide ;
- [ ] le retour Playbook effectue la transition inverse ;
- [ ] le compte actif reste dans le segment courant ;
- [ ] Révision restitue les données actuelles sans invention ;
- [ ] Situation propose persona, enjeu, angle, timing, objection, offre/ROI ;
- [ ] persona, enjeu, angle et offre permettent de générer sans remplir tous les champs facultatifs ;
- [ ] le contexte Knowledge existant peut être ajouté ;
- [ ] `battle_situation_pitch` utilise le workflow `intel-020-communication` ;
- [ ] aucun nouveau workflow n8n n'est créé ;
- [ ] aucune nouvelle table métier n'est créée ;
- [ ] le résultat apparaît dans la modale ;
- [ ] le résultat devient un document consultable dans Rapports & rédaction ;
- [ ] Desktop et Mobile possèdent des rendus adaptés ;
- [ ] `prefers-reduced-motion` est respecté ;
- [ ] les validations repo sont vertes ;
- [ ] un test manuel E2E est réalisé sur au moins deux comptes : un profil Battle Card riche et un profil incomplet.

---

# 18. Risques principaux

## R1 — Formulaire trop lourd

**Réponse :** 4 paramètres obligatoires maximum ; timing, objection et contexte restent facultatifs.

## R2 — Confusion compte / secteur

**Réponse :** provenance visible `COMPTE` / `SECTEUR` pour les enjeux et les éléments ambigus.

## R3 — Duplication INTEL-020

**Réponse :** UI spécialisée, contrat et workflow canoniques réutilisés.

## R4 — Double modale / focus trap

**Réponse :** privilégier un picker léger dans Situation ; ouvrir le gestionnaire Knowledge complet uniquement à la demande et tester explicitement le retour de focus.

## R5 — Deux agents écrivent le même contrat

**Réponse :** ownership strict par lot + handoff + revue indépendante.

## R6 — Ancienne documentation contradictoire

**Réponse :** cette note et la roadmap associée sont les références du chantier courant. Les anciens documents sont historiques lorsqu'ils décrivent une architecture différente (`playbook_angles`, sessions dédiées, etc.).

---

# 19. Décision de go

Le chantier est **GO** sous la forme suivante :

> **Refonte UX Battle Cards + configurateur Situation + extension légère d'INTEL-020, sans nouvelle persistence métier ni nouveau workflow.**

La roadmap d'exécution multi-agents est définie dans :

`docs/FEATURES/DYNAMIC_PLAYBOOKS/01-ROADMAP-MULTI-AGENTS.md`
