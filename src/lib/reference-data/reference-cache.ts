import "server-only"

import { unstable_cache } from "next/cache"

// Référentiels quasi-statiques (skills, offer_practices, job_profiles, offers…) :
// alimentés par migration/seed, AUCUN chemin d'écriture depuis l'app (vérifié par
// grep sur les 4 tables avant d'écrire ce module — audit perf Session 28). Un TTL
// simple suffit donc : pas de revalidateTag à brancher sur une mutation puisqu'il
// n'en existe aucune côté application. Si un mainteneur modifie ces tables par SQL
// direct, le cache peut rester stale jusqu'à 1h — compromis assumé pour des données
// qui ne changent en pratique qu'au fil de migrations manuelles rares.
const REFERENCE_TTL_SECONDS = 3600

// workspaceId fait partie de la clé de cache : ces lectures passent par un client
// service-role (reference-service-client.ts) qui bypasse la RLS — sans ce keying,
// une entrée de cache pourrait fuiter d'un workspace à l'autre le jour où
// l'app cesse d'être mono-tenant. Chaque fetcher DOIT lui-même filtrer
// .eq("workspace_id", workspaceId) ; ce helper ne le fait pas à sa place.
export function getCachedReferenceRows<T>(
  table: string,
  workspaceId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = unstable_cache(fetcher, ["ref", table, workspaceId], {
    revalidate: REFERENCE_TTL_SECONDS,
    tags: [`ref:${table}:${workspaceId}`],
  })
  return cached()
}
