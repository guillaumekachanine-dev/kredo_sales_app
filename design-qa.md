# Cockpit mobile Hero — design QA

## Evidence

- Source visual truth: `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/codex-clipboard-3a17d764-6b44-45e7-b023-e140ce9c7dd1.png` (532 × 327 px), plus the solid-colour source `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/codex-clipboard-5de8e4fd-7b3a-4702-b523-1fda21ef89bc.png` (116 × 42 px).
- Browser-rendered implementation: inspected in the Codex in-app browser at a 390 × 844 CSS-pixel viewport. Its streamed capture is not persisted to a filesystem path by that browser surface.
- Agent-browser capture attempt: `/tmp/kredo-cockpit-mobile-hero-390x844.png` (390 × 844 px, CSS density 1) is not a valid implementation capture: the required persisted authentication state redirected to `/login?next=%2Fcockpit`.
- State: populated `/cockpit` homepage; Quick Actions opened and closed successfully in the in-app browser.

## Comparison ledger

1. **Palette / tokens** — matched. The Hero now resolves to `#1A417C`; its CSS background mass resolves to `#3F6288` through semantic global tokens.
2. **Layout / crop** — matched. Hero height remains 258 px; white surface starts at y=198 px with 60 px overlap, 19 px horizontal margins, 352 px width and 28 px upper radius.
3. **Illustration treatment** — matched. The existing transparent illustration remains unchanged and has been shifted 16 px to the left, retaining a right-weighted composition while freeing the Quick Actions area.
4. **Date / typography** — matched in the in-app capture. The date is formatted from `snapshot.generatedAt` in `Europe/Paris`, capitalized, positioned directly above the white surface and styled as secondary editorial text.
5. **Quick Actions / interaction** — matched. The original button callback and sheet are unchanged; the button keeps a 44 px target and renders with a 45% white translucent fill plus a subtle white border.
6. **Desktop isolation** — matched by component scope. Changes are limited to the mobile home component, its stylesheet and globally scoped semantic color tokens; no desktop component changed.

## Findings

- [P1] A valid persisted screenshot from the mandated authenticated agent-browser session is unavailable. The session file `.codex/auth-state.json` is expired and redirects to the login page. The app authentication was not altered.

## Resolution required

Renew `.codex/auth-state.json`, then capture `/cockpit` at 390 × 844 through agent-browser and perform the required filesystem-backed `view_image` comparison with the source image.

## Final result

blocked
