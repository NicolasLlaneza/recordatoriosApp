-- ============================================================================
-- Recordatorios — esquema de grupos de convivientes (Fase 2b)
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → pegar → Run.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================================

create extension if not exists pgcrypto;

-- PROFILES -------------------------------------------------------------------
-- Un perfil por usuario, con el nombre visible para el resto del grupo.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid());

-- Crear el perfil automáticamente cuando se registra un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: perfiles para usuarios que ya existían antes del trigger.
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- GROUPS ---------------------------------------------------------------------
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.groups enable row level security;

create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;

-- ¿El usuario actual es miembro del grupo? SECURITY DEFINER para no recursar RLS.
create or replace function public.is_group_member(g uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members where group_id = g and user_id = auth.uid()
  );
$$;

drop policy if exists groups_select_member on public.groups;
create policy groups_select_member on public.groups
  for select to authenticated using (public.is_group_member(id));

drop policy if exists gm_select_member on public.group_members;
create policy gm_select_member on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
drop policy if exists gm_delete_self on public.group_members;
create policy gm_delete_self on public.group_members
  for delete to authenticated using (user_id = auth.uid());

-- RECORDATORIOS COMPARTIDOS --------------------------------------------------
create table if not exists public.group_reminders (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  title      text not null,
  icon       text not null default '✅',
  sort_order int  not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.group_reminders enable row level security;

drop policy if exists gr_select on public.group_reminders;
create policy gr_select on public.group_reminders
  for select to authenticated using (public.is_group_member(group_id));
drop policy if exists gr_insert on public.group_reminders;
create policy gr_insert on public.group_reminders
  for insert to authenticated with check (public.is_group_member(group_id) and created_by = auth.uid());
drop policy if exists gr_update on public.group_reminders;
create policy gr_update on public.group_reminders
  for update to authenticated using (public.is_group_member(group_id));
drop policy if exists gr_delete on public.group_reminders;
create policy gr_delete on public.group_reminders
  for delete to authenticated using (public.is_group_member(group_id));

-- COMPLETADOS COMPARTIDOS (una fila por recordatorio y día) ------------------
create table if not exists public.group_completions (
  group_reminder_id uuid not null references public.group_reminders(id) on delete cascade,
  group_id          uuid not null references public.groups(id) on delete cascade,
  day               date not null,
  done_by           uuid not null references auth.users(id),
  done_at           timestamptz not null default now(),
  primary key (group_reminder_id, day)
);
alter table public.group_completions enable row level security;

drop policy if exists gc_select on public.group_completions;
create policy gc_select on public.group_completions
  for select to authenticated using (public.is_group_member(group_id));
drop policy if exists gc_insert on public.group_completions;
create policy gc_insert on public.group_completions
  for insert to authenticated with check (public.is_group_member(group_id) and done_by = auth.uid());
drop policy if exists gc_delete on public.group_completions;
create policy gc_delete on public.group_completions
  for delete to authenticated using (public.is_group_member(group_id) and done_by = auth.uid());

-- REGISTRO DE DESHECHOS (auditoría: quién deshizo qué y cuándo) ---------------
create table if not exists public.group_undo_log (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups(id) on delete cascade,
  group_reminder_id uuid not null references public.group_reminders(id) on delete cascade,
  day               date not null,
  undone_by         uuid not null references auth.users(id),
  undone_at         timestamptz not null default now()
);
alter table public.group_undo_log enable row level security;

drop policy if exists gul_select on public.group_undo_log;
create policy gul_select on public.group_undo_log
  for select to authenticated using (public.is_group_member(group_id));
drop policy if exists gul_insert on public.group_undo_log;
create policy gul_insert on public.group_undo_log
  for insert to authenticated with check (public.is_group_member(group_id) and undone_by = auth.uid());

-- RPC: crear grupo (devuelve el grupo con su código) -------------------------
create or replace function public.create_group(p_name text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare g public.groups; code text;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into public.groups (name, join_code, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Mi grupo'), code, auth.uid())
  returning * into g;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end; $$;

-- RPC: unirse por código -----------------------------------------------------
create or replace function public.join_group(p_code text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  select * into g from public.groups where join_code = upper(trim(p_code));
  if not found then raise exception 'Código inválido'; end if;
  insert into public.group_members (group_id, user_id)
  values (g.id, auth.uid()) on conflict do nothing;
  return g;
end; $$;

-- Realtime: habilitar eventos en las tablas compartidas ----------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public'
                   and tablename = 'group_completions') then
    alter publication supabase_realtime add table public.group_completions;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public'
                   and tablename = 'group_reminders') then
    alter publication supabase_realtime add table public.group_reminders;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public'
                   and tablename = 'group_undo_log') then
    alter publication supabase_realtime add table public.group_undo_log;
  end if;
end $$;
