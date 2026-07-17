"use server"

import { getSectors } from "@/lib/supabase/sector"

export async function getSandboxData() {
  try {
    const sectors = await getSectors()
    return {
      success: true,
      sectors,
    }
  } catch (error) {
    console.error("Error loading sandbox data:", error)
    return {
      success: false,
      sectors: [],
    }
  }
}
