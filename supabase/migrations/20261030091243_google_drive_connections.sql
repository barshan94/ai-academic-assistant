create table public.drive_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  granted_scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.drive_connections enable row level security;
create policy "drive_connections_owner_all" on public.drive_connections for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.drive_connections to authenticated;
revoke all on public.drive_connections from anon;
