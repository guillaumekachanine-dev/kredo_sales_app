"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { getNavigationIcon } from "@/components/layout/navigation-icons"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import type {
  CockpitMobileSnapshot,
  CockpitNewsItem,
} from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import type { CockpitModuleId } from "./cockpit-mobile-module-types"
import { IconChevron } from "./icons"

type TileTone = "info" | "warning" | "idea" | "active" | "urgent"

type CockpitMobileHomeProps = {
  snapshot: CockpitMobileSnapshot | null
  onOpenModule: (module: CockpitModuleId, origin: HTMLButtonElement) => void
  onQuickActionsOpen: () => void
}

function formatWeekLabel(snapshot: CockpitMobileSnapshot | null) {
  const weekIso = snapshot?.weeklyBrief?.facts.period.weekIso
  return weekIso ? `Semaine ${weekIso.replace(/^\d{4}-W/, "")}` : "Aucun brief"
}

function formatMeetingTime(startsAt: string, allDay: boolean) {
  if (allDay) return "Toute la journée"
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: AGENDA_V1_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt))
}

function formatHeroDate(generatedAt: string | undefined) {
  if (!generatedAt) return null

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    timeZone: AGENDA_V1_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(generatedAt))

  return `${formattedDate.charAt(0).toUpperCase()}${formattedDate.slice(1)}`
}

function HomeRail({ children, label }: { children: ReactNode; label: string }) {
  return <div className="cockpit-home__rail" aria-label={label}>{children}</div>
}

function HomeSectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="cockpit-home__section-heading">
      <h2>{children}</h2>
      {action}
    </div>
  )
}

function TileIcon({ icon }: { icon: string }) {
  return <span className="cockpit-home__tile-icon">{getNavigationIcon(icon, "size-4", 1.9)}</span>
}

function NewsTile({ item }: { item: CockpitNewsItem }) {
  const tone: TileTone = item.kind === "account_signal"
    ? "active"
    : item.kind === "digest"
      ? "info"
      : "idea"
  const icon = item.kind === "account_signal" ? "prospection" : item.kind === "digest" ? "veille" : "bi"
  const kindLabel = item.kind === "account_signal" ? "Signal" : item.kind === "digest" ? "Digest" : "Analyse"
  const content = (
    <>
      <TileIcon icon={icon} />
      <span className="cockpit-home__news-type">{kindLabel}</span>
      <strong>{item.title}</strong>
      {item.contextLabel ? <span className="cockpit-home__news-context">{item.contextLabel}</span> : null}
    </>
  )

  if (item.href) {
    return <Link href={item.href} className="cockpit-home__news-tile" data-tone={tone}>{content}</Link>
  }

  return <article className="cockpit-home__news-tile" data-tone={tone}>{content}</article>
}

export function CockpitMobileHome({ snapshot, onOpenModule, onQuickActionsOpen }: CockpitMobileHomeProps) {
  const weekTiles: Array<{
    id: CockpitModuleId
    title: string
    detail: string
    tone: TileTone
    icon: string
  }> = [
    {
      id: "weeklyBrief",
      title: "Brief\nhebdomadaire",
      detail: formatWeekLabel(snapshot),
      tone: "info",
      icon: "reports",
    },
    {
      id: "priorities",
      title: "Priorités",
      detail: snapshot ? `${snapshot.priorities.totalCount} à traiter` : "Indisponible",
      tone: "warning",
      icon: "clipboard-mobile",
    },
    {
      id: "opportunities",
      title: "Opportunités",
      detail: snapshot ? `${snapshot.opportunities.items.length} action${snapshot.opportunities.items.length > 1 ? "s" : ""} cette semaine` : "Indisponible",
      tone: "idea",
      icon: "crm-mobile",
    },
  ]
  const meetings = snapshot?.meetings.todayItems ?? []
  const newsItems = snapshot?.news.items ?? []
  const heroDate = formatHeroDate(snapshot?.generatedAt)

  return (
    <section className="cockpit-home">
      <section className="cockpit-home__hero" aria-label="Accueil KREDO">
        <h1 className="sr-only">Accueil KREDO</h1>
        <Image
          className="cockpit-home__logo"
          src="/logo_app.png"
          alt="KREDO"
          width={500}
          height={500}
          priority
          sizes="92px"
        />
        <Image
          className="cockpit-home__hero-illustration"
          src="/images/design-lab/kredo-home-mobile-v2-hero-final.png"
          alt=""
          width={1200}
          height={900}
          sizes="316px"
          priority
        />
        {heroDate && snapshot?.generatedAt ? (
          <time className="cockpit-home__hero-date" dateTime={snapshot.generatedAt}>
            {heroDate}
          </time>
        ) : null}
        <button type="button" className="cockpit-home__quick-action" onClick={onQuickActionsOpen} aria-label="Créer nouveau">
          <span aria-hidden="true">+</span>
        </button>
      </section>

      <section className="cockpit-home__surface" aria-label="Contenu de la homepage mobile">
        <section className="cockpit-home__section" aria-labelledby="cockpit-home-week-title">
          <HomeSectionHeading><span id="cockpit-home-week-title">Ma semaine</span></HomeSectionHeading>
          <HomeRail label="Modules de la semaine">
            {weekTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className="cockpit-home__week-tile"
                data-tone={tile.tone}
                onClick={(event) => onOpenModule(tile.id, event.currentTarget)}
              >
                <TileIcon icon={tile.icon} />
                <strong>{tile.title.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
                <span>{tile.detail}</span>
              </button>
            ))}
          </HomeRail>
        </section>

        <section className="cockpit-home__section" aria-labelledby="cockpit-home-meetings-title">
          <HomeSectionHeading
            action={(
              <Link href="/agenda" className="cockpit-home__agenda-shortcut" aria-label="Ouvrir l’agenda">
                <IconChevron />
              </Link>
            )}
          >
            <span id="cockpit-home-meetings-title">Mes RDV</span>
          </HomeSectionHeading>
          {meetings.length === 0 ? (
            <p className="cockpit-home__meeting-empty">Aucun rendez-vous aujourd’hui</p>
          ) : (
            <HomeRail label="Rendez-vous commerciaux du jour">
              {meetings.map((meeting) => {
                const context = [meeting.companyName, meeting.contactName].filter(Boolean).join(" · ")
                return (
                  <article key={meeting.id} className="cockpit-home__meeting-tile">
                    <time>{formatMeetingTime(meeting.startsAt, meeting.allDay)}</time>
                    <strong>{meeting.title}</strong>
                    {context ? <span>{context}</span> : null}
                  </article>
                )
              })}
            </HomeRail>
          )}
        </section>

        <section className="cockpit-home__section" aria-labelledby="cockpit-home-news-title">
          <HomeSectionHeading><span id="cockpit-home-news-title">Mes actualités</span></HomeSectionHeading>
          {newsItems.length === 0 ? (
            <p className="cockpit-home__meeting-empty">Aucune actualité récente</p>
          ) : (
            <HomeRail label="Actualités récentes">
              {newsItems.map((item) => <NewsTile key={`${item.kind}-${item.id}`} item={item} />)}
            </HomeRail>
          )}
        </section>
      </section>
    </section>
  )
}
