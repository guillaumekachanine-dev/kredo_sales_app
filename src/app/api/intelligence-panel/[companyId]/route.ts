import { NextResponse } from "next/server"
import { getAccountIntelligencePanelData } from "@/lib/intelligence/account-panel-data"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params
  const result = await getAccountIntelligencePanelData(companyId)
  if (!result.data) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.json(result.data)
}
