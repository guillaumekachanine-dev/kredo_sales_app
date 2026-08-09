# KREDO — Workflow n8n : Veille Hebdomadaire IA & Marché

**Version** : 1.0
**Cible** : n8n v2 self-hosted (VPS)
**Date** : 2026-07-06
**Statut** : Prêt à construire — chaque nœud a été vérifié contre la documentation officielle n8n avant rédaction

---

## 0. Prérequis — Credentials à créer dans n8n

Avant de poser le premier nœud, va dans **Settings → Credentials → Add Credential** et crée :

### Credential 1 : Supabase
- Type à chercher : **Supabase API**
- Host : `https://jvzgmhvwirsbdkjpmvla.supabase.co`
- Service Role Secret : ta clé `service_role` (Supabase Dashboard → Project Settings → API)

⚠️ **Point d'attention critique** : utilise bien la **Service Role Key**, jamais la clé anon. La clé anon est bloquée par RLS et n'écrira aucune ligne (erreur silencieuse ou permission denied selon le nœud).

### Credential 2 : Anthropic (Header Auth générique)
- Type à chercher : **Header Auth**
- Name : `x-api-key`
- Value : ta clé API Anthropic (`sk-ant-...`)

**Pourquoi Header Auth générique et pas le type "Anthropic API" natif ?** Parce qu'on n'utilise pas le nœud natif "Anthropic Chat Model" (bug d'authentification documenté, voir §3 du message principal). Le Header Auth générique est garanti de fonctionner avec n'importe quel nœud HTTP Request, sans dépendre d'un credential type propriétaire.

### Credential 3 (optionnel) : Slack ou Telegram pour les notifications d'erreur
Selon ce que tu as déjà connecté dans ton n8n. Voir §8.

---

## SECTION A — Déclenchement & Contexte KREDO

### Nœud A1 — "Lundi 6h Europe Paris"
- **Chercher dans le panneau "+"** : `Schedule Trigger`
- **Trigger Interval** : `Weeks`
- **Weeks Between Triggers** : `1`
- **Trigger on Weekdays** : `Monday`
- **Trigger at Hour** : `6`
- **Trigger at Minute** : `0`

⚠️ **Point d'attention critique** : par défaut, un n8n self-hosted utilise le fuseau `America/New_York`. Il FAUT régler le fuseau du workflow explicitement : clique sur les trois points en haut à droite du canvas → **Settings** → **Timezone** → sélectionne `Europe/Paris`. Sans ça, ton workflow se déclenchera à minuit heure française.

Le bouton "Execute step" sur ce nœud déclenche immédiatement l'exécution (ignore la planification) — utile pour tester la suite du workflow sans attendre lundi, mais ne valide PAS que le cron est correctement configuré. Pour ça, regarde le "Next execution" affiché dans le panneau du nœud après sauvegarde.

Le workflow doit être **Save** puis **Activate** (bascule en haut à droite) pour que la planification tourne réellement.

---

### Nœud A2 — "Récupérer Secteurs Actifs"
- **Chercher** : `Supabase`
- **Credential** : celui créé en §0
- **Resource** : `Row`
- **Operation** : `Get Many`
- **Table** : `sector_intelligence`
- Pas de filtre nécessaire en V1 (seulement 2 secteurs seedés actuellement — Parfumerie & Arômes, Banque-Finance-Assurance)

⚠️ **Point d'attention** : si tu ajoutes un filtre sur une colonne `status`, vérifie d'abord la valeur exacte utilisée dans ta table (`'active'`, `'live'`, autre) — je ne l'ai pas dans mes informations vérifiées, mieux vaut fetch tout et filtrer côté code si besoin plus tard.

---

### Nœud A3 — "Build Contexte KREDO"
- **Chercher** : `Code`
- **Mode** : `Run Once for All Items`
- **Language** : JavaScript

```javascript
const items = $input.all();
const secteurs = items.map(i => i.json.name).filter(Boolean);
const secteursActifs = secteurs.length ? secteurs.join(', ') : 'transverse';

const blocContexteKredo = `# CONTEXTE — Veille commerciale KREDO

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
couverts par KREDO : ${secteursActifs}.

## La question à laquelle toute ton analyse doit répondre
"En quoi cette information donne-t-elle à un commercial d'ESN une RAISON D'AGIR :
un angle d'ouverture, un déclencheur de prise de contact, un argument de crédibilité,
ou une preuve de ROI qu'il peut réutiliser dans un pitch ?"

## Est PERTINENT
- Un cas d'usage IA concret en entreprise, avec impact business chiffrable.
- Une tendance qui va faire réagir un DSI (agents IA, souveraineté, coûts, sécurité).
- Une évolution réglementaire qui crée un besoin de service (audit, mise en conformité).
- Un signal touchant un des secteurs de ${secteursActifs} (acteur, tendance, chiffre).
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
le contenu fourni, ne l'ajoute pas.`;

return [{
  json: {
    secteursActifs,
    blocContexteKredo,
    workspaceId: '98dcd39d-f87b-4f9d-add9-ce76d635953a',
    digestDate: new Date().toISOString().slice(0, 10),
  }
}];
```

---

## SECTION B — Collecte RSS (14 sources)

### Nœud B1 — "Config Sources KREDO"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const sources = [
  // --- Marché IT / ESN France ---
  { name: 'LeMagIT', rssUrl: 'https://www.lemagit.fr/rss', homepage: 'https://www.lemagit.fr', secteurDefaut: 'transverse', categorieDefaut: 'marche-esn', confiance: 'verifie' },
  { name: 'ChannelNews', rssUrl: 'https://www.channelnews.fr/feed/', homepage: 'https://www.channelnews.fr', secteurDefaut: 'transverse', categorieDefaut: 'marche-esn', confiance: 'tres_probable' },
  { name: "L'Usine Digitale", rssUrl: 'https://www.usine-digitale.fr/arc/outboundfeeds/rss/', homepage: 'https://www.usine-digitale.fr', secteurDefaut: 'transverse', categorieDefaut: 'vertical', confiance: 'verifie' },

  // --- IA appliquée / ROI entreprise ---
  { name: 'The Batch (DeepLearning.AI)', rssUrl: 'https://www.deeplearning.ai/the-batch/feed/', homepage: 'https://www.deeplearning.ai/the-batch/', secteurDefaut: 'transverse', categorieDefaut: 'ia-appliquee', confiance: 'verifie' },
  { name: 'One Useful Thing', rssUrl: 'https://www.oneusefulthing.org/feed', homepage: 'https://www.oneusefulthing.org/', secteurDefaut: 'transverse', categorieDefaut: 'ia-appliquee', confiance: 'verifie' },
  { name: 'VentureBeat AI', rssUrl: 'https://venturebeat.com/category/ai/feed/', homepage: 'https://venturebeat.com/ai/', secteurDefaut: 'transverse', categorieDefaut: 'ia-appliquee', confiance: 'verifie' },

  // --- Frontier & acteurs IA ---
  { name: 'Anthropic News', rssUrl: 'https://www.anthropic.com/news/rss.xml', homepage: 'https://www.anthropic.com/news', secteurDefaut: 'transverse', categorieDefaut: 'frontier', confiance: 'verifie' },
  { name: 'OpenAI News', rssUrl: 'https://openai.com/news/rss.xml', homepage: 'https://openai.com/news/', secteurDefaut: 'transverse', categorieDefaut: 'frontier', confiance: 'verifie' },
  { name: 'The Neuron', rssUrl: 'https://www.theneurondaily.com/rss.xml', homepage: 'https://www.theneurondaily.com/', secteurDefaut: 'transverse', categorieDefaut: 'frontier', confiance: 'verifie' },

  // --- Stratégie & marché ---
  { name: 'a16z', rssUrl: 'https://a16z.com/feed', homepage: 'https://a16z.com', secteurDefaut: 'transverse', categorieDefaut: 'strategie', confiance: 'verifie' },
  { name: 'Journal du Net — IA', rssUrl: 'https://www.journaldunet.com/intelligence-artificielle/rss/', homepage: 'https://www.journaldunet.com/intelligence-artificielle/', secteurDefaut: 'transverse', categorieDefaut: 'strategie', confiance: 'verifie' },

  // --- Réglementaire & souveraineté ---
  { name: 'ActuIA', rssUrl: 'https://www.actuia.com/feed/', homepage: 'https://www.actuia.com', secteurDefaut: 'transverse', categorieDefaut: 'reglementaire', confiance: 'verifie' },

  // --- Verticaux modulaires : à faire évoluer selon les secteurs KREDO actifs ---
  { name: 'Finextra', rssUrl: 'https://www.finextra.com/rss/headlines.aspx', homepage: 'https://www.finextra.com', secteurDefaut: 'banque-finance', categorieDefaut: 'vertical', confiance: 'a_tester' },
  { name: 'Premium Beauty News', rssUrl: 'https://www.premiumbeautynews.com/fr/rss.xml', homepage: 'https://www.premiumbeautynews.com', secteurDefaut: 'parfumerie', categorieDefaut: 'vertical', confiance: 'a_tester' },
];

return [{ json: { sources } }];
```

**Point d'attention avant activation** : teste individuellement chaque flux marqué `a_tester` ou `tres_probable` via le bouton "Execute step" du nœud RSS Read (B4) en lui passant temporairement l'URL en dur. Si un flux échoue, corrige l'URL directement dans ce tableau — c'est la seule source de vérité des sources, ne duplique jamais cette liste ailleurs.

---

### Nœud B2 — "Explode Sources"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const sources = $input.first().json.sources;
return sources.map(s => ({ json: s }));
```

Ce nœud transforme 1 item (contenant un tableau de 14 sources) en 14 items distincts — un par source.

---

### Nœud B3 — "Loop Over Items — 1 Source"
- **Chercher** : `Loop Over Items` (apparaît aussi sous le nom `Split in Batches`)
- **Batch Size** : `1`

⚠️ **C'est le nœud le plus important de toute la section collecte.** La documentation officielle n8n est explicite : *"You need the Loop Over Items node in the workflow as the RSS Feed Read node only processes the first item it receives."* Sans lui, ton workflow lirait silencieusement UNE SEULE des 14 sources et ignorerait les 13 autres — sans erreur visible. Ce nœud a deux sorties : **loop** (traite l'item courant) et **done** (se déclenche une fois que les 14 sources sont passées). Connecte la sortie **loop** au nœud B4 ; la sortie **done** ira vers la Section C.

---

### Nœud B4 — "Lire Flux RSS"
- **Chercher** : `RSS Read`
- **URL** : `{{ $json.rssUrl }}`
- **Ignore SSL Issues** : activé (`true`)

**Pourquoi activer Ignore SSL Issues par défaut ?** Certains petits médias ont des chaînes de certificats mal configurées. Ça ne coûte rien de l'activer globalement et ça évite un échec silencieux sur une source dont le certificat est imparfait mais légitime.

Connecte la sortie de ce nœud au nœud B5.

---

### Nœud B5 — "Enrichir avec Métadonnées Source"
- **Type** : `Code`
- **Mode** : `Run Once for Each Item` (important : chaque article RSS doit recevoir individuellement les métadonnées de sa source)

```javascript
const source = $('Loop Over Items — 1 Source').item.json;

return {
  json: {
    title: $json.title || '',
    link: $json.link || '',
    pubDate: $json.pubDate || $json.isoDate || null,
    contentSnippet: $json.contentSnippet || $json.content || '',
    sourceName: source.name,
    sourceHomepage: source.homepage,
    secteurDefaut: source.secteurDefaut,
    categorieDefaut: source.categorieDefaut,
  }
};
```

**Pourquoi `$('Loop Over Items — 1 Source').item.json` et non une variable globale ?** Parce qu'on est à l'intérieur d'une seule itération de la boucle : à ce moment précis, il n'y a qu'une seule source en contexte, donc cette référence est non-ambiguë et garantie correcte — pas de risque de mélanger les métadonnées de deux sources différentes.

Reconnecte la sortie de ce nœud vers l'**entrée** du nœud B3 (Loop Over Items) pour fermer la boucle. La sortie **done** de B3 continue vers la Section C.

---

## SECTION C — Étape A : Préfiltre & Dédup

### Nœud C1 — "Récupérer Hash Articles Vus"
- **Type** : `Supabase`
- **Resource** : `Row`, **Operation** : `Get Many`
- **Table** : `veille_articles`
- **Filters** : ajoute un filtre sur `created_at`, condition "supérieur ou égal" (le libellé exact dépend de ta version — vérifie le menu déroulant), valeur : `{{ $now.minus({ days: 21 }).toISO() }}`

**Pourquoi 21 jours et pas "tout l'historique" ?** Le filtre de récence de l'étape suivante n'accepte de toute façon que des articles publiés dans les 7 derniers jours. Regarder plus loin que ~3 semaines en arrière ne sert à rien et ferait grossir cette requête indéfiniment à mesure que la feature vieillit.

---

### Nœud C2 — "Dédup + Filtre Récence + Préfiltre Qualité"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const seenRows = $('Récupérer Hash Articles Vus').all().map(i => i.json);
const seenHashes = new Set(seenRows.map(r => r.url_hash));

const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const candidates = $input.all().map(i => i.json);

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

const filtered = candidates
  .filter(a => a.link)
  .map(a => ({ ...a, urlHash: simpleHash(a.link) }))
  .filter(a => !seenHashes.has(a.urlHash))
  .filter(a => {
    if (!a.pubDate) return true; // pas de date fiable : on laisse le classement IA trancher
    const d = new Date(a.pubDate);
    return !isNaN(d) && d >= sevenDaysAgo;
  })
  .filter(a => (a.title || '').length > 10);

// Cap à 40 candidats pour maîtriser le coût du classement (Étape B, modèle Haiku)
const capped = filtered.slice(0, 40);

return capped.map((a, idx) => ({
  json: {
    id: `art_${idx}`,
    title: a.title,
    source: a.sourceName,
    url: a.link,
    urlHash: a.urlHash,
    publishedAt: a.pubDate,
    summary: (a.contentSnippet || '').slice(0, 600),
    secteurDefaut: a.secteurDefaut,
    categorieDefaut: a.categorieDefaut,
  }
}));
```

**Pourquoi un hash "maison" plutôt qu'un vrai SHA-256 ?** Ici on n'a besoin d'aucune propriété cryptographique — juste d'un identifiant court et stable pour dédupliquer. Un hash simple suffit et évite de dépendre d'un module externe dans le sandbox du Code node.

---

## SECTION D — Étape B : Classement (Claude Haiku)

### Nœud D1 — "Construire Prompt Classement"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const items = $input.all().map(i => i.json);
const blocContexteKredo = $('Build Contexte KREDO').first().json.blocContexteKredo;
const secteursActifs = $('Build Contexte KREDO').first().json.secteursActifs;
const dateRun = new Date().toISOString().slice(0, 10);

const articlesBlock = items.map(a =>
  `id: ${a.id}\ntitre: ${a.title}\nsource: ${a.source}\ndate: ${a.publishedAt || 'inconnue'}\nchapo: ${a.summary}`
).join('\n\n---\n\n');

const promptClassement = `${blocContexteKredo}

# TÂCHE
Voici une liste d'articles candidats de la semaine. Évalue CHACUN selon la grille
ci-dessous, puis renvoie UNIQUEMENT les 5 meilleurs, classés par score décroissant.

# FILTRE PRÉALABLE OBLIGATOIRE
Date de référence : ${dateRun}.
Écarte immédiatement, avant tout scoring, tout article publié il y a plus de 7 jours.
La veille est HEBDOMADAIRE : un article ancien n'a pas sa place, même s'il est bon.

# GRILLE DE SCORING (0 à 100)
- Actionnabilité commerciale (0-40) : l'article fournit-il un angle, un déclencheur
  ou un argument qu'un commercial peut réellement utiliser ? (le critère roi)
- Pertinence pour le lecteur ESN (0-25) : parle-t-il d'IA appliquée, de tendance
  décideur, de réglementation créatrice de besoin ?
- Alignement secteur KREDO (0-20) : touche-t-il un secteur de ${secteursActifs} ?
  (0 si transverse, mais un article transverse fort reste éligible)
- Crédibilité & fraîcheur (0-15) : source fiable, information récente et non éculée.
- PÉNALITÉS : retire des points pour buzz creux, technique non traduit, doublon
  thématique évident, contenu promotionnel.

# CONTRAINTE DE DIVERSITÉ
À pertinence comparable, privilégie la diversité des catégories et des secteurs dans
le top 5. Évite de retenir 5 articles de la même catégorie ou du même acteur.

# FORMAT DE SORTIE
Réponds UNIQUEMENT avec un JSON valide, une seule ligne, sans backticks, sans texte
avant ou après, structure exacte :
{"top5":[{"id":"art_0","score":87,"categorie":"ia-appliquee","secteur_principal":"banque-finance","secteur_secondaire":"","justification":"..."}]}

# ARTICLES CANDIDATS
${articlesBlock}`;

return [{
  json: {
    promptClassement,
    candidatesById: Object.fromEntries(items.map(a => [a.id, a])),
  }
}];
```

---

### Nœud D2 — "Appel Claude Haiku — Classement"
- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://api.anthropic.com/v1/messages`
- **Authentication** : `Generic Credential Type` → `Header Auth` → sélectionne le credential créé en §0
- **Send Headers** : activé
  - `anthropic-version` = `2023-06-01`
  - `content-type` = `application/json`
- **Body Content Type** : `JSON`
- **Specify Body** : `Using JSON`
- Dans le champ JSON, écris **exactement** cette expression unique :

```
{{ JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, messages: [{ role: "user", content: $json.promptClassement }] }) }}
```

⚠️ **Point d'attention critique — le plus important de tout le workflow.** N'écris JAMAIS le corps JSON comme un mélange de texte brut et d'expressions (ex. `"content": "{{ $json.promptClassement }}"` au milieu d'un JSON tapé à la main). Si le prompt contient un guillemet ou un retour à la ligne, ça casse silencieusement le JSON envoyé à l'API. La bonne pratique, systématique, est d'envelopper **tout** le corps dans un unique `JSON.stringify({...})` — ainsi n8n échappe automatiquement tous les caractères spéciaux. Applique cette même règle au nœud E2.

---

### Nœud D3 — "Parser Top 5"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const response = $input.first().json;
const rawText = response.content?.[0]?.text || '';
const candidatesById = $('Construire Prompt Classement').first().json.candidatesById;

function extractJson(text) {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

let parsed;
try {
  parsed = JSON.parse(extractJson(rawText));
} catch (e) {
  throw new Error('Le classement Haiku n a pas renvoye un JSON exploitable : ' + rawText.slice(0, 300));
}

const top5 = (parsed.top5 || []).slice(0, 5).map(t => {
  const candidate = candidatesById[t.id];
  if (!candidate) return null;
  return {
    ...candidate,
    score: t.score,
    categorie: t.categorie || candidate.categorieDefaut,
    secteurPrincipal: t.secteur_principal || candidate.secteurDefaut,
    secteurSecondaire: t.secteur_secondaire || '',
    justification: t.justification || '',
  };
}).filter(Boolean);

if (top5.length === 0) {
  throw new Error('Aucun article valide dans le top 5 retourne par le classement.');
}

return top5.map(a => ({ json: a }));
```

---

## SECTION E — Étape C : Analyse (Claude Sonnet)

### Nœud E1 — "Construire Prompt Analyse"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const items = $input.all().map(i => i.json);
const blocContexteKredo = $('Build Contexte KREDO').first().json.blocContexteKredo;

const articlesBlock = items.map((a, idx) =>
  `Article ${idx + 1}\nTitre: ${a.title}\nSource: ${a.source}\nURL: ${a.url}\nPublié: ${a.publishedAt || 'inconnue'}\nContenu: ${String(a.summary || '').slice(0, 1500)}`
).join('\n\n---\n\n');

const promptAnalyse = `${blocContexteKredo}

# TÂCHE
Pour chacun des ${items.length} articles ci-dessous, produis une fiche exploitable
par un commercial d'ESN. Base-toi UNIQUEMENT sur le contenu fourni. Si un élément
(chiffre, angle) n'est pas dans le texte, ne l'invente pas : reste factuel.

# POUR CHAQUE ARTICLE, produis :
selection_rank, titre_fr, resume (2-3 phrases factuelles), analyse_kredo (3-4
phrases : LE POURQUOI pour un commercial d'ESN), action_commerciale (suggestion
concrète et ciblée, jamais une généralité), secteur_principal, secteur_secondaire
(chaîne vide si aucun), categorie, tags (2 à 4 mots-clés).

# PUIS, au niveau de la semaine, produis :
titre_digest, resume_hebdo (3-4 phrases donnant le fil rouge de la semaine),
super_short_summary (4 à 10 mots, sans ponctuation finale).

# CONTRAINTES
- Français, ton professionnel et direct, zéro remplissage.
- action_commerciale toujours concret. Interdiction de phrases creuses.
- Reste neutre : ne prends pas parti dans les rivalités entre acteurs.

# FORMAT DE SORTIE
Réponds UNIQUEMENT avec un JSON valide, une seule ligne, sans backticks, structure :
{"titre_digest":"...","resume_hebdo":"...","super_short_summary":"...","articles":[{"selection_rank":1,"titre_fr":"...","resume":"...","analyse_kredo":"...","action_commerciale":"...","secteur_principal":"...","secteur_secondaire":"","categorie":"...","tags":["..."]}]}

# ARTICLES
${articlesBlock}`;

return [{ json: { promptAnalyse, sourceArticles: items } }];
```

---

### Nœud E2 — "Appel Claude Sonnet — Analyse"
- **Type** : `HTTP Request` — configuration identique au nœud D2, à ces différences près :
  - **max_tokens** : `2500`
  - **model** : `claude-sonnet-5`
  - Champ JSON :

```
{{ JSON.stringify({ model: "claude-sonnet-5", max_tokens: 2500, messages: [{ role: "user", content: $json.promptAnalyse }] }) }}
```

---

### Nœud E3 — "Parser Digest Final"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const response = $input.first().json;
const rawText = response.content?.[0]?.text || '';
const sourceArticles = $('Construire Prompt Analyse').first().json.sourceArticles;

function extractJson(text) {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

function repair(text) {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
}

let parsed;
try {
  parsed = JSON.parse(repair(extractJson(rawText)));
} catch (e) {
  throw new Error('L analyse Sonnet n a pas renvoye un JSON exploitable : ' + rawText.slice(0, 300));
}

const articles = (parsed.articles || []).map((a, idx) => {
  const src = sourceArticles[idx] || {};
  return {
    selectionRank: a.selection_rank || idx + 1,
    titreFr: a.titre_fr,
    resume: a.resume,
    analyseKredo: a.analyse_kredo,
    actionCommerciale: a.action_commerciale,
    secteurPrincipal: a.secteur_principal || src.secteurPrincipal || 'transverse',
    secteurSecondaire: a.secteur_secondaire || '',
    categorie: a.categorie || src.categorie,
    tags: a.tags || [],
    url: src.url,
    urlHash: src.urlHash,
    sourceName: src.source,
    publishedAt: src.publishedAt || null,
  };
});

return [{
  json: {
    titreDigest: parsed.titre_digest,
    resumeHebdo: parsed.resume_hebdo,
    superShortSummary: parsed.super_short_summary,
    articles,
  }
}];
```

**Pourquoi ce nœud reprend-il la réparation JSON (guillemets courbes, virgules traînantes) déjà présente dans FOLIO ?** Parce que ce sont exactement les mêmes défauts qu'on observe avec n'importe quel LLM appelé en mode texte libre. Réinventer une version plus simple serait prendre un risque gratuit — celle-ci est déjà éprouvée en production.

---

## SECTION F — Persistance Supabase

### Nœud F1 — "Créer Digest"
- **Type** : `Supabase`, **Operation** : `Create`
- **Table** : `veille_digests`
- Champs à mapper :
  - `workspace_id` → `98dcd39d-f87b-4f9d-add9-ce76d635953a`
  - `digest_date` → `{{ $('Build Contexte KREDO').first().json.digestDate }}`
  - `titre_digest` → `{{ $json.titreDigest }}`
  - `resume_hebdo` → `{{ $json.resumeHebdo }}`
  - `super_short_summary` → `{{ $json.superShortSummary }}`
  - `model_classement` → `claude-haiku-4-5-20251001`
  - `model_analyse` → `claude-sonnet-5`
  - `nb_candidats_evalues` → `{{ $('Dédup + Filtre Récence + Préfiltre Qualité').all().length }}`
  - `nb_sources_actives` → `{{ $('Config Sources KREDO').first().json.sources.length }}`

Ce nœud renvoie la ligne créée, y compris son `id` généré — indispensable pour l'étape suivante.

---

### Nœud F2 — "Préparer Lignes Articles"
- **Type** : `Code`, Mode `Run Once for All Items`

```javascript
const digest = $('Parser Digest Final').first().json;
const digestRow = $('Créer Digest').first().json;
const workspaceId = '98dcd39d-f87b-4f9d-add9-ce76d635953a';

return digest.articles.map(a => ({
  json: {
    digest_id: digestRow.id,
    workspace_id: workspaceId,
    selection_rank: a.selectionRank,
    titre_fr: a.titreFr,
    source_name: a.sourceName,
    url: a.url,
    url_hash: a.urlHash,
    published_at: a.publishedAt,
    resume: a.resume,
    analyse_kredo: a.analyseKredo,
    action_commerciale: a.actionCommerciale,
    secteur_principal: a.secteurPrincipal,
    secteur_secondaire: a.secteurSecondaire,
    categorie: a.categorie,
    tags: a.tags,
  }
}));
```

---

### Nœud F3 — "Créer Articles"
- **Type** : `Supabase`, **Operation** : `Create`
- **Table** : `veille_articles`
- Champs mappés directement depuis les items produits par F2 (mapping automatique par nom de colonne)

**Pourquoi pas de boucle ici, contrairement à la Section B ?** Le nœud RSS Read est un cas particulier documenté qui ne traite que le premier item. Le nœud Supabase Create, lui, suit le comportement standard de n8n : il traite chaque item entrant comme une ligne à insérer, automatiquement. Cinq items en entrée → cinq lignes créées. Pas de Loop Over Items nécessaire.

⚠️ **Rappel** : ton installation n8n ne supporte pas l'opération `createOrUpdate` sur le nœud Supabase (déjà validé lors du workflow de veille sectorielle). On n'en a pas besoin ici puisque chaque digest hebdomadaire crée des lignes neuves — aucun upsert n'est requis dans ce pipeline.

---

## SECTION G — Gestion des erreurs

### Nœud G1 — Configuration du Error Workflow
- Dans les **Settings** du workflow (trois points en haut à droite) → **Error Workflow** → sélectionne (ou crée) un petit workflow séparé nommé par exemple `KREDO — Notifications Erreurs`.

Ce workflow séparé contient simplement :
- Un nœud **Error Trigger** (`n8n-nodes-base.errorTrigger`) — se déclenche automatiquement quand n'importe quel nœud de ce workflow échoue.
- Un nœud de notification (Slack ou Telegram selon ce que tu as déjà connecté), avec un message du type :

```
⚠️ Veille KREDO — échec
Workflow : {{ $json.workflow.name }}
Nœud en erreur : {{ $json.execution.error.node.name }}
Message : {{ $json.execution.error.message }}
```

**Pourquoi un workflow séparé plutôt qu'un nœud dans le canvas principal ?** C'est le mécanisme natif prévu par n8n (`Error Workflow` dans les Settings) : il se déclenche même si l'échec survient tôt dans l'exécution (par exemple si le tout premier appel Supabase échoue), ce qu'un nœud "Error Trigger" posé dans le même canvas ne peut pas garantir aussi fiablement.

---

## Récapitulatif des 22 nœuds

| # | Nom | Type | Section |
|---|---|---|---|
| A1 | Lundi 6h Europe Paris | Schedule Trigger | Déclenchement |
| A2 | Récupérer Secteurs Actifs | Supabase (Get Many) | Contexte |
| A3 | Build Contexte KREDO | Code | Contexte |
| B1 | Config Sources KREDO | Code | Collecte |
| B2 | Explode Sources | Code | Collecte |
| B3 | Loop Over Items — 1 Source | Loop Over Items | Collecte |
| B4 | Lire Flux RSS | RSS Read | Collecte |
| B5 | Enrichir avec Métadonnées Source | Code | Collecte |
| C1 | Récupérer Hash Articles Vus | Supabase (Get Many) | Préfiltre |
| C2 | Dédup + Filtre Récence + Préfiltre Qualité | Code | Préfiltre |
| D1 | Construire Prompt Classement | Code | Classement |
| D2 | Appel Claude Haiku — Classement | HTTP Request | Classement |
| D3 | Parser Top 5 | Code | Classement |
| E1 | Construire Prompt Analyse | Code | Analyse |
| E2 | Appel Claude Sonnet — Analyse | HTTP Request | Analyse |
| E3 | Parser Digest Final | Code | Analyse |
| F1 | Créer Digest | Supabase (Create) | Persistance |
| F2 | Préparer Lignes Articles | Code | Persistance |
| F3 | Créer Articles | Supabase (Create) | Persistance |
| G1 | (workflow séparé) Notifications Erreurs | Error Trigger + notif | Erreurs |

---

## Checklist de mise en production

- [ ] Migration `025_veille_actualite.sql` appliquée (numéro vérifié contre le dossier réel)
- [ ] Credential Supabase (Service Role Key) créé et testé
- [ ] Credential Header Auth Anthropic créé et testé
- [ ] Timezone du workflow réglée sur `Europe/Paris`
- [ ] Chaque flux RSS marqué `a_tester` ou `tres_probable` testé individuellement via "Execute step"
- [ ] Une exécution manuelle complète (bouton "Execute Workflow") réalisée avant activation du Schedule
- [ ] Vérification en base : une ligne dans `veille_digests`, cinq lignes dans `veille_articles`
- [ ] Error Workflow configuré et testé (provoquer une erreur volontaire pour vérifier la notification)
- [ ] Workflow **Activated** (bascule en haut à droite)
