alter table public.branches enable row level security;

drop policy if exists branches_select_policy on public.branches;
create policy branches_select_policy
on public.branches
for select
to authenticated
using (true);