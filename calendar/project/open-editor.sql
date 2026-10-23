-- ASAP Calendar Project: public editing, NO LOGIN.
-- Run in Supabase SQL Editor AFTER calendar/project/supabase-setup.sql.
-- Warning: any visitor, including someone who discovers the URL, can change project copy.
alter table public.asap_project_content enable row level security;
drop policy if exists "Four rats can insert" on public.asap_project_content;
drop policy if exists "Four rats can update" on public.asap_project_content;
drop policy if exists "Public can insert project copy" on public.asap_project_content;
drop policy if exists "Public can update project copy" on public.asap_project_content;
create policy "Public can insert project copy" on public.asap_project_content for insert to anon,authenticated with check (id in (
'project_manifesto','project_headline','project_description','project_intention',
'shooting_0','shooting_1','shooting_2','shooting_3','shooting_4','shooting_5','shooting_date',
'copy_0','copy_1','copy_2','copy_3','copy_4','copy_5',
'month_1','month_2','month_3','month_4','month_5','month_6','month_7','month_8','month_9','month_10','month_11','month_12','fundraising_intro'
));
create policy "Public can update project copy" on public.asap_project_content for update to anon,authenticated using (true) with check (true);
-- The table stores only editable copy; never store private data or secrets here.
