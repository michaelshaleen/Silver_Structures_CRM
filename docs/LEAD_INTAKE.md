# Lead intake — one door in

Every lead that enters the CRM goes through the same two steps:

```ts
import { normalizeLeadInput } from '../data/leadIntake';

const lead = await repository.createLead(normalizeLeadInput(rawInput));
```

`normalizeLeadInput` (`src/data/leadIntake.ts`) validates and cleans the raw
input; `repository.createLead` writes it. The "Add Lead" form calls exactly this
path via `store.createLead`, and nothing else in the UI creates a lead.

`normalizeLeadInput` deliberately imports no React and no storage client, so the
same file runs unchanged on a server.

## What it accepts

The shape of the website quote form:

```json
{
  "name": "Dana Whitfield",
  "email": "dana@example.com",
  "phone": "(612) 555-0142",
  "address": "2841 Aldrich Ave S, Minneapolis, MN",
  "description": "Full kitchen remodel",
  "source": "website form",
  "createdAt": "2026-03-04T15:12:00Z"
}
```

- `name` is required; `email` **or** `phone` is required.
- `source` is fuzzy-matched — `"website form"`, `"web"`, `"quote_form"`, `"IG"`,
  `"walk-in"` all land on the right enum value; anything unrecognized becomes
  `other`.
- `stage` defaults to `new_lead`; `createdAt` defaults to now, so an import can
  preserve the original submission time.
- Bad input throws `LeadValidationError` carrying per-field messages.

`isLikelyDuplicate` is exported alongside it — the Add Lead form uses it to warn
when an email or phone already exists.

## Adding the automation later

### Option A — Supabase Edge Function (recommended)

Once the app runs on Supabase, add a function that reuses the same validation:

```ts
// supabase/functions/create-lead/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { normalizeLeadInput, LeadValidationError } from '../_shared/leadIntake.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-intake-secret') !== Deno.env.get('INTAKE_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const lead = normalizeLeadInput(await req.json());
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await db
      .from('leads')
      .insert({ ...lead, owner_id: Deno.env.get('OWNER_USER_ID') })
      .select()
      .single();
    if (error) throw error;
    return Response.json({ id: data.id }, { status: 201 });
  } catch (err) {
    const status = err instanceof LeadValidationError ? 422 : 500;
    return Response.json({ error: String(err) }, { status });
  }
});
```

Copy `src/data/leadIntake.ts` to `supabase/functions/_shared/leadIntake.ts` (or
symlink it) so validation stays in one place. The function needs the service
role key because there's no logged-in user on a webhook, which is why it also
needs its own shared secret and an explicit `owner_id`.

Then in **Zapier**: Gmail/IMAP trigger on the quote-form notification address →
parse the fields → Webhooks POST to the function URL with the
`x-intake-secret` header.

### Option B — embedded form on the website

Post the same JSON to the same endpoint. Keep the browser-side `anon` key out of
it; go through the function so the secret stays server-side.

### What not to do

Don't insert straight into the `leads` table from Zapier's Postgres action. That
skips normalization, so sources arrive as free text, blank-name rows get in, and
the pipeline stage can be anything. The endpoint is cheap; the cleanup isn't.
