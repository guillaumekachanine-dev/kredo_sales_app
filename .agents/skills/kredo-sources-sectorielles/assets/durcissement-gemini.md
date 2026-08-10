# Consignes complémentaires — à respecter en plus de tout ce qui précède

Ces onze points corrigent des défauts réellement observés sur un référentiel
précédent produit avec ce même prompt. Le document rendu était impeccable à la
lecture et pourtant inexploitable en aval. Ils priment sur toute habitude de
rédaction contraire.

## Sur l'export JSON — c'est le livrable qui compte

1. **L'export §11 est un export, pas un résumé.** Il contient **autant d'entrées
   `sources` qu'il y a de lignes dans le registre §3**, et autant d'entrées
   `information_needs` qu'il y a de lignes dans le tableau §2. Un JSON qui ne
   reprend qu'une sélection de « sources principales » rend le référentiel
   invisible pour l'outil qui le consommera : le markdown n'est lu par personne
   en aval, c'est le JSON qui sert de corpus.

2. **Un seul bloc, clôturé, complet, non tronqué.** Ouvre-le par ```json et
   ferme-le. Si le registre est long, le JSON est long : ne l'abrège pas, ne
   mets pas de `...`, ne commente pas à l'intérieur.

3. **Aucun échappement de mise en forme dans le JSON.** Pas de `\_`, pas de
   `\[`, pas de `\&`, pas de backslash doublé devant les guillemets. Le bloc
   doit pouvoir être copié tel quel dans un analyseur JSON et parser du premier
   coup. C'est le défaut le plus coûteux du run précédent : le JSON produit
   était syntaxiquement invalide et personne ne s'en est aperçu.

4. **`utility_score` est la somme de ses six composantes**, pas une note
   d'impression arrondie ensuite. Si tu écris 92, les six nombres de
   `utility_score_detail` doivent totaliser exactement 92. Renseigne les six
   pour chaque source, sans exception.

## Sur la cohérence interne du référentiel

5. **Toute source nommée quelque part existe dans le registre §3 avec son
   identifiant `SRC-xxx`.** Si une organisation apparaît dans la matrice de
   couverture §7, dans le pack minimal §4 ou dans les gaps §8, elle a sa ligne
   complète dans le registre. Une case de matrice remplie par un nom qui n'est
   nulle part ailleurs affiche une couverture qui n'existe pas.

6. **Le pack enrichi ajoute des sources ; il ne redécoupe pas le pack minimal.**
   Les deux listes sont disjointes. Le pack enrichi sert à approfondir les
   sous-segments, les acteurs régionaux, les grands donneurs d'ordre et les
   angles technologiques — c'est-à-dire des sources que le pack minimal n'a
   pas.

7. **Les trois familles obligatoires portent chacune un `SRC-xxx` explicite** :
   la presse professionnelle de référence, la fédération ou le syndicat
   principal, et le régulateur / l'autorité / l'organisme normatif du secteur.
   Si l'une des trois n'existe pas dans ce secteur, écris-le et justifie-le. Ne
   la laisse pas simplement absente : c'est indistinguable d'une recherche non
   faite.

## Sur la qualification des sources

8. **Un service qui rediffuse un registre officiel n'est pas T1.** Les
   agrégateurs de données légales, revendeurs de comptes annuels et portails
   qui republient un registre public restent **T3** tant que le registre
   primaire lui-même n'a pas été ouvert et cité. C'est la règle de dégradation,
   et elle s'applique même quand le rediffuseur est plus commode d'accès que
   l'original — surtout dans ce cas.

9. **`url` est la page réellement ouverte et vérifiée, pas un domaine nu.**
   « exemple.fr » ne permet à personne de retrouver ce que la source atteste.
   Le champ `domain` est là pour le domaine.

10. **Ne cite jamais comme source sectorielle un document qui m'a été fourni en
    pièce jointe.** Les fichiers internes joints à cette conversation (exports,
    référentiels, catalogues d'offres) servent à te cadrer, pas à attester d'un
    fait sur le marché. Une note de bas de page qui renvoie à l'un d'eux
    ressemble à une source vérifiable et n'en est pas une.

## Sur la scorecard §10

11. **Affiche les 24 critères, un par un, avec leur statut réel.** Pas un
    sous-ensemble, pas un tableau de synthèse. Chaque ligne prend `Validé`,
    `Échec` ou `Non applicable` suivi d'une justification en une phrase.

    Un référentiel qui n'échoue à aucun des 24 critères est plus suspect qu'un
    référentiel qui en échoue trois et le dit : le premier run s'était déclaré
    `production_ready` en n'évaluant que la moitié des critères. Le verdict
    dépend d'un décompte, pas d'une appréciation générale — annonce le nombre
    d'échecs critiques et majeurs avant de le prononcer.

## Rappel sur le volume de recherche

Le journal de recherche §9 doit contenir **au minimum quinze lignes**, une par
requête réellement exécutée, avec ses résultats utiles et ses rejets motivés.
Cinq requêtes ne constituent pas la phase de découverte que ce prompt décrit :
elles produisent les sources auxquelles on pense déjà, et manquent
systématiquement les acteurs régionaux, les niches techniques et les sources
réglementaires récentes — c'est-à-dire précisément ce qui distingue un
référentiel d'une liste de favoris.
