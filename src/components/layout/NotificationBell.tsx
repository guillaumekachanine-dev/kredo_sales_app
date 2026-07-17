"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  notification_type: string
  title: string
  body: string | null
  deep_link: string | null
  read_at: string | null
  created_at: string
}

const MAX_VISIBLE = 8
const FAILURE_TYPES = new Set(["ai_run_failed", "ai_run_reaped"])

// ADR-0010 Lot 4 : notifie l'arrivée d'un brief hebdomadaire généré par le
// cron du lundi (report-weekly-manager-cron → user_notifications). Un run
// déclenché depuis l'UI (clic bouton) n'écrit jamais dans cette table — voir
// le commentaire dans /api/n8n/callback/route.ts.
// Dispositif d'alerte échec workflow (2026-07-18) : ai_run_failed/ai_run_reaped
// sont écrits par un trigger DB (migration 058), pas par le front — la bounce
// et l'anneau rouge ici ne font que réagir à leur arrivée en Realtime.
export function NotificationBell() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  /** Tracks whether the panel is currently visible in the DOM (for exit animation). */
  const [mounted, setMounted] = useState(false)
  /** Plays the bounce once on a new workflow-failure arrival, then clears itself. */
  const [alertBounce, setAlertBounce] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      const { data } = await supabase
        .from("user_notifications")
        .select("id, notification_type, title, body, deep_link, read_at, created_at")
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
          const notification = payload.new as Notification
          setNotifications((current) => [notification, ...current].slice(0, MAX_VISIBLE))
          if (FAILURE_TYPES.has(notification.notification_type)) setAlertBounce(true)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  // When `open` becomes true, mount immediately. When it becomes false,
  // we keep `mounted` true so the exit animation plays, and unmount via onAnimationEnd.
  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

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
  const hasUnreadFailure = notifications.some((n) => !n.read_at && FAILURE_TYPES.has(n.notification_type))

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
        aria-label={
          hasUnreadFailure
            ? `${unreadCount} notification(s) dont un échec de workflow non lu`
            : unreadCount > 0
              ? `${unreadCount} notification(s) non lue(s)`
              : "Notifications"
        }
        aria-expanded={open}
        onAnimationEnd={() => setAlertBounce(false)}
        className={cn(
          "relative inline-flex size-8 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-muted transition-all duration-200 hover:bg-surface-hover hover:text-heading hover:shadow-sm",
          open && "bg-surface-hover text-heading shadow-sm ring-1 ring-primary/20",
          hasUnreadFailure && !open && "border-danger/40 ring-1 ring-danger/30",
          alertBounce && "kredo-bell-alert-bounce",
        )}
      >
        <Image
          src="/icons_set/logo_n8n.png"
          alt="n8n"
          width={18}
          height={18}
          className="pointer-events-none select-none"
          aria-hidden
        />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {mounted && (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 rounded-[var(--radius-medium)] border border-border bg-surface shadow-[var(--shadow-overlay-md)]",
            open
              ? "animate-[notifPanelIn_280ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
              : "animate-[notifPanelOut_220ms_cubic-bezier(0.55,0,1,0.45)_forwards]",
          )}
          style={{ transformOrigin: "top right" }}
          onAnimationEnd={() => {
            if (!open) setMounted(false)
          }}
        >
          <div className="border-b border-border px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Notifications</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">Aucune notification pour l&apos;instant.</p>
            ) : (
              notifications.map((notification) => {
                const isFailure = FAILURE_TYPES.has(notification.notification_type)
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-hover",
                      !notification.read_at && (isFailure ? "bg-danger/[0.05]" : "bg-primary/[0.04]"),
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-heading">
                      {!notification.read_at && (
                        <span className={cn("size-1.5 shrink-0 rounded-full", isFailure ? "bg-danger" : "bg-primary")} />
                      )}
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="line-clamp-2 text-[11px] text-muted">{notification.body}</span>
                    )}
                    <span className="text-[10px] text-muted">{formatDateTime(notification.created_at)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
