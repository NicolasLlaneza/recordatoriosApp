import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { colors, radius, spacing } from '../theme';
import { dayKey, formatTime } from '../lib/day';
import { ScreenProps } from '../navigation';
import SlideToConfirm from '../components/SlideToConfirm';
import MarkList, { MarkEntry } from '../components/MarkList';
import {
  Completion,
  GroupReminder,
  Member,
  UndoRecord,
  addMark,
  deleteGroup,
  leaveGroup,
  listMembers,
  listReminders,
  listTodayCompletions,
  listTodayUndos,
  removeMyLastMark,
  subscribeGroup,
} from '../groups/api';

function groupBy<T>(rows: T[], key: (r: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) (out[key(r)] ??= []).push(r);
  return out;
}

export default function GroupDetailScreen({ navigation, route }: ScreenProps<'GroupDetail'>) {
  const { groupId, name } = route.params;
  const { session } = useAuth();
  const myId = session?.user?.id ?? '';
  const insets = useSafeAreaInsets();

  const [reminders, setReminders] = useState<GroupReminder[]>([]);
  const [marksByRem, setMarksByRem] = useState<Record<string, Completion[]>>({});
  const [undosByRem, setUndosByRem] = useState<Record<string, UndoRecord[]>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [code, setCode] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [loading, setLoading] = useState(true);
  const today = dayKey();

  const remindersRef = useRef<GroupReminder[]>([]);
  const membersRef = useRef<Member[]>([]);
  remindersRef.current = reminders;
  membersRef.current = members;

  const nameOf = (userId: string) => {
    if (userId === myId) return 'vos';
    return membersRef.current.find((m) => m.user_id === userId)?.display_name ?? 'alguien';
  };

  const fetchAll = useCallback(async () => {
    try {
      const [rems, comps, unds, mems, grp] = await Promise.all([
        listReminders(groupId),
        listTodayCompletions(groupId, today),
        listTodayUndos(groupId, today),
        listMembers(groupId),
        supabase.from('groups').select('join_code, created_by').eq('id', groupId).single(),
      ]);
      setReminders(rems);
      setMarksByRem(groupBy(comps, (c) => c.group_reminder_id));
      setUndosByRem(groupBy(unds, (u) => u.group_reminder_id));
      setMembers(mems);
      if (grp.data) {
        setCode(grp.data.join_code as string);
        setCreatedBy(grp.data.created_by as string);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar el grupo');
    } finally {
      setLoading(false);
    }
  }, [groupId, today]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  // Realtime: refrescar ante cualquier cambio y avisar cuando otro marca/deshace.
  useEffect(() => {
    const unsub = subscribeGroup(groupId, (payload: any) => {
      if (payload.eventType === 'INSERT' && payload.new?.group_reminder_id) {
        const rem = remindersRef.current.find((r) => r.id === payload.new.group_reminder_id);
        if (rem && payload.table === 'group_completions' && payload.new.done_by !== myId) {
          notifyLocal(`${nameOf(payload.new.done_by)} marcó "${rem.title}" ✅`);
        }
        if (rem && payload.table === 'group_undo_log' && payload.new.undone_by !== myId) {
          notifyLocal(`${nameOf(payload.new.undone_by)} deshizo "${rem.title}" ↩`);
        }
      }
      fetchAll();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, myId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: name,
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('EditGroupReminder', { groupId })} hitSlop={12}>
          <Text style={styles.headerAdd}>＋</Text>
        </Pressable>
      ),
    });
  }, [navigation, name, groupId]);

  const onMark = async (rem: GroupReminder) => {
    try {
      await addMark(rem, today);
      await fetchAll();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo marcar');
    }
  };

  const onUnmark = (rem: GroupReminder) => {
    Alert.alert('Deshacer', `¿Deshacer tu última marca de "${rem.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deshacer',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMyLastMark(rem, today);
            await fetchAll();
          } catch (e: any) {
            Alert.alert('No se pudo deshacer', e.message ?? 'Error');
          }
        },
      },
    ]);
  };

  const shareCode = () => {
    Share.share({ message: `Unite a mi grupo "${name}" en Recordatorios con el código: ${code}` });
  };

  const confirmLeave = () => {
    Alert.alert('Salir del grupo', `¿Salir de "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { await leaveGroup(groupId); navigation.goBack(); } },
    ]);
  };

  const isOwner = !!createdBy && createdBy === myId;

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar grupo',
      `¿Eliminar "${name}" para todos? Se borran sus recordatorios y no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isDone = (rem: GroupReminder) => {
    const c = (marksByRem[rem.id] ?? []).length;
    if (rem.mode === 'count') return c >= (rem.target ?? 1);
    return c >= 1; // once y free: "listo" con al menos una marca
  };
  const doneCount = reminders.filter(isDone).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
    >
      <Pressable style={styles.codeBar} onPress={shareCode}>
        <View style={{ flex: 1 }}>
          <Text style={styles.codeLabel}>Código del grupo (tocá para compartir)</Text>
          <Text style={styles.codeValue}>{code}</Text>
        </View>
        <Text style={styles.shareIcon}>↗</Text>
      </Pressable>

      <View style={styles.membersRow}>
        {members.map((m) => (
          <View key={m.user_id} style={styles.memberChip}>
            <Text style={styles.memberChipText}>{m.user_id === myId ? 'Vos' : m.display_name}</Text>
          </View>
        ))}
      </View>

      {reminders.length > 0 && (
        <Text style={styles.progress}>
          {doneCount === reminders.length ? '✅ Todo listo' : `${doneCount} de ${reminders.length} listos`}
        </Text>
      )}

      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Este grupo no tiene recordatorios.{'\n'}Agregá el primero con ＋ arriba a la derecha.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {reminders.map((rem) => {
            const marks = marksByRem[rem.id] ?? [];
            const undos = undosByRem[rem.id] ?? [];
            const count = marks.length;
            const myMarks = marks.filter((m) => m.done_by === myId).length;
            const target = rem.mode === 'count' ? rem.target ?? 1 : undefined;
            const complete = target != null && count >= target;
            const done = rem.mode === 'once' ? count >= 1 : rem.mode === 'count' ? complete : false;

            const firstMark = marks[0];
            const doneLabel =
              rem.mode === 'once'
                ? firstMark
                  ? `Hecho por ${nameOf(firstMark.done_by)} a las ${formatTime(new Date(firstMark.done_at).getTime())}`
                  : ''
                : `Completado · ${count} de ${target}`;
            const progress =
              rem.mode === 'count'
                ? `${count} de ${target} ${count === 1 ? 'vez' : 'veces'}`
                : `${count} ${count === 1 ? 'vez' : 'veces'} hoy`;

            const activity: MarkEntry[] = [
              ...marks.map((m) => ({ at: new Date(m.done_at).getTime(), kind: 'done' as const, by: nameOf(m.done_by) })),
              ...undos.map((u) => ({ at: new Date(u.undone_at).getTime(), kind: 'undo' as const, by: nameOf(u.undone_by) })),
            ].sort((a, b) => a.at - b.at);

            return (
              <View key={rem.id} style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => navigation.navigate('EditGroupReminder', { groupId, id: rem.id })}
                >
                  <Text style={styles.icon}>{rem.icon}</Text>
                  <Text style={styles.title}>{rem.title}</Text>
                  <Text style={styles.editHint}>editar</Text>
                </Pressable>

                {rem.mode !== 'once' && (
                  <Text style={[styles.remProgress, complete && styles.remProgressDone]}>
                    {complete ? '✅ ' : ''}
                    {progress}
                  </Text>
                )}

                <SlideToConfirm done={done} doneLabel={doneLabel} onConfirm={() => onMark(rem)} />

                {myMarks > 0 && (
                  <Pressable style={styles.undoBtn} onPress={() => onUnmark(rem)} hitSlop={8}>
                    <Text style={styles.undoBtnText}>↩  Deshacer última</Text>
                  </Pressable>
                )}

                {activity.length > 0 && (
                  <View style={styles.logWrap}>
                    <Text style={styles.logTitle}>Actividad de hoy</Text>
                    <MarkList entries={activity} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Pressable style={styles.leaveBtn} onPress={confirmLeave}>
          <Text style={styles.leaveText}>Salir del grupo</Text>
        </Pressable>
        {isOwner && (
          <Pressable style={styles.leaveBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>Eliminar grupo</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

async function notifyLocal(body: string) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title: 'Grupo', body }, trigger: null });
  } catch {
    // en Expo Go puede estar limitado; se ignora
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerAdd: { color: colors.accent, fontSize: 30, fontWeight: '400', paddingHorizontal: spacing.sm },
  codeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  codeLabel: { color: colors.textMuted, fontSize: 12 },
  codeValue: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 3, marginTop: 2 },
  shareIcon: { color: colors.accent, fontSize: 24, fontWeight: '800', paddingHorizontal: spacing.sm },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  memberChip: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  memberChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  progress: { color: colors.textMuted, fontSize: 14, fontWeight: '700', paddingHorizontal: spacing.lg, marginTop: spacing.md },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  icon: { fontSize: 26, marginRight: spacing.md },
  title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  editHint: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  remProgress: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  remProgressDone: { color: colors.green },
  undoBtn: { alignSelf: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  undoBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  logWrap: { marginTop: spacing.md },
  logTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  leaveBtn: { alignItems: 'center', paddingVertical: spacing.md },
  leaveText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
