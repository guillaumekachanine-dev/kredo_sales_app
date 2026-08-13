# E1 — Taxonomie

> La taxonomie n'est pas produite par la Master Study : elle en est la **condition**. Une étude
> qui crée son propre segment fabrique une catégorie que personne ne lira et qu'aucun compte
> ne rejoindra.

---

## 1. Axiomes

- **`REFERENTIEL-CLASSIFICATION.md` fait autorité, intégralement et exclusivement.** Ce
  document ne le duplique pas : il dit quand l'ouvrir, et ce que E1 en attend.
  Chemin : `docs/FEATURES/sector_intelligence/taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md`.
- **Le `slug` est la seule clé fonctionnelle.** `apply_account_classification()` et le workflow
  INTEL-010 matchent dessus, jamais sur `name`. Un renommage d'affichage est sans effet ; un
  changement de slug casse la chaîne.
- **La classification d'un compte ne passe jamais par `enrichment_proposals`.** Les contrôles
  du référentiel §10 sont **inter-champs** (le macro doit être le parent du segment, trois axes
  sont obligatoires ensemble, la note dépend de la confiance) ; une application attribut par
  attribut les viole silencieusement. Les 7 axes s'appliquent atomiquement via
  `public.apply_account_classification(p_result_id, p_accepted_axes, p_reason)`, qui relit le
  contenu depuis `ai_intelligence_results` — **le client n'envoie jamais de valeur à écrire.**
- **Le macro n'est jamais proposé** : il est déduit de `segment.parent_id`.
- Un segment n'existe que s'il satisfait au moins une des trois conditions cumulatives du
  référentiel §9. Un segment créé pour un compte est du bruit qui coûtera un item de menu,
  une ligne de nomenclature et une fiche vide à maintenir.

---

## 2. Moyens employés

| | |
|---|---|
| **Opérateur** | Claude Code (lecture base + contrôles), Guillaume (arbitrage) |
| **Outil** | SQL de lecture + `REFERENTIEL-CLASSIFICATION.md` + `apply_account_classification()` |
| **LLM autorisé** | Oui, **uniquement** pour proposer une classification au format §7 du référentiel. Jamais pour écrire |
| **Durée** | 15 min si le segment existe et les comptes sont classés ; 1 à 3 h si un segment doit être créé |

---

## 3. Origine de l'information

| Information | Origine | Force |
|---|---|---|
| Existence et slug du segment | `sector_intelligence` (`level`, `parent_id`, `slug`, `display_code`) | Certaine |
| Comptes rattachés | `companies.segment_id` | Certaine |
| Les 7 axes d'un compte | `companies` (migration 068) + `classification_confiance`, `classification_note` | Certaine, tracée |
| Proposition de classification d'un nouveau compte | `ai_intelligence_results` `result_type='account_scan'` (INTEL-010) | Proposition, jamais appliquée automatiquement |
| Règles de création / fusion / suppression | `REFERENTIEL-CLASSIFICATION.md` §9 | Normatif |

**État au 13/08/2026** : 53 fiches (15 macro + 38 segments), **109/109 comptes classifiés**
via `segment_id`, `sector_id` cohérent avec `segment.parent_id` à 100 %.

---

## 4. Méthode

### 4.1 Le chemin nominal — le segment existe

1. Résoudre le slug. Vérifier `level='segment'` et `parent_id` non nul.
2. Compter les comptes : `select count(*) from companies where segment_id = <id>`.
3. Vérifier les axes, en distinguant les deux familles — c'est la condition de G0 :
   les **5 toujours renseignables** (`segment`, `relation_type`, `regime_achat`, `modele_eco`,
   `tier`) doivent l'être à 100 % ; les **2 conditionnels** (`moment`, `vertical_client`) sont
   renseignés **ou** légitimement NULL au sens du référentiel §5.5 et §5.7, le NULL étant
   documenté. Relever `classification_confiance`.
4. Relever le corpus déjà présent sur le segment **et sur son macro parent** — c'est le
   contexte d'entrée de E4, pas une page blanche.

C'est tout. E1 dure quinze minutes dans ce cas, et c'est le cas nominal.

### 4.2 Le chemin exceptionnel — créer un segment

Trois conditions **cumulatives** (référentiel §9). Si une seule manque, le compte rejoint le
segment le plus proche avec un attribut :

1. au moins **2 comptes** partageant les 4 tests (concurrence / acheteurs / réglementation /
   offres KREDO) ;
2. **ou** une fiche KREDO existante à préserver ;
3. **ou** un corpus réglementaire assez spécifique pour qu'un briefing générique soit
   inutilisable.

**La règle des 70 %** tranche les cas limites : *deux entreprises sont dans le même segment si
70 % d'un briefing préparé pour l'une reste pertinent pour l'autre.*

Créer un segment est une migration SQL, jamais un `INSERT` à la volée. Voir référentiel §11.

### 4.3 Le bac « Non rattaché — à qualifier »

Un résidu doit être **nommé résidu**. Une catégorie « Non rattaché » reste visible, gêne, et
se vide. Un macro-secteur au nom présentable ne se vide jamais. Aucun compte ne va dans un
segment « fourre-tout » sous prétexte qu'il faut bien le ranger.

---

## 5. Articulation logique

**Amont** : E0 (le segment cible est nommé).
**Aval** : **G0**. E1 est ce qui rend G0 décidable.

```
E1 répond à trois questions, et G0 les transforme en droit de lancer :
  · le segment existe-t-il ?                    → sinon : créer (migration) ou renoncer
  · combien de comptes y sont rattachés ?       → sous 3 : l'étude coûtera plus qu'elle ne rapporte
  · leurs 5 axes obligatoires le sont-ils ?     → sinon : la carte de priorisation aura un axe mort
  · leurs 2 axes conditionnels sont-ils        → un NULL documenté est conforme ;
    renseignés ou légitimement NULL ?            un NULL inventé ne l'est pas
```

**Ce que E1 débloque** : la maille d'écriture de toute l'étude. Sans `segment_id` figé, E4 et
E5 écrivent au macro par défaut — et reproduisent la fracture mesurée le 13/08 (100 % de la
connaissance sur 15 macros, 100 % des comptes sur 38 segments, 1 seul segment renseigné).

---

## 6. Contrôle qualité

Les contrôles §10 du référentiel sont **normatifs et inter-champs**. E1 en vérifie six avant
toute écriture :

| # | Contrôle | Rejet |
|---|---|---|
| 1 | Le macro est le `parent_id` du segment | Incohérence de hiérarchie |
| 2 | `regime_achat`, `modele_eco`, `tier` sont renseignés ensemble | Classification partielle |
| 3 | `classification_note` est présente si `classification_confiance` < seuil | Note manquante sur un cas douteux |
| 4 | Aucun compte n'a un `sector_id` divergent de `segment.parent_id` | Dénormalisation cassée — `sector_id` est une **projection**, écrite par la RPC seule |
| 5 | Aucun segment créé sans les 3 conditions cumulatives | Bruit de taxonomie |
| 6 | Aucun compte `mapped` n'entre dans les compteurs | ADR-0019 D-3 |

`sector_id` est une dénormalisation cohérente aujourd'hui **parce qu'une seule RPC l'écrit**.
Un `UPDATE` direct la ferait diverger en silence, sans qu'aucun test ne le voie. C'est la
raison pour laquelle le contrôle 4 est permanent, pas ponctuel.

---

## 7. Destination et finalité

| | |
|---|---|
| **Destination** | `companies` (7 axes) · `sector_intelligence` (fiche segment) — via `apply_account_classification()` uniquement |
| **Lecteur** | Toutes les surfaces. La taxonomie est ce qui relie un compte à sa connaissance |
| **Décision qu'elle porte** | À quelle connaissance ce compte a droit, et quel playbook il hérite |
| **Effet écran** | Onglet Secteur du cockpit · filtre sectoriel de BI · résolution `v_sector_knowledge_*` |

---

## 8. Livrables et formalisme

| Livrable | Forme | Emplacement |
|---|---|---|
| État de taxonomie du segment | JSON | `registre/<run>/01-taxonomie.json` |
| Proposition de classification (si nouveaux comptes) | Format §7 du référentiel | `ai_intelligence_results` |
| Migration de création de segment (si applicable) | SQL idempotent | `supabase/migrations/` |

```json
{
  "segment": { "slug": "", "id": "", "level": "segment", "macro_slug": "", "display_code": null },
  "comptes": { "total": 0, "classifies_7_axes": 0, "confiance_faible": 0, "mapped": 0 },
  "corpus_existant": {
    "regulatory_items_segment": 0, "regulatory_items_macro": 0,
    "pain_points_segment": 0, "pain_points_macro": 0,
    "events_segment": 0, "events_macro": 0,
    "playbook_rempli": false, "competitive_map_entries": 0
  },
  "verdict_g0": "go | go_avec_reserve | no_go",
  "motif": ""
}
```

**`corpus_existant` est le champ le plus important du fichier.** C'est lui qui empêche l'étude
de repartir d'une page blanche et de redécouvrir des échéances déjà en base — le défaut
constaté sur l'étude spatiale, qui a déclaré sa rubrique « échéances communes » vide alors que
la base en contenait.
