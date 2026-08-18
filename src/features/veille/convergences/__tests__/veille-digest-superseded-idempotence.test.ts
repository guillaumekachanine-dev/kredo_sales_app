import { describe, it, expect } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { CONTENT_TYPE_REGISTRY } from "@/features/content-collections/domain/content-type-registry"

interface MockVeilleArticle {
  id: string
  digest_id: string
  workspace_id: string
  selection_rank: number
  titre_fr: string
  resume: string
  analyse_kredo: string
  action_commerciale: string
  secteur_principal: string
  secteur_secondaire: string
  categorie: string
  tags: string[]
  convergences: Record<string, unknown> | null
  superseded_at: string | null
  created_at: string
  published_at: string | null
  source_name: string
  source_catalog_id: string | null
  url: string
  url_hash: string
}

class MockVeilleDatabase {
  articles: MockVeilleArticle[] = []
  private idCounter = 0

  // Simulation fidèle de la RPC replace_veille_digest_articles
  replaceVeilleDigestArticles(
    p_digest_id: string,
    p_articles: Array<Omit<MockVeilleArticle, "id" | "superseded_at" | "created_at">>,
    options?: { shouldFailInsertion?: boolean }
  ): MockVeilleArticle[] {
    // Snapshot pour transaction / rollback
    const rollbackState = JSON.parse(JSON.stringify(this.articles))

    try {
      const now = new Date().toISOString()
      // 1. Marquer les anciens articles actifs comme superseded
      for (const art of this.articles) {
        if (art.digest_id === p_digest_id && art.superseded_at === null) {
          art.superseded_at = now
        }
      }

      if (options?.shouldFailInsertion) {
        throw new Error("Erreur SQL simulée lors de l'insertion des articles")
      }

      // 2. Insérer les nouveaux articles
      const inserted: MockVeilleArticle[] = p_articles.map((a) => ({
        ...a,
        id: `art_uuid_${++this.idCounter}`,
        superseded_at: null,
        created_at: now,
      }))

      this.articles.push(...inserted)
      return inserted
    } catch (err) {
      // Rollback transactionnel
      this.articles = rollbackState
      throw err
    }
  }

  // Simulation fidèle de getVeilleArticles(digestId)
  getVeilleArticles(digestId: string): MockVeilleArticle[] {
    return this.articles
      .filter((a) => a.digest_id === digestId && a.superseded_at === null)
      .sort((a, b) => a.selection_rank - b.selection_rank)
  }
}

describe("LOT 2.3 : Idempotence sûre, RPC transactionnelle et conservation documentaire", () => {
  it("Cas A : Run A (5 articles) puis Run B même digest (3 articles) -> 3 actifs, 5 archivés, aucun doublon dans getVeilleArticles", () => {
    const db = new MockVeilleDatabase()
    const digestId = "digest-uuid-1"
    const workspaceId = "ws-uuid-1"

    // Run A
    const runAArticles = [1, 2, 3, 4, 5].map((rank) => ({
      digest_id: digestId,
      workspace_id: workspaceId,
      selection_rank: rank,
      titre_fr: `Titre Run A - ${rank}`,
      resume: `Résumé A ${rank}`,
      analyse_kredo: `Analyse A ${rank}`,
      action_commerciale: `Action A ${rank}`,
      secteur_principal: "Banque, Finance & Assurance",
      secteur_secondaire: "",
      categorie: "marche-esn",
      tags: ["ia"],
      convergences: { schemaVersion: 1 },
      published_at: "2026-08-18T10:00:00Z",
      source_name: "Les Echos",
      source_catalog_id: null,
      url: `https://example.com/a${rank}`,
      url_hash: `hashA${rank}`,
    }))

    const insertedA = db.replaceVeilleDigestArticles(digestId, runAArticles)
    expect(insertedA.length).toBe(5)
    expect(db.getVeilleArticles(digestId).length).toBe(5)

    // Run B (rerun même digest avec nouvelle sélection de 3 articles)
    const runBArticles = [1, 2, 3].map((rank) => ({
      digest_id: digestId,
      workspace_id: workspaceId,
      selection_rank: rank,
      titre_fr: `Titre Run B - ${rank}`,
      resume: `Résumé B ${rank}`,
      analyse_kredo: `Analyse B ${rank}`,
      action_commerciale: `Action B ${rank}`,
      secteur_principal: "Logiciels, SaaS & Services numériques",
      secteur_secondaire: "",
      categorie: "ia-appliquee",
      tags: ["saas"],
      convergences: { schemaVersion: 1 },
      published_at: "2026-08-18T12:00:00Z",
      source_name: "LeMagIT",
      source_catalog_id: null,
      url: `https://example.com/b${rank}`,
      url_hash: `hashB${rank}`,
    }))

    const insertedB = db.replaceVeilleDigestArticles(digestId, runBArticles)
    expect(insertedB.length).toBe(3)

    // État final DB : 8 articles au total (5 superseded + 3 actifs)
    expect(db.articles.length).toBe(8)
    const supersededArticles = db.articles.filter((a) => a.superseded_at !== null)
    expect(supersededArticles.length).toBe(5)
    const activeArticles = db.articles.filter((a) => a.superseded_at === null)
    expect(activeArticles.length).toBe(3)

    // getVeilleArticles ne retourne que la sélection active du Run B, sans doublons de ranks
    const activeSelection = db.getVeilleArticles(digestId)
    expect(activeSelection.length).toBe(3)
    expect(activeSelection.map((a) => a.selection_rank)).toEqual([1, 2, 3])
    expect(activeSelection.map((a) => a.titre_fr)).toEqual([
      "Titre Run B - 1",
      "Titre Run B - 2",
      "Titre Run B - 3",
    ])
  })

  it("Cas B : Un article du Run A est référencé dans une Liste -> Run B le supersède -> La Liste continue à le résoudre par ID", async () => {
    const db = new MockVeilleDatabase()
    const digestId = "digest-uuid-1"
    const workspaceId = "ws-uuid-1"

    // Run A
    const runAArticles = [
      {
        digest_id: digestId,
        workspace_id: workspaceId,
        selection_rank: 1,
        titre_fr: "Article Critique Sauvegardé",
        resume: "Contenu important ajouté à une collection",
        analyse_kredo: "Analyse",
        action_commerciale: "Action",
        secteur_principal: "Banque, Finance & Assurance",
        secteur_secondaire: "",
        categorie: "reglementaire",
        tags: ["dora"],
        convergences: { schemaVersion: 1 },
        published_at: "2026-08-18T10:00:00Z",
        source_name: "L'Usine Digitale",
        source_catalog_id: null,
        url: "https://example.com/critique",
        url_hash: "hashCritique",
      },
    ]
    const [articleA] = db.replaceVeilleDigestArticles(digestId, runAArticles)

    // Run B supersède le digest
    db.replaceVeilleDigestArticles(digestId, [
      {
        digest_id: digestId,
        workspace_id: workspaceId,
        selection_rank: 1,
        titre_fr: "Nouvel Article B",
        resume: "Autre sujet",
        analyse_kredo: "Analyse B",
        action_commerciale: "Action B",
        secteur_principal: "Logiciels, SaaS & Services numériques",
        secteur_secondaire: "",
        categorie: "marche-esn",
        tags: ["esn"],
        convergences: { schemaVersion: 1 },
        published_at: "2026-08-18T14:00:00Z",
        source_name: "LeMagIT",
        source_catalog_id: null,
        url: "https://example.com/nouveau",
        url_hash: "hashNouveau",
      },
    ])

    expect(articleA.superseded_at).not.toBeNull()

    // Simulation du résolveur de Content Collections (contentTypeRegistry)
    const fakeSupabase = {
      from: (table: string) => {
        expect(table).toBe("veille_articles")
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => {
              const matching = db.articles.filter((a) => ids.includes(a.id))
              return {
                data: matching.map((a) => ({
                  id: a.id,
                  titre_fr: a.titre_fr,
                  published_at: a.published_at,
                  resume: a.resume,
                })),
                error: null,
              }
            },
          }),
        }
      },
    }

    const registryEntry = CONTENT_TYPE_REGISTRY.veille_article
    expect(registryEntry).toBeDefined()

    const resolved = await registryEntry.resolveMany(
      fakeSupabase as unknown as SupabaseClient<Database>,
      [articleA.id]
    )
    expect(resolved.has(articleA.id)).toBe(true)
    const meta = resolved.get(articleA.id)
    expect(meta?.title).toBe("Article Critique Sauvegardé")
    expect(meta?.preview).toBe("Contenu important ajouté à une collection")
  })

  it("Cas C : L'insertion du Run B échoue -> Rollback complet, Run A reste actif sans perte", () => {
    const db = new MockVeilleDatabase()
    const digestId = "digest-uuid-1"
    const workspaceId = "ws-uuid-1"

    // Run A
    const runAArticles = [1, 2].map((rank) => ({
      digest_id: digestId,
      workspace_id: workspaceId,
      selection_rank: rank,
      titre_fr: `Initial Article ${rank}`,
      resume: `Résumé initial ${rank}`,
      analyse_kredo: `Analyse ${rank}`,
      action_commerciale: `Action ${rank}`,
      secteur_principal: "Banque, Finance & Assurance",
      secteur_secondaire: "",
      categorie: "marche-esn",
      tags: [],
      convergences: null,
      published_at: "2026-08-18T10:00:00Z",
      source_name: "Source",
      source_catalog_id: null,
      url: `https://example.com/init${rank}`,
      url_hash: `hashInit${rank}`,
    }))
    db.replaceVeilleDigestArticles(digestId, runAArticles)
    expect(db.getVeilleArticles(digestId).length).toBe(2)

    // Run B échoue
    expect(() => {
      db.replaceVeilleDigestArticles(
        digestId,
        [
          {
            digest_id: digestId,
            workspace_id: workspaceId,
            selection_rank: 1,
            titre_fr: "Article B Erroné",
            resume: "Err",
            analyse_kredo: "Err",
            action_commerciale: "Err",
            secteur_principal: "Transverse",
            secteur_secondaire: "",
            categorie: "ia-appliquee",
            tags: [],
            convergences: null,
            published_at: null,
            source_name: "Source",
            source_catalog_id: null,
            url: "https://example.com/err",
            url_hash: "hashErr",
          },
        ],
        { shouldFailInsertion: true }
      )
    }).toThrow("Erreur SQL simulée")

    // Grâce au rollback, les articles de Run A sont TOUJOURS actifs (superseded_at === null)
    const activeAfterFailure = db.getVeilleArticles(digestId)
    expect(activeAfterFailure.length).toBe(2)
    expect(activeAfterFailure[0].titre_fr).toBe("Initial Article 1")
    expect(activeAfterFailure[1].titre_fr).toBe("Initial Article 2")
    expect(activeAfterFailure.every((a) => a.superseded_at === null)).toBe(true)
  })

  it("Cas D : Premier run d'un nouveau digest -> Fonctionnement normal", () => {
    const db = new MockVeilleDatabase()
    const digestId = "digest-uuid-nouveau"
    const workspaceId = "ws-uuid-1"

    const newArticles = [1, 2, 3].map((rank) => ({
      digest_id: digestId,
      workspace_id: workspaceId,
      selection_rank: rank,
      titre_fr: `Nouveau Article ${rank}`,
      resume: `Résumé ${rank}`,
      analyse_kredo: `Analyse ${rank}`,
      action_commerciale: `Action ${rank}`,
      secteur_principal: "Transverse",
      secteur_secondaire: "",
      categorie: "marche-esn",
      tags: [],
      convergences: { schemaVersion: 1 },
      published_at: "2026-08-18T10:00:00Z",
      source_name: "Source",
      source_catalog_id: null,
      url: `https://example.com/${rank}`,
      url_hash: `hash${rank}`,
    }))

    const inserted = db.replaceVeilleDigestArticles(digestId, newArticles)
    expect(inserted.length).toBe(3)
    const active = db.getVeilleArticles(digestId)
    expect(active.length).toBe(3)
    expect(active.every((a) => a.superseded_at === null)).toBe(true)
  })
})
