export const COCKPIT_RETURN_EVENT = "kredo:return-to-account-cockpit"
export const COCKPIT_OPEN_EVENT = "kredo:open-cockpit"

export function returnToAccountCockpit() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(COCKPIT_RETURN_EVENT))
}

export function openCockpit() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(COCKPIT_OPEN_EVENT))
}
