import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { error } = await supabase.from("crm_accounts").select("id").limit(1);

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Header ── */}
      <header className="bg-surface border-b border-border px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-heading">kredo</span>
          <span className="text-xs text-muted border border-border px-2 py-0.5 rounded">
            v0.1 · Phase 0
          </span>
        </div>
        <span className={`text-xs font-medium ${error ? "text-danger" : "text-success"}`}>
          {error ? "⚠ DB déconnectée" : "● DB connectée"}
        </span>
      </header>

      {/* ── Main ── */}
      <main className="px-8 py-16 max-w-3xl">
        <p className="text-xs font-medium text-muted tracking-widest uppercase mb-4">
          Design System · Cobalt Franc
        </p>
        <h1 className="text-4xl font-bold text-heading mb-3">
          Les fondations sont posées.
        </h1>
        <p className="text-body text-lg mb-16">
          Palette active, base connectée, tokens prêts.
          Phase 1 en approche — le pipe des opportunités.
        </p>

        {/* ── Palette live ── */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Swatch bg="bg-primary" label="primary" light />
          <Swatch bg="bg-surface" label="surface" bordered />
          <Swatch bg="bg-accent" label="accent" light />
          <Swatch bg="bg-canvas" label="canvas" bordered />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Swatch bg="bg-success" label="success" light />
          <Swatch bg="bg-warning" label="warning" light />
          <Swatch bg="bg-danger" label="danger" light />
          <div className="h-16 bg-surface border border-border rounded flex items-end gap-1 p-2">
            <span className="text-heading  text-xs font-mono">heading</span>
            <span className="text-body    text-xs font-mono">body</span>
            <span className="text-muted   text-xs font-mono">muted</span>
          </div>
        </div>
      </main>

    </div>
  );
}

/* ── Micro-composant local (usage unique, pas dans components/) ── */
function Swatch({
  bg, label, light = false, bordered = false,
}: {
  bg: string; label: string; light?: boolean; bordered?: boolean;
}) {
  return (
    <div
      className={`h-16 ${bg} rounded flex items-end p-2 ${bordered ? "border border-border" : ""}`}
    >
      <span className={`text-xs font-mono ${light ? "text-primary-fg" : "text-body"}`}>
        {label}
      </span>
    </div>
  );
}