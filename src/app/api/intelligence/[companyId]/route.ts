import { NextResponse } from "next/server"
import { getClientIntelligence } from "@/lib/intelligence/intelligence-data"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params
  const result = await getClientIntelligence(companyId)
  if (!result.data) {
    return NextResponse.json({ error: result.error ?? "Not found" }, { status: 404 })
  }
  return NextResponse.json(result.data)
}
