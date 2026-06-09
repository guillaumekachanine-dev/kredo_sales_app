"use client"

import React, { useState } from "react"
import { KredoRichTextEditor } from "@/components/editor/KredoRichTextEditor"
import { KredoRichTextViewer } from "@/components/editor/KredoRichTextViewer"
import { RichTextDocument } from "@/components/editor/rich-text-types"
import { DEFAULT_DOCUMENT, documentToPlainText } from "@/components/editor/rich-text-utils"
import { SurfaceCard } from "@/components/ui/SurfaceCard"

export default function EditorTestPage() {
  const [doc, setDoc] = useState<RichTextDocument>(DEFAULT_DOCUMENT)

  const handleClear = () => {
    setDoc(DEFAULT_DOCUMENT)
  }

  const handleLoadSample = () => {
    setDoc({
      version: 1,
      blocks: [
        {
          id: "b1",
          type: "paragraph",
          align: "center",
          children: [
            { text: "Bienvenue dans l'éditeur ", marks: { bold: true } },
            { text: "Kredo Rich Text Lite", marks: { bold: true, color: "primary" } }
          ]
        },
        {
          id: "b2",
          type: "paragraph",
          children: [
            { text: "Ceci est un paragraphe standard avec du texte en " },
            { text: "italique", marks: { italic: true } },
            { text: ", du texte en " },
            { text: "rouge danger", marks: { color: "danger" } },
            { text: " et d'autres styles cumulés." }
          ]
        },
        {
          id: "b3",
          type: "bullet_list",
          children: [
            { text: "Élément de liste 1 en ", marks: { bold: true } },
            { text: "success green", marks: { bold: true, color: "success" } }
          ]
        },
        {
          id: "b4",
          type: "bullet_list",
          children: [
            { text: "Élément de liste 2 en " },
            { text: "warning orange", marks: { color: "warning" } }
          ]
        }
      ]
    })
  }

  return (
    <div className="min-h-screen bg-canvas p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      <header className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-heading text-heading">Kredo Rich Text Lite Tester</h1>
          <p className="text-xs text-muted mt-1">
            Testez l&apos;éditeur et le viewer basés sur notre modèle de document JSON natif.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-primary text-primary-fg hover:bg-primary/95 transition-colors"
          >
            Charger Démo
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-surface border border-border text-heading hover:bg-surface-hover transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left column: Editor */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-heading">Éditeur Actif</h2>
          <KredoRichTextEditor
            value={doc}
            onChange={setDoc}
            placeholder="Saisissez votre note ici..."
          />
        </div>

        {/* Right column: Readonly Viewer */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-heading">Viewer Lecture Seule (HTML Rendu)</h2>
          <SurfaceCard className="p-4 min-h-[200px]">
            <KredoRichTextViewer value={doc} />
          </SurfaceCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bottom Left: JSON Model */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-heading">Modèle JSON (RichTextDocument)</h2>
          <pre className="p-4 bg-surface border border-border rounded-lg text-[10px] text-muted overflow-auto max-h-[300px] whitespace-pre-wrap">
            {JSON.stringify(doc, null, 2)}
          </pre>
        </div>

        {/* Bottom Right: Raw Text Extraction */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-heading">Texte Brut (Extrait)</h2>
          <pre className="p-4 bg-surface border border-border rounded-lg text-[10px] text-heading overflow-auto max-h-[300px] whitespace-pre-wrap">
            {documentToPlainText(doc) || "(Vide)"}
          </pre>
        </div>
      </div>
    </div>
  )
}
