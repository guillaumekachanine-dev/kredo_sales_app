"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SyntheseDesignVariant } from "./design-variants"
import { MobilePriorityCard } from "./MobilePriorityCard"
import { MobilePriorityActionDrawer } from "./MobilePriorityActionDrawer"
import { SyntheseMobileDesignLab } from "./SyntheseMobileDesignLab"
import type {
  MobileLensKey,
  MobilePriorityViewModel,
} from "./mobile-priority-view-model"
import { buildLensUrl } from "./mobile-priority-url"

const SESSION_KEY = "kredo_examined_accounts"

function useExaminedAccounts() {
  const [examined, setExamined] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set()
    }

    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  const markExamined = useCallback((accountId: string) => {
    setExamined((prev) => {
      if (prev.has(accountId)) return prev
      const next = new Set(prev)
      next.add(accountId)
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify([...next]))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return { examined, markExamined }
}

export function MobilePriorityInteractiveList({
  viewModel,
  design = null,
}: {
  viewModel: MobilePriorityViewModel
  design?: SyntheseDesignVariant | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [drawerAccountId, setDrawerAccountId] = useState<string | null>(null)
  const { examined, markExamined } = useExaminedAccounts()

  const drawerItem = useMemo(() => {
    if (!drawerAccountId) return null
    return viewModel.items.find((item) => item.accountId === drawerAccountId) ?? null
  }, [viewModel.items, drawerAccountId])

  const handleLensChange = useCallback(
    (lens: MobileLensKey) => {
      startTransition(() => {
        const url = buildLensUrl("/prospection", searchParams, lens)
        router.replace(url, { scroll: false })
      })
    },
    [router, searchParams],
  )

  const handleOpenDrawer = useCallback(
    (accountId: string) => {
      markExamined(accountId)
      setDrawerAccountId(accountId)
    },
    [markExamined],
  )

  const handleWhyNowOpen = useCallback(
    (accountId: string) => {
      markExamined(accountId)
    },
    [markExamined],
  )

  const handleActionSuccess = useCallback(() => {
    setDrawerAccountId(null)
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  const examinedCount = useMemo(() => {
    return viewModel.items.filter((item) => examined.has(item.accountId)).length
  }, [viewModel.items, examined])

  const overflowCount = viewModel.totalForLens - viewModel.items.length

  return (
    <>
      {design ? (
        viewModel.items.length === 0 ? (
          <MobileActionPage
            header={
              <MobilePageHeader
                eyebrow="CRM · Synthèse"
                title="Priorités commerciales"
                contextControl={<PeriodChip label={viewModel.periodLabel} />}
              />
            }
          >
            <EmptyLensState
              activeLens={viewModel.activeLens}
              onReset={() => handleLensChange("all")}
            />
          </MobileActionPage>
        ) : (
          <SyntheseMobileDesignLab
            design={design}
            viewModel={viewModel}
            examinedCount={examinedCount}
            isPending={isPending}
            onChangeLens={handleLensChange}
            onOpenActions={handleOpenDrawer}
            onOpenAccount={(id) => {
              router.push(`/prospection/accounts/${id}`)
            }}
            onWhyNowOpen={handleWhyNowOpen}
          />
        )
      ) : (
        <MobileActionPage
          header={
            <MobilePageHeader
              eyebrow="CRM · Synthèse"
              title="Priorités commerciales"
              contextControl={<PeriodChip label={viewModel.periodLabel} />}
            />
          }
          context={
            <div className="flex flex-col gap-3">
              <SummaryBar
                totalForLens={viewModel.totalForLens}
                totalPortfolio={viewModel.totalPortfolio}
                examinedCount={examinedCount}
                activeLens={viewModel.activeLens}
                isPending={isPending}
              />
              <LensChips
                lenses={viewModel.lenses}
                activeLens={viewModel.activeLens}
                onChangeLens={handleLensChange}
                isPending={isPending}
              />
            </div>
          }
        >
          {viewModel.items.length === 0 ? (
            <EmptyLensState
              activeLens={viewModel.activeLens}
              onReset={() => handleLensChange("all")}
            />
          ) : (
            <div className={cn("flex flex-col gap-4", isPending && "opacity-60 transition-opacity")}>
              {viewModel.items.map((item) => (
                <MobilePriorityCard
                  key={item.accountId}
                  item={item}
                  onOpenActions={handleOpenDrawer}
                  onOpenAccount={(id) => {
                    router.push(`/prospection/accounts/${id}`)
                  }}
                  onWhyNowOpen={handleWhyNowOpen}
                />
              ))}
              {overflowCount > 0 ? (
                <p className="py-2 text-center text-xs text-muted">
                  {overflowCount} priorité{overflowCount > 1 ? "s" : ""} supplémentaire{overflowCount > 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
          )}
        </MobileActionPage>
      )}

      <MobilePriorityActionDrawer
        item={drawerItem}
        open={drawerAccountId !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerAccountId(null)
        }}
        onActionSuccess={handleActionSuccess}
      />
    </>
  )
}

// ── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({
  totalForLens,
  totalPortfolio,
  examinedCount,
  activeLens,
  isPending,
}: {
  totalForLens: number
  totalPortfolio: number
  examinedCount: number
  activeLens: MobileLensKey
  isPending: boolean
}) {
  return (
    <SurfaceCard padding="compact" radius="lg" className={cn(isPending && "opacity-60 transition-opacity")}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="text-xl font-bold text-heading leading-none">
          {totalForLens}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-body leading-snug">
            <strong className="font-semibold text-heading">
              priorité{totalForLens !== 1 ? "s" : ""} détectée{totalForLens !== 1 ? "s" : ""}
            </strong>
            {activeLens !== "all" ? (
              <span className="text-muted"> / {totalPortfolio} comptes</span>
            ) : null}
          </p>
          {examinedCount > 0 ? (
            <p className="text-[11px] text-muted leading-snug">
              {examinedCount} examinée{examinedCount !== 1 ? "s" : ""} dans cette session
            </p>
          ) : null}
        </div>
        {totalForLens > 0 ? (
          <ProgressDots total={Math.min(totalForLens, 8)} filled={Math.min(examinedCount, Math.min(totalForLens, 8))} />
        ) : null}
      </div>
    </SurfaceCard>
  )
}

function ProgressDots({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < filled ? "bg-brand-brass" : "bg-border",
          )}
        />
      ))}
    </div>
  )
}

// ── Lens Chips ───────────────────────────────────────────────────────────────

const LENS_DOTS: Record<string, string> = {
  cibler: "bg-brand-brass",
  couvrir: "bg-primary",
  engager: "bg-success",
  decider: "bg-info",
}

function LensChips({
  lenses,
  activeLens,
  onChangeLens,
  isPending,
}: {
  lenses: MobilePriorityViewModel["lenses"]
  activeLens: MobileLensKey
  onChangeLens: (lens: MobileLensKey) => void
  isPending: boolean
}) {
  return (
    <div
      className={cn("flex gap-2 overflow-x-auto pb-0.5 scrollbar-none", isPending && "pointer-events-none")}
      role="tablist"
      aria-label="Lentilles commerciales"
    >
      {lenses.map((lens) => {
        const isActive = lens.key === activeLens
        return (
          <button
            key={lens.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChangeLens(lens.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors min-h-[32px]",
              isActive
                ? "border-primary/30 bg-primary/[0.06] text-primary"
                : "border-border bg-surface text-body",
            )}
          >
            {LENS_DOTS[lens.key] ? (
              <span className={cn("size-1.5 rounded-full", LENS_DOTS[lens.key])} aria-hidden="true" />
            ) : null}
            {lens.label}
            <span
              className={cn(
                "inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold",
                isActive ? "bg-primary/10 text-primary" : "bg-canvas text-muted",
              )}
            >
              {lens.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Period Chip ──────────────────────────────────────────────────────────────

function PeriodChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1.5 text-[11px] font-medium text-primary min-h-[32px]">
      <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {label}
    </span>
  )
}

// ── Empty Lens State ─────────────────────────────────────────────────────────

function EmptyLensState({
  activeLens,
  onReset,
}: {
  activeLens: MobileLensKey
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-sm text-body">
        Aucun compte ne correspond à la lentille « {activeLens} ».
      </p>
      <button
        type="button"
        onClick={onReset}
        className="min-h-[44px] rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors"
      >
        Voir toutes les priorités
      </button>
    </div>
  )
}
