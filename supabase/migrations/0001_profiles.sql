-- Apply only after the dedicated Supabase project has been provisioned.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_explanation_languages text[] not null default array['bn', 'en'],
  exam_answer_language text not null default 'en' check (exam_answer_language in ('en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profile_owner_select" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profile_owner_insert" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profile_owner_update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;
