"use client"

import { useEffect, useState } from "react"
import { useCrmDrawer } from "@/hooks/use-crm-drawer"
import { CompanyIdentityDrawer } from "./CompanyIdentityDrawer"
import { ContactIdentityDrawer } from "./ContactIdentityDrawer"

export function CrmIdentityDrawerHost() {
  const { target, openCompany, openContact, close } = useCrmDrawer()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      <CompanyIdentityDrawer
        companyId={target?.kind === "company" ? target.id : null}
        open={target?.kind === "company"}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        onOpenContactIdentity={(contactId) => {
          const returnTo = target?.kind === "company"
            ? { kind: "company" as const, id: target.id }
            : undefined
          openContact(contactId, returnTo)
        }}
      />

      <ContactIdentityDrawer
        contactId={target?.kind === "contact" ? target.id : null}
        open={target?.kind === "contact"}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        onOpenCompanyIdentity={(companyId) => {
          const returnTo = target?.kind === "contact"
            ? { kind: "contact" as const, id: target.id }
            : undefined
          openCompany(companyId, returnTo)
        }}
        onOpenContactIdentity={(contactId) => {
          openContact(contactId)
        }}
      />
    </>
  )
}
