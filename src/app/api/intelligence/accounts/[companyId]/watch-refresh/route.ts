import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { toAccountWatchWorkflowSettings, type AccountWatchSettingsWorkflowRow } from "@/lib/intelligence/account-watch-settings"
import { callN8nWebhook } from "@/lib/n8n/client"
import { createRun, updateRunStatus } from "@/lib/n8n/runs"
import { resolveAppBaseUrl } from "@/lib/n8n/trigger-run"
import type { AccountWatchRefreshTriggerMode, AccountWatchRefreshWebhookPayload } from "@/lib/n8n/types"
import type { Database } from "@/types/database"

type CompanyAccessRow = Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "workspace_id">

type AccountWatchRouteRow = Pick<
  Database["public"]["Tables"]["account_watch_settings"]["Row"],
  "id"
> &
  AccountWatchSettingsWorkflowRow

const SETTINGS_SELECT =
  "id,is_enabled,watch_level,cadence,include_official_site,include_news,include_public_records,include_tenders,include_social_manual,include_sector_corpus,query_aliases,metadata"

const WATCH_REFRESH_WORKFLOW_ID = "intel-033-account-watch-refresh"
const WATCH_REFRESH_RUN_TYPE = "account_watch_refresh"

export async function POST(
  _request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params
  if (!companyId) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,workspace_id")
    .eq("id", companyId)
    .maybeSingle()

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 })
  }

  if (!company) {
    return NextResponse.json({ error: "Compte introuvable ou inaccessible" }, { status: 404 })
  }

  const companyRow = company as CompanyAccessRow

  let settingsRow: AccountWatchRouteRow | null = null

  const { data: existingSettings, error: settingsError } = await supabase
    .from("account_watch_settings")
    .select(SETTINGS_SELECT)
    .eq("company_id", companyId)
    .maybeSingle()

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 })
  }

  if (existingSettings) {
    settingsRow = existingSettings as AccountWatchRouteRow
  } else {
    const { data: insertedSettings, error: insertSettingsError } = await supabase
      .from("account_watch_settings")
      .insert({
        company_id: companyId,
        workspace_id: companyRow.workspace_id,
      })
      .select(SETTINGS_SELECT)
      .single()

    if (insertSettingsError || !insertedSettings) {
      return NextResponse.json(
        { error: insertSettingsError?.message ?? "Impossible de créer les paramètres de veille." },
        { status: 500 },
      )
    }

    settingsRow = insertedSettings as AccountWatchRouteRow
  }

  const settings = toAccountWatchWorkflowSettings(settingsRow)
  const triggerMode: AccountWatchRefreshTriggerMode = "manual"

  let runId: string
  try {
    runId = await createRun({
      workflowId: WATCH_REFRESH_WORKFLOW_ID,
      runType: WATCH_REFRESH_RUN_TYPE,
      entityType: "company",
      entityId: companyId,
      companyId,
      workspaceId: companyRow.workspace_id,
      userId: user.id,
      triggerSource: "manual",
      input: {
        triggerMode,
        settings,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de créer le run." },
      { status: 500 },
    )
  }

  const { error: queueSettingsError } = await supabase
    .from("account_watch_settings")
    .update({
      last_status: "queued",
      last_error: null,
    })
    .eq("company_id", companyId)
    .eq("workspace_id", companyRow.workspace_id)

  if (queueSettingsError) {
    await updateRunStatus(runId, "failed", {
      errorMessage: `Failed to queue watch settings: ${queueSettingsError.message}`,
    }).catch(console.error)

    return NextResponse.json({ error: queueSettingsError.message }, { status: 500 })
  }

  const payload: AccountWatchRefreshWebhookPayload = {
    runId,
    workspaceId: companyRow.workspace_id,
    companyId,
    userId: user.id,
    triggerMode,
    watchLevel: settings.watchLevel,
    settings,
    callbackUrl: `${resolveAppBaseUrl()}/api/n8n/callback`,
  }

  try {
    await callN8nWebhook(WATCH_REFRESH_WORKFLOW_ID, payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "n8n injoignable"

    await Promise.allSettled([
      updateRunStatus(runId, "failed", { errorMessage: `Webhook call failed: ${message}` }),
      supabase
        .from("account_watch_settings")
        .update({
          last_status: "failed",
          last_error: message,
        })
        .eq("company_id", companyId)
        .eq("workspace_id", companyRow.workspace_id),
    ])

    return NextResponse.json(
      { error: "Impossible de lancer la mise à jour de veille pour le moment." },
      { status: 502 },
    )
  }

  return NextResponse.json({ runId }, { status: 202 })
}
