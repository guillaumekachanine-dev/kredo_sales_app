import { useEffect, useState, useRef, useCallback } from "react"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import { CrmAccountLauncherDesktop } from "./CrmAccountLauncherDesktop"
import { CrmAccountLauncherMobile } from "./CrmAccountLauncherMobile"

export type CrmLauncherAccount = {
  id: string
  name: string
  sector: string | null
  status: string | null
  score: number | null
  website: string | null
  logoPath: string | null
  contactCount: number
  openOpportunitiesCount?: number
  weightedPipeline?: number
  lastActivityAt?: string | null
}

export type CrmLauncherDestination = "cockpit" | "contacts" | "opportunities"
export type CrmLauncherMode = "personal" | "search" | "recent" | "opportunities"

interface CrmAccountLauncherProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: DashboardDevice
  onSelectAccount: (payload: {
    companyId: string
    companyName: string
    destination: CrmLauncherDestination
  }) => void
}

export function CrmAccountLauncher({
  open,
  onOpenChange,
  device,
  onSelectAccount,
}: CrmAccountLauncherProps) {
  const [destination, setDestination] = useState<CrmLauncherDestination>("cockpit")
  const [mode, setMode] = useState<CrmLauncherMode>("personal")
  const [searchQuery, setSearchQuery] = useState("")
  const [accounts, setAccounts] = useState<CrmLauncherAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Déclaré comme fonction stable avec useCallback
  const fetchAccounts = useCallback(async (fetchMode: CrmLauncherMode, query: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("mode", fetchMode)
      if (query.trim()) {
        params.set("q", query.trim())
      }
      params.set("limit", "10")

      const res = await fetch(`/api/prospection/accounts/launcher?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`)
      }
      const data = await res.json()
      setAccounts(data.items || [])
    } catch (err) {
      console.error("[CrmAccountLauncher] Fetch error:", err)
      setError("Impossible de charger les comptes.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Chargement initial au montage ou à l'ouverture du composant
  useEffect(() => {
    if (!open) return

    setDestination("cockpit")
    fetchAccounts("personal", "")
  }, [open, fetchAccounts])

  // Debounce de la recherche (200-250ms)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      const trimmed = query.trim()
      if (trimmed.length > 0) {
        setMode("search")
        fetchAccounts("search", trimmed)
      } else {
        // Fallback sur le mode sélectionné précédemment (par défaut personal)
        setMode("personal")
        fetchAccounts("personal", "")
      }
    }, 220)
  }

  const handleModeChange = (newMode: CrmLauncherMode) => {
    setMode(newMode)
    setSearchQuery("") // Clear de la recherche quand on change de tab
    fetchAccounts(newMode, "")
  }

  const handleRetry = () => {
    fetchAccounts(mode, searchQuery)
  }

  const handleSelect = (account: CrmLauncherAccount) => {
    onSelectAccount({
      companyId: account.id,
      companyName: account.name,
      destination,
    })
    onOpenChange(false)
  }

  // Si non ouvert, on ne monte rien : placé après tous les hooks
  if (!open) {
    return null
  }

  // Rendu adaptatif (device-aware)
  if (device === "mobile") {
    return (
      <CrmAccountLauncherMobile
        open={open}
        onOpenChange={onOpenChange}
        destination={destination}
        onDestinationChange={setDestination}
        mode={mode}
        onModeChange={handleModeChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        accounts={accounts}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        onSelectAccount={handleSelect}
      />
    )
  }

  return (
    <CrmAccountLauncherDesktop
      open={open}
      onOpenChange={onOpenChange}
      destination={destination}
      onDestinationChange={setDestination}
      mode={mode}
      onModeChange={handleModeChange}
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      accounts={accounts}
      loading={loading}
      error={error}
      onRetry={handleRetry}
      onSelectAccount={handleSelect}
    />
  )
}
