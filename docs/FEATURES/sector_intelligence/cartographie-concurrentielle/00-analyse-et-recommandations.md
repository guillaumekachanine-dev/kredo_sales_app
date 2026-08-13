> 🟡 **ARCHIVE — raisonnement conservé, application interdite** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Conserve l'intention profonde — les quatre questions du directeur commercial — et les 12 améliorations. C'est le meilleur document pour comprendre POURQUOI la méthode est ce qu'elle est.
> **Référence à appliquer : `MASTER-STUDY/00-DOCTRINE.md` §1**

---

# 00 — Analyse de l'intention et recommandations

## 1. Ce que le prompt d'origine demande, et ce qu'il cherche réellement

Le prompt d'origine demande une **cartographie concurrentielle du BTP / travaux publics** autour du groupe Eiffage, en 10 pages, avec des grilles de lecture et une matrice visuelle.

Mais l'utilisateur final n'est ni un analyste, ni un stratège d'entreprise du BTP : c'est **un directeur commercial d'ESN qui veut développer son business en France**. Cela change complètement la fonction du document. Il ne cherche pas à comprendre le BTP pour lui-même ; il cherche à répondre à quatre questions opérationnelles, dans cet ordre :

| Question réelle | Ce que le prompt d'origine y répondait | Écart |
|---|---|---|
| **Quels comptes de ce secteur j'attaque en premier ?** | Rien : la cartographie décrit, elle ne priorise pas | Manque une couche de scoring d'appétence |
| **À qui je parle, et par quelle porte j'entre ?** | Rien : aucune information sur la DSI, le panel fournisseurs, le processus achat | Manque la couche « accessibilité commerciale » |
| **Qu'est-ce que je dis pour être crédible en 3 minutes ?** | Partiellement : les grilles donnent la matière, mais brute | Manque la transformation en argumentaire |
| **Pourquoi maintenant ?** | Rien : aucune notion d'événement déclencheur daté | Manque les trigger events |

La phrase du prompt d'origine qui trahit l'intention profonde est celle-ci : *« un commercial en ESN doit pouvoir s'adresser à l'un des comptes du secteur en ayant en tête le positionnement marché, les avantages, les faiblesses, les ambitions […] des concurrents afin de savoir placer le plus précisément son discours »*. Autrement dit : **la cartographie n'est pas le livrable, c'est l'intrant**. Le livrable, c'est la capacité à ouvrir une conversation crédible avec un DSI qui reçoit dix ESN par mois.

Deuxième intention, moins explicite mais présente dans le choix des grilles (empreinte métier, innovation, IA) : le commercial veut **vendre la compréhension du métier du client, pas de la technologie**. Une ESN qui arrive en disant « nous faisons du cloud et de l'IA » est interchangeable. Une ESN qui arrive en disant « votre concurrent direct a industrialisé le suivi de chantier par photogrammétrie l'an dernier, et vos appels d'offres publics intègrent désormais un critère BIM » est un interlocuteur. **Le vrai produit de cette étude, c'est de la légitimité métier.**

Troisième intention, implicite : **la reproductibilité**. Le prompt est écrit pour un secteur, mais sa structure (quotas, grilles, questions finales) montre qu'il est pensé comme un gabarit à rejouer. C'est exactement l'objet de la présente optimisation.

---

## 2. Les 12 améliorations retenues

### Méthode

**A1 — Imposer l'accès web et le journal de recherche.**
Le prompt d'origine ne dit pas comment trouver l'information. Un LLM sans accès web produira une cartographie de mémoire : des noms d'entreprises vrais, des chiffres approximatifs, des contrats plausibles mais inventés. C'est le mode d'échec le plus dangereux, car le résultat *a l'air* excellent. Le prompt optimisé impose donc : déclaration des capacités en préambule, refus explicite de produire sans accès web, et journal de recherche horodaté en annexe.

**A2 — Passer d'une génération en un jet à un protocole en 8 phases.**
Une cartographie de 14 comptes avec 6 grilles chacun ne se produit pas en une passe : on obtient un texte homogène en surface et creux en profondeur. Le protocole (`02-methode-operatoire.md`) sépare la constitution de la longlist, la segmentation, l'approfondissement, la couche ESN et le contrôle. Chaque phase a son budget de recherche et son critère de sortie.

**A3 — Rendre la segmentation objectivable plutôt que déclarative.**
Le prompt d'origine dit « leaders / challengers / mid-market / outsiders » sans définir les frontières : deux exécutions donnent deux classements différents. Le prompt optimisé fournit une **table de décision chiffrée** (part de marché relative au leader, trajectoire de croissance, étendue du périmètre couvert) et exige la justification de chaque affectation. C'est la condition de la reproductibilité.

**A4 — Ajouter une méthodologie de contrôle bloquante.**
Triangulation à deux sources indépendantes, hiérarchie de fiabilité en 4 tiers, tests de cohérence automatiques (ratio CA/effectif, cohérence périmètre, cohérence millésime), protocole de résolution des contradictions, passe red team, et une scorecard qui **interdit la livraison** si un critère critique échoue. Détail dans `04-controle-qualite.md`.

### Périmètre

**A5 — Paramétrer les quotas au lieu de les figer.**
« 3 leaders, 3 challengers, 3 mid-market, 2 émergents, 3 niche » est un bon défaut, mais faux sur un marché concentré (2 acteurs font 70 % du marché) comme sur un marché atomisé. Les quotas deviennent des variables, avec une règle : si la réalité du marché contredit le quota, on le signale et on l'ajuste en le justifiant, au lieu de compléter avec un acteur non pertinent.

**A6 — Généraliser la règle d'inclusion des acteurs étrangers.**
L'exemple d'origine (Amadeus à Sophia Antipolis, Microsoft à Issy) est un exemple IT collé dans une étude BTP : il désoriente. La règle générique retenue est fonctionnelle : *est incluse toute entité disposant en France d'un établissement décisionnaire ou opérationnel significatif* — avec trois marqueurs vérifiables (effectif France, existence d'une entité juridique française avec SIREN, autonomie de décision d'achat IT en France). C'est ce dernier point qui compte pour une ESN : un centre de coûts piloté depuis l'étranger n'achète pas de prestation locale.

**A7 — Ajouter la couche « accessibilité commerciale », absente du prompt d'origine.**
Pour chaque compte : organisation de la DSI et nom du décideur si publiquement identifiable, existence d'un panel de référencement fournisseurs et modalités d'entrée, canal d'achat (achats indirects, accord-cadre, centrale type UGAP pour le public), politique de recours à l'externalisation, ESN déjà en place. **C'est l'information qui décide si un compte est attaquable ce trimestre ou dans deux ans**, et elle manquait totalement.

**A8 — Ajouter les trigger events datés (12 derniers mois).**
Nomination d'un DSI/CDO, acquisition, incident cyber ou industriel, échéance réglementaire, plan stratégique publié, résultats en repli. Sans déclencheur daté, un commercial n'a pas de motif d'appel. C'est la différence entre « je vous appelle pour vous présenter notre société » et « je vous appelle parce que vous venez d'annoncer X ».

### Fond

**A9 — Ajouter un indice d'appétence ESN, scoré et justifié.**
Cinq critères notés de 1 à 5, chacun adossé à une preuve : capacité à payer, intensité IT observable, moment (trigger), accessibilité (gouvernance achat), fit avec l'offre de l'ESN. La note globale ne vaut rien en soi ; ce qui vaut, c'est le **classement relatif des comptes** et la traçabilité de la preuve derrière chaque note.

**A10 — Justifier et recadrer les rubriques réglementaires.**
Convention collective (IDCC) et code NAF/APE sont conservés — ils sont réellement utiles à une ESN : ils déterminent la grille de rémunération de référence côté client, éclairent la faisabilité d'une prestation en régie vs forfait au regard du prêt de main-d'œuvre illicite, et donnent le vocabulaire RH du secteur. Mais le prompt doit **dire pourquoi**, sinon l'assistant produit une rubrique administrative morte. On ajoute par ailleurs le régime réglementaire sectoriel qui crée de la demande IT (obligations de reporting, normes métier, échéances datées).

**A11 — Expliciter l'analyse transverse en réponses actionnables.**
Les six questions finales du prompt d'origine sont bonnes mais leur réponse restait libre. Le prompt optimisé impose pour chacune : une réponse en une phrase, les preuves, et **la conséquence commerciale** (« donc, face à un compte de ce segment, on ouvre par… »). Une analyse sans « donc » n'est pas exploitable.

### Forme

**A12 — Abandonner « 10 pages » au profit d'un livrable en couches.**
Une contrainte de volume pousse à sacrifier les preuves, qui sont pourtant le cœur de la valeur. Le livrable devient modulaire : (1) synthèse exécutive 1 page, (2) matrice visuelle, (3) tableau comparatif, (4) fiches compte calibrées selon que le compte est étudié ou seulement contextuel, (5) analyse transverse, (6) annexe sources + journal de recherche, (7) **export CSV/JSON** pour injection CRM. Chacun lit la couche dont il a besoin ; le commercial vit dans la battle card, le directeur dans la synthèse et la matrice.

---

## 3. Ce qui a été volontairement écarté

| Idée | Pourquoi écartée |
|---|---|
| Estimer les parts de marché en pourcentage | Non calculable de façon fiable sans base de données payante ; on utilise la part relative au leader (ordinale), qui suffit à la décision commerciale et n'est pas contestable |
| Noter la « réputation » sur une échelle chiffrée | Un score de réputation sans méthode d'enquête est une opinion déguisée ; la grille demande des faits observables (distinctions, litiges publics, avis employeurs, presse) et une qualification en trois niveaux, assumée comme perception |
| Lister nommément des interlocuteurs opérationnels | RGPD et efficacité : on se limite aux dirigeants dont la fonction est publique (mandataires, communiqués de nomination). Le sourcing nominatif fin relève de l'outillage commercial, pas de l'étude |
| Générer la matrice en image via le LLM | Illisible et non modifiable ; on produit un JSON normé + un générateur HTML autonome, ce qui rend la matrice reproductible et éditable |
| Analyser la santé financière par des ratios avancés | Les comptes des sociétés non cotées sont fréquemment confidentiels en France ; on s'en tient aux indicateurs réellement disponibles et on marque les trous |
