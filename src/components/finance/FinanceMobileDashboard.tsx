"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { useLayoutEffect, useRef, useState } from "react"
import { MobileOverviewShell } from "@/components/layout/MobileOverviewShell"
import { getNavigationIcon } from "@/components/layout/navigation-icons"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { AnnualRevenueSkyline } from "./mobile/AnnualRevenueSkyline"
import { QuarterlyProductionGrid } from "./mobile/QuarterlyProductionGrid"
import { RevenueContributionChart } from "./mobile/RevenueContributionChart"
import styles from "./FinanceMobileDashboard.module.css"

const FinanceCockpitPanel = dynamic(() =>
  import("./mobile/FinanceCockpitPanel").then((module) => module.FinanceCockpitPanel),
  { loading: DetailLoading },
)
const FinancialModelingMobileFlow = dynamic(() =>
  import("@/features/financial-modeling/components/mobile/FinancialModelingMobileFlow").then(
    (module) => module.FinancialModelingMobileFlow,
  ),
  { loading: DetailLoading },
)

export const FINANCE_MOBILE_CHART_SLIDES = [
  "CA facturé",
  "Structure du CA",
  "Production annuelle",
] as const

export function buildFinanceMobileKpis(data: FinanceMobileDashboardData) {
  return {
    actualRevenue: data.summary.actualRevenue,
    actualGrossMarginPct: data.summary.actualGrossMarginPct,
  }
}

function DetailLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-[var(--radius-medium)] border border-dashed border-border text-xs text-muted" role="status">
      Chargement de l’analyse…
    </div>
  )
}

function CockpitBriefIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function FinanceMobileDashboard({ data }: { data: FinanceMobileDashboardData }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [cockpitOpen, setCockpitOpen] = useState(false)
  const [modelingOpen, setModelingOpen] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<Array<HTMLElement | null>>([])
  const kpis = buildFinanceMobileKpis(data)

  useLayoutEffect(() => {
    const carousel = carouselRef.current
    const slide = slideRefs.current[activeSlide]
    if (!carousel || !slide) return

    const syncHeight = () => {
      carousel.style.height = `${slide.offsetHeight}px`
    }
    syncHeight()

    const observer = new ResizeObserver(syncHeight)
    observer.observe(slide)
    return () => observer.disconnect()
  }, [activeSlide])

  function scrollToSlide(index: number) {
    const carousel = carouselRef.current
    if (!carousel) return
    carousel.scrollTo({ left: index * carousel.clientWidth, behavior: "smooth" })
    setActiveSlide(index)
  }

  return (
    <>
      <MobileOverviewShell
        tone="finance"
        heroLabel="Finance"
        surfaceLabel="Vue d’ensemble analytique Finance"
        className={styles.shell}
        artworkClassName={styles.artwork}
        icon={getNavigationIcon("finance", "size-11 text-heading", 1.8)}
        artwork={(
          <Image
            src="/illustrations/finance-mobile-line-art.png"
            alt=""
            width={1536}
            height={1024}
            sizes="316px"
            priority
          />
        )}
        heroContent={(
          <>
            <h1 className="sr-only">Finance</h1>
            <button
              type="button"
              className={styles.heroAction}
              onClick={() => setCockpitOpen(true)}
              aria-label="Ouvrir le Brief Cockpit Finance"
            >
              <CockpitBriefIcon />
            </button>
          </>
        )}
      >
        <section className={styles.kpis} aria-label="Indicateurs Finance">
          <div>
            <p>CA facturé</p>
            <strong>{formatEuroCompact(kpis.actualRevenue)}</strong>
          </div>
          <div>
            <p>Marge moyenne</p>
            <strong>{formatPct(kpis.actualGrossMarginPct, 1)}</strong>
          </div>
        </section>

        <section className={styles.analysis} aria-label="Analyses Finance">
          <div
            ref={carouselRef}
            className={styles.carousel}
            onScroll={(event) => {
              const width = event.currentTarget.clientWidth
              if (width > 0) setActiveSlide(Math.round(event.currentTarget.scrollLeft / width))
            }}
          >
            <article ref={(node) => { slideRefs.current[0] = node }} className={styles.slide} aria-label="CA facturé, vue 1 sur 3">
              <AnnualRevenueSkyline data={data} />
            </article>
            <article ref={(node) => { slideRefs.current[1] = node }} className={styles.slide} aria-label="Structure du CA, vue 2 sur 3">
              <RevenueContributionChart data={data} />
            </article>
            <article ref={(node) => { slideRefs.current[2] = node }} className={styles.slide} aria-label="Production annuelle, vue 3 sur 3">
              <QuarterlyProductionGrid data={data} />
            </article>
          </div>

          <nav className={styles.carouselNav} aria-label="Choisir une analyse Finance">
            <span aria-live="polite">{FINANCE_MOBILE_CHART_SLIDES[activeSlide]}</span>
            <div>
              {FINANCE_MOBILE_CHART_SLIDES.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`Afficher ${label}`}
                  aria-current={activeSlide === index ? "page" : undefined}
                  onClick={() => scrollToSlide(index)}
                >
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
            <small>{activeSlide + 1} / {FINANCE_MOBILE_CHART_SLIDES.length}</small>
          </nav>
        </section>
      </MobileOverviewShell>

      <AppDrawer
        open={cockpitOpen}
        onOpenChange={setCockpitOpen}
        side="bottom"
        title={<span className="text-base font-bold leading-7 tracking-tight text-white">Cockpit Intelligence — Brief Finance</span>}
        eyebrow={`Finance · ${data.period.fiscalYear}`}
        showMobileCloseButton
        className="sm:hidden border-t border-white/15 bg-primary text-white"
        headerClassName="border-b border-white/15 text-white [--color-muted:rgba(255,255,255,0.72)] [&_button]:text-white/70 [&_button]:hover:text-white [&_[aria-hidden=true]]:bg-white/15 [&_[aria-hidden=true]]:text-white"
        contentClassName="bg-primary text-white [--drawer-header-fade-start:transparent] [--drawer-header-fade-end:transparent]"
      >
        {cockpitOpen ? (
          <FinanceCockpitPanel
            data={data}
            onOpenModeling={() => {
              setCockpitOpen(false)
              setModelingOpen(true)
            }}
          />
        ) : null}
      </AppDrawer>

      {modelingOpen ? <FinancialModelingMobileFlow open={modelingOpen} onOpenChange={setModelingOpen} /> : null}
    </>
  )
}
