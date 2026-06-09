"use client"

import { useState, useTransition } from "react"
import { signInWithPassword } from "./actions"

interface LoginFormProps {
  next?: string
}

export function LoginForm({ next = "/cockpit" }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("next", next)

    startTransition(async () => {
      const result = await signInWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-heading">
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@exemple.com"
          className="rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium text-heading">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-heading placeholder:text-muted/50 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary/90 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  )
}
