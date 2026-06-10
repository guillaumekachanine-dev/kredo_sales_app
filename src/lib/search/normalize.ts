// Hoisted RegExp — created once, reused across every fold() call.
const DIACRITICS = /\p{Diacritic}/gu

/**
 * Normalize a string for accent- and case-insensitive search.
 * "Société Générale" → "societe generale"
 */
export function fold(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim()
}
