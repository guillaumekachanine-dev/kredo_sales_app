import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type StudySectionId =
  | "synthese"
  | "matrice"
  | "etalon"
  | "comparaison"
  | "comptes"
  | "paysage"
  | "analyse"
  | "qualite"
  | "sources"
  | "journal"
  | "json";

export type StudySection = {
  id: StudySectionId;
  number: string;
  title: string;
  content: string;
  isAppendix: boolean;
};

export type StudyAccount = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  confidence: string;
  businessFootprint: number;
  digitalMaturity: number;
  appetite: number;
  economicReach: number;
  entryAngle: string;
  avoid: string;
  hooksMarkdown: string;
  detailMarkdown: string;
  triggerDate: string;
  triggerFact: string;
};

export type StudyPriority = {
  name: string;
  appetite: string;
  whyNow: string;
  entry: string;
};

export type StudyDeadline = {
  name: string;
  date: string;
  markdown: string;
};

export type TourismStudy = {
  title: string;
  prelude: string;
  sections: StudySection[];
  accounts: StudyAccount[];
  priorities: StudyPriority[];
  deadlines: StudyDeadline[];
  jsonText: string;
  citationSources: string;
  snapshotDate: string;
};

type AnnexAccount = {
  nom: string;
  categorie: string;
  empreinte_metier: number;
  maturite_numerique: number;
  appetence: { total: number };
  angle_entree: string;
  a_ne_pas_dire: string;
  confiance: string;
  trigger_events: Array<{ date: string; fait: string }>;
};

type AnnexExport = {
  meta: { date_snapshot: string };
  comptes: AnnexAccount[];
};

const SOURCE_PATH = join(
  process.cwd(),
  "docs/FEATURES/sector_intelligence/cartographie-concurrentielle/assets/Étude Marché Tourisme Et Séjours.md",
);

// The attached Markdown remains the canonical content. This module only derives a
// typed, presentation-friendly representation from it; no report copy is rewritten.
const SOURCE = readFileSync(SOURCE_PATH, "utf8").trim();

const SECTION_DEFINITIONS: Array<{
  id: StudySectionId;
  number: string;
  title: string;
  marker: string;
  isAppendix?: boolean;
}> = [
  { id: "synthese", number: "01", title: "Synthèse exécutive", marker: "## **1\\. Synthèse Exécutive**" },
  { id: "matrice", number: "02", title: "Matrice visuelle", marker: "## **2\\. Matrice Visuelle**" },
  { id: "etalon", number: "03", title: "Compte étalon", marker: "## **3\\. Fiche du Compte Étalon (Détaillée)**" },
  { id: "comparaison", number: "04", title: "Tableau comparatif", marker: "## **4\\. Tableau Comparatif**" },
  { id: "comptes", number: "05", title: "Fiches détaillées", marker: "## **5\\. Fiches Détaillées**" },
  { id: "paysage", number: "06", title: "Paysage non étudié", marker: "## **6\\. Acteurs du Paysage Non Étudiés**" },
  { id: "analyse", number: "07", title: "Analyse transverse", marker: "## **7\\. Analyse Transverse**" },
  { id: "qualite", number: "08", title: "Contrôle qualité", marker: "## **8\\. Étape 6 — Contrôle Qualité (Scorecard)**" },
  { id: "sources", number: "A", title: "Annexe A — Sources", marker: "## **9\\. Annexe A — Sources**", isAppendix: true },
  { id: "journal", number: "B", title: "Annexe B — Journal de recherche", marker: "## **10\\. Annexe B — Journal de Recherche**", isAppendix: true },
  { id: "json", number: "C", title: "Annexe C — Export JSON", marker: "## **11\\. Annexe C — Export JSON**", isAppendix: true },
];

function stripInlineMarkdown(value: string) {
  return value
    .replace(/\\([\\[\]_=*.-])/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function splitSections(): StudySection[] {
  return SECTION_DEFINITIONS.map((definition, index) => {
    const start = SOURCE.indexOf(definition.marker);
    const nextMarker = SECTION_DEFINITIONS[index + 1]?.marker;
    const end = nextMarker ? SOURCE.indexOf(nextMarker) : SOURCE.length;

    if (start < 0 || end < 0) {
      throw new Error(`Section introuvable dans l'étude : ${definition.title}`);
    }

    const headingEnd = SOURCE.indexOf("\n", start);
    return {
      id: definition.id,
      number: definition.number,
      title: definition.title,
      content: SOURCE.slice(headingEnd + 1, end).trim(),
      isAppendix: definition.isAppendix ?? false,
    };
  });
}

function parseAnnexExport(annexContent: string): { parsed: AnnexExport; jsonText: string; citationSources: string } {
  const citationsMarker = "#### **Sources des citations**";
  const citationStart = annexContent.indexOf(citationsMarker);
  const jsonArea = citationStart >= 0 ? annexContent.slice(0, citationStart) : annexContent;
  const citationSources = citationStart >= 0
    ? annexContent.slice(citationStart + citationsMarker.length).trim()
    : "";
  const objectStart = jsonArea.indexOf("{");
  const objectEnd = jsonArea.lastIndexOf("}");
  const markdownEscapedJson = jsonArea.slice(objectStart, objectEnd + 1);
  const jsonText = markdownEscapedJson.replace(/\\(?!["\\/bfnrtu])/g, "");
  return { parsed: JSON.parse(jsonText) as AnnexExport, jsonText, citationSources };
}

function accountBlock(content: string, heading: string, nextHeading?: string) {
  const start = content.indexOf(heading);
  if (start < 0) return "";
  const end = nextHeading ? content.indexOf(nextHeading, start + heading.length) : content.length;
  const headingEnd = content.indexOf("\n", start);
  return content.slice(headingEnd + 1, end < 0 ? content.length : end).trim();
}

function parsePriorities(synthesis: string): StudyPriority[] {
  const rows = synthesis
    .split("\n")
    .filter((line) => /^\| \*\*(Club Med|Karavel|Voyage Privé)\*\*/.test(line));

  return rows.map((row) => {
    const cells = row.split("|").slice(1, -1).map(stripInlineMarkdown);
    return { name: cells[0], appetite: cells[1], whyNow: cells[2], entry: cells[3] };
  });
}

function parseDeadlines(analysis: string): StudyDeadline[] {
  const deadlineStart = analysis.indexOf("### **ÉCHÉANCES COMMUNES DATÉES");
  const questionsStart = analysis.indexOf("### **RÉPONSES AUX SIX QUESTIONS");
  const block = analysis.slice(deadlineStart, questionsStart);
  return block
    .split(/\n> (?=\d+\. \*\*)/)
    .slice(1)
    .map((item) => {
      const markdown = `> ${item.trim()}`;
      const strong = item.match(/\*\*(.+?)\*\*/)?.[1] ?? "";
      const [name, date = ""] = strong.split(" — ");
      return { name: name.replace(/^La |^Le /, ""), date, markdown };
    });
}

function categoryLabel(category: string) {
  if (category === "leader") return "Leader";
  if (category === "outsider_niche") return "Outsider niche";
  return "Challenger";
}

function accountId(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getTourismStudy(): TourismStudy {
  const sections = splitSections();
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const synthesis = sectionMap.get("synthese")?.content ?? "";
  const details = sectionMap.get("comptes")?.content ?? "";
  const voyagePrive = sectionMap.get("etalon")?.content ?? "";
  const annex = parseAnnexExport(sectionMap.get("json")?.content ?? "");

  const detailByName: Record<string, string> = {
    "Voyage Privé": voyagePrive,
    "Club Med": accountBlock(details, "### **CLUB MED — LEADER**", "### **KARAVEL — CHALLENGER**"),
    Karavel: accountBlock(details, "### **KARAVEL — CHALLENGER**", "### **VOYAGEURS DU MONDE — CHALLENGER**"),
    "Voyageurs du Monde": accountBlock(details, "### **VOYAGEURS DU MONDE — CHALLENGER**", "### **ORCHESTRA (TRAVELSOFT) — OUTSIDER NICHE**"),
    Orchestra: accountBlock(details, "### **ORCHESTRA (TRAVELSOFT) — OUTSIDER NICHE**"),
  };

  const economicReach: Record<string, number> = {
    "Club Med": 30,
    Karavel: 24,
    "Voyage Privé": 21,
    "Voyageurs du Monde": 18,
    Orchestra: 16,
  };

  const accounts = annex.parsed.comptes.map((account): StudyAccount => {
    const detailMarkdown = detailByName[account.nom] ?? "";
    const commercialStart = detailMarkdown.indexOf("**Traduction commerciale**");
    return {
      id: accountId(account.nom),
      name: account.nom,
      category: account.categorie,
      categoryLabel: categoryLabel(account.categorie),
      confidence: account.confiance,
      businessFootprint: account.empreinte_metier,
      digitalMaturity: account.maturite_numerique,
      appetite: account.appetence.total,
      economicReach: economicReach[account.nom] ?? 16,
      entryAngle: account.angle_entree,
      avoid: account.a_ne_pas_dire,
      hooksMarkdown: commercialStart >= 0 ? detailMarkdown.slice(commercialStart).trim() : "",
      detailMarkdown,
      triggerDate: account.trigger_events[0]?.date ?? "Non publié",
      triggerFact: account.trigger_events[0]?.fait ?? "Non publié",
    };
  });

  const firstSectionMarker = SECTION_DEFINITIONS[0].marker;
  const preludeStart = SOURCE.indexOf("\n") + 1;
  const preludeEnd = SOURCE.indexOf(firstSectionMarker);

  return {
    title: stripInlineMarkdown(SOURCE.slice(0, SOURCE.indexOf("\n")).replace(/^# /, "")),
    prelude: SOURCE.slice(preludeStart, preludeEnd).trim(),
    sections,
    accounts,
    priorities: parsePriorities(synthesis),
    deadlines: parseDeadlines(sectionMap.get("analyse")?.content ?? ""),
    jsonText: annex.jsonText,
    citationSources: annex.citationSources,
    snapshotDate: annex.parsed.meta.date_snapshot,
  };
}
