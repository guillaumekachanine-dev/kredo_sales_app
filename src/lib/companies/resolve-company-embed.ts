import type { Json } from "@/types/database"

/**
 * Forme minimale d'un embed `companies` renvoyé par PostgREST.
 * Selon la requête, seul `name` est garanti ; `website`/`metadata` sont optionnels.
 * L'embed peut arriver en objet unique OU en tableau (relation 1-N ambiguë côté PostgREST).
 */
export interface CompanyEmbedLike {
  id?: string | null
  name?: string | null
  website?: string | null
  /**
   * Colonne générée `companies.meta_logo_path` (migration 060). À privilégier :
   * `metadata` pèse 14 Ko en moyenne et n'était tiré que pour ce chemin.
   */
  meta_logo_path?: string | null
  /** Repli pour les appelants qui sélectionnent encore le blob complet. */
  metadata?: Json | null
}

export interface ResolvedCompanyEmbed {
  id: string | null
  name: string
  website: string | null
  logoPath: string | null
}

const FALLBACK_COMPANY_NAME = "Compte non renseigné"

function pickRecord(
  companies: CompanyEmbedLike | CompanyEmbedLike[] | null | undefined,
): CompanyEmbedLike | null {
  if (!companies) return null
  if (Array.isArray(companies)) return companies[0] ?? null
  return companies
}

function extractLogoPath(metadata: Json | null | undefined): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const logoPath = (metadata as Record<string, unknown>).logo_path
  return typeof logoPath === "string" ? logoPath : null
}

/**
 * Résout de façon uniforme le nom, le site et le chemin logo d'un embed `companies`,
 * qu'il soit renvoyé en objet ou en tableau. Remplace les copies dupliquées
 * de `getCompanyName` + extraction `logo_path` dispersées dans la couche data.
 */
export function resolveCompanyEmbed(
  companies: CompanyEmbedLike | CompanyEmbedLike[] | null | undefined,
): ResolvedCompanyEmbed {
  const record = pickRecord(companies)
  return {
    id: record?.id ?? null,
    name: record?.name ?? FALLBACK_COMPANY_NAME,
    website: record?.website ?? null,
    logoPath: record?.meta_logo_path ?? extractLogoPath(record?.metadata),
  }
}

/** Variante nom seul, pour les requêtes qui ne sélectionnent que `companies(name)`. */
export function resolveCompanyName(
  companies: CompanyEmbedLike | CompanyEmbedLike[] | null | undefined,
): string {
  return pickRecord(companies)?.name ?? FALLBACK_COMPANY_NAME
}
