# Registre des études

**Une ligne par run.** Ce registre répond à la seule question de gouvernance qui compte au
quotidien : *« sur quels segments sommes-nous crédibles aujourd'hui, et jusqu'à quand ? »*

> ✅ **Vous reprenez le chantier ?** Commencez par
> **[`ROADMAP-CORRECTIONS.md`](ROADMAP-CORRECTIONS.md)** — autoportant, aucun historique requis.
> Au 14/08/2026, **plus aucun défaut de contrat ne bloque un run** : les six corrections A1-A6
> sont appliquées et le gel d'E3 est levé. Le déclencheur unique est le skill
> `kredo-master-study`.

---

## Convention de nommage

```
registre/<AAAA-MM>-<segment-slug>/
├── 00-cadrage.json          E0
├── 01-taxonomie.json        E1  (+ verdict G0)
├── 02-socle.json            E2
├── 03-sources.json          E3
├── 03-journal.md
├── 03-scorecard.txt
├── 04-secteur.json          E4  ← le livrable COMPRENDRE
├── 04-secteur.md
├── 04-journal.md
├── 05-comptes.json          E5  ← le livrable ATTAQUER
├── 05-comptes.md
├── 05-battlecards.md
├── 05-journal.md
├── 06-chaine.json           E6  (si applicable)
├── 06-prospection.md
├── 07-g1.txt                G1  sortie de script, non éditable
├── 07-g2.md                 G2  red team hors contexte
└── 07-verdict.json          estampille finale
```

**Un dossier = un run = un snapshot.** Un rejeu crée un nouveau dossier, jamais un écrasement :
c'est ce qui rend la mise à jour différentielle (V3) possible et la comparaison honnête.

---

## Journal des runs

| Run | Segment | Variante | Snapshot | G0 | G1 | G2 | G3 | Verdict | Péremption triggers | Péremption carto |
|---|---|---|---|:-:|:-:|:-:|:-:|---|---|---|
| `2026-08-parfumerie-compositions-b2b` | seg-parfumerie-compositions-b2b | master | 2026-08-14 | ✅ go | ◐ 14/4 | — | — | **en cours** — E0/E1/E2 produits et exécutés en direct ; E3→E6 à jouer. Les 3 FAIL de journal sont les étapes non encore lancées ; le 4e est une question de contrat (voir ci-dessous) | 2026-11-14 | 2027-08-14 |
| `2026-08-aero-spatial-defense` | seg-aero-spatial-defense | master (conversion) | 2026-08-13 | ⚠️ | ❌ | — | — | **rejected** — 13 FAIL contre corpus v1.0, 12 contre v1.1 ; aucune ingestion. Voir `08-rapport-ecarts.md` et `ROADMAP-CORRECTIONS.md` | 2026-11-13 | 2027-08-13 |

---

## Run en cours — `2026-08-parfumerie-compositions-b2b`

**Premier run produit sous le corpus complet, et le premier qui cherche réellement.** Le
segment a été choisi sur mesure en base : 7 comptes rattachés — le mieux doté des 38 —, les
5 axes obligatoires à 100 %, et un macro qui porte déjà 18 items de connaissance.

Ce que E0→E2 ont établi :

- **G0 : `go`**, sans réserve sur les axes.
- **Identité France : 7/7 résolues** au registre Sirene, toutes en NAF 20.53Z, sièges en
  Alpes-Maritimes, 6 sur 7 à Grasse. Le segment est un cluster industriel réel.
  Deux résolutions exigeaient un arbitrage humain et le script a refusé de les promouvoir :
  « Jean Niel » rend trois homonymes à similarité 1,0 (enseignement sportif dans les
  Hautes-Alpes, immobilier à Lisieux), et « Aromatech Group » n'existe pas au registre sous ce
  nom. Les deux sont désormais tracées dans `02-socle.json`.
- **A7 : gisement vide, et mesuré avant de dépenser.** 4 offres SI dans toute la division NAF 20
  (chimie) en France, 0 dans l'enveloppe du segment — alors que le département 06 en porte 173
  tous secteurs confondus. Le canal ne rendra rien ici ; cinq appels ont suffi à l'établir.
- **S7 : l'échéance pivot du corpus était fausse.** La base datait l'amendement IFRA 52 au
  31/12/2026. IFRA elle-même annonce sa **notification pour fin novembre 2026**, et fixe ses
  délais de conformité *en relatif* à cette notification (+2 et +13 mois pour un standard
  prohibitif). La date en base n'est donc pas une échéance de conformité, et elle n'a pas de
  source. Trois autres items du macro portent une échéance **dépassée** sans que rien ne le
  signale, dont un expiré 14 jours avant le run et toujours marqué `critical`.

**Deux décisions attendent Guillaume** :

1. **L'écriture en base** des 7 identités (`companies.siren`, `naf_code`, `account_facts`). Elle
   n'a pas eu lieu : `faits_identite` vaut 0 partout, et `02-socle.json` le déclare
   explicitement en `ecart_contrat`. C'est un arrêt de méthode, pas un oubli.
2. **La question de contrat que G1 a soulevée** : le gate n'accepte comme source officielle
   d'une échéance que `.gouv.fr` et `europa.eu`. L'IFRA est une association privée, mais ses
   Standards sont la norme opposable de cette filière — et pour ce segment, il n'existe aucun
   texte public équivalent. Soit la liste des autorités s'ouvre aux organismes normatifs
   sectoriels, soit ce segment n'aura jamais d'échéance pivot recevable. **Le producteur ne
   tranche pas son propre gate** (A10) : la question est posée, pas résolue.

---

## Premier run — ce qu'il a servi à établir

Le run `2026-08-aero-spatial-defense` n'a **pas** été lancé pour produire de la connaissance : la
matière existait déjà, sous forme de deux études d'août 2026. Il a été lancé pour éprouver les
contrats du corpus contre elle, et il est **rejeté** — ce qui était le résultat attendu.

Sa sortie utile est `08-rapport-ecarts.md`, qui sépare **neuf défauts de contrat** (à corriger
dans le corpus, aucune collecte ne les réparera) de **six manques de matière** (à collecter). Les
six premières corrections listées en §4 ne demandent aucune recherche et lèvent la moitié des
échecs de G1.

Trois d'entre elles bloquaient tout run futur, sur n'importe quel segment. **Les trois sont
corrigées** — le run `2026-08-parfumerie-compositions-b2b` est la preuve qu'on peut désormais
franchir G0 et produire :

1. ✅ **G0 était inpassable par construction** — sa condition « 7 axes à 100 % » contredisait le
   `REFERENTIEL-CLASSIFICATION.md`, qu'il déclare pourtant normatif. Corrigé : 5 axes
   obligatoires, 2 conditionnels dont le NULL se documente.
2. ✅ **Le parseur E5 ne lisait pas la couche ESN** que le schéma déclare obligatoire : elle était
   perdue à l'import, silencieusement, et les `profile_json` de 46 octets en base le prouvent.
   Corrigé le 13/08 (commit `149d3e98`).
3. ✅ **A9 et `cadrage.schema.json` s'excluaient** : le bloc `compteurs` était exigé par l'axiome
   et interdit par le schéma.

---

## Études produites avant ce corpus

Elles restent des **livrables**, pas des références de méthode. Trois d'entre elles portent des
défauts identifiés et non corrigés — les réutiliser sans correction reproduirait ces défauts.

| Étude | Emplacement | Snapshot | Défauts connus | Statut |
|---|---|---|---|---|
| **BTP — grands travaux** | `sector_intelligence/livrables_etudes/2026-08-btp-travaux-publics/` | 08/08/2026 | Couche ESN vide sur 14/14 comptes · confiance moyenne (accès aux sources primaires bloqué) | Ingérée partiellement · retour de test documenté |
| **Spatial, défense & systèmes critiques (A)** | `livrables_etudes/KREDO_Cartographie_Spatial_…_structure_reference.md` | 08/2026 | Top 3 contredisant le tableau /35 · 90 sources réduites à 15 « familles » sans URL · journal de recherche absent · identité `null` sur 10/10 · couche ESN vide | **Ingérée** dans `competitive_map_entries` (10 entrées) après correction partielle |
| **Spatial, défense & systèmes critiques (B)** | `livrables_etudes/Secteur Spatial, défense & systèmes critiques.md` — **au dépôt en markdown**, pas seulement en PDF (vérifié le 13/08) ; 0 URL, 100 jetons de citation non résolvables | 08/2026 | Écrit pour le compte étalon, pas pour l'ESN · pas de segmentation, pas de score, pas de top 3 | Source de fond de l'étude A |
| **Tourisme, hôtellerie & loisirs** | `cartographie-concurrentielle/assets/` | 08/2026 | Sans `profile_json` | **Ingérée** (5 entrées) |
| **Chaîne de valeur BTP** | `chaine-de-valeur/btp/` | 09/08/2026 | 1 seule zone de captation sur 7 adossée à un chiffre sourcé · **jamais montrée à un client du secteur** | Pilote validé en interne |
| **Référentiel sources Tourisme** | `sources_intelligence_standards/sector_sources_lists/` | 09/08/2026 | JSON non parsable · 5 sources livrées sur 13 annoncées · journal de 5 requêtes · auto-noté `production_ready` · régulateur du secteur absent | **À réparer avant réutilisation** |
| **Référentiel sources Électronique B2B** | idem | 09/08/2026 | 7 sources sur 15 · une source T1 `proof` déclarée « Commission Européenne » avec un domaine de cabinet privé, dans le pack minimal · un score au-dessus de son plafond | **À réparer avant réutilisation** |

---

## Ce qu'il faut faire des études existantes

**Deux des trois dettes bloquantes sont levées** (`12-OUTILLAGE-ET-PROJETS-LLM.md` §4) : les
skills pointent désormais tous vers `kredo-master-study`, et la troncature du générateur de
référentiels est devenue un FAIL bloquant de G1 au lieu d'un silence. Reste la **troncature
positionnelle du collecteur de veille** (`slice(0, 40)`), qui n'empêche pas de produire une
étude mais rend inutile toute extension du corpus de sources côté veille.

En revanche, **les deux référentiels de sources sont réparables sans nouvelle recherche** : les
objets manquants sont partiellement transcriptibles depuis les tableaux markdown des mêmes
documents. Les `collection_url` non documentées passent en `validation_status: "pending"`, et
le verdict honnête devient `usable_with_caveats` — pas `production_ready`.
