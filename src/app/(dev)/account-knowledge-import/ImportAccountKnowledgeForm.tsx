"use client"

import { useState, useTransition } from "react"
import { importAccountKnowledgeAction, type ImportAccountKnowledgeResult } from "./actions"

type Company = { id: string; name: string }

export function ImportAccountKnowledgeForm({ companies }: { companies: Company[] }) {
  const [companyId, setCompanyId] = useState("")
  const [modelUsed, setModelUsed] = useState("chatgpt-deep-research")
  const [json, setJson] = useState("")
  const [result, setResult] = useState<ImportAccountKnowledgeResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setResult(null)
    startTransition(async () => {
      const outcome = await importAccountKnowledgeAction(companyId, modelUsed, json)
      setResult(outcome)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">Compte</span>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="">— sélectionner —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">Moteur utilisé</span>
        <input
          value={modelUsed}
          onChange={(e) => setModelUsed(e.target.value)}
          placeholder="chatgpt-deep-research, gemini-deep-research…"
          className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          JSON V4 (schema_version 4)
        </span>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={16}
          placeholder='{"schema_version": 4, "entity_resolution": {...}, "sections": [...], ...}'
          className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text-primary)]"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {isPending ? "Import en cours…" : "Importer"}
      </button>

      {result?.ok === true && (
        <div className="rounded-md border border-[var(--color-success)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
          Importé — run <code className="text-xs">{result.runId}</code> (schema V{result.version}), statut{" "}
          <strong>succeeded</strong>. Le renderer V4 n&apos;existe pas encore : rien de nouveau ne
          s&apos;affichera sur la fiche compte pour l&apos;instant.
        </div>
      )}

      {result?.ok === false && (
        <div className="rounded-md border border-[var(--color-danger)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
          <p className="font-medium">{result.error}</p>
          {result.issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--color-text-secondary)]">
              {result.issues.map((issue, index) => (
                <li key={index}>
                  <code>{issue.path}</code> — {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
