-- Silver S Construction CRM — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Column names match src/data/supabaseRepository.ts exactly.

-- ─────────────────────────────── enums ───────────────────────────────
create type lead_stage as enum (
  'new_lead', 'contacted', 'estimate_sent', 'won', 'lost',
  'in_progress', 'completed', 'invoiced', 'paid'
);
create type lead_source as enum ('website_form', 'instagram', 'referral', 'walk_in', 'other');
create type estimate_status as enum ('draft', 'sent', 'accepted', 'declined');
create type job_status as enum ('scheduled', 'in_progress', 'completed');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');
create type attachment_owner as enum ('lead', 'job');
create type attachment_kind as enum ('file', 'before', 'after');

-- ─────────────────────────────── tables ──────────────────────────────
create table leads (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  email        text not null default '',
  phone        text not null default '',
  address      text not null default '',
  description  text not null default '',
  source       lead_source not null default 'other',
  stage        lead_stage  not null default 'new_lead',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table notes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id     uuid not null references leads (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create table estimates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id     uuid not null references leads (id) on delete cascade,
  number      text not null,
  title       text not null default '',
  issue_date  date not null default current_date,
  status      estimate_status not null default 'draft',
  notes       text not null default '',
  -- [{ id, description, qty, unitPrice }]
  line_items  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table jobs (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id      uuid not null references leads (id) on delete cascade,
  estimate_id  uuid references estimates (id) on delete set null,
  title        text not null default '',
  start_date   date,
  end_date     date,
  status       job_status not null default 'scheduled',
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table invoices (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id       uuid not null references jobs (id) on delete cascade,
  lead_id      uuid not null references leads (id) on delete cascade,
  number       text not null,
  issue_date   date not null default current_date,
  due_date     date,
  status       invoice_status not null default 'draft',
  -- Plain text/URL only. No payment processing lives in this app.
  payment_link text not null default '',
  notes        text not null default '',
  line_items   jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table attachments (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_type  attachment_owner not null,
  -- Points at a lead or a job depending on owner_type; no FK for that reason.
  owner_ref   uuid not null,
  kind        attachment_kind not null default 'file',
  name        text not null,
  mime_type   text not null default '',
  size        bigint not null default 0,
  url         text not null,
  created_at  timestamptz not null default now()
);

create index on leads (stage);
create index on leads (created_at desc);
create index on estimates (lead_id);
create index on jobs (lead_id);
create index on invoices (job_id);
create index on attachments (owner_type, owner_ref);

-- ──────────────────────── row level security ─────────────────────────
-- Single-operator app: you can only ever see your own rows.
alter table leads       enable row level security;
alter table notes       enable row level security;
alter table estimates   enable row level security;
alter table jobs        enable row level security;
alter table invoices    enable row level security;
alter table attachments enable row level security;

create policy "own rows" on leads       for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on notes       for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on estimates   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on jobs        for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on invoices    for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on attachments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─────────────────────────────── storage ─────────────────────────────
-- Dashboard → Storage → New bucket → name: attachments.
-- Public bucket is simplest for photos you'll also share with clients;
-- switch to signed URLs later if that matters.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "owner writes attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');

create policy "owner reads attachments"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments');

create policy "owner deletes attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'attachments');
