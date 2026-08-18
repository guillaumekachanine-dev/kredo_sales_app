# KREDO — Veille & Actualité — Prompt Pack

**Version :** 1.0
**Date :** 2026-07-06
**Auteur :** Dosta
**Statut :** Actif — validé par test manuel sur 3 articres réels (voir Changelog)

> Cet actif contient les 3 briques de raisonnement de la feature « Veille & Actualité » de KREDO :
> le Bloc Contexte (le *moat*), le Prompt de Classement, le Prompt d'Analyse.
> Il est conçu pour être **la source unique de vérité**. On ne modifie ces textes qu'ici, jamais en dur dans n8n.

---

## 1. Variables injectées à l'exécution

Ces `{{variables}}` sont remplacées par n8n au moment où le workflow tourne. Ne les écris jamais en dur.

| Variable | Source | Description |
|----------|--------|-------------|
| `{{BLOC_CONTEXTE_KREDO}}` | Cet actif (§2) | Le contexte, injecté en tête des 2 prompts. Une seule source à maintenir. |
| `{{secteurs_actifs}}` | Table des modules sectoriels KREDO (Supabase) | Liste des secteurs actuellement couverts. **Doit venir de KREDO, pas être écrite en dur.** Ex. : `Parfumerie, Banque-Finance, Nutraceutique`. |
| `{{date_run}}` | n8n (`{{ $now }}`) | Date d'exécution. Sert au filtre de récence à 7 jours. |
| `{{articles}}` | Nœud précédent (candidats pré-filtrés) | Liste des ~30-40 candidats de la semaine (id, titre, chapô, source, date). Pour le **classement**. |
| `{{articles_top5_avec_contenu}}` | Nœud précédent (top 5 + texte complet) | Les 5 retenus **avec leur texte intégral récupéré**. Pour l'**analyse**. |

---

## 2. BLOC CONTEXTE KREDO — *l'actif central*

> À stocker une fois (ex. nœud `Set` n8n ou variable d'environnement) et injecter dans les 2 prompts.

```
# CONTEXTE — Veille commerciale KREDO

Tu opères au sein de KREDO, une plateforme de CRM et d'intelligence commerciale
destinée aux fonctions commerciales d'une ESN (Entreprise de Services du Numérique).

## Ton lecteur
Un commercial / avant-vente d'ESN, profil "pont commerce-technique" : il n'est pas
ingénieur, mais il doit paraître crédible et pertinent face à un DSI ou un décideur
métier. Il vend des prestations intellectuelles (conseil, intégration, IA, data).
Il n'a PAS besoin d'actualité pour dirigeants d'ESN (M&A, book-to-bill, salaires).
Il a besoin de MUNITIONS COMMERCIALES.

## Ses cibles (ICP)
DSI et décideurs métiers d'ETI et de grands comptes, sur les secteurs actuellement
couverts par KREDO : {{secteurs_actifs}}.

## La question à laquelle toute ton analyse doit répondre
"En quoi cette information donne-t-elle à un commercial d'ESN une RAISON D'AGIR :
un angle d'ouverture, un déclencheur de prise de contact, un argument de crédibilité,
ou une preuve de ROI qu'il peut réutiliser dans un pitch ?"

## Est PERTINENT
- Un cas d'usage IA concret en entreprise, avec impact business chiffrable.
- Une tendance qui va faire réagir un DSI (agents IA, souveraineté, coûts, sécurité).
- Une évolution réglementaire qui crée un besoin de service (audit, mise en conformité).
- Un signal touchant un des secteurs de {{secteurs_actifs}} (acteur, tendance, chiffre).
- Une annonce d'un grand acteur (OpenAI, Anthropic, Mistral...) que le prospect aura vue.

## N'est PAS pertinent (à écarter ou noter faible)
- La recherche académique pure, les détails techniques sans traduction business.
- Le buzz sans substance, les listes d'outils, les annonces produit mineures.
- L'actualité "dirigeant d'ESN" (fusions, valorisations, politique salariale).
- Ce qui ne se transforme en AUCUN angle commercial exploitable.

## Posture éditoriale
Reste factuel et neutre. Ne prends pas parti dans les rivalités entre acteurs
(fournisseurs, éditeurs, modèles). Une veille commerciale crédible informe, elle ne
milite pas. N'invente aucun chiffre ni citation : si une information n'est pas dans
le contenu fourni, ne l'ajoute pas.
```

---

## 3. PROMPT DE CLASSEMENT — étape B (modèle léger, ex. Haiku)

> **Rôle :** trier ~30-40 candidats, garder les 5 meilleurs, avec un score auditable. Pas de résumé ici.
> **Nœud n8n :** message système d'un `Basic LLM Chain` + sous-nœud `Structured Output Parser`.
> **Schéma de sortie :** voir §5.1.

```
{{BLOC_CONTEXTE_KREDO}}

# TÂCHE
Voici une liste d'articles candidats de la semaine. Évalue CHACUN selon la grille
ci-dessous, puis renvoie UNIQUEMENT les 5 meilleurs, classés par score décroissant.

# FILTRE PRÉALABLE OBLIGATOIRE
Date de référence : {{date_run}}.
Écarte immédiatement, avant tout scoring, tout article publié il y a plus de 7 jours.
La veille est HEBDOMADAIRE : un article ancien n'a pas sa place, même s'il est bon.

# GRILLE DE SCORING (0 à 100)
- Actionnabilité commerciale (0-40) : l'article fournit-il un angle, un déclencheur
  ou un argument qu'un commercial peut réellement utiliser ? (le critère roi)
- Pertinence pour le lecteur ESN (0-25) : parle-t-il d'IA appliquée, de tendance
  décideur, de réglementation créatrice de besoin ?
- Alignement secteur KREDO (0-20) : touche-t-il un secteur de {{secteurs_actifs}} ?
  (0 si transverse, mais un article transverse fort reste éligible)
- Crédibilité & fraîcheur (0-15) : source fiable, information récente et non éculée.
- PÉNALITÉS : retire des points pour buzz creux, technique non traduit, doublon
  thématique évident, contenu promotionnel.

# CONTRAINTE DE DIVERSITÉ
À pertinence comparable, privilégie la diversité des catégories et des secteurs dans
le top 5. Évite de retenir 5 articles de la même catégorie ou du même acteur.

# POUR CHACUN DES 5 RETENUS, renvoie :
- id : l'identifiant fourni
- score : le total /100
- categorie : une seule parmi [marche-esn, ia-appliquee, frontier, strategie,
  vertical, reglementaire]
- secteur_principal : un secteur de {{secteurs_actifs}} ou "transverse"
- secteur_secondaire : un autre secteur concerné, ou "" (chaîne vide) si aucun
- justification : UNE phrase expliquant l'angle commercial (pas un résumé)

# ARTICLES CANDIDATS
{{articles}}
```

---

## 4. PROMPT D'ANALYSE — étape C (modèle fort, ex. Sonnet)

> **Rôle :** produire, pour les 5 retenus, la fiche exploitable par un commercial.
> **Entrée :** le top 5 AVEC LEUR TEXTE INTÉGRAL (récupéré par un nœud HTTP Request en amont).
> **Nœud n8n :** message système d'un `Basic LLM Chain` + sous-nœud `Structured Output Parser`.
> **Schéma de sortie :** voir §5.2.

```
{{BLOC_CONTEXTE_KREDO}}

# TÂCHE
Pour chacun des 5 articles ci-dessous, produis une fiche exploitable par un
commercial d'ESN. Base-toi UNIQUEMENT sur le contenu fourni. Si un élément
(chiffre, angle) n'est pas dans le texte, ne l'invente pas : reste factuel.

# POUR CHAQUE ARTICLE, produis :
- selection_rank : le rang (1 à 5)
- titre_fr : un titre clair et reformulé en français (pas de sensationnalisme)
- resume : 2 à 3 phrases factuelles. Ce que dit l'article, sans jargon technique.
- analyse_kredo : LE POURQUOI. En quoi c'est important pour un commercial d'ESN ?
  Quel signal, quelle tendance, quel besoin client cela révèle-t-il ? (3-4 phrases)
- action_commerciale : LA suggestion concrète. Quel type de compte approcher, avec
  quel angle d'accroche ? Formule-la comme un conseil actionnable, pas une généralité.
- secteur_principal : un secteur de {{secteurs_actifs}} ou "transverse"
- secteur_secondaire : un autre secteur concerné, ou "" (chaîne vide) si aucun
- categorie : [marche-esn, ia-appliquee, frontier, strategie, vertical, reglementaire]
- tags : 2 à 4 mots-clés

# CONVERGENCES KREDO
Pour chaque article :
À partir du contenu factuel de l'article et UNIQUEMENT des objets KREDO fournis dans CONVERGENCE_CONTEXT, identifie les rapprochements commercialement utiles entre cette actualité et la connaissance existante de KREDO. S'il n'y a pas de convergence suffisamment étayée, produis des listes vides et ne force pas de correspondance.

- convergences.synthesis : Formuler brièvement le rapprochement principal. Pas de remplissage. S'il n'existe aucune convergence, le dire explicitement.
- convergences.confidence : "high", "medium" ou "low" selon la force du rapprochement. Une confidence "high" ou "medium" DOIT obligatoirement comporter au moins un élément structuré non vide (matchedIssues, relatedAccounts, ou playbookSuggestion). Si aucune convergence forte n'est retenue, la confidence doit être "low".
- convergences.evidenceRefs : Tableau de toutes les références KREDO ayant servi au raisonnement ({ "type": "article"|"account_issue"|"company"|"sector_playbook", "id": "...", "label": "..." }). Les comptes ou enjeux de simple contexte périphérique restent ici sans être forcés dans les listes métier ci-dessous.
- convergences.matchedIssues : Maximum 3. RÈGLE : Si la synthèse affirme qu'un enjeu candidat converge avec l'article, tu DOIS IMPÉRATIVEMENT l'ajouter ici avec ses détails ({ issueId, companyId, companyName, issueTitle, rationale }). Uniquement si l'enjeu figure dans candidateIssues.
- convergences.relatedAccounts : Maximum 5. RÈGLE : Si un compte candidat est directement concerné par l'opportunité commerciale, tu DOIS l'ajouter ici ({ companyId, companyName, rationale }). Uniquement si le compte figure dans candidateAccounts.
- convergences.playbookSuggestion : Maximum UNE suggestion, si un playbook candidat est fourni, que l'article apporte un argument exploitable et qu'une section ciblée existe ({ sectorId, sectorName, targetSection, proposedArgument, rationale }). Sinon null.
- convergences.recommendedActions : Maximum 3 actions courtes et concrètes (approfondir, contacter, etc.) ({ label, rationale }).

# PUIS, au niveau de la semaine, produis :
- titre_digest : un titre pour l'ensemble de la sélection
- resume_hebdo : 3-4 phrases donnant LE fil rouge de la semaine (quel thème domine,
  quelle lecture d'ensemble en tirer)
- super_short_summary : 4 à 10 mots, sans ponctuation finale, pour le widget d'accueil

# CONTRAINTES & RÈGLES DE GROUNDING ABSOLUES
- Français, ton professionnel et direct, zéro remplissage.
- Le champ action_commerciale doit TOUJOURS être concret. Interdiction de phrases
  creuses type "cela peut intéresser vos prospects".
- Reste neutre : ne prends pas parti dans les rivalités entre acteurs.
- Aucun UUID inventé. Aucun compte inventé. Aucun enjeu inventé. Aucun secteur inventé. Aucun playbook inventé.
- Aucun chiffre absent du contenu source. Aucun fait KREDO absent du contexte fourni.
- Ne jamais transformer une hypothèse en fait.
- Une absence de convergence est parfaitement acceptable. Préférer des tableaux vides [] ou null à un rapprochement artificiel.
- Tu ne décides jamais d'une mutation métier, tu produis uniquement une recommandation structurée.

# EXEMPLE DU NIVEAU ATTENDU
Article : "L'AI Act impose au 2 août 2026 des obligations de transparence et de
traçabilité aux systèmes d'IA à haut risque, notamment dans la finance."

- selection_rank : 1
- titre_fr : "AI Act : les obligations sur l'IA en finance s'appliquent au 2 août 2026"
- resume : "L'AI Act rend obligatoires transparence et traçabilité pour les systèmes
  d'IA à haut risque. Le secteur financier, fortement utilisateur de scoring et
  d'automatisation, est en première ligne. L'échéance clé est le 2 août 2026."
- analyse_kredo : "Une échéance réglementaire est un déclencheur commercial en or :
  elle crée un besoin daté et non négociable. Les DSI banque/finance vont devoir
  auditer et documenter leurs systèmes d'IA. C'est un appel d'air pour des prestations
  d'audit de conformité et de mise en traçabilité — un terrain où une ESN se positionne
  en partenaire, pas en simple fournisseur."
- action_commerciale : "Cibler les DSI et responsables conformité des ETI bancaires
  du portefeuille. Angle d'ouverture : proposer un diagnostic de conformité AI Act
  avant l'échéance d'août, positionné comme réducteur de risque juridique et non
  comme un coût technique."
- secteur_principal : "banque-finance"
- secteur_secondaire : ""
- categorie : "reglementaire"
- tags : ["AI Act", "conformité", "banque", "audit"]
- convergences : (voir la structure JSON en section 5.2)

# ARTICLES & CONVERGENCE_CONTEXT
{{articles_top5_avec_contenu}}
```

---

## 5. Schémas de sortie JSON (pour le nœud `Structured Output Parser`)

> **Comment s'en servir :** dans le sous-nœud `Structured Output Parser`, option
> **Schema Type → Generate from JSON Example**, colle l'exemple ci-dessous.
> **Point d'attention n8n :** avec cette option, n8n rend TOUS les champs obligatoires.
> C'est pourquoi les champs optionnels (`secteur_secondaire`) utilisent une **chaîne vide `""`**
> et non `null` — un exemple `null` casserait le typage du schéma.

### 5.1 Sortie du Prompt de Classement

```json
{
  "top5": [
    {
      "id": "art_001",
      "score": 87,
      "categorie": "ia-appliquee",
      "secteur_principal": "banque-finance",
      "secteur_secondaire": "",
      "justification": "Échéance budgétaire T3 : angle d'audit ROI/gouvernance IA."
    }
  ]
}
```

### 5.2 Sortie du Prompt d'Analyse

```json
{
  "titre_digest": "Gouvernance, souveraineté et IA créative structurent la semaine",
  "resume_hebdo": "Le fil rouge de la semaine : l'IA d'entreprise quitte l'expérimentation pour le contrôle...",
  "super_short_summary": "Gouvernance souveraineté et IA créative cette semaine",
  "articles": [
    {
      "id": "art_001",
      "selection_rank": 1,
      "titre_fr": "Titre reformulé en français",
      "resume": "Deux à trois phrases factuelles.",
      "analyse_kredo": "Le pourquoi pour un commercial d'ESN.",
      "action_commerciale": "La suggestion concrète et ciblée.",
      "secteur_principal": "parfumerie",
      "secteur_secondaire": "",
      "categorie": "vertical",
      "tags": ["tag1", "tag2", "tag3"],
      "convergences": {
        "schemaVersion": 1,
        "synthesis": "L'article renforce le besoin de gouvernance IA déjà identifié chez L'Oréal.",
        "confidence": "high",
        "evidenceRefs": [
          { "type": "company", "id": "comp_uuid_1", "label": "L'Oréal" }
        ],
        "matchedIssues": [
          {
            "issueId": "issue_uuid_1",
            "companyId": "comp_uuid_1",
            "companyName": "L'Oréal",
            "issueTitle": "Mise en place AI Act",
            "rationale": "L'article donne un calendrier précis réutilisable pour cet enjeu."
          }
        ],
        "relatedAccounts": [
          {
            "companyId": "comp_uuid_1",
            "companyName": "L'Oréal",
            "rationale": "Leur DSI est citée directement dans l'article."
          }
        ],
        "playbookSuggestion": {
          "sectorId": "sect_uuid_1",
          "sectorName": "Parfumerie",
          "targetSection": "Réglementation",
          "proposedArgument": "Anticiper l'AI Act dès Q3 2026",
          "rationale": "L'article confirme cette tendance pour tout le secteur."
        },
        "recommendedActions": [
          {
            "label": "Contacter le DSI L'Oréal",
            "rationale": "Rebondir sur leur citation."
          }
        ]
      }
    }
  ]
}
```

---

## 6. Notes d'intégration n8n (rappel architecture)

1. **Étape A (gratuite)** — dédup Supabase (hash URL) + filtre récence 7 jours + pré-score mots-clés. Réduit ~300 candidats → ~30-40.
2. **Étape B — Classement** — `Basic LLM Chain` (modèle léger) + `Structured Output Parser` (§5.1). Sort le top 5.
3. **Étape intermédiaire — Fetch full-text** — un `HTTP Request` récupère le texte intégral des 5 articles retenus. *Indispensable : sans lui, l'analyse s'appauvrit (point 3 du test).* Coût négligeable sur 5 articles.
4. **Étape C — Analyse** — `Basic LLM Chain` (modèle fort) + `Structured Output Parser` (§5.2).
5. **Persistance** — upsert Supabase (`veille_digests`, `veille_articles`, mémoire `veille_seen`). Le champ `secteur_principal`/`secteur_secondaire` prépare le rattachement CRM en v2.

> **Astuce anti-bug :** dans les prompts, interdis explicitement le markdown dans les valeurs
> texte. Le `Structured Output Parser` de n8n peut échouer si une valeur contient des triple
> backticks (``` ``` ```) — bug connu. Nos prompts demandent déjà du texte simple, à conserver.

---

## 7. Changelog

**v1.0 (2026-07-06)** — Première version figée après test manuel sur 3 articles réels (MarketScale / gouvernance IA, L'Oréal DATALAND / parfumerie, Mistral / souveraineté). Corrections intégrées vs brouillon :
1. **Filtre de récence strict à 7 jours** ajouté au Prompt de Classement (via `{{date_run}}`).
2. **Champ secteur dédoublé** en `secteur_principal` + `secteur_secondaire` (nullable → `""`).
3. **Fetch full-text** documenté en amont de l'analyse (entrée `{{articles_top5_avec_contenu}}`).
4. **Contrainte de diversité** (catégories/secteurs) ajoutée au Prompt de Classement.
5. **Posture éditoriale de neutralité** ajoutée au Bloc Contexte.
