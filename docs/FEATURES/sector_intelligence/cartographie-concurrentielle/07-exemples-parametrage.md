# 07 — Exemples de paramétrage

Trois secteurs très différents, pour démontrer que le prompt tient sans modification de sa structure. **Seul le bloc A change.** Les blocs B (mission) restent strictement identiques.

---

## Exemple 1 — Construction / travaux publics *(le cas d'origine, reformulé)*

```text
========== PARAMÉTRAGE DE L'ÉTUDE ==========
SECTEUR                : Construction (BTP)
SEGMENT_CIBLE          : Travaux publics et construction d'envergure — grandes infrastructures
                         publiques, grands projets immobiliers, ouvrages stratégiques
                         (projets critiques ou sensibles)
DEFINITION_DU_MARCHE   : Conception et réalisation d'ouvrages d'infrastructure et de bâtiment
                         de plus de 50 M€, pour des maîtres d'ouvrage publics, des concessions
                         ou de grands comptes privés, en France. Exclut la promotion immobilière
                         pure, la maîtrise d'œuvre seule et les travaux de second œuvre.
COMPTE_ETALON          : Groupe Eiffage (branche construction / travaux publics)
GEOGRAPHIE             : France entière (métropole + DROM)
QUOTAS                 : leaders=3 ; challengers=3 ; mid-market=3 ; outsiders_emergents=2 ; outsiders_niche=3
PROFONDEUR_HISTORIQUE  : trajectoire 10 ans, ambitions affichées à 5 ans
DATE_SNAPSHOT          : [à remplir]
EXERCICE_DE_REFERENCE  : dernier exercice clos publié

--- Contexte du commanditaire (ESN) ---
OFFRE_ESN              : data & IA, applications métier, cloud/DevOps, cybersécurité industrielle
MODELE_DE_VENTE        : régie et forfait, centre de service régional
TAILLE_ESN             : [à remplir]
IMPLANTATIONS          : [à remplir]
REFERENCES_SECTEUR     : [à remplir — sinon "aucune"]
OBJECTIF_COMMERCIAL    : ouverture de nouveaux comptes
COMPTES_EXCLUS         : [à remplir]
========== FIN DU PARAMÉTRAGE ==========
```

**Points d'attention propres à ce secteur** :
- La segmentation par branche est décisive : plusieurs grands groupes cumulent construction, concessions et énergie. Le prompt impose déjà de ne retenir que la branche pertinente — c'est ici qu'il faut être le plus vigilant.
- La commande publique rend les contrats faciles à documenter via les avis d'attribution : c'est le secteur où la rubrique « contrats d'envergure » sera la mieux sourcée.
- Les décisions technologiques sont souvent prises au niveau du groupe, mais les besoins opérationnels naissent sur les chantiers, en région. La rubrique « achat centralisé ou décentralisé » du bloc 4 y est particulièrement discriminante.

---

## Exemple 2 — Retail et distribution

```text
========== PARAMÉTRAGE DE L'ÉTUDE ==========
SECTEUR                : Commerce de détail et distribution
SEGMENT_CIBLE          : Distribution alimentaire et spécialisée à réseau — enseignes exploitant
                         plus de 50 points de vente en France, avec activité en ligne
DEFINITION_DU_MARCHE   : Vente au détail de biens en réseau physique et numérique, en France,
                         par des enseignes intégrées ou en franchise. Exclut le commerce de gros,
                         les places de marché pures et les distributeurs mono-boutique.
COMPTE_ETALON          : [enseigne que vous connaissez déjà le mieux]
GEOGRAPHIE             : France entière
QUOTAS                 : leaders=3 ; challengers=3 ; mid-market=4 ; outsiders_emergents=3 ; outsiders_niche=2
PROFONDEUR_HISTORIQUE  : trajectoire 10 ans, ambitions à 5 ans
DATE_SNAPSHOT          : [à remplir]
EXERCICE_DE_REFERENCE  : dernier exercice clos publié

--- Contexte du commanditaire (ESN) ---
OFFRE_ESN              : data & IA, plateformes e-commerce, cloud, delivery applicatif
MODELE_DE_VENTE        : forfait au résultat, équipes produit dédiées
OBJECTIF_COMMERCIAL    : ouverture de nouveaux comptes + construction d'une offre sectorielle
========== FIN DU PARAMÉTRAGE ==========
```

**Ce que le paramétrage change** :
- Quotas ajustés : le secteur est plus atomisé en bas de marché et connaît un flux continu d'entrants — d'où plus de mid-market et d'émergents, moins de niches.
- Les structures de franchise brouillent la lecture du CA : le CA sous enseigne (tous points de vente) et le CA de la société tête de réseau peuvent différer d'un facteur 5. **Le test de cohérence de périmètre est ici le contrôle prioritaire.**
- La maturité numérique est un axe très discriminant dans ce secteur : la matrice y sera particulièrement lisible.

---

## Exemple 3 — Santé, pharmacie et dispositifs médicaux

```text
========== PARAMÉTRAGE DE L'ÉTUDE ==========
SECTEUR                : Santé — industrie pharmaceutique et dispositifs médicaux
SEGMENT_CIBLE          : Industriels disposant de sites de production ou de R&D en France
DEFINITION_DU_MARCHE   : Recherche, développement, production et mise sur le marché de
                         médicaments ou de dispositifs médicaux, par des entités disposant
                         d'un établissement décisionnaire ou industriel en France.
                         Exclut la distribution pharmaceutique, les établissements de soins
                         et les prestataires de services cliniques.
COMPTE_ETALON          : [industriel que vous connaissez déjà le mieux]
GEOGRAPHIE             : France entière, avec attention particulière aux bassins industriels
QUOTAS                 : leaders=3 ; challengers=3 ; mid-market=3 ; outsiders_emergents=3 ; outsiders_niche=2
PROFONDEUR_HISTORIQUE  : trajectoire 10 ans, ambitions à 5 ans
DATE_SNAPSHOT          : [à remplir]
EXERCICE_DE_REFERENCE  : dernier exercice clos publié

--- Contexte du commanditaire (ESN) ---
OFFRE_ESN              : data & IA, systèmes industriels et qualité, cybersécurité, cloud réglementé
MODELE_DE_VENTE        : régie experte et forfait qualifié
OBJECTIF_COMMERCIAL    : extension sur comptes existants + ouverture ciblée
========== FIN DU PARAMÉTRAGE ==========
```

**Ce que le paramétrage change** :
- Le critère d'inclusion des groupes étrangers est ici **décisif** : une grande partie du tissu industriel français relève de groupes internationaux. Le marqueur « autonomie de décision ou d'achat en France » fait toute la différence entre un prospect réel et un site qui exécute des décisions prises ailleurs.
- Le régime réglementaire crée directement de la demande en systèmes d'information (traçabilité, données de production, validation des systèmes informatisés). La rubrique réglementaire du bloc 1, souvent secondaire ailleurs, devient ici un moteur d'argumentation.
- Le poids des outsiders émergents est plus fort : le secteur compte beaucoup de jeunes sociétés financées, à forte intensité technologique et à cycle de décision court.

---

## Adapter les sources au secteur

Le référentiel `03-sources.md` est neutre. Trois familles doivent être instanciées à chaque nouvelle étude — c'est le seul travail de paramétrage réellement manuel.

| Famille à instancier | Comment la trouver | Ce qu'elle apporte |
|---|---|---|
| **Presse professionnelle du secteur** | Requête « presse professionnelle [secteur] France » ou « magazine [secteur] classement entreprises » | Palmarès annuels (longlist), contrats, nominations, tonalité de la réputation |
| **Fédération ou syndicat professionnel** | Requête « fédération | syndicat professionnel [secteur] France adhérents » | Annuaire des acteurs moyens et de niche, notes de conjoncture, agenda réglementaire du secteur |
| **Régulateur ou autorité sectorielle** | Requête « autorité | agence | régulateur [secteur] France » | Échéances réglementaires confirmées (indispensable : aucune date sans source officielle) |

> **Règle** : ces trois familles se documentent **avant** de lancer la phase 1. Une étude lancée sans avoir identifié la presse professionnelle du secteur produira une longlist bâtie sur la seule notoriété générale — c'est-à-dire biaisée vers les plus gros et aveugle au mid-market, qui est souvent le segment le plus accessible pour une ESN.

---

## Vérifier qu'un paramétrage est bon : les 5 tests

Avant de lancer, passez ces cinq questions. Si l'une échoue, corrigez le paramétrage plutôt que de compter sur l'assistant pour rattraper.

1. **Test d'exclusion** — La définition du marché permet-elle d'écarter sans hésiter un acteur voisin mais hors sujet ? Si non, elle est trop vague.
2. **Test du praticien** — Un professionnel du secteur reconnaîtrait-il « son » marché dans la définition ? Si elle lui paraît artificielle, la longlist sera fausse.
3. **Test de l'étalon** — Connaissez-vous assez le compte étalon pour détecter une erreur dans sa fiche ? Si non, changez d'étalon : c'est votre seul instrument de calibrage.
4. **Test du lundi matin** — Savez-vous dire en une phrase ce que vous ferez du livrable dès sa réception ? Si non, l'étude produira un document, pas une action.
5. **Test de la taille** — Le segment compte-t-il au moins 20 acteurs identifiables ? En dessous, les quotas n'ont plus de sens : passez à la variante « un seul compte » du prompt (voir `01-prompt-generique.md`, section C).
