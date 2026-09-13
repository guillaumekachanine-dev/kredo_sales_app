"use server"

import "server-only"

// ─── Server Actions — études de recherche compte ────────────────────────────
// Chaque action ré-authentifie (via `requireStudyActor`, appelé par la couche data) :
// une Server Action est une route publique, jamais une fonction de confiance.
// Les erreurs sont rendues en valeur, pas levées : le navigateur reçoit un message
// lisible plutôt qu'une trace de pile masquée par Next en production.

import {
  createStudyUploadTicket,
  registerStudyFromUpload,
  type StudyIntakeSummary,
  type StudyUploadTicket,
} from "../data/study-intake"
import {
  createWorkStudyUploadTickets,
  registerWorkStudyFromUpload,
  type RegisterWorkStudyInput,
  type RegisterWorkStudyResult,
  type WorkStudyUploadFileInput,
  type WorkStudyUploadTicketsResult,
} from "../data/work-study-intake"
import {
  getStudyConversionProgress,
  publishStudy,
  startStudyConversion,
  type StudyConversionProgress,
} from "../data/study-conversion"
import { getStudyOriginalUrl, readStudyFile, type StudyFileKind } from "../data/study-read"

export type StudyActionResult<T> = { ok: true; value: T } | { ok: false; error: string }

async function run<T>(operation: () => Promise<T>): Promise<StudyActionResult<T>> {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur inattendue." }
  }
}

export async function requestStudyUploadAction(input: {
  companyId: string
  fileName: string
  fileBytes: number
}): Promise<StudyActionResult<StudyUploadTicket>> {
  return run(() => createStudyUploadTicket(input))
}

export async function registerStudyAction(input: {
  companyId: string
  path: string
  fileName: string
  title: string
}): Promise<StudyActionResult<StudyIntakeSummary>> {
  return run(() => registerStudyFromUpload(input))
}

export async function startStudyConversionAction(studyId: string): Promise<StudyActionResult<{ attempt: number; parts: number }>> {
  return run(() => startStudyConversion(studyId))
}

export async function getStudyProgressAction(studyId: string): Promise<StudyActionResult<StudyConversionProgress>> {
  return run(() => getStudyConversionProgress(studyId))
}

export async function publishStudyAction(studyId: string): Promise<StudyActionResult<null>> {
  return run(async () => {
    await publishStudy(studyId)
    return null
  })
}

export async function readStudyFileAction(
  studyId: string,
  kind: StudyFileKind,
): Promise<StudyActionResult<{ fileName: string; content: string }>> {
  return run(() => readStudyFile(studyId, kind))
}

export async function getStudyOriginalUrlAction(studyId: string): Promise<StudyActionResult<string>> {
  return run(() => getStudyOriginalUrl(studyId))
}

export async function requestWorkStudyUploadAction(input: {
  companyId: string
  files: [WorkStudyUploadFileInput, WorkStudyUploadFileInput]
}): Promise<StudyActionResult<WorkStudyUploadTicketsResult>> {
  return run(() => createWorkStudyUploadTickets(input))
}

export async function registerWorkStudyAction(
  input: RegisterWorkStudyInput,
): Promise<StudyActionResult<RegisterWorkStudyResult>> {
  return run(() => registerWorkStudyFromUpload(input))
}
