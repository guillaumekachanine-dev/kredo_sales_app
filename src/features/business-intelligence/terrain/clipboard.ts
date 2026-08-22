/**
 * Utilitaire de copie dans le presse-papier avec fallback document/textarea.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback ci-dessous
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      textarea.style.opacity = "0"
      document.body.append(textarea)
      textarea.select()
      const successful = document.execCommand("copy")
      textarea.remove()
      return successful
    } catch {
      return false
    }
  }

  return false
}
