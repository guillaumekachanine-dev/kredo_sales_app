import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"

const account = {
  name: "EIFFAGE",
  sector: "Construction & Cadre bâti",
  segment: "Travaux publics",
  website: "https://www.eiffage.com",
  location: "France",
  lifecycle: "Compte stratégique",
}

const facts = [
  "Construction & infrastructures",
  "Segment : Travaux publics",
  "Couverture nationale",
  "Compte suivi dans le CRM",
]

const metrics = [
  { value: "18", label: "contacts connus", tone: "dark" },
  { value: "4", label: "opportunités actives", tone: "light" },
  { value: "6", label: "missions suivies", tone: "light" },
  { value: "9", label: "enjeux ouverts", tone: "dark" },
] as const

const priorities = [
  {
    title: "Consolider la connaissance",
    description: "Actualiser les faits structurants, les contacts et les signaux exploitables du compte.",
    icon: "chart",
  },
  {
    title: "Qualifier les enjeux",
    description: "Faire émerger les problèmes prioritaires et les points d’entrée commercialement crédibles.",
    icon: "target",
  },
  {
    title: "Préparer l’approche",
    description: "Transformer la connaissance du compte en stratégie d’adressage et prises de parole ciblées.",
    icon: "gear",
  },
] as const

function PriorityIcon({ icon }: { icon: "chart" | "target" | "gear" }) {
  const common = {
    className: "size-6",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (icon === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19V3" />
      </svg>
    )
  }

  if (icon === "target") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M18 6 21 3" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.37.32.7.6 1 .3.29.68.48 1.1.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  )
}

function MetricMosaic() {
  return (
    <div className="relative mt-10 aspect-[2/1.38] w-full overflow-hidden border-2 border-edito-ink bg-edito-surface">
      <div
        className="absolute left-0 top-0 flex h-1/2 w-[55%] items-center justify-center bg-primary-deep px-6 text-center text-white"
        style={{ clipPath: "polygon(0 0, 100% 0, 82% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[0]} />
      </div>
      <div
        className="absolute right-0 top-0 flex h-1/2 w-[50%] items-center justify-center bg-edito-surface px-6 text-center text-edito-heading"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[1]} />
      </div>
      <div
        className="absolute bottom-0 left-0 flex h-1/2 w-[50%] items-center justify-center bg-edito-surface px-6 text-center text-edito-heading"
        style={{ clipPath: "polygon(0 0, 82% 0, 100% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[2]} />
      </div>
      <div
        className="absolute bottom-0 right-0 flex h-1/2 w-[55%] items-center justify-center bg-primary-deep px-6 text-center text-white"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[3]} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edito-ink" />
    </div>
  )
}

function MetricContent({ value, label }: { value: string; label: string; tone: "dark" | "light" }) {
  return (
    <div>
      <div className="text-[clamp(2rem,3.2vw,3.25rem)] font-bold leading-none tracking-tight">{value}</div>
      <div className="mt-2 text-[11px] font-semibold leading-4 opacity-80">{label}</div>
    </div>
  )
}

function FooterIcon({ type }: { type: "web" | "status" | "location" }) {
  const common = {
    className: "size-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (type === "web") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
    )
  }

  if (type === "status") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16.5 8.5" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function AccountIntelligenceTemplateLab() {
  return (
    <main data-theme="edito-bright-cockpit" className="min-h-screen bg-canvas px-6 py-10 font-sans text-edito-body">
      <div className="mx-auto w-full max-w-[1180px] overflow-hidden border border-edito-border bg-edito-surface">
        <div className="h-16 bg-edito-surface" />

        <section className="relative h-[500px] overflow-hidden border-y border-edito-border">
          <div
            className="absolute inset-0 bg-edito-navy"
            style={{ clipPath: "polygon(0 0, 65% 0, 43% 100%, 0 100%)" }}
          />
          <div
            className="absolute inset-0 bg-edito-surface"
            style={{ clipPath: "polygon(65% 0, 68.2% 0, 46.2% 100%, 43% 100%)" }}
          />
          <div
            className="absolute inset-0 bg-primary"
            style={{ clipPath: "polygon(68.2% 0, 100% 0, 100% 100%, 46.2% 100%)" }}
          />

          <div className="absolute left-[7%] top-1/2 w-[31%] -translate-y-1/2">
            <div className="aspect-[1.35/1] w-full border-2 border-white/90 bg-white p-7">
              <CompanyLogo
                name={account.name}
                website={null}
                fill
                className="h-full w-full rounded-none border-0 bg-white text-[2.75rem]"
              />
            </div>
          </div>

          <div className="absolute right-[5.8%] top-[12%] w-[33%] text-white">
            <div className="text-right">
              <p className="text-[22px] font-bold uppercase leading-none tracking-tight">{account.name}</p>
              <p className="mt-2 truncate text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">
                {account.segment}
              </p>
            </div>

            <div className="mt-14">
              <div className="inline-flex border-2 border-white bg-edito-surface px-3 py-1.5 text-[27px] font-black uppercase leading-none tracking-tight text-primary-deep">
                Business
              </div>
              <div className="mt-3 text-[clamp(3.8rem,5.2vw,5.35rem)] font-black uppercase leading-[0.88] tracking-[-0.045em]">
                Account
              </div>
              <div className="mt-1 whitespace-nowrap text-[clamp(2.45rem,3.7vw,3.85rem)] font-black uppercase leading-[0.9] tracking-[-0.035em]">
                Intelligence
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-[58px] px-[64px] pb-12 pt-[58px]">
          <div>
            <h2 className="text-[34px] font-black leading-none tracking-tight text-edito-ink">Le compte</h2>
            <p className="mt-5 max-w-[470px] text-[14px] leading-6 text-edito-body">
              Compte pilote utilisé pour régler la géométrie du futur template Account Intelligence. Le contenu est volontairement secondaire : cette vue sert d’abord à valider le rythme, les proportions et la hiérarchie visuelle.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3">
              {facts.map((fact) => (
                <div key={fact} className="flex items-start gap-3 text-[13px] leading-5 text-edito-body">
                  <span className="mt-[7px] size-2 shrink-0 bg-primary" aria-hidden="true" />
                  <span>{fact}</span>
                </div>
              ))}
            </div>

            <MetricMosaic />
          </div>

          <div>
            <h2 className="text-[34px] font-black leading-none tracking-tight text-edito-ink">Situation</h2>
            <p className="mt-5 text-[14px] leading-6 text-edito-body">
              Cette zone reprend le rôle du bloc narratif principal de la référence : une lecture courte de la situation du compte, sans carte décorative ni empilement de badges. Dans la version finale, elle consommera la synthèse canonique déjà disponible dans le read model du compte.
            </p>

            <h2 className="mt-12 text-[34px] font-black leading-none tracking-tight text-edito-ink">Priorités KREDO</h2>
            <div className="mt-6 space-y-5">
              {priorities.map((priority) => (
                <div key={priority.title} className="grid grid-cols-[52px_1fr] items-start gap-5">
                  <div className="flex size-[52px] items-center justify-center bg-edito-navy text-white">
                    <PriorityIcon icon={priority.icon} />
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.06em] text-edito-ink">
                      {priority.title}
                    </h3>
                    <p className="mt-1 text-[12px] leading-5 text-edito-body">{priority.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mx-[64px] grid grid-cols-3 gap-8 border-t border-edito-border py-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-edito-ink text-edito-ink">
              <FooterIcon type="web" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-edito-muted">Site web</p>
              <p className="text-[12px] font-bold text-edito-ink">eiffage.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-edito-ink text-edito-ink">
              <FooterIcon type="status" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-edito-muted">Statut CRM</p>
              <p className="text-[12px] font-bold text-edito-ink">{account.lifecycle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-edito-ink text-edito-ink">
              <FooterIcon type="location" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-edito-muted">Localisation</p>
              <p className="text-[12px] font-bold text-edito-ink">{account.location}</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
