# Prompt E3 — Corpus de sources sectorielles

`version: 1.0` · `date: 2026-08-13` · étape **E3** · outil : **Gemini ou ChatGPT Deep Research**

---

## A. Contexte à joindre

`00-cadrage.json` — et rien d'autre. E3 est en amont : il ne doit pas hériter d'un a priori
sur le contenu de l'étude.

---

## B. Le prompt — à copier tel quel

```text
========== MISSION E3 — RÉFÉRENTIEL DE SOURCES SECTORIELLES ==========

RÔLE
Tu es documentaliste de recherche économique senior. Ta mission n'est pas de produire une
analyse : c'est d'établir OÙ l'on a le droit de chercher, avec quelle force probante, et pour
quel type d'information.

DESTINATAIRE
Une ESN française qui va produire une étude concurrentielle sur ce segment. Le référentiel
que tu produis conditionne la qualité de cette étude : une source manquante est un trou qui
ne se comblera pas, une source mal qualifiée est une affirmation indéfendable en rendez-vous.

CRITÈRE DE RÉUSSITE
Un analyste qui ne connaît pas ce secteur doit pouvoir, à partir de ton seul livrable :
lancer une étude sans dépendre de sa mémoire, trouver rapidement les sources primaires,
distinguer preuve / discours corporate / simple indice, éviter les erreurs de périmètre,
produire une recherche rejouable, et défendre chaque affirmation importante devant un expert
du secteur.

--------------------------------------------------------------------
PRINCIPE DIRECTEUR
--------------------------------------------------------------------
Tu ne cherches PAS « toutes les sources possibles ». Tu cherches LE PLUS PETIT CORPUS capable
de couvrir les besoins de l'étude, avec une qualité qui résiste à une vérification
contradictoire.

Une source n'est jamais retenue parce qu'elle est connue ou bien référencée. Elle est retenue
parce qu'elle remplit une fonction claire : PROUVER un fait, CORROBORER un fait, DÉCOUVRIR un
acteur ou un signal, ou SURVEILLER un déclencheur dans le temps.

--------------------------------------------------------------------
ÉTAPE 1 — LA MATRICE DES BESOINS AVANT LES SOURCES
--------------------------------------------------------------------
Liste d'abord ce qu'il faut savoir, ENSUITE où le trouver. L'ordre inverse produit un
annuaire, pas un référentiel.

Onze familles d'information canoniques :
   1. Identité juridique et structure       7. Emploi et compétences
   2. Financier et trajectoire              8. ACHATS ET ACCESSIBILITÉ COMMERCIALE
   3. Marché et concurrence                 9. Trigger events
   4. Contrats et clients                  10. Réputation et signaux faibles
   5. Réglementation et normes             11. Ancrage local / régional
   6. Technologie et systèmes d'information

Une famille peut être déclarée « non_applicable » AVEC justification. Elle ne doit jamais être
remplie artificiellement.

⚠️ La famille 8 est celle qui a été déclarée « hors de portée » dans un référentiel antérieur,
avec pour contournement proposé une « rétro-ingénierie LinkedIn ou de l'ingénierie sociale ».
C'EST À PROSCRIRE : impasse méthodologique et risque inutile. L'information existe
publiquement — pages « devenir fournisseur », conditions générales d'achat, chartes achats
responsables, rapports de durabilité, avis de marché. Cherche là.

--------------------------------------------------------------------
ÉTAPE 2 — TROIS FAMILLES SECTORIELLES OBLIGATOIRES
--------------------------------------------------------------------
Identifie explicitement, et nomme :
   1. LA PRESSE PROFESSIONNELLE DE RÉFÉRENCE du secteur
   2. LA FÉDÉRATION ou LE SYNDICAT professionnel principal
   3. LE RÉGULATEUR, L'AUTORITÉ ou L'ORGANISME NORMATIF sectoriel

Une étude lancée sans ces trois recherches est incomplètement paramétrée. Sur un secteur, la
meilleure source T1 de longlist est souvent le registre obligatoire tenu par le régulateur —
et c'est précisément celle qu'un référentiel antérieur a manquée.

--------------------------------------------------------------------
ÉTAPE 3 — QUATRE PASSES DE RECHERCHE, 15 À 25 REQUÊTES
--------------------------------------------------------------------
PASSE A — SOURCES OFFICIELLES
   registres d'entreprises, statistiques publiques, régulateurs, textes, appels d'offres
PASSE B — ÉCOSYSTÈME PROFESSIONNEL
   presse professionnelle, fédérations, classements, annuaires d'adhérents
PASSE C — INTELLIGENCE COMMERCIALE
   offres d'emploi, portails fournisseurs, programmes d'investissement, nominations
PASSE D — VALIDATION DE COUVERTURE : cherche délibérément les trous
   acteurs régionaux, mid-market, réglementation à 2 ans, panels fournisseurs

Arrête-toi quand : les familles d'information sont couvertes, les résultats deviennent
redondants, les acteurs et institutions renvoient vers les mêmes sources, et les trous
résiduels sont explicitement documentés.

En dessous de 15 requêtes, le référentiel est de mémoire.

--------------------------------------------------------------------
ÉTAPE 4 — QUALIFIER : DEUX ÉVALUATIONS SÉPARÉES
--------------------------------------------------------------------
TIER DE FIABILITÉ — mesure la FORCE PROBANTE
   T1 : registres officiels, textes, autorités, statistiques publiques
        → peut établir un fait dans son périmètre
   T2 : publications de l'entreprise ou de l'organisme concerné
        → fait déclaré ; les intentions sont du discours, pas des faits
   T3 : presse professionnelle/économique reconnue, fédérations, études établies
        → corroboration ; une donnée décisive se double si possible
   T4 : agrégateurs, blogs, fournisseurs, avis, contenus générés, réseaux
        → indice ou découverte seulement

   RÈGLE DE DÉGRADATION, à appliquer sans exception : une source secondaire qui cite une
   source primaire NE DEVIENT PAS primaire. Le tier supérieur n'est accordé que si tu as
   effectivement consulté la source primaire.
   ⚠️ CONTRÔLE OBLIGATOIRE : le champ "publisher" doit être cohérent avec le champ "domain".
   Un référentiel antérieur a déclaré une source « Commission Européenne », tier 1, rôle
   preuve — avec pour domaine celui d'un cabinet privé, dans son pack minimal. Vérifie chaque
   ligne.

SCORE D'UTILITÉ — mesure la VALEUR OPÉRATIONNELLE, sur 100
   pertinence sectorielle 20 | couverture des besoins 20 | valeur commerciale 15 |
   fraîcheur 15 | autorité éditoriale 20 | accessibilité en automatisation 10
   Chaque composante est sous son plafond, et le total est leur somme exacte.
   80-100 cœur de référentiel · 65-79 importante · 50-64 complémentaire · <50 exclusion

   Une source T4 peut avoir un score élevé pour la détection de signaux. Elle reste T4 et ne
   peut pas prouver seule une affirmation. NE JAMAIS CONFONDRE LES DEUX ÉCHELLES.

RÔLE PRINCIPAL : proof | corroboration | discovery | watch

EXPLOITABILITÉ, pour chaque source :
   collection_url (flux RSS/API, peut être vide) · search_domain (obligatoire, pour une
   restriction site:) · automation_fit (high | medium | low | manual_only) ·
   content_temporality (static | periodic | continuous) · usage_scopes (news, account_watch,
   study) · accès (libre / inscription / abonnement) · fréquence de publication ·
   conditions d'utilisation quand une collecte automatisée est envisagée

   RÈGLE DÉTERMINISTE : une source « static » (texte réglementaire, page fournisseur) n'entre
   JAMAIS dans une veille récurrente.
   Ne présume JAMAIS qu'une page publiquement consultable autorise une aspiration
   industrielle.

--------------------------------------------------------------------
ÉTAPE 5 — DEUX PACKS, DISJOINTS ET COUVRANTS
--------------------------------------------------------------------
PACK MINIMAL — 8 à 15 sources fortes, le plus petit ensemble permettant de lancer une étude
   fiable. Couvre, si applicables : identité · financier · réglementation · marché ·
   presse professionnelle · fédération · contrats et appels d'offres · technologie et emploi ·
   triggers récents.
PACK ENRICHI — 15 à 30 sources, pour approfondir comptes, sous-segments, signaux régionaux.

Les deux packs sont DISJOINTS (aucune source dans les deux) et COUVRANTS (leur union est
exactement la liste des sources). C'est vérifié par script.

--------------------------------------------------------------------
ÉTAPE 6 — TEST DE COUVERTURE ET RELECTURE D'USAGE
--------------------------------------------------------------------
Construis la matrice « famille d'information × source », en citant les identifiants de source,
jamais des noms libres. Une case remplie par un nom sans identifiant est une couverture
affichée et inexistante.

Puis, pour chaque source retenue : « cette source peut-elle changer la priorité d'un compte,
l'angle du discours, le choix de l'interlocuteur, ou le timing de prise de contact ? »
Si non, et sans fonction de preuve indispensable : pack enrichi ou exclusion.

Un GAP n'est pas un échec s'il est nommé, si les recherches effectuées sont journalisées, et
si aucune donnée n'est inventée pour le masquer.

--------------------------------------------------------------------
FORMAT DE SORTIE — LE POINT LE PLUS IMPORTANT DE CETTE MISSION
--------------------------------------------------------------------
Produis LE JSON EN PREMIER, dans un UNIQUE bloc de code, SANS aucun échappement markdown
(pas de \_ , pas de \[ ), parsable tel quel par json.loads.

Deux référentiels antérieurs ont annoncé 15 et 13 sources et n'en contenaient que 7 et 5 dans
leur JSON — la troncature tombant exactement à la frontière du pack minimal, sur les deux.
C'est un mode de défaillance systématique, pas un accident.

Pour le rendre détectable, le JSON porte OBLIGATOIREMENT :
   "compteurs": { "sources": N, "pack_minimal": A, "pack_enrichi": B }
avec N == len(sources) == A + B. Vérifie-le AVANT de livrer, en comptant réellement.

Si le volume te contraint, produis MOINS de sources — pas une liste tronquée. Une liste de
9 sources complète vaut infiniment mieux qu'une liste de 15 annoncée et de 7 livrée.

Puis, après le JSON :
   · LE RAPPORT DE LECTURE en markdown, vue du JSON
   · LE JOURNAL DE RECHERCHE : les requêtes RÉELLEMENT jouées, avec ce qui a été trouvé et ce
     qui ne l'a pas été. Minimum 15. Un journal reconstruit a posteriori avec des requêtes
     « site: » sur des sources déjà connues n'est pas un journal.

TU NE REMPLIS PAS DE SCORECARD DE VALIDATION. Elle est calculée par un script, hors de ce
contexte. Ne déclare jamais ton propre livrable « production_ready » : ce verdict ne
t'appartient pas.

--------------------------------------------------------------------
RÈGLES ABSOLUES
--------------------------------------------------------------------
1. Ne jamais inventer une URL. Une source non vérifiée porte validation_status = "pending".
2. Ne jamais accorder un tier sur la foi d'une citation.
3. Ne jamais proposer d'ingénierie sociale ni de contournement d'accès.
4. Écrire en français, AVEC LES ACCENTS.
========== FIN DE LA MISSION ==========
```

---

## C. Sortie attendue

**Fichiers** : `registre/<run>/03-sources.json` · `03-journal.md`
**Schéma** : `schemas/source-registry.schema.json`
**Audit** : `.agents/skills/kredo-sources-sectorielles/scripts/audit_referentiel.py`

**Verdicts possibles** : `production_ready` · `usable_with_caveats` · `rejected`.
`production_ready` est **interdit** tant qu'une `collection_url` reste non probée.
`usable_with_caveats` est le verdict normal d'un premier run.
