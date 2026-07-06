# HANDOFF CLAUDE CODE — Génération JSON n8n + Vérification Migration Veille KREDO

**Destinataire** : Claude Code
**Mission** : (1) Générer le fichier JSON n8n v2 importable pour le workflow "Veille Hebdomadaire IA & Marché", (2) Vérifier et corriger si besoin la migration SQL `veille_actualite` contre le schéma réel de la base Supabase.
**Statut** : Prêt à démarrer

---

## 📋 CONTEXTE PROJET

Tu travailles sur **Kredo**, un outil B2B interne de gestion de centre de profit ESN (Next.js 15 / Supabase / n8n v2 self-hosted). Le repo contient un fichier `CLAUDE.md` à la racine — lis-le en premier si ce n'est pas déjà fait, il contient les conventions du projet.

La feature en cours s'appelle **"Veille & Actualité"** : un pipeline n8n hebdomadaire qui collecte des flux RSS, les filtre, les fait classer puis analyser par Claude (Haiku pour le tri, Sonnet pour l'analyse), et persiste le résultat dans Supabase pour affichage ultérieur dans l'app.

**Workspace Supabase** : `jvzgmhvwirsbdkjpmvla`
**Workspace ID KREDO** : `98dcd39d-f87b-4f9d-add9-ce76d635953a`

---

## 📄 Documents source à lire intégralement avant de commencer

Ces deux fichiers sont la spécification complète et font autorité. Ne devine rien qui y est déjà écrit noir sur blanc.

1. **`kredo_n8n_workflow_veille_v1.0.md`** — spécification nœud par nœud du workflow (22 nœuds, code JS complet de chaque Code node, paramètres exacts de chaque nœud natif). C'est la base de la Mission 1.
2. **`kredo_veille_prompt_pack_v1.0.md`** — les prompts LLM (Bloc Contexte, Classement, Analyse) déjà figés et validés. Le workflow les intègre déjà en JS — tu n'as pas à les retoucher, juste à t'assurer qu'ils sont reproduits fidèlement dans le JSON.

---

## 🎯 MISSION 1 — Générer le JSON n8n v2 importable

### Ce que tu dois produire
Un fichier `veille-hebdomadaire-kredo.json`, au format d'export standard n8n (structure `{ "name", "nodes": [...], "connections": {...}, "settings": {...} }`), reproduisant **exactement** les 22 nœuds décrits dans `kredo_n8n_workflow_veille_v1.0.md` — noms, types, paramètres, code JS, connexions.

### Règles impératives

**R1 — Vérifie les `typeVersion` réels avant de les figer.**
N'invente pas un numéro de version au hasard. Si tu as accès à l'instance n8n (API REST locale, ou les packages npm installés sur le VPS), interroge-la pour connaître la version exacte de chaque type de nœud utilisé (`n8n-nodes-base.scheduleTrigger`, `n8n-nodes-base.code`, `n8n-nodes-base.httpRequest`, `n8n-nodes-base.supabase`, `n8n-nodes-base.rssFeedRead`, `n8n-nodes-base.splitInBatches`, `n8n-nodes-base.errorTrigger`). Si tu n'as aucun moyen de vérifier, utilise la dernière version stable documentée sur `docs.n8n.io` **et signale-le explicitement** dans ton rapport de livraison — ne présente jamais une supposition comme une certitude.

**R2 — Ne jamais inventer d'ID de credential.**
Les champs `credentials` des nœuds `Supabase` et `HTTP Request` (D2, E2) doivent rester structurellement présents mais vides ou avec un nom de credential générique (ex. `"Supabase account"`, `"Header Auth account"`) — jamais un faux ID. Un ID de credential est propre à chaque instance n8n ; en inventer un provoquerait soit un échec d'import, soit pire, une association silencieuse à un mauvais credential. Le comportement normal et attendu à l'import est que n8n affiche "sélectionner un credential" sur ces deux nœuds — c'est à moi de les mapper après import.

**R3 — Respecte à la lettre le mécanisme `JSON.stringify()` des nœuds HTTP Request (D2, E2).**
Le corps de la requête doit être une expression unique `{{ JSON.stringify({...}) }}`, jamais un JSON tapé à la main mélangé à des expressions. C'est documenté comme point d'attention critique dans le fichier source — ne le simplifie pas, ne le "nettoie" pas de ta propre initiative.

**R4 — Respecte la boucle `Loop Over Items` (B3) autour du nœud `RSS Read` (B4).**
C'est un point de vigilance documenté et vérifié : le nœud RSS Read ne traite que le premier item reçu sans cette boucle. Vérifie que la connexion `loop` de B3 va bien vers B4→B5, et que B5 reboucle vers l'**entrée** de B3 (pas vers sa sortie `done`). La sortie `done` de B3 doit être la seule à continuer vers la Section C.

**R5 — Reproduis le code JavaScript des Code nodes sans le réécrire.**
Copie-colle le code fourni dans le fichier source pour chaque Code node. Si tu identifies un bug réel dedans, signale-le-moi en clair dans ton rapport plutôt que de le corriger silencieusement — je veux savoir ce qui a changé et pourquoi.

**R6 — Positionne les nœuds sur le canvas de façon lisible.**
Un layout en grille suivant l'ordre logique des sections (A → B → C → D → E → F), espacé d'environ 250px en X et 150px en Y, avec la boucle B3-B4-B5 visuellement identifiable comme un cycle. Pas de nœuds superposés.

### Ce que tu ne dois PAS faire
- Ne propose pas d'alternative technique non sollicitée (pas de Structured Output Parser, pas de nœud Anthropic Chat Model natif — ces choix sont actés et expliqués dans le fichier source, ne les remets pas en question).
- N'ajoute pas de nœuds non prévus dans la spec, même "pour améliorer" — si tu identifies une amélioration pertinente, propose-la séparément dans ton rapport, ne l'intègre pas silencieusement au JSON.

---

## 🎯 MISSION 2 — Vérifier la migration SQL

Le fichier `kredo_n8n_workflow_veille_v1.0.md` contient en préambule une migration proposée (`025_veille_actualite.sql`, tables `veille_digests` et `veille_articles`). Avant toute application :

1. **Vérifie le numéro de fichier réel.** Le projet a un historique de drift de numérotation documenté (fichiers `018`/`019` en doublon, `010_sector_intelligence` absent du dépôt mais présent en remote). Regarde `supabase/migrations/` et détermine le prochain numéro réellement disponible.
2. **Vérifie que les dépendances existent déjà** : la fonction `current_workspace_id()`, la table `workspaces`, l'extension permettant `gen_random_uuid()`. Si l'une manque, signale-le — ne la recrée pas toi-même sans me demander.
3. **Vérifie qu'aucune table `veille_digests` ou `veille_articles` n'existe déjà** (collision de nom).
4. **Corrige le numéro de fichier si besoin**, mais garde le contenu SQL identique sauf si tu identifies une erreur réelle (auquel cas, signale-la explicitement).

⚠️ **Ne pas appliquer cette migration sans validation explicite de ma part**, même si tout est vert. C'est une règle de sécurité du projet : toute migration en prod passe par une confirmation humaine avant exécution.

---

## 📦 Livrables attendus

1. `veille-hebdomadaire-kredo.json` — prêt à importer via n8n → **Import from File**
2. Un court rapport texte listant :
   - Les `typeVersion` utilisés pour chaque type de nœud, et comment tu les as déterminés (vérifiés vs. supposés)
   - Le numéro de fichier de migration retenu et pourquoi
   - Tout écart entre le schéma attendu et le schéma réel constaté
   - Toute anomalie rencontrée dans le code JS des Code nodes (sans les avoir corrigées de ta propre initiative)

---

## ✅ Checklist d'auto-vérification avant de me livrer

- [ ] Les 22 nœuds sont présents, avec les noms exacts du fichier source
- [ ] La boucle B3 → B4 → B5 → (retour B3) est correcte, sortie `done` de B3 vers la Section C uniquement
- [ ] Les nœuds D2 et E2 utilisent `{{ JSON.stringify({...}) }}` comme corps, pas de JSON tapé à la main
- [ ] Aucun ID de credential inventé — champs credentials vides ou nommés génériquement
- [ ] Le JSON s'importe sans erreur de parsing (test toi-même si tu as accès à une instance n8n, sinon valide au minimum la syntaxe JSON)
- [ ] La migration a été vérifiée contre le schéma réel, pas appliquée
- [ ] Le rapport de livraison liste explicitement tout ce qui reste incertain ou à vérifier manuellement par moi
