"use client"

/**
 * Compatibility shim for historical page-level imports.
 * The real AssistanceCaseDrawer is mounted once from the authenticated layout
 * through the barrel export in components/staffing/index.tsx.
 */
export function StaffingDrawer() {
  return null
}
