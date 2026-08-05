"use client"

import { Fragment } from "react"
import type { AccountKnowledgeClaimV3, AccountKnowledgeContentV3, AccountKnowledgeVerificationResultV3 } from "@/lib/intelligence/account-intelligence-contracts"
import { buildAccountKnowledgeV3VerificationIndex, collectAccountKnowledgeV3Claims } from "@/lib/intelligence/account-intelligence-contracts"
import type { SourceIndex } from "../AccountKnowledgeV2Blocks"
import { FolioSourceMarker, FolioEvidenceState } from "./FolioStudyPrimitives"

export type VerificationIndex = ReadonlyMap<AccountKnowledgeClaimV3, AccountKnowledgeVerificationResultV3>

export function buildClaimVerificationIndex(content: AccountKnowledgeContentV3): VerificationIndex {
  const pathIndex = buildAccountKnowledgeV3VerificationIndex(content)
  const map = new Map<AccountKnowledgeClaimV3, AccountKnowledgeVerificationResultV3>()
  const allClaims = collectAccountKnowledgeV3Claims(content)
  for (const entry of allClaims) {
    const res = pathIndex.get(entry.path)
    if (res) map.set(entry.claim, res)
  }
  return map
}

export function resolveEvidenceState(claim: AccountKnowledgeClaimV3, index?: VerificationIndex): "confirmed" | "contradicted" | "insufficient_evidence" | "institutional" {
  if (claim.attribution === "institutional") return "institutional"
  const verdict = index?.get(claim)?.verdict
  if (verdict === "confirmed") return "confirmed"
  if (verdict === "contradicted") return "contradicted"
  if (verdict === "insufficient_evidence") return "insufficient_evidence"
  // Default fallback if somehow missing
  return "insufficient_evidence"
}

export function FolioClaimText({ claim, sources, verificationIndex, onSourceClick }: { claim: AccountKnowledgeClaimV3; sources: SourceIndex; verificationIndex?: VerificationIndex; onSourceClick?: (id: string) => void }) {
  const state = resolveEvidenceState(claim, verificationIndex)
  
  return (
    <span>
      {claim.text}
      {" "}
      <FolioEvidenceState state={state} />
      {claim.source_refs.map((ref, idx) => {
        const source = sources.get(ref)
        if (!source) return null
        return (
          <Fragment key={ref}>
            <FolioSourceMarker index={idx + 1} url={source.url} onClick={() => onSourceClick?.(ref)} />
          </Fragment>
        )
      })}
    </span>
  )
}
