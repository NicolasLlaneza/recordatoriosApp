import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../storage/store';
import { colors, radius, spacing } from '../theme';
import { ScreenProps } from '../navigation';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function SettingsScreen(_props: ScreenProps<'Settings'>) {
  const { state, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const s = state.settings;

  const bumpHour = (delta: number) =>
    updateSettings({ dailyCheckHour: (s.dailyCheckHour + delta + 24) % 24 });
  const bumpMinute = (delta: number) =>
    updateSettings({ dailyCheckMinute: (s.dailyCheckMinute + delta + 60) % 60 });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
    >
      <Text style={styles.section}>Aviso diario</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.rowTitle}>Recordarme revisar</Text>
            <Text style={styles.rowSub}>Una notificación todos los días a la hora elegida.</Text>
          </View>
          <Switch
            value={s.dailyCheckEnabled}
            onValueChange={(v) => updateSettings({ dailyCheckEnabled: v })}
            trackColor={{ true: colors.green, false: colors.track }}
          />
        </View>

        {s.dailyCheckEnabled && (
          <>
            <View style={styles.divider} />
            <Text style={styles.rowTitle}>Hora del aviso</Text>
            <View style={styles.timeRow}>
              <Stepper value={pad(s.dailyCheckHour)} onMinus={() => bumpHour(-1)} onPlus={() => bumpHour(1)} />
              <Text style={styles.colon}>:</Text>
              <Stepper
                value={pad(s.dailyCheckMinute)}
                onMinus={() => bumpMinute(-5)}
                onPlus={() => bumpMinute(5)}
              />
            </View>

            <View style={styles.divider} />
            <Text style={styles.rowTitle}>Texto del aviso</Text>
            <TextInput
              value={s.dailyCheckMessage}
              onChangeText={(t) => updateSettings({ dailyCheckMessage: t })}
              placeholder="¿Revisaste todos tus recordatorios?"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
          </>
        )}
      </View>

      <Text style={styles.section}>Próximamente</Text>
      <View style={styles.card}>
        <Text style={styles.soon}>👥 Grupos de convivientes — avisar al otro cuando hacés una tarea.</Text>
        <View style={styles.divider} />
        <Text style={styles.soon}>📍 Aviso por ubicación — preguntarte al alejarte de casa.</Text>
      </View>

      <Text style={styles.footnote}>
        Los recordatorios se reinician automáticamente cada día a la medianoche.
      </Text>
    </ScrollView>
  );
}

function Stepper({
  value,
  onMinus,
  onPlus,
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={onMinus}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable style={styles.stepBtn} onPress={onPlus}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  colon: { color: colors.text, fontSize: 28, fontWeight: '800', marginHorizontal: spacing.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  stepBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  stepBtnText: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  stepValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    minHeight: 56,
  },
  soon: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  footnote: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
});
