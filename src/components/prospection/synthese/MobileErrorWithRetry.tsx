"use client"

import { ErrorState } from "@/components/ui/ErrorState"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

export function MobileErrorWithRetry({
  title,
  message,
}: {
  title: string
  message: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <ErrorState
      title={title}
      message={isPending ? "Rechargement en cours…" : message}
      onRetry={() => startTransition(() => router.refresh())}
    />
  )
}
