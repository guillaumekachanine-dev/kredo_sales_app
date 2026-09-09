**Comparison target**

- Source visual truth: `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/codex-clipboard-ada70ae6-091e-4fea-b412-cba63e98a72a.png`
- Source pixels: 477 × 1006.
- Implementation: authenticated local `/agenda?mode=calendar&date=2026-09-09&filters=commerce%2Crecruitment`, rendered at 390 × 844 CSS px in Chrome.
- State: selected weekday, Commerce and Recrutement filters active, linked task present in the first event.

**Evidence**

- The source was opened at native size.
- A browser-rendered implementation capture was reviewed at the stated mobile viewport. The capture is not persistable from the connected Chrome automation surface, so no implementation screenshot path is available for a normalized, side-by-side artifact.
- Focused review covered the header actions, decorative area, date strip, filter row, timeline rail, first three bubbles, and linked-task row.

**Findings**

- [P3] The implementation deliberately uses KREDO’s restrained mandarin token treatment rather than the more saturated orange surround of the reference. This preserves the existing product palette and keeps the page surface legible.
- [P3] Live Agenda content can make a bubble taller than the reference when it includes a task row. The task remains integrated in the event bubble, as required.

**Required fidelity surfaces**

- Fonts and typography: KREDO heading and body styles preserve the title/action hierarchy; event titles and times remain the dominant card row.
- Spacing and layout rhythm: header actions align to the title, the dates and filters are compact, and the rail starts with the first event without a separate card system.
- Colors and visual tokens: the warm backdrop uses the existing accent token; existing semantic Agenda colors still drive bubbles and dots.
- Image quality and asset fidelity: the added transparent 1536 × 1024 PNG is an original, low-opacity architectural line-art decoration, rendered through Next Image. It is decorative only and never covers controls.
- Copy and content: existing Agenda labels, filter names, event context, duration, and linked-task copy are retained.

**Implementation checklist**

- [x] Compact title-aligned circular consultation and creation actions.
- [x] Add low-contrast transparent header decoration.
- [x] Preserve date selection, horizontal filters, timeline, event opening, linked-task toggle, report/action entry points, and URL-driven filters.

**Final result**

blocked

Blocker: the available authenticated Chrome capture can be visually reviewed but cannot be written to a local screenshot path, preventing the required normalized side-by-side comparison artifact.
