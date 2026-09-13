// ─── Rapport de couverture d'une conversion ─────────────────────────────────
// La preuve du « zéro perte », lisible : texte intégral restitué, blocs classés ou
// rangés en annexe, URL toutes rattachées, sources qualifiées ou par défaut, et
// importabilité du fichier de sources dans le wizard corpus.

import { cn } from "@/lib/utils"

import {
  STUDY_QUALIFICATION_LABELS,
  STUDY_QUALIFICATIONS,
  type StudyCoverage,
  type StudyProducer,
} from "../domain/study-contracts"

function Row({ ok, label, detail }: { ok: boolean | null; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2.5 border-t border-edito-border py-2 first:border-t-0">
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          ok === null ? "bg-edito-chip text-edito-muted" : ok ? "bg-edito-navy text-edito-surface" : "bg-danger text-edito-surface",
        )}
      >
        {ok === null ? "·" : ok ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-edito-heading">
          <span className="sr-only">{ok === null ? "Information : " : ok ? "Conforme : " : "Point d'attention : "}</span>
          {label}
        </p>
        <p className="text-[11px] leading-relaxed text-edito-muted">{detail}</p>
      </div>
    </li>
  )
}

export function StudyCoverageReport({
  coverage,
  producer = "chatgpt_deep_research",
}: {
  coverage: StudyCoverage
  producer?: StudyProducer
}) {
  const qualifications = STUDY_QUALIFICATIONS.map(
    (q) => `${coverage.statements.by_qualification[q]} ${STUDY_QUALIFICATION_LABELS[q].toLowerCase()}`,
  ).join(" · ")

  const isWork = producer === "chatgpt_work"

  return (
    <section aria-label="Rapport de couverture" className="rounded-lg border border-edito-border bg-edito-surface px-4 py-2">
      <ul>
        <Row
          ok={coverage.text.identical}
          label={coverage.text.identical ? "Texte intégral restitué" : "Texte incomplet"}
          detail={`${coverage.text.blocks_non_ws_chars.toLocaleString("fr-FR")} / ${coverage.text.raw_non_ws_chars.toLocaleString("fr-FR")} caractères de l'étude présents dans les blocs, dans l'ordre.`}
        />
        <Row
          ok={coverage.blocks.fallback === 0}
          label={`${coverage.blocks.total} blocs, tous restitués`}
          detail={
            coverage.blocks.fallback === 0
              ? "Chaque bloc a été classé dans une section par la conversion."
              : `${coverage.blocks.fallback} bloc(s) non classé(s) par la conversion : rangés en annexe, texte conservé.`
          }
        />
        <Row
          ok={coverage.urls.in_sources + coverage.urls.excluded.length === coverage.urls.detected}
          label={`${coverage.sources.documents} documents cités · ${coverage.sources.citation_numbers} citations`}
          detail={
            coverage.urls.excluded.length
              ? `Écartés, avec motif : ${coverage.urls.excluded.map((entry) => `${entry.url} (${entry.reason})`).join(" ; ")}`
              : "Toutes les URL de l'étude sont rattachées à un document."
          }
        />
        <Row
          ok={coverage.sources.authorities_default_qualified === 0}
          label={
            isWork
              ? `${coverage.sources.authorities} autorités (domaines) répertoriées`
              : `${coverage.sources.authorities} sources (domaines) qualifiées au format E3`
          }
          detail={
            isWork
              ? "Toutes les autorités identifiées dans le livrable Work sont associées à leurs documents."
              : coverage.sources.authorities_default_qualified === 0
                ? "Toutes qualifiées par la conversion."
                : `${coverage.sources.authorities_default_qualified} qualifiée(s) par défaut (tier 4, découverte) : à revoir avant import.`
          }
        />
        <Row
          ok={null}
          label={`${coverage.statements.total} affirmations extraites`}
          detail={`${qualifications}${coverage.statements.fallback_qualification ? ` · ${coverage.statements.fallback_qualification} qualification(s) non rendue(s)` : ""}. ${coverage.blocks.without_statement} bloc(s) de texte sans affirmation — leur texte reste lisible dans l'étude intégrale.`}
        />
        <Row
          ok={isWork && !coverage.registry.importable ? null : coverage.registry.importable}
          label={
            isWork && !coverage.registry.importable
              ? "Corpus de sources — normalisation E3 à venir"
              : coverage.registry.importable
                ? "Fichier de sources importable comme corpus"
                : "Fichier de sources non importable"
          }
          detail={
            isWork && !coverage.registry.importable
              ? "Étude valide. Le corpus de sources nécessite encore une normalisation avant son ajout à Gestion des sources."
              : coverage.registry.importable
                ? "Validé par le parseur du wizard « Importer un corpus »."
                : coverage.registry.errors.join(" ; ")
          }
        />
        {coverage.entity_conflicts.length > 0 ? (
          <Row
            ok={false}
            label="Identité légale divergente entre passes"
            detail={coverage.entity_conflicts.map((conflict) => `${conflict.field} : ${conflict.values.join(" / ")}`).join(" ; ")}
          />
        ) : null}
      </ul>
    </section>
  )
}
