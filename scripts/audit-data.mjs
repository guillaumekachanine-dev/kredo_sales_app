import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = "https://jvzgmhvwirsbdkjpmvla.supabase.co"

// Load service role key dynamically from environment or .env.local
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local")
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8")
      const lines = envContent.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
          supabaseServiceKey = trimmed.split("=", 2)[1].trim().replace(/['"]/g, "")
          break
        }
      }
    }
  } catch (err) {
    // Ignore error
  }
}

if (!supabaseServiceKey) {
  console.error("❌ Erreur : SUPABASE_SERVICE_ROLE_KEY est introuvable.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const { data: events, error } = await supabase
    .from("calendar_events")
    .select(`
      id,
      title,
      event_type,
      starts_at,
      candidate_id,
      description,
      metadata
    `)
    .not("candidate_id", "is", null)

  if (error) {
    console.error("Error:", error)
    return
  }

  console.log(`Found ${events.length} candidate-linked events. Here is the complete list:`)
  events.forEach(e => {
    console.log(`ID: ${e.id} | Title: "${e.title}" | Type: ${e.event_type} | Candidate: ${e.candidate_id} | Date: ${e.starts_at}`);
  })
}

main().catch(console.error)
