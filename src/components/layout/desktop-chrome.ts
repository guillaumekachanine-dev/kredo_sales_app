// Point d'entrée UNIQUE de la chrome Desktop pour le chargement dynamique
// (`app-shell-device-chrome.tsx`) : un seul groupe de chunks par device, pour ne
// pas dupliquer les modules partagés entre plusieurs imports dynamiques.
export { DesktopSidebar } from "./DesktopSidebar"
export { IntelligencePanel } from "@/components/intelligence/IntelligencePanel"
