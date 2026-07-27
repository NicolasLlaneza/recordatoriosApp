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
  created_at   timestamptz not null default now(),
  plan         text not null default 'free'
);
alter table public.profiles enable row level security;
-- Plan del usuario: 'free' | 'pro' | 'business'.
alter table public.profiles add column if not exists plan text not null default 'free';

/* El cliente NO puede darse un plan a sí mismo: si intenta cambiar `plan`, el
   valor anterior se conserva silenciosamente. Solo el backend (service_role),
   donde en su momento se validará el pago, puede modificarlo.

   OJO: esta función NO debe ser SECURITY DEFINER. Bajo SECURITY DEFINER,
   `current_user` pasa a ser el dueño de la función (postgres) en vez del rol
   que invoca, y la comprobación de abajo dejaría pasar cualquier cambio. */
create or replace function public.protect_plan()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.plan is distinct from old.plan
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    new.plan := old.plan;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan
  before update on public.profiles
  for each row execute function public.protect_plan();

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
-- `kind` distingue un grupo de convivientes ('home') de uno de trabajo
-- ('business'): mismo modelo de datos, distintas reglas de permisos.
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  kind       text not null default 'home'
);
alter table public.groups enable row level security;
alter table public.groups add column if not exists kind text not null default 'home';

-- `role`: owner (creador) / admin (gestiona la lista) / member (solo marca).
create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  role      text not null default 'member',
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;
alter table public.group_members add column if not exists role text not null default 'member';

-- Backfill: el creador de cada grupo pasa a ser owner.
update public.group_members gm
set role = 'owner'
from public.groups g
where g.id = gm.group_id and g.created_by = gm.user_id and gm.role is distinct from 'owner';

-- ¿El usuario actual es miembro del grupo? SECURITY DEFINER para no recursar RLS.
create or replace function public.is_group_member(g uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members where group_id = g and user_id = auth.uid()
  );
$$;

/* Rol del usuario actual en el grupo (null si no es miembro). */
create or replace function public.group_role(g uuid)
returns text language sql security definer set search_path = public stable as $$
  select role from public.group_members where group_id = g and user_id = auth.uid();
$$;

/* ¿Puede gestionar la lista de recordatorios?
   - hogar:  cualquier miembro (comportamiento actual, sin cambios)
   - negocio: solo owner/admin (el empleado marca, no edita) */
create or replace function public.can_manage_group(g uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from public.group_members m
    join public.groups gr on gr.id = m.group_id
    where m.group_id = g
      and m.user_id = auth.uid()
      and (gr.kind = 'home' or m.role in ('owner', 'admin'))
  );
$$;

drop policy if exists groups_select_member on public.groups;
create policy groups_select_member on public.groups
  for select to authenticated using (public.is_group_member(id));
drop policy if exists groups_delete_owner on public.groups;
create policy groups_delete_owner on public.groups
  for delete to authenticated using (created_by = auth.uid());

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
  created_at timestamptz not null default now(),
  mode       text not null default 'once',
  target     int
);
alter table public.group_reminders enable row level security;
-- Frecuencia (para instalaciones creadas antes de esta columna).
alter table public.group_reminders add column if not exists mode text not null default 'once';
alter table public.group_reminders add column if not exists target int;

-- Ver: cualquier miembro. Gestionar: según can_manage_group (ver arriba).
drop policy if exists gr_select on public.group_reminders;
create policy gr_select on public.group_reminders
  for select to authenticated using (public.is_group_member(group_id));
drop policy if exists gr_insert on public.group_reminders;
create policy gr_insert on public.group_reminders
  for insert to authenticated with check (public.can_manage_group(group_id) and created_by = auth.uid());
drop policy if exists gr_update on public.group_reminders;
create policy gr_update on public.group_reminders
  for update to authenticated using (public.can_manage_group(group_id));
drop policy if exists gr_delete on public.group_reminders;
create policy gr_delete on public.group_reminders
  for delete to authenticated using (public.can_manage_group(group_id));

-- MARCAS COMPARTIDAS (varias por recordatorio y día: un registro por marca) ---
create table if not exists public.group_completions (
  id                uuid primary key default gen_random_uuid(),
  group_reminder_id uuid not null references public.group_reminders(id) on delete cascade,
  group_id          uuid not null references public.groups(id) on delete cascade,
  day               date not null,
  done_by           uuid not null references auth.users(id),
  done_at           timestamptz not null default now()
);
alter table public.group_completions enable row level security;

-- Migración: instalaciones viejas tenían PK (group_reminder_id, day) — una sola
-- marca por día. Pasamos a `id` como PK para permitir varias marcas.
alter table public.group_completions add column if not exists id uuid default gen_random_uuid();
update public.group_completions set id = gen_random_uuid() where id is null;
do $$
declare pk_cols text[];
begin
  select array_agg(a.attname::text order by a.attnum)
  into pk_cols
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conname = 'group_completions_pkey'
    and c.conrelid = 'public.group_completions'::regclass;

  if pk_cols is not null and pk_cols <> array['id'] then
    alter table public.group_completions drop constraint group_completions_pkey;
  end if;
end $$;
alter table public.group_completions alter column id set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'group_completions_pkey' and conrelid = 'public.group_completions'::regclass
  ) then
    alter table public.group_completions add primary key (id);
  end if;
end $$;

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
-- Se dropea la versión de 1 argumento para no dejar overloads ambiguos.
drop function if exists public.create_group(text);
create or replace function public.create_group(p_name text, p_kind text default 'home')
returns public.groups language plpgsql security definer set search_path = public as $$
declare g public.groups; code text;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into public.groups (name, join_code, created_by, kind)
  values (
    coalesce(nullif(trim(p_name), ''), 'Mi grupo'),
    code,
    auth.uid(),
    case when p_kind = 'business' then 'business' else 'home' end
  )
  returning * into g;
  insert into public.group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'owner');
  return g;
end; $$;

-- RPC: unirse por código -----------------------------------------------------
create or replace function public.join_group(p_code text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  select * into g from public.groups where join_code = upper(trim(p_code));
  if not found then raise exception 'Código inválido'; end if;
  insert into public.group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'member') on conflict do nothing;
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
