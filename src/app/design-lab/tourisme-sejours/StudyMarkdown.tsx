"use client";

import { Fragment, type ReactNode } from "react";
import styles from "./tourism-study.module.css";

function cleanText(value: string) {
  return value
    .replace(/\\([\\[\]_=*#.-])/g, "$1")
    .replace(/ {2}$/g, "")
    .trim();
}

function renderInline(value: string): ReactNode[] {
  const text = cleanText(value);
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[2] && match[3]) {
      nodes.push(
        <a key={`${match.index}-${match[3]}`} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(<strong key={`${match.index}-${match[4]}`}>{match[4]}</strong>);
    } else if (match[5]) {
      nodes.push(<em key={`${match.index}-${match[5]}`}>{match[5]}</em>);
    }
    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function isDividerRow(line: string) {
  return line
    .split("|")
    .slice(1, -1)
    .every((cell) => /^\s*:?-{2,}:?\s*$/.test(cell));
}

function cells(line: string) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

function StudyTable({ lines }: { lines: string[] }) {
  const header = cells(lines[0]);
  const body = lines.slice(isDividerRow(lines[1] ?? "") ? 2 : 1).map(cells);

  return (
    <div className={styles.tableGroup}>
      <div className={styles.desktopTableWrap}>
        <table className={styles.studyTable}>
          <thead><tr>{header.map((cell) => <th key={cell}>{renderInline(cell)}</th>)}</tr></thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`}>
                {row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{renderInline(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.mobileTableList}>
        {body.map((row, rowIndex) => (
          <dl key={`${row[0]}-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <Fragment key={`${header[cellIndex]}-${cellIndex}`}>
                <dt>{renderInline(header[cellIndex] ?? "Valeur")}</dt>
                <dd>{renderInline(cell)}</dd>
              </Fragment>
            ))}
          </dl>
        ))}
      </div>
    </div>
  );
}

export function StudyMarkdown({ markdown, compact = false }: { markdown: string; compact?: boolean }) {
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      blocks.push(<StudyTable key={`table-${index}`} lines={tableLines} />);
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`} className={styles.studyQuote}>
          {quoteLines.map((item, itemIndex) => <p key={`${itemIndex}-${item.slice(0, 24)}`}>{renderInline(item)}</p>)}
        </blockquote>,
      );
      continue;
    }

    if (/^\*\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\*\s/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\*\s/, ""));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items.map((item) => <li key={item}>{renderInline(item)}</li>)}</ul>);
      continue;
    }

    const heading = line.match(/^(#{3,4})\s+(.+)$/);
    if (heading) {
      const Heading = heading[1].length === 3 ? "h3" : "h4";
      blocks.push(<Heading key={`heading-${index}`}>{renderInline(heading[2])}</Heading>);
      index += 1;
      continue;
    }

    if (line === "JSON") {
      index += 1;
      continue;
    }

    blocks.push(<p key={`paragraph-${index}`}>{renderInline(line)}</p>);
    index += 1;
  }

  return <div className={`${styles.studyMarkdown} ${compact ? styles.studyMarkdownCompact : ""}`}>{blocks}</div>;
}
