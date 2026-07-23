// Tarjeta de un recordatorio. Control unificado (switch deslizable) para todos
// los modos; en 'once' queda en verde, en 'count'/'free' se desliza y vuelve
// para marcar de nuevo. Deshacer unificado + actividad del día (hechos/deshechos).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Reminder } from '../types';
import { colors, radius, spacing } from '../theme';
import { formatTime } from '../lib/day';
import SlideToConfirm from './SlideToConfirm';
import MarkList, { MarkEntry } from './MarkList';

type Props = {
  reminder: Reminder;
  marks: number[]; // timestamps de hechos hoy
  undos: number[]; // timestamps de deshechos hoy
  onMark: () => void;
  onUnmark: () => void; // el padre pide confirmación
  onEdit: () => void;
};

export default function ReminderRow({ reminder, marks, undos, onMark, onUnmark, onEdit }: Props) {
  const count = marks.length;
  const target = reminder.mode === 'count' ? reminder.target ?? 1 : undefined;
  const complete = target != null && count >= target;

  // Cuándo mostrar el switch en verde ("hecho").
  const done = reminder.mode === 'once' ? count >= 1 : reminder.mode === 'count' ? complete : false;

  const doneLabel =
    reminder.mode === 'once'
      ? count >= 1
        ? `Hecho a las ${formatTime(marks[0])}`
        : ''
      : `Completado · ${count} de ${target}`;

  const progress =
    reminder.mode === 'count'
      ? `${count} de ${target} ${count === 1 ? 'vez' : 'veces'}`
      : `${count} ${count === 1 ? 'vez' : 'veces'} hoy`;

  // Actividad del día: hechos + deshechos, en orden cronológico.
  const activity: MarkEntry[] = [
    ...marks.map((at) => ({ at, kind: 'done' as const })),
    ...undos.map((at) => ({ at, kind: 'undo' as const })),
  ].sort((a, b) => a.at - b.at);

  const showLog = activity.length > 0 && (reminder.mode !== 'once' || undos.length > 0);

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onEdit} accessibilityRole="button">
        <Text style={styles.icon}>{reminder.icon}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {reminder.title}
        </Text>
        <Text style={styles.editHint}>editar</Text>
      </Pressable>

      {reminder.mode !== 'once' && (
        <Text style={[styles.progress, complete && styles.progressDone]}>
          {complete ? '✅ ' : ''}
          {progress}
        </Text>
      )}

      <SlideToConfirm done={done} doneLabel={doneLabel} onConfirm={onMark} />

      {count > 0 && (
        <Pressable style={styles.undoBtn} onPress={onUnmark} hitSlop={8}>
          <Text style={styles.undoBtnText}>↩  Deshacer última</Text>
        </Pressable>
      )}

      {showLog && (
        <View style={styles.logWrap}>
          <Text style={styles.logTitle}>Actividad de hoy</Text>
          <MarkList entries={activity} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  icon: { fontSize: 26, marginRight: spacing.md },
  title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  editHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progress: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  progressDone: { color: colors.green },
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
});
