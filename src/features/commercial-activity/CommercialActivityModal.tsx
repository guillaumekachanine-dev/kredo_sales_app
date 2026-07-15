"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell";
import { loadCommercialActivitySnapshot } from "./commercial-activity-actions";
import { CommercialActivityAccounts } from "./CommercialActivityAccounts";
import { CommercialActivityDistribution } from "./CommercialActivityDistribution";
import {
  CommercialActivityFilters,
  type CommercialActivityCustomRange,
} from "./CommercialActivityFilters";
import { CommercialActivityMobileAccounts } from "./CommercialActivityMobileAccounts";
import { CommercialActivityMobileLayout } from "./CommercialActivityMobileLayout";
import { CommercialActivityMobileResults } from "./CommercialActivityMobileResults";
import { CommercialActivityMobileSummary } from "./CommercialActivityMobileSummary";
import { CommercialActivityNavigation } from "./CommercialActivityNavigation";
import { CommercialActivityOutcomes } from "./CommercialActivityOutcomes";
import { CommercialActivityOverview } from "./CommercialActivityOverview";
import { CommercialActivityRhythm } from "./CommercialActivityRhythm";
import type {
  CommercialActivityFilterNature,
  CommercialActivityFilters as CommercialActivityFilterValues,
  CommercialActivityMobileSection,
  CommercialActivityPeriodPreset,
  CommercialActivitySection,
  CommercialActivitySnapshot,
} from "./commercial-activity-types";

export type CommercialActivityDisplayMode = "desktop" | "mobile";

const DAY = 86_400_000;
function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
function fromDateInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function presetRange(
  preset: Exclude<CommercialActivityPeriodPreset, "custom">,
) {
  const end = new Date();
  const days =
    preset === "7d"
      ? 7
      : preset === "4w"
        ? 28
        : preset === "12w"
          ? 84
          : preset === "quarter"
            ? 91
            : 365;
  return { from: new Date(end.getTime() - days * DAY), to: end };
}
function asFilters(
  preset: CommercialActivityPeriodPreset,
  nature: CommercialActivityFilterNature,
  custom: CommercialActivityCustomRange,
): CommercialActivityFilterValues {
  const range =
    preset === "custom"
      ? {
          from: fromDateInput(custom.from),
          to: new Date(fromDateInput(custom.to).getTime() + DAY),
        }
      : presetRange(preset);
  return { from: range.from.toISOString(), to: range.to.toISOString(), nature };
}

function desktopPanel(
  section: CommercialActivitySection,
  snapshot: CommercialActivitySnapshot,
) {
  switch (section) {
    case "rhythm":
      return <CommercialActivityRhythm snapshot={snapshot} />;
    case "distribution":
      return <CommercialActivityDistribution snapshot={snapshot} />;
    case "outcomes":
      return <CommercialActivityOutcomes snapshot={snapshot} />;
    case "accounts":
      return <CommercialActivityAccounts snapshot={snapshot} />;
    default:
      return <CommercialActivityOverview snapshot={snapshot} />;
  }
}

export function CommercialActivityModal({
  open,
  onClose,
  displayMode = "desktop",
}: {
  open: boolean;
  onClose: () => void;
  displayMode?: CommercialActivityDisplayMode;
}) {
  const [desktopSection, setDesktopSection] =
    useState<CommercialActivitySection>("overview");
  const [mobileSection, setMobileSection] =
    useState<CommercialActivityMobileSection>("summary");
  const [preset, setPreset] = useState<CommercialActivityPeriodPreset>("12w");
  const [nature, setNature] =
    useState<CommercialActivityFilterNature>("commercial");
  const initialRange = useMemo(() => presetRange("12w"), []);
  const [customRange, setCustomRange] = useState<CommercialActivityCustomRange>(
    { from: toDateInput(initialRange.from), to: toDateInput(initialRange.to) },
  );
  const [snapshot, setSnapshot] = useState<CommercialActivitySnapshot | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const filters = useMemo(
    () => asFilters(preset, nature, customRange),
    [customRange, nature, preset],
  );

  const retry = useCallback(() => setReloadVersion((value) => value + 1), []);
  useEffect(() => {
    if (!open) return;
    let active = true;
    startTransition(async () => {
      try {
        setError(null);
        const next = await loadCommercialActivitySnapshot(filters);
        if (active) setSnapshot(next);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Chargement des données impossible",
          );
      }
    });
    return () => {
      active = false;
    };
  }, [filters, open, reloadVersion]);

  const controls = (
    <CommercialActivityFilters
      preset={preset}
      nature={nature}
      customRange={customRange}
      pending={pending}
      hasSnapshot={snapshot !== null}
      mode={displayMode}
      onPresetChange={setPreset}
      onNatureChange={setNature}
      onCustomRangeChange={setCustomRange}
    />
  );
  const initialLoading = snapshot === null && error === null;
  const activePanel = snapshot ? (
    displayMode === "mobile" ? (
      mobileSection === "results" ? (
        <CommercialActivityMobileResults snapshot={snapshot} nature={nature} />
      ) : mobileSection === "accounts" ? (
        <CommercialActivityMobileAccounts snapshot={snapshot} />
      ) : (
        <CommercialActivityMobileSummary
          snapshot={snapshot}
          preset={preset}
          nature={nature}
        />
      )
    ) : (
      desktopPanel(desktopSection, snapshot)
    )
  ) : null;
  const panelContent = (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {initialLoading
          ? "Chargement de l’activité commerciale"
          : pending
            ? "Mise à jour de l’activité commerciale"
            : snapshot
              ? "Activité commerciale à jour"
              : ""}
      </span>
      {error ? (
        <div
          role="alert"
          className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 shrink-0 rounded-lg border border-status-danger/30 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/70"
          >
            Réessayer
          </button>
        </div>
      ) : null}
      {initialLoading ? (
        <div
          className="flex min-h-80 flex-1 flex-col items-center justify-center gap-3"
          aria-busy="true"
        >
          <i
            className="size-7 animate-spin rounded-full border-2 border-brand-brass border-t-transparent motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p className="text-xs text-white/50">Chargement de l’activité…</p>
        </div>
      ) : snapshot ? (
        <div
          aria-busy={pending || undefined}
          className={`transition-opacity duration-150 motion-reduce:transition-none ${pending ? "opacity-70" : "opacity-100"}`}
        >
          {activePanel}
          {displayMode === "desktop" ? (
            <p className="px-6 pb-5 text-[10px] text-white/35">
              Données issues de l’Agenda, des interactions et du suivi
              commercial. Qualité globale de la période : elle ne suit pas le
              filtre de nature.
            </p>
          ) : null}
        </div>
      ) : error ? (
        <div className="flex min-h-80 items-center justify-center px-5 text-center text-sm text-white/55">
          Impossible de charger l’activité commerciale. Réessayez lorsque la
          connexion est disponible.
        </div>
      ) : (
        <div className="p-5 text-xs text-white/45">
          Aucune donnée à afficher.
        </div>
      )}
    </>
  );
  const desktopContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      {controls}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {panelContent}
      </div>
    </div>
  );
  const mobileContent = (
    <CommercialActivityMobileLayout
      section={mobileSection}
      onSectionChange={setMobileSection}
      filters={controls}
      pending={pending}
    >
      {panelContent}
    </CommercialActivityMobileLayout>
  );

  return (
    <IntelligenceSplitModalShell
      open={open}
      onClose={onClose}
      title="Activité commerciale"
      subtitle="Analyse des activités, résultats et comptes mobilisés"
      leftPaneWidth="38%"
      leftPane={
        <CommercialActivityNavigation
          section={desktopSection}
          onChange={setDesktopSection}
        />
      }
      rightPane={desktopContent}
      content={displayMode === "mobile" ? mobileContent : undefined}
      isMobile={displayMode === "mobile"}
    />
  );
}
