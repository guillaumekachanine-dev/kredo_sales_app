import { permanentRedirect } from "next/navigation"

// Route historique consolidée dans le shell Engagements (SHELL-0018 Lot 6.3).
// Le contenu vit désormais dans `/missions?vue=projets` (EngagementsDesktopView / CurrentProjectsList).
// Cette route minimale préserve les anciens signets et deep-links externes par redirection permanente.

export default function MissionsProjetsLegacyRoute() {
  permanentRedirect("/missions?vue=projets")
}
