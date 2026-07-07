import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type VeilleDigest = Database["public"]["Tables"]["veille_digests"]["Row"]
export type VeilleArticle = Database["public"]["Tables"]["veille_articles"]["Row"]
export type SectorNews = Database["public"]["Tables"]["sector_news"]["Row"]
export type SectorEvent = Database["public"]["Tables"]["sector_events"]["Row"]

export async function getLatestVeilleDigest() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data: data as VeilleDigest | null, error }
}

export async function getVeilleArticles(digestId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_articles")
    .select("*")
    .eq("digest_id", digestId)
    .order("selection_rank", { ascending: true })

  return { data: (data || []) as VeilleArticle[], error }
}

export async function getPastVeilleDigests(limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(limit)

  return { data: (data || []) as VeilleDigest[], error }
}

export async function getSectorNews(limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sector_news")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit)

  return { data: (data || []) as SectorNews[], error }
}

export async function getSectorEvents(limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sector_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(limit)

  return { data: (data || []) as SectorEvent[], error }
}
