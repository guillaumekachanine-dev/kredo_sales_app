import { cache } from "react"
import { headers, cookies } from "next/headers"
import { DashboardDevice } from "./dashboard-types"

// `cache()` mémoïse le résultat pour la durée d'une requête serveur : même si le
// layout ET plusieurs pages/sous-layouts appellent getDashboardDevice() au cours
// de la même navigation, headers() n'est lu et le user-agent n'est testé qu'UNE
// seule fois. Détection toujours côté serveur (conforme à la règle Adaptive Design).
export const getDashboardDevice = cache(async (): Promise<DashboardDevice> => {
  // ── Override dev-only ────────────────────────────────────────────────────
  // Permet de prévisualiser la branche mobile/desktop dans un navigateur de bureau
  // (la détection serveur lit l'user-agent, qu'un resize de viewport ne change pas).
  // Pose le cookie côté client : document.cookie = "kredo_force_device=mobile".
  // Strictement neutralisé en production.
  if (process.env.NODE_ENV !== "production") {
    const forced = (await cookies()).get("kredo_force_device")?.value
    if (forced === "mobile" || forced === "desktop") {
      return forced
    }
  }

  const headersList = await headers()
  const userAgent = headersList.get("user-agent") || ""

  // Regular expression to check for common mobile device keywords
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

  return isMobile ? "mobile" : "desktop"
})
