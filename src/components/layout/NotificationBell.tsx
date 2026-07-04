"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  title: string
  body: string | null
  deep_link: string | null
  read_at: string | null
  created_at: string
}

const MAX_VISIBLE = 8

// ADR-0010 Lot 4 : notifie l'arrivée d'un brief hebdomadaire généré par le
// cron du lundi (report-weekly-manager-cron → user_notifications). Un run
// déclenché depuis l'UI (clic bouton) n'écrit jamais dans cette table — voir
// le commentaire dans /api/n8n/callback/route.ts.
export function NotificationBell() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      const { data } = await supabase
        .from("user_notifications")
        .select("id, title, body, deep_link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(MAX_VISIBLE)

      if (!cancelled && data) setNotifications(data)
    }

    void loadInitial()

    const channel = supabase
      .channel("user-notifications-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications" },
        (payload) => {
          setNotifications((current) => [payload.new as Notification, ...current].slice(0, MAX_VISIBLE))
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  async function handleSelect(notification: Notification) {
    setOpen(false)
    if (!notification.read_at) {
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
      await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id)
    }
    if (notification.deep_link) router.push(notification.deep_link)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex size-8 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-muted transition-colors hover:bg-surface-hover hover:text-heading"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 rounded-[var(--radius-medium)] border border-border bg-surface shadow-[var(--shadow-overlay-md)]">
          <div className="border-b border-border px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Notifications</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">Aucune notification pour l&apos;instant.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-hover",
                    !notification.read_at && "bg-primary/[0.04]",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-heading">
                    {!notification.read_at && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    {notification.title}
                  </span>
                  {notification.body && (
                    <span className="line-clamp-2 text-[11px] text-muted">{notification.body}</span>
                  )}
                  <span className="text-[10px] text-muted">{formatDateTime(notification.created_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
