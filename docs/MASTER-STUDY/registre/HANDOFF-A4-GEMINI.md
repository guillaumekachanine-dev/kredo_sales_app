# Handoff A4 — parseur E5 (pour Gemini)

**Tâche** : étendre le parseur de cartographie concurrentielle pour qu'il lise la couche ESN, actuellement perdue *silencieusement* à l'import (aucune erreur levée).

**Le problème, vérifié en base** : le schéma `docs/MASTER-STUDY/schemas/competitive-map.schema.json` (`profil_compte`) définit 6 blocs que le parseur ignore. Résultat : les `competitive_map_entries` du run test pèsent 40-73 octets de `profile_json` au lieu du narratif complet.

**1. `src/features/competitive-map/domain/competitive-map-output.ts`** — 3 constantes ~l. 289-299 à étendre, calquer le style existant (rien de chiffré/sourcé, `account_facts` reste la source des chiffres) :
- `PROFILE_TEXT_KEYS` (`toNullableString`) : ajouter `metier_chaine_valeur`, `maillon`
- `PROFILE_LIST_KEYS` (array non vide) : ajouter `contrats_majeurs`
- `PROFILE_OBJECT_KEYS` (objet non vide) : ajouter `grilles`, `couche_esn`, `traduction_commerciale`
- `couche_esn.ia_annonce_vs_deploye` (dans `grilles`) est **obligatoire** au schéma — le vérifier en amont côté E5, pas ici.

**2. `src/features/competitive-map/domain/present-competitive-map-workspace.ts`** — l'objet `details` ~l. 191-200 projette déjà `proposition_valeur`, `differenciateurs`, `dependances_cles`, `chaine_valeur`, `chantiers_technologiques`, `trigger_events`, `a_ne_pas_dire`, `trous`. Y ajouter les 5 nouvelles clés selon le même patron (`firstText` / `formatProfileValue`).

**3. `src/features/competitive-map/components/CompetitiveActorProfiles.tsx`** (desktop + son pendant mobile) — afficher `couche_esn` et `grilles.ia_annonce_vs_deploye` **en priorité visible**, pas dans un accordéon secondaire : c'est ce qu'un commercial lit 90s avant d'appeler.

**Tests** : `competitive-map-output.test.ts` vérifie la rétrocompatibilité V1 (exports sans ces clés) — ne pas casser, compléter avec des cas V1.1 les couvrant.

**Référence normative** : `docs/MASTER-STUDY/08-ETAPE-E5-CARTOGRAPHIE-COMPTES.md` §8 — en cas de divergence schéma/code, **le code fait foi**. Contexte complet : `docs/MASTER-STUDY/registre/ROADMAP-CORRECTIONS.md` action A4.
