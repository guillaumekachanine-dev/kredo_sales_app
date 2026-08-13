> 🟡 **ARCHIVE — raisonnement conservé, application interdite** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Index du kit v1.1. Les fichiers 01 à 07 qu'il présente sont périmés ; 00, 08 et 09 sont en archive.
> **Référence à appliquer : `MASTER-STUDY/README.md`**

---

# Cartographie concurrentielle sectorielle — Kit complet

**Pour qui** : un directeur commercial d'ESN en France (et son équipe : commerciaux, business managers, avant-vente, marketing).
**Ce que ça produit** : une cartographie de l'environnement concurrentiel d'un secteur cible, transformée en matériel de prospection directement exploitable (priorisation des comptes, angles d'entrée, battle cards, matrice visuelle).
**Ce que ce n'est pas** : une étude de marché académique. La cartographie n'est qu'un moyen ; le livrable utile est un plan d'attaque commercial argumenté.

---

## Contenu du kit

| Fichier | Rôle | À lire par |
|---|---|---|
| [`00-analyse-et-recommandations.md`](00-analyse-et-recommandations.md) | Analyse de l'intention profonde du prompt d'origine + les 12 améliorations retenues (méthode, périmètre, fond, forme) | Le commanditaire, une fois |
| [`01-prompt-generique.md`](01-prompt-generique.md) | **Le livrable central** : le prompt générique paramétrable, prêt à copier-coller | Tout le monde, à chaque étude |
| [`02-methode-operatoire.md`](02-methode-operatoire.md) | La méthode reproductible en 8 phases, avec budgets de recherche et time-boxes | Celui qui exécute l'étude |
| [`03-sources.md`](03-sources.md) | Le référentiel de sources France, classé par tier de fiabilité et par type d'information | Celui qui exécute l'étude |
| [`04-controle-qualite.md`](04-controle-qualite.md) | La méthodologie de contrôle et de validation : triangulation, tests de cohérence, red team, scorecard bloquante | Celui qui exécute **et** celui qui relit |
| [`05-templates-livrables.md`](05-templates-livrables.md) | Gabarits : fiche compte, battle card, tableau comparatif, schéma d'export CSV/JSON, spécification de la matrice visuelle | Celui qui met en forme |
| [`06-exploitation-commerciale.md`](06-exploitation-commerciale.md) | Comment un commercial s'en sert réellement : priorisation, formulations en RDV, lignes rouges, rituel de mise à jour | L'équipe commerciale |
| [`07-exemples-parametrage.md`](07-exemples-parametrage.md) | Trois paramétrages complets (BTP/travaux publics, retail & distribution, santé/biotech) qui démontrent la généricité | Celui qui lance une nouvelle étude |
| [`assets/matrice-concurrentielle.html`](assets/matrice-concurrentielle.html) | Générateur de matrice visuelle autonome (un fichier, aucune dépendance) : on colle le JSON produit par l'étude, on obtient la carte | Celui qui met en forme |

## Journal des versions

| Version | Date | Ce qui change |
|---|---|---|
| **1.1** | 08/2026 | 8 correctifs issus du premier run réel (BTP / grands travaux) : étape 0 à trois états d'accès web ; critère de substitution quand la part relative n'est pas calculable ; règle des groupes à plusieurs entités opérationnelles ; sources du modèle d'achat ; budget de vérification réservé (15 %) ; indice d'appétence en 1/3/5 pondéré, sur 35 ; statut du compte étalon dans les quotas ; échéances réglementaires communes datées en tête d'analyse transverse. Voir `etudes/2026-08-btp-travaux-publics/retour-de-test.md` |
| 1.0 | 08/2026 | Version initiale — généralisation du prompt BTP/Eiffage |

## Études produites avec ce kit

| Étude | Secteur | Snapshot | Confiance |
|---|---|---|---|
| [`etudes/2026-08-btp-travaux-publics/`](../../etudes/2026-08-btp-travaux-publics/) | BTP — grands travaux et infrastructures (étalon : Eiffage) | 08/08/2026 | Moyenne (accès aux sources primaires bloqué) |

## Pages publiées (privées, liens propriétaire)

| Page | Contenu |
|---|---|
| [Kit méthodologique](https://claude.ai/code/artifact/580628c7-819d-43e1-aff5-ba5d0e733035) | Intention, prompt copiable, méthode, sources, contrôle qualité, exploitation |
| [Étude BTP — grands travaux](https://claude.ai/code/artifact/313ddbfe-ed36-4c7d-b2d8-2f06e05c3e4a) | Le premier run réel, matrice interactive comprise |

---

## Démarrage rapide (30 secondes)

1. Ouvrir `01-prompt-generique.md`, copier le bloc de paramétrage, le remplir (secteur, segment, compte étalon, offre ESN, objectif).
2. Coller le prompt complet dans un assistant **disposant d'un accès web actif** (recherche en ligne). Sans accès web, le prompt doit refuser de produire — c'est une garde volontaire.
3. Récupérer les 6 blocs de sortie, dont l'export JSON.
4. Coller le JSON dans `assets/matrice-concurrentielle.html` pour obtenir la matrice.
5. Passer la scorecard de `04-controle-qualite.md` **avant** de diffuser quoi que ce soit en interne.

---

## Les 5 principes qui structurent tout le kit

1. **Une donnée sans source datée n'existe pas.** Un trou assumé vaut mieux qu'un chiffre plausible inventé : un prospect qui repère une seule statistique fausse invalide tout le reste du document, y compris ce qui était juste.
2. **Le périmètre avant le chiffre.** L'erreur n°1 de ce type d'étude est de comparer un CA groupe monde à un CA France d'une seule branche. Chaque chiffre porte son périmètre et son exercice.
3. **La cartographie sert la vente, pas l'inverse.** Toute rubrique qui ne change ni la priorisation d'un compte, ni la formulation d'un discours, ni le choix d'un interlocuteur, est supprimée.
4. **Reproductible = paramétré + tracé.** Deux personnes qui lancent l'étude sur le même secteur à la même date doivent aboutir à la même segmentation. D'où les seuils explicites, les requêtes normalisées et le journal de recherche.
5. **Périssable, donc versionné.** Une cartographie est vraie à une date. Chaque livrable porte sa date de snapshot et sa cadence de rafraîchissement.
