import { cache } from "react"
import { headers } from "next/headers"
import { DashboardDevice } from "./dashboard-types"

// `cache()` mémoïse le résultat pour la durée d'une requête serveur : même si le
// layout ET plusieurs pages/sous-layouts appellent getDashboardDevice() au cours
// de la même navigation, headers() n'est lu et le user-agent n'est testé qu'UNE
// seule fois. Détection toujours côté serveur (conforme à la règle Adaptive Design).
export const getDashboardDevice = cache(async (): Promise<DashboardDevice> => {
  const headersList = await headers()
  const userAgent = headersList.get("user-agent") || ""

  // Regular expression to check for common mobile device keywords
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

  return isMobile ? "mobile" : "desktop"
})
