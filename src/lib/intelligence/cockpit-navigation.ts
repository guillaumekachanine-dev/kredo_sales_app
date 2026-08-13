export const COCKPIT_RETURN_EVENT = "kredo:return-to-account-cockpit"

export function returnToAccountCockpit() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(COCKPIT_RETURN_EVENT))
}
