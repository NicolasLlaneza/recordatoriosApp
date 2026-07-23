// Tarjeta de un recordatorio. Rinde distinto según el modo:
// - once:  switch deslizable (una vez al día).
// - count: progreso "N de M" + registro de cada marca con hora.
// - free:  contador libre con horas.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Reminder } from '../types';
import { colors, radius, spacing } from '../theme';
import { formatTime } from '../lib/day';
import SlideToConfirm from './SlideToConfirm';

type Props = {
  reminder: Reminder;
  marks: number[]; // timestamps de hoy (ordenados)
  undoneAtMs?: number;
  onMark: () => void;
  onUnmark: () => void; // el padre pide confirmación
  onEdit: () => void;
};

export default function ReminderRow({ reminder, marks, undoneAtMs, onMark, onUnmark, onEdit }: Props) {
  const count = marks.length;
  const timesLabel = marks.map((m) => formatTime(m)).join(' · ');
  const note = count === 0 && undoneAtMs != null ? `Deshecho a las ${formatTime(undoneAtMs)}` : undefined;

  const header = (
    <Pressable style={styles.header} onPress={onEdit} accessibilityRole="button">
      <Text style={styles.icon}>{reminder.icon}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {reminder.title}
      </Text>
      <Text style={styles.editHint}>editar</Text>
    </Pressable>
  );

  // Modo "una vez": switch deslizable clásico.
  if (reminder.mode === 'once') {
    return (
      <View style={styles.card}>
        {header}
        <SlideToConfirm
          done={count >= 1}
          doneLabel={count >= 1 ? `Hecho a las ${formatTime(marks[0])}` : ''}
          note={note}
          onConfirm={onMark}
          onUndo={onUnmark}
        />
      </View>
    );
  }

  // Modos "N veces" y "libre".
  const target = reminder.mode === 'count' ? reminder.target ?? 1 : undefined;
  const complete = target != null && count >= target;
  const progress =
    reminder.mode === 'count'
      ? `${count} de ${target} ${count === 1 ? 'vez' : 'veces'}`
      : `${count} ${count === 1 ? 'vez' : 'veces'} hoy`;

  return (
    <View style={styles.card}>
      {header}

      <View style={styles.progressRow}>
        <Text style={[styles.progress, complete && styles.progressDone]}>
          {complete ? '✅ ' : ''}
          {progress}
        </Text>
        {count > 0 && <Text style={styles.times} numberOfLines={1}>{timesLabel}</Text>}
      </View>

      <Pressable style={[styles.markBtn, complete && styles.markBtnDone]} onPress={onMark}>
        <Text style={styles.markBtnText}>＋ Marcar ahora</Text>
      </Pressable>

      {count > 0 && (
        <Pressable style={styles.undoBtn} onPress={onUnmark} hitSlop={8}>
          <Text style={styles.undoBtnText}>↩  Deshacer última</Text>
        </Pressable>
      )}
      {note && <Text style={styles.note}>{note}</Text>}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: { fontSize: 26, marginRight: spacing.md },
  title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  editHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressRow: { marginBottom: spacing.md },
  progress: { color: colors.text, fontSize: 16, fontWeight: '700' },
  progressDone: { color: colors.green },
  times: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  markBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  markBtnDone: { backgroundColor: colors.greenDark },
  markBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  undoBtn: { alignSelf: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  undoBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, marginLeft: spacing.xs, fontStyle: 'italic' },
});
