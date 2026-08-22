**Note de pré-cadrage**

Objet : cadrer la vision produit avant conception détaillée et
implémentation.

# 1. Vision

Transformer le playbook commercial de KREDO en un véritable copilote
opérationnel : un espace interactif qui mobilise dynamiquement la
connaissance disponible pour guider le commercial dans une situation
précise, lui proposer des angles d’action et l’aider à décider de la
prochaine étape.

Le playbook ne doit pas être une bibliothèque documentaire ni une simple
page de synthèse. Il doit devenir un moteur de parcours commerciaux
interactifs, capable de recomposer la connaissance KREDO selon le
contexte, l’interlocuteur, l’objectif et les choix successifs du
commercial.

# 2. Problème à résoudre

KREDO accumule ou génère déjà de nombreuses briques de connaissance
utiles : informations compte, secteur, actualités, besoins, signaux,
environnement technique, échéances, événements commerciaux, enjeux,
objections, risques, opportunités et connaissances sur les
interlocuteurs.

La difficulté n’est donc pas uniquement d’obtenir davantage
d’information. Elle consiste surtout à l’articuler au bon moment, dans
le bon ordre et pour la bonne situation commerciale, sans imposer au
commercial de reconstituer lui-même la synthèse.

# 3. Objectifs fonctionnels

- Centraliser et rendre exploitable la connaissance disponible sur un
  compte, un secteur et ses interlocuteurs.

- Contextualiser cette connaissance selon l’intention du commercial :
  rendez-vous, prospection, qualification, soutenance, situation client
  sensible, exploration d’un nouveau périmètre, etc.

- Faire émerger des angles d’approche, arguments, objections probables,
  opportunités et prochaines actions pertinentes.

- Capitaliser sur les contenus déjà produits par KREDO et sur les
  situations comparables afin de réutiliser les éléments qui ont de la
  valeur.

- Faire évoluer l’expérience d’un système qui répond « voici ce que je
  sais » vers un système qui aide à répondre « voici ce que tu peux
  faire maintenant, et pourquoi ».

# 4. Expérience cible

Le playbook doit être vécu comme une mini-application dédiée à
l’intérieur de l’écosystème KREDO : accessible depuis l’interface
principale, mais disposant de son propre espace de travail, suffisamment
immersif pour accompagner un parcours complet.

## 4.1. Navigation par ramifications

Le principe d’interaction central est une navigation arborescente et
progressive. Le commercial part d’une intention ou d’une situation, puis
chaque choix ouvre les branches pertinentes. L’interface ne présente
donc pas toute l’information simultanément : elle révèle progressivement
ce qui est utile selon le chemin suivi.

1.  Le commercial choisit une situation ou un objectif.

2.  KREDO identifie le contexte pertinent et assemble les connaissances
    disponibles.

3.  Le playbook propose plusieurs angles d’approche ou axes de travail.

4.  Le commercial sélectionne un angle ; le système développe alors les
    enjeux, signaux, arguments, objections et informations associées.

5.  Chaque élément peut être exploré plus en profondeur ou utilisé pour
    poursuivre le parcours.

## 4.2. Exemple de parcours

Exemple : le commercial souhaite adresser le Directeur Digital d’une
entreprise donnée.

- Le playbook sélectionne la perspective « Directeur Digital ».

- Il remonte les signaux, enjeux et éléments de contexte liés au digital
  pour ce compte.

- Il propose un ou plusieurs angles d’approche.

- Après sélection d’un angle, il fait apparaître les objections
  possibles, les enjeux associés, les arguments exploitables et les
  preuves disponibles.

- Le commercial peut approfondir chaque branche, revenir en arrière ou
  poursuivre vers une action concrète.

# 5. Cas d’usage envisagés

La logique doit pouvoir servir plusieurs parcours sans qu’un écran
spécifique soit recodé pour chaque scénario.

- Préparer un premier rendez-vous ou un rendez-vous de suivi.

- Préparer une soutenance ou une séquence de négociation.

- Qualifier un besoin ou une opportunité.

- Préparer une approche de prospection ciblée.

- Comprendre un client, son environnement ou sa chaîne de valeur.

- Identifier de nouveaux périmètres à adresser dans un compte existant.

- Préparer une interaction avec une persona donnée : DSI, Directeur
  Digital, direction métier, décideur, etc.

- Gérer une situation difficile ou sensible avec un client.

# 6. Matière première mobilisable

Le playbook doit pouvoir agréger, selon disponibilité, les différentes
sources de connaissance déjà présentes dans KREDO ou produites par ses
mécanismes d’analyse.

- Connaissance du compte et historique de la relation.

- Contexte sectoriel et actualité pertinente.

- Besoins et opportunités déjà détectés ou ouverts.

- Environnement technique et organisationnel.

- Échéances, événements et signaux commerciaux.

- Enjeux, risques, freins, réticences et objections.

- Personas, interlocuteurs, décideurs et caractéristiques de leurs
  attentes.

- Contenus commerciaux déjà générés : arguments, formulations,
  approches, analyses et éléments réutilisables.

- Situations passées ou contextes similaires pouvant servir de
  référence.

# 7. Principe d’architecture produit

À ce stade, la recommandation est de ne pas concevoir le playbook comme
un ensemble de parcours rigides codés écran par écran. Il faut plutôt
prévoir un moteur léger d’orchestration capable d’assembler des briques
existantes en fonction du scénario et des choix du commercial.

| **Couche**                 | **Rôle visé**                                                                                                    |
|----------------------------|------------------------------------------------------------------------------------------------------------------|
| Entrée utilisateur         | Intention, compte, interlocuteur, situation, objectif et choix successifs.                                       |
| Orchestration              | Déterminer quelles briques de connaissance et quelles étapes sont pertinentes pour le contexte courant.          |
| Connaissance KREDO         | Fournir les données, analyses, signaux, contenus et éléments de contexte disponibles.                            |
| Génération / réutilisation | Produire ou adapter des arguments et contenus en capitalisant sur le corpus existant lorsque cela est pertinent. |
| Workspace interactif       | Présenter le parcours, les ramifications, le détail des branches et les actions possibles.                       |
| Contexte de session        | Conserver les choix effectués pendant le parcours afin que les étapes suivantes restent cohérentes.              |

# 8. Principes de conception

- Privilégier une architecture incrémentale et légère : réutiliser au
  maximum les données, APIs, composants et modèles KREDO existants.

- Éviter un workflow figé et monolithique ; préférer des briques
  composables et des règles simples d’orchestration.

- Faire de la progression et du contexte les éléments centraux de
  l’expérience, plutôt que d’afficher de longs rapports statiques.

- Permettre l’exploration en profondeur sans obliger l’utilisateur à
  parcourir toutes les branches.

- Rendre visibles la provenance et le niveau de confiance des
  informations lorsque cela est utile à la décision.

- Conserver une séparation claire entre connaissance factuelle,
  suggestions commerciales et contenu généré.

# 9. Hors périmètre à ce stade

Cette note ne constitue pas encore une spécification technique complète.
Les éléments suivants devront être traités dans une phase de conception
ultérieure, après audit de l’existant :

- Schéma exact des données et sources disponibles dans la base actuelle.

- Choix définitif du modèle de navigation et des composants UI.

- Règles précises de génération, scoring, ranking et sélection des
  branches.

- Persistance des sessions et historique des parcours.

- Droits d’accès, partage et éventuelle collaboration entre commerciaux.

- Instrumentation produit et mesure de l’efficacité commerciale.

# 10. Première étape d’implémentation recommandée

Avant de construire un moteur générique, réaliser un premier vertical
slice sur un seul parcours à forte valeur — par exemple « préparer un
rendez-vous avec une persona donnée ». Ce pilote doit réutiliser les
données existantes, valider le modèle de navigation par ramifications et
tester le principe d’orchestration sans introduire une infrastructure
surdimensionnée.

# 11. Critères de réussite du premier pilote

- Le commercial comprend immédiatement comment démarrer un parcours.

- Le système mobilise automatiquement des informations déjà présentes
  dans KREDO sans duplication manuelle.

- Chaque choix de l’utilisateur modifie réellement la suite du parcours.

- Le résultat aide à préparer une action commerciale concrète, pas
  seulement à lire une synthèse.

- L’architecture du pilote peut accueillir un deuxième scénario sans
  réécriture majeure.

# 12. Formulation synthétique

Le Playbook Commercial KREDO est un moteur de parcours commerciaux
interactifs. À partir d’une intention, d’un compte et d’un
interlocuteur, il orchestre dynamiquement la connaissance KREDO, propose
des angles d’action, révèle les arguments et objections pertinents, puis
accompagne le commercial dans une exploration progressive jusqu’à la
prochaine action utile.
