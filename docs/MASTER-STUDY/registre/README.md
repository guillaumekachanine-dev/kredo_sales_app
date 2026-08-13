# Registre des études

**Une ligne par run.** Ce registre répond à la seule question de gouvernance qui compte au
quotidien : *« sur quels segments sommes-nous crédibles aujourd'hui, et jusqu'à quand ? »*

> 🔴 **Vous reprenez le chantier ?** Commencez par
> **[`ROADMAP-CORRECTIONS.md`](ROADMAP-CORRECTIONS.md)** — autoportant, aucun historique requis.
> Trois défauts de contrat bloquent tout run futur, sur n'importe quel segment.

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
| `2026-08-aero-spatial-defense` | seg-aero-spatial-defense | master (conversion) | 2026-08-13 | ⚠️ | ❌ | — | — | **rejected** — 13 FAIL contre corpus v1.0, 12 contre v1.1 ; aucune ingestion. Voir `08-rapport-ecarts.md` et `ROADMAP-CORRECTIONS.md` | 2026-11-13 | 2027-08-13 |

---

## Premier run — ce qu'il a servi à établir

Le run `2026-08-aero-spatial-defense` n'a **pas** été lancé pour produire de la connaissance : la
matière existait déjà, sous forme de deux études d'août 2026. Il a été lancé pour éprouver les
contrats du corpus contre elle, et il est **rejeté** — ce qui était le résultat attendu.

Sa sortie utile est `08-rapport-ecarts.md`, qui sépare **neuf défauts de contrat** (à corriger
dans le corpus, aucune collecte ne les réparera) de **six manques de matière** (à collecter). Les
six premières corrections listées en §4 ne demandent aucune recherche et lèvent la moitié des
échecs de G1.

Trois d'entre elles bloquent tout run futur, sur n'importe quel segment :

1. **G0 est inpassable par construction** — sa condition « 7 axes à 100 % » contredit le
   `REFERENTIEL-CLASSIFICATION.md`, qu'il déclare pourtant normatif.
2. **Le parseur E5 ne lit pas la couche ESN** que le schéma déclare obligatoire : elle est perdue
   à l'import, silencieusement, et les `profile_json` de 46 octets en base le prouvent.
3. **A9 et `cadrage.schema.json` s'excluent** : le bloc `compteurs` est exigé par l'axiome et
   interdit par le schéma.

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

**Ne pas les rejouer sous ce corpus tant que les trois dettes bloquantes ne sont pas levées**
(`12-OUTILLAGE-ET-PROJETS-LLM.md` §4) : les skills pointant vers un fichier disparu, le
générateur de référentiels qui tronque au pack minimal, et la troncature positionnelle du
collecteur de veille.

En revanche, **les deux référentiels de sources sont réparables sans nouvelle recherche** : les
objets manquants sont partiellement transcriptibles depuis les tableaux markdown des mêmes
documents. Les `collection_url` non documentées passent en `validation_status: "pending"`, et
le verdict honnête devient `usable_with_caveats` — pas `production_ready`.
