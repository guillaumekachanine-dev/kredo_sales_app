---
name: kredo-sources-sectorielles
description: RETIRÉ comme déclencheur — ne pas utiliser directement. La construction et le contrôle d'un référentiel de sources sectorielles sont devenus l'étape E3 de la chaîne MASTER STUDY, conduite par le skill kredo-master-study, seul déclencheur autorisé. Toute demande portant sur les sources d'un secteur, un référentiel, un pack minimal, une scorecard de sources, un prompt Deep Research ou un journal de recherche passe par kredo-master-study. Si ce skill se déclenche, bascule dessus sans rien produire.
---

# RETIRÉ comme déclencheur — voir `kredo-master-study`

**Ne conduis rien depuis ce fichier.** Le référentiel de sources est l'étape **E3** de la chaîne
E0→E7 ; elle se conduit depuis **`kredo-master-study`**, qui porte l'ordre, les gates et
l'articulation avec E4 et E5.

## Pourquoi le retrait

Ce skill n'était pas faux — sa séparation conduite / référence était la bonne, et son diagnostic
du mode d'échec reste exact : *le problème n'est pas « on ne trouve pas de sources », c'est un
livrable élégant qui se note lui-même avec indulgence.*

Mais un référentiel de sources n'est pas un livrable autonome. Il reçoit son périmètre de E0,
son contexte déterministe de E2, et il n'a de valeur que consommé par E4 et E5 **dans le même
run, sur le même registre**. Déclenché seul, il produit un annuaire — et deux déclencheurs
concurrents sur le même sujet, c'est le mécanisme exact par lequel les skills ont fini par
référencer un document disparu.

## Ce qui reste normatif, et où

| Objet | Où il vit |
|---|---|
| La conduite de E3 | `docs/MASTER-STUDY/06-ETAPE-E3-CORPUS-DE-SOURCES.md` |
| Le prompt à jour | `docs/MASTER-STUDY/prompts/E3-corpus-sources.md` — il remplace `03_PROMPT_CANONIQUE`, **périmé** |
| Le contrat de sortie | `docs/MASTER-STUDY/schemas/source-registry.schema.json` |
| La qualification d'une source : tiers, rôles, barème /100, 24 critères | `docs/FEATURES/sector_intelligence/sources_intelligence_standards/` fichiers `01_`, `02_`, `04_`→`08_` — **toujours normatifs délégués** |

Les fichiers de ce dossier restent en place et **ne sont pas à supprimer** :

- `scripts/audit_referentiel.py` — la scorecard 24 critères, que `06-ETAPE-E3…` §7 désigne
  toujours comme son exécutant, hors du contexte de production ;
- `assets/durcissement-gemini.md`.

Les contrôles structurels du référentiel (parsabilité, invariant des compteurs, cohérence
éditeur/domaine, résolution des URL) sont, eux, repris par G1 :

```bash
python3 scripts/audit-master-study.py docs/MASTER-STUDY/registre/<run>/
```
