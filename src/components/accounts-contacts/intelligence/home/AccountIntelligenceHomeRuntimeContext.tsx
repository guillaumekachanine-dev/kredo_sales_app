"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { AccountIntelligenceHomeFinancials } from "@/lib/intelligence/account-intelligence-home-contract"

type AccountIntelligenceHomeRuntimeValue = {
  financials: AccountIntelligenceHomeFinancials | null
  playbookSlug: string | null
}

const AccountIntelligenceHomeRuntimeContext = createContext<AccountIntelligenceHomeRuntimeValue>({
  financials: null,
  playbookSlug: null,
})

export function AccountIntelligenceHomeRuntimeProvider({
  financials,
  playbookSlug,
  children,
}: AccountIntelligenceHomeRuntimeValue & { children: ReactNode }) {
  return (
    <AccountIntelligenceHomeRuntimeContext.Provider value={{ financials, playbookSlug }}>
      {children}
    </AccountIntelligenceHomeRuntimeContext.Provider>
  )
}

export function useAccountIntelligenceHomeRuntime() {
  return useContext(AccountIntelligenceHomeRuntimeContext)
}
