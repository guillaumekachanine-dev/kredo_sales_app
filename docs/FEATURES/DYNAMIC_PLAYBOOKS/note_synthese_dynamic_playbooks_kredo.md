# Note de synthèse — Dynamic Playbooks KREDO

## Objet

Évaluer si une V1 de **Dynamic Playbooks** dans KREDO peut créer une vraie valeur métier pour les commerciaux, ou si le risque est de construire un prototype séduisant mais peu utilisé.

## Conclusion

Le projet mérite d’être poursuivi, **mais à condition de réduire fortement son ambition initiale**.

La bonne V1 n’est pas un grand “workspace intelligent” avec des dizaines de scénarios, un moteur de graphe complexe ou un chatbot généraliste. Elle doit être une **couche d’activation commerciale** qui transforme la connaissance déjà disponible dans KREDO en **prochains mouvements commerciaux concrets, contextualisés et justifiés**.

> KREDO ne doit pas seulement dire ce qu’il sait sur un compte.  
> Il doit aider le commercial à décider **quoi faire ensuite, avec qui, pourquoi et comment**.

C’est là que se situe la valeur potentiellement différenciante.

## 1. Pourquoi KREDO est déjà assez avancé pour tenter cette V1

L’analyse du code et de Supabase montre que KREDO ne part pas de zéro.

La base contient déjà une matière significative :

- 112 comptes ;
- 642 contacts ;
- 936 faits structurés sur les comptes ;
- 835 signaux ;
- 178 interactions ;
- 29 opportunités ;
- 46 enjeux compte ;
- 119 documents d’intelligence ;
- 497 sources traçables ;
- 90 pain points sectoriels ;
- 128 signaux de playbook sectoriels ;
- 377 actualités sectorielles ;
- 12 offres et 42 practices.

Les contacts sont déjà qualifiés par fonction, rôle dans la relation, pouvoir décisionnel et niveau de relation.

Surtout, KREDO possède déjà un embryon de moteur de stratégie commerciale : le backend sait rassembler, pour un compte donné, ses enjeux, ses contacts, les offres KREDO, les practices déjà délivrées, les informations sectorielles, les échéances réglementaires, les pitches précédents et différents scores.

Le Dynamic Playbook ne nécessite donc pas de reconstruire toute l’intelligence de KREDO. Il peut s’appuyer sur un socle déjà existant.

## 2. La limite actuelle : tous les comptes ne sont pas encore exploitables

La quantité globale de données est correcte, mais la couverture est inégale.

Aujourd’hui, seuls environ **16 comptes** disposent d’au moins quatre familles de données opérationnelles suffisamment riches. Une partie des autres comptes est encore trop pauvre pour produire des recommandations très personnalisées.

Il ne faut donc pas promettre en V1 :

> “Choisissez n’importe quel compte et KREDO produira une stratégie commerciale exceptionnelle.”

Il faut plutôt accepter plusieurs niveaux :

- **Playbook Ready** : données suffisamment riches, expérience complète ;
- **Playbook Limited** : recommandations plus génériques, basées sur compte + secteur + persona ;
- **Insufficient Knowledge** : KREDO indique clairement qu’il manque des données.

Cette transparence est préférable à une IA qui invente de la profondeur là où il n’y en a pas.

## 3. Ce qui constituerait une vraie valeur métier

La valeur ne réside pas dans :

- un résumé du compte ;
- un email bien rédigé ;
- une analyse sectorielle générique ;
- un chatbot capable de répondre à des questions ;
- un beau graphe de connaissances.

Ces fonctions sont utiles, mais facilement remplaçables par ChatGPT, Claude ou le travail classique d’un commercial.

La vraie valeur apparaît lorsque KREDO effectue automatiquement une opération cognitive coûteuse :

> **information → rapprochement → interprétation → persona → opportunité → stratégie d’approche → action**

Exemple de résultat attendu :

### Play commercial proposé

**Angle**  
Fiabiliser le delivery Cloud avant une phase d’accélération.

**Pourquoi maintenant**  
Deux signaux récents et un enjeu opérationnel suggèrent une tension entre roadmap digitale et capacité de delivery.

**Pourquoi cette personne**  
Le Directeur Digital est directement concerné et dispose d’un pouvoir décisionnel important.

**Hypothèse commerciale**  
Le problème n’est peut-être pas “faire plus de cloud”, mais absorber l’accélération sans augmenter le risque opérationnel.

**Practice KREDO pertinente**  
Cloud Engineering.

**Question à poser**  
“Où observez-vous aujourd’hui le plus de friction entre roadmap digitale et capacité de delivery ?”

**Objection probable**  
“Nous avons déjà les compétences en interne.”

**Prochain mouvement recommandé**  
Tester d’abord l’existence d’un problème de capacité sur les programmes prioritaires avant de pitcher une offre.

C’est ce type de recommandation qui peut faire gagner du temps au commercial et améliorer la qualité de sa préparation.

## 4. Le trou actuel de KREDO est précisément celui que les Playbooks peuvent combler

KREDO sait déjà détecter énormément de choses.

Les signaux disposent notamment d’un score et de sources, mais très peu sont aujourd’hui transformés en actions commerciales concrètes :

- seulement une faible partie possède une action recommandée ;
- aucun n’est encore systématiquement relié à un contact cible ;
- aucun n’est encore relié à une practice recommandée.

Autrement dit, KREDO est déjà bon sur :

> “Je sais quelque chose.”

Mais beaucoup moins sur :

> “Qu’est-ce que j’en fais commercialement ?”

Dynamic Playbooks pourrait devenir précisément cette couche manquante.

## 5. Le périmètre V1 recommandé

La V1 devrait se concentrer sur **trois cas d’usage fréquents et immédiatement utiles**.

### 1. Préparer un rendez-vous ou un contact

Exemple :

> “Je rencontre demain le DSI de ce compte. Quels sujets dois-je pousser ? Que dois-je vérifier ? Quelles objections anticiper ?”

KREDO doit produire quelques angles prioritaires, adaptés au persona et fondés sur les données réelles du compte.

### 2. Transformer un signal en action commerciale

Exemple :

> “KREDO vient de détecter un changement de direction, une acquisition, une initiative Cloud ou une échéance réglementaire. Qu’est-ce que cela signifie commercialement ?”

KREDO doit identifier :

- pourquoi le signal est intéressant ;
- qui contacter ;
- quelle hypothèse tester ;
- quelle practice ou offre peut être pertinente ;
- quel prochain mouvement effectuer.

C’est probablement le cas d’usage le plus différenciant.

### 3. Trouver un angle pour ouvrir ou élargir un compte

Exemple :

> “Je veux entrer chez ce prospect”  
> ou  
> “Nous sommes déjà présents chez ce client, où existe-t-il un potentiel de cross-sell ?”

KREDO doit proposer quelques terrains d’approche crédibles et expliquer leur logique.

## 6. Ce qu’il ne faut pas construire en V1

Pour éviter la sur-ingénierie :

- pas de moteur de graphe générique ;
- pas d’éditeur visuel de scénarios ;
- pas de système multi-agents complexe ;
- pas de chatbot généraliste comme cœur du produit ;
- pas de dizaines de scénarios prédéfinis ;
- pas de moteur d’apprentissage sophistiqué ;
- pas de “mini-CRM dans le CRM” ;
- pas de stratégie complète de compte autonome.

L’arborescence imaginée au départ peut rester une bonne idée UX, mais elle doit être contrôlée :

**Play proposé**  
→ Pourquoi cet angle ?  
→ Quelles preuves ?  
→ Pourquoi cet interlocuteur ?  
→ Quelles objections ?  
→ Quelles questions poser ?  
→ Quelle offre KREDO ?  
→ Quel autre angle ?

Cela donne une sensation de profondeur sans nécessiter un moteur de graphe complexe.

## 7. Pourquoi ce produit peut faire mieux que le travail classique

KREDO ne battra probablement pas un bon commercial sur la créativité pure, la qualité relationnelle, la négociation, la connaissance intuitive du client ou la rédaction d’un email.

En revanche, il peut battre le travail classique sur une autre dimension :

> **croiser systématiquement toutes les informations disponibles au bon moment.**

Avant chaque rendez-vous, un humain ne relit pas systématiquement les faits historiques, derniers signaux, interactions, contacts, enjeux, documents sectoriels, événements réglementaires, offres, practices déjà vendues, anciens pitches et sources originales.

KREDO peut le faire à chaque fois, avec la même discipline.

Le gain potentiel vient donc moins d’une “IA plus intelligente que le commercial” que d’une **capacité de synthèse et de rapprochement systématique à coût quasi nul**.

## 8. Le vrai risque

Le risque principal n’est pas aujourd’hui la technologie.

Ce n’est même pas réellement le volume global de données.

Le risque est de construire une très belle expérience autour de recommandations finalement banales.

Un Dynamic Playbook n’a de valeur que s’il produit régulièrement quelque chose que le commercial considère comme :

- spécifique au compte ;
- crédible ;
- traçable ;
- non évident ;
- immédiatement exploitable.

Si les résultats ressemblent à des conseils génériques du type :

> “Parlez au DSI de transformation digitale.”

alors le projet doit être abandonné.

## 9. La prochaine étape recommandée : un “Playbook Value Spike”

Avant toute grosse interface, il faut tester la valeur brute du moteur.

Principe :

1. sélectionner les 10 à 20 comptes les mieux documentés ;
2. construire 30 à 50 situations commerciales réalistes ;
3. générer des PlayCards sans investir dans une grosse UX ;
4. les faire évaluer par des commerciaux.

Critères proposés :

- **Spécificité** : pourrait-on donner exactement ce conseil à un autre compte ?
- **Grounding** : les faits sont-ils sourcés ?
- **Non-évidence** : le rapprochement apporte-t-il quelque chose ?
- **Actionnabilité** : sait-on quoi faire demain ?
- **Persona-fit** : la recommandation change-t-elle selon l’interlocuteur ?
- **KREDO-fit** : débouche-t-elle sur quelque chose que KREDO sait réellement vendre ?

Si ce test échoue sur les meilleurs comptes, il vaut mieux arrêter avant d’investir dans l’interface.

## 10. Vision produit

La bonne définition du Dynamic Playbook serait :

> **Un moteur de “next best commercial move” fondé sur la connaissance réelle que KREDO possède du compte.**

Son avantage ne sera pas de produire plus de contenu.

Son avantage sera de transformer la masse d’intelligence déjà accumulée dans KREDO en décisions commerciales concrètes.

C’est potentiellement la pièce qui manque aujourd’hui entre :

> **“KREDO sait beaucoup de choses.”**

et :

> **“KREDO m’aide réellement à vendre.”**

## Verdict

**GO conditionnel.**

Le projet paraît suffisamment crédible pour être testé, mais la V1 doit rester très focalisée.

La priorité n’est pas de construire un produit spectaculaire.

La priorité est de vérifier une seule chose :

> **KREDO est-il capable de suggérer régulièrement à un commercial un mouvement qu’il aura réellement envie d’utiliser dans sa journée de travail ?**

Si la réponse devient clairement oui sur les comptes les mieux documentés, alors Dynamic Playbooks peut devenir une fonctionnalité centrale de KREDO.

Sinon, il vaut mieux le savoir très tôt et arrêter.
