// Usage: node --env-file=.env.local scripts/attach-company-logos.mjs
// Set FORCE_LOGOS=true to re-link companies that already have a logo_path.

import { createClient } from "@supabase/supabase-js"
import { readdir } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ─── Config ─────────────────────────────────────────────────────────────────

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const LOGOS_DIR = join(ROOT, "public/optimized/logos_prospects")
const FORCE = process.env.FORCE_LOGOS === "true"

// Manual overrides: fold(company_name) → logo filename.
// Add entries here when the slug-based matching misses a company.
const MANUAL_MATCHES = {
  "loccitane": "LOccitane.png",
  "l-occitane": "LOccitane.png",
  "chu-nice": "CHU nice.png",
  "chu-de-nice": "CHU nice.png",
  "universite-cote-d-azur": "Logo_universite_cote_azur.png",
  "universite-nice-sophia-antipolis": "universite_nice.png",
  "universite-nice": "universite_nice.png",
  "observatoire-cote-d-azur": "Observatoire-Cote-dAzur.svg.png",
  "observatoire-de-la-cote-d-azur": "Observatoire-Cote-dAzur.svg.png",
  "voyage-prive": "voyage_prive.png",
  "lignes-d-azur": "lignes d azur.png",
  "aeroport-cote-d-azur": "aeroport cote d azur.png",
  "aeroports-de-la-cote-d-azur": "aeroport cote d azur.png",
  "nice-cote-d-azur": "aeroport cote d azur.png",
  "aeroport-nice-cote-d-azur": "aeroport cote d azur.png",
  "banque-populaire-mediterranee": "BPMed.png",
  "bpmed": "BPMed.png",
  "centre-lacassagne": "antoine lacassagne.png",
  "centre-antoine-lacassagne": "antoine lacassagne.png",
  "cnrs-institut-de-la-mer-de-villefranche": "IMEV.png",
  "institut-de-la-mer-de-villefranche": "IMEV.png",
  "imev": "IMEV.png",
  "cnrs-observatoire-cote-d-azur": "Observatoire-Cote-dAzur.svg.png",
  "euro-protection-surveillance": "eps.png",
  "eps": "eps.png",
  "regie-ligne-d-azur": "lignes d azur.png",
  "seqoia-soft": "sequoia.png",
  "sequoia-soft": "sequoia.png",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fold(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

function stripExt(filename) {
  // Handle double extensions like "Observatoire-Cote-dAzur.svg.png"
  return filename.replace(/\.[^.]+$/, "").replace(/\.[^.]+$/, "")
}

// ─── Main ────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

// 1. Load logo files
const allFiles = await readdir(LOGOS_DIR)
const logoFiles = allFiles.filter((f) => /\.(png|jpg|jpeg|svg)$/i.test(f))

// Build slug→filename map (first encounter wins for duplicates like voyage_prive / Voyage_Privé)
const slugToFile = new Map()
for (const file of logoFiles) {
  const slug = fold(stripExt(file))
  if (!slugToFile.has(slug)) slugToFile.set(slug, file)
}

console.log(`\nLogos trouvés : ${logoFiles.length} fichiers → ${slugToFile.size} slugs uniques`)

// 2. Load companies
const { data: companies, error } = await supabase
  .from("companies")
  .select("id, name, metadata")
  .order("name")

if (error) {
  console.error("Erreur Supabase :", error.message)
  process.exit(1)
}
console.log(`Entreprises chargées : ${companies.length}\n`)

// 3. Match
const matched = []
const alreadyLinked = []
const unmatchedCompanies = []
const usedFiles = new Set()

for (const company of companies) {
  const meta = (company.metadata && typeof company.metadata === "object") ? company.metadata : {}
  const existingPath = typeof meta.logo_path === "string" ? meta.logo_path : null

  if (existingPath && !FORCE) {
    alreadyLinked.push({ name: company.name, path: existingPath })
    usedFiles.add(existingPath.split("/").pop())
    continue
  }

  const companySlug = fold(company.name)
  const legalNameSlug = typeof meta.legal_name === "string" ? fold(meta.legal_name) : null

  // Pass 1: manual overrides
  let filename = MANUAL_MATCHES[companySlug] ?? (legalNameSlug ? MANUAL_MATCHES[legalNameSlug] : undefined)

  // Pass 2: exact slug match
  if (!filename) {
    filename = slugToFile.get(companySlug) ?? (legalNameSlug ? slugToFile.get(legalNameSlug) : undefined)
  }

  // Pass 3: partial match (logo slug contains company slug, or vice versa — min 4 chars)
  if (!filename && companySlug.length >= 4) {
    for (const [logoSlug, file] of slugToFile.entries()) {
      if (logoSlug.includes(companySlug) || companySlug.includes(logoSlug)) {
        filename = file
        break
      }
    }
  }

  if (!filename) {
    unmatchedCompanies.push({ name: company.name, slug: companySlug })
    continue
  }

  usedFiles.add(filename)
  const logoPath = `/optimized/logos_prospects/${filename}`

  const { error: updateError } = await supabase
    .from("companies")
    .update({ metadata: { ...meta, logo_path: logoPath } })
    .eq("id", company.id)

  if (updateError) {
    console.error(`  ✗ ${company.name}: ${updateError.message}`)
  } else {
    matched.push({ name: company.name, file: filename })
  }
}

const unusedLogos = logoFiles.filter((f) => !usedFiles.has(f))

// ─── Rapport ─────────────────────────────────────────────────────────────────

console.log("─".repeat(60))
console.log(`✅  Matched       : ${matched.length}`)
matched.forEach((m) => console.log(`    ${m.name} → ${m.file}`))

console.log(`\n⏭️  Déjà liés     : ${alreadyLinked.length} (passer FORCE_LOGOS=true pour forcer)`)
alreadyLinked.forEach((m) => console.log(`    ${m.name} → ${m.path}`))

console.log(`\n❌  Non matchés   : ${unmatchedCompanies.length}`)
unmatchedCompanies.forEach((m) => console.log(`    ${m.name}  [slug: ${m.slug}]`))

console.log(`\n🖼️  Logos inutilisés : ${unusedLogos.length}`)
unusedLogos.forEach((f) => console.log(`    ${f}`))
console.log("─".repeat(60))
