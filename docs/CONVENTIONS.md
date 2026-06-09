# Conventions du projet

## Base de données

- **Un seul schéma : `public`.** Pas de schéma par brique (voir ADR-0003).
- **Préfixe par domaine** sur chaque table et chaque type énuméré :
  | Préfixe | Domaine |
  |---------|---------|
  | `crm_` | Comptes, contacts, interactions |
  | `sales_` | Opportunités, compétences, événements |
  | `rec_` | Candidats, scoring |
  | `hr_` | Collaborateurs, absences |
  | `del_` | Contrats, missions, facturation |
  | `fin_` | Objectifs, snapshots financiers |
  | `proj_` | Projets, jalons |
  | `kb_` | Offres, rate cards, ressources |
  | `ai_` | Jobs, runs, insights, news |
- **Clés primaires** : `uuid` + `gen_random_uuid()`.
- **Argent** : toujours `numeric`, jamais `float`.
- **Propriété** : chaque table porte `owner_id uuid` + politique RLS `owner_all`.
- **Horodatage** : `created_at` / `updated_at` en `timestamptz`, `updated_at` maintenu par le trigger `set_updated_at()`.
- **Listes fermées** → `enum` préfixé. **Listes évolutives** → `text`.
- **on delete** : `cascade` pour les enfants sans existence propre · `restrict` pour protéger l'historique · `set null` pour les liens optionnels.

## Migrations

- Versionnées dans `supabase/migrations/`, numérotées (`001_`, `002_`, …).
- Une migration = un changement cohérent. On ne modifie jamais une migration déjà appliquée ; on en crée une nouvelle.

## Code

- TypeScript partout.
- Server Components par défaut ; Client Components seulement quand l'interactivité l'exige.
- Pas de secret en dur : tout passe par les variables d'environnement.
- La clé `service_role` ne vit que côté serveur, jamais dans une variable `NEXT_PUBLIC_`.

## Documentation

- **ADR** pour les décisions structurelles (`docs/adr/`).
- **DECISIONS_LOG.md** : une ligne par décision.
- **CHANGELOG.md** : une ligne par action concrète, datée.
