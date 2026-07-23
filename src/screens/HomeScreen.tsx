import React, { useEffect, useState } from 'react';
import {
  Alert,
  AppState as RNAppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../storage/store';
import ReminderRow from '../components/ReminderRow';
import { colors, radius, spacing } from '../theme';
import { dayKey, friendlyDate, msUntilNextMidnight } from '../lib/day';
import { ScreenProps } from '../navigation';

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { state, addMark, removeMark, marksFor, undoneAt } = useStore();

  const confirmUnmark = (id: string, title: string) => {
    Alert.alert('Deshacer', `¿Deshacer la última marca de "${title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Deshacer', style: 'destructive', onPress: () => removeMark(id, today) },
    ]);
  };
  const insets = useSafeAreaInsets();

  // Día actual en estado para forzar re-render al cruzar la medianoche.
  const [today, setToday] = useState(dayKey());

  const isDone = (r: (typeof state.reminders)[number]) => {
    const c = marksFor(r.id, today).length;
    return r.mode === 'count' ? c >= (r.target ?? 1) : c >= 1;
  };

  // Refrescar el día al volver a primer plano y programar el cruce de medianoche.
  useEffect(() => {
    const refresh = () => setToday(dayKey());

    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });

    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, msUntilNextMidnight() + 500);
    };
    scheduleMidnight();

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, []);

  const reminders = [...state.reminders].sort((a, b) => a.order - b.order);
  const doneCount = reminders.filter(isDone).length;
  const total = reminders.length;
  const allDone = total > 0 && doneCount === total;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{friendlyDate()}</Text>
          <Text style={styles.h1}>Antes de dormir</Text>
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Ajustes"
        >
          <Text style={styles.iconBtnText}>⚙️</Text>
        </Pressable>
      </View>

      {total > 0 && (
        <View style={[styles.progress, allDone && styles.progressDone]}>
          <Text style={styles.progressText}>
            {allDone ? '✅ Todo listo, dormí tranquilo' : `${doneCount} de ${total} listos`}
          </Text>
        </View>
      )}

      <FlatList
        data={reminders}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ReminderRow
            reminder={item}
            marks={marksFor(item.id, today)}
            undoneAtMs={undoneAt(item.id, today)}
            onMark={() => addMark(item.id, today)}
            onUnmark={() => confirmUnmark(item.id, item.title)}
            onEdit={() => navigation.navigate('EditReminder', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyText}>
              No tenés recordatorios todavía.{'\n'}Agregá tu primer chequeo con el botón +.
            </Text>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => navigation.navigate('EditReminder')}
        accessibilityLabel="Agregar recordatorio"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  date: { color: colors.textMuted, fontSize: 14, textTransform: 'capitalize' },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnText: { fontSize: 20 },
  progress: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressDone: { backgroundColor: colors.greenDark },
  progressText: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  listContent: { paddingBottom: 120 },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 34, fontWeight: '300', lineHeight: 38, marginTop: -2 },
});
