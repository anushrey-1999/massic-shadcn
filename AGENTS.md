# Massic Shadcn UI Instructions

Before implementing or changing any UI in this app, read:

`docs/massic-ui-style-guide.md`

Use it as the canonical Massic UI style guide.

Rules:
- Preserve existing `massic-shadcn` component patterns first.
- Use the guide for colors, typography, spacing, layout, copy tone, interaction states, and responsive behavior.
- For any new or modified UI, include loading, saving, disabled, empty, error, success, selected, and pending states where relevant.
- Do not introduce visual styles outside the guide unless explicitly requested.
- Prefer existing shadcn/Radix/Tailwind components and local design patterns.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
