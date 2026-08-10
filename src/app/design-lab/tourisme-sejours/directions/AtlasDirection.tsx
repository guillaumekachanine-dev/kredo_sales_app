"use client";

import type { StudySectionId, TourismStudy } from "../study-data";
import { AccountBrief, AccountTabs, CompleteStudy, ConfidenceWarning, SectionNav } from "../StudyShared";
import styles from "../tourism-study.module.css";

export function AtlasDirection({ study, selectedAccountId, activeSection, onSelectAccount, onNavigate }: {
  study: TourismStudy;
  selectedAccountId: string;
  activeSection: StudySectionId;
  onSelectAccount: (id: string) => void;
  onNavigate: (id: StudySectionId) => void;
}) {
  const selected = study.accounts.find((account) => account.id === selectedAccountId) ?? study.accounts[0];
  return (
    <div className={styles.atlasDirection}>
      <aside className={styles.atlasRail}>
        <p>Atlas éditorial</p>
        <SectionNav activeSection={activeSection} onNavigate={onNavigate} vertical />
        <small>Lecture longue · preuve progressive</small>
      </aside>
      <div className={styles.atlasCanvas}>
        <header className={styles.atlasHero}>
          <div>
            <h1>Marché Tourisme & Séjours</h1>
            <p>Cartographie concurrentielle · France entière · 5 comptes étudiés</p>
          </div>
          <div className={styles.atlasFolio}>A<small>Meilleure lecture longue</small></div>
        </header>
        <ConfidenceWarning study={study} />
        <section className={styles.atlasOpening}>
          <div>
            <p className={styles.sectionKicker}>Synthèse exécutive</p>
            <h2>Une fenêtre commerciale ouverte par la conformité et la modernisation</h2>
            <div className={styles.priorityLedger}>
              {study.priorities.map((priority, index) => (
                <article key={priority.name}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><h3>{priority.name}</h3><p>{priority.whyNow}</p></div>
                  <strong>{priority.appetite}</strong>
                </article>
              ))}
            </div>
          </div>
          <aside className={styles.atlasAccountFocus}>
            <p className={styles.sectionKicker}>Compte en lecture</p>
            <AccountTabs accounts={study.accounts} selectedAccountId={selectedAccountId} onSelect={onSelectAccount} />
            <AccountBrief account={selected} />
          </aside>
        </section>
        <CompleteStudy study={study} tone="atlas" />
      </div>
    </div>
  );
}
