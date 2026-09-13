"use client"

import { useSearchParams } from "next/navigation"
import { WorkspaceContentSkeleton, type WorkspaceBodyVariant } from "./WorkspaceSkeleton"

// Squelette de zone de contenu dont le gabarit suit le chapitre DEMANDÉ.
//
// Un `loading.tsx` ne reçoit pas les `searchParams`. Or au sein d'un workspace, le
// chapitre cible (`?vue=missions-at`, `?section=besoins`…) change radicalement la
// forme du contenu : tableau de bord ou trois panneaux. Le fallback est rendu dans
// l'arbre de la navigation en cours, donc `useSearchParams()` y lit déjà l'URL de
// destination — c'est le seul endroit où cette information est disponible.
//
// Props sérialisables uniquement (rendu depuis un Server Component `loading.tsx`).

interface UrlAwareContentSkeletonProps {
  param: string
  variants: Record<string, WorkspaceBodyVariant>
  fallback?: WorkspaceBodyVariant
  label?: string
}

export function UrlAwareContentSkeleton({
  param,
  variants,
  fallback = "dashboard",
  label,
}: UrlAwareContentSkeletonProps) {
  const value = useSearchParams().get(param)
  const body = (value && variants[value]) || fallback
  return <WorkspaceContentSkeleton body={body} label={label} />
}
