export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

export function getCompanyLogoSlug(name: string): string {
  return fold(name)
}

export function getLogoPublicPath(filename: string): string {
  return `/optimized/logos_prospects/${filename}`
}
