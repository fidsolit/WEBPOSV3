create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_branch_id uuid;
begin
  select id
  into default_branch_id
  from public.branches
  order by id
  limit 1;

  insert into public.profiles (
    id,
    full_name,
    role,
    branch_id,
    is_approved
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'cashier',
    default_branch_id,
    false
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();