# Template Synthèse & Playbook Commercial — Phase 3

Consulté en Phase 3, après l'audit corpus (Phase 1) et la recherche externe (Phase 2).

## Template de synthèse sectorielle

Remplis ce template avant de passer à l'injection SQL — c'est ton brouillon de travail, pas un livrable en soi.

```yaml
SECTEUR: [Nom officiel]
SLUG: [kebab-case, vérifié unique en base]

## MARCHÉ
market_size_eur_bn: X.X
market_growth_pct: Y.Y
digital_maturity: low | medium | high
justification: "[1 phrase + source]"

## ACTEURS
paca_top_5:
  - name: X
    revenue: €M
    note: "[2 lignes sur leur position]"
national_top_5:
  - name: Y
    revenue: €M

## RÉGLEMENTATION (LE CŒUR DE LA FICHE)
regulatory_items:
  - name: "[Nom officiel directive/loi]"
    authority: EU | FR | [autre]
    deadline_date: YYYY-MM-DD
    urgency: critical | high | medium
    description: "[1 phrase claire pour un DSI]"
    commercial_angle: "[Comment Kredo répond à cette échéance]"
    is_commercial_window: true | false

## PAIN POINTS (FRÉQUENCE RÉELLE, PAS ESTIMÉE AU FEELING)
pain_points:
  - title: "[Problème spécifique, pas générique]"
    frequency_count: X (comptage réel ou estimation explicitement justifiée)
    kredo_practice: data_ai | cloud_eng | cyber | multi
    verbatim: "[Citation client exacte, ou laisser vide]"
    description: "[Impact chiffré si disponible]"

## COMPTES RATTACHÉS (CORPUS RÉEL DE LA PHASE 1)
companies:
  - id: [UUID trouvé en Phase 1]
    name: X
    lifecycle_status: client_actif | prospect | watch
    justification: "[Pourquoi ce compte appartient à ce secteur]"

## ATTRACTIVENESS SCORE
score: X.X / 5.0
calcul: (potentiel CA 30%) + (fit practices 25%) + (accessibilité géo 20%) +
        (urgence réglementaire 15%) + (concurrence 10%)

## TRANSPARENCE & CAVEATS (NE JAMAIS OMETTRE)
verbatims: "[Si vides : 'Aucun verbatim client réel disponible, à valider terrain']"
frequencies: "[Si estimées : 'Basé sur corpus de X comptes, pas comptage exhaustif']"
sources: "[Liste des URLs visitées en Phase 2]"
```

## Template du Playbook (JSONB stocké dans sector_intelligence.playbook)

### Personas (4 maximum)

```json
{
  "role": "DSI",
  "enjeu": "[Son problème principal, factuel, 1 ligne]",
  "peur": "[Sa crainte émotionnelle — pas son enjeu reformulé]"
}
```

Test pour vérifier qu'une "peur" est valide : si tu peux la remplacer par "audit raté", "perte de confiance du COMEX", "se faire distancer par un concurrent" — c'est une vraie peur. Si c'est juste l'enjeu reformulé à la négative ("ne pas avoir de conformité"), recommence.

### Arguments ROI (5 maximum)

```json
"Métrique : [état initial] → [état final], impact [€/temps/%]. Source: [diagnostic réel ou benchmark cité]"
```

Chaque argument doit pouvoir survivre à la question "vous tenez ça d'où ?" posée par un DSI sceptique en RDV. Si la réponse est "nulle part, ça sonnait bien", reformule en "potentiel estimé à X%, à valider avec votre contexte".

### Objections (3 maximum)

```json
{
  "objection": "[Phrase qu'un vrai prospect dirait, spécifique au secteur]",
  "reponse": "[Réponse préparée, avec exemple réel si disponible]"
}
```

Une objection générique ("c'est trop cher") est un signe que tu n'as pas assez creusé le métier. Cherche les craintes culturelles ou techniques spécifiques au secteur (exemple Parfumerie : "l'IA va remplacer nos parfumeurs" — une crainte identitaire propre à un métier artisanal séculaire).

### Points d'entrée commerciaux (4 maximum)

```json
[
  "Réglementaire : [échéance précise] — urgence datée, crée le rendez-vous sans avoir à 'vendre'",
  "Quick-win : [audit court 2-3 semaines] — créer la confiance avant le projet structurant",
  "Patrimoine : [projet long terme transformant] — la roadmap 6-12 mois",
  "Réseau : [via quel client actif ?] — l'introduction par un pair du même bassin"
]
```

## Structure du Pitch 15 minutes (document séparé, pas stocké en JSONB)

Le pitch est un script de rendez-vous, construit minute par minute :

```
Minute 0-2  : Contexte & urgence — amorce avec l'échéance réglementaire la plus chaude
Minute 2-4  : Diagnostic du problème — énoncer le pain point le plus fréquent, PUIS se taire
              (90 secondes de silence réel après la question d'ouverture — c'est ce qui
              fait remonter l'information la plus utile pour la suite du pitch)
Minute 4-7  : Différenciateur — la référence client réelle sur la même place/le même bassin
Minute 7-10 : Proposition concrète — toujours 3 options (quick-win / structurant / découverte gratuite)
Minute 10-15: Clôture — récupérer le nom du second interlocuteur à embarquer
```

La référence client n'est utilisable que si elle est réelle et vérifiable — ne jamais citer un client "type" ou anonymisé comme s'il s'agissait d'un cas réel.

## Exemples de référence (lire pour calibrer le ton et la densité)

Deux playbooks complets existent déjà en base et servent de gabarit qualité :
- `parfumerie-aromes` — playbook appuyé sur diagnostic réel (Robertet), score 4.8
- `banque-finance-assurance` — playbook construit majoritairement par recherche externe (corpus mince), score 4.4, avec caveats explicites sur l'absence de verbatims

Si tu veux relire le texte intégral de ces deux playbooks (formulations exactes, niveau de détail), interroge directement `sector_intelligence.playbook` via Supabase pour ces deux slugs plutôt que de les reconstruire de mémoire.
