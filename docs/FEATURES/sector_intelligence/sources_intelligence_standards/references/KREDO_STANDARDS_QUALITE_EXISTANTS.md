# Standards de Qualité, Checklist & Troubleshooting

Consulté en Phase 5 (validation finale), et chaque fois qu'un blocage survient pendant les phases précédentes.

## Le standard Parfumerie — grille de comparaison

Avant de déclarer une fiche terminée, compare-la à ce tableau. La fiche Parfumerie (`parfumerie-aromes`) reste la référence de qualité maximale ; la fiche Finance (`banque-finance-assurance`) montre qu'un corpus mince peut quand même produire une fiche solide à condition d'être honnête sur ses limites.

| Critère | Standard minimum | Standard Parfumerie |
|---|---|---|
| Marché | Taille + CAGR + maturité digitale | ✅ |
| Acteurs | 5 PACA + 5 nationaux, nominatifs | ✅ |
| Pain points | 5-8 points, fréquences réelles | 8 points, verbatim réel |
| Réglementation | 3-5 items, dates précises et sourcées | 5 items |
| Playbook | 4 personas + 5 ROI + 3 objections + 4 entry points | Complet |
| Trigger events | 3-5 signaux récents | 5 événements |
| Comptes corpus | 2-3 minimum | 7 comptes, 1 client actif référence |
| Score | Cohérent avec le corpus (pas gonflé) | 4.8/5, justifié par le volume de preuves |

Si ta fiche tombe en dessous du minimum sur un critère, ce n'est pas bloquant — mais le caveat correspondant doit apparaître explicitement dans la fiche (voir section Transparence ci-dessous).

## Checklist de validation finale

### Fin de Phase 1 (avant de lancer la recherche externe)
- [ ] Comptes du secteur identifiés (au moins 2, idéalement plus)
- [ ] Diagnostics IA existants consultés et leur contenu noté
- [ ] Corpus classé : riche ou mince

### Fin de Phase 2 (avant la synthèse)
- [ ] Marché size + CAGR trouvés avec source
- [ ] Au moins 3 items réglementaires avec deadlines précises et vérifiées sur source officielle
- [ ] Au moins 3 trigger events datés des 12 derniers mois
- [ ] Toutes les sources documentées (URL + ce qu'elles ont confirmé)

### Fin de Phase 3 (avant l'injection)
- [ ] Template de synthèse entièrement rempli, aucun champ vide sans justification explicite
- [ ] 4 personas avec de vraies peurs (pas des enjeux reformulés)
- [ ] 5 arguments ROI, chacun avec une source ou une mention "estimation à valider"
- [ ] 3 objections spécifiques au secteur, pas génériques
- [ ] Section caveats rédigée honnêtement

### Fin de Phase 4 (avant la validation front)
- [ ] `SELECT` de vérification sur les 5 tables, comptage conforme aux attentes
- [ ] Comptes correctement rattachés (UPDATE a affecté le bon nombre de lignes)

### Fin de Phase 5 (avant remise à Dosta)
- [ ] La fiche apparaît dans `/prospection/approche-sectorielle`
- [ ] Les 6 blocs du détail chargent sans erreur
- [ ] Pain points triés par fréquence décroissante
- [ ] Badges de couleur cohérents avec l'urgency (rouge = critical, etc.)
- [ ] Playbook navigable sur ses 4 sections
- [ ] Synthèse présentée à Dosta avec la distinction claire entre "solide" et "à valider terrain"

## Pièges courants — diagnostic et fix

| Piège | Symptôme | Fix |
|---|---|---|
| Pain points trop vagues | "Complexité IT", "Transformation digitale" | Cherche le chiffre concret : "5 jours/semaine en réunions conformité" plutôt que "processus lourd" |
| ROI sans source | "Nous réduisons les coûts de 50%" sans contexte | Reformule : "Diagnostic [client] : réduction de 50% du temps de traitement" — ou si pas de source, "potentiel estimé à 50%, à valider" |
| Personas non différenciés | Tous les personas "veulent l'efficacité" | Chaque persona doit avoir une peur unique et émotionnelle, pas un enjeu interchangeable |
| Objections génériques | "Ça coûte trop cher" | Cherche l'objection culturelle ou technique spécifique au métier |
| Réglementation obsolète | Citer une loi déjà abrogée ou remplacée | Toujours vérifier la version en vigueur à la date actuelle, pas celle trouvée dans un vieil article |
| Score inflationné | 4.8/5 sur un corpus de 1 compte | Baisse le score en conséquence et explicite "corpus en construction" dans la description |
| Comptes mal rattachés | Un compte évidemment hors secteur dans la liste | Retire-le — la crédibilité de toute la fiche en dépend |

## Si tu bloques

**"Je ne trouve pas assez de données marché."**
Croise 2-3 sources différentes plutôt que de chercher LA source parfaite. Si vraiment rien de solide n'existe, écris "Maturité digitale moyenne, données de marché publiques limitées sur ce secteur" et appuie-toi davantage sur le TJM observable et les acteurs identifiés.

**"Les comptes du secteur n'existent quasiment pas en base."**
C'est un corpus mince, pas un blocage — voir le précédent de la fiche Finance. Documente-le honnêtement, compense par une recherche réglementaire plus poussée, et baisse le score d'attractivité en conséquence plutôt que de forcer un 4.5/5 immérité.

**"Je n'ai qu'un seul pain point réel, je ne peux pas en inventer sept autres."**
Ne les invente pas. Mieux vaut une fiche avec 2-3 pain points réels et un caveat clair ("corpus limité, pain points à valider lors des prochains rendez-vous") qu'une liste de 8 points dont 6 sont des suppositions habillées en faits.

**"La deadline réglementaire que je trouve est floue ou contradictoire selon les sources."**
Vérifie sur la source officielle (EUR-Lex, Legifrance, le régulateur sectoriel). Si ça reste flou, écris "échéance à préciser, source officielle non univoque" plutôt qu'une date présentée comme certaine.

**"Je ne comprends pas comment ce secteur se vend en Kredo."**
C'est un vrai doute stratégique, pas un problème de méthode — pose la question à Dosta directement plutôt que de deviner. Avant de finaliser une fiche, il faut une hypothèse claire du type "si on adresse ce secteur, on gagne sur la practice X parce que Y."

## Rappel final

Le test ultime avant de remettre une fiche : si un DSI sceptique en rendez-vous demandait "vous tenez ce chiffre d'où ?" sur n'importe quelle ligne de la fiche, Dosta doit pouvoir répondre sans bluffer. Si ce n'est pas le cas pour une donnée donnée, elle ne va pas dans la fiche telle quelle — elle se reformule en hypothèse explicite.
