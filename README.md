\-- =========================

\-- EXTENSIONS

\-- =========================

create extension if not exists "uuid-ossp";



\-- =========================

\-- TABLES

\-- =========================



\-- BRANCHES

create table if not exists branches (

&#x20; id uuid primary key default uuid\_generate\_v4(),

&#x20; name text not null,

&#x20; created\_at timestamp default now()

);



\-- PROFILES (extends auth.users)

create table if not exists profiles (

&#x20; id uuid primary key references auth.users(id) on delete cascade,

&#x20; full\_name text,

&#x20; role text check (role in ('admin','cashier')) not null default 'cashier',

&#x20; branch\_id uuid references branches(id),

&#x20; created\_at timestamp default now()

);



\-- PRODUCTS

create table if not exists products (

&#x20; id uuid primary key default uuid\_generate\_v4(),

&#x20; name text not null,

&#x20; price numeric not null,

&#x20; cost numeric not null,

&#x20; barcode text,

&#x20; created\_at timestamp default now()

);



\-- INVENTORY

create table if not exists inventory (

&#x20; id uuid primary key default uuid\_generate\_v4(),

&#x20; product\_id uuid references products(id) on delete cascade,

&#x20; branch\_id uuid references branches(id) on delete cascade,

&#x20; stock integer not null default 0,

&#x20; updated\_at timestamp default now(),

&#x20; unique(product\_id, branch\_id)

);



\-- SALES

create table if not exists sales (

&#x20; id uuid primary key default uuid\_generate\_v4(),

&#x20; branch\_id uuid references branches(id),

&#x20; user\_id uuid references profiles(id),

&#x20; total numeric not null,

&#x20; created\_at timestamp default now()

);



\-- SALE ITEMS

create table if not exists sale\_items (

&#x20; id uuid primary key default uuid\_generate\_v4(),

&#x20; sale\_id uuid references sales(id) on delete cascade,

&#x20; product\_id uuid references products(id),

&#x20; quantity integer not null,

&#x20; price numeric not null

);



\-- PAYMENTS

create table if not exists payments (

&#x20; id uuid primary key default uuid\_generate\_v4(),

&#x20; sale\_id uuid references sales(id) on delete cascade,

&#x20; method text,

&#x20; amount numeric not null,

&#x20; created\_at timestamp default now()

);



\-- =========================

\-- FUNCTIONS

\-- =========================



\-- Get user branch

create or replace function get\_user\_branch()

returns uuid

language sql

stable

as $$

&#x20; select branch\_id from profiles where id = auth.uid()

$$;



\-- Auto-create profile on signup

create or replace function handle\_new\_user()

returns trigger

language plpgsql

as $$

begin

&#x20; insert into profiles (id, role)

&#x20; values (new.id, 'cashier');

&#x20; return new;

end;

$$;



\-- =========================

\-- TRIGGERS

\-- =========================

drop trigger if exists on\_auth\_user\_created on auth.users;



create trigger on\_auth\_user\_created

after insert on auth.users

for each row execute procedure handle\_new\_user();



\-- =========================

\-- ENABLE RLS

\-- =========================

alter table profiles enable row level security;

alter table products enable row level security;

alter table inventory enable row level security;

alter table sales enable row level security;

alter table sale\_items enable row level security;

alter table payments enable row level security;



\-- =========================

\-- POLICIES

\-- =========================



\-- PROFILES

drop policy if exists "read own profile" on profiles;

create policy "read own profile"

on profiles for select

using (id = auth.uid());



drop policy if exists "update own profile" on profiles;

create policy "update own profile"

on profiles for update

using (id = auth.uid());



\-- PRODUCTS

drop policy if exists "read products" on products;

create policy "read products"

on products for select

using (auth.role() = 'authenticated');



drop policy if exists "admin manage products" on products;

create policy "admin manage products"

on products for all

using (

&#x20; exists (

&#x20;   select 1 from profiles

&#x20;   where id = auth.uid() and role = 'admin'

&#x20; )

);



\-- INVENTORY

drop policy if exists "read inventory by branch" on inventory;

create policy "read inventory by branch"

on inventory for select

using (branch\_id = get\_user\_branch());



drop policy if exists "admin manage inventory" on inventory;

create policy "admin manage inventory"

on inventory for all

using (

&#x20; exists (

&#x20;   select 1 from profiles

&#x20;   where id = auth.uid() and role = 'admin'

&#x20; )

);



\-- SALES

drop policy if exists "read sales by branch" on sales;

create policy "read sales by branch"

on sales for select

using (branch\_id = get\_user\_branch());



drop policy if exists "insert sales" on sales;

create policy "insert sales"

on sales for insert

with check (branch\_id = get\_user\_branch());



\-- SALE ITEMS

drop policy if exists "read sale items" on sale\_items;

create policy "read sale items"

on sale\_items for select

using (

&#x20; exists (

&#x20;   select 1 from sales

&#x20;   where sales.id = sale\_items.sale\_id

&#x20;   and sales.branch\_id = get\_user\_branch()

&#x20; )

);



drop policy if exists "insert sale items" on sale\_items;

create policy "insert sale items"

on sale\_items for insert

with check (true);



\-- PAYMENTS

drop policy if exists "read payments" on payments;

create policy "read payments"

on payments for select

using (

&#x20; exists (

&#x20;   select 1 from sales

&#x20;   where sales.id = payments.sale\_id

&#x20;   and sales.branch\_id = get\_user\_branch()

&#x20; )

);



drop policy if exists "insert payments" on payments;

create policy "insert payments"

on payments for insert

with check (true);

