"use client"

import React, { useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { createContact } from "@/app/(app)/prospection/accounts/actions"
import { cn } from "@/lib/utils"

interface NewContactDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function NewContactDrawer({ open, onOpenChange, onCreated }: NewContactDrawerProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [account, setAccount] = useState<AccountValue | null>(null)
  const [jobTitle, setJobTitle] = useState("")
  const [role, setRole] = useState("operationnel")
  const [level, setLevel] = useState("operationnel")
  const [department, setDepartment] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setLinkedinUrl("")
    setAccount(null)
    setJobTitle("")
    setRole("operationnel")
    setLevel("operationnel")
    setDepartment("")
    setServerError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() && !lastName.trim()) {
      setServerError("Le prénom ou le nom de famille est requis.")
      return
    }

    startTransition(async () => {
      const res = await createContact({
        first_name: firstName,
        last_name: lastName,
        primary_email: email || undefined,
        phone: phone || undefined,
        linkedin_url: linkedinUrl || undefined,
        company_id: account?.id || undefined,
        job_title: jobTitle || undefined,
        relationship_role: role,
        relationship_level: level,
        department: department || undefined,
      })

      if (res.error) {
        setServerError(res.error)
      } else {
        resetForm()
        onOpenChange(false)
        onCreated?.()
      }
    })
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
      title="Créer un contact"
      side="bottom"
      className="sm:hidden h-[90vh] max-h-[90vh]"
      contentClassName="flex-1 overflow-y-auto px-4 py-3"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="md"
            className="h-11 px-5"
            onClick={() => {
              resetForm()
              onOpenChange(false)
            }}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            className="h-11 px-5"
            disabled={isPending}
            onClick={handleSubmit}
          >
            Enregistrer
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {serverError && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-heading mb-1">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none"
              placeholder="ex. Jean"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-heading mb-1">Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none"
              placeholder="ex. Dupont"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-heading mb-1">Entreprise</label>
          <AccountCombobox value={account} onChange={setAccount} />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-heading mb-1">Intitulé du poste</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none"
            placeholder="ex. Directeur des Achats"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-heading mb-1">Département / Direction</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none"
            placeholder="ex. DSI / Achats"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-heading mb-1">Email principal</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none"
            placeholder="ex. jean.dupont@entreprise.com"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-heading mb-1">Téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none"
            placeholder="ex. 06 12 34 56 78"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-heading mb-1">URL LinkedIn</label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading placeholder:text-muted/50 outline-none"
            placeholder="ex. https://linkedin.com/in/jean-dupont"
          />
        </div>
      </form>
    </AppDrawer>
  )
}
