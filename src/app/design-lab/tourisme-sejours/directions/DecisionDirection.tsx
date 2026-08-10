"use client";

import type { StudySectionId, TourismStudy } from "../study-data";
import { AccountBrief, AccountTabs, CompleteStudy, ConfidenceWarning, SectionNav } from "../StudyShared";
import styles from "../tourism-study.module.css";

export function DecisionDirection({ study, selectedAccountId, activeSection, onSelectAccount, onNavigate }: {
  study: TourismStudy;
  selectedAccountId: string;
  activeSection: StudySectionId;
  onSelectAccount: (id: string) => void;
  onNavigate: (id: StudySectionId) => void;
}) {
  const selected = study.accounts.find((account) => account.id === selectedAccountId) ?? study.accounts[0];
  const deadlineRank = (date: string) => date.includes("Mars") ? 1 : date.includes("Juillet") ? 2 : 3;
  const orderedDeadlines = [...study.deadlines].sort((left, right) => deadlineRank(left.date) - deadlineRank(right.date));
  return (
    <div className={styles.decisionDirection}>
      <header className={styles.decisionHero}>
        <div><h1>Marché Tourisme & Séjours</h1><p>Briefing commercial avant prospection ou rendez-vous</p></div>
        <div className={styles.decisionFolio}>C<small>Meilleure actionnabilité commerciale</small></div>
      </header>
      <SectionNav activeSection={activeSection} onNavigate={onNavigate} />
      <ConfidenceWarning study={study} compact />
      <section className={styles.decisionWorkspace}>
        <div className={styles.decisionSequence}>
          <section>
            <header><span>1</span><h2>Pourquoi maintenant</h2></header>
            <div className={styles.deadlineList}>
              {orderedDeadlines.map((deadline) => <div key={deadline.name}><strong>{deadline.name}</strong><time>{deadline.date}</time></div>)}
            </div>
          </section>
          <section>
            <header><span>2</span><h2>Qui attaquer</h2></header>
            <div className={styles.decisionPriorities}>
              {study.priorities.map((priority, index) => (
                <button key={priority.name} type="button" onClick={() => onSelectAccount(study.accounts.find((account) => account.name === priority.name)?.id ?? selectedAccountId)}>
                  <span>{index + 1}</span><b>{priority.name}</b><strong>{priority.appetite}</strong>
                </button>
              ))}
            </div>
          </section>
          <section>
            <header><span>3</span><h2>Comment entrer</h2></header>
            <p>{selected.entryAngle}</p>
          </section>
        </div>
        <div className={styles.decisionMain}>
          <section className={styles.timelinePanel}>
            <h2>Échéances réglementaires communes</h2>
            <div className={styles.timelineRail}>
              {orderedDeadlines.map((deadline) => <div key={deadline.name}><time>{deadline.date}</time><i /><strong>{deadline.name}</strong></div>)}
            </div>
          </section>
          <section className={styles.selectedDossier}>
            <AccountTabs accounts={study.accounts} selectedAccountId={selectedAccountId} onSelect={onSelectAccount} />
            <AccountBrief account={selected} detailed />
          </section>
        </div>
      </section>
      <CompleteStudy study={study} tone="decision" />
    </div>
  );
}
