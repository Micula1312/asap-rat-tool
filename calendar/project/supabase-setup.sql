-- ASAP Calendar Project: run in Supabase SQL Editor after creating a project.
create table if not exists public.asap_project_content (
  id text primary key,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create table if not exists public.asap_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rat_name text not null check (rat_name in ('MIC','BIANCA','OLLI','LUCI'))
);
alter table public.asap_project_content enable row level security;
alter table public.asap_editors enable row level security;
drop policy if exists "Public read project" on public.asap_project_content;
create policy "Public read project" on public.asap_project_content for select to anon, authenticated using (true);
drop policy if exists "Four rats can insert" on public.asap_project_content;
create policy "Four rats can insert" on public.asap_project_content for insert to authenticated with check (exists (select 1 from public.asap_editors where user_id=(select auth.uid())));
drop policy if exists "Four rats can update" on public.asap_project_content;
create policy "Four rats can update" on public.asap_project_content for update to authenticated using (exists (select 1 from public.asap_editors where user_id=(select auth.uid()))) with check (exists (select 1 from public.asap_editors where user_id=(select auth.uid())));
drop policy if exists "Editor can see own membership" on public.asap_editors;
create policy "Editor can see own membership" on public.asap_editors for select to authenticated using (user_id=(select auth.uid()));
-- Create/invite 4 users under Authentication > Users, then copy their UUIDs.
-- Register only those 4 UUIDs (run as project admin in SQL Editor):
-- insert into public.asap_editors (user_id,rat_name) values
-- ('<MIC_UUID>','MIC'),('<BIANCA_UUID>','BIANCA'),('<OLLI_UUID>','OLLI'),('<LUCI_UUID>','LUCI');
-- Never expose the service_role key in the site.
