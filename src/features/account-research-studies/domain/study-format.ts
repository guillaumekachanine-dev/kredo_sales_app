// ─── Formatages d'affichage partagés — module pur ───────────────────────────

export function formatSiren(siren: string): string {
  const digits = siren.replace(/\s+/g, "")
  return /^\d{9}$/.test(digits) ? digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : siren
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`
}
