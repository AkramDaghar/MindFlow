-- MindFlow database schema
-- Run this in Supabase Dashboard → SQL Editor.

create table if not exists public.mind_maps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'Untitled map',
  nodes       jsonb not null default '[]'::jsonb,
  edges       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists mind_maps_user_id_updated_at_idx
  on public.mind_maps (user_id, updated_at desc);

-- Keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mind_maps_set_updated_at on public.mind_maps;
create trigger mind_maps_set_updated_at
  before update on public.mind_maps
  for each row execute function public.set_updated_at();

-- Row Level Security: users can only ever touch their own maps
alter table public.mind_maps enable row level security;

drop policy if exists "Users can view own maps" on public.mind_maps;
create policy "Users can view own maps"
  on public.mind_maps for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own maps" on public.mind_maps;
create policy "Users can insert own maps"
  on public.mind_maps for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own maps" on public.mind_maps;
create policy "Users can update own maps"
  on public.mind_maps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own maps" on public.mind_maps;
create policy "Users can delete own maps"
  on public.mind_maps for delete
  using (auth.uid() = user_id);
