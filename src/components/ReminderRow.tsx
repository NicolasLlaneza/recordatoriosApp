// Tarjeta de un recordatorio: ícono + título (tocar para editar) y el switch
// deslizable con la hora en que se marcó.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Reminder } from '../types';
import { colors, radius, spacing } from '../theme';
import { formatTime } from '../lib/day';
import SlideToConfirm from './SlideToConfirm';

type Props = {
  reminder: Reminder;
  doneAtMs?: number;
  onConfirm: () => void;
  onUndo: () => void;
  onEdit: () => void;
};

export default function ReminderRow({ reminder, doneAtMs, onConfirm, onUndo, onEdit }: Props) {
  const done = doneAtMs != null;
  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onEdit} accessibilityRole="button">
        <Text style={styles.icon}>{reminder.icon}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {reminder.title}
        </Text>
        <Text style={styles.editHint}>editar</Text>
      </Pressable>
      <SlideToConfirm
        done={done}
        doneLabel={doneAtMs != null ? `Hecho a las ${formatTime(doneAtMs)}` : ''}
        onConfirm={onConfirm}
        onUndo={onUndo}
      />
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
  icon: {
    fontSize: 26,
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  editHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
