"use client"

import dynamic from "next/dynamic"

// Chrome du shell par device, chargée dynamiquement — audit d'ouverture des pages (O-7).
//
// `AppShell` est un Server Component qui distribue Desktop ou Mobile par un `if`.
// Importées statiquement, les deux chromes figuraient dans le socle de TOUTES les
// routes : le desktop téléchargeait la navigation mobile, le FAB et la recherche
// rapide mobile ; le mobile, la sidebar et le panneau Intelligence. Next 16 ne découpe
// pas un Client Component importé dynamiquement depuis un Server Component
// (docs `lazy-loading.md`) : le découpage se fait dans ce module client. Rendu
// serveur conservé, mêmes noms que les composants d'origine.
//
// Pas de `loading` : ces composants sont rendus côté serveur et leur chunk est
// préchargé avec la page ; il n'y a pas d'état intermédiaire à dessiner.

// Un import dynamique par device, vers un module qui regroupe sa chrome : mesuré au
// build, cinq imports séparés dupliquaient les modules partagés et alourdissaient
// le desktop jusqu'à +22 Ko gzip sur certaines routes.
const loadDesktopChrome = () => import("./desktop-chrome")
const loadMobileChrome = () => import("./mobile-chrome")

export const DesktopSidebar = dynamic(() => loadDesktopChrome().then((m) => m.DesktopSidebar))

export const IntelligencePanel = dynamic(() =>
  loadDesktopChrome().then((m) => m.IntelligencePanel),
)

export const MobileNav = dynamic(() => loadMobileChrome().then((m) => m.MobileNav))

export const IntelligenceFAB = dynamic(() => loadMobileChrome().then((m) => m.IntelligenceFAB))

export const MobileAccountQuickSearchHost = dynamic(() =>
  loadMobileChrome().then((m) => m.MobileAccountQuickSearchHost),
)
