import Image from "next/image"
import { getNavigationIcon } from "@/components/layout/navigation-icons"
import { IconChevron } from "@/components/cockpit/mobile/icons"
import styles from "./KredoHomeMobileV2Prototype.module.css"

const SHOW_EMPTY_MEETINGS = false

const weekTiles = [
  { title: "Brief\nHebdomadaire", detail: "Semaine 37", tone: "info", icon: "reports" },
  { title: "Priorités", detail: "5 à traiter", tone: "warning", icon: "clipboard-mobile" },
  { title: "Opportunités", detail: "3 actions cette semaine", tone: "idea", icon: "crm-mobile" },
] as const

const meetings = [
  { time: "09:30", title: "Comité de pilotage", context: "Grand Compte" },
  { time: "11:00", title: "Point staffing", context: "Acme" },
  { time: "14:30", title: "Audit SI", context: "Client X" },
] as const

const newsTiles = [
  { type: "Signal", title: "Nouveau programme IA", context: "Capgemini", tone: "active", icon: "prospection" },
  { type: "Signal", title: "Programme cloud", context: "Schneider", tone: "warning", icon: "prospection" },
  { type: "Signal", title: "Budget confirmé", context: "Sopra Steria", tone: "urgent", icon: "prospection" },
  { type: "Digest", title: "IA & LLM", context: "Cette semaine", tone: "info", icon: "veille" },
  { type: "Analyse", title: "Marché Cloud", context: "Septembre", tone: "idea", icon: "bi" },
] as const

type TileTone = "info" | "warning" | "idea" | "active" | "urgent"

function PrototypeRail({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className={styles.rail} aria-label={label}>
      {children}
    </div>
  )
}

function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={styles.sectionHeading}>
      <h2>{children}</h2>
      {action}
    </div>
  )
}

function TileIcon({ icon }: { icon: string }) {
  return <span className={styles.tileIcon}>{getNavigationIcon(icon, "size-4", 1.9)}</span>
}

export function KredoHomeMobileV2Prototype() {
  return (
    <main className={styles.prototype}>
      <section className={styles.hero} aria-label="Hero KREDO">
        <h1 className="sr-only">Accueil KREDO</h1>
        <Image
          className={styles.logo}
          src="/logo_app.png"
          alt="KREDO"
          width={500}
          height={500}
          priority
          sizes="92px"
        />
        <Image
          className={styles.heroIllustration}
          src="/images/design-lab/kredo-home-mobile-v2-hero-final.png"
          alt=""
          width={1200}
          height={900}
          sizes="316px"
          priority
        />
        <button type="button" className={styles.quickAction} aria-label="Créer nouveau (prototype)">
          <span aria-hidden="true">+</span>
        </button>
      </section>

      <section className={styles.surface} aria-label="Contenu de la homepage mobile">
        <section className={styles.homeSection} aria-labelledby="week-title">
          <SectionHeading><span id="week-title">Ma semaine</span></SectionHeading>
          <PrototypeRail label="Modules de la semaine">
            {weekTiles.map((tile) => (
              <button key={tile.title} type="button" className={styles.weekTile} data-tone={tile.tone as TileTone}>
                <TileIcon icon={tile.icon} />
                <strong>{tile.title.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
                <span>{tile.detail}</span>
              </button>
            ))}
          </PrototypeRail>
        </section>

        <section className={styles.homeSection} aria-labelledby="meetings-title">
          <SectionHeading
            action={(
              <button type="button" className={styles.agendaShortcut} aria-label="Ouvrir l’agenda (prototype)">
                <IconChevron />
              </button>
            )}
          >
            <span id="meetings-title">Mes RDV</span>
          </SectionHeading>
          {SHOW_EMPTY_MEETINGS ? (
            <p className={styles.meetingEmpty}>Aucun rendez-vous aujourd’hui</p>
          ) : (
            <PrototypeRail label="Rendez-vous du jour">
              {meetings.map((meeting) => (
                <button key={meeting.time} type="button" className={styles.meetingTile}>
                  <time>{meeting.time}</time>
                  <strong>{meeting.title}</strong>
                  <span>{meeting.context}</span>
                </button>
              ))}
            </PrototypeRail>
          )}
        </section>

        <section className={styles.homeSection} aria-labelledby="news-title">
          <SectionHeading><span id="news-title">Mes actualités</span></SectionHeading>
          <PrototypeRail label="Actualités récentes">
            {newsTiles.map((tile) => (
              <button key={`${tile.type}-${tile.title}`} type="button" className={styles.newsTile} data-tone={tile.tone as TileTone}>
                <TileIcon icon={tile.icon} />
                <span className={styles.newsType}>{tile.type}</span>
                <strong>{tile.title}</strong>
                <span className={styles.newsContext}>{tile.context}</span>
              </button>
            ))}
          </PrototypeRail>
        </section>
      </section>
    </main>
  )
}
