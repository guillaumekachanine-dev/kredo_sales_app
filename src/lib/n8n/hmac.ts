// ─── Sécurité HMAC-SHA256 ─────────────────────────────────────────────────────
// Deux usages :
//   signPayload()  → Next signe avant d'envoyer à n8n  (CORE-001)
//   verifyHmac()   → Next vérifie ce que n8n envoie    (CORE-002)
//
// Le même secret N8N_WEBHOOK_SECRET est configuré des deux côtés.
// Côté n8n : Header Auth node ou expression dans le HTTP Request node.

import { createHmac, timingSafeEqual } from "crypto"

function getSecret(): string {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) throw new Error("N8N_WEBHOOK_SECRET is not set")
  return secret
}

// Signe un body JSON (string). Retourne "sha256=<hex>".
export function signPayload(body: string): string {
  return "sha256=" + createHmac("sha256", getSecret()).update(body).digest("hex")
}

// Vérifie la signature X-KREDO-Signature envoyée par n8n.
// timingSafeEqual empêche les attaques temporelles.
export function verifyHmac(body: string, signature: string): boolean {
  if (!signature.startsWith("sha256=")) return false
  const expected = "sha256=" + createHmac("sha256", getSecret()).update(body).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
