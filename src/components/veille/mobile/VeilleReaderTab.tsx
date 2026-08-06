"use client"

import { useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import type { CompanyContextStats, VeilleArticle } from "@/app/(app)/veille/_data/veille-data"
import {
  IconAlertCircle,
  IconBook,
  IconChevronRight,
  IconExternalLink,
  IconRadar,
} from "./icons"
import { formatNewsDate, normalizeCategory } from "./veille-mobile-view-models"

type ArticleAction = "pitch" | "note" | "opportunity" | "qualify"

type VeilleReaderTabProps = {
  article: VeilleArticle | null
  matchedCompany: CompanyContextStats | null
  watchedGroupsCount: number
  onOpenSignals: () => void
  onAction: (action: ArticleAction) => void
}

export function VeilleReaderTab({
  article,
  matchedCompany,
  watchedGroupsCount,
  onOpenSignals,
  onAction,
}: VeilleReaderTabProps) {
  const [actionsOpen, setActionsOpen] = useState(false)

  if (!article) {
    return (
      <div className="veille-scrollbar h-full overflow-y-auto bg-surface px-6 py-16">
        <p className="text-center text-sm leading-6 text-muted">
          Aucun article de veille disponible pour le moment. Le briefing hebdomadaire alimentera cette
          lecture dès son prochain passage.
        </p>
        <div className="mt-8">
          <WatchedAccountsLink count={watchedGroupsCount} onClick={onOpenSignals} />
        </div>
      </div>
    )
  }

  const category = normalizeCategory(article.categorie)
  const publishedLabel = formatNewsDate(article.published_at)

  const handleAction = (action: ArticleAction) => {
    setActionsOpen(false)
    onAction(action)
  }

  return (
    <div className="veille-scrollbar h-full overflow-y-auto overscroll-contain bg-surface">
      <article className="px-4 pb-6 pt-5">
        {category ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">{category.label}</p>
        ) : null}

        <p className="mt-2 text-[13px] text-muted">
          {[article.source_name, publishedLabel].filter(Boolean).join(" • ")}
        </p>

        <h2 className="mt-3 font-heading text-[26px] font-bold leading-[1.22] tracking-tight text-heading">
          {article.titre_fr}
        </h2>

        {article.resume ? (
          <p className="mt-4 text-[15px] leading-[1.6] text-body">{article.resume}</p>
        ) : null}

        {article.analyse_kredo ? (
          <ReaderSection
            icon={<IconAlertCircle className="size-7" />}
            title="Pourquoi c'est important"
            body={article.analyse_kredo}
          />
        ) : null}

        {article.action_commerciale ? (
          <ReaderSection
            icon={<IconBook className="size-7" />}
            title="Lecture commerciale"
            body={article.action_commerciale}
          />
        ) : null}

        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex min-h-14 items-center gap-3 border-t border-border pt-5 text-primary outline-none focus-visible:ring-2 focus-visible:ring-heading"
          >
            <IconExternalLink className="size-6 shrink-0" />
            <span className="flex-1 text-[15px] font-semibold">Lire la source</span>
            <IconChevronRight className="size-5 shrink-0" />
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-small)] border border-border bg-surface px-4 text-[15px] font-semibold text-heading outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading"
        >
          Actions commerciales
        </button>

        <div className="mt-6 border-t border-border pt-5">
          <WatchedAccountsLink count={watchedGroupsCount} onClick={onOpenSignals} />
        </div>
      </article>

      <AppDrawer
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        side="bottom"
        title="Actions commerciales"
        description={
          matchedCompany
            ? `Compte détecté : ${matchedCompany.name}`
            : "Qualifiez le signal pour le rattacher à un compte."
        }
      >
        {/* `AppDrawer` masque sa `description` en mobile : on la redonne ici. */}
        {matchedCompany ? null : (
          <p className="mb-4 text-sm leading-6 text-muted">
            Qualifiez le signal pour le rattacher à un compte.
          </p>
        )}

        {matchedCompany ? (
          <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-small)] border border-border bg-canvas px-3 py-3">
            <CompanyLogo
              name={matchedCompany.name}
              logoPath={matchedCompany.logoPath}
              website={matchedCompany.website}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-heading">{matchedCompany.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {matchedCompany.contactsCount} contacts · {matchedCompany.interactionsCount} interactions ·{" "}
                {matchedCompany.docsCount} analyses
              </p>
            </div>
          </div>
        ) : null}

        <ul className="divide-y divide-border border-y border-border">
          <ActionRow
            label="Rédiger un pitch ou un mail"
            hint="Ouvre le composeur de communication."
            onClick={() => handleAction("pitch")}
          />
          <ActionRow
            label="Créer une note de compte"
            hint={matchedCompany ? "Journalise le signal sur le compte." : "Nécessite un compte rattaché."}
            disabled={!matchedCompany}
            onClick={() => handleAction("note")}
          />
          <ActionRow
            label="Créer une opportunité"
            hint={matchedCompany ? "Ouvre une opportunité liée au signal." : "Nécessite un compte rattaché."}
            disabled={!matchedCompany}
            onClick={() => handleAction("opportunity")}
          />
          <ActionRow
            label="Qualifier le signal"
            hint="Rattache le signal à un compte et à un secteur."
            onClick={() => handleAction("qualify")}
          />
        </ul>
      </AppDrawer>
    </div>
  )
}

function ReaderSection({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-bold leading-6 text-primary">{title}</h3>
          <p className="mt-2 text-[15px] leading-[1.6] text-body">{body}</p>
        </div>
      </div>
    </section>
  )
}

function WatchedAccountsLink({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-heading"
    >
      <span className="shrink-0 text-primary">
        <IconRadar className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-heading">Signaux des comptes surveillés</span>
        <span className="mt-0.5 block text-xs text-muted">
          {count === 0
            ? "Aucun compte sous surveillance active."
            : `${count} compte${count > 1 ? "s" : ""} suivi${count > 1 ? "s" : ""}`}
        </span>
      </span>
      <span className="shrink-0 text-heading">
        <IconChevronRight className="size-5" />
      </span>
    </button>
  )
}

function ActionRow({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string
  hint: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex min-h-16 w-full items-center gap-3 px-1 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
          disabled ? "cursor-not-allowed opacity-50" : "hover:bg-surface-hover/60",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-heading">{label}</span>
          <span className="mt-0.5 block text-xs text-muted">{hint}</span>
        </span>
        {disabled ? null : (
          <span className="shrink-0 text-heading">
            <IconChevronRight className="size-5" />
          </span>
        )}
      </button>
    </li>
  )
}
