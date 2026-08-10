"use client";

import { useState } from "react";
import type { StudyAccount, StudySectionId, TourismStudy } from "./study-data";
import { StudyMarkdown } from "./StudyMarkdown";
import styles from "./tourism-study.module.css";

export const NAV_ITEMS: Array<{ id: StudySectionId; label: string }> = [
  { id: "synthese", label: "Synthèse" },
  { id: "matrice", label: "Matrice" },
  { id: "comparaison", label: "Comparaison" },
  { id: "comptes", label: "Comptes" },
  { id: "analyse", label: "Analyse" },
  { id: "qualite", label: "Preuves" },
];

export function SectionNav({ activeSection, onNavigate, vertical = false }: {
  activeSection: StudySectionId;
  onNavigate: (id: StudySectionId) => void;
  vertical?: boolean;
}) {
  return (
    <nav className={`${styles.sectionNav} ${vertical ? styles.sectionNavVertical : ""}`} aria-label="Sommaire de l’étude">
      {NAV_ITEMS.map((item, index) => (
        <button
          key={item.id}
          type="button"
          aria-current={activeSection === item.id ? "location" : undefined}
          onClick={() => onNavigate(item.id)}
          className={activeSection === item.id ? styles.sectionNavActive : undefined}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
        </button>
      ))}
    </nav>
  );
}

export function ConfidenceWarning({ study, compact = false }: { study: TourismStudy; compact?: boolean }) {
  return (
    <div className={`${styles.confidenceWarning} ${compact ? styles.confidenceWarningCompact : ""}`}>
      <span aria-hidden="true" className={styles.warningMark}>!</span>
      <div>
        <strong>Avertissement de production</strong>
        <p>Confiance globale plafonnée à <b>MOYENNE</b> · chiffres à reconfirmer avant tout usage externe ou contractuel.</p>
      </div>
      <time dateTime={study.snapshotDate}>Snapshot {new Date(`${study.snapshotDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</time>
    </div>
  );
}

export function AccountTabs({ accounts, selectedAccountId, onSelect }: {
  accounts: StudyAccount[];
  selectedAccountId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.accountTabs} role="tablist" aria-label="Comptes étudiés">
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          role="tab"
          aria-selected={account.id === selectedAccountId}
          onClick={() => onSelect(account.id)}
        >
          <span>{account.name}</span>
          <small>{account.appetite}/35</small>
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}><dt>{label}</dt><dd>{value}</dd></div>;
}

export function AccountBrief({ account, detailed = false }: { account: StudyAccount; detailed?: boolean }) {
  return (
    <article className={`${styles.accountBrief} ${detailed ? styles.accountBriefDetailed : ""}`}>
      <header>
        <div>
          <p>{account.categoryLabel} · confiance {account.confidence}</p>
          <h3>{account.name}</h3>
        </div>
        <strong>{account.appetite}<small>/35</small></strong>
      </header>
      <dl className={styles.metricRow}>
        <Metric label="Maturité numérique" value={`${account.digitalMaturity}/5`} />
        <Metric label="Empreinte métier" value={`${account.businessFootprint}/5`} />
        <Metric label="Trigger" value={account.triggerDate} />
      </dl>
      <section className={styles.entryAngle}>
        <h4>Angle d’entrée</h4>
        <p>{account.entryAngle}</p>
      </section>
      <section className={styles.avoidBlock}>
        <h4>Erreur commerciale à éviter</h4>
        <p>{account.avoid}</p>
      </section>
      {detailed ? (
        <section className={styles.hooksBlock}>
          <h4>Accroche & traduction commerciale</h4>
          <StudyMarkdown markdown={account.hooksMarkdown} compact />
        </section>
      ) : null}
    </article>
  );
}

function AppendixContent({ study, sectionId, content }: { study: TourismStudy; sectionId: StudySectionId; content: string }) {
  const [copied, setCopied] = useState(false);
  if (sectionId !== "json") return <StudyMarkdown markdown={content} />;

  const copyJson = async () => {
    await navigator.clipboard.writeText(study.jsonText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={styles.jsonArea}>
      <div className={styles.jsonToolbar}>
        <p>Export normé fourni par l’étude</p>
        <button type="button" onClick={copyJson}>{copied ? "JSON copié" : "Copier le JSON"}</button>
      </div>
      <pre tabIndex={0}><code>{study.jsonText}</code></pre>
      <section className={styles.citationSources}>
        <h3>Sources des citations</h3>
        <StudyMarkdown markdown={study.citationSources} compact />
      </section>
    </div>
  );
}

export function CompleteStudy({ study, tone }: { study: TourismStudy; tone: "atlas" | "radar" | "decision" }) {
  return (
    <div className={`${styles.completeStudy} ${styles[`completeStudy${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
      <header className={styles.sourceTitle}>
        <span>Source de vérité · étude intégrale</span>
        <h2>{study.title}</h2>
      </header>
      <section id="production" className={styles.reportSection}>
        <header className={styles.reportSectionHeader}><span>00</span><h2>Avertissement & périmètre</h2></header>
        <StudyMarkdown markdown={study.prelude} />
      </section>
      {study.sections.map((section) => section.isAppendix ? (
        <details key={section.id} id={section.id} className={styles.appendixSection}>
          <summary><span>{section.number}</span><strong>{section.title}</strong><small>Afficher la preuve</small></summary>
          <AppendixContent study={study} sectionId={section.id} content={section.content} />
        </details>
      ) : (
        <section key={section.id} id={section.id} className={styles.reportSection}>
          <header className={styles.reportSectionHeader}><span>{section.number}</span><h2>{section.title}</h2></header>
          <StudyMarkdown markdown={section.content} />
        </section>
      ))}
    </div>
  );
}
