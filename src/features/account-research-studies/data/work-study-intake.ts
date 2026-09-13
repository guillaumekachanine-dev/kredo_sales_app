import "server-only"

// ─── Intake ChatGPT Work : tickets signés, validation serveur & persistance ────
//
// Gère l'acquisition directe du bundle de 2 JSON ChatGPT Work :
// 1. `createWorkStudyUploadTickets` : vérification des accès et création des 2 URL
//    d'upload signées pour les deux fichiers JSON.
// 2. `registerWorkStudyFromUpload` : relecture des deux JSON depuis le stockage,
//    discrimination structurelle des rôles (AI vs Corpus), validation croisée du bundle,
//    adaptation déterministe en AccountStudyKnowledge, et enregistrement direct au
//    statut 'ready' avec conservation intégrale des originaux.

import { createHash, randomUUID } from "node:crypto"

import type { Json } from "@/types/database"

import { STUDY_STORAGE_BUCKET } from "../domain/study-contracts"
import { validateStudyKnowledge } from "../domain/validate-study-knowledge"
import { adaptWorkStudyToKnowledge } from "../domain/work-study-adapter"
import {
  checkCompanyIdentityMatch,
  detectWorkBundleRoles,
} from "../domain/work-study-detection"
import { validateWorkStudyBundle } from "../domain/work-study-parser"
import { MAX_STUDY_FILE_BYTES } from "./study-intake"
import { getStudyServiceClient, loadStudyCompany, requireStudyActor } from "./study-server"

export type WorkStudyUploadFileInput = {
  fileName: string
  fileBytes: number
}

export type WorkStudyUploadTicket = {
  slot: "file_0" | "file_1"
  fileName: string
  path: string
  token: string
}

export type WorkStudyUploadTicketsResult = {
  bundleId: string
  tickets: [WorkStudyUploadTicket, WorkStudyUploadTicket]
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

/**
 * Prépare les 2 tickets d'upload signés pour le bundle JSON ChatGPT Work.
 * Ne fait confiance à aucun chemin fourni par le client.
 */
export async function createWorkStudyUploadTickets(input: {
  companyId: string
  files: [WorkStudyUploadFileInput, WorkStudyUploadFileInput]
}): Promise<WorkStudyUploadTicketsResult> {
  const { companyId, files } = input
  if (!files || files.length !== 2) {
    throw new Error("Le bundle ChatGPT Work doit comporter exactement 2 fichiers.")
  }

  for (let i = 0; i < 2; i++) {
    const f = files[i]
    if (!/\.json$/i.test(f.fileName)) {
      throw new Error(`Le fichier "${f.fileName}" doit être un document JSON (.json).`)
    }
    if (!(f.fileBytes > 0) || f.fileBytes > MAX_STUDY_FILE_BYTES) {
      throw new Error(`Le fichier "${f.fileName}" est vide ou dépasse la limite de 50 Mo.`)
    }
  }

  const actor = await requireStudyActor()
  const company = await loadStudyCompany(actor.supabase, companyId)
  if (!company) throw new Error("Compte introuvable dans votre workspace.")

  const bundleId = randomUUID()
  const service = getStudyServiceClient()

  const path0 = `${actor.workspaceId}/${company.id}/${bundleId}/upload-0.json`
  const path1 = `${actor.workspaceId}/${company.id}/${bundleId}/upload-1.json`

  const [res0, res1] = await Promise.all([
    service.storage.from(STUDY_STORAGE_BUCKET).createSignedUploadUrl(path0),
    service.storage.from(STUDY_STORAGE_BUCKET).createSignedUploadUrl(path1),
  ])

  if (res0.error || !res0.data) {
    throw new Error(`Impossible de préparer l'upload du premier fichier : ${res0.error?.message ?? "erreur inconnue"}`)
  }
  if (res1.error || !res1.data) {
    throw new Error(`Impossible de préparer l'upload du second fichier : ${res1.error?.message ?? "erreur inconnue"}`)
  }

  return {
    bundleId,
    tickets: [
      { slot: "file_0", fileName: files[0].fileName, path: res0.data.path, token: res0.data.token },
      { slot: "file_1", fileName: files[1].fileName, path: res1.data.path, token: res1.data.token },
    ],
  }
}

export type RegisterWorkStudyInput = {
  companyId: string
  bundleId: string
  title?: string
  files: [
    { path: string; originalFileName: string },
    { path: string; originalFileName: string },
  ]
}

export type RegisterWorkStudyResult = {
  studyId: string
  title: string
  sections: number
  statements: number
  gaps: number
  documents: number
  authorities: number
}

/**
 * Enregistre et valide le bundle ChatGPT Work une fois uploadé dans le bucket.
 * Détecte les rôles de façon structurelle côté serveur, effectue l'adaptation
 * canonique, persiste l'étude prête à vérifier et nettoie en cas d'échec.
 */
export async function registerWorkStudyFromUpload(
  input: RegisterWorkStudyInput,
): Promise<RegisterWorkStudyResult> {
  const actor = await requireStudyActor()
  const company = await loadStudyCompany(actor.supabase, input.companyId)
  if (!company) throw new Error("Compte introuvable dans votre workspace.")

  const expectedPrefix = `${actor.workspaceId}/${company.id}/${input.bundleId}/`
  for (const f of input.files) {
    if (!f.path.startsWith(expectedPrefix) || f.path.includes("..")) {
      throw new Error("Chemin de fichier non autorisé.")
    }
  }

  const service = getStudyServiceClient()
  const uploadedPaths = input.files.map((f) => f.path)

  // Best-effort cleanup helper en cas d'échec de l'intake
  const cleanupStorage = async (pathsToRemove: string[]) => {
    try {
      if (pathsToRemove.length > 0) {
        await service.storage.from(STUDY_STORAGE_BUCKET).remove(pathsToRemove)
      }
    } catch (cleanupErr) {
      console.warn("[work-study-intake] Nettoyage Storage best-effort échoué :", cleanupErr)
    }
  }

  try {
    // 1. Téléchargement des 2 fichiers depuis Storage
    const [blob0Res, blob1Res] = await Promise.all([
      service.storage.from(STUDY_STORAGE_BUCKET).download(input.files[0].path),
      service.storage.from(STUDY_STORAGE_BUCKET).download(input.files[1].path),
    ])

    if (blob0Res.error || !blob0Res.data) {
      throw new Error(`Premier fichier introuvable après envoi : ${blob0Res.error?.message ?? "fichier absent"}`)
    }
    if (blob1Res.error || !blob1Res.data) {
      throw new Error(`Second fichier introuvable après envoi : ${blob1Res.error?.message ?? "fichier absent"}`)
    }

    const bytes0 = new Uint8Array(await blob0Res.data.arrayBuffer())
    const bytes1 = new Uint8Array(await blob1Res.data.arrayBuffer())

    const text0 = new TextDecoder("utf-8").decode(bytes0)
    const text1 = new TextDecoder("utf-8").decode(bytes1)

    // 2. Détection automatique des rôles par la structure
    const detected = detectWorkBundleRoles(text0, text1)
    if (!detected.ok) {
      throw new Error(detected.error)
    }

    const aiIsFirst = detected.accountIntelligence.slot === "file_a"
    const aiBytes = aiIsFirst ? bytes0 : bytes1
    const aiOriginalFileName = aiIsFirst ? input.files[0].originalFileName : input.files[1].originalFileName
    const aiUploadedPath = aiIsFirst ? input.files[0].path : input.files[1].path
    const aiData = detected.accountIntelligence.data

    const corpusBytes = aiIsFirst ? bytes1 : bytes0
    const corpusOriginalFileName = aiIsFirst ? input.files[1].originalFileName : input.files[0].originalFileName
    const corpusUploadedPath = aiIsFirst ? input.files[1].path : input.files[0].path
    const corpusData = detected.sourceCorpus.data

    // 3. Validation croisée du bundle
    const bundleCheck = validateWorkStudyBundle(aiData, corpusData)
    if (!bundleCheck.ok) {
      const issueSummary = bundleCheck.issues.map((i) => i.message).join(" · ")
      throw new Error(`Validation croisée du bundle Work échouée : ${issueSummary}`)
    }

    // 4. Contrôle de cohérence d'identité entre l'étude et le compte Kredo
    const detectedCompanyName = aiData.entity_resolution.legal_name || corpusData.corpus.account_name
    if (detectedCompanyName) {
      const identityCheck = checkCompanyIdentityMatch(company.name, detectedCompanyName)
      if (!identityCheck.match) {
        throw new Error(identityCheck.reason ?? "Incohérence entre l'entreprise de l'étude et le compte Kredo.")
      }
    }

    // 5. Organisation des chemins finaux dans Storage
    const finalAiPath = `${expectedPrefix}account-intelligence.json`
    const finalCorpusPath = `${expectedPrefix}source-corpus.json`

    // Déplacement vers les chemins canoniques recommandés
    if (aiUploadedPath !== finalAiPath) {
      const { error: moveAiErr } = await service.storage.from(STUDY_STORAGE_BUCKET).move(aiUploadedPath, finalAiPath)
      if (moveAiErr) {
        console.warn("[work-study-intake] Renommage account-intelligence.json impossible, chemin conservé :", moveAiErr)
      }
    }
    if (corpusUploadedPath !== finalCorpusPath) {
      const { error: moveCorpusErr } = await service.storage.from(STUDY_STORAGE_BUCKET).move(corpusUploadedPath, finalCorpusPath)
      if (moveCorpusErr) {
        console.warn("[work-study-intake] Renommage source-corpus.json impossible, chemin conservé :", moveCorpusErr)
      }
    }

    const activeAiPath = (aiUploadedPath !== finalAiPath) ? finalAiPath : aiUploadedPath
    const activeCorpusPath = (corpusUploadedPath !== finalCorpusPath) ? finalCorpusPath : corpusUploadedPath

    // 6. Adaptation déterministe en AccountStudyKnowledge
    const studyId = randomUUID()
    const title = input.title?.trim() || aiOriginalFileName.replace(/\.json$/i, "")

    const adapted = adaptWorkStudyToKnowledge({
      accountIntelligence: aiData,
      sourceCorpus: corpusData,
      context: {
        studyId,
        companyId: company.id,
        companyName: company.name,
        title,
        fileName: aiOriginalFileName,
        segmentSlug: company.segmentSlug,
        segmentName: company.segmentName,
      },
    })

    // 7. Validation des briques produites et intégrité
    const knowledgeCheck = validateStudyKnowledge(adapted.knowledge)
    if (!knowledgeCheck.ok) {
      throw new Error(`Briques de connaissance invalides : ${knowledgeCheck.issues.join(" · ")}`)
    }

    if (!adapted.knowledge.coverage.text.identical) {
      throw new Error("L'intégrité du texte source Work n'a pas pu être démontrée caractère par caractère.")
    }

    // 8. Insertion dans account_research_studies au statut 'ready'
    const { error: insertError } = await actor.supabase
      .from("account_research_studies")
      .insert({
        id: studyId,
        workspace_id: actor.workspaceId,
        company_id: company.id,
        created_by: actor.userId,
        title,
        producer: "chatgpt_work",
        status: "ready",
        original_file_path: activeAiPath,
        original_file_name: aiOriginalFileName,
        original_file_bytes: aiBytes.byteLength,
        original_file_sha256: sha256(aiBytes),
        raw_content: adapted.rawContent,
        raw_sha256: sha256(adapted.rawContent),
        raw_chars: adapted.rawContent.length,
        knowledge_json: adapted.knowledge as unknown as Json,
        sources_registry_json: adapted.registry as unknown as Json,
        coverage: adapted.knowledge.coverage as unknown as Json,
        extraction: {
          mode: "chatgpt_work_bundle",
          source_corpus: {
            path: activeCorpusPath,
            file_name: corpusOriginalFileName,
            bytes: corpusBytes.byteLength,
            sha256: sha256(corpusBytes),
          },
        } as unknown as Json,
        conversion: {
          mode: "deterministic_work_adapter",
          adapter_version: 1,
          completed_at: new Date().toISOString(),
        } as unknown as Json,
      })

    if (insertError) {
      throw new Error(`Enregistrement de l'étude Work impossible : ${insertError.message}`)
    }

    return {
      studyId,
      title,
      sections: aiData.sections.length,
      statements: adapted.knowledge.statements.length,
      gaps: aiData.knowledge_gaps.length,
      documents: adapted.knowledge.sources.length,
      authorities: corpusData.sources.length,
    }
  } catch (error) {
    // Nettoyage Storage sur échec
    await cleanupStorage(uploadedPaths)
    await cleanupStorage([
      `${expectedPrefix}account-intelligence.json`,
      `${expectedPrefix}source-corpus.json`,
    ])
    throw error
  }
}
