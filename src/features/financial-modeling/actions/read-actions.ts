"use server"

import { getFinancialModel } from "../data/get-financial-model"
import { getFinancialModelForStaffing } from "../data/get-financial-model-for-staffing"
import { getFinancialModelingBootstrap } from "../data/get-financial-modeling-bootstrap"
import { getRecentFinancialModels } from "../data/get-recent-financial-models"

export async function getFinancialModelAction(id: string) {
  try {
    return { success: true, data: await getFinancialModel(id) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur de chargement"
    return { error: msg }
  }
}

export async function getFinancialModelForStaffingAction(opportunityId: string, candidateId: string) {
  try {
    return { success: true, id: await getFinancialModelForStaffing(opportunityId, candidateId) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur de chargement de la simulation"
    return { error: msg }
  }
}

export async function getFinancialModelingBootstrapAction() {
  try {
    return { success: true, data: await getFinancialModelingBootstrap() }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur de chargement du bootstrap"
    return { error: msg }
  }
}

export async function getRecentFinancialModelsAction() {
  try {
    return { success: true, data: await getRecentFinancialModels() }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur de chargement de l'historique"
    return { error: msg }
  }
}
