import "server-only"

// ─── Entrée d'une étude : upload signé, extraction, stockage intégral ───────
//
// 1. `createStudyUploadTicket` : après contrôle d'accès au compte, une URL d'upload
//    signée vers `<workspace>/<compte>/<uuid>.pdf`. Le PDF va directement du navigateur
//    au stockage : il ne transite jamais par une fonction Vercel (limite 4,5 Mo).
// 2. `registerStudyFromUpload` : relit le PDF, en extrait le texte intégral de façon
//    déterministe, vérifie l'intégrité, puis enregistre l'étude — original, texte et
//    empreintes. Rien n'est converti à ce stade.

import { createHash, randomUUID } from "node:crypto"

import { reconstructPdfMarkdown } from "../domain/pdf-reconstruction"
import { prepareStudyStructure, type StudyExtractionMeta } from "../domain/prepare-study-structure"
import { STUDY_STORAGE_BUCKET } from "../domain/study-contracts"
import { extractPdfPages } from "./extract-pdf-pages"
import { getStudyServiceClient, loadStudyCompany, requireStudyActor } from "./study-server"

export const MAX_STUDY_FILE_BYTES = 50 * 1024 * 1024

export type StudyUploadTicket = { path: string; token: string }

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

export async function createStudyUploadTicket(input: {
  companyId: string
  fileName: string
  fileBytes: number
}): Promise<StudyUploadTicket> {
  if (!/\.pdf$/i.test(input.fileName)) throw new Error("L'étude doit être un PDF exporté depuis ChatGPT Deep Research.")
  if (!(input.fileBytes > 0) || input.fileBytes > MAX_STUDY_FILE_BYTES) throw new Error("PDF vide ou supérieur à 50 Mo.")

  const actor = await requireStudyActor()
  const company = await loadStudyCompany(actor.supabase, input.companyId)
  if (!company) throw new Error("Compte introuvable dans votre workspace.")

  const path = `${actor.workspaceId}/${company.id}/${randomUUID()}.pdf`
  const { data, error } = await getStudyServiceClient().storage.from(STUDY_STORAGE_BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw new Error(`Impossible de préparer l'envoi du PDF : ${error?.message ?? "réponse vide"}.`)
  return { path: data.path, token: data.token }
}

export type StudyIntakeSummary = {
  studyId: string
  title: string
  pages: number
  chars: number
  blocks: number
  documents: number
  authorities: number
  citations: number
  pdfIntegrity: { identical: boolean; pdfNonWsChars: number; textNonWsChars: number; pageNumbersRemoved: number }
  blocksIntegrity: boolean
  warnings: string[]
}

export async function registerStudyFromUpload(input: {
  companyId: string
  path: string
  fileName: string
  title: string
}): Promise<StudyIntakeSummary> {
  const actor = await requireStudyActor()
  const company = await loadStudyCompany(actor.supabase, input.companyId)
  if (!company) throw new Error("Compte introuvable dans votre workspace.")

  // Le chemin a été choisi par le serveur : il doit rester sous ce workspace et ce compte.
  if (!input.path.startsWith(`${actor.workspaceId}/${company.id}/`) || input.path.includes("..")) {
    throw new Error("Chemin de fichier refusé.")
  }

  const service = getStudyServiceClient()
  const { data: blob, error: downloadError } = await service.storage.from(STUDY_STORAGE_BUCKET).download(input.path)
  if (downloadError || !blob) throw new Error(`PDF introuvable après envoi : ${downloadError?.message ?? "fichier absent"}.`)
  const bytes = new Uint8Array(await blob.arrayBuffer())

  const pages = await extractPdfPages(bytes)
  const reconstruction = reconstructPdfMarkdown(pages)
  if (!reconstruction.markdown.trim()) {
    throw new Error("Aucun texte lisible dans ce PDF (PDF image ?). Exportez l'étude depuis ChatGPT au format PDF.")
  }

  const meta: StudyExtractionMeta = {
    pages: reconstruction.stats.pages,
    pageOffsets: reconstruction.pageOffsets,
    pdf: {
      textItems: reconstruction.stats.textItems,
      links: reconstruction.stats.links,
      linksOnText: reconstruction.stats.linksOnText,
      linksAsMarker: reconstruction.stats.linksAsMarker,
      linksAppended: reconstruction.stats.linksAppended,
      pdfNonWsChars: reconstruction.stats.pdfNonWsChars,
      markdownTextNonWsChars: reconstruction.stats.markdownTextNonWsChars,
      pageNumbersRemoved: reconstruction.stats.pageNumbersRemoved,
      pageNumbersNonWsChars: reconstruction.stats.pageNumbersNonWsChars,
      identical: reconstruction.stats.identical,
    },
  }
  const structure = prepareStudyStructure(reconstruction.markdown, meta)

  const warnings: string[] = []
  if (!reconstruction.stats.identical) warnings.push("Le texte extrait ne correspond pas caractère pour caractère à la couche texte du PDF.")
  if (!structure.integrity.identical) warnings.push("Le découpage en blocs ne restitue pas l'intégralité du texte.")
  if (structure.extraction.sources.length === 0) {
    warnings.push("Aucune URL dans l'étude : utilisez l'export PDF de ChatGPT (l'export Markdown perd la bibliographie).")
  }

  const title = input.title.trim() || input.fileName.replace(/\.pdf$/i, "")
  const { data: row, error: insertError } = await actor.supabase
    .from("account_research_studies")
    .insert({
      company_id: company.id,
      title,
      original_file_path: input.path,
      original_file_name: input.fileName,
      original_file_bytes: bytes.byteLength,
      original_file_sha256: sha256(bytes),
      raw_content: reconstruction.markdown,
      raw_sha256: sha256(reconstruction.markdown),
      raw_chars: reconstruction.markdown.length,
      extraction: meta,
      status: "extracted",
    })
    .select("id")
    .single()
  if (insertError || !row) throw new Error(`Enregistrement de l'étude impossible : ${insertError?.message ?? "réponse vide"}.`)

  return {
    studyId: row.id,
    title,
    pages: meta.pages,
    chars: reconstruction.markdown.length,
    blocks: structure.blocks.length,
    documents: structure.extraction.sources.length,
    authorities: structure.extraction.authorities.length,
    citations: new Set(structure.extraction.sources.flatMap((source) => source.citation_numbers)).size,
    pdfIntegrity: {
      identical: reconstruction.stats.identical,
      pdfNonWsChars: reconstruction.stats.pdfNonWsChars,
      textNonWsChars: reconstruction.stats.markdownTextNonWsChars,
      pageNumbersRemoved: reconstruction.stats.pageNumbersRemoved.length,
    },
    blocksIntegrity: structure.integrity.identical,
    warnings,
  }
}
