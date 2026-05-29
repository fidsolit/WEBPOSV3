grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema public to anon;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public
grant select on tables to anon;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant all on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to anon;

alter default privileges in schema public
grant usage, select on sequences to authenticated;

alter default privileges in schema public
grant all on sequences to service_role;