"use server"

import "server-only"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import {
  loadCommunicationContext,
  type CommunicationContextRpcClient,
  type LoadedCommunicationContext,
  type LoadCommunicationContextInput,
} from "./communication-context-loader"

export type LoadCommunicationContextForCurrentUserInput = Omit<LoadCommunicationContextInput, "workspaceId">

export type LoadCommunicationContextForCurrentUserResult = {
  context: LoadedCommunicationContext | null
  error: string | null
}

function createCommunicationServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Variables Supabase service-role manquantes")

  return createServiceClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

export async function loadCommunicationContextForCurrentUser(
  input: LoadCommunicationContextForCurrentUserInput,
): Promise<LoadCommunicationContextForCurrentUserResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { context: null, error: "Non authentifié" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return { context: null, error: "Workspace introuvable" }
  }

  try {
    const context = await loadCommunicationContext(
      { ...input, workspaceId: profile.workspace_id },
      createCommunicationServiceClient() as unknown as CommunicationContextRpcClient,
    )
    return { context, error: null }
  } catch (error) {
    return {
      context: null,
      error: error instanceof Error ? error.message : "Impossible de charger le contexte de communication",
    }
  }
}
