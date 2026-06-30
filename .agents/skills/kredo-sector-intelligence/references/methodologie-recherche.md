# Méthodologie de Recherche Externe — Phase 2

Consulté en Phase 2, après l'audit du corpus interne (Phase 1). L'objectif n'est pas de chercher "tout ce qui existe" sur un secteur, mais de remplir précisément les trous laissés par le corpus interne avec des données fiables et datées.

## Bloc A — Marché & Taille

```
Requête type : "[secteur] France market size 2025 2026"
Sources à privilégier : IDC, Gartner, rapports sectoriels publics, S&P Global
```

Cherche : taille du marché France (€), CAGR récent, niveau de maturité digitale du secteur (faible/intermédiaire/avancé).

Pour le TJM observable, croise deux angles : "[secteur] average IT spending per company France" et "TJM ESN [secteur]" — le chiffre exact compte moins que la fourchette crédible.

## Bloc B — Réglementation & Calendrier (LE BLOC CRITIQUE)

C'est le bloc qui transforme une fiche descriptive en outil de vente. Une échéance datée et vérifiée crée une urgence commerciale que les ESN généralistes n'anticipent pas.

```
1. Réglementations applicables
   → "réglementation [secteur] France 2026 obligatoire"
   → "JOUE directives [secteur]" + "JORF décrets [secteur]"

2. Deadlines précises
   → "[nom de la réglementation] deadline date 2026 2027"
   → Vérifie TOUJOURS sur une source officielle avant de retenir une date :
     EUR-Lex (droit européen), Legifrance (droit français), CNIL,
     ou le régulateur sectoriel concerné (ACPR pour la finance, etc.)

3. Conséquences concrètes pour un DSI/COMEX
   → "[réglementation] conséquences DSI impact IT" en français
   → Cherche des articles business, pas le texte juridique brut —
     ce qui compte c'est comment le formuler à un DSI en RDV
```

**Règle de fiabilité** : une deadline réglementaire que tu ne peux pas confirmer sur une source officielle ou un article sérieux ne va pas dans la fiche avec une date précise. Écris "échéance à confirmer" plutôt qu'une date approximative présentée comme certaine — c'est exactement le genre d'erreur qui fait perdre la confiance d'un prospect bien informé.

## Bloc C — Trigger Events & Intelligence Commerciale

```
1. Acquisitions / levées de fonds récentes
   → "[acteurs du secteur] acquisition funding 2024 2025 2026"

2. Incidents ou scandales chez des concurrents
   → "[secteur] incident failure 2025" + "[secteur] recall breach"

3. Nominations DSI/CDO (signal de remise à plat du SI)
   → "[acteurs clés] new CIO CTO appointment 2025 2026"

4. Rapports / études de marché publiés récemment
   → "[secteur] report 2026 digital transformation AI"
```

Un trigger event sert à justifier un point de contact commercial daté — privilégie les événements des 6 à 12 derniers mois, plus anciens ils perdent leur valeur d'urgence.

## Bloc D — Cas d'usage IA / Fit Practice

```
1. Quels cas d'usage IA résonnent dans ce secteur ?
   → "[secteur] AI use cases machine learning applications"

2. Quels défis de gouvernance des données existent ?
   → "[secteur] data governance challenges compliance"

3. Quelles solutions de cybersécurité dominent ?
   → "[secteur] cybersecurity solutions leaders 2026"
```

Ce bloc sert à calibrer honnêtement quelle(s) practice(s) Kredo (data_ai, cloud_eng, product, cyber) ont le meilleur fit avec ce secteur — ne force pas un score élevé sur une practice juste parce que c'est celle que Dosta préfère vendre.

## Volume de recherche attendu

8 à 12 requêtes au total suffisent généralement — assez pour croiser 2-3 sources par fait important, pas assez pour y passer la journée. Si après 12 requêtes un point reste flou (en particulier une deadline réglementaire), c'est un signal pour le marquer "à confirmer" plutôt que de continuer à chercher indéfiniment.

## Documentation des sources — obligatoire

Pour chaque chiffre ou fait retenu dans la fiche finale, garde une trace de l'URL source. Cette traçabilité sert à deux choses :
1. Tu en as besoin en Phase 3 pour les caveats de transparence de la fiche.
2. Dosta doit pouvoir, en rendez-vous, défendre n'importe quel chiffre si un DSI sceptique demande "vous tenez ça d'où ?".

Un chiffre sans source documentée se reformule en estimation explicite plutôt que d'être présenté comme un fait établi.
