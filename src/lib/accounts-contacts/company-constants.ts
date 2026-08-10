/**
 * Normalisations des axes de classification de `companies`.
 *
 * Module pur (aucune dépendance Supabase) — pendant de `contact-constants.ts`.
 * Il existe parce que le vocabulaire affiché et le domaine stocké ont divergé :
 * écrire directement la valeur du select produisait une violation de CHECK à
 * l'enregistrement.
 */

/** Domaine réel de `companies.tier` (CHECK `companies_tier_check`). */
export const COMPANY_TIER_VALUES = ["grand_compte", "eti", "pme"] as const
export type CompanyTier = (typeof COMPANY_TIER_VALUES)[number]

/** Domaine réel de `companies.relation_type` (migration 066 §5.8). */
export const COMPANY_RELATION_TYPE_VALUES = [
  "prospect",
  "client",
  "ancien_client",
  "pair_partenaire",
] as const
export type CompanyRelationType = (typeof COMPANY_RELATION_TYPE_VALUES)[number]

/**
 * CAC40 et « établissement public » se rangent en `grand_compte`, TPE en `pme` :
 * le stockage est plus grossier que le vocabulaire d'affichage historique.
 */
export function normalizeCompanyTier(value: string | null | undefined): CompanyTier | null {
  if (!value) return null
  switch (value.trim().toLowerCase()) {
    case "grand_compte":
    case "cac40":
    case "etablissement_public":
      return "grand_compte"
    case "eti":
      return "eti"
    case "pme":
    case "tpe":
      return "pme"
    default:
      return null
  }
}

/**
 * `partenaire` (libellé UI historique) devient `pair_partenaire`, seule valeur
 * acceptée depuis 066. `lifecycle_status` n'est plus qu'une projection de ce
 * champ, maintenue par trigger : ne jamais l'écrire depuis l'application.
 */
export function normalizeCompanyRelationType(
  value: string | null | undefined
): CompanyRelationType {
  switch (value) {
    case "client":
    case "client_actif":
    case "client_dormant":
      return "client"
    case "ancien_client":
      return "ancien_client"
    case "partenaire":
    case "pair_partenaire":
      return "pair_partenaire"
    case "prospect":
    default:
      return "prospect"
  }
}
