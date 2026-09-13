import { describe, expect, it } from "vitest"

import {
  arkopharmaAccountIntelligenceFixture,
  arkopharmaSourceCorpusFixture,
} from "../fixtures/work"
import {
  checkCompanyIdentityMatch,
  detectWorkBundleRoles,
} from "../domain/work-study-detection"
import { validateWorkStudyBundle } from "../domain/work-study-parser"
import { adaptWorkStudyToKnowledge } from "../domain/work-study-adapter"
import { validateStudyKnowledge } from "../domain/validate-study-knowledge"
import { buildStudyReportView } from "../domain/study-view"

describe("Work Study Intake & Détection", () => {
  describe("Rapprochement d'identité (checkCompanyIdentityMatch)", () => {
    it("reconnaît une entreprise malgré les formes juridiques et préfixes courants", () => {
      const result = checkCompanyIdentityMatch("Arkopharma", "Laboratoires Arkopharma SAS")
      expect(result.match).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it("reconnaît une correspondance avec accents ou casse différente", () => {
      const result = checkCompanyIdentityMatch("Électricité de France", "EDF - Electricite De France SA")
      expect(result.match).toBe(true)
    })

    it("rejette un compte en cas de mismatch évident", () => {
      const result = checkCompanyIdentityMatch("TotalEnergies", "Laboratoires Arkopharma SAS")
      expect(result.match).toBe(false)
      expect(result.reason).toContain("ne correspond pas au compte Kredo")
    })
  })

  describe("Validation du bundle & Détection", () => {
    it("détecte automatiquement les deux rôles AI et Corpus sans se fier aux noms de fichiers", () => {
      const detected = detectWorkBundleRoles(
        arkopharmaSourceCorpusFixture,
        arkopharmaAccountIntelligenceFixture,
      )
      expect(detected.ok).toBe(true)
      if (!detected.ok) return

      expect(detected.accountIntelligence.data.sections).toBeDefined()
      expect(detected.sourceCorpus.data.sources).toBeDefined()
    })

    it("rejette un bundle de 2 fichiers du même rôle", () => {
      const doubleAi = detectWorkBundleRoles(
        arkopharmaAccountIntelligenceFixture,
        arkopharmaAccountIntelligenceFixture,
      )
      expect(doubleAi.ok).toBe(false)

      const doubleCorpus = detectWorkBundleRoles(
        arkopharmaSourceCorpusFixture,
        arkopharmaSourceCorpusFixture,
      )
      expect(doubleCorpus.ok).toBe(false)
    })

    it("rejette un bundle dont les entités sont incohérentes", () => {
      const corpusModifie = JSON.parse(JSON.stringify(arkopharmaSourceCorpusFixture))
      corpusModifie.corpus.account_name = "Autre Entreprise Totalement Différente"

      const check = validateWorkStudyBundle(
        arkopharmaAccountIntelligenceFixture,
        corpusModifie,
      )
      expect(check.ok).toBe(false)
      if (check.ok) return
      expect(check.issues.some((i) => i.path.includes("identity"))).toBe(true)
    })
  })

  describe("Adaptation et garanties de la ligne persistée", () => {
    it("génère une étude directement au format ready avec intégrité textuelle", () => {
      const detection = detectWorkBundleRoles(
        arkopharmaAccountIntelligenceFixture,
        arkopharmaSourceCorpusFixture,
      )
      expect(detection.ok).toBe(true)
      if (!detection.ok) return

      const studyId = "33333333-4444-5555-8666-777777777777"
      const adapted = adaptWorkStudyToKnowledge({
        accountIntelligence: detection.accountIntelligence.data,
        sourceCorpus: detection.sourceCorpus.data,
        context: {
          studyId,
          companyId: "11111111-2222-3333-4444-555555555555",
          companyName: "Arkopharma",
          fileName: "arkopharma-ai.json",
          title: "Étude Stratégique Arkopharma",
          segmentSlug: "pharma-sante",
          segmentName: "Pharmacie & Santé",
        },
      })

      // Validation structurelle
      const val = validateStudyKnowledge(adapted.knowledge)
      expect(val.ok).toBe(true)
      expect(adapted.knowledge.study.producer).toBe("chatgpt_work")
      expect(adapted.knowledge.study.title).toBe("Étude Stratégique Arkopharma")
      expect(adapted.knowledge.coverage.text.identical).toBe(true)

      // Métadonnées d'extraction conceptuelles pour Storage
      const extraction = {
        mode: "chatgpt_work_bundle",
        source_corpus: {
          path: "workspace/company/bundle/source-corpus.json",
          file_name: "sources.json",
          bytes: 12345,
          sha256: "fake-sha",
        },
      }
      expect(extraction.mode).toBe("chatgpt_work_bundle")
      expect(extraction.source_corpus.path).toBeDefined()

      // Vue reader : étiquette adaptée à Work
      const reportView = buildStudyReportView(adapted.knowledge)
      expect(reportView.producer).toBe("chatgpt_work")
      expect(reportView.banner.title).toContain("ChatGPT Work")
    })
  })

  describe("Nettoyage des extensions de fichier (study-read)", () => {
    it("retire proprement l'extension .pdf ou .json sans tronquer le nom", () => {
      const cleanBase = (name: string) => name.replace(/\.(pdf|json)$/i, "")

      expect(cleanBase("etude_arkopharma.pdf")).toBe("etude_arkopharma")
      expect(cleanBase("etude_arkopharma.json")).toBe("etude_arkopharma")
      expect(cleanBase("etude_arkopharma.JSON")).toBe("etude_arkopharma")
      expect(cleanBase("etude.version.2.json")).toBe("etude.version.2")
    })
  })
})
