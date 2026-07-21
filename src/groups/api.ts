// Capa de acceso a datos de grupos (Supabase). Todas las tablas están
// protegidas por RLS: cada usuario solo ve/edita lo de sus grupos.
import { supabase } from '../lib/supabase';

export type Group = {
  id: string;
  name: string;
  join_code: string;
  created_by: string;
  created_at: string;
};

export type GroupReminder = {
  id: string;
  group_id: string;
  title: string;
  icon: string;
  sort_order: number;
};

export type Completion = {
  group_reminder_id: string;
  day: string;
  done_by: string;
  done_at: string;
};

export type Member = { user_id: string; display_name: string };

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Asegura que exista el perfil del usuario actual (por si se registró antes del trigger). */
export async function ensureProfile(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const name = (user.email ?? 'usuario').split('@')[0];
  await supabase.from('profiles').upsert({ id: user.id, display_name: name }, { onConflict: 'id', ignoreDuplicates: true });
}

export async function listMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from('groups').select('*').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  if (error) throw error;
  return data as Group;
}

export async function joinGroup(code: string): Promise<Group> {
  const { data, error } = await supabase.rpc('join_group', { p_code: code });
  if (error) throw error;
  return data as Group;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', uid);
  if (error) throw error;
}

export async function listMembers(groupId: string): Promise<Member[]> {
  const { data: rows, error } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  if (error) throw error;
  const ids = (rows ?? []).map((r) => r.user_id as string);
  if (ids.length === 0) return [];
  const { data: profs, error: e2 } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);
  if (e2) throw e2;
  return (profs ?? []).map((p) => ({ user_id: p.id as string, display_name: p.display_name as string }));
}

export async function listReminders(groupId: string): Promise<GroupReminder[]> {
  const { data, error } = await supabase
    .from('group_reminders')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function addReminder(groupId: string, icon: string, title: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error('Sin sesión');
  const existing = await listReminders(groupId);
  const sort = existing.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
  const { error } = await supabase.from('group_reminders').insert({
    group_id: groupId,
    icon: icon || '✅',
    title: title.trim(),
    sort_order: sort,
    created_by: uid,
  });
  if (error) throw error;
}

export async function updateReminder(id: string, icon: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('group_reminders')
    .update({ icon: icon, title: title.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('group_reminders').delete().eq('id', id);
  if (error) throw error;
}

export async function listTodayCompletions(groupId: string, day: string): Promise<Completion[]> {
  const { data, error } = await supabase
    .from('group_completions')
    .select('*')
    .eq('group_id', groupId)
    .eq('day', day);
  if (error) throw error;
  return data ?? [];
}

export async function setDone(
  reminder: GroupReminder,
  day: string,
  done: boolean
): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error('Sin sesión');
  if (done) {
    const { error } = await supabase.from('group_completions').insert({
      group_reminder_id: reminder.id,
      group_id: reminder.group_id,
      day,
      done_by: uid,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('group_completions')
      .delete()
      .eq('group_reminder_id', reminder.id)
      .eq('day', day);
    if (error) throw error;
  }
}

/** Suscripción en tiempo real a cambios de recordatorios y completados del grupo. */
export function subscribeGroup(groupId: string, onChange: (payload: any) => void) {
  const channel = supabase
    .channel(`group:${groupId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'group_completions', filter: `group_id=eq.${groupId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'group_reminders', filter: `group_id=eq.${groupId}` },
      onChange
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
