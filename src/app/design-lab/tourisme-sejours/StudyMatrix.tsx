"use client";

import type { StudyAccount } from "./study-data";
import styles from "./tourism-study.module.css";

const CATEGORY_CLASS: Record<string, string> = {
  leader: styles.bubbleLeader,
  challenger: styles.bubbleChallenger,
  outsider_niche: styles.bubbleOutsider,
};

export function StudyMatrix({
  accounts,
  selectedAccountId,
  onSelect,
  compact = false,
}: {
  accounts: StudyAccount[];
  selectedAccountId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const plot = { left: 82, right: 696, top: 34, bottom: 416 };
  const width = plot.right - plot.left;
  const height = plot.bottom - plot.top;

  return (
    <div className={`${styles.matrixShell} ${compact ? styles.matrixCompact : ""}`}>
      <div className={styles.matrixHeader}>
        <div>
          <h3>Positionnement concurrentiel</h3>
          <p>Empreinte métier × maturité numérique · taille = envergure indiquée dans l’étude</p>
        </div>
        <div className={styles.matrixLegend} aria-label="Légende des catégories">
          <span><i className={styles.legendLeader} />Leader</span>
          <span><i className={styles.legendChallenger} />Challenger</span>
          <span><i className={styles.legendOutsider} />Outsider niche</span>
        </div>
      </div>
      <svg className={styles.matrixSvg} viewBox="0 0 760 490" role="img" aria-labelledby="matrix-title matrix-description">
        <title id="matrix-title">Matrice concurrentielle des cinq comptes étudiés</title>
        <desc id="matrix-description">Axe horizontal : empreinte métier de 1 à 5. Axe vertical : maturité numérique de 1 à 5. Chaque bulle est sélectionnable.</desc>
        {[1, 2, 3, 4, 5].map((tick) => {
          const x = plot.left + ((tick - 1) / 4) * width;
          const y = plot.bottom - ((tick - 1) / 4) * height;
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={plot.top} y2={plot.bottom} className={styles.matrixGridLine} />
              <line x1={plot.left} x2={plot.right} y1={y} y2={y} className={styles.matrixGridLine} />
              <text x={x} y={plot.bottom + 26} textAnchor="middle" className={styles.matrixTick}>{tick}</text>
              <text x={plot.left - 20} y={y + 4} textAnchor="end" className={styles.matrixTick}>{tick}</text>
            </g>
          );
        })}
        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} className={styles.matrixAxis} />
        <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} className={styles.matrixAxis} />
        <text x={(plot.left + plot.right) / 2} y="478" textAnchor="middle" className={styles.matrixAxisLabel}>Empreinte métier</text>
        <text transform="translate(22 230) rotate(-90)" textAnchor="middle" className={styles.matrixAxisLabel}>Maturité numérique</text>
        {accounts.map((account) => {
          const cx = plot.left + ((account.businessFootprint - 1) / 4) * width;
          const cy = plot.bottom - ((account.digitalMaturity - 1) / 4) * height;
          const selected = account.id === selectedAccountId;
          const radius = account.economicReach;
          const labelWidth = Math.max(96, account.name.length * 7.2 + 24);
          const labelX = Math.min(plot.right - labelWidth, Math.max(plot.left, cx - labelWidth / 2));
          const labelY = cy + radius + 10;

          return (
            <g
              key={account.id}
              role="button"
              tabIndex={0}
              aria-label={`Sélectionner ${account.name}, empreinte métier ${account.businessFootprint} sur 5, maturité numérique ${account.digitalMaturity} sur 5, appétence ${account.appetite} sur 35`}
              aria-pressed={selected}
              onClick={() => onSelect(account.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(account.id);
                }
              }}
              className={styles.matrixPoint}
            >
              {selected ? <circle cx={cx} cy={cy} r={radius + 9} className={styles.bubbleHalo} /> : null}
              <circle cx={cx} cy={cy} r={radius} className={`${styles.bubble} ${CATEGORY_CLASS[account.category] ?? styles.bubbleChallenger}`} />
              <text x={cx} y={cy + 4} textAnchor="middle" className={styles.bubbleScore}>{account.appetite}/35</text>
              <g className={styles.bubbleLabel}>
                <rect x={labelX} y={labelY} width={labelWidth} height="38" rx="2" />
                <text x={labelX + labelWidth / 2} y={labelY + 16} textAnchor="middle">{account.name}</text>
                <text x={labelX + labelWidth / 2} y={labelY + 30} textAnchor="middle" className={styles.bubbleCategory}>{account.categoryLabel}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className={styles.mobileMatrixSummary} aria-label="Version mobile de la matrice">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            aria-pressed={account.id === selectedAccountId}
            onClick={() => onSelect(account.id)}
          >
            <span><strong>{account.name}</strong><small>{account.categoryLabel}</small></span>
            <span><b>{account.businessFootprint}/5</b><small>Métier</small></span>
            <span><b>{account.digitalMaturity}/5</b><small>Numérique</small></span>
            <em>{account.appetite}/35</em>
          </button>
        ))}
      </div>
    </div>
  );
}
