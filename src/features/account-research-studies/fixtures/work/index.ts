import type { WorkAccountIntelligence, WorkSourceCorpus } from "../../domain/work-study-contracts"
import accountIntelligenceJson from "./arkopharma_account_intelligence.json"
import sourceCorpusJson from "./arkopharma_source_corpus.json"

export const arkopharmaAccountIntelligenceFixture = accountIntelligenceJson as unknown as WorkAccountIntelligence
export const arkopharmaSourceCorpusFixture = sourceCorpusJson as unknown as WorkSourceCorpus
