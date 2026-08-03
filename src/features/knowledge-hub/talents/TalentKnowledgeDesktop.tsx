"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { StatusPill } from "@/components/ui/StatusPill"
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

type Population = "all" | "team" | "candidates"

function ProfileRow({ profile, onSelect }: { profile: TalentProfile; onSelect: (profile: TalentProfile) => void }) {
  const practice = getTalentPracticeVisual(profile.practice)
  const status = profile.kind === "candidate" ? candidateStatusLabel(profile.status) : collaboratorStatusLabel(profile.status)
  const mission = profile.kind === "collaborator" ? profile.missions[0] : null

  return (
    <button
      type="button"
      onClick={() => onSelect(profile)}
      className="grid w-full grid-cols-[2.35rem_minmax(10rem,1.4fr)_minmax(6rem,.7fr)_minmax(7rem,.9fr)_minmax(10rem,1fr)_auto] items-center gap-3 border-t border-edito-border px-4 py-3 text-left transition-colors hover:bg-edito-chip/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-brass"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-edito-navy text-[10px] font-bold text-white">{initialsFromName(profile.fullName)}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-edito-navy">{profile.fullName}</span>
        <span className="mt-0.5 block truncate text-[10px] text-edito-muted">{profile.currentTitle || "Titre non renseigné"}</span>
      </span>
      <span className="min-w-0 text-[10px] font-medium text-edito-body">{profile.seniority || "—"}</span>
      <StatusPill label={status} variant={profile.kind === "collaborator" && profile.status === "en_mission" ? "success" : "neutral"} className="w-fit max-w-full" />
      <span className="min-w-0 text-[10px] text-edito-body">
        {mission ? <><span className="block truncate font-medium">{mission.title}</span><span className="block truncate text-edito-muted">{mission.companyName || "Client non renseigné"}</span></> : "—"}
      </span>
      <span className="flex max-w-52 flex-wrap justify-end gap-1">
        {profile.skills.slice(0, 3).map((skill) => <Badge key={skill.id} variant="neutral">{skill.name}</Badge>)}
        {profile.skills.length > 3 && <span className="text-[10px] font-bold text-edito-muted">+{profile.skills.length - 3}</span>}
      </span>
      <span aria-hidden="true" className="text-lg text-edito-brass">›</span>
    </button>
  )
}

function PracticeSection({ name, profiles, onSelect }: { name: string; profiles: TalentProfile[]; onSelect: (profile: TalentProfile) => void }) {
  const [open, setOpen] = useState(true)
  const visual = getTalentPracticeVisual(name)

  return (
    <section className="overflow-hidden rounded-lg border border-edito-border bg-edito-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center gap-3 bg-edito-chip/50 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-brass"
        aria-expanded={open}
      >
        <span className="size-6 shrink-0 rounded-sm border border-edito-border bg-edito-surface p-1" style={{ borderLeftColor: visual.color, borderLeftWidth: 3 }}>
          {visual.icon ? <img src={visual.icon} alt="" className="size-full object-contain" /> : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-edito-navy">{name}</span>
        <span className="rounded-full bg-edito-surface px-2 py-0.5 text-[10px] font-bold text-edito-muted">{profiles.length}</span>
        <span aria-hidden="true" className="text-base text-edito-navy">{open ? "⌃" : "⌄"}</span>
      </button>
      {open && <div>{profiles.map((profile) => <ProfileRow key={`${profile.kind}-${profile.id}`} profile={profile} onSelect={onSelect} />)}</div>}
    </section>
  )
}

function SkillsMap({ snapshot, onSelect, onSelectProfile }: { snapshot: TalentKnowledgeSnapshot; onSelect: (skillId: string | null) => void; onSelectProfile: (profile: TalentProfile) => void }) {
  const [population, setPopulation] = useState<Population>("all")
  const [practice, setPractice] = useState("all")
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const practices = useMemo(() => Array.from(new Set([...snapshot.collaborators, ...snapshot.candidates].map((profile) => profile.practice).filter(Boolean) as string[])).sort(), [snapshot])
  const profiles = useMemo(() => [...snapshot.collaborators, ...snapshot.candidates].filter((profile) => {
    if (population === "team" && profile.kind !== "collaborator") return false
    if (population === "candidates" && profile.kind !== "candidate") return false
    return practice === "all" || profile.practice === practice
  }), [population, practice, snapshot])
  const skills = useMemo(() => snapshot.topSkills.filter((skill) => profiles.some((profile) => profile.skills.some((item) => item.id === skill.id))), [profiles, snapshot.topSkills])
  const selectedProfiles = selectedSkillId ? profiles.filter((profile) => profile.skills.some((skill) => skill.id === selectedSkillId)) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-edito-border pb-3">
        <PageFilterSelect id="talent-population" label="Population" value={population} onChange={(value) => setPopulation(value as Population)} options={[{ value: "all", label: "Tous les profils" }, { value: "team", label: "Équipe" }, { value: "candidates", label: "Candidats" }]} />
        <PageFilterSelect id="talent-skills-practice" label="Practice" value={practice} onChange={setPractice} options={[{ value: "all", label: "Toutes les practices" }, ...practices.map((item) => ({ value: item, label: item }))]} />
      </div>
      <section className="overflow-hidden rounded-lg border border-edito-border bg-edito-surface">
        <div className="grid grid-cols-[minmax(12rem,1fr)_7rem_7rem_6rem] gap-3 border-b border-edito-border bg-edito-navy px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-edito-gold">
          <span>Compétence</span><span>Profils</span><span>Équipe / candidats</span><span>Niveau moyen</span>
        </div>
        {skills.map((skill) => {
          const isSelected = skill.id === selectedSkillId
          const profileCount = profiles.filter((profile) => profile.skills.some((item) => item.id === skill.id)).length
          const teamCount = profiles.filter((profile) => profile.kind === "collaborator" && profile.skills.some((item) => item.id === skill.id)).length
          const candidateCount = profiles.filter((profile) => profile.kind === "candidate" && profile.skills.some((item) => item.id === skill.id)).length
          return (
            <button key={skill.id} type="button" onClick={() => { const next = isSelected ? null : skill.id; setSelectedSkillId(next); onSelect(next) }} className={`grid w-full grid-cols-[minmax(12rem,1fr)_7rem_7rem_6rem] gap-3 border-b border-edito-border px-4 py-3 text-left text-xs transition-colors ${isSelected ? "bg-edito-brass/10" : "hover:bg-edito-chip/70"}`}>
              <span className="font-bold text-edito-navy">{skill.name}</span><span className="text-edito-body">{profileCount}</span><span className="text-edito-muted">{teamCount} / {candidateCount}</span><span className="text-edito-body">{skill.averageLevel ?? "—"}</span>
            </button>
          )
        })}
      </section>
      {selectedSkillId && (
        <section className="rounded-lg border border-edito-brass/40 bg-edito-surface p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">Profils concernés</h3>
          <div className="mt-3 divide-y divide-edito-border">{selectedProfiles.map((profile) => <ProfileRow key={`${profile.kind}-${profile.id}`} profile={profile} onSelect={onSelectProfile} />)}</div>
        </section>
      )}
    </div>
  )
}

export function TalentKnowledgeDesktop({ snapshot, onBack }: { snapshot: TalentKnowledgeSnapshot; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TalentTab>("team")
  const [query, setQuery] = useState("")
  const [practice, setPractice] = useState("all")
  const [seniority, setSeniority] = useState("all")
  const [status, setStatus] = useState("all")
  const [selectedProfile, setSelectedProfile] = useState<TalentProfile | null>(null)
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const profiles = activeTab === "team" ? snapshot.collaborators.filter(isTeamMember) : activeTab === "alumni" ? snapshot.collaborators.filter(isAlumni) : snapshot.candidates
  const practices = useMemo(() => Array.from(new Set(profiles.map((profile) => profile.practice).filter(Boolean) as string[])).sort(), [profiles])
  const seniorities = useMemo(() => Array.from(new Set(profiles.map((profile) => profile.seniority).filter(Boolean) as string[])).sort(), [profiles])
  const statuses = useMemo(() => Array.from(new Set(profiles.map((profile) => profile.status))).sort(), [profiles])
  const filteredProfiles = profiles.filter((profile) => profileMatchesQuery(profile, query) && (practice === "all" || profile.practice === practice) && (seniority === "all" || profile.seniority === seniority) && (status === "all" || profile.status === status) && (!selectedSkillId || profile.skills.some((skill) => skill.id === selectedSkillId)))
  const groups = activeTab === "candidates"
    ? Array.from(filteredProfiles.reduce((map, profile) => { const key = candidateEditorialGroup(profile as typeof snapshot.candidates[number]); map.set(key, [...(map.get(key) ?? []), profile]); return map }, new Map<string, TalentProfile[]>()))
    : Array.from(filteredProfiles.reduce((map, profile) => { const key = profile.practice?.trim() || "Practice non renseignée"; map.set(key, [...(map.get(key) ?? []), profile]); return map }, new Map<string, TalentProfile[]>())).sort(([left], [right]) => left.localeCompare(right))

  return (
    <div className="space-y-5">
      <header className="border-b border-edito-border pb-4">
        <button type="button" onClick={onBack} className="inline-flex h-8 items-center rounded-md border border-edito-border bg-edito-surface px-3 text-[10px] font-bold text-edito-navy transition-colors hover:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass">← Retour aux domaines</button>
        <div className="mt-4 flex items-end justify-between gap-6">
          <div className="flex items-center gap-3"><span className="inline-flex size-10 items-center justify-center rounded-lg bg-edito-navy text-lg text-edito-gold" aria-hidden="true">♧</span><div><h1 className="text-2xl font-bold tracking-tight text-edito-navy">Talents</h1><p className="mt-1 text-xs text-edito-body">Personnes, expériences et compétences disponibles dans l&apos;écosystème KREDO.</p></div></div>
          <dl className="flex shrink-0 divide-x divide-edito-border rounded-lg border border-edito-border bg-edito-surface"><div className="px-3 py-2 text-center"><dt className="text-[9px] font-bold uppercase tracking-wide text-edito-muted">Équipe</dt><dd className="text-sm font-bold text-edito-navy">{snapshot.counts.team}</dd></div><div className="px-3 py-2 text-center"><dt className="text-[9px] font-bold uppercase tracking-wide text-edito-muted">Alumni</dt><dd className="text-sm font-bold text-edito-navy">{snapshot.counts.alumni}</dd></div><div className="px-3 py-2 text-center"><dt className="text-[9px] font-bold uppercase tracking-wide text-edito-muted">Candidats</dt><dd className="text-sm font-bold text-edito-navy">{snapshot.counts.candidates}</dd></div><div className="px-3 py-2 text-center"><dt className="text-[9px] font-bold uppercase tracking-wide text-edito-muted">Compétences</dt><dd className="text-sm font-bold text-edito-navy">{snapshot.counts.skilledProfiles}</dd></div></dl>
        </div>
      </header>
      <TalentKnowledgeNavigation activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setSelectedSkillId(null); setStatus("all") }} />
      {activeTab !== "skills" ? <><div className="flex flex-wrap gap-2"><label className="relative min-w-64 flex-1"><span className="sr-only">Rechercher un profil, métier ou compétence</span><span className="absolute inset-y-0 left-3 flex items-center text-edito-muted" aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un profil, métier ou compétence" className="h-9 w-full rounded-md border border-edito-border bg-edito-surface pl-8 pr-3 text-xs text-edito-body placeholder:text-edito-muted focus:border-edito-brass focus:outline-none" /></label><PageFilterSelect id="talent-practice" label="Practice" value={practice} onChange={setPractice} options={[{ value: "all", label: "Toutes les practices" }, ...practices.map((item) => ({ value: item, label: item }))]} /><PageFilterSelect id="talent-seniority" label="Séniorité" value={seniority} onChange={setSeniority} options={[{ value: "all", label: "Toutes les séniorités" }, ...seniorities.map((item) => ({ value: item, label: item }))]} /><PageFilterSelect id="talent-status" label="Statut" value={status} onChange={setStatus} options={[{ value: "all", label: "Tous les statuts" }, ...statuses.map((item) => ({ value: item, label: activeTab === "candidates" ? candidateStatusLabel(item) : collaboratorStatusLabel(item) }))]} /></div><div className="space-y-3">{groups.map(([name, groupedProfiles]) => <PracticeSection key={name} name={name} profiles={groupedProfiles} onSelect={setSelectedProfile} />)}{groups.length === 0 && <p className="rounded-lg border border-edito-border bg-edito-surface px-4 py-10 text-center text-xs text-edito-muted">Aucun profil ne correspond aux filtres sélectionnés.</p>}</div></> : <SkillsMap snapshot={snapshot} onSelect={setSelectedSkillId} onSelectProfile={setSelectedProfile} />}
      <TalentProfileDetail profile={selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)} />
    </div>
  )
}
