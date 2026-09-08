"use server"

import { getEngagementsOverview } from "../_data/get-engagements-overview"
import type { EngagementsPortfolioViewModel } from "@/components/missions/dashboard/engagements-portfolio-types"

/**
 * Chargeur autoportant de l'Atlas du portefeuille.
 *
 * `/missions` charge ce modèle côté serveur et le passe en prop ; le Cockpit
 * Intelligence est un composant client sans ce contexte. Passe-plat vers la
 * même lecture — la page et le module voient exactement le même portefeuille.
 */
export async function loadEngagementsOverview(): Promise<EngagementsPortfolioViewModel> {
  return getEngagementsOverview()
}
