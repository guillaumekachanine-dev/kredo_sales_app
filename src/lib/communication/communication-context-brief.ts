import type { CommunicationBrief } from "@/lib/n8n/types"
import {
  resolveCommunicationOptions,
  type CommunicationResolution,
} from "./communication-options-resolver"
import type { LoadedCommunicationContext } from "./communication-context-loader"

export type ResolvedCommunicationContextBrief = {
  brief: CommunicationBrief
  resolution: CommunicationResolution | null
}

export function resolveBriefWithLoadedContext(
  brief: CommunicationBrief,
  loadedContext?: LoadedCommunicationContext | null,
): ResolvedCommunicationContextBrief {
  if (!loadedContext) return { brief, resolution: null }

  const resolution = resolveCommunicationOptions(loadedContext.facts, brief)
  return {
    brief: resolution.normalizedBrief,
    resolution,
  }
}
