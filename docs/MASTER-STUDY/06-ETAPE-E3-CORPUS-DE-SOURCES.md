# E3 — Corpus de sources

> **Cette étape amont détermine la qualité du livrable final.** Elle ne cherche pas « toutes
> les sources possibles » : elle cherche le **plus petit corpus capable de couvrir les besoins
> de l'étude**, avec une qualité qui résiste à une vérification contradictoire.

---

## 1. Axiomes

- **Le tier mesure la force probante ; le score d'utilité mesure la valeur opérationnelle.
  Ne jamais les confondre.** Une source T4 peut être excellente pour découvrir un signal et
  incapable de fonder seule une affirmation décisive.
- **Règle de dégradation** : une source secondaire qui cite une source primaire ne devient pas
  primaire. Le tier supérieur n'est accordé que si la source primaire a été **effectivement
  consultée**.
- **Une source n'est jamais retenue parce qu'elle est connue.** Elle est retenue parce qu'elle
  remplit une fonction : `proof`, `corroboration`, `discovery` ou `watch`.
- **Le producteur n'est pas son propre jury** (A10). La scorecard 24 critères s'exécute hors du
  contexte de production.
- **Le livrable est un JSON parsable** (A9), sorti du markdown, avec l'invariant
  `len(sources) == len(pack_minimal ∪ pack_enrichi)`.
- **Trois familles sectorielles sont obligatoires** : la presse professionnelle de référence,
  la fédération ou le syndicat principal, le régulateur ou l'organisme normatif. Une étude
  lancée sans ces trois recherches est incomplètement paramétrée.

---

## 2. Moyens employés

| | |
|---|---|
| **Opérateur de recherche** | **Guillaume, dans Gemini Deep Research ou ChatGPT Deep Research** — l'accès web profond et le temps long |
| **Opérateur de contrôle** | Claude Code : normalisation, audit, notation. **Le contrôle ne s'exécute jamais dans le contexte qui a produit** |
| **Prompt** | `prompts/E3-corpus-sources.md` — autonome, aucune improvisation |
| **Standard normatif délégué** | `sources_intelligence_standards/` fichiers `01_`, `02_`, `04_`→`08_` |
| **Budget** | **15 à 25 requêtes distinctes.** En dessous, le référentiel est de mémoire |
| **Durée** | 1 à 2 h de recherche, 45 min de contrôle |

**Ce document ne recopie ni la grille des tiers, ni le barème /100, ni les 24 critères de la
scorecard.** Ils vivent dans le standard, qui fait autorité sur eux. E3 dit quand les ouvrir et
ce qu'il en attend.

---

## 3. Origine de l'information

Quatre passes de recherche, dans cet ordre — la découverte se fait par passes, jamais par
requête unique.

| Passe | Objet | Ce qu'elle trouve |
|---|---|---|
| **A — Officielle** | Registres, statistiques, régulateurs, textes, appels d'offres, autorités | Le socle T1 |
| **B — Écosystème professionnel** | Presse professionnelle, fédérations, classements, annuaires d'adhérents | La longlist et les acteurs de la queue de distribution |
| **C — Intelligence commerciale** | Offres d'emploi, portails fournisseurs, programmes d'investissement, nominations | La matière Q2 et Q4 |
| **D — Validation de couverture** | Recherche délibérée des trous : acteurs régionaux, mid-market, réglementation 2027 | Ce qui manque, nommé |

**Onze familles d'information canoniques** à couvrir (standard `01_` §5) : identité juridique ·
financier · marché & concurrence · contrats & clients · réglementation · technologie & SI ·
emploi & compétences · **achats & accessibilité** · trigger events · réputation · ancrage
régional. Une famille peut être `non_applicable` **avec justification** ; elle n'est jamais
remplie artificiellement.

---

## 4. Méthode

### 4.1 Le déroulé

1. **Cadrage** — les 9 paramètres du standard `01_` §4, repris de E0. Guillaume valide le
   périmètre : *un périmètre faux invalide 25 requêtes*.
2. **Matrice des besoins** — quelles informations avant quelles sources. Ce sens est
   important : chercher des sources avant d'avoir listé les besoins produit un annuaire.
3. **Quatre passes** (§3), 15 à 25 requêtes, journalisées en temps réel.
4. **Qualification** — tier T1-T4 **et** score d'utilité /100, séparément, par source.
5. **Rôle explicite** — `proof` / `corroboration` / `discovery` / `watch`, un rôle principal
   déclaré.
6. **Automatisabilité** — `automation_fit` ∈ `high|medium|low|manual_only`, plus
   `collection_url`, `search_domain`, RSS/API/open data, robots et CGU.
   *Le référentiel ne présume jamais qu'une page publiquement consultable autorise une
   aspiration industrielle.*
7. **Deux packs** — minimal (8 à 15 sources fortes) et enrichi (15 à 30). **Disjoints et
   couvrants.**
8. **Test de couverture** — matrice `famille_information × source`. Un gap n'est pas un échec
   s'il est nommé, journalisé, et non masqué par une invention.
9. **Relecture orientée usage** — *« cette source peut-elle changer la priorité d'un compte,
   l'angle du discours, le choix de l'interlocuteur ou le timing ? »* Si non et sans fonction
   de preuve : pack enrichi ou exclusion.

### 4.2 Les trois correctifs obligatoires

Ils viennent de l'audit des deux premiers référentiels (Tourisme, Électronique B2B) et sont
intégrés au prompt :

| Défaut observé | Correctif imposé |
|---|---|
| **E1 — Auto-notation.** Un référentiel s'est déclaré `production_ready` sur 12 critères tous validés, dont « passe red team exécutée », avec un journal de **5 requêtes** | La scorecard n'est plus dans le livrable du producteur. Elle est calculée par `scripts/audit_referentiel.py` (G1) |
| **E2 — `OFFRE_ESN` mal amorcé.** L'offre décrite était la stack de l'application KREDO, pas le catalogue de l'ESN (8 practices, 41 offres en base) | `OFFRE_KREDO` est **lu en base** en E0 et injecté ; jamais saisi |
| **E3 — L'accessibilité déclarée hors de portée**, avec « rétro-ingénierie LinkedIn ou ingénierie sociale » proposée en contournement | **Retiré.** L'accessibilité est un travail d'acquisition (E2 + E5 §4.3), pas de rédaction. L'ingénierie sociale est une impasse méthodologique et un risque inutile |

### 4.3 Le mode de défaillance à surveiller

Les deux référentiels produits annoncent 15 et 13 sources ; leurs JSON en contiennent **7 et
5**. La troncature tombe **exactement à la frontière du pack minimal**, sur les deux — les
objets présents sont exactement le `minimum_pack`, les manquants exactement l'`extended_pack`.
Ce n'est pas un accident, c'est un **mode de défaillance systématique du générateur**.

S'y ajoutent, non détectés à la lecture : un JSON non parsable (échappements markdown), un
score dépassant son plafond (`automation_access = 15` pour un maximum de 10), et surtout un
**blanchiment de tier** — une source déclarée « Commission Européenne », tier 1, rôle `proof`,
dont le domaine est celui d'un cabinet privé, **dans le pack minimal d'un livrable
`production_ready`**.

**Conséquences opérationnelles, non négociables** :
- Le JSON sort du markdown : fichier `.json` versionné à côté, ou NDJSON (un objet par ligne).
- `len(sources) == len(minimum_pack) + len(extended_pack)` est vérifié par script.
- `publisher` doit être cohérent avec `domain`. Un écart = dégradation automatique du tier.
- ✅ **Gel levé le 14/08/2026.** Le générateur — un modèle, pas du code — tronquera encore ;
  ce qui a changé, c'est que sa troncature n'est plus silencieuse. `check_packs` de
  `scripts/audit-master-study.py` contrôle que chaque `src_id` de `pack_minimal` et
  `pack_enrichi` résout dans `sources[]`, que les deux packs sont disjoints et couvrants, que
  le champ `pack` de chaque source concorde avec les listes, et que les trois familles
  obligatoires pointent un `src_id` réel. Une coupure à la frontière du pack minimal laisse
  des identifiants orphelins : elle est désormais un FAIL bloquant, pas un silence.
  **Le gel portait sur l'invisibilité du défaut, pas sur le défaut lui-même.** Produire,
  passer G1, régénérer si le gate refuse — c'est une boucle, et elle fonctionne.

---

## 5. Articulation logique

**Amont** : E0 (paramètres), E2 (le socle connaît déjà les régulateurs et les registres).
**Aval** : E4 et E5, qui n'ont le droit de citer que des sources du corpus, plus celles
découvertes en cours de route et ajoutées au registre.

**Ce que E3 débloque** : la traçabilité. Sans registre, une affirmation en rendez-vous n'est
pas défendable — et le point 5 du test final (« ouvrir la source ») échoue.

**Ce que E3 ne débloque pas** : la connaissance elle-même. Un excellent registre de sources
n'est pas une étude. C'est l'erreur de séquencement à éviter — E3 est court, E4 est long.

---

## 6. Frontière avec la configuration de veille

**Il faut distinguer deux objets que le mot « source » confond.**

| Objet | Question | Table |
|---|---|---|
| **Où l'on peut chercher** — une autorité qualifiée, réutilisable, éditable | « ce corpus est-il bon ? » | Tables de configuration dédiées |
| **Ce qu'on a effectivement trouvé** — une preuve attachée à un fait | « d'où sort ce chiffre ? » | `intelligence_sources` + `intelligence_source_links` |

`intelligence_sources` compte **450 lignes au 13/08**, dont la grande majorité pointe sur
`news.google.com` avec une `source_key` de dédoublonnage d'article. Ce n'est pas un registre de
sources : **c'est un journal de collecte**, et sa RLS ne porte qu'une policy `SELECT` — il est
structurellement inéditable.

**Décision de ce corpus** : la décision antérieure « pas de table dédiée » tient pour la
**preuve** (`intelligence_sources.technical_metadata` porte tier, rôle, score, `automation_fit`)
et **ne tient pas pour la configuration**. Un corpus réutilisable est une entité de premier
rang, versionnée et qualifiée.

Trois précautions, toutes issues de l'audit du 13/08 :

1. **La provenance doit être résolue avant écriture.** Google News RSS expose l'éditeur réel
   dans `<source url="…">` ; à défaut, déballer le paramètre `url=` du lien de redirection.
   Sans cette étape, qualifier une autorité en T3 `corroboration` n'a **aucun effet
   vérifiable** — la preuve en base porte `news.google.com`, et tout l'appareil tier/score
   reste infalsifiable.
2. **Un corpus qui n'atteint pas le collecteur ne sert à rien.** Le workflow de veille tronque
   ses candidats par `slice(0, 40)` — une troncature **positionnelle** : les 4 digests produits
   sont tous à 40/40 candidats avec 14 sources, donc les dernières sources du tableau ne
   contribuent déjà rien. Ajouter 15 sources produirait **exactement zéro candidat
   supplémentaire**, de façon déterministe et silencieuse. Le correctif est un **quota par
   source + entrelacement round-robin**, à livrer avant toute extension de corpus.
3. **On branche avant de peindre.** Le premier consommateur d'un corpus doit être un workflow,
   pas une interface d'édition.

> Ceci amende `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §9.3/§9.4. Un amendement de décision
> écrite se grave dans un ADR, pas dans une note — voir `13-GOUVERNANCE.md` §4.

---

## 7. Contrôle qualité

| Gate | Exécutant | Contrôle | Bloquant |
|---|---|---|---|
| **Parsabilité** | `json.loads` | Le fichier `.json` charge | Oui |
| **Complétude** | script | `len(sources) == len(min ∪ ext)`, packs disjoints et couvrants | Oui |
| **Arithmétique** | script | Chaque `utility_score` = somme de ses composantes, chaque composante sous son plafond | Oui |
| **Cohérence éditeur** | script | `publisher` cohérent avec `domain` ; sinon dégradation de tier | Oui |
| **Trois familles obligatoires** | script | Presse pro · fédération · régulateur, chacune avec au moins une source | Oui |
| **Journal** | script | ≥ 15 requêtes distinctes, non reconstruites a posteriori | Oui |
| **Scorecard 24 critères** | `scripts/audit_referentiel.py`, hors contexte producteur | Standard `07_` | Oui |

**Verdict possible** : `production_ready` · `usable_with_caveats` · `rejected`.
**`production_ready` est interdit tant qu'une `collection_url` reste non probée.** Les deux
référentiels existants sont, recalculés honnêtement, `usable_with_caveats`.

---

## 8. Livrables et formalisme

| Livrable | Forme | Emplacement |
|---|---|---|
| Registre de sources | **`.json` validé** contre `schemas/source-registry.schema.json` | `registre/<run>/03-sources.json` |
| Journal de recherche | Markdown horodaté, requêtes réellement jouées | `registre/<run>/03-journal.md` |
| Rapport de scorecard | Sortie du script, non éditable à la main | `registre/<run>/03-scorecard.txt` |
| Persistance | `intelligence_sources.technical_metadata` + `intelligence_source_links` (`entity_type='sector'`) | Supabase |

Chaque source porte au minimum : `src_id` · `publisher` · `domain` · `url` · `tier` ·
`primary_role` · `utility_score` + détail · `automation_fit` · `collection_url` (nullable) ·
`search_domain` · `content_temporality` · `usage_scopes` · `pack` · `atteste` ·
`consulted_at` · `validation_status`.

**Règle déterministe gratuite** : une source `content_temporality = 'static'` (un texte
réglementaire, une page « devenir fournisseur ») n'entre **jamais** dans une veille récurrente.
Testable, sans coût, et évite de faire tourner un LLM sur du contenu qui ne change pas.
