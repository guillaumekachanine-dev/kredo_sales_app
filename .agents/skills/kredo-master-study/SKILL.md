---
name: kredo-master-study
description: Conduit toute production de connaissance commerciale KREDO — étude sectorielle, corpus de sources, cartographie concurrentielle, fiches comptes, chaîne de valeur, gates et ingestion — en appliquant la chaîne E0→E7 du corpus docs/MASTER-STUDY/, seule autorité sur le sujet. C'est le SEUL déclencheur autorisé : les skills kredo-sector-intelligence et kredo-sources-sectorielles conduisent un process v1 archivé dont l'application est interdite. Utilise ce skill dès que Guillaume parle d'attaquer, d'étudier ou de cartographier un secteur, un segment ou un compte : lancer ou mettre à jour une étude, construire un référentiel de sources, prioriser ou scorer des comptes, préparer un rendez-vous, produire un playbook ou un angle d'entrée, modéliser une chaîne de valeur, contrôler ou ingérer une étude existante — même sans les mots « étude », « master study » ou « cartographie » (ex. « on attaque quoi après le spatial ? », « il nous faut un angle pour l'assurance », « qui sont les vrais concurrents de X ? », « prépare-moi le RDV Naval Group », « cette carto vaut quoi ? », « d'où sort ce chiffre ? », « ajoute la Travel Tech »). En cas de doute entre ce skill et un autre sur un sujet sectoriel ou concurrentiel, c'est celui-ci.
---

# KREDO — Master Study

Ce skill conduit la production de connaissance commerciale. Il porte le **comment** : l'ordre,
les gates, les arrêts, les refus. Le **quoi** — axiomes, schémas, prompts, seuils, destinations —
vit dans `docs/MASTER-STUDY/`, qui fait autorité et que tu ouvres au lieu de le deviner.

**Préséance, en cas de conflit :**

```
le code et la base  >  docs/MASTER-STUDY/  >  les archives  >  CLAUDE.md  >  ta mémoire
```

Cette hiérarchie n'est pas de la modestie documentaire. Le corpus a été écrit **après** avoir lu
la base ; un agent qui écrit du SQL de mémoire produit du SQL faux. Et ce corpus lui-même dérive :
il porte des compteurs datés du 13/08/2026 qu'il te demande explicitement de revérifier en base.

## Ce que ce skill remplace, et pourquoi c'est bloquant

Deux skills traitaient ce sujet avant — `kredo-sector-intelligence` et
`kredo-sources-sectorielles`. Ils ont été ramenés à des redirections vers ici le 14/08/2026, et
**ils ne doivent plus conduire aucune production.**

Le premier déclarait comme autorité `_legacy_kredo_(studies_v1)/PROCESS-ETUDE-SECTORIELLE.md`, un
document qui porte le bandeau **« ARCHIVE — raisonnement conservé, application interdite »**
(`README.md` §5.2). Il conduisait le process v1 : fiche sectorielle unique, grille
auto-administrée /100, injection SQL directe. Trois choses que le corpus actuel interdit — le
livrable est devenu sept fichiers JSON validés, la notation par le producteur est précisément le
défaut que G1/G2/G3 existent pour supprimer, et l'ingestion passe par un bac d'arbitrage humain.

Si l'un des deux se déclenche malgré tout, arrête-toi et bascule ici. Leur doctrine n'est pas
perdue : ses six règles ont été reprises dans `00-DOCTRINE.md`, et leurs scripts d'audit restent
en place — ce sont les ancêtres de G1.

## Préflight — quatre lectures, dans cet ordre

Aucune ne se saute. La quatrième est celle qui évite de lancer un run qui ne peut pas aboutir.

1. **`docs/MASTER-STUDY/00-DOCTRINE.md`**, intégralement, une fois. Douze axiomes, trois régimes
   de production, les quatre conversions. Tout le reste en dépend.
2. **`docs/MASTER-STUDY/README.md` §5** — le registre de légitimité. Il dit quel document ailleurs
   dans le dépôt est **normatif délégué**, **archive** ou **périmé**. Un document périmé garde son
   air d'autorité : c'est précisément pourquoi ce registre existe.
3. **`registre/ROADMAP-CORRECTIONS.md`** — l'état d'exécution réel. Autoportant, daté, et il liste
   ce qui bloque *aujourd'hui*.
4. **La base.** Le segment existe-t-il, combien de comptes y sont rattachés, que porte déjà le
   corpus ? `references/etat-du-chantier.md` donne les requêtes. Ne devine jamais un corpus : le
   défaut le plus cher observé est une étude qui a déclaré sa rubrique « échéances communes » vide
   alors que la base en contenait la matière.

Puis annonce ce que tu vas faire et pourquoi, avant d'exécuter.

Si Guillaume veut un parcours pas à pas lisible sans naviguer entre documents, il existe déjà :
`docs/MASTER-STUDY/GUIDE-UTILISATEUR.md`. Il n'a aucune autorité propre — en cas d'écart avec un
document numéroté, ce dernier gagne, et le guide se corrige — mais c'est la vue de référence à lui
montrer plutôt qu'en refaire une.

## Les six refus

Ce sont les règles qui font la valeur du dispositif. Chacune vient d'un échec mesuré, pas d'un
principe — et chacune coûte quelque chose à respecter, sinon elle serait déjà tenue.

**1. Ne jamais produire un champ du régime déterministe.** SIREN, NAF, IDCC, effectif par
établissement, dates réglementaires officielles sont **reçus** de E2, ou laissés vides.
*Pourquoi :* demandé à un LLM, le SIREN valait `null` sur 10 comptes sur 10 — alors qu'il est
public, gratuit et instantané. Ce que E2 sait faire ne se devine pas, ça se branche.

**2. Un trou déclaré bat un chiffre plausible.** « Non publié », « non trouvé », « à confirmer »
sont des réponses attendues.
*Pourquoi :* un prospect qui repère **une seule** statistique fausse invalide tout le reste, y
compris les 90 % qui étaient vrais. Le coût d'un trou assumé est nul ; celui d'une invention
détectée est total.

**3. Une inférence porte son nom.** « Besoins SI probables » est banni du vocabulaire. On écrit
**« chantiers observés »**, adossés à une offre d'emploi, un communiqué, un marché attribué ou une
référence éditeur. Une hypothèse porte le mot « hypothèse » et sa méthode.
*Pourquoi :* l'écart entre ce qui est *annoncé* et ce qui est *déployé* est l'information la plus
vendeuse de l'étude. Un acteur qui communique sur l'IA sans recruter un seul profil correspondant
a un besoin, pas une solution — et ça ne se voit que si les deux registres restent distincts.

**4. Un compteur qui ment est pire qu'un compteur absent.** Chaque livrable porte un bloc
`compteurs`, et `compteurs.<liste> == len(<liste>)` pour chacune.
*Pourquoi :* deux référentiels annoncent 15 et 13 sources, leurs JSON en contiennent **7 et 5** —
et la coupure tombe exactement à la frontière du pack minimal sur les deux. C'est un mode de
défaillance systématique du générateur, invisible à la lecture, détectable en une ligne de script.

**5. Le producteur n'est jamais son propre jury.** Aucune étude ne se déclare `production_ready`
elle-même. G1 est un script, G2 s'exécute hors du contexte de production, G3 est humaine.
*Pourquoi :* un référentiel s'est déclaré `production_ready` sur 12 critères tous « validés », dont
« passe red team exécutée », avec un journal de 5 requêtes là où la méthode en exige 15 à 25.

**6. N'écris jamais dans un JSON du registre un état que la base ne porte pas.**
*Pourquoi :* c'est le défaut le plus récent, mesuré le 13/08/2026. Un lot de corrections a converti
trois FAIL honnêtes en PASS en écrivant des mesures qu'aucun appel n'avait produites — une
intégration API inexistante, une URL Légifrance dont l'identifiant était inventé. Bilan réel du
lot : **un seul PASS gagné**, celui obtenu en écrasant un `null` assumé. Le gate a depuis été
durci pour que la fabrication coûte plus cher que l'aveu ; ne le teste pas.

**La formulation générale :** un livrable avec des trous visibles bat un livrable complet mais
fragile. Quand tu hésites entre laisser vide et combler avec du plausible — laisse vide, écris
pourquoi, et dis-le dans ton compte rendu.

## Choisir le run avant de le lancer

Une variante n'est pas une méthode allégée : c'est un **périmètre réduit sur la même méthode**.
Les axiomes, les gates et les schémas sont identiques. Si une variante devait assouplir un axiome
pour tenir dans son budget, c'est le budget qui est faux.

| Variante | Quand | Étapes | Durée |
|---|---|---|---|
| **V0 Master Study** | Nouveau segment, ou refonte à 24 mois | E0→E7 | 2 j + 0,5 j humain |
| **V1 Tier d'un compte** | « Qui d'autre j'ouvre avec le même discours ? » | E0 E1 E5' E7 | 4 h |
| **V2 Compte unique** | Un rendez-vous dans huit jours | E0 E2 E5'' E7 | 2 h |
| **V3 Mise à jour** | Trimestrielle, sur un secteur déjà étudié | E2 E5''' G1 E7 | 30 min/compte |
| **V4 Rafraîchissement** | À 12 mois : chiffres et catégories | E2 E4' E5 E7 | 1 j |
| **V5 Chaîne de valeur** | Secteur déjà cartographié, chaîne manquante | E6 | 4 h |

Détail et conditions dans `11-VARIANTES.md`. **V1 est celle qui sert le plus souvent** — c'est la
question posée en revue de pipeline. V0 est un engagement de deux jours : ne le lance pas quand la
demande réelle est un V1 ou un V2.

## La chaîne et ses gates

```
E0 cadrage ─► E1 taxonomie ─► ⟨G0 droit de lancer⟩ ─► E2 socle déterministe
   └─► E3 corpus de sources ─► E4 étude sectorielle ─┬─► E5 cartographie & comptes
                                                     └─► E6 chaîne de valeur (conditionnelle)
   ─► ⟨G1 script⟩ ─► ⟨G2 red team, hors contexte⟩ ─► ⟨G3 recette humaine⟩ ─► E7 ingestion
```

Le détail de chaque étape — opérateur, contexte à injecter, prompt, schéma, livrable, contrôle —
est dans **`references/chaine-e0-e7.md`**. Ouvre-le au moment d'exécuter une étape, pas avant.

Quatre choses que la carte ne dit pas et qui commandent tout :

- **E4 et E5 sont un seul run, deux fichiers.** Même contexte, même registre de sources — le
  reformatage a posteriori détruit les preuves (une étude reformatée a perdu 90 sources numérotées,
  remplacées par 15 « familles » sans URL). Mais deux lecteurs, deux péremptions, donc deux
  livrables.
- **E2 s'exécute avant l'étude et devient son contexte d'entrée.** C'est la différence entre une
  chaîne et deux outils qui s'ignorent.
- **E4 amorce déjà la chaîne de valeur.** Son ingestion écrit un nœud par maillon (`rang=1`,
  `capture_valeur` NULL) — E6 ne part jamais de zéro, il approfondit (ADR-0021 §9.1/MS-19).
- **G0 est le gate qui économise le plus.** Il s'exécute après E1, avant E2, et il refuse de lancer
  une étude qui ne peut pas aboutir.
- **Un gate n'est pas une formalité de fin : c'est le droit de continuer.**

### Les gates, et ce qu'ils refusent

| Gate | Qui l'exécute | Refuse |
|---|---|---|
| **G0** | Toi, après E1 | Un segment inexistant, moins de 3 comptes rattachés, les 5 axes obligatoires incomplets, aucun objectif commercial déclaré |
| **G1** | `scripts/audit-master-study.py` | Comptage pur, aucun jugement : parsabilité, invariant des compteurs, sources résolvables, arithmétique de l'appétence, plancher de preuve, couche ESN, journaux de requêtes |
| **G2** | NotebookLM ou une session neuve | Six questions de red team, les quatre premières bloquantes. **Le point clé est le changement de contexte** — un modèle qui ne répond que depuis le corpus déposé ne peut pas combler un trou par mémoire |
| **G3** | Guillaume | *« Est-ce que je décrocherais mon téléphone avec ça ? »* |

```bash
python3 scripts/audit-master-study.py docs/MASTER-STUDY/registre/<run>/ --today AAAA-MM-JJ
```

Il lit les schémas sur disque : un contrat qui bouge ne demande aucune retouche du script.
`--check-urls` vérifie que chaque source répond, et sollicite le réseau. Sa sortie va dans
`registre/<run>/07-g1.txt` et **ne s'édite pas à la main**.

> Tu vas être indulgent avec toi-même au moment de juger ta propre production. C'est le biais le
> plus prévisible de l'exercice. Fais tourner G1 sur ton brouillon et ne t'attribue que ce qu'il
> te laisse.

## Les quatre arrêts où Guillaume décide

Les franchir seul est la seule faute non rattrapable de ce processus.

- **Le choix du segment** (E0), sauf s'il l'a nommé. Il se calcule — nombre de comptes, corpus
  existant, densité du gisement déterministe — il ne s'intuite pas.
- **G0 en `no_go` ou `go_avec_reserve`.** Tu rends le verdict et ce qui manque ; tu ne contournes
  pas.
- **Toute écriture en base.** Deux outils existent déjà, un par couche, et tous deux tournent en
  dry-run par défaut — **tu ne passes en écriture réelle qu'avec accord explicite** :
  `CompetitiveMapImportWizard` pour E5 (bac d'arbitrage humain, résolution d'entité qui produit des
  `ambiguous` — volontairement non automatisable, ADR-0019) ; `scripts/ingest-master-study.mts` +
  RPC `public.ingest_master_study_e4` pour E4/E6 (transaction `ROLLBACK` puis `--live`, ADR-0021).
  Après un `--live`, rejoue `supabase/tests/069_sector_knowledge_resolution.assertions.sql` — la
  seule ingestion réelle à ce jour a révélé une RPC qui ne promeut jamais
  `sector_intelligence.status` vers `active`, invisible tant que les 18 assertions ne sont pas
  rejouées une à une.
- **Un doute stratégique.** « Je ne vois pas comment ce secteur se vend » n'est pas un problème de
  méthode, c'est une vraie question. Pose-la plutôt que de deviner un angle.

Annonce à chaque fin d'étape ce que tu as trouvé, ce qui manque, et ton verdict provisoire. C'est
ce qui permet d'être arrêté tôt plutôt que corrigé tard.

## Ce que tu produis, et où ça atterrit

Un run remplit un dossier `docs/MASTER-STUDY/registre/<AAAA-MM>-<segment-slug>/`. Un dossier = un
run = un snapshot ; un rejeu crée un nouveau dossier, jamais un écrasement.

| Étape | Fichiers | Schéma | Sert à |
|---|---|---|---|
| E0 | `00-cadrage.json` | `cadrage.schema.json` | En-tête de tous les prompts suivants |
| E1 | `01-taxonomie.json` | `taxonomie.schema.json` | Rendre G0 décidable |
| E2 | `02-socle.json` | `socle.schema.json` | Contexte déterministe de E3/E4/E5 |
| E3 | `03-sources.json` · `03-journal.md` · `03-scorecard.txt` | `source-registry.schema.json` | Le droit de citer |
| E4 | `04-secteur.json` · `04-secteur.md` · `04-journal.md` | `sector-knowledge.schema.json` | La couche **COMPRENDRE** |
| E5 | `05-comptes.json` · `05-comptes.md` · `05-battlecards.md` · `05-journal.md` | `competitive-map.schema.json` | La couche **ATTAQUER** |
| E6 | `06-chaine.json` · `06-prospection.md` | `value-chain.schema.json` | Maillons, captation, découverte en RDV |
| E7 | `07-g1.txt` · `07-g2.md` · `07-verdict.json` | — | Le verdict et l'estampille |

**Le livrable est le JSON ; le markdown est une vue générée depuis lui, jamais l'inverse.** Un JSON
collé dans un markdown avec des échappements n'est pas un livrable — c'est arrivé, et il ne parsait
pas.

La correspondance entre ces livrables, les 37 blocs de connaissance et leur destination dans
l'application est dans **`references/blocs-et-destination.md`**.

## Ce qui est bloqué aujourd'hui

Vérifie l'état réel avant de promettre un run complet : **`references/etat-du-chantier.md`**, et la
`ROADMAP-CORRECTIONS.md` qui fait autorité dessus. Ce fichier-ci ne prétend pas être à jour plus
longtemps qu'il ne l'a mesuré — la ligne qui suit vient d'être revérifiée en base.

**La chaîne a déjà tourné jusqu'au bout une fois.** `seg-parfumerie-compositions-b2b` a franchi
G0, produit E0→E5, et a été **ingéré en base le 20/08/2026** (`--live`, ADR-0021 L3, verdict
`usable_with_caveats`) — BI et le cockpit le lisent désormais via les modèles de lecture livrés
L4/L5 (`SectorKnowledgeReadModel`, `AccountSectorPerspective`). E3 n'est plus gelé depuis le
14/08 : `check_packs` (G1) transforme la troncature du générateur en FAIL bloquant au lieu d'un
silence.

Ce que ça ne veut pas dire : que le chantier est fini, ou que G0 est devenu facile à passer.
**Revérifié en base le 22/08/2026** (requête `references/etat-du-chantier.md` §5) : le nombre de
segments qui franchissent la condition d'axes de G0 est **descendu de 6 à 4** depuis le 14/08 —
de nouveaux comptes ont été rattachés à des segments sans être classifiés sur les 3 axes libres,
et **`seg-parfumerie-compositions-b2b` lui-même en fait partie** : il est passé de 7 à 10 comptes
rattachés, dont seulement 7 ont leurs axes complets. Le segment qui a servi de preuve que la
chaîne fonctionne ne repasserait plus G0 tel quel aujourd'hui. **Ne cite jamais un segment
franchissant G0 sans avoir rejoué la requête** — le paysage bouge d'une semaine à l'autre, dans
les deux sens.

Ce qui reste ouvert, sans ambiguïté :
- **B4, la couche accessibilité, à 0 fait sur les comptes de la base.** L'axe qui dit « le droit
  d'intervenir » n'existe encore nulle part.
- **G2, la red team, n'a jamais tourné** sur aucun run — y compris celui qui a été ingéré. Le
  verdict `usable_with_caveats` du 20/08 a été rendu sans elle.

Dis-le **avant** d'engager la journée, pas au moment de rendre.

## Comment on sait que c'est bon

G1 mesure si tu as le droit d'ingérer. La question suivante mesure si ça sert à quelque chose :

> Un commercial ouvre KREDO. Il dit quel compte il appelle ce matin et pourquoi celui-là. Il sait
> à qui parler et si KREDO a le droit d'intervenir. Il ouvre sur une échéance datée que son
> interlocuteur reconnaît. Il tient trois minutes sans être interchangeable. Et si le DSI demande
> **« vous tenez ça d'où ? »**, il ouvre la source.

Cinq points. Les deux études produites hors corpus en août 2026 tenaient le quatrième ; une seule
tenait le cinquième ; **aucune ne tenait les trois premiers**. C'est le problème que ce dispositif
existe pour régler. Le premier run produit *sous* le corpus complet (`seg-parfumerie-compositions-
b2b`) a été ingéré `usable_with_caveats`, sans G2 exécutée — il ne prouve donc que les trois
premiers points, pas les cinq. C'est à cette aune que se juge ce que tu rends, pas au nombre de
pages.
