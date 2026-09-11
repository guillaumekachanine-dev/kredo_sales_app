import "server-only"

import { createClient } from "@/lib/supabase/server"
import { ImportAccountKnowledgeForm } from "./ImportAccountKnowledgeForm"

export const dynamic = "force-dynamic"

export default async function AccountKnowledgeImportPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name", { ascending: true })

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
        Import — connaissance compte produite hors n8n
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Banc de test (Lot 0.8). Colle le JSON V4 produit par un LLM de recherche
        approfondie externe (Gemini/ChatGPT Deep Research), suivant le gabarit de{" "}
        <code className="rounded bg-[var(--color-bg-surface-hover)] px-1 py-0.5 text-xs">
          09-PROJECT-INSTRUCTIONS-LLM-EXTERNE.md
        </code>
        . Il passe par les mêmes contrôles que le callback n8n (INV-1/INV-2, hypothèse
        non chiffrée, frontière tenant) avant d&apos;être écrit dans{" "}
        <code className="rounded bg-[var(--color-bg-surface-hover)] px-1 py-0.5 text-xs">
          ai_intelligence_results
        </code>
        . Aucun renderer V4 n&apos;existe encore (Lot 1) — l&apos;import réussit, la
        fiche compte ne l&apos;affiche pas encore.
      </p>

      <ImportAccountKnowledgeForm companies={companies ?? []} />
    </div>
  )
}
