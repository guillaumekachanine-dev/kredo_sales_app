/**
 * CLI d'ingestion Master Study E4 vers la connaissance canonique KREDO.
 *
 * Usage :
 *   tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts \
 *     docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/ [--dry-run | --live]
 *
 * Par défaut : --dry-run (aucune écriture en base).
 * L'écriture réelle exige le flag explicite --live.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve, join } from "node:path"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../src/types/database"
import type { E4SectorKnowledgeOutput } from "../src/features/master-study/domain/e4-contracts"
import { mapE4ToCanon } from "../src/features/master-study/domain/map-e4-to-canon"
import { ingestMasterStudyE4 } from "../src/features/master-study/data/ingest-master-study"

const args = process.argv.slice(2)
const isLive = args.includes("--live")
const isDryRun = args.includes("--dry-run") || !isLive

// Trouver le chemin du répertoire du run
const runDirArg = args.find((a) => !a.startsWith("--"))
if (!runDirArg) {
  console.error("Usage: tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts <run_dir> [--dry-run | --live]")
  process.exit(1)
}

const runDir = resolve(process.cwd(), runDirArg)
if (!existsSync(runDir)) {
  console.error(`Erreur: le répertoire '${runDir}' n'existe pas.`)
  process.exit(1)
}

const e4JsonPath = join(runDir, "04-secteur.json")
if (!existsSync(e4JsonPath)) {
  console.error(`Erreur: livrable E4 '${e4JsonPath}' introuvable.`)
  process.exit(1)
}

const e4MdPath = join(runDir, "04-secteur.md")
const documentText = existsSync(e4MdPath) ? readFileSync(e4MdPath, "utf8") : null

const verdictJsonPath = join(runDir, "07-verdict.json")
let verdictSnapshot: unknown = null
if (existsSync(verdictJsonPath)) {
  try {
    verdictSnapshot = JSON.parse(readFileSync(verdictJsonPath, "utf8"))
  } catch {
    // optional
  }
}

// 1. Lecture et validation structurelle de 04-secteur.json
console.log("═══════════════════════════════════════════════════════════════════════════════")
console.log(" KREDO — Ingestion Master Study E4 (ADR-0021 L3)")
console.log("═══════════════════════════════════════════════════════════════════════════════")
console.log(`Fichier source : ${e4JsonPath}`)
console.log(`Mode           : ${isLive ? "🔴 LIVE (écriture réelle)" : "🟢 DRY-RUN (simulation, aucune écriture)"}`)
console.log("───────────────────────────────────────────────────────────────────────────────")

let e4Data: E4SectorKnowledgeOutput
try {
  e4Data = JSON.parse(readFileSync(e4JsonPath, "utf8")) as E4SectorKnowledgeOutput
} catch (err) {
  console.error("Erreur de parsing JSON:", (err as Error).message)
  process.exit(1)
}

if (!e4Data.meta?.segment_slug) {
  console.error("Erreur: 'meta.segment_slug' absent du livrable E4.")
  process.exit(1)
}

// 2. Connexion Supabase pour résoudre le segment_id
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Erreur: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans l'environnement.")
  process.exit(1)
}

const supabase = createSupabaseClient<Database>(url, key, {
  auth: { persistSession: false },
})

async function run() {
  console.log(`Recherche du segment '${e4Data.meta.segment_slug}' en base...`)
  const { data: segmentRow, error: segmentError } = await supabase
    .from("sector_intelligence")
    .select("id, name, slug, level, workspace_id, resolution_locks")
    .eq("slug", e4Data.meta.segment_slug)
    .maybeSingle()

  if (segmentError) {
    console.error("Erreur Supabase lors de la recherche du segment:", segmentError.message)
    process.exit(1)
  }

  if (!segmentRow) {
    console.error(`Erreur: segment avec le slug '${e4Data.meta.segment_slug}' introuvable dans sector_intelligence.`)
    process.exit(1)
  }

  console.log(`Segment trouvé : ${segmentRow.name} (id: ${segmentRow.id}, level: ${segmentRow.level})`)

  // 3. Transformation E4 -> Canon
  const documentTitle = `Master Study — ${segmentRow.name} — ${e4Data.meta.date_snapshot}`
  const result = mapE4ToCanon(e4Data, {
    segmentId: segmentRow.id,
    documentTitle,
    documentText,
    verdictSnapshot,
  })

  const { payload, meta } = result

  console.log("\n══ COMPTEURS PAR BLOC DE LA CARTE DE LA CONNAISSANCE (01-CARTE) ══════════════")
  console.log(`  S1  Description / Périmètre      : 1 définition (${payload.sector_patch.description?.length ?? 0} caractères)`)
  console.log(`  S1  Caveats                      : ${payload.sector_patch.caveats_patch ? Object.keys(payload.sector_patch.caveats_patch).length : 0} rubriques (hors_champ, regle_comparabilite, incertitudes, trous)`)
  console.log(`  S2  Marché & Verrous             : taille=${payload.sector_patch.market_size_eur_bn ?? "null"} (lock: ${payload.sector_patch.resolution_locks?.market_size_eur_bn ?? "aucun"}), croissance=${payload.sector_patch.market_growth_pct ?? "null"} (lock: ${payload.sector_patch.resolution_locks?.market_growth_pct ?? "aucun"})`)
  console.log(`  S3  Modèles économiques          : ${meta.counts.economicModels} blocs (${(e4Data.blocs_clients ?? []).length} blocs clients + ${(e4Data.modeles_economiques ?? []).length} modèles)`)
  console.log(`  S4  Fronts technologiques        : ${meta.counts.techFronts} fronts`)
  console.log(`  S5  Chronologie / Événements     : ${meta.counts.events} événements (sector_events)`)
  console.log(`  S6  Risques & Opportunités       : ${meta.counts.risks} items`)
  console.log(`  S7  Calendrier réglementaire     : ${meta.counts.regulatoryItems} items pour le segment (${meta.counts.ignoredMacroRegulations} items macro ignorés)`)
  console.log(`  S8  Chaîne de valeur             : ${meta.counts.maillons} maillons amorcés (value_chain_nodes maillon 1..${meta.counts.maillons}, rang=1)`)
  console.log(`  S8  Dépendances critiques        : ${meta.counts.dependancesCritiques} dépendances (playbook.dependances_critiques)`)
  console.log(`  S9  Points de douleur            : ${meta.counts.painPoints} pain points (sector_pain_points)`)
  console.log(`  S10 Personas                     : ${(e4Data.playbook?.personas ?? []).length} personas`)
  console.log(`  S11 Objections                   : ${(e4Data.playbook?.objections ?? []).length} objections`)
  console.log(`  S12 Arguments ROI                : ${(e4Data.playbook?.roi_arguments ?? []).length} arguments ROI`)
  console.log(`  S13 Thèses marché                : ${meta.counts.theses} thèses avec 'donc_commercialement'`)
  console.log(`  S14 Sources                      : ${meta.counts.sources} sources qualifiées`)
  console.log(`      Trous déclarés               : ${meta.counts.trous} trous de données assumés`)

  if (meta.ignoredMacroRegulations.length > 0) {
    console.log("\n══ ITEMS RÉGLEMENTAIRES MACRO IGNORÉS (HORS PÉRIMÈTRE SEGMENT) ══════════════")
    for (const item of meta.ignoredMacroRegulations) {
      console.log(`  · [MACRO] ${item.libelle} (autorité: ${item.authority})`)
    }
  }

  console.log("\n══ VALEURS PAR DÉFAUT ET MAPPINGS APPLIQUÉS ═════════════════════════════════")
  console.log("  · value_chain_nodes.rang                 : forcé à 1 (une ligne par maillon E4)")
  console.log("  · value_chain_nodes.confiance            : 'moyenne'")
  console.log("  · value_chain_nodes.capture_valeur       : NULL (amorce E4, à compléter en E6)")
  console.log("  · sector_events.event_type               : 'market'")
  console.log("  · sector_events.status                   : 'pending'")
  console.log("  · sector_regulatory_items.is_commercial_window : false")
  console.log("  · sector_regulatory_items.urgency        : 'medium'")
  console.log("  · kredo_practice                         : traduit via mapOfferPracticeToKredoPractice()")

  if (isDryRun) {
    console.log("\n═══════════════════════════════════════════════════════════════════════════════")
    console.log(" ✅ SIMULATION RÉUSSIE : Payload validé et prêt pour l'ingestion RPC.")
    console.log(" 🔒 Aucune écriture en base n'a été effectuée (--dry-run).")
    console.log("═══════════════════════════════════════════════════════════════════════════════\n")
    return
  }

  // Mode --live : appel effectif de la RPC
  console.log("\nAppel de la RPC public.ingest_master_study_e4...")
  const ingestResult = await ingestMasterStudyE4(payload, { supabase })

  if (!ingestResult.success) {
    console.error(`\n❌ ÉCHEC DE L'INGESTION : ${ingestResult.error}`)
    process.exit(1)
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════")
  console.log(" 🎉 INGESTION RÉUSSIE !")
  console.log(` · Run ID      : ${ingestResult.runId}`)
  console.log(` · Document ID : ${ingestResult.documentId}`)
  console.log(` · Segment ID  : ${ingestResult.segmentId}`)
  console.log("═══════════════════════════════════════════════════════════════════════════════\n")
}

run().catch((err) => {
  console.error("Erreur inattendue :", err)
  process.exit(1)
})
