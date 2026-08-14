# KREDO — Journal des sessions

> Historique détaillé des sessions de développement (Sessions 6 → 34, juin → août 2026).
> **Extrait de `CLAUDE.md` le 2026-08-10** : ce journal pesait 164 Ko sur les 197 Ko du fichier,
> soit ~83 % du contexte chargé à chaque session pour de l'historique rarement consulté.
> Contenu conservé à l'identique, aucune ligne supprimée.
>
> **Quand le lire** : pour retrouver *pourquoi* une décision a été prise, un piège déjà rencontré,
> ou l'état d'avancement d'un lot. `grep` par mot-clé (nom de fichier, table, ADR) plutôt que
> lecture linéaire.
>
> ⚠️ Ce journal est **daté par construction**. Les faits qu'il énonce (compteurs de lignes,
> comptes rattachés, tables existantes, « prochain focus ») valaient au jour de la session.
> Vérifier à la source avant de s'appuyer dessus — cf. `CLAUDE.md` § Supabase pour l'état courant.

---

### Session 45 — Veille ciblée comptes : cycle de vie et actions réelles (2026-08-14)

**Cycle de vie** : `account_signals.detected_at`, déjà utilisé pour dater et ordonner les signaux,
devient la référence canonique. La RPC service-role `archive_stale_account_signals()` archive
strictement avant `CURRENT_TIMESTAMP - INTERVAL '2 months'`; le cron n8n
`account-watch-scheduler` l'appelle avant ses rafraîchissements. La vue `v_active_account_signals`
applique la même borne et exclut `archived`/`dismissed` en défense. Première exécution live :
673 lignes archivées, rejeu : 0.

**Actions** : Desktop et Mobile exposent exactement Vérifier, Générer un mail/pitch, Promouvoir et
Ignorer le signal, avec logique partagée et présentations distinctes. Paramètres réutilise
`AccountWatchSettingsDialog`; Mettre à jour appelle la route serveur existante puis
`intel-033-account-watch-refresh`. Vérifier déclenche le nouveau workflow signé `intel-034`, qui
consulte deux vecteurs distincts Google News/Bing News, exclut la source initiale et interdit une confirmation sans
preuve secondaire. La génération réutilise `signal_outreach` / `intel-020-communication`.

**Promotion** : `sector_news.source_account_signal_id` trace les promotions vers Signaux
sectoriels ; `sector_playbook_signals` relie un signal au playbook de `sector_intelligence` sans
dupliquer son contenu. Deux contraintes uniques empêchent les doublons. Les écritures restent
service-role après validation utilisateur/workspace ; aucune policy existante n'est relâchée.

**Validation** : typecheck vert · 121 fichiers / 1 222 tests verts · frontière serveur/client
verte · lint des fichiers touchés vert (lint global toujours bloqué par 454 erreurs historiques,
dont des worktrees `.claude`) · 19 assertions n8n vertes · build Next 16.2.7 vert. L'API n8n
retourne 401 : import/activation VPS de `intel-034` et réimport du scheduler restent manuels.

### Session 44 — Cockpit Intelligence mobile : corrections du premier lot (2026-08-13)

**Objet** : corriger la persistance de la rédaction, rendre les parcours cockpit réversibles et
donner aux volets Analyser/S’informer leur structure mobile cible.

**Navigation** : un événement partagé `kredo:return-to-account-cockpit` réouvre le panneau compte.
Les sélecteurs et drawers de rédaction, d’agenda, de rapports, de documents, les signaux et les
paramètres de veille exposent désormais « Retour au cockpit ». S’informer ouvre la liste des
`account_signals` du compte dans une modale locale, sans navigation vers `/veille`.

**Rédaction** : les sources utilisateur du triplet catégorie/scénario/objectif traversent désormais
les deux passes de résolution du contexte. Une sélection cockpit explicite reste prioritaire sur le
statut de cycle de vie du compte ; les objectifs restent filtrés par la registry du scénario.

**Analyser** : le hub est renommé « Synthèses et analyses » et réparti en trois cadres homogènes :
Fiches de synthèse, Rapports et Analyse, chacun avec Consulter/Générer. Les fiches distinguent
Synthèse du compte et Synthèse account intelligence, avec inclusion/exclusion détaillée. Les
rapports ouverts depuis ce hub sont limités aux quatre familles utiles et reçoivent le compte dans
leur scope. L’analyse des enjeux déclenche `intel-031-issues-map`; les récipients actualité et
tendances sectorielles sont prêts mais leurs workflows dédiés restent à raccorder.

**Veille** : le paramétrage devient un wizard Type → Sources → Sujets → Précisions, avec bandeau
navy/ambre, navigation Revenir/Suivant, profondeur (standard/équilibrée/approfondie), URLs manuelles
et futur corpus thématique. Profondeur, catégories, URLs et notes sont normalisées dans `metadata`
sans migration et sous RLS.

**Validation** : typecheck vert · 119 fichiers / 1 174 tests verts · frontière serveur/client verte
· lint vert · build Next 16.2.7 vert. Vérification Playwright à 390 × 844 : hub, générateur de fiche
et étapes 1-2 de veille sans débordement horizontal ni erreur console.

---

### Session 43 — Cockpit Intelligence mobile : premier lot d’actions réelles (2026-08-13)

**Objet** : raccorder les quatre premières actions du panneau mobile d’un compte à leurs parcours
réels, sans recréer les composants déjà présents et sans modifier le schéma Supabase.

**Rédiger** ouvre désormais le sélecteur progressif général catégorie → scénario → objectif avant
le drawer de rédaction. L’ancien écran intermédiaire, qui exposait tous les objectifs quel que soit
le scénario, est supprimé. La sélection est transmise au modèle du drawer ; ses listes restent
pilotées par la registry canonique. Le cas demandé « Rebond sur actualité sectorielle » est couvert
par test : seul `get_meeting` est proposé, jamais `manage_expectations` ni `escalate_issue`.

**Planifier** ouvre le sélecteur général de nature d’événement existant, puis le drawer classique
prérempli avec le type retenu et le compte courant. **Analyser** ouvre un hub compte : fiche de
synthèse paramétrable/générable existante, générateurs transverses commercial et financier,
bibliothèque filtrée sur le compte, et récipient explicite pour les métriques compte plus fines du
lot suivant. **S’informer** ouvre trois entrées : signaux, paramètres et synthèse des enseignements.
La première navigue vers `/veille?tab=veille&companyId=…` ; la vue mobile sélectionne l’onglet
Veille et ouvre directement le drawer du compte. La troisième est un récipient futur.

**Paramètres de veille** : nouvelle modale mobile complète (activation, niveau/cadence, six sources,
catégories, alias et notes). Les sources utilisent les colonnes existantes de
`account_watch_settings`; catégories et notes sont conservées dans `metadata` en préservant les
autres clés. Lecture et écriture restent sous RLS via le client Supabase serveur, avec sélections de
colonnes explicites et aucune migration.

**Performance et contrats** : les parcours événement et paramètres de veille sont chargés
dynamiquement au clic. Les vues Desktop ne sont pas modifiées. Les composants maison `AppDialog`,
`AppDrawer`, `Select` et `ProgressivePickerModal` restent les seules primitives utilisées.

**Validation** : `typecheck` vert · 118 fichiers / 1 171 tests verts · frontière serveur/client
verte · lint global vert · build Next 16.2.7 vert. Le build affiche encore les messages historiques
`DYNAMIC_SERVER_USAGE` pendant la tentative de pré-rendu de routes utilisant cookies/headers, puis
termine correctement. Aucun commit ni déploiement.

---

### Session 42 — MASTER STUDY, premier run : le corpus contre la matière réelle (2026-08-13)

**Objet** : lots 0 et 1 du corpus `docs/MASTER-STUDY/`, établi la veille et jamais exécuté.
L'objectif n'était pas de produire de la connaissance — la matière existait, sous forme de deux
études du Spatial d'août 2026 — mais d'éprouver les contrats contre elle. **Le résultat attendu
était que quelque chose casse. Treize contrôles G1 sur trente-deux ont cassé.**

**Lot 0.1 — migration 076.** `intelligence_document_type += master_study`. Une seule valeur
d'enum, additive, idempotente. Vérifié avant d'écrire : `ai_intelligence_results.result_type` et
`account_facts.fact_type` sont des colonnes `text` (aucune migration), `intelligence_entity_type`
contient déjà `sector`. **Piège découvert** : ajouter une valeur à cet enum casse le `typecheck`
et non le build — quatre `Record` exhaustifs la réclament (`document-display.tsx` en compte
quatre à lui seul, dont le type `ReportDocumentType` et le Set `REPORT_DOCUMENT_TYPES`). Remonté
dans CLAUDE.md.

**Lot 1 — run `registre/2026-08-aero-spatial-defense/`.** E0 → E1/G0 → E2 → E4 → E5, en
conversion pure, sans une seule requête web. `OFFRE_KREDO` lu en base (8 practices, 41 offres).
Les JSON sont produits par générateur Python pour que l'invariant A9 (`compteurs.<liste> ==
len(<liste>)`) soit vrai par construction et non par recomptage.

**Lot 0.2 — `scripts/audit-master-study.py`**, le gate G1, écrit *pendant* le lot 1 et piloté par
ce qui cassait. Il généralise les deux scripts existants sur un point : **le schéma n'est plus
dans le code, il est lu sur disque** dans `docs/MASTER-STUDY/schemas/`. Le mini-validateur de
`audit_referentiel.py` a été étendu aux mots-clés que les schémas MASTER STUDY utilisent et que
la v1 ignorait en silence — `$ref`/`$defs`, `minItems`, `maxItems`, `minLength`, `format: uri`.
**Un `minItems` ignoré, c'est exactement la troncature qui passe.** Un faux positif corrigé en
cours de route : le comptage de requêtes du journal comptait toute ligne de plus de douze
caractères, si bien qu'un journal entièrement rédigé franchissait le seuil de 25 sans porter une
seule requête.

**Ce qui casse dans le CONTRAT** (neuf défauts, aucune collecte ne les réparera) :
- **G0 est inpassable par construction** — sa condition « 7 axes à 100 % » contredit le
  `REFERENTIEL-CLASSIFICATION.md` qu'il déclare normatif, lequel impose `moment = NULL` sans fait
  daté. En base : `moment` sur 1 compte / 96. Aucun run ne peut passer G0, sur aucun segment.
- **Le parseur E5 ne lit pas la couche ESN.** `competitive-map-output.ts` ne projette que onze
  clés dans `profile_json`, et aucune des six que le schéma déclare — `couche_esn`, `grilles`,
  `traduction_commerciale`… La preuve est en base : les dix `competitive_map_entries` du segment
  portent un `profile_json` de **40 à 73 octets**. Tout le narratif a été perdu à l'import **sans
  qu'aucune erreur ne soit levée**.
- **A9 et `cadrage.schema.json` s'excluent** : le bloc `compteurs` est exigé par l'axiome et
  interdit par `additionalProperties: false`.
- E1 et E2 n'ont **pas de schéma** ; le régime « conversion » n'existe pas (`acces_web` n'admet
  pas `aucun`) ; le domaine des motifs d'échec d'identité ne couvre pas « le socle n'a pas
  tourné » ; deux vocabulaires de practice cohabitent (`cloud_eng` en base vs
  `cloud-engineering` dans `offer_practices`).

**Ce qui casse dans la MATIÈRE** (six manques) : **0 URL** dans les deux études (100 jetons de
citation non résolvables côté étude B), donc 63 blocs à `src_ids` vide contre un schéma qui exige
25 sources ; **identité du top 3 : 0/3**, le compte étalon lui-même n'a pas de SIREN ; **couche
ESN 0/3** — `08-ETAPE-E5` s'ouvre en disant qu'elle « a échoué deux fois de suite » et que le
document existe pour éviter la troisième : **c'est arrivé une troisième fois**, mais cette fois
c'est mesuré ; grille « IA annoncé vs déployé » vide sur 10/10 ; top 3 déclaré ≠ top 3 trié
(Eutelsat 31 et OHB 29 absents du podium) sans `justification_ecart_top3`.

**Deux découvertes hors périmètre.** (1) Le taux « 95 % des faits sont sourcés » est en partie
auto-référentiel : 8 comptes sur 10 sont sourcés par une ligne `intelligence_sources` sans URL,
créée par l'import de la cartographie — ce sont les **10 seules lignes sans URL sur 450**, et
elles tombent toutes sur ce segment. (2) L'étude B n'est **pas** « PDF hors dépôt » comme
l'annonce le registre : elle est au dépôt en markdown.

**Ce qui a fonctionné** : l'arithmétique de l'appétence est juste sur 10 comptes sur 10 ; les
quatre conversions de la doctrine sont produisibles **sans une seule recherche**, par retournement
de la matière existante ; le « DONC, commercialement » tient sur 100 % des blocs — seul taux à 1,0
du run.

**Verdict** : `rejected`. Aucune ingestion. Le chiffre du chantier — segments porteurs de
connaissance — reste à **1/38**, et c'est le résultat honnête : la chaîne n'est pas bloquée par la
production de connaissance, elle est bloquée par la preuve.

**Livrables** : `docs/MASTER-STUDY/registre/2026-08-aero-spatial-defense/` (00-cadrage, 01-taxonomie,
02-socle, 04-secteur + journal, 05-comptes + journal, 07-g1.txt, 07-verdict.json,
07-g2-a-executer.md, **08-rapport-ecarts.md**) et `scripts/audit-master-study.py`.

**Corpus v1.1, appliqué dans la foulée** : A1 (G0 distingue 5 axes toujours renseignables et 2
axes conditionnels dont le NULL se documente — il ne contredit plus le référentiel), A2 et A3.
G1 passe de 13 à **12 FAIL**, et le verdict G0 du Spatial devient `go_avec_reserve` avec 2
réserves au lieu de 4.

**Amendement tranché par Guillaume** : *un compte client compte dans le seuil des 3 de G0 et
figure dans la cartographie* — le positionner face aux concurrents étudiés est un actif
commercial. `comptes_exclus` d'E0 signifie « hors cibles de prospection », pas « hors périmètre
d'étude », et l'exclusion du top 3 dépend désormais de `objectif_commercial` (jamais sous
`ouverture`, légitimement sous `extension`). Ma recommandation inverse était fausse : elle aurait
rendu `no_go` un run dont l'étude est jugée utile.

**Documentation de reprise** : `docs/MASTER-STUDY/registre/ROADMAP-CORRECTIONS.md` — autoportant,
conçu pour un agent sans historique. Le `README.md` §6 du corpus, qui affirmait encore que la
Master Study n'avait pas d'endroit où vivre en base, est réécrit en état d'exécution. Bandeaux de
défaut ouvert posés sur `08-ETAPE-E5` §8 et `schemas/competitive-map.schema.json`, là où un agent
lirait le contrat et le croirait. Journal du corpus ouvert en `13-GOUVERNANCE` §5 (v1.1).

**Reste à faire** : **A4 est le seul bloquant** — étendre le parseur E5 à la couche ESN, sur
trois couches (parsing → présentation → écran). Tant qu'il n'est pas fait, toute collecte
d'accessibilité est perdue à l'ingestion. Puis A5, A6, puis la collecte B1-B4. G2 reste à
exécuter en session séparée, avec le bundle de `07-g2-a-executer.md`.

---

### Session 41 — BI Environnement concurrentiel Lot 3 : vue Mobile (2026-08-12)

**Objet** : ajouter `competitive_env` à `BusinessIntelligenceMobile` sous le libellé court
« Concurrents » et livrer une composition mobile d'action, indépendante du SVG et des fiches
Desktop, conformément à ADR-0006.

**Navigation et chargement** : la barre mobile passe à cinq entrées de 44 px minimum. La route
serveur lit désormais `tab` et `competitiveSegment` avant le branchement device puis charge, dans
chaque branche, le même `CompetitiveMapWorkspace` ; la branche mobile ne monte aucun composant
Desktop. Le module concurrentiel mobile est importé dynamiquement. Le sélecteur produit l'URL
canonique `?tab=competitive_env&competitiveSegment=…`, tandis que la sélection d'acteur retombe
sur le compte étalon lors d'un changement de segment.

**Vue Mobile** : nouvelle composition sous `src/features/competitive-map/components/mobile/` :
sélecteur `Macro › Segment`, date et compteur, mini-matrice SVG tactile appétence /35 ×
accessibilité /5, fiche synthétique extensible et liste par catégorie. Les marques visibles restent
petites mais possèdent une zone de frappe invisible de 44 px ; seuls l'acteur sélectionné et le
compte étalon sont libellés. Les acteurs sans accessibilité sont présentés dans une rangée
« Non positionnés » sélectionnable, sans fallback de maturité. La fiche initiale se limite au nom,
catégorie, scores, positionnement, dépendance principale, angle d'entrée et premier trigger ; les
rubriques secondaires restent sous divulgation progressive.

**Validation** : `typecheck` vert · 19 tests ciblés verts (loader/presenter, sélection et changement
de segment, contrats BI mobile) · frontière serveur/client verte · lint ciblé vert · build Next
16.2.7 vert · contrôle manuel unique à 390×844 sur un aperçu local éphémère utilisant les
composants réels, ensuite supprimé. Aucun commit ni déploiement.

**Handoff Lot 4** : compléter la couverture d'états et l'intégration de navigation profonde sans
réunifier les arbres Desktop/Mobile ; conserver le loader segmenté et la sélection client-safe
comme frontières communes.

---

### Session 40 — BI Environnement concurrentiel Lot 2 : vue Desktop (2026-08-12)

**Objet** : remplacer le placeholder `competitive_env` de Business Intelligence par la vue
Desktop exploitable du dernier snapshot de chaque segment, sans créer une seconde feature en
dehors de `src/features/competitive-map/`.

**Data** : nouveau loader réutilisable et `server-only`
`getCompetitiveMapWorkspace(segmentId)` : catalogue léger construit uniquement depuis les
segments présents dans `competitive_map_entries`, libellé `Macro › Segment`, dernier snapshot et
compteur calculés côté serveur ; seules les entrées du segment/snapshot actif sont ensuite chargées.
La relation PostgREST vers `companies` a été vérifiée sur la base réelle. CA et effectif viennent
exclusivement des `account_facts` courants (`revenue_estimate`, `headcount_france`) et non des
colonnes canoniques `companies`. Le presenter pur normalise `profile_json`, masque les rubriques
vides et ne substitue jamais la maturité numérique à une accessibilité absente.

**Vue Desktop** : `CompetitiveEnvironmentWorkspace` est chargé dynamiquement dans
`BusinessIntelligenceDesktop`. L'onglet supprime les contrôles BI sans rapport, réduit le header au
titre et utilise toute la largeur restante : barre segment/date/compteur/import, matrice SVG
appétence /35 × accessibilité /5 avec taille CA, couleur catégorie et contour du compte étalon,
inspecteur du compte sélectionné, puis fiches détaillées regroupées par catégorie. La sélection est
commune aux bulles, acteurs non positionnés et fiches. Le segment actif est porté par
`?tab=competitive_env&competitiveSegment=…`, ce qui relance le Server Component ; aucun profil des
autres secteurs n'entre dans le bundle client. Le chemin mobile ne lance pas ce loader Desktop.

**Vérification terrain** : le snapshot live disponible au moment du lot porte 5 acteurs sur
`Tourisme, Hôtellerie & Loisirs › Hébergement & résidences de tourisme`, tous sans accessibilité :
le cas « matrice vide mais fiches présentes » est donc réel et a été traité explicitement.

**Validation** : `typecheck` vert · 114 fichiers / 1 154 tests verts · frontière serveur verte ·
lint ciblé de tous les fichiers touchés sans erreur ni warning · build Next 16.2.7 vert après mise
à l'écart d'un cache `.next` périmé. Le lint global reste rouge sur 453 erreurs préexistantes et
parcourt notamment `.claude/worktrees/`; aucune ne vient des fichiers du lot. Aucune capture ni QA
pixel-perfect, conformément au cadrage.

**Handoff Lot 3** : construire la composition mobile comme une vue sœur (commande segment,
sélection et fiches synthétiques), en réutilisant ce loader/presenter et sans charger le SVG
Desktop. Trancher explicitement la représentation mobile des acteurs positionnés avant d'ajouter
la branche à `BusinessIntelligenceMobile`.

---

### Session 39 — ADR-0019 Lot 6 : sous-section mapped + drawer minimal + Convertir (2026-08-12)

**Objet** : `docs/adr/ADR-0019-profondeur-de-compte-et-ingestion-cartographie.md`, Lot 6 — dernier
lot restant avant le Lot 7 (différé). Fait suite au Lot 5 (ingestion cartographies, commit
`fbf31567` en tête de `main`).

**Décision structurante** : la scission `mapped` vs comptes réels se fait **à la source**, dans
`getAccountsContactsData()` (`src/lib/accounts-contacts/accounts-contacts-data.ts`) — nouveau champ
`mappedAccounts` séparé de `accounts`. Conséquence directe : `stats`, `buildSectorRows`,
`studyIds`, les options de filtres, `totalFiltered`/`totalAll` du header et la combobox
« compte lié » de `ContactFormModal` héritent tous de l'exclusion sans qu'aucun de ces
consommateurs n'ait eu à répéter le filtre — exactement la garantie que l'ADR demande en D-3
(« un `mapped` oublié dans une combobox et l'invariant tombe »).

**Autres points d'exclusion D-3 traités** :
- `searchAccounts()` (`src/app/(app)/missions/_actions/search-accounts.ts`, alimente
  `AccountCombobox` — ~9 consommateurs opportunité/mission/agenda/communication) : `.neq("depth_level",
  "mapped")`.
- `upsertAccountByName()` (`src/app/(app)/missions/_actions/upsert-account.ts`, création inline
  depuis une mission) : si le nom matche un compte `mapped` existant, il est promu à `noted` via
  `promoteAccountDepth` **avant** d'être rattaché à la mission — jamais de rattachement silencieux
  d'un compte-citation (respecte à la fois D-2 « un seul point d'écriture » et D-3).

**Drawer minimal** : `CompanyIdentityDrawer.tsx` branche désormais sur
`data.company.depth_level === "mapped"` (colonne ajoutée au `select()` de `getCompanyIdentity`, qui
saute aussi les requêtes contacts/opportunités/missions/interactions pour un compte mapped — D-3 en
garantit l'absence, inutile d'interroger ces tables). Nouveau composant
`CompanyIdentityDrawerMappedView.tsx` : identité + analyse `competitive_map_entries` (nouveau
loader `src/features/competitive-map/data/get-competitive-map-citation.ts`, lecture directe car
`v_crm_account_list` n'expose pas cette table — D-4) + faits `account_facts` (CA/effectif) avec
caveat « provisoire, non audité » toujours visible. CTA unique « Convertir en compte CRM » →
`promoteAccountDepth(id, "noted")`, troisième porte d'entrée de D-2 (les deux autres : case
création + bouton « Créer et qualifier », inchangées).

**Vocabulaire visuel** : `DEPTH_BADGE_TONE`/`ORIGIN_LABELS`, jusque-là dupliqués localement dans
`ClientIntelligenceSocleTab.tsx` (Lot 3), extraits en `ACCOUNT_DEPTH_BADGE_TONE`/
`ACCOUNT_ORIGIN_LABELS` dans `depth-level.ts` — réutilisés tels quels par le drawer minimal et la
sous-section liste, pas de seconde définition.

**Sous-section liste** : `MappedAccountsSection` dans `AccountsContactsViews.tsx` — un seul
composant responsive (pas de split Desktop/Mobile, ADR-0006 : liste simple, pas un dashboard dense),
repliable, sous la liste principale de l'onglet Comptes. Ouvre le même `CompanyIdentityDrawer` via
`openCompanyDrawer` ; c'est le drawer qui bascule en variante minimale selon `depth_level`.

**Piège éviré en lint** (`react-hooks/set-state-in-effect`) : le premier jet de
`CompanyIdentityDrawerMappedView` appelait `setCitationLoading(true)` de façon synchrone en tête
d'effet avant le fetch — inutile puisque l'état initial du `useState` vaut déjà `true` et que le
composant est remonté à chaque changement de compte (le drawer vide `data` avant de recharger).
Retiré plutôt que suppressé en `eslint-disable`.

**Validation** : `typecheck` (0 erreur) → `test` (112 fichiers / 1119 tests, dont 2 nouveaux sur
`ACCOUNT_DEPTH_BADGE_TONE`/`ACCOUNT_ORIGIN_LABELS`) → `check:server-boundary` (vert) → `lint` sur
les 11 fichiers touchés (0 erreur, 2 warnings préexistants sans rapport) → `build:webpack` (succès,
61 routes générées). Pas de migration SQL dans ce lot — tout le socle base (`depth_level`, `origin`,
`competitive_map_entries`, `account_facts`) existait déjà des Lots 0/5.

**Reste** : Lot 7 (modularisation INTEL-030) — différé, contrat non stabilisé (inchangé depuis
Session 38).

---

### Session 38 — ADR-0019 Lot 5 : ingestion des cartographies concurrentielles (2026-08-12)

**Objet** : `docs/adr/ADR-0019-profondeur-de-compte-et-ingestion-cartographie.md`, Lot 5 —
contrat `CompetitiveMapOutput` + résolution + bac d'arbitrage. Handoff repris à jour (§6 de
`docs/adr/HANDOFF-ADR-0019.md`), démarré sans blocage identifié.

**Décision structurante** : le mécanisme `AccountScanResolution` référencé par l'ADR n'est qu'un
CONTRAT (`resolved|ambiguous|not_found` + candidats) — sa résolution réelle pour le scan de compte
passe par le workflow n8n `intel-010-refresh`, et l'ADR exclut explicitement un nouveau workflow
n8n pour ce lot. Construit donc un second moteur de résolution, purement SQL :
`public.resolve_company_candidates(p_name, p_siren)` (SECURITY INVOKER), qui réutilise
`kredo_normalize_company_name()` (jamais réimplémentée côté TS) et l'extension `pg_trgm` (absente
en base, ajoutée par la migration — vérifié via `list_extensions` avant d'écrire quoi que ce soit).
Le contrat est réutilisé, pas le workflow.

**Écriture** : nouvelle RPC `public.ingest_competitive_map_batch(p_decisions, p_reason)` (SECURITY
DEFINER, migration `20260812124353_074_competitive_map_ingestion.sql`), sur le modèle exact
d'`apply_account_classification` (068) : `authenticated` n'a que SELECT sur `account_facts`/
`intelligence_sources` (RLS vérifiée en base), toute écriture batch passe par cette RPC. Chaque
entrée de décision est traitée dans sa propre sous-transaction PL/pgSQL (bloc exception) : une
erreur sur un compte n'annule pas les autres. Un compte `mapped` créé porte
`relation_type='prospect'` — le domaine à 4 valeurs (§5.8 REFERENTIEL-CLASSIFICATION) ne porte pas
de valeur « concurrent », NOT NULL sans défaut oblige à choisir la plus neutre. Jamais de segment
créé à la volée (§9/§12.1) : un `segmentSlug` inconnu met l'item en erreur, jamais un insert dans
`sector_intelligence`. Dry-run en transaction `ROLLBACK` (4 scénarios : create nominal, attach
nominal, segment inconnu, conflit SIREN) avant application réelle, comme pour la 068.

**⚠️ Collision de numérotation locale** : le slot `073` a été pris entre-temps par le chantier
parallèle « Socle Identité France » (`20260812110000_073_account_facts_identite_france.sql`,
commit `fb5559eb`, déjà committé) — invisible tant que `git log`/`ls supabase/migrations` n'ont pas
été vérifiés après écriture du fichier local. Renommé en `074` avant application. Même piège que
018/019, documenté dans `CLAUDE.md`.

**Domaine TS** (`src/features/competitive-map/domain/`) : pas de zod — `grep '"zod"' package.json`
ne renvoie rien, le projet n'a aucune bibliothèque de validation, tout est écrit à la main sur le
modèle `account-classification.ts` (validateurs purs, aucune dépendance Supabase).
`competitive-map-output.ts` parse défensivement le JSON produit par le skill sectoriel : lu contre
le livrable réel `docs/FEATURES/sector_intelligence/livrables_etudes/2026-08-btp-travaux-publics/
export.json` (pas seulement le schéma nominal du kit `01-prompt-generique.md`), plusieurs écarts
structurels sont apparus et absorbés plutôt que rejetés — `categorie` porte parfois des tirets
(« mid-market ») alors que la colonne SQL attend des underscores ; `date_snapshot` est au format
français `JJ/MM/AAAA`, pas ISO ; `empreinte_metier`/`maturite_numerique` portent des demi-points
(4.5) alors que les colonnes sont des `smallint` (arrondis côté TS, jamais côté SQL — un cast
texte `'4.5'::smallint` échoue) ; `identifiant_national`/`code_activite` sont quasiment toujours
absents (cohérent avec la règle « le SIREN n'est jamais un prérequis de résolution », établie par
le chantier Socle Identité France) ; aucune correspondance 1:1 vers `positioning`/`forces`/
`vulnerabilite` (seul `positioning` a une source directe raisonnable via `justification_categorie`,
les deux autres restent vides par défaut, éditables dans le bac d'arbitrage).
`resolve-competitive-map-account.ts` porte la classification pure `resolved`/`ambiguous`/
`not_found` à partir des candidats SQL (seuil de score, écart net entre 1er et 2e, doublon de match
exact -> ambigu). 21 tests, tous verts.

**UI** : wizard mono-session 3 étapes (`CompetitiveMapImportWizard.tsx`, responsive CSS — ADR-0006,
pas d'adaptive plein, c'est un écran de saisie/revue) sous `/prospection/cartographies/import` :
upload/coller le JSON + choix du segment (jamais auto-résolu, §9 interdit la création à la volée)
et de la date d'étude -> résolution en lecture seule contre le CRM -> bac d'arbitrage (un candidat
ou création par compte, positionnement/forces/vulnérabilité/angle d'entrée éditables, option
d'exclure une ligne) -> confirmation avec liens vers les fiches créées/rattachées. Point d'entrée :
lien « Importer une cartographie » dans la toolbar desktop de `/prospection/accounts`
(`AccountsContactsViews.tsx`) — pas de modification de `v_crm_account_list` ni de la liste
elle-même, la sous-section `mapped` reste Lot 6.

**Hors scope, assumé et documenté** : pas de nouveau workflow n8n (exclusion ADR explicite) ; pas
de `source_document_id`/nouveau type `intelligence_documents` (provenance portée par une ligne
`intelligence_sources` par lot d'import, clé déterministe `competitive_map:<segment>:<date>`,
idempotente en cas de ré-import) ; pas de file d'attente d'arbitrage persistée multi-session (le
wizard est un aller simple, réversible si le besoin apparaît) ; `trigger_events`/`a_ne_pas_dire`/
`trous` du JSON source ne sont pas persistés (pas de colonne dédiée sur `competitive_map_entries`).

**Validation** : `npx tsc --noEmit` (purge `.next/` nécessaire, `TS6200` sinon — piège habituel),
`npm test` (1117/1117), `npm run check:server-boundary` (vert), `npm run lint` sur les fichiers
touchés (0 erreur, 2 warnings pré-existants sans rapport dans `AccountsContactsViews.tsx`),
`npm run build` (succès, `/prospection/cartographies/import` rendu `ƒ` dynamique comme attendu).
`npm run db:types` exécuté après application de la migration.

**Reste à faire (Lot 6, pour mémoire)** : sous-section `mapped` dans la liste comptes + drawer
minimal + bouton « Convertir » appelant `promoteAccountDepth` (même Server Action que les deux
autres portes d'entrée déjà câblées — D-2, jamais un parcours « convertir » distinct).

---

### Session 37 — Lot 0 « résolution sectorielle héritée » : l'app lit enfin la maille segment (2026-08-12)

**Objet** : `docs/FEATURES/sector_intelligence/HANDOFF-LOT0-RESOLUTION-SECTORIELLE.md`, Lot 0 du
chantier « Connaissance & intelligence sectorielle ». Lot d'**infrastructure** : à l'écran presque
rien ne change, parce que le macro reste la seule source réellement remplie. Il débloque la lecture
de tout ce que les Lots 2 et 3 produiront au niveau segment.

**État vérifié avant d'agir** (conforme au handoff, aucun écart) : 98/98 comptes classés,
0 incohérence `sector_id` / `segment.parent_id`, 15 macros + 38 segments, dernière migration
`20260810204816`.

**Livré — 3 migrations**

| Version | Contenu |
|---|---|
| `20260811232105` | `069_sector_knowledge_resolution_views` — 5 helpers `private.*` + les 2 vues |
| `20260811232234` | `070_sector_knowledge_functions_search_path` — `search_path = ''` sur les 5 fonctions (linter Supabase 0011) |
| `20260811233206` | `071_sector_playbook_merge_drop_empty_keys` — correctif de fusion, cf. plus bas |

`v_sector_knowledge_resolved` (1 ligne par fiche segment, champs scalaires + `playbook` +
`practices_fit` résolus par **substitution** champ par champ) et `v_sector_knowledge_items`
(1 ligne par item visible depuis un segment, par **union** segment + macro). Les deux portent
`security_invoker = true`. **Aucune table créée, aucune donnée recopiée** (décision D-B).

**Le piège n°1 a bien mordu, mais dans l'autre sens.** La fusion clé par clé évite l'écrasement des
13 playbooks macro par les 37 squelettes de seed — vérifié : 37/38 segments héritent, 30 finissent
avec des `personas` non vides. Mais les **assertions SQL** ont révélé un défaut que ni le typecheck
ni les tests n'auraient vu : une clé vide **des deux côtés** survivait en `[]`, donc
`playbook <> '{}'` restait vrai et `isNonEmptyJson()` côté TypeScript aussi. Faux positif latent du
drapeau « playbook structuré », qui se serait déclenché le jour où l'un des 3 macros sans
connaissance passerait `active`. D'où la migration 071. **Écrire les assertions AVANT de conclure a
payé.**

`merge_sector_practices_fit` n'est volontairement **pas** aligné sur ce comportement : c'est un
vecteur de scores de forme fixe (4 practices) où `0` est une valeur légitime (« pas d'adhérence »).
En revanche un `0` y vaut « non renseigné » pour la substitution — sans quoi les 37 segments de
seed, tous à zéro, masqueraient le profil de leur macro.

**Le drapeau « playbook structuré » ne bouge pas — et c'est mesuré.** 79 comptes l'ont avant, 79
après, 0 gagné, 0 perdu. La clé est le **statut effectif** : celui de la fiche qui porte réellement
le playbook, pas celui du segment. Lire `segment_status` aurait donné `development` sur les 36
fiches de seed et éteint le drapeau de tout le parc. Même logique pour
`structuredSectorSlug`, qui alimente `/ressources/playbook/[slug]` : pointer le segment aurait
envoyé 36 comptes vers une page de playbook vide.

**Consommateurs basculés** — `sector-snapshot-data.ts` (prend un `segmentId`, lit les 2 vues),
`intelligence-data.ts` (passe `company.segment_id`, expose `segmentId` **et** `sectorId`),
`account-panel-data.ts` (lit la vue résolue, nouveau `toEffectiveSectorRow`),
`get-portfolio-intelligence-snapshot.ts` + `portfolio-account-metrics.ts` (`segment_id` chargé et
exposé en `segmentId`).

**Liste des pairs au segment, repli macro sous 3 comptes** (`PEER_SEGMENT_MIN`). Avant, un compte
spatial voyait tout l'aéronautique comme pairs. `peersLevel` dit laquelle des deux mailles est
affichée.

**UI** — nouveau badge `SectorLevelBadge` (« Macro-secteur ») sur chaque pain point et chaque jalon
réglementaire hérité, mention « Segment de « X » » dans le chapeau, et surtout un **état vide
explicite** (`SectorNoKnowledgeState`) pour les 19 comptes des 3 macros sans connaissance : ils
lisaient un écran muet qu'ils prenaient pour un bug. `intelligence-process.ts` ne badge plus
« Disponible » sur la seule présence d'un snapshot — depuis la classification 98/98 tout compte en a
un — mais sur `hasAnyKnowledge`.

**Tests** — 11 tests Vitest sur `getSectorSnapshot` (union des items, provenance, repli des pairs,
statut effectif, état vide) + 5 sur `toEffectiveSectorRow`. La moitié SQL n'étant pas exécutable
sous Vitest, elle vit dans `supabase/tests/069_sector_knowledge_resolution.assertions.sql` —
**14 assertions, à rejouer contre la base**, vertes au 12/08. Suite complète : 110 fichiers,
1089 tests. `typecheck` / `check:server-boundary` / `build` verts, lint sans régression.

**Volontairement HORS périmètre, à trancher par Guillaume** : `build-sector-activation-model.ts` et
`get-business-intelligence-snapshot.ts` (page `/prospection/approche-sectorielle`) restent groupés
**au macro**. Les basculer au segment ferait passer la page de 15 à 38 lignes, dont 30 ne feraient
que répéter la connaissance héritée de leur macro — c'est une décision produit sur cette page, pas
la plomberie du lot, et cela contredirait le critère « aucune régression sur les 98 comptes ». La
donnée est en place (`segmentId` circule jusqu'au contrat portfolio) : la bascule est un choix, plus
un chantier.

**Deux notes de terrain** :
- `check:server-boundary` **passe** aujourd'hui, alors que `CLAUDE.md` le donne en échec sur
  `get-kredo-expertise-snapshot.ts`. Dette apparemment résorbée entre-temps.
- Le nom de fichier de la migration 071 a encore dérivé du timestamp réel enregistré
  (`232905` deviné vs `233206` réel) — **5ᵉ occurrence** du piège. Renommé.

---

### Session 37 bis — Numérotation « 5.1 » sortie du nom des segments (2026-08-12)

**Demande de Guillaume** : enlever les chiffres devant le nom des segments (« 5.1 » devant
« Spatial », « 12.1 » devant « ESN & services numériques »), en migration si c'est possible, sinon
en masquant côté UI.

**Migration, sans hésitation** — quatre vérifications à la source l'ont établi :

1. **Rien ne s'appuie sur le `name`.** `apply_account_classification()` matche
   `si.slug = v_segment_slug`, et le workflow n8n INTEL-010 valide le choix du LLM contre une liste
   fermée de **slugs**. Le `name` n'y est qu'un libellé — le nettoyer réduit même le bruit envoyé
   au modèle.
2. **La numérotation était déjà incohérente** : 37 segments sur 38 la portaient, la fiche
   « Nutraceutique, Santé Naturelle & Compléments Alimentaires » ne l'a jamais eue. Et les macros ne
   sont pas numérotés : le « 5 » de « 5.1 » désigne un rang qui n'existe **nulle part** en base.
3. **Elle nuisait au tri** : en tri texte, « 10.1 » passait avant « 2.1 ». Aucune requête n'ordonne
   `sector_intelligence` par `name` de toute façon (tri applicatif sur `attractiveness_score`) —
   donc aucun ordre à préserver, et l'alphabétique devient enfin correct.
4. **Aucune copie dénormalisée** : `companies.segment` (texte libre hérité) ne contenait aucune
   valeur numérotée — 0 ligne sur 48 valeurs distinctes.

**Migration `20260811234834` (072)** : nouvelle colonne `display_code` (le préfixe verbatim,
documentaire), `name` nettoyé par `regexp_replace`. Opération **sans perte et réversible**, et les
références « Segment 12.1 » du `REFERENTIEL-CLASSIFICATION.md` restent résolvables en base.

**Deux pièges évités** :
- **`updated_at`** — le trigger `trg_sector_intelligence_updated_at` a été désactivé le temps de
  l'UPDATE. Sans ça, les 37 fiches auraient toutes paru rafraîchies ce jour-là dans l'indicateur de
  fraîcheur de `/prospection/approche-sectorielle` (`sector-activation-data.ts`, `lastUpdatedAt`) —
  un mensonge de donnée pour un simple renommage. Vérifié après application : **0 ligne touchée**.
- **`§5.1` du référentiel est un numéro de SECTION**, pas le segment « 5.1 » (il désigne le
  paramètre `sector_id`). Un search/replace global sur « 5.1 » aurait saccagé le document. Note
  ajoutée en §4 pour que personne ne retombe dedans.

**Résultat** : 0 nom numéroté, 37 `display_code` conservés, 0 collision de noms, 98 comptes
toujours rattachés. Boucle complète verte (typecheck / 1089 tests / server-boundary / build).

---

### Session 36 — Correctif production intel-010-refresh : fences Markdown non nettoyées (2026-08-11)

**Constat de Guillaume** : le workflow patché en Session 35 (ADR-0019 Lot 4) ne fonctionnait pas en
production. Il l'a corrigé directement (VPS + réexport local), remplaçant
`n8n/workflows/intel-010-refresh.json` par
`n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json` (commit `abc5c635`). **C'est cette
version-là qui fait foi**, pas le patch de la Session 35.

**Diagnostic fait a posteriori** (diff `bd7d89c3` vs le fichier committé) : un seul nœud sur les 5
patchés diverge, `Parse & Validate LLM Output`. Le code fautif était du code **préexistant, jamais
touché par le patch Lot 4** :

```js
// Avant (Session 35, cassé en prod) :
const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
parsed = JSON.parse(clean);
// catch : throw new Error('Réponse LLM non-JSON : ' + content.slice(0, 200))  — pas de e.message

// Après (fix Guillaume, en prod) :
let clean = String(content || '').trim();
if (clean.startsWith('```json')) clean = clean.slice(7);
else if (clean.startsWith('```')) clean = clean.slice(3);
if (clean.endsWith('```')) clean = clean.slice(0, -3);
clean = clean.trim();
parsed = JSON.parse(clean);
// catch : throw new Error(`Réponse LLM non-JSON : ${e.message} | extrait=...`)  — diagnosticable
```

Le prompt allongé par les instructions de classification (§10 du REFERENTIEL, bloc JSON `moment`/
`tier`/`vertical_client`/etc. en plus) a apparemment fait sortir Claude d'un format que l'ancien
remplacement regex global gérait mal. Le `schema_version !== 1` strict a aussi été retiré du fix —
signe que ce champ n'était plus fiablement émis une fois le schéma de sortie alourdi. Sans le
`e.message` dans le message d'erreur d'origine, Guillaume n'avait que les 200 premiers caractères
bruts pour diagnostiquer — le fix ajoute la vraie raison du `JSON.parse` en échec.

**Ce que la validation de la Session 35 n'a pas vu, et pourquoi.** Le harnais d'exécution réelle de
cette session-là a bien exécuté la vraie chaîne de nœuds — mais son générateur de réponse LLM
fictive produisait le contenu via `JSON.stringify({...})` **directement**, sans jamais l'envelopper
de fences Markdown, de prose, ou d'espaces parasites :

```js
const llmReply = (classification) => ({
  content: [{ type: "text", text: JSON.stringify({ schema_version: 1, ... }) }],
  // JSON.stringify pur — ne peut structurellement pas exercer le chemin de nettoyage
  // des fences, quel que soit le nombre de scénarios joués dessus.
})
```

Le harnais testait donc uniquement la logique de VALIDATION du contenu (segments, contrôles §10),
jamais la robustesse du NETTOYAGE en amont — la portion de code qui a réellement cassé. Un test qui
ne peut structurellement pas emprunter le chemin de code fautif ne le valide pas, même vert à 100 %.

**Leçon pour tout futur patch de nœud `Code` n8n qui parse une sortie LLM** : les fixtures de test
doivent inclure au moins un cas avec fences Markdown, un avec prose parasite avant/après le JSON, et
un avec un champ attendu manquant — pas seulement du JSON déjà propre généré par
`JSON.stringify()`. Sinon le harnais valide la logique aval sans jamais avoir prouvé que l'entrée
lui arrive dans la forme qu'il suppose.

**État réel à retenir** : le fichier `n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json`
(committé `abc5c635`) est la version qui fonctionne en production. Toute lecture de
`docs/HANDOFF-ADR-0019.md` ou de la Session 35 ci-dessous doit être corrigée par cette entrée pour
ce qui concerne le nœud `Parse & Validate LLM Output` — le reste (4 autres nœuds patchés, migration
068, domaine TypeScript, UI de revue) reste exact et inchangé, aucune régression constatée ailleurs.
Le handoff (`docs/HANDOFF-ADR-0019.md`) a été corrigé en conséquence le même jour.

**Point encore ouvert, sans lien avec ce correctif** : le fichier committé compte un nœud de moins
(`Resolve Source Ids` absent) que la version de la Session 35 — non expliqué, non bloquant, à
confirmer avec Guillaume si l'occasion se présente.

### Session 34 — Cartographie sectorielle RUN 5 : intégration Business Intelligence (2026-08-10)

- **Destination finale branchée** : la feature VALEUR / ÉCOSYSTÈME remplace le placeholder de l’onglet « Chaîne de valeur » de `/intelligence`, sur Desktop et mobile. Le Design Lab reste une référence indépendante. Le chargement du snapshot BI, du device et du catalogue sectoriel est parallélisé côté serveur ; le bundle de cartographie reste différé tant que l’onglet n’est pas ouvert.
- **Adaptateur Supabase sans migration** : nouveau catalogue serveur construit à partir des tables existantes `sector_intelligence`, `value_chain_nodes`, `value_chain_actors` et `value_chain_links`. Transformation pure vers le `SectorMap` canonique : stages, activités, couches transverses, placements multi-positionnés dédupliqués, statuts portefeuille, métriques, preuves et relations `main | influence`. Les libellés longs restent dans les preuves au lieu d’encombrer les arêtes. Audit live : une cartographie réelle disponible à ce jour (BTP, 10 nœuds, 50 placements acteurs, 20 relations) ; aucune évolution de schéma nécessaire.
- **Sélecteur exclusif Secteur / Compte** : un seul mode actif. Secteur affiche la cartographie complète ; Compte résout le secteur depuis les placements `value_chain_actors`, initialise le maillon concerné et applique uniquement un focus visuel au même modèle. VALEUR, ÉCOSYSTÈME et `SectorMapInspector` partagent toujours la même sélection.
- **Intégration adaptative** : racine `section` en contexte embarqué pour éviter les `<main>` imbriqués, contrôles tactiles 44 px, sélecteur compact, inspector Desktop/bottom sheet mobile, acteur sélectionné identifiable dans matrice, graphe et inspector. Le graphe Desktop déterministe a été resserré à 920 px et son header passe sur deux rangées aux largeurs intermédiaires ; aucun moteur ou paquet ajouté.
- **Tests et QA** : nouveau test de transformation Supabase (déduplication, captation inconnue, couverture, preuves, modes, résolution compte) et contrats d’intégration BI. QA Playwright sur BTP dense, Banque (stage vide, inconnue, multi-positionnement), Tourisme (flux direct), 1440 px, 1024 px et 390×844 ; aucun overlap ni erreur console. Captures conservées dans `output/playwright/run-5/`. Le plugin Browser n’était pas disponible : Playwright local utilisé en repli.
- **Validation** : `typecheck` → EXIT 0 · `test` → 108 fichiers / **1057 tests** · `check:server-boundary` → EXIT 0 · `lint` → EXIT 0 · `build` → EXIT 0. Le build conserve des logs préexistants de bail-out dynamique sur plusieurs routes utilisant `cookies`/`headers`, sans échec ; le nouveau loader appelle `unstable_rethrow` pour ne pas masquer les erreurs internes Next.js.
- **Dépendances / DB** : aucune dépendance ajoutée, aucune migration ni écriture Supabase, aucun commit/push/déploiement. Limite connue : seule la cartographie BTP est aujourd’hui alimentée dans les tables réelles ; Banque et Tourisme restent des fixtures de validation jusqu’à leur ingestion future.

### Session 35 — ADR-0019 Lot 4 : 7 axes de classification dans le contrat INTEL-010 (2026-08-10)
> Renumérotée de « Session 34 » à « Session 35 » le 2026-08-11 : collision avec l'entrée
> « Cartographie sectorielle RUN 5 » ajoutée en parallèle par une autre session sous le même
> numéro. Aucun contenu modifié, seul le numéro change — voir la correction du 2026-08-11
> ci-dessus (Session 36) pour ce qui a réellement dérivé de ce qui est affirmé ici.
Le scan produit désormais une **classification complète du compte** (les 7 axes du
`REFERENTIEL-CLASSIFICATION.md` §5.2→5.8), applicable en une transaction contrôlée.
- **Décision structurante — bloc atomique, PAS des `fieldProposals`.** Le §10 du référentiel pose
  quatre contrôles **bloquants inter-champs** (`sector_id` = parent du segment ;
  `regime_achat`+`modele_eco`+`relation_type` renseignés ; note obligatoire si confiance ≠ haute).
  Vérifié à la source : `private.perform_proposal_apply` applique **une proposition par attribut**,
  indépendamment des autres — il permettrait d'écrire `segment_id` sans son macro et violerait le
  contrôle 2 par construction. D'où une RPC dédiée plutôt qu'un passage par `enrichment_proposals`.
- **`sector_id` n'est jamais proposé** : déduit de `segment.parent_id` (§5.1 « on ne choisit jamais
  un macro directement »). Le contrôle 2 devient vrai *par construction* au lieu d'être une
  vérification qu'on peut oublier. Vérifié en base : 38/38 segments ont un parent, 15/15 macros n'en
  ont pas.
- **Migration `20260810204816_068_account_classification_apply`** : `apply_account_classification(
  p_result_id, p_accepted_axes, p_reason)` SECURITY DEFINER + `private.classification_relation_conflict()`.
  Le navigateur n'envoie **jamais** de valeur à écrire — seulement l'id du résultat et les axes
  acceptés ; la RPC relit `ai_intelligence_results.content_json` (même doctrine que
  `import_account_scan_contacts`). `companies.sector` (texte libre) et `lifecycle_status`
  (projection par trigger) ne sont jamais écrits — §12.3 et contrôle 9.
- **Garde-fou §12.9** : `relation_type` est le seul des 7 axes dont la source de vérité est
  **interne** (missions, opportunités gagnées) et non documentaire. Une rétrogradation en
  `prospect`/`pair_partenaire` contredite par une mission active est **ignorée et rapportée**, pas
  bloquante — la fiche garde son statut réel, qui satisfait déjà le contrôle 3. Vérifié sur données
  réelles : Ascoma (client, mission active) refuse `prospect` et conserve `client`.
- **§10.3 porte sur l'état FINAL, pas sur la sélection** : écarter un axe déjà renseigné en base est
  licite — les 96 comptes du parc sont classés, un rescan ne doit pas forcer à réécrire ce qui est
  juste. Domaine TS et RPC alignés sur cette lecture.
- **Dry-run avant application** : 5 scénarios joués en transaction `ROLLBACK` sur données réelles
  (nominal + §12.9, segment inventé, `moment` sans preuve, confiance haute + test KO, confiance
  moyenne sans note) — tous rejetés avec le bon code d'erreur avant d'appliquer la migration.
- **Workflow n8n — 5 nœuds patchés** par script Python, dont `Reconcile & Prepare Writes` : ce nœud
  reconstruit un objet **explicite** (pas de spread), donc `llmClassification` s'y perdait en
  silence et `Prepare Callback` aurait publié `classification: null` sans jamais lever d'erreur.
  **Exactement le même piège que le correctif `llmUsage` du 2026-07-13**, déjà documenté dans le
  SETUP de ce workflow — à vérifier systématiquement sur ce nœud.
- **Validation n8n** : `node --check` sur les 17 nœuds Code **plus** un harnais Node d'exécution
  réelle (mocks `$input`/`$`/`$execution`) couvrant la chaîne Validate → Assemble → Parse →
  Reconcile → Prepare Callback, les 4 rejets du référentiel, la propagation par Reconcile, la
  rétrocompatibilité et le **cross-check du `contentJson` contre les 16 clés du type
  `AccountScanClassification`** (aucune manquante, aucune en trop).
- ⚠️ **`npm run n8n:status` ne détecte PAS cette dérive** : il compare les *compteurs de nœuds*
  (40/40 ici) et le patch ne change que du code à l'intérieur de nœuds existants. Le réimport reste
  nécessaire — le panneau de classification ne s'affiche que si le `contentJson` porte le bloc.
- **Validation** : `typecheck` → EXIT 0 · `test` → 109 fichiers / 1073 tests · `check:server-boundary`
  → EXIT 0 · `lint` (7 fichiers touchés) → 0 erreur, 0 warning · `build` → EXIT 0.
- **Reste ADR-0019** : Lot 5 (ingestion `CompetitiveMapOutput` + bac d'arbitrage), Lot 6
  (sous-section `mapped` + drawer minimal + « Convertir »), Lot 7 (modularisation INTEL-030, différé).

### Session 33 — ADR-0019 Lot 3 : étape 0 « Socle » + action recommandée unique (2026-08-10)
Lots 0-2 de l'ADR-0019 étaient déjà livrés en base et en Server Action (migrations 066/067, `promoteAccountDepth`, bouton « Créer et qualifier » du drawer) mais **rien n'était branché côté cockpit** — `depth_level`/`origin`/`siren`/`naf_code` n'étaient même pas lus par `getClientIntelligence()`. Ce lot ferme la boucle : le cockpit expose désormais le socle et une seule action recommandée (D-6).
- **`intelligence-data.ts`** : `CompanyRow` et `ClientIntelligenceData.company` étendus (`siren`, `nafCode`, `sectorId`, `depthLevel`, `origin`, `legalName`) — lus directement depuis `companies`, aucune nouvelle requête.
- **`intelligence-process.ts`** : nouvelle étape `"socle"` en tête de `INTELLIGENCE_PROCESS_STEPS` (avant `connaissance`) ; `getProcessStepStatus("socle", …)` reflète `depth_level` (qualified/active → Disponible, mapped → Citation, noted → À qualifier). Nouvelle fonction `getRecommendedProcessStep()` (D-6) : première étape au statut `neutral` dans l'ordre de la séquence, repli sur `roadmap` si tout est déjà couvert (au moins FOLIO/moteur).
- **`ClientIntelligenceSocleTab.tsx`** (nouveau, partagé Desktop/Mobile — fiche simple, ADR-0006 responsive) : SIREN/NAF/taille/taxonomie + badge de palier + réutilisation de `AccountScanDialog` (même bundle différé que `CompanyIdentityDrawer`) dont l'application appelle `promoteAccountDepth(id, "qualified")` puis `router.refresh()`. Aucune nouvelle logique de scan créée — D-2 respecté (une seule Server Action d'écriture).
- **ProcessRail (`ClientIntelligenceHomeTab.tsx`)** : D-6 appliqué visuellement — l'étape recommandée garde l'opacité pleine + liseré brass + badge « Recommandé » ; les autres passent à `opacity-60` mais restent cliquables (séquencement suggestif, jamais bloquant, conforme à la décision explicite de l'ADR).
- **Sidebar + vue mobile** : nav item « Socle » ajouté (`ClientIntelligenceSidebar.tsx`), panneau mobile branché (`ClientIntelligenceMobileView.tsx`, timeline verticale déjà générique sur `INTELLIGENCE_PROCESS_STEPS`).
- **Tests** : `intelligence-process.test.ts` — 4 cas de statut socle + 3 cas d'action recommandée (démarre au socle si `noted`, passe à `connaissance` une fois `qualified`, retombe sur `roadmap` quand tout le reste est couvert). `ClientIntelligenceSidebar.test.ts` mis à jour (6 → 7 entrées figées).
- **Validation** : `typecheck` → EXIT 0 · `test` → 107 fichiers / 1051 tests · `check:server-boundary` → EXIT 0 · `lint` (fichiers touchés) → 0 nouvelle erreur (1 erreur `no-explicit-any` + 1 warning `no-unused-vars` pré-existants, hors des lignes modifiées) · `build` → EXIT 0.
- **Reste du chantier ADR-0019** : Lot 4 (scan affiné, 7 axes de classification) et Lot 5 (ingestion `CompetitiveMapOutput` + bac d'arbitrage) toujours à faire ; Lot 6 (sous-section `mapped` + drawer minimal) idem.

### Session 32 — Cartographie sectorielle RUN 4 : mobile VALEUR + ÉCOSYSTÈME (2026-08-10)
- **Composition mobile native** : nouvelle branche `SectorMapMobile`, choisie côté serveur via `getDashboardDevice()` dans le Design Lab. Aucun layout desktop n’est réduit ou masqué côté client. VALEUR devient une exploration séquentielle par étapes et activités, avec captation, confiance, couverture, white space, acteurs Kredo, opportunités, forces transverses et accès aux sources sans répéter la matrice desktop.
- **ÉCOSYSTÈME en ego graph** : réduction pure `buildMobileEcosystemLayout()` basée sur la projection canonique et l’agrégation déterministe existante. Deux voisins majeurs maximum par côté, focal dominant dans le premier viewport utile, compteur des relations regroupées, modes `main | influences` uniquement et résumé textuel du graphe pour les lecteurs d’écran.
- **Synchronisation + inspector** : VALEUR et ÉCOSYSTÈME partagent `selectedActivityId`, la navigation stage/activity et le mode relationnel dans le même composant client. `SectorMapInspector` reste le composant canonique et accepte désormais un rendu `embedded` dans un `AppDrawer` bottom sheet ; le contexte est conservé lors des changements de vue et de foyer.
- **Accessibilité mobile** : aucune interaction hover-only, contrôles visibles mesurés à 44 px minimum, focus visible, stages vides désactivés et annoncés, SVG décoratif masqué, alternative textuelle structurée du graphe, `prefers-reduced-motion` respecté.
- **Tests et QA 390×844** : 19 tests supplémentaires couvrent les trois fixtures, le plafonnement, la stabilité, BTP dense, Banque multi-positionnement/stage vide, Tourisme flux direct + retour de fidélisation et les influences typées. Captures réelles VALEUR/ÉCOSYSTÈME et contrôles Banque/Tourisme dans `/Users/dosta/.codex/visualizations/2026/08/10/019fec12-a4c7-7ce2-909c-055d0ac62b05/run4/`. Parcours navigateur validé : voisin ÉCOSYSTÈME → VALEUR conserve le maillon et l’inspector ; console sans erreur ni warning.
- **Validation** : `typecheck` → EXIT 0 · `test` → 107 fichiers / 1044 tests · `check:server-boundary` → EXIT 0 · `lint` → EXIT 0 · `build` → EXIT 0. Aucun paquet ni migration ajouté.

### Session 31 — Cartographie sectorielle RUN 3 : ÉCOSYSTÈME desktop (2026-08-10)
- **Projection relationnelle locale** : ajout de `SectorEcosystemDesktop`, branché dans le même composant client que VALEUR. Les onglets conservent `selectedActivityId`, le mode (`main | influences`) et le `SectorMapInspector` partagé ; une activité voisine devient le nouveau foyer sans perdre le contexte au changement de vue.
- **Layout déterministe maison** : `layoutEcosystemGraph()` pur, sans DOM ni hasard, place jusqu’à 4 relations entrantes et 4 sortantes autour d’un foyer dominant. Nœuds HTML à dimensions explicites, arêtes SVG courbes avec ports latéraux, intensité, libellés utiles et agrégation des relations parallèles. Aucun ELK/React Flow/D3 complet ni nouvelle dépendance.
- **Modes V1** : `Flux principal` sépare amont et aval ; `Influences` distingue prescription, financement et outillage depuis les `ecosystemLayers`. Aucun mode Tout, Comparer ou comportement mobile ajouté.
- **Tests** : nouveau fichier `sector-ecosystem-desktop.test.ts` — stabilité, bornes, absence de collisions, dominance focale, voisinages BTP/Banque/Tourisme, influences typées, agrégation, plafonnement et rendu partagé. Suite complète : 106 fichiers / 1025 tests passés.
- **QA desktop** : captures 1600×1000 de BTP, Banque et Tourisme dans `output/playwright/`, plus BTP Influences. Parcours navigateur validé : sélection ÉCOSYSTÈME → VALEUR → ÉCOSYSTÈME conserve le maillon et l’inspector.
- **Validation** : `typecheck` → EXIT 0 · `test` → 1025/1025 · `check:server-boundary` → EXIT 0 · `lint` → EXIT 0 · `build` → EXIT 0. Premier build relancé après arrêt du serveur de captures qui verrouillait `.next/diagnostics` ; build final compilé avec succès.

### Session 6 — Migration Cockpit vers le Design System (2026-06-16)
- **CockpitDesktopDashboard** : Migré vers `DesktopAnalyticalPage` — 4 `KpiCard`, zone principale 2-col (alertes staffing + goulots d'étranglement), rail `InsightCard` + `AlertBlock`, lowerContent table propositions avec `StatusPill`. `AppDialog` remplace le modal custom.
- **CockpitMobileDashboard** : Migré vers `MobileActionPage` + `MobilePageHeader` + `MobileHeroInsight` (pipeline pondéré Supabase réel) + 3 `MobileActionCard` avec `StatusPill`. `AppDialog` remplace le drawer custom. Labels debug `> 44px` et éléments de shell supprimés.
- **Tokens dataviz** : `bg-dataviz-1/2/3/4` utilisés pour le graphique goulots (cobalt, brass, bleu, vert) — aucun HEX.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · `db:types` idempotent · 0 HEX · 0 shadow · 0 gradient · 0 DataTable Mobile.

### Session 17 — Cockpit Intelligence : contextualisation par page + par entité (2026-07-02)
Suite de la Session 16 (panneau global) : ChatGPT avait défriché une architecture fonctionnelle complète (18 pages, contexte à 3 niveaux, 18 capacités) — analysée, critiquée (sur-ingénierie : `SelectionContext` sans aucune UI de multi-sélection existante, 18 capacités × 7 états combinatoires, "Brief décisionnel" LLM non branchable, tables `account_facts`/`projects`/`financial_models` jugées à tort hallucinées) puis ramenée à un scope exécutable, validé par Guillaume avant implémentation.
- **Correctif factuel en cours de route** : `mcp__supabase__list_tables` a révélé 58 tables live (vs 35 documentées ci-dessus, drift plus large que `project-migration-drift.md`) — `projects`/`project_phases`/`project_team_members` (3/10/9 lignes) sont réelles et déjà consommées par `/missions/projets` (`get-projects-list.ts`) ; `financial_models`/`candidate_hiring_milestones`/`account_facts`/`account_signals` existent aussi mais restent hors scope (branchées uniquement sur la route orpheline `/staffing`, non `account_facts`/`account_signals` vides, ou non consommées côté front pour l'instant).
- **Lot 0-1 — Page-level** (`intelligence-registry.ts` réécrit) : `ROUTE_MAPPINGS` couvre les 13 routes actives réelles de `main-menu.config.ts` (au lieu des anciennes routes génériques/obsolètes) — `/staffing` retiré (route orpheline, plus dans la nav depuis `/missions/opps`), `/prospection/suivi`, `/missions/actives`, `/missions/projets`, `/consultants/suivi-manager` ajoutées avec des actions différenciées par page (ex. `/missions/projets` ≠ `/missions/actives` ≠ `/missions` alors qu'ils retombaient tous sur le même triplet avant). Placeholders (`/knowledge`, `/automations`, `/consultants/suivi-manager`) : aucune action inventée, `/settings` supprime même le socle commun (`suppressCommon`) — pas d'action commerciale générique sur les réglages. "Socle commun" (8 cartes identiques partout) → "Plus d'actions" (4 actions transverses, accordéon `<details>` replié, pattern repris de `CommunicationBriefForm`).
- **Lot 2-3 — Entity-level** : `IntelligenceEntityContext.entityType` élargi de `"company"` à une union à 8 valeurs (`use-intelligence-context.ts`). `resolveEntityActions()`/`ENTITY_TYPE_LABELS` (registry) + nouveau composant `RegisterIntelligenceEntity` (registration légère : entityType/entityId/label, sans le `panelData` riche réservé au mode Compte) + `GenericEntityPanelContent`/`GenericEntityMobileContent` (badge identité + 3-4 actions contextuelles, pas de sections ressources/activité/contacts tant qu'aucune requête dédiée n'est branchée — honnête sur l'état réel du backend, zéro workflow n8n branché hors pitch/compte). Branché sur 4 entités à fort trafic / risque d'intégration faible :
  - `opportunity`/`mission`/`project` via un seul point d'accroche : `MissionsEntityPanel.tsx` (système d'onglets `/missions`, déjà unifié par `TabEntityType`). Piège évité : les onglets sont TOUS montés simultanément (masqués en CSS par `MissionsTabbedShell`) — nouveau prop `isActive` propagé jusqu'à `RegisterIntelligenceEntity` pour qu'un seul onglet inactif ne clobber pas le contexte de l'onglet actif.
  - `collaborator` via `ConsultantDrawer.tsx` (mono-instance, registration gated sur `open && collaboratorId && drawerData`).
  - `contact` via `ContactIdentityDrawer.tsx` (idem, gated sur `person` chargé pour éviter le label "Chargement...").
  - **Non fait** (scope volontairement borné) : `candidate`, `sector`, `calendar_event` — mêmes primitives réutilisables (`RegisterIntelligenceEntity` + entrée dans `ENTITY_ACTION_IDS`), juste pas câblées cette session (respectivement `CandidateDrawer`, `/prospection/approche-sectorielle/[slug]`, `EventDrawer` agenda).
- **Validation** : `tsc --noEmit` → EXIT 0 (après purge d'un `.next/` obsolète qui produisait 2 faux positifs `TS6200`/`TS2300` sans rapport) · `npm run build` → EXIT 0, les 20 routes attendues présentes (dont `/missions/projets`, `/consultants/suivi-manager`) · `eslint` sur les 9 fichiers touchés → 0 erreur (1 warning pré-existant sans rapport dans `ContactIdentityDrawer.tsx`).

### Session 16 — Cockpit Intelligence : panneau global contextuel, Lots 0-4 (2026-07-02)
Refonte validée par ChatGPT + Guillaume : panneau `IntelligencePanel`/`IntelligenceFAB` global unique (plus de `INLINE_INTELLIGENCE_ROUTES` bloquant les fiches comptes), suppression du doublon `IntelligenceRightRail` ("Tour de contrôle") sur la page compte.
- **Lot 0** (Codex, validé) : `account-panel-types.ts`, `intelligence-resource-types.ts` (classification canonique `result_type` → analyses/communications/reports/roadmaps, `phase=4` fallback legacy documenté seulement), `account-panel-data.ts` (`getAccountIntelligencePanelData`, RLS session utilisateur, contacts clés filtrés sur `relationship_role IN (decideur,dsi,direction_metier)` — jamais `decision_power`, volumes bornés 5 opps/5 events/6 contacts/5 runs).
- **Lot 1** : `use-intelligence-context.ts` (store Zustand minimal — seul pont possible entre la page et le panneau, sibling de `<main>` dans `AppShell`, hors React Context) + `RegisterIntelligenceContext` (hydrate/clear au montage/démontage). `IntelligencePanel`/`IntelligenceFAB` réécrits : 4 sections (Actions/Ressources/Activité/Contacts clés) quand `entityContext.entityType === "company"`.
- **Lot 2** : `CrmIdentityDrawerHost` global (`use-crm-drawer.ts`, store Zustand avec navigation retour company↔contact) monté dans `AppLayout`, remplaçant les 4 montages locaux de `CompanyIdentityDrawer`/`ContactIdentityDrawer` (`AccountsContactsViews`, `CockpitMobileDashboard`, `MissionSynthesisTab`, `OpportunityNeedTab`).
- **Lot 3** : navigation interne dans le panneau — clic "Pitch / mail" affiche `PitchMailDrawerContent` (INTEL-020) directement dans le panneau (desktop + FAB mobile) avec retour, sans quitter la page. `PitchMailDrawerContent`/`buildDefaultBrief` découplés de `ClientIntelligenceData` (ne consommaient que `company.{id,name,lifecycleStatus}` + `contacts`) → contrat minimal satisfait aussi bien par la page compte que par `AccountIntelligencePanelData`. Formulaire enveloppé dans `data-theme="cockpit"` pour le rendu cobalt/or.
- **Lot 4** : suppression de `IntelligenceRightRail.tsx` + de la barre "Actions rapides" locale et du drawer pitch/summary/campaign inline sur `ClientIntelligenceDesktopView`/`ClientIntelligenceMobileView` (desktop + mobile), tout redondant avec le panneau global. Les 2 messages de feedback qui vivaient dans le rail supprimé ("Lancement de l'analyse…", "Veille IA…") ont été relogés localement à côté de leurs boutons respectifs pour ne rien perdre.
- **Non fait** : Lot 5 (QA visuelle desktop + mobile) — à faire par Guillaume, pas de Chrome DevTools MCP disponible dans cette session.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 à chaque lot · ESLint propre sur les fichiers touchés (quelques warnings pré-existants sans rapport laissés en l'état : `getSource`/`RefreshIcon`/`SectionBlock`/`SignalList`/`PlusCircleIcon` non utilisés dans les deux vues).
- Merge fast-forward `design/kredo-visual-identity-exploration` → `main` (10 commits, incluant aussi le travail antérieur de la session : design lab identité visuelle, stabilisation INTEL-020) → déployé en production sur Vercel.

### Session 15 — INTEL-020 Rédaction assistée V1 (2026-07-01)
Contrat de référence : `INTEL-020-REDACTION-ASSISTEE-V1.md` (16 sections, 8 scénarios, cadre QUOI/QUI/COMMENT/CONTEXTE). Le document fait foi ; les écarts d'implémentation ci-dessous sont documentés (le document ne connaissait pas encore l'état réel du schéma/code au moment de sa rédaction).

**Lot 0 — Schéma + types :**
- **Migration** (`supabase/migrations/20260701120000_communication_brief_schema.sql`, appliquée live) : `company_id` nullable sur `ai_intelligence_runs`/`ai_intelligence_results` (usages hors compte, V1.5+) ; `primary_entity_type`/`primary_entity_id` + index partiel sur `ai_intelligence_runs` ; `context_snapshot`/`source_refs`/`qa_flags` sur `ai_intelligence_results`. **Écart voulu vs le document** : pas de colonne `brief_json` dédiée — le `CommunicationBrief` est stocké dans `ai_intelligence_runs.input_snapshot` (colonne déjà existante, même rôle).
- **`src/lib/n8n/types.ts`** : `N8nWorkflowId` — `intel-020-pitch-mail` renommé `intel-020-communication`. Nouveau contrat `CommunicationBrief` (what/who/how/context) + `CommunicationOutput` (subjects/body/key_points/source_refs/warnings) + `CommunicationSourceRef`/`CommunicationQaFlag`. `N8nCallbackPayload` étendu avec `contextSnapshot`/`sourceRefs`/`qaFlags`.
- **`src/lib/n8n/runs.ts`** : `saveResult()` persiste les 3 nouvelles colonnes ; `companyId` devenu `string | null`.

**Lot 1 — Workflow n8n (`n8n/workflows/intel-020-communication.json`, 13 nœuds, JSON validé + tout le JS syntax-checké) :**
Webhook → Validate & Extract Brief (vérif HMAC) → Update Run Status → Hydrate Context (Supabase REST) → Resolve Sender Identity → Assemble Prompt (system prompt fixe + 8 templates scénario) → Call LLM (Claude Sonnet, `claude-sonnet-4-6`) → Parse & Validate Output → Quality Check (5 contrôles) → Prepare/Callback. Gestion d'erreur par sortie `onError: continueErrorOutput` sur les nœuds à risque → `Prepare Failure Callback` (au lieu d'un Error Trigger séparé qui perdrait `runId`/`callbackUrl`). Checklist d'import/config VPS : `n8n/workflows/intel-020-communication.SETUP.md`.
**Corrections apportées au document original** (bugs qui auraient cassé le workflow à l'import) : table `engagements` → `missions` (n'existe pas) ; `interactions.date` → `occurred_at` ; `opportunities.status=eq.active` → `stage=not.in.(gagne,perdu,abandonne)` ; callback en camelCase (pas snake_case, pour matcher `N8nCallbackPayload`) ; auth webhook = HMAC-SHA256 `X-KREDO-Signature` (pas un Bearer statique) ; `signalRef` épinglé par UUID abandonné en V1 (aucune table de signaux adressable côté UI — `ClientIntelligenceData.signals` est un `string[]` extrait de JSON) → remplacé par une récupération auto des `sector_news` récentes via `companies.sector_id`.

**Lot 2 — UI (`src/components/accounts-contacts/intelligence/`) :**
- **`communication-brief-options.ts`** (nouveau) : taxonomies V1 (canal/scénario/longueur/rôle émetteur/type-persona-relation destinataire/objectif/ton) + `buildDefaultBrief()` (présélection depuis `company.lifecycleStatus`) + `personaFromRelationshipRole()`.
- **`PillSelect.tsx`** (nouveau) : grille de boutons-pilules single-select générique, exports `ScenarioSelector`/`ToneSelector`.
- **`ContactSelector.tsx`** (nouveau) : wrapper `<Select>` sur `data.contacts`, option "Non spécifié — « Madame, Monsieur »".
- **`CommunicationBriefForm.tsx`** (nouveau) : desktop = 4 accordéons `<details>` QUOI/QUI/COMMENT/CONTEXTE (natif, cohérent avec la philosophie "primitives natives" du design system) ; mobile = 3 champs essentiels (scénario/destinataire/ton) + "Plus d'options" repliée.
- **`CommunicationResult.tsx`** (nouveau) : objet/corps/points clés/sources/warnings, badge qualité (vert si `qaFlags` tous passés, orange sinon avec détail), Copier + **Enregistrer**.
- **`save-communication-interaction.ts`** (nouveau, Server Action) : persiste le résultat dans `interactions` (`type` dérivé du canal/scénario — `envoi_cv` pour `profile_submission`, sinon `email`/`linkedin`/`note` ; `details` JSON avec body/subjects/key_points).
- **`IntelligenceActionDrawers.tsx`** (`PitchMailDrawerContent` refondu) : ancien formulaire `messageType/objective/tone/targetContactId/additionalContext` remplacé par le `CommunicationBrief` complet. Émetteur résolu depuis `profiles.full_name` (pas de colonne `practice` sur `profiles` → practice devient un champ libre optionnel dans QUI). Realtime inchangé (branché sur `ai_intelligence_results`), juste retypé sur `CommunicationOutput`/`qa_flags`.
- **Types legacy retirés** : `PitchMessageType`/`PitchObjective`/`PitchTone`/`PitchDraftFormState`/`buildPitchDraftPayload` supprimés (`intelligence-action-types.ts`/`intelligence-action-utils.ts`) — `SummaryDrawerContent`/`CampaignDrawerContent` non touchés (hors périmètre V1).
- **`docs/client-intelligence-workflows.md`** : section B (`pitch_mail_generation`) marquée obsolète, pointe vers le nouveau contrat.

**Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · `eslint` sur tous les fichiers touchés → 0 erreur, 0 warning.

**Non fait dans cette session** (bloqué sur accès VPS, pas de MCP n8n) : import réel du workflow, configuration des variables d'environnement n8n, test de bout en bout des 8 scénarios avec données réelles, affinage des prompts sur retours qualité — voir checklist dans `n8n/workflows/intel-020-communication.SETUP.md`.

### Session 14 — Fiche Mission : refonte complète architecture + 5 onglets (2026-06-30)
- **Migration 041** (`supabase/migrations/20260630000000_041_calendar_events_mission_id.sql`) : colonne `mission_id uuid NULL REFERENCES missions(id) ON DELETE SET NULL` sur `calendar_events`. Index partiel WHERE mission_id IS NOT NULL. Appliquée live.
- **`database.generated.ts`** : Régénéré depuis Supabase (4681 lignes, `mission_id` dans calendar_events Row/Insert/Update).
- **`mission-detail-types.ts`** (nouveau) : `MissionDetailTabId` (5 valeurs), `MISSION_DETAIL_TABS`, `MissionDetailViewModel` complet avec `MissionSummary`, `MissionCompany`, `MissionCollaborator`, `MissionCollaboratorSkill`, `MissionActivityReport`, `MissionInteraction`, `MissionCompensation`, `MissionContact`. `RiskLevel` + `getRiskFromMetadata()`.
- **`mission-detail-utils.ts`** (nouveau) : Seuils métier centralisés (`ACTIVITY_THRESHOLDS`, `MARGIN_THRESHOLDS`). Fonctions pures : `parseDateOnly`, `getMissionDurationMonths`, `isEndingSoon`, `computeTotalRevenue`, `computeYtdRevenue`, `computeRealMarginPct`, `computeEstimatedContractValue`, `computeTheoreticalMarginPct`, `computeEstimatedMonthlySalary`, `buildCraAlerts`, `getPeriodLabel`, `isValidTabId`.
- **`get-mission-detail.ts`** (refonte) : ViewModel strict, 8 requêtes parallèles via `Promise.all`. Nouvelles données : `external_ref`, `hq_location`, `current_title`, `employee_ref`, `availability`, `exit_date`, `person_skills → skills` (level/years/confidence/source), `business_days`, `pto_days`, `sick_days`, `activity_rate_percent`, `tjm_snapshot`, `cjm_snapshot`, `planningEvents` (calendar_events by mission_id + fallback company_id + absences + closures).
- **`MissionDetailHeader.tsx`** (nouveau) : Badge Mission + external_ref + titre seul (sans compte) + info row avec pictogrammes (practice image, staffing, séniorité SVG, durée) + StatusPill + badge risque. Bloc identité client à droite : CompanyLogo + "Client" + nom. Dialog risque view/edit inline.
- **`MissionDetailTabs.tsx`** (nouveau) : 5 onglets typés, border-b-2 pattern identique ProjectDetailPanel.
- **`MissionSynthesisTab.tsx`** (nouveau) : 2 colonnes 2/3 + 1/3. KPIs marge théorique/réelle/TJM/nb CRA. Description, practice/role/seniority/durée, contacts avec drawer. Infos client (secteur, segment, siège, effectif, CA). Suivi + prochaine action. Documents (contrat, ODM, CRA). Edit dialogs : synthèse (titre/practice/séniorité/description) + activité (next_task/to_anticipate).
- **`MissionCollaboratorTab.tsx`** (nouveau) : Fiche identité centrée + statut + coordonnées. Compétences groupées par catégorie avec dots niveau. Top 5 en sidebar.
- **`MissionActivityTab.tsx`** (nouveau) : Alertes CRA (5 règles), KPIs taux global/YTD/jours produits. Jauge ActivityRateGauge avec seuil TARGET. Résumé absences (CP, maladie, non-facturable). Tableau CRA chronologique inverse avec barres color-coded multi-segments.
- **`MissionFinancialTab.tsx`** (nouveau) : CA total/YTD depuis CRA snapshots, marge réelle vs théorique. TJM/CJM/salaire/valeur contrat. Facturation (conditions, échéance, DSO explicitement absent). Tableau mensuel snapshot. Edit dialog : TJM/dates/payment_terms.
- **`MissionPlanningTab.tsx`** (nouveau) : Événements groupés par mois depuis `planningEvents`. Barre durée mission. Sidebar prochains événements + légende. Empty state informatif.
- **`MissionDetailDesktop.tsx`** (nouveau) : Orchestrateur desktop — header px-6, tabs, tab content scrollable.
- **`MissionDetailMobile.tsx`** (nouveau) : Header compact (logo + titre + company + chips statut/risque + 3 KPIs inline). Tabs scrollables. Dialog risque mobile.
- **`MissionDetailPanel.tsx`** (refonte) : Orchestrateur léger 130 lignes. Chargement/error/retry. Route vers Desktop/Mobile via `isMobile`. Skeleton loading animé.
- **`__tests__/mission-detail-utils.test.ts`** (nouveau) : 40 tests Vitest couvrant toutes les fonctions pures (parseDateOnly, margins, rates, alerts, DSO, contract value, salary).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · Tests 40/40 · 0 erreur lint dans nos fichiers · 0 HEX · 0 shadow · 0 recharts · DSO explicitement absent (note dans Financier).

### Dernière session
**Date :** 2026-06-16 (session 7)
**Travail effectué — Migration Finance vers le Design System (2ème écran de référence) :**
- **`finance-data.ts`** : Remplacement de `DEFAULT_PL_TIMELINE` hardcodé + vue `v_mission_quarterly_revenue` fantôme → requête réelle `pnl_monthly` (12 mois, colonnes GENERATED) + `opportunities.weighted_gain`. 4 KPIs calculés avec delta M/M. `LooseClient` supprimé, client typé natif.
- **`PnlBarChart.tsx`** (nouveau) : SVG module-spécifique, pattern `Trajectory2026Chart`. 2 barres groupées (CA cobalt, Marge brute vert) + ligne pointillée brass (Résultat op). Tooltip interactif sur clic. 0 HEX, 0 librairie externe.
- **`FinanceDesktopDashboard.tsx`** : `DesktopAnalyticalPage` + 4 `KpiCard` + `PnlBarChart` dans `SurfaceCard` + rail `InsightCard`/`AlertBlock`×2 + `DataTable<LateBilling>` en lowerContent (StatusPill delay, mono amounts, tri Client/Retard) + `AppDialog` dunning/bench/match/sync.
- **`FinanceMobileDashboard.tsx`** : `MobileActionPage` + `MobileHeroInsight` (marge brute, tone dérivé deltaTone) + 2 `MobileActionCard` (facturation urgente + anomalie bench) + `SurfaceCard` résultat op (StatusPill Bénéficiaire/Déficitaire + mini barres CA HTML/Tailwind 3 mois). `AppDialog` remplace le bottom sheet custom.
- **Suppressions** : `HeaderCalendar`, `HeaderAlerts`, avatar shell, carousel KPI mobile, DataTable mobile, SVG chart analytique mobile, toutes données fictives affichées en UI.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · 0 HEX · 0 gradient · 0 shadow · 0 DataTable Mobile · visuel Desktop + Mobile validé via navigateur (cookie `kredo_force_device=mobile`).

### Session 8 — Drawer Consultants : branchement person_skills (2026-06-16)
- **`ConsultantDrawer.tsx`** : requête étendue — `persons → person_skills → skills` (id, level, years, confidence, source, skill.name, skill.category). Single PostgREST call, 0 N+1.
- **`TabCompetences`** (remplace placeholder) : cartes triées (niveau ≥ 4 = "Principal" badge en premier, puis niveau décroissant, puis alpha). Affiche category, dots niveau 1-5, années. État vide "Aucune compétence renseignée".
- **`ConsultantsSyntheseDesktop.tsx`** : suppression du `<Link href="/consultants/[id]">` résiduel (overflow hover) — le clic de ligne ouvre déjà le drawer.
- **`ConsultantsSyntheseMobile.tsx`** : remplacement `href` → `primaryAction` avec `<Button>` déclenchant `ConsultantDrawer` (état local `selectedId` + `drawerOpen`).
- **Types** : `DrawerSkillRef`, `DrawerSkill`, `DrawerPerson.person_skills` ajoutés dans `consultant-drawer.ts`.
- **Suppressions** : route `/consultants/[id]`, `DesktopConsultantProfile.tsx`, `MobileConsultantProfile.tsx`, `src/types/consultant.ts` — 951 lignes supprimées.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 (route `[id]` absente du output) · lint → 0 erreur · visuel onglet Compétences validé (Python/Vue.js/Docker/PostgreSQL réels pour Antoine F.).

### Session 9 — ConsultantDrawer : refonte des 3 onglets (2026-06-16)
- **Onglet Synthèse** : "Intitulé du poste" → "Profil métier" ; "Entrée" → "Intégration" ; row financière restructurée en 3 cols égales : TJM moyen | Rentabilité YTD | CA généré YTD. Rentabilité YTD = (CA - coût employeur) / CA calculée depuis `cjm_snapshot` des CRA. Missions : puce `▸`, client en gras, dates début→fin, marge %, `StatusPill`.
- **Onglet Activité** : "Taux moyen" → "Productivité YTD" ; section "Absences & congés" ajoutée sous le graphique — données réelles `collaborator_absences` (`absence_type` est le nom exact de la colonne), triées du plus récent, avec type label français, dateRange et durée.
- **Onglet Compétences** : "Practice de rattachement" en tête (même format carte que "Profil métier") ; badge bleu "Principal" supprimé ; catégorie (`framework`, `devops`, etc.) déplacée sur la même ligne que le nom de la compétence, à sa droite, en petit gris.
- **Types** : `DrawerAbsence.absence_type` (pas `type`), `DrawerMission.company`, `DrawerActivityReport.cjm_snapshot`, `DrawerConsultantData.practice` + `absences`. `ConsultantMetrics.realMarginPct` ajouté.
- **Requête** : `practice`, `company:companies(name)`, `cjm_snapshot`, `absences:collaborator_absences(absence_type)` ajoutés à la query unique.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · 3 onglets validés visuellement (Antoine F. : rentabilité 33 %, 2 absences congés payés, practice Digital, compétences sans badge).

### Session 10 — Agenda : refonte architecture DB + front complet (2026-06-23)
- **Migration 026** (`supabase/migrations/20260623180000_026_calendar_events.sql`) : nouvelle table `calendar_events` (16 types en 3 familles Commerce/Management/Recrutement, RLS workspace, 6 index, triggers `private.set_updated_at` + `private.log_audit`). FK `tasks.calendar_event_id` (ON DELETE CASCADE). FK `interactions.calendar_event_id` UNIQUE (ON DELETE SET NULL). Suppression colonne `interactions.ends_at`. Suppression RPCs buggées `create_agenda_event` + `update_agenda_event`. Nouvelle RPC `create_calendar_event` SECURITY INVOKER avec validations complètes. Appliquée live.
- **`agenda-types.ts`** : `AgendaEvent` migré vers `title`, `event_type`, `starts_at`, `ends_at`, `description`, `candidate_id/candidate`. `AgendaEventFormInput` aligné.
- **`agenda-config.ts`** : 16 types sur 3 catégories avec `colorClasses`, `borderClasses`, `dotClass`, `shortLabel`. Helpers `COMMERCE_TYPES`, `MANAGEMENT_TYPES`, `RECRUTEMENT_TYPES` (Set), `AGENDA_CATEGORIES` (pour picker + filtre groupé).
- **`AgendaEventTypePicker.tsx`** (nouveau) : modale native `<dialog showModal()>` au-dessus des drawers. Step 1 = 3 cartes catégories animées (hover scale + glow radial). Step 2 = liste types avec dot coloré. 0 HEX.
- **`agenda-actions.ts`** : réécriture complète — requête sur `calendar_events` (chevauchement de plages), batch tasks en second appel, `createAgendaEvent` → RPC `create_calendar_event`, `updateAgendaEvent` direct Supabase + sync tâche, `deleteAgendaEvent` (CASCADE), `setAgendaEventStatus`, `getCandidatesForSelect` nouveau.
- **`AgendaEventDrawer.tsx`** (desktop) : `FormState` renommé, picker intégré, section candidat pour RECRUTEMENT, section CRM pour COMMERCE, task priorities `low/normal/high`, validation complète.
- **`AgendaMobileEventDrawer.tsx`** (mobile) : même migration, step 1 = picker type, step 2 = contexte candidat/CRM + tâche. `AgendaQuarterHourTimeField` intégré.
- **Renames display** : `AgendaEventBlock`, `AgendaEventPreview`, `AgendaMobileEventCard`, `AgendaWeekView`, `AgendaMonthView`, `AgendaMobileDateStrip`, `AgendaMobileViews`, `AgendaDesktopPage`, `AgendaMobilePage` — tous migrés `occurred_at→starts_at`, `type→event_type`, `summary→title`, `details.body→description`.
- **`AgendaToolbar.tsx`** : filtre `<optgroup>` par catégorie, `AGENDA_EVENT_TYPES` remplace `AGENDA_EVENT_TYPE_OPTIONS`.
- **Types DB** : `database.generated.ts` régénéré (4064 lignes, `calendar_events` + `create_calendar_event` RPC inclus).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · `✓ Compiled successfully in 6.1s`.

### Session 11 — Mise à jour des KPIs & section Compétences sur la page Opportunités (2026-06-24)
- **`globals.css`** : Ajout de `--color-info: #2E7D8C;` dans le thème Tailwind `@theme` pour corriger les pastilles et textes utilisant la couleur d'information `info` (comme l'état « CV envoyés »).
- **`page.tsx`** (page Opportunités `/missions/opps`) :
  - Intégration de `createClient` pour requêter dynamiquement la table `opportunity_candidates` sur Supabase.
  - Calcul dynamique du nombre de profils poussés pour les besoins (nombre d'opportunités en étape "CV envoyés" `cv_envoyes` et nombre de candidats/CVs associés).
  - Alignement des KPI cards avec le design de l'app : retrait de `size="compact"` pour utiliser la taille par défaut et ajout de `accent="brass"` sur le "Pipe pondéré" pour correspondre aux autres dashboards.
  - Création d'une disposition 3/4 - 1/4 sur grand écran : les KPIs prennent 3/4 de la largeur et une nouvelle section "Compétences" sous forme de `SurfaceCard` prend le 1/4 restant sous forme de placeholder en pointillés.
  - Suppression de la ligne (`border-b`) sous le titre de la page.
- **`get-opportunities-list.ts`** : Sélection et transmission des champs `website` et `metadata` des comptes (`companies`) pour alimenter les logos client dans les listes d'opportunités.
- **`OpportunitiesDesktopView.tsx`** :
  - Remplacement du filtre par groupes d'étapes par toutes les étapes d'opportunité individuelles précises (Qualification, Recherche profils, CV sent, Présentation client (RT), Abandonné, Gagné, Perdu).
  - Ajout d'un sélecteur de filtre de conviction (`< 70 %` et `> 70 %`).
  - Insertion du composant `<CompanyLogo>` devant le nom du client dans la colonne "Compte" de la table.
  - Limitation de la largeur de la colonne "Compte" (`width: "14rem"`, `min-w-0`, `truncate`) pour décaler la colonne "Opportunité" et les suivantes vers la gauche.
  - Alignement au centre (`align: "center"`) des en-têtes et contenus pour "Conviction" (avec `justify-center`), "TJM cible" et "Valeur (ACV)".
  - Affichage de la date de clôture exacte au format `"JJ/MM"` par un parsing robuste.
  - Ajout d'un sélecteur de filtre "Valeur" pour trier les opportunités par ordre de leur ACV (`Tri croissant` et `Tri décroissant`), avec le texte par défaut mis à jour à `"Valeur (ACV)"` (au lieu de `"Pas de tri"`).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0.

### Session 12 — Cockpit Intelligence : side panel persistant + FAB mobile (2026-06-26)
- **`intelligence-registry.ts`** (nouveau) : registre d'actions IA — `IntelligenceAction` (id, label, description, icon, category, status). ~20 actions contextuelles + 8 actions socle commun. `ROUTE_MAPPINGS` : 14 patterns pathname → actions. `resolveIntelligenceActions(pathname)` : résolution most-specific-match renvoyant `{ label, contextualActions, commonActions }`.
- **`use-intelligence-panel.ts`** (nouveau) : store Zustand v5 `{ isOpen, toggle, open, close }` avec persistance cookie `kredo_intelligence_open`.
- **`intelligence-icons.tsx`** (nouveau) : 18 `IntelligenceIconKey` → SVG path data. Composant `IntelligenceIcon` outlined.
- **`IntelligenceActionCard.tsx`** (nouveau) : carte action avec icône, label, description. Props `tone="dark"` (panel navy) / `tone="light"` (drawer mobile). Badge "Bientôt" quand `status === "coming_soon"`, bouton disabled.
- **`IntelligencePanel.tsx`** (nouveau) : side panel desktop `<aside>` persistent (pas `<dialog>`). Fond `bg-rail` navy, largeur `var(--layout-intelligence-width)` = 20rem. Détecte les pages avec intelligence inline (ex: fiche compte) → message d'opt-out. Sections : header puce live brass, actions contextuelles grille 2 cols, socle commun, liens rapides pages Intelligence, footer "Propulsé par n8n + IA".
- **`IntelligenceFAB.tsx`** (nouveau) : FAB mobile 56px `bg-primary`, icône sparkle. Position `fixed right-4 bottom-[calc(bottom-nav + safe-area + 0.75rem)]`, z-index `var(--z-fab)` = 45. Ouvre `AppDrawer side="bottom"` avec cartes ton `light`. Masqué sur pages inline intelligence.
- **`IntelligenceToggle.tsx`** (nouveau) : bouton header — rounded-lg, border, sparkle + "Intelligence" + puce live animée. État actif `bg-primary/10 text-primary`.
- **`AppHeader.tsx`** (modifié) : suppression badge "Réseau opérationnel" → remplacement par `<IntelligenceToggle />`.
- **`AppShell.tsx`** (modifié) : Desktop = `<main>` + `<IntelligencePanel />` en flex siblings. Mobile = `<IntelligenceFAB />` avant `<MobileNav />`.
- **`globals.css`** (modifié) : `--z-fab: 45`, `--layout-intelligence-width: 20rem`, `@keyframes kredo-intelligence-in`, `.kredo-intelligence-panel` (320ms slide-in).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · Desktop : panel side compresse le contenu principal, contextualisation vérifiée (Cockpit → 3 actions / Opportunités → 4 actions) · Mobile : FAB visible, bottom drawer contextualisé avec 12 actions (4 contextuelles + 8 socle commun).

### Session 13 — Module Recrutement : refonte filtres par viewMode + kanban hiring (2026-06-26)
- **`PageFilterSelect`** : prop `defaultValue` (défaut `"all"`) → texte grisé (`text-muted`) quand filtre sur valeur par défaut.
- **`EntityWorkspaceHeader`** : nouveau prop `subtitle?: ReactNode` — affiché sous le `<h1>` (utilisé pour le sélecteur de période recrutement).
- **`EntityWorkspaceTemplate`** : nouveau prop `headerSubtitle?: ReactNode` — propagé à `EntityWorkspaceHeader`.
- **`recruitment-stages.ts`** : ajout `HiringKanbanStageKey`, `HiringKanbanStageConfig`, `HIRING_KANBAN_STAGES` (6 étapes : prequalification → integration).
- **`update-hiring-step.ts`** (nouveau) : Server Action pour mettre à jour `candidate_hiring_processes.current_step` via `processId`.
- **`get-recruitment-workspace.ts`** : champ `hiringProcessId: string | null` ajouté à `RecruitmentWorkspaceRow`, alimenté depuis `latestHiringProcess.id`.
- **`RecruitmentKanbanView`** : colonnes migrées de `RECRUITMENT_STAGES` (staffing) → `HIRING_KANBAN_STAGES` (recrutement). `getColumnKey` = `row.hiringCurrentStep ?? "prequalification"`. `onMoveRow` type `(itemId, step: HiringKanbanStageKey) => void`.
- **`RecruitmentPlanningView`** : prop `year: number` → `scale: PlanningScale` ("week"|"month"|"quarter"|"year"). 4 builders : `buildWeekRange` (7 col jours), `buildMonthRange` (semaines du mois), `buildQuarterRange` (3 cols mois), `buildYearRange` (12 cols mois). `showToday` corrigé : `today >= range.start && today <= range.end` au lieu de comparaison d'année.
- **`RecruitmentWorkspace`** : filtres totalement refactorisés par viewMode :
  - **Liste** : étape (hiring steps), recrutement (oui/non), practice — `seniorityFilter` et `periodFilter` supprimés
  - **Kanban** : practice uniquement (gauche) + toggle "Candidats/↺" brass (droite, `secondaryActions`)
  - **Planning** : "Créer un événement" à gauche (`filters`), sélecteur "ÉCHELLE" brass à droite (`secondaryActions`)
  - **Header** : `PeriodSelector` sous le titre (S26 · du JJ/MM au JJ/MM + dropdown invisible) — remplace le filtre période retiré
  - **`handleMoveHiringStep`** : action kanban → `updateHiringStep(row.hiringProcessId, step)` avec rollback optimiste
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0.

### Session 18 — Reports & Rédaction : data layer Lot 1 (2026-07-03)
- **`src/app/(app)/reports/_data/reports-types.ts`** (nouveau) : contrat front exact `DocumentListItem` / `DocumentDetail` / `DocumentVersion` / `ReportsFilterState` / `ReportsKpis` + résultats de loaders et inputs de mutations (`saveAsDocument`, `updateDocument`) pour figer les noms/types attendus par les lots UI.
- **`get-reports-list.ts`** (nouveau) : liste paginée `intelligence_documents` avec filtres `search/documentType/status/entityType/entityId/ownerId/favoritesOnly/periodFrom/periodTo`, FTS via `textSearch("search_vector", ..., { config: "french", type: "websearch" })`, KPIs calculés en parallèle, résolution des labels polymorphes (`company/contact/opportunity/mission/project/collaborator/candidate/sector/calendar_event`) et `qualityOk` dérivé de la dernière ligne `intelligence_document_versions.qa_flags`.
- **`get-document-detail.ts`** (nouveau) : chargement strict d'un document + versions triées `version_number DESC` + liens enrichis avec labels métier. `current_content_*` lu depuis `intelligence_documents`, historique append-only lu depuis `_versions`.
- **`reports-actions.ts`** (nouveau) : `saveAsDocument` atomique sur `intelligence_documents` + `_versions` + `_links` avec rollback explicite si l'une des étapes échoue ; `updateDocument` crée toujours une nouvelle version `manual_edit` puis met à jour le document courant ; actions utilitaires `setDocumentFavorite` et `setDocumentStatus`. Helpers bas niveau `*WithClient()` ajoutés pour tests/service-role, avec `workspaceId` optionnel uniquement pour les scripts hors session auth.
- **Décisions non-triviales prises** : le filtre `entityType/entityId` passe par `intelligence_document_links` (pas seulement `primary_entity_*`) pour couvrir tous les rattachements ; les KPIs respectent les filtres actifs sauf `status` afin de rester informatifs quand l'utilisateur segmente déjà la liste par statut ; si `primaryEntity` est fournie mais absente des liens, elle est injectée en tête et devient la source de vérité dénormalisée du document.
- **Validation** : `npx tsc --noEmit` → EXIT 0 ; `npm run build` → EXIT 0 ; `eslint src/app/(app)/reports/_data/*.ts` → 0 erreur ; test ponctuel service-role via `saveAsDocumentWithClient()` validé (`documents=1`, `versions=1`, `links=1`) + rollback validé sur `entity_type` invalide (`rollbackCount=0`). Note locale Next 16 : `tsc --noEmit` nécessitait un shim `.next/types/routes.js` car le validateur généré importait `./routes.js` alors que Next n'émettait ici que `routes.d.ts`.

### Session 19 — REPORT-001 Lots 0-2 : fondation, fiche compte, rapports d'activité (2026-07-03/04)

Suite de la Session 18 (data layer bibliothèque). Plan séquencé validé après analyse critique d'une proposition ChatGPT (`report_documents` dupliquant `intelligence_documents` → rejeté, extension de la table existante à la place).

- **Lot 0 — Fondation** (`supabase/migrations/20260703120000_report_001_foundation.sql`) : 9 valeurs ajoutées à `intelligence_document_type` (rapports). `intelligence_documents` étendue (`scope_json`, `period_start/end`, `data_cutoff_at`, `approved_by/at`). `compute_conviction_score_v1(company_id)` / `compute_investment_score_v1(company_id)` — scores déterministes `/5` versionnés, le LLM les explique mais ne les recalcule jamais. CORE-001 (`api/n8n/trigger`) généralisé : `entityType`/`entityId` remplacent le `companyId` unique (rétrocompatible — les appelants existants n'ont rien eu à changer), `entityType="workspace"` pour les rapports transverses.
- **Lot 1 — Fiche de synthèse compte** (absorbe l'ancien INTEL-021, jamais implémenté) : RPC `get_account_summary_facts` (migration `20260703150000`, un seul appel service_role remplaçant 8+ requêtes REST). Workflow n8n `report-account-summary.json` (15 nœuds, pattern Webhook→HMAC→Hydrate→LLM→QA→Callback signé). `AccountSummaryReportView.tsx`. `SummaryDrawerContent` dans `IntelligenceActionDrawers.tsx` entièrement réécrit (était un formulaire mort, jamais branché) sur le pattern Realtime (`ai_intelligence_results` filtré par `run_id`). Testé de bout en bout en production (Ascoma, Exail Robotics) après configuration du secret HMAC dans les 2 nœuds Crypto n8n (`Verify Signature` + `Sign Callback` avaient gardé le placeholder `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET`).
- **Lot 2 — Rapports d'activité commerciale + recrutement** : 2 nouvelles RPC déterministes (`supabase/migrations/20260704120000_report_activity_facts_rpc.sql`) :
  - `get_activity_commercial_facts(workspace_id, period_start, period_end, as_of_date)` — anti-double-comptage `interactions`/`calendar_events` **par construction temporelle** (réalisé = `occurred_at` passé, planifié = `starts_at` futur — les deux ensembles ne se recouvrent jamais, aucune déduplication explicite sur `calendar_event_id` nécessaire). Mouvements du pipe (créées/gagnées/perdues), snapshot pipe ouvert, opportunités sans action récente, prochaines actions, répartition par commercial (`owner_id`) et secteur. Caveat documenté : pas de `opportunity_stage_history`, donc pas de suivi des avancées d'étape intermédiaires.
  - `get_activity_recruitment_facts(...)` — 2 funnels distincts jamais fusionnés : recrutement interne (`candidate_hiring_processes.current_step`, aligné sur `HIRING_KANBAN_STAGES`) et positionnement sur besoin (`opportunity_candidates.status`, aligné sur `RECRUITMENT_STAGES`). Offres en attente, disponibilités proches, répartition par practice et origine. Caveat documenté : pas d'historique horodaté des transitions d'étape → temps moyen par étape non calculable en v1.
  - **Piège corrigé en cours de route** : `job_profiles.practice_id`/`candidates.practice_id` référencent la table réelle `offer_practices` (confirmée via `information_schema`), pas une table générique `practices` (qui n'existe pas en live malgré sa présence dans `database.generated.ts` — nouveau symptôme du drift déjà documenté Session 17).
  - Workflows n8n `report-activity-commercial.json` / `report-activity-recruitment.json` (même squelette 15 nœuds que Lot 1, généré par dérivation Python puis relu intégralement — `entityType="workspace"` sans `companyId`).
  - `ActivityCommercialReportView.tsx` / `ActivityRecruitmentReportView.tsx` (nouveaux, `src/components/reports/`).
  - **`ActivityReportModal.tsx`** (nouveau, composant générique unique pour les 2 rapports — évite la duplication demandée par Guillaume) : sélecteur de période (semaine/mois/trimestre/année/personnalisée, calculée "début de période → aujourd'hui"), instructions complémentaires, déclenchement + Realtime + vue résultat + bouton "Enregistrer dans la bibliothèque", même pattern que `SummaryDrawerContent`.
  - **Modale factice supprimée** : `SuiviDesktopView.tsx`/`SuiviMobileView.tsx` avaient un bouton "nouveau rapport" et une modale "Créer un nouveau rapport d'activité" **jamais branchés** (`handleGenerateReport` faisait un `setTimeout` de 1.2s puis affichait un faux succès) — remplacés par `<ActivityReportModal reportType="activity_commercial" />`. Même composant réutilisé dans `RecruitmentWorkspace.tsx` (nouveau bouton "Nouveau rapport" desktop + mobile) avec `reportType="activity_recruitment"`.
  - `save-as-document.ts` : `mapResultTypeToDocumentType` étendu (`activity_commercial`/`activity_recruitment`), nouvelle fonction `getContentPeriod()` qui propage `facts.period.{startDate,endDate}` vers les colonnes `period_start`/`period_end` d'`intelligence_documents` (les rapports périodiques en ont besoin, contrairement à `client_summary`). `api/n8n/callback/route.ts` : `isEligibleDocumentResult` étendu aux 2 nouveaux types (auto-sauvegarde en bibliothèque à la réussite, comme `client_summary`).
- **Validation** : RPCs testées en direct sur données réelles (résultats cohérents : 72 RDV réalisés, 16 opportunités ouvertes, 1.19M€ pipe pondéré par commercial ; funnel recrutement avec 6 étapes peuplées, 5 offres en attente). `npx tsc --noEmit` → EXIT 0. `npm run build` → EXIT 0 (toutes routes générées). `eslint` sur les 9 fichiers touchés/créés → 0 erreur (17 warnings pré-existants sans rapport, aucun nouveau). Syntaxe JS des 12 nœuds `code` des 2 nouveaux workflows n8n validée via `node --check`.
- **Non fait dans cette session** : import/activation des 2 nouveaux workflows sur le VPS n8n (checklist identique à `report-account-summary` : configurer le secret HMAC dans les nœuds `Verify Signature`/`Sign Callback`). Filtres de périmètre (`scope.companyIds/sectorIds/ownerIds`) non exposés en UI — la RPC les accepte en signature future mais `ActivityReportModal` n'envoie que la période en V1 (parité avec `buildAccountSummaryBrief`, scope `{}`).

### Session 20 — ADR-0009 génération de pitch : Lots 0-3 (2026-07-04)

Suite d'une session de brainstorming produit (skill `product-brainstorming`) qui a tranché l'articulation entre le prototype "notebook commercial" du playbook sectoriel (`PlaybookPage.tsx`, en cours par ailleurs) et la génération de pitch : le **compte prime sur le secteur** — le playbook sectoriel reste une source de contexte macro (chaîne de valeur, concurrence, réglementation transverse), non raboté cette session (Q3 : ajustement différé à après usage réel). Le cadrage quick-win (mission 3-6 semaines) est explicitement mis hors scope, traité comme objet séparé futur (Q2). L'onglet dédié à la génération de pitch (Q1) n'a **pas** nécessité de nouvel onglet : l'audit de `ClientIntelligenceDesktopView.tsx` a révélé que la barre à 6 onglets du cockpit compte réservait déjà `strategie` (lot H, *"angle d'approche, messages clés, interlocuteurs"*) — description qui matchait mot pour mot le besoin. `enjeux` (lot F) reste le futur emplacement du matching offre↔compte visuel ; `roadmap` (lot G, Phase 4) reste le grand frère stratégique, hors scope.

- **Lot 0 — Types** : `src/lib/n8n/types.ts` — `CommunicationChannel` += `spoken_pitch_30s`/`meeting_briefing` ; `CommunicationScenario` += `cold_call_pitch`/`meeting_prep_discovery`/`meeting_prep_cross_sell` ; `CommunicationBrief.context.offerRef` (ancrage catalogue obligatoire) ; nouveaux contrats `SpokenPitchOutput`/`MeetingBriefingOutput` (discriminés par `kind`, distincts de `CommunicationOutput`). **Aucune migration de schéma** : `run_type`/`result_type` sont du texte libre sans CHECK, et `commercial_pitch` existait déjà dans l'enum `intelligence_document_type`, câblé bout en bout (`save-as-document.ts`, `api/n8n/callback/route.ts`, `document-display.ts`, `v_ai_intelligence_summary.has_legacy_pitches`) sans jamais avoir été nourri de contenu réel.
- **Lot 1 — RPC `get_pitch_context`** (`supabase/migrations/20260704180000_pitch_context_rpc.sql`) : hydratation compte + offre confirmée + grille tarifaire + practices déjà livrées/suggérées (matching cross-sell v1 par règles) + opportunité/mission d'ancrage + interactions + intelligence sectorielle + pitchs précédents + few-shot FOLIO + scores déterministes. **Piège découvert et documenté explicitement dans le SQL** : `missions.practice` est un texte libre historique (`Cloud`/`Cybersecurity`/`Data`/`Design`/`Digital`/`Mobile`/`Product Management`/`Project Management`/`QA`) qui ne correspond à aucun `offer_practices.slug` réel — mapping heuristique en CASE SQL, dette documentée (pas de FK `missions.practice_id`). `offer_pricing_grids.offer_id` n'est jamais peuplé en vrai (0/120 lignes) — la jointure grille↔offre passe par `practice_id`, pas `offer_id`. Testé sur données réelles : Voyage Privé (7 missions Digital/PM/QA → suggère Cloud/Cyber/Data & AI/Legacy), Arkopharma (prospect, `practices_fit` sectoriel réel `cyber:4, data_ai:5`).
- **Lot 2 — Extension `intel-020-communication.json`** (16 nœuds, patché via script Python plutôt qu'édition manuelle du JSON pour éviter les erreurs d'échappement) : `Validate Brief` exige `context.offerRef` pour les 2 canaux pitch (no-go, requête rejetée sinon) ; `Hydrate Context` bascule sur `get_pitch_context` par expression conditionnelle (pas de nouveau nœud) ; `Assemble Prompt` ajoute 2 templates système + `PITCH_SCENARIO_MISSIONS`, contexte grille tarifaire/practices/mission-ancre formaté séparément ; `Parse & Validate Output` valide `kind`/champs requis par canal ; `Quality Check` ajoute `has_offer_ref`/`word_count_in_target`/`has_call_to_action`/`no_price_commitment`/`arguments_have_evidence` ; `Prepare Callback` route vers `result_type: "commercial_pitch"`. **Zéro nouveau workflow n8n** (décision ADR-0009 tenue). Validation : `node --check` sur les 6 nœuds `code` modifiés + exécution réelle (pas seulement syntaxique) via harnais Node avec mocks réalistes pour les deux branches (pitch et non-pitch) — a débusqué 2 bugs avant mise en prod : `data_points_to_mention`/`close_options` absents du texte scanné par `no_price_commitment`, et regex d'atténuateurs de prix sensible aux accents (corrigés). Non-régression du chemin email confirmée. `intel-020-communication.SETUP.md` complété (§8).
- **Lot 3 — UI** : `get-suggested-offers.ts` (Server Action, résout `workspace_id` via `profiles` — **pas** via `current_workspace_id()` qui vit dans le schéma `private`, non exposé PostgREST, donc jamais appelable en RPC depuis le front). `OfferPicker.tsx` (sélection catalogue obligatoire, practices suggérées groupées en tête). `PitchResult.tsx` (rendu `SpokenPitchOutput` en 5 blocs + barre de progression 30s, `MeetingBriefingOutput` en sections — pas de bouton "journaliser comme interaction" en v1, scope volontairement coupé). `CommunicationBriefForm.tsx`/`IntelligenceActionDrawers.tsx` : branchement conditionnel sur `isPitchChannel`, bouton "Générer" désactivé tant que `offerRef` manque, résultat routé vers `PitchResult` ou `CommunicationResult` selon présence de `kind`. `intelligence-data.ts` : nouveau champ `pitchDocuments` (historique réel `commercial_pitch` depuis `intelligence_documents`, distinct de `pitches` legacy FOLIO). Onglet `strategie` (desktop + mobile) : `ComingSoon`/placeholder remplacé par historique + bouton `ContextualCommunicationButton entryPoint="account_pitch"` — réutilise le mécanisme générique `openCommunicationComposer`/`CommunicationComposerHost` déjà existant, aucune nouvelle plomberie de drawer.
- **`database.generated.ts`** régénéré (5898 lignes) pour exposer `get_pitch_context` aux types Supabase — la commande MCP `generate_typescript_types` renvoie un JSON `{"types": "..."}`, pas du TS brut ; erreur évitée de justesse (le premier essai avait copié le JSON tel quel dans le fichier `.ts`).
- **Validation** : `npx tsc --noEmit` → EXIT 0 (hors 2 erreurs `.next/types` stale déjà documentées Session 18) à chaque lot. `npm run build` → EXIT 0, toutes routes générées. `eslint` sur tous les fichiers touchés/créés → 0 erreur (4 warnings pré-existants sans rapport, `getSource`/`SignalList`/`PlusCircleIcon`/`RefreshIcon`, déjà documentés Session 16).
- **Non fait dans cette session** : import/activation du workflow modifié sur le VPS n8n (secret HMAC déjà configuré depuis Session 19, réimporter le JSON à jour suffit). Onglet `enjeux` (lot F, cartographie enjeux × offres) toujours `ComingSoon` — le matching offre↔compte existe déjà côté RPC (`suggestedPractices`/`deliveredPractices`) mais n'a pas de vue dédiée. Bouton "voir un pitch précédent" du Stratégie renvoie vers `/reports` filtré plutôt qu'un aperçu inline. Pas de test réel avec le LLM Anthropic (validé uniquement via mocks Node) — premier test en conditions réelles à faire après import VPS.

### Session 21 — ADR-0011 Score de Priorité Commerciale : Lot 0 (2026-07-06)

Suite d'un brainstorming produit (skill `product-brainstorming`) critiquant et enrichissant une proposition ChatGPT de refonte du "scoring IA" hérité de FOLIO. Verdict tranché dans ADR-0011 (non committé en fichier, voir transcript) : le score `companies.ai_score` (1–5, jamais historisé, jamais expliqué) est un gadget en l'état — 0/95 comptes ont `account_facts`/`account_signals` peuplés, 80 % du parc n'a aucune opportunité, 85 % aucun `sector_id`. Décision : construire le socle de preuve **avant** le moteur de scoring, pas l'inverse. Roadmap séquencée en 6 lots (Lot 0 fait cette session, Lots 1-6 à déclencher).

- **Lot 0 — Dépréciation du score FOLIO** (`supabase/migrations/20260706140641_027_deprecate_folio_score_apply_v2.sql`) : `companies.ai_score` renommé `companies.legacy_folio_score` + commentaire de colonne explicite. **4 objets SQL déjà en prod** repointés sur la colonne renommée **sans changer leurs clés JSON de sortie** (`v_ai_intelligence_summary.ai_score`→`legacy_folio_score` — colonne non consommée côté front, vérifié par grep avant migration — mais `get_account_summary_facts` clé `'aiScore'`, `get_communication_context`/`get_pitch_context` clé `'ai_score'` **conservées à l'identique** car ce sont des contrats consommés par des workflows n8n déployés sur le VPS, non réimportables/retestables cette session). `v_ai_intelligence_summary` a dû être `DROP` + recréée (pas `CREATE OR REPLACE`) : Postgres refuse de renommer une colonne de vue existante via `REPLACE` (erreur 42P16) — dépendances vérifiées vides via `pg_depend` avant le drop.
- **Piège opérationnel rencontré** : le premier appel `apply_migration` a été passé avec un contenu placeholder au lieu du SQL réel — a créé une entrée de migration vide dans `supabase_migrations.schema_migrations` sans toucher au schéma. Détecté par vérification post-migration (`information_schema.columns` montrait toujours `ai_score`), corrigé en ré-appliquant le SQL réel puis en supprimant la ligne de tracking erronée. Le fichier local de migration a été renommé pour matcher exactement le timestamp effectivement appliqué en base (`20260706140641`), pas celui écrit initialement — évite un drift local/remote dès la création de la migration.
- **Renommage front** (~24 fichiers, `ai_score`→`legacy_folio_score` en snake_case DB, `aiScore`→`legacyFolioScore` en camelCase domaine) : `sector.ts`, `database.types.ts` (snapshot stale mais son unique consommateur ne touchait pas ce champ — corrigé pour cohérence), `database.generated.ts` (régénéré via MCP), toutes les requêtes `.select()`/`.order()` sur `companies`, `portfolio-account-metrics.ts`, `intelligence-data.ts`, `account-panel-data.ts`, `sector-activation-data.ts`, `mobile-priority-view-model.ts`, etc. **Exemptés délibérément** : `reports-types.ts`/`AccountSummaryReportView.tsx` — ils consomment directement la clé JSON `aiScore` de `get_account_summary_facts`, laissée inchangée pour la raison ci-dessus.
- **Retrait `ScorePill` du header cockpit** (`ClientIntelligenceDesktopView.tsx`, `ClientIntelligenceMobileView.tsx`, 3 emplacements : header desktop, header compact mobile, onglet Scoring mobile lot E) : composant supprimé de `intelligence-parts.tsx`, remplacé par `ScorePlaceholder` (même emplacement visuel, bordure pointillée, "—" + "Score en refonte") — plus aucune valeur legacy trompeuse affichée en prod.
- **Piège BSD sed** : le premier passage de renommage utilisait `\b` (word-boundary) avec `sed -E` sur macOS — silencieusement no-op (BSD sed ne supporte pas `\b` dans ce contexte), les fichiers étaient marqués "OK" sans qu'aucune substitution n'ait eu lieu. Détecté par grep de vérification post-rename, corrigé en repassant sans ancre `\b` (safe ici : `ai_score`/`aiScore` jamais en sous-chaîne d'un autre identifiant, vérifié par regex avant le remplacement).
- **Validation** : `npx tsc --noEmit` → EXIT 0 (après purge `.next/` stale). `npm run build` → EXIT 0, 32 routes générées. `eslint` sur les ~28 fichiers touchés → 0 erreur (20 warnings pré-existants sans rapport, aucun nouveau). Tests Vitest `build-mobile-priority-view-model.test.ts`/`resolve-mobile-primary-action.test.ts` → 21/21 passés. RPC `get_communication_context` testée en direct sur données réelles : clé `ai_score` retourne bien la valeur de `legacy_folio_score` (4.0), confirmant que le contrat n8n est intact.
- **Non fait dans cette session (Lots 1-6 de l'ADR)** : alimentation `account_signals` depuis `sector_news`/`sector_regulatory_items`/`metadata.analysis_data.signaux` (Lot 1, préalable obligatoire avant tout moteur de scoring — sans lui le composant "signaux d'achat" reste à 0 partout) ; schéma `account_score_runs`/`account_score_components`/`account_score_feedback` (Lot 2) ; moteur TypeScript `src/lib/account-scoring/` (Lot 3) ; UI header + modale détail (Lot 4) ; backfill initial (Lot 5) ; intégrations transverses CRM/weekly brief (Lot 6, volontairement différé après retour d'usage réel — pas de branchement dans les prompts pitch/mail, décision ADR explicite).

### Session 21 (suite) — ADR-0011 Lot 1 : backfill account_signals (2026-07-06)

- **Migration** (`supabase/migrations/20260706142205_043_account_signals_backfill_v2.sql`) : 735 lignes insérées dans `account_signals` (0 lignes avant), 93 comptes couverts. 3 sources, 6 blocs `INSERT ... ON CONFLICT (workspace_id, dedupe_key) DO NOTHING` (idempotent, vérifié par ré-exécution — toujours 90 lignes `folio_growth_trend`, pas de doublon) :
  - **FOLIO** (`companies.metadata.analysis_data.signaux`) : **découverte en cours de route** — ce n'est PAS un tableau de signaux comme supposé dans l'ADR initial, mais un objet à 4 facettes fixes (`actualites_recentes` tableau de strings, `tendance_croissance`/`recrutements_recents`/`indices_maturite_digitale` strings uniques). 460 `folio_news_item` + 90 `folio_growth_trend` + 34 `folio_hiring_signal` + 89 `folio_digital_maturity`. Exclusion des valeurs vides sur `recrutements_recents`/etc. en **égalité exacte** (`trim+lower NOT IN ('non trouvé','non trouve')`), pas en sous-chaîne — vérifié que 6 valeurs contenant "non trouvé" en sous-chaîne restaient informatives (ex. "Non trouvé - contexte de PSE et fermetures de sites suggère absence de recrutements"), un filtre substring les aurait perdues à tort. `confidence_score` fixé à 0.5 (donnée legacy non structurée). `detected_at`/`expires_at` dérivés de `metadata.imported_at` (identique pour les 93 comptes, import FOLIO unique du 2026-06-09) + 60 jours.
  - **`sector_news`** (90 derniers jours) : 49 lignes, uniquement pour les comptes avec `sector_id` renseigné (14/95). `confidence_score`/`relevance_score` = `sn.relevance_score` réel (déjà 0–1). `urgency_score` = 0.7 si `is_trigger_event`, sinon 0.
  - **`sector_regulatory_items`** (urgency high/critical, échéance future ou non datée) : 13 lignes. `confidence_score`/`urgency_score` par mapping déterministe sur `urgency` (critical→0.9, high→0.7/0.6).
- **Bug corrigé en cours de route** : `urgency_score`/`relevance_score`/`confidence_score` sur `account_signals` sont **NOT NULL avec défaut 0.000** (pas nullable comme supposé) — le premier essai d'`apply_migration` a échoué sur `CASE WHEN ... ELSE NULL END` pour `urgency_score` (contrainte NOT NULL). Corrigé en `ELSE 0` (le schéma encode "pas de signal" comme 0, pas NULL). La transaction ayant échoué a bien tout annulé (0 lignes avant correction, vérifié).
- **Même piège qu'au Lot 0** : le nom de migration local ne matchait pas le timestamp réellement appliqué en base — fichier renommé `20260706142205_043_account_signals_backfill_v2.sql` pour matcher exactement l'entrée dans `supabase_migrations.schema_migrations`.
- **Numérotation cosmétique** : renommé de "028" (déjà pris par `20260624095554_028_expand_interactions_type.sql`) vers "043" (prochain numéro libre après le `042_intelligence_documents` le plus haut) — cosmétique uniquement, Supabase utilise le timestamp comme clé, pas le nom (drift déjà documenté [[project-migration-drift]]).
- **Advisors Supabase** (security + performance) vérifiés après migration : aucune alerte nouvelle liée à `account_signals` ou à ce backfill — les seules mentions (`unindexed_foreign_keys` sur `company_id`/`primary_source_id`/`recommended_practice_id`/`run_id`/`suggested_contact_id`) sont pré-existantes à la création de la table (hors scope Lot 1, pas touchées).
- **Non fait** : `account_facts` reste vide (0 lignes) — hors scope Lot 1, l'ADR ne l'a jamais priorisé pour la V1 du scoring (les signaux qualitatifs suffisent pour le composant C3, `account_facts` sert plutôt à des attributs structurés type taille/CA qui existent déjà en dur sur `companies`). Pas de `intelligence_sources`/`primary_source_id` créés pour tracer la provenance individuelle des signaux sector_news/regulatory (laissé `NULL` — amélioration possible mais pas bloquante pour Lot 2/3).

### Session 21 (suite) — ADR-0011 Lot 2 : schéma account_score_* (2026-07-06)

- **Migration** (`supabase/migrations/20260706160000_044_account_score_schema.sql`) : 3 tables + 1 vue.
  - **`account_score_runs`** : une ligne par recalcul (append-only, jamais d'UPDATE d'un run existant — comme `ai_intelligence_runs`). `score_value`/`confidence_score` 0–100 CHECK, `score_band` IN (A/B/C/D/U — U="Unqualified"), `trigger_source` IN (manual/weekly_brief/signal_update/import/system), `lifecycle_context` = snapshot texte de `companies.lifecycle_status` au moment du calcul (pas une FK vivante). Index `(workspace_id, company_id, calculated_at DESC)` couvrant à la fois la FK `company_id` et la requête "dernier run par compte".
  - **`account_score_components`** : une ligne par facteur (C1–C6 de l'ADR §4.1). `UNIQUE(score_run_id, component_key)` sert aussi d'index couvrant la FK — pas d'index dédié nécessaire. `evidence_refs jsonb` = tableau `{table, id}` pointant vers les lignes sources (traçabilité exigée par l'ADR, zéro score opaque).
  - **`account_score_current`** (vue, `security_invoker=true`) : `DISTINCT ON (company_id) ... ORDER BY calculated_at DESC` — seule vue à consommer côté app pour le score courant.
  - **`account_score_feedback`** : retours qualitatifs utilisateur sur un run (too_high/too_low/right), non branché en V1 (Lot 6+).
  - **Pas de `score_profile`** (acquisition/expansion/rétention/réactivation) — décision ADR tenue : une seule grille + `lifecycle_multiplier` par composant, pas 4 grilles à maintenir sans matière statistique pour les valider (95 comptes, 15 avec pipe).
- **Pattern repris de `private.validate_account_signal()`** (Lot 1) : 3 nouveaux triggers `private.validate_account_score_{run,component,feedback}()` — vérifient en défense-en-profondeur que le `workspace_id` de l'enfant correspond bien à celui du parent référencé (company/run), en plus de la RLS. Testé positif (insert normal → OK) et négatif (insert avec workspace mismatch → rejeté avec `RAISE EXCEPTION`, vérifié par un appel direct hors bloc `EXCEPTION` pour obtenir la preuve dans la sortie de l'outil).
- **RLS** : 4-policy uniforme sur les 3 tables (SELECT/UPDATE/DELETE scoped `workspace_id = private.current_workspace_id()`, INSERT `WITH CHECK (true)` — le `DEFAULT current_workspace_id()` + le trigger de validation garantissent l'isolation, pas le `WITH CHECK`). **Découverte en cours de route** : `current_workspace_id()`/`is_workspace_admin()`/`set_updated_at()`/`log_audit()` vivent tous dans le schéma **`private`**, pas `public` comme l'affirme la section "Fonctions Postgres (public)" plus haut dans ce document — drift documentaire supplémentaire (cf. [[project-migration-drift]]), à corriger un jour mais pas cette session. `account_signals` confirme aussi que `workspace_id` FK-référence explicitement `workspaces(id) ON DELETE CASCADE` et que les FK vers un utilisateur pointent vers `profiles(id)`, jamais `auth.users(id)` directement — pattern repris ici (`triggered_by`, `user_id`).
- **Aucune colonne `updated_at`/trigger `set_updated_at`/`log_audit`** sur les 3 tables — décision délibérée (pas une omission) : ce sont des lignes historisées append-only (un recalcul = une nouvelle ligne), comme `intelligence_document_versions` qui suit le même principe et n'a ni `updated_at` ni trigger.
- **Advisors Supabase** vérifiés post-migration : les 3 tables déclenchent le même WARN `rls_policy_always_true` sur INSERT que 6 tables déjà existantes (`intelligence_documents`, `intelligence_document_versions`, `projects`, etc.) — pattern déjà accepté dans ce codebase, rien de nouveau introduit.
- **Validation** : `npx tsc --noEmit` → EXIT 0 après régénération de `database.generated.ts` (24 occurrences des 4 nouveaux objets confirmées). Test fonctionnel direct en base : insert run+component réussi, vue `account_score_current` retourne bien la dernière ligne, insert avec workspace erroné rejeté par le trigger (`Workspace mismatch between score run and company`), données de test nettoyées après vérification.
- **Non fait** : GRANT explicites non nécessaires (les tables héritent des privilèges par défaut du schéma `public`, comme `account_signals` avant elles — vérifié, pas de différence de comportement).

### Session 21 (suite) — ADR-0011 Lot 3 : moteur de scoring TypeScript (2026-07-06)

- **RPC `get_account_score_context`** (`supabase/migrations/20260706170000_045_account_score_context_rpc.sql`) : hydratation déterministe (company, sector via practices_fit, contacts agrégés, opportunités agrégées, missions actives, interactions 90j, signaux actifs non expirés limités à 30). **Différence volontaire vs les RPC pitch/communication/reports** : `SECURITY INVOKER` + `GRANT EXECUTE TO authenticated` (pas `service_role`) — c'est l'utilisateur connecté qui déclenche le recalcul via le bouton "Actualiser", pas un workflow n8n. Testée sur données réelles (ACRI-ST : 14 contacts, 1 opp ouverte 61,9k€ pondéré, 8 signaux FOLIO).
- **Module `src/lib/account-scoring/`** (10 fichiers + 1 test) :
  - `types.ts` — contrat exact du RPC (`AccountScoreContext`) + types du moteur pur (`RawScoreComponent` → `ScoreComponentResult` après pondération, `AccountScoreResult`).
  - `score-config.ts` — `BASE_WEIGHTS` (C1 20/C2 25/C3 20/C4 15/C5 20/C6 15 bonus), `LIFECYCLE_MULTIPLIERS` par bucket (prospect/active/dormant, décision ADR tenue : pas de `score_profile` multiple), `getLifecycleBucket()` (client_actif→active, client_dormant/ancien_client→dormant, tout le reste→prospect), seuils de bande A/B/C/D/U.
  - `components/compute-c{1..6}-*.ts` — 6 fonctions pures, une par facteur. **Piège découvert en testant la RPC sur données réelles** : les signaux FOLIO backfillés au Lot 1 ont `relevance_score`/`urgency_score` = 0 par construction (jamais quantifiés) sur 79/93 comptes — traiter ça comme "urgence nulle" aurait donné C3=0 pour la quasi-totalité du parc. `compute-c3-signals.ts` distingue désormais signaux "quantifiés" (sector_news/regulatory, vrai relevance/urgency) des signaux "qualitatifs seuls" (FOLIO, plancher à 30 plutôt qu'un zéro trompeur).
  - `compute-account-score.ts` — orchestrateur : applique poids × lifecycle_multiplier par composant, **renormalise sur 0-100** (la masse pondérée totale varie selon le profil — sans renormalisation "score /100" perdrait son sens d'un compte à l'autre), calcule la confiance globale (moyenne pondérée), détermine la bande (U prioritaire sur tout si confidence < 40, conforme à la règle UX ADR §3 "score exploratoire même si la note brute semble élevée"), construit le résumé (drivers positifs/négatifs + caveats).
  - `collect-account-score-input.ts` — appelle la RPC, résout `workspace_id` via `profiles` (pas `private.current_workspace_id()`, non exposé PostgREST — même contrainte que `get-suggested-offers.ts`, ADR-0009).
  - `persist-account-score-run.ts` — insère `account_score_runs` + `account_score_components` (append-only, jamais d'UPDATE). Cast `as unknown as Json` pour les champs jsonb (pattern déjà utilisé dans `n8n/runs.ts`).
  - `actions.ts` — Server Action `recomputeAccountScore(companyId)` orchestrant collecte→calcul→persistance, `revalidatePath` sur la fiche compte. Recalcul manuel uniquement en V1 (pas de cron, décision ADR tenue).
- **Tests** (`__tests__/compute-account-score.test.ts`, 9 cas) : bande U sur compte vide, score borné 0-100, C6 exclu pour un prospect même avec données mission, C6 inclus uniquement pour client_actif avec mission active, C6 omis si client_actif mais 0 mission active (garde-fou incohérence), signaux FOLIO traités comme contexte qualitatif (pas zéro), signal quantifié priorisé sur signaux FOLIO, pénalité momentum sur action en retard, client_dormant et ancien_client mappés au même bucket dormant.
- **Validation** : `npx tsc --noEmit` → EXIT 0 (après régénération de `database.generated.ts` pour exposer la nouvelle RPC + correctif des casts `Json`). `npm run build` → EXIT 0. `eslint src/lib/account-scoring/` → 0 erreur, 0 warning. Tests 9/9 passés. **Sanity check bout en bout** avec les vraies données ACRI-ST (récupérées via la RPC) : score 47.35, bande C, confiance 67.75 — cohérent (pipe réel 61,9k€ tire C2 vers le haut, 0 décideur parmi 14 contacts tire C4 vers le bas, signaux FOLIO seulement qualitatifs plafonnent C3 à 30).
- **Non fait** : Lot 4 (UI header + modale, remplacement de `ScorePlaceholder`) — le moteur existe mais n'est encore appelé nulle part dans l'app. Pas de branchement du bouton "Actualiser" dans le cockpit compte.

### Session 21 (suite) — ADR-0011 Lot 4 : UI header + modale de détail (2026-07-06)

- **Données** : `get-account-score-summary.ts` (nouveau, `src/lib/account-scoring/`) lit `account_score_current` (Lot 2) + `account_score_components` du dernier run, retourne `AccountScoreSummaryView | null`. Branché dans `intelligence-data.ts` (nouveau champ `ClientIntelligenceData.scoreSummary`, chargé en parallèle des autres requêtes via `Promise.all`).
- **`ScorePlaceholder` supprimé** de `intelligence-parts.tsx` (code mort dès que ses 3 usages ont été remplacés — pas de compat descendante gardée, conforme aux conventions du projet).
- **`ScoreBadge.tsx`** (nouveau) : composant **purement présentationnel** — reçoit `summary`/`onClick` en props, ne gère aucun état interne. **Bug détecté et corrigé avant livraison** : la vue mobile monte le badge à 2 endroits simultanément possibles (header + onglet Scoring) ; une première version avec `useState` interne au badge aurait désynchronisé les deux affichages après un recalcul (recalculer depuis l'onglet Scoring n'aurait pas mis à jour le header, et vice versa). Corrigé en remontant l'état (`scoreSummary`, `scoreModalOpen`) dans les composants parents (`ClientIntelligenceDesktopView`/`MobileView`), qui gèrent déjà `activeTab`/`activePanel` de la même façon — un seul état partagé, deux triggers.
- **`ScoreDetailModal.tsx`** (nouveau) : `AppDialog` avec la classe d'échappement `.score-modal-reading` (nouvelle, ajoutée en sélecteur jumeau de `.pitch-modal-reading` dans `globals.css` plutôt que dupliquée — même besoin d'échapper au cobalt+or ambiant pour du contenu dense à lire). Affiche score/100 (masqué si confiance < 40, conforme ADR §4.2), `StatusPill` de bande (A=success/B=inProgress/C=warning/D=neutral/U=danger), confiance, contexte lifecycle, date de calcul formatée fr-FR, drivers positifs/négatifs, caveats, détail des 6 composants (barre de progression + poids + multiplicateur + contribution + explication). Bouton "Actualiser" (`useTransition`) appelle `recomputeAccountScore` (Server Action Lot 3) et met à jour l'état partagé via `onRecomputed`.
- **`actions.ts`/`persist-account-score-run.ts`** ajustés : `persistAccountScoreRun` retourne désormais `{ runId, calculatedAt }` (pas seulement l'id) pour que `recomputeAccountScore` renvoie une `AccountScoreSummaryView` complète et cohérente avec ce qui est réellement stocké, sans fabriquer une date côté client.
- **Montage** : `ScoreBadge` remplace `ScorePlaceholder` dans le header desktop, le header compact mobile ET l'onglet Scoring mobile (ex-`ComingSoon lot E`, désormais fonctionnel — pointe vers la même modale que le header). `ScoreDetailModal` monté une fois par branche de rendu (2 mounts dans `ClientIntelligenceMobileView.tsx` à cause du pattern de retour anticipé existant `if (activePanel !== "accueil") { return (...) }` / `return (...)`, corrigé une erreur de balise `</div>` en trop introduite pendant l'édition).
- **Dette pré-existante repérée en passant** (hors scope, tâche séparée créée) : `--color-status-warning-ink`, utilisé tel quel dans `StatusPill.tsx`/`Badge.tsx`/`AppDrawer.tsx`/tous les `ReportView` (10+ fichiers déjà livrés), n'est défini dans **aucun** fichier CSS du projet — variable fantôme copiée fidèlement depuis `StatusPill.tsx` par cohérence, pas corrigée ici (comportement partagé par tout un pan de l'UI existante, pas quelque chose introduit par ce lot).
- **Validation** : `npx tsc --noEmit` → EXIT 0. `npm run build` → EXIT 0, 32 routes. `eslint` sur les 8 fichiers touchés/créés → 0 erreur (4 warnings pré-existants sans rapport : `getSource`/`SignalList`/`PlusCircleIcon`/`RefreshIcon`, déjà documentés Sessions 16/20).
- **Non fait** : QA visuelle réelle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume en navigateur. Lot 5 (backfill initial des runs sur les 93 comptes, pour que tous partent avec un premier score au lieu d'un badge "à calculer") et Lot 6 (intégrations transverses CRM/weekly brief) pas commencés.

### Session 22 — ADR-0012 Cockpit Intelligence : refonte en chaîne de décision + Lot 0 (2026-07-07)

Chantier « cœur » de KREDO. Analyse critique d'une note de défrichage ChatGPT, corrigée par un **audit live** (Supabase + code). ADR complet : `docs/adr/ADR-0012-cockpit-intelligence-chaine-decision.md` (Proposé, décisions D-1→D-8 validées par Guillaume).

- **Découvertes terrain majeures** (mémoire [[folio-data-reality]]) : `metadata.analysis_data` = **5 clés sans source** (import unique 09/06) ; le « diagnostic process » **n'existe que pour 4 comptes réellement structurés** (15 résultats phase 3, 11 réduits à un `synthese`) — pas un corpus, un prototype ; le champ `phase` est **pollué** (phase 1 = rapports `client_summary`/`activity_*`/`weekly_manager`), `result_type` est la vraie clé ; **mismatch de granularité sectorielle** — `companies.sector` grossier (Services 33, Industrie 22…) ≠ `sector_intelligence` fin (3 fiches : Nutraceutique, Parfumerie, Banque-Finance). 14/95 comptes avec `sector_id`.
- **Décisions actées** : process en **5 étapes** (Connaissance compte → Intelligence sectorielle → Cartographie des enjeux → Stratégie commerciale → Roadmap commerciale) ; scoring/veille/rédaction/synthèse/campagne = **transverses** ; diagnostic repositionné en **enrichissement premium à la demande** (D-2) ; **provenance explicite** au lieu de fausse traçabilité (D-3) ; **curation humaine à chaque étape** (D-4) ; ligne de partage data — artefacts en `content_json`, mais **enjeux + roadmap actions en tables normalisées** `account_issues`/`account_roadmap_actions` (D-5, validé, cohérent ADR-0011) ; **économie** — sectorielle + scoring restent déterministes 0 token, refresh incrémental, tiering Haiku/Sonnet (D-6) ; **4 workflows n8n fins** par étape LLM, pas d'orchestrateur branchu (D-7) ; backfill `sector_id` repoussé au Lot 3 (D-8). Plan en 8 lots, ~30-40 j-h.
- **Lot 0 LIVRÉ** (assainissement + préalables, zéro token) :
  - **Renommage taxonomie** — `intelligence-process.ts` réécrit (5 étapes, `TabKey`/`ProcessStepKey` = `connaissance`/`secteur`/`enjeux`/`strategie`/`roadmap`, **Scoring sorti de la chaîne** → badge header seul). `ClientIntelligenceDesktopView.tsx` + `ClientIntelligenceMobileView.tsx` : onglets/panneaux renommés, panneau `scoring` retiré (redondant avec le badge), onglets `secteur`/`enjeux`/`roadmap` en ComingSoon transitoires, `ScoreIcon` mort supprimé, `STEP_ICONS` mis à jour. Blast radius vérifié : 3 fichiers, aucun autre consommateur.
  - **Reprise des runs** — 10 runs zombies (`queued`/`running` depuis 1-6 j) purgés en `failed`. Fonction `public.reap_stale_intelligence_runs(queued_timeout=15, running_timeout=30)` (migration `20260707162154_047`, `SECURITY DEFINER`, EXECUTE réservé `service_role`) = **ops-004**, testée (retourne 0). À câbler sur un cron n8n côté VPS.
  - **Backfill sectoriel NON fait** (écart signalé et assumé) : créer des stubs `sector_intelligence` grossiers polluerait la table de buckets vides de sens → le vrai backfill (dédup des 81 `sector_analysis` FOLIO en fiches fines) est déplacé au **Lot 3**.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · `eslint` sur les 3 fichiers → 0 erreur (6 warnings pré-existants, aucun nouveau).

### Session 22 (suite) — ADR-0012 Lot 1 : contrats & spine + correction d'un bug live (2026-07-07)

- **Schéma** (`supabase/migrations/20260707181634_048_adr0012_lot1_issues_roadmap_schema.sql`) : enum partagé `intelligence_provenance` (D-3, 5 valeurs) + tables normalisées `account_issues`/`account_roadmap_actions` (D-5 — mutées ligne à ligne, donc `updated_at`/`set_updated_at`/`log_audit`, **contrairement** aux tables append-only `account_score_*` d'ADR-0011). RLS 4-policy standard, triggers de validation défense-en-profondeur `private.validate_account_issue()`/`validate_account_roadmap_action()` (pattern repris de `validate_account_signal`, Session 21) — testés positif + négatif en direct (insert workspace mismatch rejeté). `database.generated.ts` régénéré.
- **Bug live corrigé** (pas seulement une dette théorique) : `getClientIntelligence()` (`src/lib/intelligence/intelligence-data.ts`) matchait les résultats moteur par `phase` (`r.phase === 1/2/3`) au lieu de `result_type`. Or la phase 1 héberge aussi des rapports (`client_summary`, `activity_commercial`, `weekly_manager`) — `results.find(r => r.phase === 1)` (trié par `created_at desc`) pouvait donc renvoyer le rapport le plus récent d'un compte à la place de sa vraie analyse client, que `parseAnalyseClient()` acceptait silencieusement (objet non-null aux champs vides) en l'affichant comme source `"engine"` — masquant le fallback FOLIO réel. **Vérifié en direct : 4 comptes réellement affectés** (Voyage Privé, Euro Protection Surveillance, Robertet, Ascoma, tous via leurs runs `client_summary`). Corrigé en matchant par `result_type` (`ACCOUNT_KNOWLEDGE_RESULT_TYPE`/`SECTOR_SNAPSHOT_RESULT_TYPE`/`"process_diagnostic"`) — comme aucun résultat `account_knowledge`/`sector_snapshot` n'existe encore (Lots 2/3 à venir), ces comptes retombent maintenant correctement sur leur FOLIO réel.
- **Contrats TS** (`src/lib/intelligence/account-intelligence-contracts.ts`, nouveau) : `IntelligenceProvenance` et les enums `account_issue_*`/`account_roadmap_action_*` **dérivés de `Database["public"]["Enums"]`** (pattern repris de `n8n/runs.ts:73`, pas de duplication à la main) ; 5 contrats `content_json` avec `schema_version: 1` — `AccountKnowledgeContent`, `SectorSnapshotContent`, `AccountIssuesMapContent`/`AccountIssueDraft`, `CommercialStrategyContent`, `CommercialRoadmapContent`/`AccountRoadmapActionDraft`. Décision de cohérence : `account_issues_map` et `commercial_roadmap` sont les **sorties brutes tracées** en `ai_intelligence_results` avant matérialisation ligne à ligne dans les tables spine (même pattern que `commercial_pitch` → `intelligence_documents`) — ADR-0012 D-5 mis à jour pour inclure `account_issues_map` par symétrie (oubli de rédaction, corrigé).
- **`intelligence-resource-types.ts`** (classification Session 16 du panneau global) étendu avec les 5 nouveaux `result_type` — additions pures, aucune entrée existante touchée. **Dérive non-ADR-0012 repérée en passant, corrigée dans la foulée** (Guillaume a traité la tâche flaguée immédiatement plutôt que de la reporter) : vérification live (`group by result_type`) confirmant 7 valeurs réellement produites. `"report"` retiré (générique, jamais produit, **aucune** autre référence dans le code) ; `commercial_pitch`/`activity_commercial`/`activity_recruitment`/`weekly_manager` ajoutés (réels, absents jusque-là → retombaient à `null`/mal classés). `"pitch"`/`"pitch_mail"`/`"roadmap"` **conservés** : alias de compat pré-rename référencés ailleurs (`save-as-document.ts`, `api/n8n/callback/route.ts`) pour les deux premiers, placeholder documenté (fallback legacy phase 4 + FOLIO metadata, `account-panel-data.ts`) pour `"roadmap"` — pas de la dérive, du code défensif intentionnel. Tests étendus (7/7).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · tests `intelligence-resource-types.test.ts` → 7/7 · `eslint` sur les 6 fichiers touchés/créés → 0 erreur, 0 warning.
- **Non fait** : parsers dédiés pour `AccountKnowledgeContent`/`SectorSnapshotContent` (Lots 2/3 — `parseAnalyseClient`/`parseAnalyseSector` restent des parsers FOLIO, à ne pas réutiliser tels quels une fois ces artefacts générés). Comptage `account_issues`/`account_roadmap_actions` dans `getProcessStepStatus` (tables vides, sans valeur avant génération réelle Lot 4/6).

### Session 22 (suite) — ADR-0012 Lot 2 : Connaissance compte — RPC, blocs relationnels, curation, workflow (2026-07-07)

- **RPC `get_account_knowledge_context`** (`supabase/migrations/20260707183536_049`, pattern `get_pitch_context`) : hydratation déterministe compte + contacts (groupés priorité/rôle) + interactions + opportunités + missions + `account_signals` actifs + `folioAnalysisData`/`processDiagnostic` en passthrough brut (le LLM juge de leur intégration, la RPC ne réinterprète rien). Testée en direct sur Voyage Privé (7 missions, 1 opp, 6 contacts, 5 signaux FOLIO, diagnostic).
- **Data layer** (`intelligence-data.ts`) : nouveaux champs relationnels **haute confiance, sans run n8n** — `opportunities`/`missions`/`accountSignals` (nouvelles requêtes parallèles) + `contacts` enrichi (department/decision_power/relationship_level/is_priority, remonté de 6 à 50 lignes — champs rendus optionnels après découverte que `ClientIntelligenceContact` est construit ailleurs, panneau global/composeur communication/rapports, avec un sous-ensemble minimal). Nouveau champ **`accountKnowledge`** (contrat riche, distinct de `client` legacy FOLIO — les deux schémas n'ont volontairement aucun champ commun) + parseur dédié `parseAccountKnowledgeContent` (discriminé par `schema_version === 1`, pas de fusion avec `parseAnalyseClient`). `getProcessStepStatus` (Lot 0) corrigé en conséquence : `hasEngine` teste désormais `accountKnowledge !== null`, plus jamais `client.source === "engine"` (devenu impossible).
- **Curation (D-4)** : Server Action `curate-account-knowledge.ts` (`confirm`/`dismiss`/`restore`/`pin`/`unpin`) — mutation directe de `content_json` via la policy UPDATE standard (vérifiée : `ai_intelligence_results` a bien un policy 4-standard workspace-scopée, pas de service_role nécessaire). `confirm` bascule `provenance` → `human_verified` ; `dismiss` masque sans jamais supprimer (D-3, garde l'historique de ce que le modèle a proposé).
- **UI** (`AccountKnowledgeBlocks.tsx`, nouveau fichier — les 2 vues étaient déjà volumineuses) : `ContactsKeyCard`/`CommercialRelationCard`/`AccountSignalsCard` (relationnel, toujours visibles) + `AccountKnowledgeGeneratedContent` (rendu des 5 blocs de faits + boutons de curation inline, visible seulement quand `accountKnowledge` existe). `FactProvenanceBadge` ajouté à `intelligence-parts.tsx` (5 valeurs, distinct de `ProvenanceBadge` existant à 3 valeurs). **Retrait de "Étude sectorielle" de l'onglet Connaissance compte** (desktop + mobile) — relocalisé dans l'onglet `secteur` (remplace le `ComingSoon` quand une donnée sector existe, FOLIO ou moteur) : complète enfin la séparation compte/secteur commencée au Lot 0. Bouton "Lancer/actualiser" branché en réel (`POST /api/n8n/trigger` `workflowId: "intel-030-account-knowledge"` + Realtime sur `ai_intelligence_results`, pattern identique à `SummaryDrawerContent`/`PitchMailDrawerContent`) — remplace le `setMessage` factice de Lot 0.
- **Workflow `intel-030-account-knowledge.json`** (15 nœuds, même squelette que `report-account-summary.json`) : `Hydrate Context` appelle la nouvelle RPC ; prompt système contraint le LLM à n'émettre que 3 des 5 valeurs de `provenance` (`relational`/`folio_legacy`/`inferred` — **jamais** `human_verified` réservé à la curation, ni `engine_researched` réservé à de futurs workflows de recherche web datée) ; `Parse & Validate Output` rejette durement toute valeur hors de cette liste. Décision documentée dans le prompt : les faits dérivés de `processDiagnostic` (artefact moteur, pas FOLIO ni recherche) sont tagués `relational` — fit imparfait avec l'enum à 5 valeurs, assumé et écrit noir sur blanc plutôt que laissé implicite. **Validation réelle, pas seulement syntaxique** : harnais Node avec mocks (`Validate Entity` bon/mauvais entityType, `Parse & Validate Output` bon cas + rejet provenance interdite, `Quality Check`, `Prepare Callback`, chemin d'échec) + **cross-check programmatique** que le `contentJson` produit correspond exactement aux clés attendues par `parseAccountKnowledgeContent()` côté TS (évite le type de divergence contrat qui aurait cassé silencieusement l'affichage). `intel-030-account-knowledge.SETUP.md` rédigé (import/config/test/activation).
- **`N8nWorkflowId`** (`src/lib/n8n/types.ts`) étendu avec `intel-030-account-knowledge`.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · suite complète `vitest run` → **200/200 tests, 30 fichiers** · `eslint` sur tous les fichiers touchés/créés → 0 erreur (7 warnings pré-existants, aucun nouveau).
- **Non fait** : import/activation du workflow sur le VPS n8n (checklist dans le SETUP.md). Tiering Haiku/Sonnet (D-6) — ce workflow utilise Sonnet comme tous les précédents, l'optimisation économique reste à appliquer plus tard. QA visuelle réelle du nouvel onglet Connaissance compte et du déplacement de la section sectorielle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume.

### Session 22 (suite) — ADR-0012 Lot 3 : Intelligence sectorielle unifiée, backfill + snapshot déterministe (2026-07-07)

Lot exécuté sans dépendre de l'import VPS d'`intel-030-account-knowledge` (Lot 2) — les deux chantiers sont orthogonaux : Lot 2 alimente l'étape 1 (Connaissance compte, LLM), Lot 3 porte sur l'étape 2 (Intelligence sectorielle) qui est **entièrement déterministe** (D-6, zéro LLM, zéro workflow n8n).

- **Backfill `sector_id`** (migration `20260707193641_050`) : audit live des 81 `metadata.sector_analysis` FOLIO confirmant que chaque compte décrit un marché **unique à l'entreprise**, pas une taxonomie partagée — rattacher tout le parc de force aurait produit des fiches sans valeur mutualisée. Décision : ne rattacher QUE les clusters de 2+ comptes décrivant explicitement le même marché nommé (texte à l'appui, pas le libellé grossier `companies.sector`). Résultat : **14→27/95 comptes** avec `sector_id`. Extension de la fiche « Parfumerie, Arômes & Cosmétique » existante (+Argeville, +Aromatech Group) et **3 nouvelles fiches** créées avec description factuelle synthétisée depuis les vraies analyses FOLIO (pas de score/market_size inventé, champs laissés `NULL`) : « Transport & Mobilité régionale » (5 comptes : Cogepart, ESCOTA, Groupe Transcan, KEOLIS, Régie Ligne d'Azur), « BTP, Construction & Immobilier » (4 comptes : Groupe IDEC, Groupe Trecobat, Audemard, Renaudi), « EHPAD & Résidences Seniors » (2 comptes, cluster serré — les deux analyses citent mot pour mot les mêmes dynamiques : vieillissement, post-Orpéa 2022, pénurie de personnel). **~68/95 comptes restent volontairement sans `sector_id`** — honnête, pas un manque à corriger.
- **Piège opérationnel** : premier essai `apply_migration` a échoué (`workspace_id` NOT NULL sans défaut résolvable hors session utilisateur pour `sector_intelligence`) — corrigé en injectant l'unique `workspace_id` du système explicitement. Rollback complet vérifié avant retry (0 ligne orpheline).
- **Couche de lecture** (`src/lib/intelligence/sector-snapshot-data.ts`, nouveau) : `getSectorSnapshot(sectorId)` — lecture live (pas de cache, D-6 : volume trop faible par secteur pour le justifier) de `sector_intelligence` + `sector_pain_points` (triés fréquence) + `sector_regulatory_items` (triés échéance) + `sector_events` + `sector_news`, plus `exposedAccountsCount` et `openCommercialWindows` dérivé (items réglementaires marqués fenêtre + actualités déclencheurs). Testé sur données réelles (Banque-Finance-Assurance : pain points « Mise en conformité DORA » fréq. 5, fenêtres « GAFI — Sortie de la liste grise »/DORA/Solvabilité II).
- **`ClientIntelligenceData.sectorSnapshot`** (nouveau champ, `intelligence-data.ts`) : peuplé seulement si `company.sector_id` existe, appelé après résolution du compte (dépendance séquentielle, pas dans le `Promise.all` initial).
- **UI** (`SectorSnapshotContent.tsx`, nouveau fichier) : synthèse secteur + stats marché (attractivité/taille/croissance, affichés seulement si renseignés) + fenêtres commerciales ouvertes en callout + pain points/calendrier réglementaire/événements/actualités/playbook. Câblé dans l'onglet `secteur` desktop + mobile **en priorité sur le fallback FOLIO/moteur** (`data.sectorSnapshot ?? data.sector`), qui reste inchangé pour les ~68 comptes non rattachés. `getProcessStepStatus` (étape `secteur`) mis à jour en conséquence.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · `vitest run` → 200/200 · `eslint` sur les 7 fichiers touchés/créés → 0 erreur (7 warnings pré-existants, aucun nouveau).
- **Non fait** : enrichissement des 3 nouvelles fiches (pain points/réglementaire/events/playbook — vides à ce stade, containers honnêtes pas encore peuplés). QA visuelle (pas de Chrome DevTools MCP) — à faire par Guillaume.

### Session 22 (suite) — ADR-0012 Lot 4 : Cartographie des enjeux — première vraie couche décisionnelle (2026-07-07)

Première étape à réellement peupler la table `account_issues` (créée vide au Lot 1). Contrairement aux artefacts précédents (content_json affiché tel quel), la sortie LLM ici est **matérialisée** en lignes de table — nouveau pattern de callback.

- **RPC `get_account_issues_context`** (migration `051`, pattern identique à `get_account_knowledge_context`) : relationnel KREDO + FOLIO/diagnostic passthrough + **snapshot sectoriel mutualisé** (pain points + échéances réglementaires, réutilise les tables du Lot 3) + catalogue d'offres allégé (actionnabilité seulement, pas la vente — ça reste l'étape 4) + enjeux déjà ouverts (anti-doublon best-effort). Testée en direct : Voyage Privé (`sectorContext=null`, pas de sector_id) et Ascoma (`sectorContext` peuplé — 8 pain points réels dont « Mise en conformité DORA », 5 échéances dont GAFI/DORA/Solvabilité II, exploitant directement le backfill du Lot 3).
- **Matérialisation (D-5)** — nouveau pattern de callback, différent de `commercial_pitch`→`intelligence_documents` (1 résultat→1 document) : `materialize-account-issues.ts` transforme `contentJson.issues[]` (result_type=`account_issues_map`) en **N lignes `account_issues`** (`status='open'`), câblé dans `api/n8n/callback/route.ts` en **parallèle** de (pas remplaçant) `isEligibleDocumentResult` — les deux mécanismes coexistent selon le `resultType`. Chaque run crée un nouveau lot ; pas de déduplication automatique contre les enjeux déjà ouverts (best-effort prompt + QA flag seulement, décision V1 assumée).
- **Workflow `intel-031-issues-map.json`** (15 nœuds) : même contrainte de provenance que `intel-030` (`relational`/`folio_legacy`/`inferred` seulement) — **décision documentée** : les enjeux dérivés de `sectorContext` (pain points/réglementaire mutualisés, alimentés par curation humaine sur d'autres comptes du même secteur) sont tagués `relational` au même titre que le relationnel direct, ce sont des faits de base de données, pas des déductions. Validation stricte : catégorie ∈ 8 valeurs, evidence_level ∈ 3, scores entiers 1-5, **`contact_ids` vérifiés contre la liste réelle de `context.contacts`** (rejette un contact halluciné), max 12 enjeux (garde-fou sur-génération). **Validation réelle** : harnais Node avec mocks (cas nominal 2 enjeux, rejet provenance interdite, rejet contact_id inconnu, rejet score hors plage, chemin d'échec) + **cross-check de contrat** confirmant que `contentJson.issues[]` correspond exactement aux clés attendues par `materializeAccountIssues()` (garantit que l'insertion en base ne cassera pas silencieusement). `intel-031-issues-map.SETUP.md` rédigé.
- **Data layer** (`intelligence-data.ts`) : nouveau champ `accountIssues` (enjeux `status='open'`, triés par importance), type `ClientIntelligenceIssue`.
- **Curation (D-4)** : `set-account-issue-status.ts` — plus simple que la curation account_knowledge (pas de mutation JSON) puisque `account_issues` est une table normalisée : un simple update de `status` (`open`/`dismissed`/`converted`), RLS-safe.
- **UI** (`AccountIssuesBlocks.tsx`, nouveau) : `AccountIssuesTable` desktop — réutilise le `DataTable<T>` générique existant (triable, colonnes Importance/Urgence/Actionnabilité KREDO/Preuve/Contacts/Prochaine question, conforme à la demande ADR "tableau triable + colonne preuve + colonne actionnabilité KREDO"). **Décision de scope** : matrice visuelle importance×urgence (mentionnée dans l'ADR) remplacée par un tableau triable pour V1 — livre la même valeur décisionnelle sans SVG custom, criticality/business_impact/accessibility restent stockés et disponibles mais non colonnés individuellement (évite la surcharge visuelle). `AccountIssuesTopList` mobile — top 3 enjeux (tri importance+urgence), question à poser, contacts, écarter. Boutons de génération + Realtime dans les deux vues (pattern Lot 2, mais recharge directe de `account_issues` au succès plutôt que parsing de `content_json`, puisque la matérialisation est déjà faite côté callback). `getProcessStepStatus` (étape `enjeux`) branché sur `accountIssues.length > 0`.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · `vitest run` → 200/200 · `eslint` sur tous les fichiers touchés/créés → 0 erreur, 0 warning nouveau (1 warning que j'avais moi-même introduit — import `FactProvenanceBadge` inutilisé — retiré avant validation finale).
- **Non fait** : import/activation VPS (checklist SETUP.md). Déduplication robuste entre runs successifs (V1 = best-effort). Matrice visuelle importance×urgence (remplacée par table, décision assumée). Filtres par catégorie/practice/contact sur la table (colonnes présentes, filtres UI pas encore câblés). Tiering Haiku/Sonnet (D-6, Sonnet partout comme les workflows précédents).

### Session 22 (suite) — ADR-0012 Lot 5 : Stratégie commerciale — mapping enjeu↔offre (2026-07-07/08)

Reprise de session sur handoff `STATE.md` (Lot 4 déjà commité par Guillaume entre-temps, `db601ec7` — le fichier n'était donc plus tout à fait à jour ; un commit non documenté `dc4021a6` "feat(veille)" a aussi été trouvé, hors périmètre de ce lot, vérifié sans collision avant de commencer). D-5 confirmé : `commercial_strategy` reste un artefact de génération pure (`content_json`), pas de table spine (contrairement aux enjeux du Lot 4) — même famille de traitement que `client_summary`/`commercial_pitch`, auto-sauvegardé en bibliothèque documentaire.

- **RPC `get_commercial_strategy_context`** (migration `052`, pattern identique à `get_account_issues_context`/`get_pitch_context`) : enjeux ouverts (`account_issues`, le vrai nouvel input) + catalogue d'offres **complet** cette fois (description, cas d'usage, mots-clés — pas allégé comme au Lot 4, car l'étape 4 EST l'étape de vente) + grille tarifaire agrégée par practice (`pricingByPractice`, min/max/moyenne — pas la grille détaillée du Lot pitch) + playbook sectoriel mutualisé (pain points + réglementaire + `playbook`/`practices_fit`) + contacts + pitchs déjà générés + stratégie précédente (anti-répétition best-effort sur refresh) + matching heuristique `missions.practice`→`offer_practices.slug` réutilisé tel quel depuis `get_pitch_context` (même dette documentée, dupliquée à dessein — D-7 : chaque RPC reste self-contained). **Piège rencontré** : `jsonb_agg(jsonb_build_object(..., avg(...)))` échoue avec `aggregate function calls cannot be nested` — corrigé en pré-agrégeant `pricingByPractice` dans une sous-requête avant le `jsonb_agg`. Testée en direct sur Ascoma (secteur Banque-Finance-Assurance, 41 offres actives, grille tarifaire par practice, 0 contact réel — vérifié non-bug) : `openIssues=[]` confirmé (Lot 4 pas encore importé sur le VPS, cohérent avec le handoff).
- **Enum `intelligence_document_type`** (migration `053`) : ajout de la valeur `commercial_strategy` (n'existait pas, contrairement à `commercial_pitch` déjà présent depuis ADR-0009) — nécessaire pour que l'auto-sauvegarde en bibliothèque ne casse pas silencieusement sur une contrainte enum Postgres.
- **Contrat** : `CommercialStrategyContent`/`COMMERCIAL_STRATEGY_RESULT_TYPE` existaient déjà depuis le Lot 1 (`account-intelligence-contracts.ts`) — aucun changement nécessaire, juste consommés tels quels.
- **Workflow `intel-032-strategy.json`** (15 nœuds, généré via script Python comme les rapports d'activité Session 19, pour éviter les erreurs d'échappement JSON manuelles) : `Hydrate Context` sur la nouvelle RPC ; prompt système contraint chaque `offer_match` à référencer un `issue_id`/`offer_id` réel du contexte (jamais halluciné), `approach_angles` à 2-4 entrées, `objections` à 2 minimum, provenance limitée aux 3 mêmes valeurs que Lots 2/4 (D-3) — avec une nuance documentée dans le prompt : un mapping enjeu↔offre est `relational` s'il s'appuie sur un recoupement textuel explicite (mots-clés/cas d'usage), `inferred` sinon, `folio_legacy` seulement si ancré sur `previousPitches`/legacy. **Aucune génération de pitch ici** (reste `intel-020-communication`, ADR-0009) — cette étape produit le mapping, pas le texte final. **Validation réelle** : harnais Node avec mocks (cas nominal 1 mapping, rejets provenance/issue_id/offer_id inconnus, rejets angles hors 2-4, rejet objections < 2) + **cross-check de contrat** confirmant que les clés de `contentJson` correspondent exactement à `CommercialStrategyContent`/`CommercialStrategyOfferMatch` (TS). `intel-032-strategy.SETUP.md` rédigé, avec un scénario de test dégradé explicite (compte sans enjeux → `offer_matches: []` attendu, pas une erreur).
- **Callback** (`api/n8n/callback/route.ts`) : `commercial_strategy` ajouté à `isEligibleDocumentResult` (auto-sauvegarde bibliothèque, pas de matérialisation table). `save-as-document.ts` : `mapResultTypeToDocumentType`/`buildFallbackTitle` étendus.
- **Data layer** (`intelligence-data.ts`) : nouveau champ `commercialStrategy` (parseur `parseCommercialStrategyContent`, même pattern discriminé par `schema_version` que `parseAccountKnowledgeContent`) + nouveau champ `offersCatalog` (référentiel offres allégé id→nom, pour résoudre les `offer_id` de la matrice côté UI — requête `offers` ajoutée au `Promise.all`, lisible en session utilisateur comme dans `get-suggested-offers.ts`). `getProcessStepStatus` (étape `strategie`) branché en priorité sur `commercialStrategy !== null`, avec fallback sur la présence de pitchs (comportement identique à avant tant qu'aucun run stratégie n'a réussi).
- **UI** (`CommercialStrategyBlocks.tsx`, nouveau fichier — même raison que `AccountIssuesBlocks.tsx`/`AccountKnowledgeBlocks.tsx`, vues déjà volumineuses) : `CommercialStrategyMatrixTable` desktop (`DataTable` générique, colonnes Enjeu/Offre/Preuve/Justification) et `CommercialStrategyMatrixList` mobile (cartes — **jamais de DataTable en mobile**, règle du projet) ; `ApproachAnglesList`/`PersonaMessagesList`/`ObjectionsList` partagés ; `CommercialStrategyGeneratedContent` enveloppe les 4 sections. `StrategieTab` (desktop) et le panneau `strategie` (mobile) **enrichis** (pas recréés, conforme au handoff) : bouton "Lancer/actualiser la stratégie" + Realtime (pattern Lots 2/4) inséré au-dessus de la section pitch existante, inchangée.
- **Validation** : `tsc --noEmit` → EXIT 0 (après extension des `Record<DocumentType, string>` exhaustifs de la bibliothèque `reports/` — `document-display.ts`/`DocumentCard.tsx`/`DocumentMobileDetail.tsx` — cassés par le nouvel enum, corrigé en ajoutant `commercial_strategy` partout, catégorisé "rapport" comme `client_summary`) · `npm run build` → Compiled successfully · `vitest run` → 200/200 (inchangé, pas de nouveau test unitaire ce lot — validation portée par le harnais n8n + tsc/build, comme les lots précédents) · `eslint` sur tous les fichiers touchés/créés → 0 erreur, 0 warning nouveau.
- **Non fait** : import/activation VPS des deux workflows Lot 4 (`intel-031-issues-map`) et Lot 5 (`intel-032-strategy`) — le cas nominal avec de vrais enjeux n'est donc testable qu'une fois `intel-031` importé en premier. Playbook sectoriel affiché seulement via le contenu généré, pas de vue dédiée dupliquant `SectorSnapshotContent.tsx` (décision de scope). Tiering Haiku/Sonnet (D-6, Sonnet partout comme les workflows précédents).

**Prochain focus :** Importer/activer `intel-031-issues-map` PUIS `intel-032-strategy` sur le VPS n8n (checklists respectives), tester le cas nominal Lot 5 avec de vrais enjeux matérialisés (ex. Ascoma) puis le cas dégradé (compte sans enjeux). ADR-0012 Lot 6 (Roadmap commerciale — même pattern matérialisation que le Lot 4 : `commercial_roadmap` → `materialize-account-roadmap-actions.ts` symétrique dans `account_roadmap_actions`, table déjà créée au Lot 1. AUCUNE écriture `tasks`/`calendar_events` à ce stade). Enrichir les 3 nouvelles fiches sectorielles du Lot 3 (pain points/réglementaire/events/playbook, vides à ce stade) une fois un premier usage réel constaté. Importer/activer `intel-030-account-knowledge` sur le VPS n8n et tester la génération de bout en bout sur un compte réel (ex. Voyage Privé). QA visuelle du nouvel onglet Connaissance compte + du déplacement de la section sectorielle (Lot 2), et QA visuelle du nouvel onglet Stratégie (Lot 5, matrice desktop + liste mobile) — pas de Chrome DevTools MCP, à faire par Guillaume. Validation visuelle du Lot 4 ADR-0011 par Guillaume (desktop + mobile, thème cockpit). Puis Lot 5 ADR-0011 (backfill initial : un run `trigger_source='import'` par compte sur les 93 comptes déjà pourvus en `account_signals`) et Lot 6 (intégrations transverses CRM/weekly brief, différées après retour d'usage réel). Importer le workflow `intel-020-communication` mis à jour sur le VPS n8n et tester les 3 scénarios pitch de bout en bout sur données réelles. Importer et activer `report-activity-commercial`/`report-activity-recruitment` sur le VPS n8n (secret HMAC). Lot 3 REPORT-001 (rapport hebdo manager). QA visuelle desktop + mobile de la contextualisation Session 17 (13 pages + 4 entités) — à faire par Guillaume. Compléter le contexte d'entité sur `candidate`/`sector`/`calendar_event` — mêmes primitives (`RegisterIntelligenceEntity` + `ENTITY_ACTION_IDS`). **Réconciliation CLAUDE.md ↔ Supabase live** : 58 tables live vs 35 documentées ici — mettre à jour le schéma documenté avant la prochaine session touchant la base. Route orpheline `/staffing` — décider suppression ou réintégration. Lot 5 QA panneau global (Session 16) toujours en attente. Bug pré-existant `searchParams is not defined` dans `AccountsContactsViews.tsx:977`.

### Session 23 — Feature « Scan rapide compte » Lot 1 : workflow intel-010-refresh (2026-07-12)

Reprise sur handoff dédié (Lot 0 déjà committé par une session parallèle — `10b95797`, socle Supabase `companies.siren`/`companies.naf_code`, RPC batch `validate_and_apply_enrichment_proposals`, contrats `AccountScan*` dans `src/lib/n8n/types.ts`). Objectif du Lot 1 : implémenter le scan des informations d'entreprise dans le workflow canonique `intel-010-refresh`, sans UI et sans recherche de contacts.

- **Investigation obligatoire (avant toute écriture)** : `intel-010-refresh` était réservé dans `N8nWorkflowId` depuis les tout premiers commits (commentaire `client_intelligence_refresh`) mais **n'a jamais eu d'implémentation** — aucun fichier `n8n/workflows/`, aucun appelant Next.js, aucune mention `docs/` (grep exhaustif). Créé donc de zéro, sans usage historique à préserver — seul le routage par `input.operation` (rejet propre de toute opération ≠ `account_scan`) sert de garde-fou pour une future extension.
- **Écart corrigé sur le contrat Lot 0** : `AccountScanOutput` livré au Lot 0 n'avait **aucun champ `resolution`**, alors que le Lot 1 exige de ne jamais générer de proposition tant que l'entité juridique n'est pas résolue sans ambiguïté (2 à 5 candidats sinon). Étendu de façon additive dans `src/lib/n8n/types.ts` : `AccountScanResolution`/`AccountScanResolutionCandidate` + `AccountScanTriggerInput.selectedSiren/websiteHint/locationHint/autoApplyOfficialMissing`. Aucun champ retiré, aucun autre fichier ne consommait encore ce contrat (Lot 2 UI pas commencé) — `tsc --noEmit` validé après coup.
- **Schéma vérifié à la source avant d'écrire le payload d'écriture** (lecture complète de `20260616085702_lot1_intelligence_foundation.sql` et `20260616094307_lot2_proposal_transaction_api.sql`, pas supposé) : `private.jsonb_nullable_text`/`proposal_expected_value` attendent `old_value`/`initial_snapshot.current` comme **scalaire JSON brut** (`"texte"`, pas `{value: "texte"}`) — une erreur ici aurait fait échouer silencieusement **toute** application de proposition au Lot 2 (faux conflit de concurrence systématique). `enrichment_proposals_active_key_uniq` est un **index unique partiel** (actif seulement sur `proposed/needs_review/conflicting/validated`) → un upsert PostgREST classique `ON CONFLICT` y est impossible ; écriture implémentée en delete-then-insert ciblé (uniquement les lignes `proposed`/`needs_review`, jamais `validated`/`conflicting` qui portent une décision humaine ou un conflit déjà signalé).
- **`n8n/workflows/intel-010-refresh.json`** (39 nœuds, généré via script Python pour éviter les erreurs d'échappement JSON manuelles, comme les workflows REPORT-001/ADR-0012) : réutilise strictement les conventions déjà en place (`Verify Signature`/callback signé HMAC `x-kredo-signature`, transition `running`→callback générique, credential `Supabase_Service_Role_KREDO`, branche d'erreur vers `Prepare Failure Callback`).
  - **Résolution d'entité juridique** via `recherche-entreprises.api.gouv.fr` (API publique data.gouv.fr/INSEE Sirene, gratuite, sans clé — aucun nouveau fournisseur payant). Scoring déterministe (similarité de nom + bonus localisation) en nœud Code, jamais par le LLM. `selectedSiren` court-circuite le scoring pour un second appel post-ambiguïté.
  - **Champs objectifs** (legal_name/siren/naf_code/hq_location/employee_count) extraits directement du registre, **sans LLM** — `employee_count` reste une estimation (tranche INSEE → point médian), jamais présentée avec la même confiance qu'une donnée exacte. `sector`/`revenue` **volontairement exclus** du V1 (pas de mapping NAF↔`sector_intelligence` fiable, cf. [[folio-data-reality]] ; pas de source CA gratuite).
  - **Faits interprétatifs** (16 attributs `AccountScanFactAttribute`) extraits par LLM contraint aux preuves collectées (site officiel scrapé best-effort + presse via Google News RSS, mécanisme déjà utilisé par `intel-033-account-watch-refresh`) — prompt interdit explicitement de traiter le contenu web comme des instructions (garde-fou injection de prompt).
  - **Confiance calculée dans un nœud Code déterministe** (fiabilité du type de source × corroboration × fraîcheur × caractère explicite/inféré, pénalité ×0.6 si contradiction avec la valeur CRM actuelle) — le LLM ne note jamais sa propre confiance.
  - **Piège n8n découvert et corrigé en cours de route** : un nœud recevant 0 item en entrée n'est pas exécuté du tout côté n8n — un premier jet où les branches "rien à insérer/lier/collecter" renvoyaient `[]` aurait **interrompu silencieusement toute la chaîne callback**, laissant le run bloqué en `running` (violation directe de l'exigence Lot 1 §14). Corrigé par des branches `Skip Sources`/`Skip Insert`/`Skip Links` renvoyant systématiquement 1 item passthrough + nœud pivot stable `Merge Scan Result` (les nœuds ne référencent jamais par nom une branche IF qui pourrait ne pas s'être exécutée).
- **Validation** : 13 tests unitaires via un harnais Node (`vm` + mocks `$`/`$input`/`$json`, extraits directement du JSON généré — pas de réécriture parallèle de la logique) couvrant les 6 scénarios minimaux du Lot 1 (résolution nette, ambiguïté 2-5 candidats, `selectedSiren` pré-rempli, contradiction CRM/source, entité introuvable + API indisponible, ré-exécution sans duplication + protection des propositions `validated`) + rejet d'opération non supportée. `node --check` sur les 15 nœuds Code. `npx tsc --noEmit` → EXIT 0. `npm run build` → EXIT 0. `npx eslint src/lib/n8n/types.ts` → 0 erreur. `npx vitest run` → 341/342 (1 échec préexistant hors lot sur `mobile-account-custom-list.test.ts`, déjà signalé par le Lot 0).
- **Risques restants documentés dans le SETUP.md** : pas de verrou transactionnel contre deux scans concurrents sur le même compte (best-effort, à traiter au Lot 5 stabilisation) ; découverte automatique de site officiel non implémentée (nécessiterait un fournisseur de recherche payant, hors périmètre) ; extraction du site officiel = texte brut best-effort, pas de rendu JS.
- **Non fait dans cette session** : import/activation du workflow sur le VPS n8n (checklist dans `intel-010-refresh.SETUP.md`, secret HMAC à configurer). Lot 2 (UI `CompanyIdentityDrawer`), Lot 3 (contacts), Lot 4 (UI contacts), Lot 5 (stabilisation) — non commencés, arrêt volontaire en fin de Lot 1 comme demandé.

### Session 23 (suite) — Feature « Scan rapide compte » Lot 2 : UI de revue dans le drawer (2026-07-12)

Suite du Lot 1 (workflow `intel-010-refresh` importé/actif sur le VPS n8n entre-temps, hors session). Objectif du Lot 2 : rendre le scan utilisable depuis `CompanyIdentityDrawer`, sans toucher à la recherche/import de contacts (Lot 3+).

- **Investigation obligatoire** : lecture complète de `CompanyIdentityDrawer.tsx` (1566 lignes), `/api/n8n/trigger`, `SummaryDrawerContent` (`IntelligenceActionDrawers.tsx`) pour le pattern canonique déclenchement+Realtime déjà en prod, `AppDialog.tsx`, `DataTable.tsx`, `StatusPill.tsx`, `set-account-issue-status.ts` et `src/lib/account-scoring/{actions,collect-account-score-input}.ts` pour le pattern Server Action (session utilisateur → `profiles.workspace_id` → RPC, **jamais** `private.current_workspace_id()` non exposé PostgREST). Aucun nouveau pipeline inventé — tout réutilise ces mécanismes existants.
- **Écart de contrat comblé côté data** : `getCompanyIdentity()` (`prospection/accounts/actions.ts`) ne sélectionnait ni `legal_name`, ni `siren`, ni `naf_code` — `IdentityData.company` déclarait déjà `legal_name` en TypeScript mais la colonne n'était jamais requêtée (toujours `undefined` en pratique, incohérence pré-existante). Étendu au `.select()` + au type, nécessaire pour préremplir la modale et rafraîchir la fiche après application.
- **`src/components/accounts-contacts/scan/`** (nouveau dossier, 8 fichiers + 2 fichiers de tests, pattern exact demandé) :
  - **`account-scan-utils.ts`** — fonctions pures uniquement (testables sans mock Supabase) : libellés métier FR pour les 9 champs objectifs + 16 faits interprétatifs, construction du payload `/api/n8n/trigger`, fusion propositions DB ↔ `content_json` (`mergeProposalRows` — `content_json` ne porte jamais l'id réel de la ligne `enrichment_proposals`, indispensable pour `proposalIds`), et surtout `isAutoApplyEligible()` — allowlist V1 stricte (`legal_name/siren/naf_code/hq_location/employee_count/website`), jamais un fait interprétatif, jamais une correction d'une valeur déjà renseignée, confiance ≥ 0.90, **source officielle exigée** (`regulatory_filing` uniquement — un `websiteHint` tapé par l'utilisateur n'a par construction aucune source associée dans le Lot 1, donc ne s'auto-applique jamais, comportement conservateur assumé).
  - **`account-scan-actions.ts`** — `applyAccountScanProposals()` : seul chemin d'écriture CRM, reçoit uniquement `runId/companyId/proposalIds/reason` (jamais une valeur, un champ ou une source depuis le navigateur). Revérifie explicitement workspace **+ compte + run + statut applicable** avant d'appeler `validate_and_apply_enrichment_proposals` (le RPC Lot 0, `SECURITY DEFINER`, ne revérifie lui-même que le workspace — la vérification compte/run est un ajout défensif de ce lot, pas une redite). `getLatestAccountScanRun()` restaure le dernier run `account_scan` d'un compte (filtre `run_type='intel-010-refresh'` **+** `input_snapshot->>operation='account_scan'`, double filtre volontaire pour rester correct le jour où un autre opération partagerait cet id de workflow).
  - **`AccountScanSetup.tsx`** — find/verify (radio), section contacts visible mais désactivée ("Disponible au prochain lot"), case `autoApplyOfficialMissing` cochée par défaut, paramètres avancés dans un `<details>` natif (site/localisation/SIREN, préremplis depuis le compte) — même philosophie "primitives natives" que `CommunicationBriefForm`.
  - **`AccountScanResolutionPicker.tsx`** — 2 à 5 candidats (raison sociale, SIREN, NAF, localisation, score de correspondance), relance avec `selectedSiren`.
  - **`AccountScanStatus.tsx`** — `queued`/`running`/`error`/`not_found`, avec retour au paramétrage.
  - **`AccountScanDesktopResults.tsx`** (`DataTable` générique + colonne sélection custom, mini-rapport, sources avec `target="_blank" rel="noopener noreferrer"`) / **`AccountScanMobileResults.tsx`** (cartes, 44px, barre d'action `sticky bottom-0`, mini-rapport/sources en `<details>`) — **composants réellement distincts**, jamais l'un chargé et caché en CSS sur l'autre.
  - **`AccountScanDialog.tsx`** — orchestrateur, machine à états `setup/queued/running/ambiguous/not_found/review/error` (+ `applying` porté par un booléen local à `review`, pas un état séparé — "conserver la modale ouverte, laisser les propositions non sélectionnées consultables" ne correspond pas à un écran différent). Restauration du dernier run à l'ouverture (`getLatestAccountScanRun`), Realtime sur `ai_intelligence_runs` (transition `queued→running`) **et** `ai_intelligence_results` (résultat terminal), fallback de relecture ponctuelle à 20s (une seule fois, pas de polling), auto-application au chargement des résultats si l'option était cochée.
  - **Piège React découvert et corrigé en cours de route** (`vercel:react-best-practices` appliqué explicitement) : la première version du canal Realtime dépendait de `phase` en plus de `runId` — la transition `queued→running`, déclenchée PAR ce canal, aurait provoqué sa propre destruction/recréation (`useEffect` cleanup+recreate), avec une fenêtre où un événement aurait pu être manqué entre l'ancien et le nouveau canal. Corrigé : effet keyé uniquement sur `runId`, teardown explicite du canal via une ref (`removeChannelRef`) déclenché par les handlers terminaux eux-mêmes, et lecture de `phase` via une ref miroir (`phaseRef`, synchronisée par un effet séparé qui s'exécute avant grâce à l'ordre de déclaration) plutôt qu'en dépendance — évite à la fois la re-souscription inutile et la fermeture obsolète (stale closure).
  - **`CompanyIdentityDrawer.tsx`** : bouton "Rédiger" → "Scan" (`Veille`/`Cockpit` inchangés), import dynamique (`next/dynamic`, `ssr:false`) de `AccountScanDialog` — le bundle desktop/mobile/DataTable n'est chargé que si l'utilisateur clique effectivement sur Scan. Imports devenus inutiles retirés (`getCommunicationEntryPoint`, `openCommunicationComposer`, `CommunicationEntryPoint` — plus aucun autre usage dans le fichier, vérifié par grep). Nouveau `handleScanApplied()` : rafraîchissement silencieux de `data` après application (pas de `startTransition`/skeleton — la modale de scan reste ouverte, seule la fiche derrière doit se mettre à jour).
- **Tests** (32 nouveaux, `vitest`) : `account-scan-utils.test.ts` (payload find/verify, libellés, allowlist auto-apply — 5 cas de rejet + 1 d'acceptation, fusion propositions/sources) a **débusqué un vrai bug** avant livraison — `websiteHint`/`locationHint` n'étaient normalisés en `null` que sur chaîne strictement vide (`||`), pas sur une chaîne d'espaces (`"  "` restait truthy) ; corrigé par un `.trim()`. `account-scan-actions.test.ts` (mock `@/lib/supabase/server`, pattern repris de `agenda-actions-mutations.test.ts`) : rejet paramètres invalides, non-authentifié, proposition hors compte/run/statut, appel RPC nominal, erreur RPC non avalée silencieusement, restauration du dernier run (absent, mauvaise opération, en cours, terminé).
- **Validation** : `npx tsc --noEmit` → EXIT 0. `npx eslint` sur les fichiers touchés/créés → 0 erreur (5 warnings pré-existants sans rapport, vérifiés par `git diff` — aucun sur les lignes touchées). `npx vitest run` → 398/399 (1 échec préexistant `mobile-account-custom-list.test.ts`, identique au Lot 1, fichier non touché). `npm run build` → EXIT 0, toutes routes générées.
- **QA navigateur non faite** (Desktop/iPhone 14, ouverture/fermeture pendant `running`, ambiguïté réelle, auto-application réelle) — pas de Chrome DevTools MCP dans cet environnement (cf. [[feedback-no-chrome]]), à faire par Guillaume.
- **Non fait dans cette session (hors périmètre Lot 2, comme demandé)** : recherche/import de contacts (Lot 3-4), scraping LinkedIn, nouveau workflow n8n, nouvelle table, refonte générale du drawer, page cockpit.

### Session 24 — Monitoring IA & coûts : brainstorming + Lot 0 (2026-07-13)

Skill `product-brainstorming` : cadrage de la demande « monitorer les runs n8n + contrôler les coûts IA ». Audit live avant toute proposition (Supabase direct, pas de mémoire) — a recadré la demande : le coût n'est pas un risque business (~16 $/user/mois standard Sonnet 5, ~19 k$/an pour 100 users) mais l'**observabilité** l'est (23-56 % d'échec selon les workflows, runs zombies). Artifact d'audit publié (privé) avec tableau par workflow + modèle 1/10/100 users + architecture `/automatisations`. Guillaume a tranché : démarrer par **Lot 0** (plomberie), traiter la veille via un **simulateur de cadence** en Lot 2.

**Lot 0 livré** (0 token LLM, 3 migrations) :
- **`ai_model_pricing`** (`20260713060000`) : grille tarifaire versionnée effective-dated, même doctrine que `collaborator_compensation` (une seule ligne `effective_to IS NULL` par modèle). Seed `claude-sonnet-5` : tarif intro (2$/10$, jusqu'au 31/08/2026) + standard (3$/15$, à partir du 01/09/2026) — couvre tout l'historique existant sans trou.
- **5 vues `security_invoker`** : `v_ai_result_costs` (base, par résultat/phase — distingue `tokens_missing` de `pricing_missing`, jamais un coût `$0.00` silencieux), `v_ai_run_costs` (rollup par run, coût NULL si UN SEUL résultat a un trou de données — pas de sous-estimation silencieuse ; durée dérivée de `ai_intelligence_runs.started_at/completed_at`, seul niveau où ces colonnes sont réellement remplies — `ai_intelligence_results.started_at` est toujours NULL, 0/106), `v_workflow_health` (taux succès 30j, p50/p95, runs bloqués — seuils alignés sur `reap_stale_intelligence_runs`), `v_workflow_cost_stats` (source de `<WorkflowCostHint>`), `v_ai_cost_timeline` (jour × workflow × owner).
- **Décision documentée** : les colonnes rollup `ai_intelligence_runs.total_cost_estimate/total_tokens_*` restent mortes (vérifié par grep : aucun code applicatif n'en dépend, seul `database.generated.ts`) — le modèle de coût est entièrement porté par les vues, pas par un trigger d'écriture sur les tables existantes.
- **Reaper (ops-004) étendu** (`CREATE OR REPLACE`, signature inchangée) : notifie désormais l'owner in-app (`user_notifications`, `notification_type='ai_run_reaped'`, `deep_link='/automatisations'`) au lieu de reprendre les runs bloqués en silence. Exécuté manuellement en session : **10 runs zombies repris réellement** (5 `intel-010-refresh` running, 1 queued, 4 `account_watch_refresh` running) — confirme que le problème était réel, pas théorique.
- **`pg_cron`** (`20260713061500`, migration isolée pour limiter le risque si l'extension avait été restreinte) : job `reap-stale-intelligence-runs` toutes les 10 min, appelle directement la RPC — **aucun besoin de VPS/n8n**, tout tourne dans Postgres.
- **Correctif de sécurité en passant** (`20260713062000`) : l'advisor a révélé que `reap_stale_intelligence_runs` était exécutable par `anon` ET `authenticated` via REST RPC, contredisant l'intention documentée Session 22 (« EXECUTE réservé service_role ») — le `GRANT PUBLIC` par défaut de Postgres n'avait jamais été révoqué à l'origine. Resserré (`REVOKE ... FROM public/anon/authenticated`, `GRANT ... TO service_role`) puisque la fonction venait d'être touchée — sans impact sur le cron (exécuté en tant que `postgres`, non affecté par les révocations de rôle applicatif).
- **Index unique ajouté**, décision documentée de ne pas en ajouter davantage : `(run_type, created_at desc)` sur `ai_intelligence_runs` — à 130 lignes aucun index n'apporte de gain mesurable, ajouté par anticipation de la croissance (crons de veille récurrents), pas parce que le volume actuel le justifie.
- **`database.generated.ts`** régénéré (piège déjà documenté Session 20 évité : `generate_typescript_types` renvoie un JSON `{"types": "..."}`, extrait via Python plutôt que copié tel quel).
- **Validation** : migrations appliquées et vérifiées par requêtes directes (grille de prix, vues, reaper, cron job). `npx tsc --noEmit` → EXIT 0.
- **Non fait dans cette session** : Lot 1 (onglet Santé + alertes), Lot 2 (onglet Coûts + simulateur de cadence de veille), Lot 3 (micro-modules `<WorkflowCostHint>` etc.), standardisation du callback n8n pour `intel-010-refresh`/`process_diagnostic` (n'émettent toujours pas `tokensInput/Output/modelUsed` — `has_tokens_gap=true` sur `intel-010-refresh` dans `v_workflow_cost_stats`), ajout de `n8nExecutionId` au payload de callback (pas de deep-link n8n possible tant que ce n'est pas fait).

### Session 24 (suite) — Monitoring IA & coûts : Lot 1 (2026-07-13)

- **Correctif callback `intel-010-refresh`** (2 nœuds du workflow JSON, pas de migration) : `Reconcile & Prepare Writes` reconstruit un objet explicite et ne propageait pas `llmUsage` (pourtant extrait correctement par `Parse & Validate LLM Output` : `{ inputTokens, outputTokens, model }`) ; `Prepare Callback` avait `modelUsed: 'claude-sonnet-5'` **codé en dur** (y compris quand aucun appel LLM n'avait eu lieu — cas entité juridique non résolue) et n'émettait jamais `tokensInput`/`tokensOutput`. Corrigé : `llmUsage` threadé jusqu'au callback, `modelProvider`/`modelUsed` dérivés de `recon.llmUsage` (`null` propre si pas d'appel LLM, plus de valeur fantôme), `tokensInput`/`tokensOutput` ajoutés. Validé par simulation Node des 2 branches (entité résolue avec appel LLM / entité non résolue sans appel LLM) + `node --check`. **À réimporter sur le VPS n8n** pour prendre effet (documenté dans `intel-010-refresh.SETUP.md`) — tant que ce n'est pas fait, `has_tokens_gap` reste `true` pour ce workflow dans `v_workflow_cost_stats`.
- **Découverte MCP n8n en écriture** (`n8n-mcp`, outils `n8n_update_partial_workflow` etc.) : schémas chargés mais tous les appels réels (`list_workflows`, `get_workflow`, `health_check`, `n8n_executions`) rejetés « disabled in your connector settings ». Retour à la méthode établie du projet : édition du JSON en repo, import/activation manuels par Guillaume sur le VPS.
- **Migration `enable_realtime_ai_intelligence_runs`** : `ai_intelligence_runs` n'était **pas** dans la publication `supabase_realtime` (seuls `ai_intelligence_results` et `user_notifications` l'étaient) — bloquant pour un journal d'exécution live. Ajoutée (même pattern que les 2 migrations Realtime précédentes). **Effet de bord positif découvert en passant** : `AccountScanDialog.tsx` souscrivait déjà à des événements `UPDATE` sur `ai_intelligence_runs` qui ne pouvaient jamais se déclencher faute de publication — masqué depuis toujours par son fallback de relecture à 20s. Corrigé du même coup.
- **Page `/automations` reconstruite entièrement**, remplace `SectionDashboardTemplate` + `mockAutomationsDashboardData` (100% factice — boutons "Forcer la synchronisation n8n" qui n'allaient nulle part, un des 7 pages encore sur ce gabarit générique de placeholder) :
  - **`src/lib/automations/automations-data.ts`** (nouveau) : `getAutomationsDashboardData()` — 3 requêtes parallèles (`v_workflow_health`, `ai_intelligence_runs` récents + `companies`/`profiles` embed, compteur `user_notifications` type `ai_run_reaped` 7j) puis une requête dépendante ciblée (`v_ai_run_costs` filtrée sur les IDs du journal, pas de N+1) et une dernière pour `v_workflow_cost_stats` (décoration coût par carte santé). Labels de workflow lisibles (`WORKFLOW_LABELS`, fallback sur la valeur brute si `run_type` inconnu — jamais de crash sur un nouveau workflow non documenté).
  - **`src/components/automations/`** (nouveau dossier) : `index.tsx` (server component, détection device + fetch en parallèle, pattern identique à `finance/index.tsx`) ; `AutomationsDesktopDashboard.tsx` (`DesktopAnalyticalPage` — 4 `KpiCard`, grille de cartes santé par workflow avec `StatusPill` de sévérité, rail d'alertes, `DataTable` du journal avec tri contrôlé via `sortDataTableRows`/`sort`/`onSortChange`, Realtime sur `ai_intelligence_runs` UPDATE pour refléter les transitions de statut en place sans refetch) ; `AutomationsMobileDashboard.tsx` (`MobileActionPage` + `MobileHeroInsight` taux de succès 30j + `MobileActionCard` par workflow et par run récent) ; `RunDrillDownDialog.tsx` (partagé desktop/mobile — détail run, message d'erreur, lien vers `/prospection/accounts/[companyId]` si `company_id` présent, bouton **Relancer** réel via `retryFailedRun()` → `POST /api/n8n/trigger` avec le `workflowId`/`entityType`/`entityId`/`companyId`/`input_snapshot` d'origine) ; `automations-status.ts` (règle de sévérité unique partagée cartes/alertes, formatters locaux durée/coût/temps relatif).
  - **Décision de scope assumée** : pas de bouton "Ouvrir dans n8n" fonctionnel (`n8nExecutionId` toujours absent du callback — non traité ce lot) — le drill-down affiche l'ID s'il existe un jour, sans jamais promettre un lien mort.
  - Sandbox dev `dashboard-test` non touché (consomme encore `automationsDashboardConfig`/`mockAutomationsDashboardData`, hors scope).
- **Validation** : `npx tsc --noEmit` → EXIT 0 · `npx eslint` sur tous les fichiers créés/modifiés → 0 erreur (1 warning `useRef` inutilisé auto-corrigé avant validation finale) · `npm run build` → EXIT 0, `/automations` généré en route dynamique.
- **Non fait** : Lot 2 (onglet Coûts + simulateur de cadence de veille), Lot 3 (micro-modules `<WorkflowCostHint>` sous les boutons IA), `n8nExecutionId` (deep-link n8n toujours impossible), QA visuelle réelle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume.

### Session 24 (suite) — Monitoring IA & coûts : Lot 2 (2026-07-13)

Onglet Coûts + simulateur de cadence de veille, dans la même page `/automations` (2 onglets desktop/mobile, `AutomationsTabs.tsx` — pattern repris de `FinanceTabs`).

- **Data layer étendue en un seul passage** (`automations-data.ts`) : les deux onglets partagent le même fetch initial côté serveur (changement d'onglet = état client pur, aucun refetch). Nouvelles requêtes parallélisées avec celles du Lot 1 : `v_ai_cost_timeline` (agrégée en JS par jour et par `owner_id` — noms résolus via une requête `profiles` séparée, **pas d'embed PostgREST possible sur une vue** sans métadonnée de FK, contrairement à une table) ; `account_watch_settings` (comptes actuellement sous veille + répartition par cadence, données réelles : 3 comptes, 1 `twice_weekly` + 2 `weekly`).
- **KPIs coût** (aujourd'hui / 7j / 30j+delta / cumul total) — le delta 30j vs 30j précédents n'est calculé QUE si les deux fenêtres ont des données réelles (sinon `null` explicite, jamais un delta fabriqué à partir d'une fenêtre vide — à ce stade du projet, ~1 mois d'historique total, la fenêtre précédente est souvent vide).
- **`CostTimelineChart.tsx`** (desktop, SVG, pattern `PnlBarChart` — clic pour tooltip) : distingue une barre "non mesurée" (grisée, plate) d'un vrai coût nul, jamais confondus visuellement.
- **`AutomationsMobileDashboard`** : sparkline mini en HTML/Tailwind pur (divs + `height` en %, zéro SVG/librairie) — conforme à la doctrine mobile KREDO, pas une version dégradée du chart desktop.
- **`VeilleSimulatorCard.tsx`** : calculateur interactif (comptes sous veille × cadence × coût réel moyen par run mesuré) → projection de coût mensuel + delta vs situation actuelle. Coût par workflow (barres) et par utilisateur dans le rail/les listes.
- **Piège de frontière client/serveur détecté par le build (pas par `tsc`)** : `VeilleSimulatorCard.tsx` (composant client) important des **constantes runtime** (`VEILLE_RUNS_PER_MONTH`, pas seulement des types) depuis `automations-data.ts` — un module serveur (`createClient` → `next/headers`) — faisait échouer le build Turbopack (tout le module serveur se retrouvait tiré dans le bundle client). `tsc --noEmit` ne l'avait pas détecté : seul `npm run build` l'a révélé. Corrigé en extrayant `VeilleCadence`/`VEILLE_RUNS_PER_MONTH`/`VEILLE_CADENCE_LABELS`/`VeilleSimulatorBaseline` dans un nouveau module client-safe `veille-cadence.ts` (zéro import Supabase), consommé à la fois par le serveur (`automations-data.ts`) et par le client (`VeilleSimulatorCard.tsx`). Les autres composants client de ce lot n'avaient pas ce problème — ils n'importaient que des types (`import type`, erasé à la compilation).
- **Validation** : `npx tsc --noEmit` → EXIT 0 · `npx eslint` → 0 erreur · `npm run build` → EXIT 0 (échec puis correction du piège de frontière ci-dessus, revalidé).
- **Non fait** : Lot 3 (micro-modules `<WorkflowCostHint>` sous les boutons de déclenchement IA ailleurs dans l'app), `n8nExecutionId` (deep-link n8n toujours impossible), QA visuelle réelle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]).

### Session 25 — Optimisation page « Besoins & Staffing » (/missions/opps) (2026-07-15)

Revue perf/code/data/sécurité de `NeedsStaffingWorkspace` puis optimisation ciblée (périmètre validé avec Guillaume avant action : mobile = couper le sur-fetch ; HEX = ne pas toucher). Diagnostic clé : `page.tsx` chargeait **5 datasets / ~10 requêtes** en parallèle (dont 4 scans `opportunities` + 4 scans `opportunity_candidates`) à chaque rendu, y compris en mobile où seule la liste des besoins est affichée.

- **Chargement conditionnel par device** (`(tabbed)/opps/page.tsx`) : en mobile, seuls `getNeedsStaffingSharedData` + `getOpportunitiesList({onlyStaffingNeeds})` sont chargés (~3 requêtes au lieu de ~10) — `getOpportunitiesPlanning`/`getStaffingsList`/`getStaffingsPlanning` (jointures profondes candidats/collaborateurs/**compensation**/calendar_events) ne partent plus. Effet de bord sécurité : la donnée `collaborator_compensation` (RLS admin-only) ne transite plus dans le payload RSC mobile où elle n'est jamais affichée. Desktop inchangé (switch de vues client-side). Le composant supportait déjà `staffingData?` optionnel (`EMPTY_*` fallbacks) — aucune modif côté client nécessaire. `const state = parseNeedsStaffingUrlState(...)` mort supprimé (le workspace lit son propre état d'URL).
- **Filtre `onlyStaffingNeeds` poussé en base** : `STAFFING_NEED_OR_FILTER` (traduction PostgREST `.or(...)` de `isStaffingNeedOpportunity`) ajouté à `coverage.ts`, appliqué dans `get-opportunities-list`/`get-opportunities-planning` (conditionnel — ne casse pas `MissionsDashboardSection`/`/staffing` qui partagent ces fonctions sans l'option) et `get-needs-staffing-shared` (toujours besoins). Prédicat JS conservé en garde-fou.
- **Dédup helper company** : nouveau `src/lib/companies/resolve-company-embed.ts` (`resolveCompanyEmbed`/`resolveCompanyName`, gère embed objet|tableau|null + extraction `metadata.logo_path`) remplace 3 copies de `getCompanyName`+extraction logo dans les fichiers `missions/_data`. **Non appliqué aux fichiers `staffing/_data`** volontairement : leur fallback est `"Client inconnu"` (≠ `"Compte non renseigné"` du helper), swap = changement de texte visible sur la route orpheline `/staffing` — écarté pour préserver le comportement.
- **Simplification** : re-mapping identité mort supprimé dans `getOpportunitiesList` (`MappedRow extends MissionsListRow` → `return mapped` direct). `useMemo` sur les colonnes de `NeedsListView`.
- **Écartés (décision assumée, pas un oubli)** : dédup `cache()`/consolidation des scans (gain runtime nul à 9 opportunités, coupleraient des fonctions indépendantes = churn) ; retrait des `any` des mappers de jointure profonde `staffing/_data` (exception pragmatique déjà en place dans tout le codebase, risque de bataille compilateur pour valeur nulle) ; refonte HEX des boutons flip Kanban/Planning (choix Guillaume : ne pas toucher).
- **Validation** : `tsc --noEmit` → EXIT 0 (après purge `.next/` stale, cf. faux positifs `TS6200`/`TS2300` documentés Session 18) · `npm run build` → EXIT 0 · `vitest run` → **487/487** · `eslint` sur les 7 fichiers touchés/créés → 0 erreur, 0 warning.
- **Non fait** : QA visuelle desktop + mobile (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume, notamment vérifier que le mobile n'a rien perdu (liste besoins + KPIs).

### Session 26 — Audit global (console/archi/data) + durcissement Batch 1-2 (2026-07-15/16)

Audit complet demandé (erreurs console + architecture + schéma Supabase + plan ROI). Cadrage corrigé d'entrée : les **218 `console.error`** sont à ~95 % du logging serveur légitime (catch blocks Server Actions/API, jamais dans la console navigateur) — le vrai trou runtime était structurel (0 error boundary). Data live **saine** : 0 orphelin (contacts/opps/missions/interactions/person_skills), 0 stage legacy ; les row counts de `list_tables` sont des estimations `pg_stat` périmées (companies affiché 0 vs 96 réels). Drift confirmé : **65 tables live vs 35 documentées** ci-dessus.

- **Batch 1 — code (livré, validé)** :
  - **XSS stocké fermé** (`rich-text-utils.ts`) : `documentToHtml` échappe désormais `inline.text` (nouveau `escapeHtml`) avant injection dans le `dangerouslySetInnerHTML` de `KredoRichTextViewer`. Sans perte (le modèle `RichTextDocument` stocke le texte brut séparément des marks/align, seuls nos tags contrôlés produisent du HTML) → pas de dépendance DOMPurify (cohérent "primitives maison"). `align`/`color` viennent d'enums normalisés par le navigateur, insensibles à l'évasion d'attribut.
  - **Error boundaries** (nouveaux `src/app/global-error.tsx` + `src/app/(app)/error.tsx`) : un throw de rendu affiche un fallback "Réessayer" au lieu de l'écran de crash générique. Tokens design vérifiés (`bg-primary`/`text-primary-fg`/`text-heading`/`text-muted`).
  - **Injection de filtre PostgREST** (`api/prospection/accounts/launcher/route.ts`) : `q` était interpolé brut dans `.or(name.ilike.%${q}%,...)` — un terme forgé pouvait injecter des conditions OR (RLS confine au workspace mais évasion de filtre intra-workspace possible). Nouveau `sanitizeOrFilterTerm()` (strip `,()*\":`, cap 100). Grep de couverture : les autres routes de recherche (`search-contacts.ts`, `opportunity-staffing.ts`) sanitizaient déjà ; les `.or()` de `commercial-activity`/`forecast-revenue` interpolent des dates ISO internes (sûrs). Launcher était le seul trou.
  - **Fuites debug purgées** : suppression de `src/test-debug.ts` (script mort instanciant la service-role key au niveau module) + d'un `console.log` client dans `use-open-crm-account.ts` (expédié au navigateur).
  - Validation : `tsc` EXIT 0 · `eslint` (5 fichiers) 0 · `npm run build` EXIT 0 · `vitest` **521/521**.
- **Batch 2 — migration `056` (appliquée en prod `20260715220012_056_audit_batch2_perf_security`)** : générée depuis l'introspection live (colonnes FK et corps de policy exacts, pas de supposition), dry-run en transaction ROLLBACK avant application.
  - **39 index couvrants** sur les FK non indexées (`IF NOT EXISTS`, idempotent) → advisor `unindexed_foreign_keys` = **0** vérifié.
  - **RLS initplan** `user_notifications` (4 policies) : `auth.uid()` → `(select auth.uid())`, sémantique identique. `private.current_workspace_id()` laissé tel quel (style uniforme).
  - **3 fonctions `search_path`** (`archive_financial_model`, `enforce_opportunity_contacts_max_two`, `save_financial_model_snapshot`) : figé à `pg_catalog, public` (**pas** `''` : corps non audités pour un schema-qualifying complet — la forme stricte aurait pu casser une référence non qualifiée). **Corps lus avant application** → tout est qualifié ou built-in `pg_catalog`. **Preuve d'exécution réelle** : `archive_financial_model(uuid)` atteint sa ligne 17 (contrôle métier `P0002`), donc résolution de noms intacte — pas de `42P01`. Les 3 warnings `function_search_path_mutable` ont disparu.
  - **Piège numérotation** : `list_tables` rows périmés ; nom local aligné sur le timestamp réellement appliqué (`20260715220012`) et numéro cosmétique bumpé 054→**056** (054/055 déjà pris, drift habituel [[project-migration-drift]]).
- **Verdict 5 fonctions SECURITY DEFINER exposées à `authenticated`** (advisor `authenticated_security_definer_function_executable`) : **toutes sûres, zéro action**. Corps tracés jusqu'aux privées `perform_proposal_apply`/`perform_proposal_decision` : chacune fait `require_current_workspace()` + garde explicite `wrong_workspace` (double pour l'apply : proposition **ET** cible CRM), toutes les requêtes `account_facts`/`persons`/`contacts` filtrées `workspace_id`. `SECURITY DEFINER` est **nécessaire** (écriture cross-RLS companies/contacts/facts) et **compensé** par ces gardes internes → cas "intentionnel" autorisé par l'advisor. Un `REVOKE EXECUTE` casserait la revue d'enrichissement + l'import contacts du scan. Micro-observation négligeable : `validate_and_apply_enrichment_proposal` (singulier) lit `status` avant délégation (oracle d'existence sur UUID non énumérables, aucune mutation possible) — pas un correctif prioritaire.
- **Reste (dashboard / jugement, pas du code)** : activer leaked-password protection (Auth) ; déplacer extensions `vector`/`unaccent` hors `public` ; les 15 `rls_policy_always_true` restent acceptés par design (DEFAULT + triggers) ; **152 "unused indexes" à NE PAS bulk-droper** (reflètent le faible trafic d'un projet jeune, pas une vraie redondance) ; réconcilier la section "État de la base" (65 vs 35 tables). QA visuelle des error boundaries à faire par Guillaume (cf. [[feedback-no-chrome]]).

### Session 27 — Matching CV assisté IA : brainstorming + Lot 0 (moteur déterministe) (2026-07-16)

Skill `product-brainstorming` : cadrage de la feature « matching CV ». Audit live **avant** toute proposition (pgvector, `match_scores`, embeddings, `person_skills`) — a recadré le brief :
- **Deux flux distincts fusionnés à tort** dans le brouillon : Flux A = ingestion PDF→vivier (qualité de donnée) ; Flux B = besoin→profils classés (aide à la décision). **Découplés, Flux B d'abord** (tourne sur l'existant, effet démo, peu risqué).
- **Refus du vectoriel en V1** (désaccord assumé avec le brouillon) : `vector` installé (v0.8.0) mais **seule** `job_profiles.embedding` existe et **0/65 rempli** ; aucun embedding sur persons/candidates/collaborators ; pool réel ≈ 61 personnes (trop petit pour du recall vectoriel). Surtout, un score cosinus **contredit la doctrine anti-score-opaque** (ADR-0011, dépréciation FOLIO). Le brief lui-même réclamait « critères pondérés compréhensibles » = **moteur déterministe à composantes**, pas boîte noire. Vecteurs repoussés au Lot 5 (booster de rappel une fois le vivier grossi).
- **Aucun stockage de CV** (`candidates` n'a pas de `cv_url`) mais **mine de données structurées** : `person_skills` (247, level/years/confidence), `candidates` (~20 colonnes sémantiques), `opportunity_skills` (weight/importance/min_level/min_years, 55 lignes, 15/18 opps ouvertes couvertes). `match_scores` (18 lignes, `overall_score`+`scores jsonb`+`model_version`+`source_run_id` **nullable, pas de FK**) = table cible parfaite, lue par `get-staffings-list.ts`, **écrite par personne** (prototype seedé).
- **Lucidité métier** : banc interne = **1 seul `intercontrat`** (21 `en_mission`) → valeur court-terme surtout côté **vivier candidats** (~28 actionnables), ce qui remonte l'importance du Flux A futur. Décisions Guillaume : Besoin→Profils, déterministe, découplage, ancrage `OpportunityNeedTab`, pool = dispos immédiats **+ fins de mission < 120 j** (marqués « dispo le JJ/MM » via C4).

**Lot 0 LIVRÉ (0 LLM, 0 embedding) — moteur déterministe complet + RPC :**
- **RPC `get_matching_context(p_workspace_id, p_opportunity_id)`** (`supabase/migrations/20260716120000_057_matching_context_rpc.sql`, SECURITY INVOKER, GRANT authenticated, pattern `get_account_score_context`) + helper `_matching_person_skills` (défini **avant** l'appelant — une fonction SQL-language valide son corps à la création). Hydrate besoin + pool unifié candidats actionnables (`nouveau/qualifie/en_process/propose/vivier`) ∪ collaborateurs `intercontrat`/fin de mission < 120 j. **Coût interne collaborateur jamais exposé** (`expectedDailyRate: NULL`, RLS confidentielle respectée). Testée live sur l'opp SAR : besoin + **34 profils (28 candidats + 6 collab)**.
- **Module `src/lib/staffing-matching/`** (patron `src/lib/account-scoring/`) : `types.ts` (contrat RPC + moteur), `match-config.ts` (`MATCH_VERSION="matching-v1.0"`, `BASE_WEIGHTS` C1 skills 40/C2 séniorité 18/C3 TJM 12/C4 dispo 15/C5 géo 5/C6 practice 10, normaliseurs séniorité/practice **par mots-clés d'après valeurs réelles relevées**, `SKILLS_GATE_FLOOR=25`), 6 composantes pures `components/compute-c{1..6}-*.ts`, orchestrateur `compute-match.ts`, `collect-matching-input.ts` (RPC via `profiles.workspace_id`, pas `private.current_workspace_id()` non exposé PostgREST), `persist-match-run.ts` (écrit `match_scores`, **replace-on-rerun par opportunité** — cache de calcul, pas d'historique curé), Server Action `actions.ts` `runOpportunityMatching`.
- **Doctrine anti-score-opaque tenue** : renormalisation sur composantes **applicables** uniquement (donnée absente sort du num. ET du dénom., remonte dans `missingData`, jamais de pénalité muette — C3 non applicable aux collaborateurs, honnête). pour/contre **dérivés mécaniquement des composantes** (zéro IA).
- **Gate compétences découvert par le sanity check réel** : sans lui, un Expert billettique dispo à C1=0 ressortait « moderate » 47. Corrigé — un C1 applicable sous 25 plafonne le tier à `weak`. **Match de token de localisation** ajouté à C5 (profil dont la mobilité cite la ville de mission = bien localisé). **Sanity check sur la vraie sortie RPC (opp SAR, 34 profils)** : Adrien Sato (5/5 compétences requises, secteur spatial) sort **n°1 à 99.5 « strong » seul**, tous les autres correctement « weak ». C5 non installé postgis/earthdistance → géo = chaîne normalisée + télétravail seulement, jamais de rayon km promis.
- **Validation** : `tsc --noEmit` EXIT 0 · `eslint src/lib/staffing-matching/` 0 · `vitest` moteur **12/12** · `database.generated.ts` régénéré (RPC exposée, extraction JSON via python — piège Session 20 évité).
- **Non fait (Lot 1+)** : **UI modale** (déclenchement `OpportunityNeedTab` + Realtime + liste classée desktop/mobile + détail pour/contre + bouton « présenter » réutilisant `createOpportunityStaffing`) — le moteur existe mais n'est appelé nulle part dans l'app. Lot 2 (narratif LLM par-dessus les composantes), Lot 3 (besoin en texte libre/PDF → extraction LLM des critères), Lot 4 (ingestion CV vivier — Flux A, dédup contre `persons`), Lot 5 (embeddings en booster de rappel + reverse CV→besoins + proactif). QA visuelle à faire par Guillaume (cf. [[feedback-no-chrome]]).

### Session 27 (suite) — Matching CV : Lot 1 (UI modale, branchement complet) (2026-07-16)

Branchement du moteur Lot 0 dans l'app — **pas de Realtime nécessaire** (moteur 100% synchrone, aucun LLM/n8n à attendre), donc machine à états bien plus simple que `AccountScanDialog` : `idle → loading → results/error`.

- **`src/components/staffing/matching/`** (nouveau dossier) : `matching-ui-utils.ts` (labels/tons de tier, `profileSourceKey` = `sourceType:sourceId`, formatage disponibilité) ; `MatchingProfileDetail.tsx` (partagé desktop/mobile — header identité+score, pour/contre, encart "critères non évalués", barres par composante réutilisant le pattern `ScoreDetailModal`, bouton "Présenter ce profil") ; `MatchingResultsDesktop.tsx` (2 volets liste+détail, `max-h-[60vh]` scrollable) ; `MatchingResultsMobile.tsx` (liste puis détail plein écran avec retour — **jamais les deux montés simultanément**, conforme à la règle desktop/mobile réellement distincts) ; `MatchingDialog.tsx` (orchestrateur, `AppDialog`, import dynamique `ssr:false` dans `OpportunityNeedTab.tsx`).
- **Piège React détecté par ESLint et corrigé** : la réinitialisation de l'état du dialog quand `opportunityId` change avait été écrite comme `setState` synchrone dans un `useEffect` (`react-hooks/set-state-in-effect`, cascading renders). Corrigé par le pattern React documenté pour ce cas exact : `<MatchingDialog key={opportunity.id} .../>` — remontage complet plutôt qu'un effet qui pousse du state. Le composant reste sinon monté entre deux ouvertures (résultat conservé tant que le besoin ne change pas), suivant le vrai patron de `CompanyIdentityDrawer`/`AccountScanDialog` (montage inconditionnel contrôlé par `open`, pas un rendu conditionnel `matchingOpen &&` — ce dernier aurait perdu l'état à chaque fermeture).
- **"Présenter ce profil"** appelle directement `createOpportunityStaffing` existant (`source_type`/`source_id` = exactement `sourceType`/`sourceId` du moteur). Le cas "collaborateur sans profil candidat rattaché" (déjà géré côté action, message d'erreur dédié) est anticipé côté UI via `hasCandidateProfile` (déjà porté par la RPC Lot 0) : bouton désactivé + explication, pas une tentative qui échoue à l'aveugle. Le "déjà présent dans le staffing" (erreur existante de l'action) s'affiche inline par profil sans bloquer le reste de la liste.
- **Rafraîchissement** : `onStaffed` remonte jusqu'à `AssistanceCaseDrawer.tsx` → `setReloadKey((c) => c + 1)`, même mécanisme que `onContactsSaved` déjà en place — l'onglet Staffing voit apparaître le nouveau positionnement sans reload de page.
- **`isMobile`** propagé à `OpportunityNeedTab` depuis `AssistanceCaseDrawer` via un nouvel état `isMobileViewport` (`window.matchMedia("(max-width: 767px)")`, pattern identique à `CompanyIdentityDrawer` — ce drawer n'avait jusqu'ici aucune détection viewport propre).
- **Bouton d'entrée** : "Trouver des profils" dans l'en-tête de la section "Compétences recherchées" de `OpportunityNeedTab` (à côté du compteur de critères) — emplacement validé par le cadrage initial (ancrage `OpportunityNeedTab`).
- **Validation** : `tsc --noEmit` → EXIT 0 · `eslint` sur les 6 fichiers touchés/créés → 0 erreur (1 erreur détectée puis corrigée : cf. piège React ci-dessus) · `vitest run` → **562/562** (aucune régression) · `npm run build` → EXIT 0, `/missions/opps` généré.
- **Non fait** : Lot 2 (narratif LLM par-dessus les composantes), Lot 3 (besoin en texte libre/PDF), Lot 4 (ingestion CV vivier), Lot 5 (embeddings + reverse + proactif). QA visuelle réelle (drag d'un vrai clic "Trouver des profils" en navigateur, desktop + mobile) — pas de Chrome DevTools MCP, à faire par Guillaume (cf. [[feedback-no-chrome]]).

### Session 28 — Dispositif d'alerte échec de workflow n8n (2026-07-18)

Le bouton "n8n" du header (en réalité `NotificationBell`, logo n8n, déjà branché en Realtime sur `user_notifications` depuis ADR-0010/Session 24) était sous-exploité — nourri seulement par le brief hebdo et le reaper ops-004, jamais par un échec de workflow direct. Objectif : bounce + anneau rouge en temps réel sur échec, mini-panneau avec date/heure/workflow/message, lien direct vers l'exécution n8n. Décisions Guillaume : bell **unifié** (pas de second indicateur), **Niveau 1** (message déjà capturé au callback, pas de rapatriement de trace n8n complète).

**Lot 1 — Notification in-app** (migration `20260718100000_058_ai_run_failed_notifications.sql`, appliquée) : trigger `trg_notify_on_run_failed` sur `ai_intelligence_runs` (`AFTER UPDATE`) → écrit `user_notifications` (`ai_run_failed`) à tout basculement en échec, quel que soit le chemin (callback n8n ou reaper). Anti-doublon : `reap_stale_intelligence_runs` positionne un flag de session Postgres (`kredo.suppress_run_failed_notification`) autour de son propre `UPDATE`, pour ne pas dupliquer sa notification `ai_run_reaped` déjà plus spécifique (message "délai dépassé" vs message générique). Testé en direct : échec simulé → 1 notification exacte ; passage par le reaper → toujours 1 seule notif, 0 doublon.

`NotificationBell.tsx` : nouveau champ `notification_type` dans la requête/le type, `FAILURE_TYPES` (`ai_run_failed`/`ai_run_reaped`) traité distinctement — bounce fini (`kredo-bell-alert-bounce`, 2 rebonds, jamais en boucle : décision délibérée contre la fatigue d'alarme) déclenché uniquement sur une **nouvelle** arrivée Realtime (pas sur le chargement initial), anneau rouge persistant (`ring-danger`) tant qu'un échec reste non lu, dot/fond rouge distinctif dans le panneau pour ces entrées. `prefers-reduced-motion` respecté (nouveau bloc dans `globals.css`).

**Lot 0 — Lien direct n8n** : capture de `$execution.id`/`$workflow.id` (variables n8n natives, disponibles dans tout nœud Code) dans les 22 nœuds `Prepare Callback`/`Prepare Failure Callback` des **11 workflows** qui rappellent KREDO (`intel-010-refresh`, `intel-020-communication`, `intel-030-account-knowledge`, `intel-031-issues-map`, `intel-032-strategy`, `intel-033-account-watch-refresh`, `intel-040-workspace-diagnostic`, `report-account-summary`, `report-activity-commercial`, `report-activity-recruitment`, `report-weekly-manager` — patché via script Python, un seul patron `const callbackBody = {` identique dans les 22 nœuds, syntaxe JS validée via `new Function()` sur les 22). Les 3 workflows cron purs (`account-watch-scheduler`, `intel-040-workspace-diagnostic-cron`, `report-weekly-manager-cron`) n'ont pas ce patron — ils ne rappellent pas directement KREDO, hors périmètre.
`N8nCallbackPayload` étendu (`n8nExecutionId`/`n8nWorkflowId`) · `runs.ts` : nouvelle fonction `updateRunN8nIds()` — **merge**, pas overwrite, dans `ai_intelligence_runs.config` (qui porte déjà `{ workflowId }` depuis `createRun`), non bloquant (log et continue, comme `updateRunStatus`) · `api/n8n/callback/route.ts` appelle `updateRunN8nIds` après `updateRunStatus`. `RunDrillDownDialog.tsx` : le texte statique "Exécution n8n : {id}" devient un vrai lien `Ouvrir l'exécution dans n8n ↗` (`${NEXT_PUBLIC_N8N_BASE_URL}/workflow/{n8nWorkflowId}/executions/{n8nExecutionId}`, `target="_blank" rel="noopener noreferrer"`) dès que les deux IDs sont présents ; dégrade proprement vers l'ancien texte si seul l'id d'exécution existe, ou vers un message d'indisponibilité si aucun des deux. Nouvelle variable publique `NEXT_PUBLIC_N8N_BASE_URL` (`.env.local`/`.env.example`) — juste l'URL de l'instance, pas un secret, dans le même esprit que `NEXT_PUBLIC_SUPABASE_URL`.

**Validation** : `tsc --noEmit` → EXIT 0 · `eslint` sur les 4 fichiers TS touchés → 0 erreur · `npm run build` → EXIT 0 · `vitest run` → **648/648** · 22/22 nœuds n8n syntaxiquement valides après patch.

**Non fait** : import/réactivation des 11 workflows patchés sur le VPS n8n (aucune config/credential nouvelle requise — `$execution`/`$workflow` sont des variables n8n natives déjà disponibles, un simple réimport du JSON à jour suffit) ; ajout de `NEXT_PUBLIC_N8N_BASE_URL` sur Vercel (prod + preview, cf. [[vercel-prod-env-config]]) ; QA visuelle réelle du bounce/anneau rouge et du lien n8n (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume.

---

### Session 29 — Audit de performance, Lot 5 : requêtes et vues lentes (2026-08-03)

Protocole : `docs/AUDIT-PERFORMANCE-KREDO.md` (§9, journal Lot 5 — détail complet des mesures).

- **Cause racine mesurée, pas supposée** : le coût de la requête la plus lente de l'app n'était ni les RLS, ni un index manquant, ni un plan de jointure — c'était la **détoastification répétée de `companies.metadata`** (14 Ko en moyenne, TOASTé + compressé). `v_crm_account_list` le déréférençait 6 fois par ligne, `v_ai_intelligence_summary` 3 fois : ~6,9 ms et ~447 buffers **par référence** sur 96 lignes. Démontré par décomposition (`select id,name` = 1,25 ms ; `+ logo_path` = 8,13 ms ; les 17 colonnes réelles = 39,4 ms).
- **Migration `20260802225335_060`** : 6 colonnes générées `STORED` sur `companies` (`meta_logo_path`, `meta_contact_stats`, `meta_has_study`, `meta_has_analysis_data`, `meta_has_sector_analysis`, `meta_has_pitches`) + réécriture des 2 vues + dé-fan-out de `v_ai_intelligence_summary` (produit cartésien runs × résultats → 2 agrégats latéraux). Équivalence prouvée en transaction annulée (`EXCEPT ALL` dans les deux sens, 0 écart, 96 lignes) **avant** application.
- **Pièges** : `jsonb_build_object()` est `STABLE` → interdit en colonne générée (premier dessin, un `metadata_digest jsonb` unique, abandonné) ; aucun cast de donnée utilisateur remonté en écriture (les `::integer` restent dans la vue) ; **`security_invoker=true` reconduit explicitement** sur les deux vues — l'omettre dans un `CREATE OR REPLACE VIEW` contournerait toute la RLS.
- **Sur-récupérations** : `getAccountsContactsData()` lançait 8 requêtes dont **5 re-dérivaient des colonnes que la vue produisait déjà** → 6 requêtes fusionnées en 1 (équivalence SQL prouvée sur les 11 colonnes). 5 requêtes tiraient le blob `metadata` par le réseau pour un chemin de logo de 58 caractères (dont la veille : ~1,35 Mo par chargement) → basculées sur `meta_logo_path`. **Régression évitée par `tsc`** : réduire l'embed du drawer d'assistance à `(id, name)` cassait le logo et le site client dans `StaffingProcessStepper`, deux composants plus loin.
- **Statistiques** : `last_analyze` était **NULL sur 70 des 71 tables** — tous les plans reposaient sur des `reltuples` de création (`opportunity_candidates` : 8 estimées / 34 réelles). `ANALYZE` global → 71/71.
- **Aucun index ajouté**, et c'est le résultat : les 2 autres requêtes lourdes de M2 (`contacts` + embed `persons` 61,9 ms ; embed `opportunity_candidates` à 5 niveaux 63,0 ms) tournent **entièrement sur index** — leur coût est la forme d'embed imposée par PostgREST, pas un accès manquant.
- **Gains** : `v_crm_account_list` 39,4 → **3,47 ms** (2 685 → 39 buffers) · `v_ai_intelligence_summary` 23,0 → **3,61 ms** · page Comptes & Contacts ~75 ms sur 6 allers-retours → **3,41 ms sur 1**.
- **Validation** : `tsc --noEmit` EXIT 0 · `npm run build` EXIT 0 · `vitest` **698/698** · `check:server-boundary` EXIT 0 · `eslint` 10 fichiers → 0 erreur (3 erreurs `any` pré-existantes retirées au passage). Isolation RLS revérifiée après application (utilisateur réel 96 / utilisateur inconnu 0 sur les 2 vues et les 6 tables des nouveaux latéraux). `get_advisors(security)` sans avertissement nouveau.
- **Suites décidées par Guillaume et exécutées le même jour** : `pg_stat_statements` **réinitialisé** (ancienne fenêtre 2026-07-13 → 2026-08-02 close, nouvelle au 2026-08-02 23:23 UTC — M2 mesure désormais l'état optimisé, mais restera muet sans trafic réel). **Migration `20260802232433_061`** : ma recommandation initiale d'un `ANALYZE` hebdomadaire était calée sur un volume d'écriture mesuré **pendant les congés de Guillaume**, donc non représentatif — le défaut de méthode étant d'asseoir un déclenchement par horloge sur une estimation de trafic dans une app à activité irrégulière. Remplacé par un déclenchement **par le changement** : seuils d'autoanalyze abaissés sur les 71 tables (`threshold` 50→10, `scale_factor` 0,1→0,05 — les défauts PostgreSQL, dimensionnés pour des millions de lignes, exigeaient 53 modifications sur une table de 34 lignes), plus un filet quotidien `pg_cron` `analyze-public-schema` (`15 3 * * *`, jobid 2). Vérifié : 71/71 tables aux nouveaux seuils, 71/71 analysées, job actif.
- **Non fait** : conversion des ~10 composants de détail lisant encore `company.metadata.logo_path` — dont 4 convertibles (`get-missions-list`, `get-projects-list`, `get-project-detail`, `get-recruitment-workspace`), **chantier suivant validé**. Lot 4 (bundle client) et Lot 6 (mesure terrain) toujours ouverts.

---

### Session 30 — Journal d'exécution `/automations` : clé étrangère manquante + hydratation temps réel (2026-08-04)

Signalement « rien ne s'affiche dans le journal d'exécution ». **Cause racine mesurée avant d'écrire une ligne** : `ai_intelligence_runs.owner_id` a été déclaré `uuid not null default auth.uid()` dans `006_ai_intelligence.sql:55` **sans `REFERENCES`**. La requête du journal demandait pourtant l'embed `owner:profiles(full_name)` — PostgREST le refuse (`PGRST200`, HTTP 400 reproduit en `curl`), `.data` vaut `null`, et le `?? []` le transformait en liste vide. La section n'a donc **jamais** fonctionné depuis sa mise en service (Session 24), ce n'était pas une régression. Les 6 autres requêtes de la page testées une par une : toutes en 200 — d'où KPI, cartes de santé et onglet Coûts corrects pendant que le journal restait muet.

- **Migration `20260804182934_065_ai_runs_owner_fk`** : FK `owner_id → profiles(id) ON DELETE RESTRICT` (doctrine `intelligence_documents.owner_id`, migration 042 — on ne détruit pas l'historique d'exécution avec un profil) + index couvrant `idx_ai_intelligence_runs_owner_id`. Vérifiés avant application : **0 run orphelin** et pose validée en dry-run `ROLLBACK`. Après : `unindexed_foreign_keys` = 0, aucun advisor nouveau hors `unused_index` (catégorie déjà acceptée). **Effet de bord utile** : PostgREST propage la relation aux vues exposant `owner_id`, donc `v_ai_cost_timeline` peut désormais embarquer `profiles` — une requête de résolution de noms supprimée, et le commentaire « pas d'embed possible ici » devenu faux a été retiré.
- **Échecs rendus bruyants** (`AutomationsDataErrorBanner`) : `getAutomationsDashboardData()` ignorait les 7 `error` Supabase. Ils sont collectés dans `AutomationsDashboardData.dataErrors` et affichés en bandeau `role="alert"` — bandeau plutôt que `throw`, les 6 requêtes valides restent utiles quand une seule tombe. C'est ce silence, pas la FK, qui a laissé le bug vivre deux mois.
- **Journal en direct** (`use-run-journal-realtime.ts`, hook partagé desktop **et** mobile — la vue mobile n'avait aucun abonnement) : l'ancienne souscription n'écoutait que `UPDATE` et ne corrigeait que le statut, donc un nouveau run (`INSERT`) restait invisible et durée/coût restaient « — » jusqu'à rechargement. Realtime devient un **signal** (`event: "*"`), et la ligne complète est rechargée par Server Action (`fetchRunJournalRows`), avec la projection `JOURNAL_SELECT` + `mapRunJournalRows()` **partagée avec le chargement initial** — jamais deux implémentations à faire diverger. Pourquoi le coût est disponible dès la transition `succeeded` : dans `/api/n8n/callback`, `saveResult()` (étape 5) précède `updateRunStatus()` (étape 6), la ligne `ai_intelligence_results` existe donc déjà quand l'événement arrive — inutile de s'abonner en plus à cette table.
- **Pièges React tenus** : accumulateur d'ids et minuterie en **variables locales à l'effet** (ni state ni ref) — en state, l'effet dépendrait de valeurs qu'il produit lui-même et détruirait/recréerait le canal à chaque événement reçu (piège `AccountScanDialog`, Session 23) ; coalescence des 2-3 événements d'une exécution en **un** aller-retour (400 ms) ; `setJournal` fonctionnel ; mise à jour en `startTransition` ; liste bornée à `JOURNAL_LIMIT` ; run du drill-down **dérivé** du journal (`useMemo` sur l'id) et non copié, pour que la modale ouverte se mette à jour elle aussi.
- **Bouton « Rafraîchir » + horodatage** (`JournalLiveStatus`) : sans ça un journal figé (canal tombé, onglet resté ouvert) est indiscernable d'un journal calme. `refreshRunJournal()` renvoie `null` en cas d'échec plutôt qu'une liste vide — ne pas rejouer le défaut qu'on vient de corriger.
- **Payload allégé** : `input_snapshot` (jusqu'à 5,3 ko/run) retiré des 50 lignes sérialisées vers le client ; il est relu côté serveur au clic sur « Relancer » (`getRunRetryPayload`), qui en profite pour revérifier workspace **et** statut `failed` avant de rendre la main à `POST /api/n8n/trigger` (chemin inchangé). `profiles.full_name` étant `NULL`, le nom du propriétaire retombe sur l'e-mail au lieu d'afficher « — ».
- **Piège de frontière client/serveur, revu deux fois** : `JOURNAL_LIMIT` importé depuis `automations-data.ts` (`server-only`) par le hook client a fait **échouer `next build`** alors que `tsc --noEmit` passait — exactement le piège `VEILLE_RUNS_PER_MONTH` de la Session 24. Extrait dans `run-journal-merge.ts` (zéro import de valeur serveur, `RunJournalRow` en `import type` donc effacé), qui porte aussi `mergeRunJournalRows()` — pur, donc testable sans mock.
- **Validation** : `tsc --noEmit` EXIT 0 · `eslint` sur les 8 fichiers touchés/créés → 0 erreur 0 warning · `npm run build` EXIT 0 · `vitest` **837/837** (5 nouveaux tests de fusion) · `check:server-boundary` propre pour les modules `automations` · requête `JOURNAL_SELECT` rejouée en `curl` : HTTP 200, compte et propriétaire résolus.
- **Non fait / constaté au passage** : QA visuelle réelle (déclencher un workflow, page ouverte en parallèle, voir les 3 transitions) — à faire par Guillaume, cf. [[feedback-no-chrome]]. Deux dettes **pré-existantes hors périmètre**, non touchées : erreur ESLint `react/no-unescaped-entities` dans `VeilleSimulatorCard.tsx:43` (commit `afeb0d6f`) et `check:server-boundary` en échec sur `src/features/knowledge-hub/expertise/get-kredo-expertise-snapshot.ts` (commit `71c0b5dc`, `import "server-only"` manquant). 19 runs sur 216 seulement portent `config.n8nExecutionId` : le lien « Ouvrir dans n8n » reste muet tant que les 11 workflows patchés en Session 28 ne sont pas réimportés sur le VPS.

---
