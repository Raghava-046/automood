-- AutoMood early access leads schema
create extension if not exists pgcrypto;

create table if not exists early_access_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  business_name text not null,
  phone text not null,
  email text not null,
  business_type text,
  monthly_calls text,
  status text not null default 'new',
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint status_check check (status in ('new','contacted','qualified','demo_booked','converted','not_interested')),
  constraint email_unique unique (email),
  constraint phone_unique unique (phone)
);

create index if not exists idx_leads_status on early_access_leads(status);
create index if not exists idx_leads_created_at on early_access_leads(created_at desc);

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_leads_updated_at on early_access_leads;
create trigger trg_leads_updated_at
before update on early_access_leads
for each row execute function set_updated_at();

-- RLS
alter table early_access_leads enable row level security;

-- Public (anon) can INSERT only. No select/update/delete for anon.
drop policy if exists "public_insert_leads" on early_access_leads;
create policy "public_insert_leads"
on early_access_leads
for insert
to anon
with check (
  status = 'new' and source = 'website'
);

-- Authenticated (admin) users can read, update, delete.
-- All Supabase Auth accounts here are admin accounts created manually — public signup stays disabled.
drop policy if exists "admin_select_leads" on early_access_leads;
create policy "admin_select_leads"
on early_access_leads
for select
to authenticated
using (true);

drop policy if exists "admin_update_leads" on early_access_leads;
create policy "admin_update_leads"
on early_access_leads
for update
to authenticated
using (true)
with check (true);

drop policy if exists "admin_delete_leads" on early_access_leads;
create policy "admin_delete_leads"
on early_access_leads
for delete
to authenticated
using (true);

-- No anon select/update/delete policies exist -> those actions are denied by default under RLS.
