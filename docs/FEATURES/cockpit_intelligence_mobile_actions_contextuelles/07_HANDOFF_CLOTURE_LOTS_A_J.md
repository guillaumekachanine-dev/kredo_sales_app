# Cockpit Intelligence — Handoff de clôture (Lots A → J)

**Date :** 09/09/2026
**Statut :** QA visuelle faite et validée par Guillaume. Le chantier de
raccordement est **fonctionnellement clos**, à l'exception de 2 modules non
cadrés (§5).
**Auteur :** Claude Code, sur mandat de Guillaume Kasanin.

Ce document **remplace `05_HANDOFF_RACCORDEMENT.md`** comme photographie de
l'état réel. Le 05 racontait un état intermédiaire (Lots A→H, 4 décisions
encore ouvertes) ; ce 07 raconte l'état final, après que les 4 décisions ont
été tranchées (Lot I) et qu'un dernier lot (J) a fermé l'avant-dernière case
de la matrice. Le 05 reste en place comme historique du raisonnement, mais ne
plus s'y fier pour un état des lieux.

---

## 0. Comment lire ce document

Chaque affirmation ci-dessous a été **revérifiée sur le fichier réel** le
09/09/2026, pas recopiée de mémoire des tours précédents — nécessaire parce
que ce dépôt est travaillé en parallèle par d'autres sessions (voir §7). Si tu
reprends ce chantier plus tard et que quelque chose ici ne correspond plus au
code, c'est le signal que quelque chose a changé depuis : relance l'audit de
la section 2 plutôt que de faire confiance à ce tableau.

---

## 1. Ce qui a été fait — dix lots

| Lot | Contenu |
|---|---|
| **A** | Assainissement du registre. Suppression de 6 entrées `coming_soon` hors matrice cible, ajout de `review_account`, invariant « aucune action active sans handler ». Suppression du dossier fantôme `api/reports/technical/generate 2/`. |
| **B** | Socle Modules. `CockpitModule` porte un `kind` déclaratif (`route` / `launcher`, puis `command` au Lot J). Fin du `module.id === "financial_modeling"` en dur. Correction d'un bug réel : `current` n'était calculé que sur `href`, désactivant une carte. |
| **C** | Adaptateurs mutualisés INTEL-020 (3 actions) et `manual_custom` V2 (2 actions), plus un hôte global `WatchAnalysisComposerHost`. |
| **D** | Composeur de matching (« Matcher les profils ») — le choix du besoin manquait en mode Page. |
| **E** | Runway des engagements (« Anticiper les échéances »). Consolidation 30/60/90j, jamais de montant projeté. |
| **F** | Intelligence Automatisations : 3 actions sur un seul corpus (erreurs, coûts, corrections priorisées). |
| **G** | Compétences VS Besoins. **A mis au jour et corrigé un bug de production réel** (§3). |
| **H** | Modules autoportants : Gestion des sources, Simuler la cadence, Agenda light (capacité neuve). |
| **I** | Application des 4 décisions produit laissées ouvertes par le 05 : 7 missions passées actives, doublon `mission_activation_portefeuille` fusionné, modules Bibliothèque / Gestion de la connaissance / Métriques activité créés (deux erreurs d'analyse du 05 corrigées au passage — ces deux derniers n'étaient pas des doublons de raccourcis, et le troisième n'avait pas besoin d'un chargeur mais d'un pré-filtre). |
| **J** | Atlas du portefeuille (correction d'une estimation du Lot H — le dialog n'était pas desktop-only) et module Rapports (nouveau `kind: "command"` — c'est le drawer de génération, pas une navigation). |

*(hors lots)* Ajustement graphique des cartes du Cockpit (icône agrandie, titre sous l'image), direction esthétique inchangée.

**Validation au 09/09/2026, revérifiée à la rédaction de ce document :**

```
typecheck             : OK (après purge de .next — le piège documenté CLAUDE.md)
test                  : 274 fichiers / 2734 tests passés
check:server-boundary : OK
```

> Ces compteurs sont supérieurs à ceux du Lot J (253/2540) — du travail sans
> rapport avec ce chantier (consultants, cockpit mobile home hero) a été
> commité entre-temps. Aucun de mes fichiers n'a été touché, vérifié ligne à
> ligne (§7).

---

## 2. Matrice actuelle — vérifiée sur le fichier réel

Source : `src/lib/intelligence/intelligence-registry.ts` (840 lignes), relu
intégralement le 09/09/2026.

### Actions par page

| Page | Actions actives |
|---|---|
| Cockpit | Priorités, Brief hebdo, Insights pipeline, **Activation portefeuille** |
| Agenda | Préparer la journée, **Préparer un RDV**, **Anticiper les échéances**, Priorités, Brief hebdo |
| Business Intelligence | **Analyse à la demande** |
| Veille & Actualités | Analyse mensuelle de la veille, **Analyse transverse** |
| Prospection Intelligence | **Activation portefeuille**, **Revue de compte client** · `Créer une campagne` reste `coming_soon` (capacité absente) |
| Rapports & Rédaction | Générer un document, **Analyse transverse** |
| Besoins & Staffing | Prioriser le pipeline, **Matcher les profils**, **Préparer un candidat**, **Post-mortem commercial**, Analyser les besoins |
| Engagements | Analyser les marges, Détecter les risques, Prévoir le CA, **Anticiper les échéances** |
| Équipe | Prévoir les disponibilités, **Compétences VS besoins**, **Matcher les profils**, Analyse & recommandations |
| Recrutement | **Funnel & Délais Recrutement**, **Compétences VS besoins**, **Communication candidat**, **Matcher les profils**, Analyser le funnel |
| Finance | Analyser les marges, Prévision de CA · `Détecter les anomalies` reste `coming_soon` |
| Automatisations | Générer un rapport, **Analyser les erreurs**, **Analyser les coûts**, **Prioriser les corrections** |
| Knowledge Hub, Paramètres | vides — pas d'action inventée |
| Fiche compte / Comptes & contacts | inchangées, hors périmètre du programme |

**29 actions actives** sur la matrice cible.

### Modules par page

| Page | Modules |
|---|---|
| Cockpit | Modélisation financière, Activité & congés |
| Agenda | Métriques activité, **Rapports** |
| Business Intelligence | **Bibliothèque**, Playbooks (`coming_soon`) |
| Veille & Actualités | Gestion des sources, **Gestion de la connaissance** |
| Prospection Intelligence | Playbooks (`coming_soon`), Agenda light |
| Rapports & Rédaction | **Gestion de la connaissance** |
| Besoins & Staffing | Modélisation financière, Modélisation du CA (`coming_soon`) |
| Engagements | **Atlas du portefeuille**, Activité & congés |
| Équipe | Pool de compétences, Activité & congés |
| Recrutement | Métriques activité (recrutement), Agenda light |
| Finance | **Atlas du portefeuille**, Activité & congés |
| Automatisations | Métriques, Simuler la cadence |

**13 modules actifs sur 15** déclarés. Les 2 `coming_soon` sont détaillés en §5 — aucun n'est un défaut de câblage, les deux attendent un cadrage produit.

---

## 3. 🔴 Rappel : le bug de production corrigé au Lot G

`collaborators.status` ne vaut jamais `"active"` (référentiel réel :
`en_mission` / `intercontrat` / `sorti`). Deux actions (`analyze_needs`,
`prioritize_pipeline`) et le module de règles `staffing-skills-rules.ts`
filtraient sur cette valeur inexistante — l'offre de compétences et la
couverture staffing se calculaient sur **zéro collaborateur**, sans erreur
visible. Corrigé par un prédicat partagé `isStaffableCollaboratorStatus()`
qui exclut le statut terminal plutôt que de lister les statuts vivants. Test
de régression en place (`staffing-skills-rules.test.ts`).

**Ce point a été inclus dans la QA visuelle de Guillaume et validé.**

---

## 4. Les 5 missions L7.x — validées

Décision actée au Lot I : les 7 missions du catalogue sont jugées bonnes.
Toutes actives, toutes exposées :

| Page | Mission |
|---|---|
| Cockpit, Prospection Intelligence | `activation-portefeuille` |
| Prospection Intelligence | `revue-compte-client` |
| Besoins & Staffing | `post-mortem-commercial` |
| Engagements, Finance | `rentabilite-portefeuille` |
| Équipe | `capacite-staffing` |
| Recrutement | `funnel-recrutement` |
| Veille & Actualités | `veille-analyse-mensuelle` |

Un invariant à deux volets garde cet état (`intelligence-registry.test.ts`,
test « exposes every validated mission action as active ») : aucune mission
du catalogue ne peut retomber en `coming_soon`, et **aucune ne peut rester non
exposée** — le défaut le plus silencieux du programme.

---

## 5. Ce qui reste — précisément 2 modules, pas 3

En reprenant ce chantier tu as parlé de « 3 modules à cadrer ». Vérifié à la
source (§0) : **le registre n'en compte que 2 en `coming_soon`.** Je le
signale plutôt que de faire semblant qu'ils correspondent — soit ta mémoire
du compte a glissé, soit un troisième point existe dans ta tête sans être
encore entré dans le registre (dans ce cas, il faut d'abord le nommer avant
de pouvoir le cadrer). Voici les 2 qui existent dans le code :

### 5.1 Playbooks (BI, Prospection Intelligence)

Bloqué par l'absence de **page d'index**. `getPlaybookSectors()`
(`src/lib/prospection/get-playbook-sectors.ts`) existe et renvoie les
secteurs dont l'étude a réellement été produite (`status = 'active'`), mais
**rien ne l'appelle en liste** — vérifié à nouveau le 09/09, aucun changement
depuis le Lot H. Il manque un composant sélecteur (liste de segments →
`/ressources/playbook/[slug]`), pas un chargeur.

**À cadrer :** la forme du sélecteur (liste simple ? recherche ? regroupé par
macro-secteur ?) et si un module ouvrant directement sur *le* secteur du
compte courant a du sens en mode Entité, en plus du sélecteur générique en
mode Page.

### 5.2 Modélisation du CA — B8 (Besoins & Staffing)

Capacité métier **absente** : le forecast existant (`forecast_revenue`)
projette le CA mais ne permet pas de sélectionner des hypothèses gain/perte
d'opportunités par scénario. Vérifié à nouveau le 09/09 : aucun moteur de ce
type n'existe ailleurs dans `src/lib/` ou `src/features/` à réutiliser.

**À cadrer :** c'est une vraie feature, pas un raccordement — quelles
hypothèses (probabilité de closing par opportunité ? scénarios nommés
pessimiste/réaliste/optimiste, comme le fait déjà `forecast_revenue` ?),
quelle sortie (delta de CA ? nouvelle courbe superposée à l'existant ?).

### 5.3 Chantiers isolés — non modules, mais non traités

Pour mémoire, trois capacités de la matrice originale restent `coming_soon`
côté **actions**, pas modules, et n'ont pas été retouchées depuis l'audit
initial : **fenêtres commerciales** (BI), **regroupement thématique**
(Rapports & Rédaction), **suggérer des actions** (Veille). Aucune des trois
n'a de moteur, aucune n'a été cadrée.

---

## 6. Invariants posés — à ne pas perdre

1. **Test de non-régression sur le registre** — toute action `active` doit
   avoir un moteur déterministe, un composeur de mission, ou un handler
   nommé dans une liste explicite. Garde-fou direct contre la régression
   `a2e97e31` du 24/08 (3 actions repassées `coming_soon` en silence).
2. **Invariant module** — un `route` doit avoir un `href` ; un `launcher`
   actif doit avoir une entrée dans `MODULE_LAUNCHERS` ; un `command` actif
   doit avoir une entrée dans `MODULE_COMMANDS`.
3. **Invariant mission** — toute mission du catalogue doit être `active` et
   exposée sur au moins une page (§4).
4. **Un `launcher` doit être autoportant** — un composant qui exige un
   snapshot en prop ne peut pas être monté depuis le panneau. L'échec de
   chargement est un état rendu (`ModuleLoadingDrawer`), jamais un silence.
5. **Aucune valeur financière projetée ne se présente comme un fait.** Le
   runway n'affiche un CA de fin de mission que s'il est constaté par un
   CRA ; sinon `null`. Même doctrine pour le coût estimé des runs en échec.
6. **Un coût inconnu vaut `null`, jamais 0** — les vues Lot 0 de
   `/automations` distinguent déjà `pricing_missing` de `tokens_missing`.
7. **Constantes de domaine hors des modules `"use server"`** — `tsc` ne
   détecte pas une constante exportée depuis un fichier `"use server"`
   importée par un composant client ; seul `next build` le révèle.

---

## 7. Note sur l'historique git

Comme lors des tours précédents de ce chantier, le dépôt est travaillé en
parallèle par d'autres sessions entre deux reprises — vérifié à nouveau ce
tour-ci : `HEAD` porte des commits sans rapport (`Lot 13` consultants,
`cockpit mobile home hero`), et `intelligence-registry.ts` est passé de
794 → 840 lignes sans qu'aucun commit de ce chantier n'y touche depuis le
Lot J — c'est le travail d'autres sessions sur d'autres modules qui a fait
grossir le fichier autour du bloc que j'ai écrit, pas une modification du
bloc lui-même (vérifié : les 6 commits `feat(cockpit-intelligence): …` sont
tous des ancêtres directs de `HEAD` via `git merge-base --is-ancestor`, et le
contenu relu en §2 correspond exactement à ce que le Lot J a laissé).

**Aucune perte constatée.** Le point à retenir pour la prochaine reprise :
toujours relire le fichier réel avant d'agir dessus (§0), ne jamais supposer
que l'état laissé à la fin d'un tour est encore l'état au début du suivant.

---

## 8. Commandes de vérification

```bash
rm -rf .next && npm run typecheck    # purge d'abord — .next périmé = faux TS6200/TS2300
npm test
npm run check:server-boundary
npm run build
```

Fichiers à lire en premier pour reprendre ce chantier :
- `src/lib/intelligence/intelligence-registry.ts` — source de vérité.
- `src/lib/intelligence/intelligence-registry.test.ts` — les invariants.
- `src/components/intelligence/modules/` — les 8 modules autoportants livrés
  (Source Management, Cadence Simulator, Agenda Light, Company Library,
  Knowledge Management, Activity Metrics, Portfolio Atlas, + le loader
  partagé `use-module-snapshot.ts`).
