"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { assessBattleCardRichness } from "./battle-workspace-model"

// ─── Dynamic Playbooks · Lot 1 ──────────────────────────────────────────────
// Ce module ne porte plus que du présentationnel. Le wrapper `BattleCardsSection`
// (rail Desktop + sélecteur Mobile + `useState` de sélection) a été retiré : la
// sélection du compte vit désormais dans `SectorPlaybooksModal`, AU-DESSUS du
// retournement, pour survivre à un aller-retour Playbook ↔ Battle. Le rail est
// dans `BattleAccountRail`, le sélecteur mobile dans `BattleWorkspace`.

// ─── Dynamic Playbooks · Lot 2 ──────────────────────────────────────────────
// Refonte de `BattleCardContent` en lecture opérationnelle : petites cartes,
// bullets courts, 6 axes dans l'ordre du cadrage, distinction forte entre
// donnée disponible et donnée absente (`assessBattleCardRichness`, socle pur
// testable dans `battle-workspace-model.ts`). Toujours zéro fetch : uniquement
// `CompetitiveMapActor`, déjà en mémoire.

type BulletTone = "brass" | "neutral" | "alert" | "muted" | "positive" | "warning"

const BULLET_TONE_CLASSES: Record<BulletTone, string> = {
  brass: "border-brand-brass/20 bg-brand-brass/[0.05] text-white/90",
  neutral: "border-white/10 bg-slate-900/40 text-white/85",
  alert: "border-rose-500/25 bg-rose-950/20 text-rose-200/90",
  muted: "border-white/5 bg-white/[0.02] text-white/65",
  positive: "border-emerald-500/20 bg-emerald-950/10 text-white/85",
  warning: "border-amber-500/20 bg-amber-950/10 text-white/85",
}

/** Petite carte de lecture : un fait, un bullet, jamais un mur de texte. */
function RevisionBullet({ tone = "neutral", children }: { tone?: BulletTone; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border p-2.5 text-xs leading-relaxed", BULLET_TONE_CLASSES[tone])}>
      {children}
    </div>
  )
}

const SECTION_LABEL_TONE_CLASSES: Record<"brass" | "alert" | "neutral", string> = {
  brass: "text-brand-brass",
  alert: "text-rose-400",
  neutral: "text-white/45",
}

/** En-tête d'axe : icône sobre + label court, jamais un paragraphe. */
function RevisionSection({
  icon,
  label,
  tone = "brass",
  children,
}: {
  icon: string
  label: string
  tone?: "brass" | "alert" | "neutral"
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h4 className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", SECTION_LABEL_TONE_CLASSES[tone])}>
        <span aria-hidden="true">{icon}</span>
        {label}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

/**
 * `profile_json = '{}'` — mesuré en base sur 5 entrées / 23 (Lot 0 §10.4,
 * segment « Hébergement & résidences de tourisme »). Aucun contenu générique,
 * aucun repli sur un autre compte : un message net, rien d'autre.
 */
function BattleCardNotEnrichedState() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
      <p className="text-xs font-semibold text-white/70">Battle Card pas encore enrichie</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-white/45">
        Aucun élément de préparation n’est encore disponible pour ce compte. Les informations
        apparaîtront automatiquement dès la prochaine ingestion de cartographie concurrentielle.
      </p>
    </div>
  )
}

export function BattleCardContent({ actor }: { actor: CompetitiveMapActor }) {
  const { details } = actor
  const { richness, filledAxisCount, totalAxisCount } = assessBattleCardRichness(actor)

  return (
    <div className="space-y-5 text-white">
      {/* Header Fiche */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-brand-brass/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              {actor.categoryLabel}
            </span>
            {actor.isBenchmarkAccount ? (
              <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Compte étalon ★
              </span>
            ) : null}
            <span className="text-[10px] text-white/40">
              Confiance {actor.confidence}
            </span>
            {richness === "rich" && filledAxisCount < totalAxisCount ? (
              <span
                className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/50"
                title="Nombre d'axes de préparation documentés sur les 6 attendus"
              >
                {filledAxisCount}/{totalAxisCount} axes
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-bold text-brand-brass">
              Appétence {actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "N/A"}
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-medium text-white/70">
              {actor.accessibilityScore !== null ? `Accessibilité ${actor.accessibilityScore}/5` : "Accès non renseigné"}
            </span>
          </div>
        </div>

        <h3 className="mt-2.5 font-heading text-lg font-bold text-white">
          {actor.name}
        </h3>

        {/* Chiffres clés en grille */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Chiffre d&apos;affaires</span>
            <span className="mt-0.5 block font-bold text-white">
              {actor.revenueEstimateMeur !== null ? `${actor.revenueEstimateMeur} M€` : "Non publié"}
              {actor.revenueExercice ? ` (${actor.revenueExercice})` : ""}
            </span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Effectif France</span>
            <span className="mt-0.5 block font-bold text-white">
              {actor.headcountFrance ?? "Non renseigné"}
            </span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Positionnement</span>
            <span className="mt-0.5 block font-semibold text-white/80 truncate" title={actor.positioning ?? ""}>
              {actor.positioning ?? "Standard"}
            </span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
            <span className="block text-[9px] uppercase tracking-wider text-white/40">Maillon chaîne</span>
            <span className="mt-0.5 block font-semibold text-white/80 truncate" title={details.maillon ?? ""}>
              {details.maillon ?? "Acteur direct"}
            </span>
          </div>
        </div>
      </div>

      {richness === "empty" ? <BattleCardNotEnrichedState /> : null}

      {richness === "sparse" ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/50">
          Aucun élément de préparation formalisé pour ce compte — seules des inconnues à qualifier
          ont été identifiées ci-dessous.
        </div>
      ) : null}

      {richness === "rich" ? (
        <>
          {/* ⚡ Pourquoi maintenant */}
          {details.triggers.length > 0 ? (
            <RevisionSection icon="⚡" label="Pourquoi maintenant">
              {details.triggers.map((trigger, idx) => (
                <RevisionBullet key={idx} tone="brass">{trigger}</RevisionBullet>
              ))}
            </RevisionSection>
          ) : null}

          {/* 🎯 Angle d'entrée */}
          {(actor.angleEntree || details.traductionCommerciale.length > 0) ? (
            <RevisionSection icon="🎯" label="Angle d’entrée">
              {actor.angleEntree ? (
                <RevisionBullet tone="neutral">
                  <strong className="text-brand-brass">Angle : </strong>
                  {actor.angleEntree}
                </RevisionBullet>
              ) : null}
              {details.traductionCommerciale.map((item, idx) => (
                <RevisionBullet key={idx} tone="muted">{item}</RevisionBullet>
              ))}
            </RevisionSection>
          ) : null}

          {/* 👤 À qui parler */}
          {details.coucheEsn.length > 0 ? (
            <RevisionSection icon="👤" label="À qui parler">
              {details.coucheEsn.map((item, idx) => (
                <RevisionBullet key={idx} tone="neutral">{item}</RevisionBullet>
              ))}
            </RevisionSection>
          ) : null}

          {/* 🛡 Points de vigilance */}
          {details.lignesRouges.length > 0 ? (
            <RevisionSection icon="🛡" label="Points de vigilance" tone="alert">
              {details.lignesRouges.map((item, idx) => (
                <RevisionBullet key={idx} tone="alert">{item}</RevisionBullet>
              ))}
            </RevisionSection>
          ) : null}

          {/* 🧩 Chantiers */}
          {(details.chantiersTechnologiques.length > 0 || details.iaAnnonceVsDeploye) ? (
            <RevisionSection icon="🧩" label="Chantiers" tone="neutral">
              {details.iaAnnonceVsDeploye ? (
                <RevisionBullet tone="muted">
                  <strong className="text-white/70">IA annoncé vs déployé : </strong>
                  {details.iaAnnonceVsDeploye}
                </RevisionBullet>
              ) : null}
              {details.chantiersTechnologiques.map((item, idx) => (
                <RevisionBullet key={idx} tone="muted">{item}</RevisionBullet>
              ))}
            </RevisionSection>
          ) : null}

          {/* ⚖ Forces / vulnérabilités */}
          {(actor.forces || actor.vulnerability) ? (
            <section className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                <span aria-hidden="true">⚖</span>
                Forces / vulnérabilités
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {actor.forces ? (
                  <RevisionBullet tone="positive">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      Forces
                    </span>
                    {actor.forces}
                  </RevisionBullet>
                ) : null}
                {actor.vulnerability ? (
                  <RevisionBullet tone="warning">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-amber-400">
                      Vulnérabilité
                    </span>
                    {actor.vulnerability}
                  </RevisionBullet>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {/* ❓ À qualifier — présent quelle que soit la richesse, y compris sparse */}
      {details.trous.length > 0 ? (
        <RevisionSection icon="❓" label="À qualifier" tone="neutral">
          {details.trous.map((trou, idx) => (
            <RevisionBullet key={idx} tone="muted">{trou}</RevisionBullet>
          ))}
        </RevisionSection>
      ) : null}
    </div>
  )
}
