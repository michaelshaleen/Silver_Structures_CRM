# Silver S Construction — CRM

A single-operator CRM for a residential construction/remodeling business.
Lead → Estimate → Job → Invoice, built lean.

React 19 + Vite + TypeScript + Tailwind v4. Runs on a local-storage data layer
out of the box, and switches to Supabase (Postgres, auth, file storage) by
filling in two environment variables.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Sign in with any email and the passcode **`silver`** (demo mode). The app loads
with a book of demo work — six leads spread across the pipeline, four estimates,
three jobs, one unpaid invoice. "Reset demo data" at the bottom of the page puts
it all back.

```bash
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

### From VS Code

Open the `silver-s-crm` folder (File → Open Folder — the folder itself, not its
parent), then either:

- **Run → Start Debugging (F5)** → "Run CRM in Chrome". Starts the dev server
  and opens the browser with breakpoints wired to the TypeScript source.
- **Terminal → Run Build Task (Ctrl/Cmd+Shift+B)** → runs `npm run dev`, then
  Ctrl/Cmd+click the localhost link in the terminal.

Run `npm install` once in the built-in terminal (Ctrl+`) before either.

## What's in it

**Pipeline** — New Lead → Contacted → Estimate Sent → Won (Job Scheduled) / Lost
→ In Progress → Completed → Invoiced → Paid.

- **Dashboard** — counts per stage, upcoming job start dates, outstanding money,
  waiting-on-payment list, newest leads.
- **Board** — kanban by stage, drag cards between columns. On a phone each card
  also carries a stage picker, since dragging on a job site is awkward.
- **Leads** — searchable table (name, email, phone, address, description) with
  stage, source and created-date filters. Filters live in the URL, so a filtered
  view can be bookmarked.
- **Lead detail** — contact details, tap-to-call / email / directions, activity
  notes, file and photo attachments, and every estimate, job and invoice for
  that client.
- **Estimates** — line items (description, qty, unit price), running total,
  status (draft/sent/accepted/declined). Accepting one schedules the job.
- **Jobs** — start/end dates, status, notes, separate before and after photo
  sets. One click turns a job into an invoice with the estimate's line items.
- **Invoices** — line items (pull from the estimate), status
  (draft/sent/paid/overdue), and a **payment link** field: paste a Stripe,
  Square, PayPal or Venmo link and it prints on the invoice. Nothing is
  processed in this app, by design.
- **Print / PDF** — estimates and invoices have a clean print view; "Save as
  PDF" in the browser's print dialog is the export. Works from a phone too.

Statuses drive the pipeline automatically: sending an estimate moves the lead to
Estimate Sent, accepting it to Won, starting the job to In Progress, marking an
invoice paid to Paid. The stage picker always wins if you want to override.

## Where data lives

Everything goes through one interface — `CrmRepository` in
`src/data/repository.ts`. Two implementations exist:

| | when | storage |
|---|---|---|
| `localRepository` | no env vars set | browser local storage, files inlined as data URLs (1.5 MB cap) |
| `supabaseRepository` | env vars set | Postgres tables + Supabase Storage bucket |

The UI never imports either one directly; `getRepository()` picks.

### Switching to Supabase

1. Create a project at supabase.com.
2. SQL editor → run `supabase/schema.sql` (tables, enums, RLS, storage bucket).
3. Authentication → Users → add yourself (email + password). There's no sign-up
   screen — it's a one-person app.
4. Copy `.env.example` to `.env` and fill in:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. Restart `npm run dev`. Login now uses real Supabase auth, data is in
   Postgres, and photos upload to the `attachments` bucket at full size.

Nothing in `src/components` or `src/pages` changes.

## Sharing a demo

The app runs entirely in the browser in demo mode, so a static host is enough —
no server, no database, no accounts. Build a version for plain static hosting
(Netlify drop, S3, GitHub Pages, an artifact link):

```bash
VITE_ROUTER=hash npx vite build --base=./ --outDir dist-demo
```

Two flags matter there: `--base=./` makes asset paths relative so the build
works from any subdirectory, and `VITE_ROUTER=hash` switches to hash routing so
refreshing a deep link doesn't 404 on a host without SPA rewrites. Plain
`npm run build` (clean paths, needs a rewrite rule) is what you want for a real
deployment.

`npm run build:demo` is that command as a script.

Each visitor gets their own copy of the demo data in their own browser. Nothing
they type is shared, synced, or visible to anyone else — which is exactly right
for letting someone explore, and exactly wrong for real client records.

### GitHub Pages

`.github/workflows/pages.yml` builds and publishes `dist-demo` on every push to
`main`. To turn it on: push the repo, then **Settings → Pages → Source: GitHub
Actions**. The site lands at `https://<user>.github.io/<repo>/`.

Note that a Pages site is public to anyone with the URL, even when published
from a private repo — there's no access control below GitHub Enterprise. Fine
for demo data; think twice once real company details are in `src/config.ts`.
`public/robots.txt` keeps it out of search results, which is not the same as
keeping it private.

## Lead intake

Every lead — the "Add Lead" form today, an automation later — goes through one
function. See `docs/LEAD_INTAKE.md` for how to point Zapier or a website form at
it without a refactor.

## Deliberately not built (v1)

Multiple users/roles/permissions · real payment processing · crew or
subcontractor scheduling · automated SMS/email follow-ups · live integrations.

## Layout

```
src/
  config.ts              company details printed on documents
  types.ts               domain model + stage/source labels
  data/
    leadIntake.ts        THE lead-creation entry point (pure, reusable server-side)
    repository.ts        the storage interface
    localRepository.ts   local-storage implementation
    supabaseRepository.ts Supabase implementation
    seed.ts              demo data
    index.ts             picks the implementation
  state/
    auth.tsx             passcode gate in demo mode, Supabase auth when configured
    store.tsx            loads the data, owns the cross-entity rules
  lib/                   money/date formatting, totals, pipeline math
  components/            UI kit, layout, kanban card, line-item editor, uploads
  pages/                 one file per screen
supabase/schema.sql      run this in the Supabase SQL editor
docs/LEAD_INTAKE.md      wiring the website form / Zapier later
```
# Silver_Structures_CRM
