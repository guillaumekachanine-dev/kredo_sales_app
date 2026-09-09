export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
