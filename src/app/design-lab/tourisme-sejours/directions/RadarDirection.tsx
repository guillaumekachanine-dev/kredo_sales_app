"use client";

import type { StudySectionId, TourismStudy } from "../study-data";
import { StudyMatrix } from "../StudyMatrix";
import { AccountBrief, AccountTabs, CompleteStudy, ConfidenceWarning, SectionNav } from "../StudyShared";
import styles from "../tourism-study.module.css";

export function RadarDirection({ study, selectedAccountId, activeSection, onSelectAccount, onNavigate }: {
  study: TourismStudy;
  selectedAccountId: string;
  activeSection: StudySectionId;
  onSelectAccount: (id: string) => void;
  onNavigate: (id: StudySectionId) => void;
}) {
  const selected = study.accounts.find((account) => account.id === selectedAccountId) ?? study.accounts[0];
  return (
    <div className={styles.radarDirection}>
      <header className={styles.radarHero}>
        <div><h1>Marché Tourisme & Séjours</h1><p>Lecture comparative · 5 positions · 3 niveaux de confiance</p></div>
        <div className={styles.radarFolio}>B<small>Meilleure exploration comparative</small></div>
      </header>
      <SectionNav activeSection={activeSection} onNavigate={onNavigate} />
      <ConfidenceWarning study={study} compact />
      <section className={styles.radarWorkspace}>
        <StudyMatrix accounts={study.accounts} selectedAccountId={selectedAccountId} onSelect={onSelectAccount} />
        <aside className={styles.radarInspector}>
          <AccountTabs accounts={study.accounts} selectedAccountId={selectedAccountId} onSelect={onSelectAccount} />
          <AccountBrief account={selected} detailed />
        </aside>
      </section>
      <section className={styles.comparisonStrip} aria-label="Comparaison des comptes">
        {study.accounts.map((account) => (
          <button key={account.id} type="button" onClick={() => onSelectAccount(account.id)} aria-pressed={account.id === selectedAccountId}>
            <span>{account.name}<small>{account.categoryLabel}</small></span>
            <b>{account.digitalMaturity}/5<small>Numérique</small></b>
            <b>{account.businessFootprint}/5<small>Métier</small></b>
            <strong>{account.appetite}/35</strong>
          </button>
        ))}
      </section>
      <CompleteStudy study={study} tone="radar" />
    </div>
  );
}
