// Lista de actividad (registro de cada vez que se hizo o deshizo la tarea),
// con fecha y hora. `by` es opcional: en grupos se muestra quién la hizo.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatShortDate, formatTime } from '../lib/day';

export type MarkKind = 'done' | 'undo';
export type MarkEntry = { at: number; kind?: MarkKind; by?: string };

export default function MarkList({ entries }: { entries: MarkEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <View style={styles.list}>
      {entries.map((e, i) => {
        const isUndo = e.kind === 'undo';
        return (
          <View key={`${e.at}-${i}`} style={styles.row}>
            <View style={[styles.dot, isUndo ? styles.dotUndo : styles.dotDone]} />
            {e.kind ? (
              <Text style={[styles.kind, isUndo ? styles.kindUndo : styles.kindDone]}>
                {isUndo ? 'Deshecho' : 'Hecho'}
              </Text>
            ) : null}
            <Text style={styles.datetime}>
              {formatShortDate(e.at)} · {formatTime(e.at)}
            </Text>
            {e.by ? (
              <View style={styles.byChip}>
                <Text style={styles.byText}>{e.by}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing.md },
  dotDone: { backgroundColor: colors.green },
  dotUndo: { backgroundColor: colors.danger },
  kind: { fontSize: 13, fontWeight: '700', width: 70 },
  kindDone: { color: colors.green },
  kindUndo: { color: colors.danger },
  datetime: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  byChip: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  byText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
});
