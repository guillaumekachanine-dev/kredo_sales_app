import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://jvzgmhvwirsbdkjpmvla.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2emdtaHZ3aXJzYmRranBtdmxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk0ODQ3MCwiZXhwIjoyMDk2NTI0NDcwfQ.Ht0qdncgv4TDwZ4g4oEQJibQFOaB6KAOOomC-zxTnps"

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
