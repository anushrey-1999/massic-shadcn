# Massic Admin Dashboard v1 — Frontend Notes

## Routes

- `/admin/login` — Google-only super-admin sign-in.
- `/admin` — executive network overview.
- `/admin/businesses` and `/admin/businesses/[id]` — directory and read-only snapshot.
- `/admin/agencies/[id]` — agency-scoped snapshot.
- `/admin/{network-performance,growth,api-cost,industry,category-insights,platform-totals,subscription}` — shared module layout.

All implementation code is isolated under `src/features/admin`; App Router files only compose that feature. The normal customer sidebar is intentionally disabled for every `/admin` route.

## UX rules

- The first task is network orientation, followed by finding a business that needs attention.
- Admin pages are read-only. Do not add edit, impersonation, billing, or destructive controls without a new security design.
- `null` is never formatted as zero. Unavailable and partial sources must retain their label and explanation.
- All requests use React Query pending/error states. Export and sign-out controls disable duplicate actions while pending.
- Keep the 216px app sidebar, 52px top bar, Geist 400/500 type, token colors, 4px spacing scale, and 6–8px radii from `../massic-ui-style-guide.md`.

## Local verification

1. Configure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and the Node API URL.
2. Grant the Google email through the backend CLI.
3. Run the backend migrations and admin backfill.
4. Run `npm run build`, then inspect desktop and mobile layouts at `/admin`.
