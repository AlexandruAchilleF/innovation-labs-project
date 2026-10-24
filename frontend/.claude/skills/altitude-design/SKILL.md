---
name: altitude-design
description: SunProof UI visual style ("Altitude" — dark midnight financial editorial). Use before creating or restyling any UI component, page, chart, colour, font, spacing, or Tailwind/CSS token in frontend/.
---

# Altitude design system

Full reference: [DESIGN.md](DESIGN.md) (tokens, type scale, components, do's/don'ts, quick-start CSS).
Read only the section you need: `grep -n '^## ' DESIGN.md`, then `sed -n` that range.

## Non-negotiables
- Dark only: canvas `#181818`; surfaces step `#111` → `#181818` → `#1f1f1f` → `#262626` → `#323232`.
- Structure comes from hairline borders, not shadows or gradients.
- One chromatic accent: Voltage Blue `#2b7fff` (links, selection, active state). Any other colour must mean something (e.g. severity status), never decoration.
- Fonts: Libre Baskerville for display headlines only (400/500, never bold, -0.025em); Inter for all functional UI; Fira Code for IDs and numbers shown as data.
- Tight rectangular components (4–8px radii), content-first, dense data tables.
- Text budget: almost no prose. No explanatory captions or helper paragraphs, no repeated status tags; charts must
  read without explanation (see "Text Budget" in DESIGN.md).

## In this repo
- Map tokens to CSS variables / the Tailwind theme once; never hard-code hex values in components.
- Romanian labels still come from `src/lib/i18n.ts`; this skill covers visuals only.
