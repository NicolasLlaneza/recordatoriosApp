// Lista de marcas (registro de cada vez que se hizo la tarea), con fecha y
// hora. `by` es opcional: en grupos se muestra el nombre de quién la hizo.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatShortDate, formatTime } from '../lib/day';

export type MarkEntry = { at: number; by?: string };

export default function MarkList({ entries }: { entries: MarkEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <View style={styles.list}>
      {entries.map((e, i) => (
        <View key={`${e.at}-${i}`} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.datetime}>
            {formatShortDate(e.at)} · {formatTime(e.at)}
          </Text>
          {e.by ? (
            <View style={styles.byChip}>
              <Text style={styles.byText}>{e.by}</Text>
            </View>
          ) : null}
        </View>
      ))}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginRight: spacing.md,
  },
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
