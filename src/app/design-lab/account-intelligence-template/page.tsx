import type { Metadata } from "next"
import { AccountIntelligenceTemplateLab } from "./AccountIntelligenceTemplateLab"

export const metadata: Metadata = {
  title: "Design Lab · Account Intelligence Template",
  description: "Gabarit éditorial Account Intelligence inspiré de la référence Business Case Study.",
}

export default function AccountIntelligenceTemplateLabPage() {
  return <AccountIntelligenceTemplateLab />
}
