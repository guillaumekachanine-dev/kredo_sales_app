"use client";

import { useCallback, useState } from "react";
import type { StudySectionId, TourismStudy } from "./study-data";
import { AtlasDirection } from "./directions/AtlasDirection";
import { RadarDirection } from "./directions/RadarDirection";
import { DecisionDirection } from "./directions/DecisionDirection";
import styles from "./tourism-study.module.css";

type Direction = "atlas" | "radar" | "decision";

const DIRECTIONS: Array<{ id: Direction; code: string; name: string; promise: string }> = [
  { id: "atlas", code: "A", name: "Atlas éditorial", promise: "Lecture longue" },
  { id: "radar", code: "B", name: "Radar concurrentiel", promise: "Comparaison" },
  { id: "decision", code: "C", name: "Dossier de décision", promise: "Action commerciale" },
];

export function TourismStudyLab({ study }: { study: TourismStudy }) {
  const [direction, setDirection] = useState<Direction>("atlas");
  const [selectedAccountId, setSelectedAccountId] = useState(
    study.accounts.find((account) => account.name === "Club Med")?.id ?? study.accounts[0].id,
  );
  const [activeSection, setActiveSection] = useState<StudySectionId>("synthese");

  const navigate = useCallback((id: StudySectionId) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const changeDirection = (nextDirection: Direction) => {
    setDirection(nextDirection);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const sharedProps = {
    study,
    selectedAccountId,
    activeSection,
    onSelectAccount: setSelectedAccountId,
    onNavigate: navigate,
  };

  return (
    <main data-theme="edito-bright-cockpit" className={styles.labRoot}>
      <header className={styles.labToolbar}>
        <div className={styles.labIdentity}>
          <strong>KREDO</strong>
          <span>Design Lab · Intelligence sectorielle</span>
        </div>
        <div className={styles.directionSelector} role="tablist" aria-label="Direction graphique">
          {DIRECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={direction === item.id}
              onClick={() => changeDirection(item.id)}
            >
              <b>{item.code}</b>
              <span>{item.name}<small>{item.promise}</small></span>
            </button>
          ))}
        </div>
        <div className={styles.toolbarContext}>
          <span>Source unique</span>
          <strong>Étude jointe · v1.0</strong>
        </div>
      </header>

      {direction === "atlas" ? <AtlasDirection {...sharedProps} /> : null}
      {direction === "radar" ? <RadarDirection {...sharedProps} /> : null}
      {direction === "decision" ? <DecisionDirection {...sharedProps} /> : null}
    </main>
  );
}
