"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/Badge"
import {
  candidateEditorialGroup,
  candidateStatusLabel,
  collaboratorStatusLabel,
  getTalentPracticeVisual,
  initialsFromName,
  isAlumni,
  isTeamMember,
  profileMatchesQuery,
} from "./talent-knowledge-builders"
import { TalentKnowledgeNavigation } from "./TalentKnowledgeNavigation"
import { TalentProfileDetail } from "./TalentProfileDetail"
import type { TalentKnowledgeSnapshot, TalentProfile, TalentTab } from "./talent-knowledge.types"

function MobileProfileRow({ profile, onSelect }: { profile: TalentProfile; onSelect: (profile: TalentProfile) => void }) {
  const status = profile.kind === "candidate" ? candidateStatusLabel(profile.status) : collaboratorStatusLabel(profile.status)
  return (
    <button type="button" onClick={() => onSelect(profile)} className="flex min-h-24 w-full items-start gap-3 border-t border-edito-border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-brass">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-edito-navy text-[10px] font-bold text-white">{initialsFromName(profile.fullName)}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-edito-navy">{profile.fullName}</span><span className="mt-0.5 block truncate text-[11px] text-edito-body">{profile.currentTitle || "Titre non renseigné"}</span><span className="mt-1 block truncate text-[10px] text-edito-muted">{profile.practice || "Practice non renseignée"} · {status}</span><span className="mt-2 flex flex-wrap gap-1">{profile.skills.slice(0, 3).map((skill) => <Badge key={skill.id} variant="neutral">{skill.name}</Badge>)}</span></span>
      <span aria-hidden="true" className="pt-3 text-xl text-edito-brass">›</span>
    </button>
  )
}

function MobilePracticeSection({ name, profiles, open, onToggle, onSelect }: { name: string; profiles: TalentProfile[]; open: boolean; onToggle: () => void; onSelect: (profile: TalentProfile) => void }) {
  const visual = getTalentPracticeVisual(name)
  return <section className="overflow-hidden rounded-xl border border-edito-border bg-edito-surface"><button type="button" onClick={onToggle} className="flex min-h-12 w-full items-center gap-2 px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-brass" aria-expanded={open}><span className="size-6 rounded-md border border-edito-border bg-edito-chip p-1" style={{ borderLeftColor: visual.color, borderLeftWidth: 3 }}>{visual.icon ? <img src={visual.icon} alt="" className="size-full object-contain" /> : null}</span><span className="min-w-0 flex-1 truncate text-xs font-bold text-edito-navy">{name}</span><span className="rounded-full bg-edito-chip px-1.5 py-0.5 text-[10px] font-bold text-edito-muted">{profiles.length}</span><span aria-hidden="true" className="text-edito-navy">{open ? "⌃" : "⌄"}</span></button>{open && <div>{profiles.map((profile) => <MobileProfileRow key={`${profile.kind}-${profile.id}`} profile={profile} onSelect={onSelect} />)}</div>}</section>
}

function MobileSkillsMap({ snapshot, onSelect }: { snapshot: TalentKnowledgeSnapshot; onSelect: (profile: TalentProfile) => void }) {
  const [population, setPopulation] = useState<"all" | "team" | "candidates">("all")
  const [query, setQuery] = useState("")
  const [skillId, setSkillId] = useState<string | null>(null)
  const profiles = useMemo(() => [...snapshot.collaborators, ...snapshot.candidates].filter((profile) => population === "all" || (population === "team" ? profile.kind === "collaborator" : profile.kind === "candidate")), [population, snapshot])
  const skills = snapshot.topSkills.filter((skill) => skill.name.toLowerCase().includes(query.toLowerCase()) && profiles.some((profile) => profile.skills.some((item) => item.id === skill.id)))
  const selectedProfiles = skillId ? profiles.filter((profile) => profile.skills.some((skill) => skill.id === skillId)) : []
  const max = Math.max(...skills.map((skill) => skill.profileCount), 1)
  return <div className="space-y-3"><div className="grid grid-cols-3 gap-1 rounded-lg border border-edito-border bg-edito-surface p-1">{([ ["all", "Tous"], ["team", "Équipe"], ["candidates", "Candidats"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setPopulation(value)} className={`min-h-9 rounded-md text-[10px] font-bold ${population === value ? "bg-edito-navy text-white" : "text-edito-body"}`}>{label}</button>)}</div><label className="relative block"><span className="sr-only">Rechercher une compétence</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une compétence" className="h-10 w-full rounded-md border border-edito-border bg-edito-surface px-3 text-xs text-edito-body placeholder:text-edito-muted focus:border-edito-brass focus:outline-none" /></label><section className="overflow-hidden rounded-xl border border-edito-border bg-edito-surface">{skills.map((skill) => <button key={skill.id} type="button" onClick={() => setSkillId((current) => current === skill.id ? null : skill.id)} className={`w-full border-b border-edito-border px-3 py-3 text-left ${skillId === skill.id ? "bg-edito-brass/10" : ""}`}><span className="flex items-baseline justify-between gap-2"><span className="text-xs font-bold text-edito-navy">{skill.name}</span><span className="text-[10px] font-bold text-edito-muted">{skill.profileCount} profils</span></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-edito-chip"><span className="block h-full rounded-full bg-edito-brass" style={{ width: `${(skill.profileCount / max) * 100}%` }} /></span></button>)}</section>{skillId && <section className="rounded-xl border border-edito-brass/40 bg-edito-surface"><h3 className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-edito-navy">Profils concernés</h3>{selectedProfiles.map((profile) => <MobileProfileRow key={`${profile.kind}-${profile.id}`} profile={profile} onSelect={onSelect} />)}</section>}</div>
}

export function TalentKnowledgeMobile({ snapshot, onBack }: { snapshot: TalentKnowledgeSnapshot; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TalentTab>("team")
  const [query, setQuery] = useState("")
  const [openPractice, setOpenPractice] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<TalentProfile | null>(null)
  const profiles = activeTab === "team" ? snapshot.collaborators.filter(isTeamMember) : activeTab === "alumni" ? snapshot.collaborators.filter(isAlumni) : snapshot.candidates
  const groups = activeTab === "candidates" ? Array.from(profiles.reduce((map, profile) => { const key = candidateEditorialGroup(profile as typeof snapshot.candidates[number]); map.set(key, [...(map.get(key) ?? []), profile]); return map }, new Map<string, TalentProfile[]>())) : Array.from(profiles.reduce((map, profile) => { const key = profile.practice?.trim() || "Practice non renseignée"; map.set(key, [...(map.get(key) ?? []), profile]); return map }, new Map<string, TalentProfile[]>())).sort(([left], [right]) => left.localeCompare(right))
  const filteredGroups = groups.map(([name, groupProfiles]) => [name, groupProfiles.filter((profile) => profileMatchesQuery(profile, query))] as const).filter(([, groupProfiles]) => groupProfiles.length > 0)

  return <div className="min-h-screen bg-edito-canvas pb-20 text-edito-body"><header className="sticky top-0 z-20 border-b border-edito-border bg-edito-surface px-4 py-2"><button type="button" onClick={onBack} className="min-h-11 text-sm font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass">← Talents</button></header><main className="space-y-3 px-4 py-4">{activeTab !== "skills" && <label className="relative block"><span className="sr-only">Rechercher un profil</span><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-edito-muted" aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un profil…" className="h-11 w-full rounded-md border border-edito-border bg-edito-surface pl-8 pr-3 text-xs text-edito-body placeholder:text-edito-muted focus:border-edito-brass focus:outline-none" /></label>}<TalentKnowledgeNavigation activeTab={activeTab} mobile onChange={(tab) => { setActiveTab(tab); setQuery(""); setOpenPractice(null) }} />{activeTab === "skills" ? <MobileSkillsMap snapshot={snapshot} onSelect={setSelectedProfile} /> : <div className="space-y-3">{filteredGroups.map(([name, groupProfiles], index) => <MobilePracticeSection key={name} name={name} profiles={groupProfiles} open={openPractice === name || (openPractice === null && index === 0)} onToggle={() => setOpenPractice((current) => current === name ? null : name)} onSelect={setSelectedProfile} />)}{filteredGroups.length === 0 && <p className="rounded-xl border border-edito-border bg-edito-surface px-3 py-10 text-center text-xs text-edito-muted">Aucun profil ne correspond à la recherche.</p>}</div>}</main><TalentProfileDetail profile={selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)} mobile /></div>
}
