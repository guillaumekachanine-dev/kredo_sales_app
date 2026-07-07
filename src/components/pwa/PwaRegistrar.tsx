"use client"

import { useEffect } from "react"

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    async function syncServiceWorker() {
      if (process.env.NODE_ENV !== "production") {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))

        if ("caches" in window) {
          const cacheKeys = await window.caches.keys()
          await Promise.all(
            cacheKeys
              .filter((key) => key.startsWith("kredo-static"))
              .map((key) => window.caches.delete(key)),
          )
        }

        return
      }

      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
    }

    syncServiceWorker().catch((error: unknown) => {
      console.error("Service worker registration failed", error)
    })
  }, [])

  return null
}
