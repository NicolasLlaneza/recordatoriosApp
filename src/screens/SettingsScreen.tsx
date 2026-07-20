import React, { useEffect, useRef, useState } from 'react';
import {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      keyboardShouldPersistTaps="handled"
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
            <Text style={styles.rowSub}>Tocá para escribir la hora.</Text>
            <View style={styles.timeRow}>
              <TimeField
                value={s.dailyCheckHour}
                max={23}
                onCommit={(n) => updateSettings({ dailyCheckHour: n })}
              />
              <Text style={styles.colon}>:</Text>
              <TimeField
                value={s.dailyCheckMinute}
                max={59}
                onCommit={(n) => updateSettings({ dailyCheckMinute: n })}
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

/**
 * Campo de hora/minuto editable con el teclado numérico. Muestra el valor con
 * dos dígitos; mientras se escribe permite entradas parciales y al terminar
 * valida y acota (0..max).
 */
function TimeField({
  value,
  max,
  onCommit,
}: {
  value: number;
  max: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(pad(value));
  const editing = useRef(false);

  // Sincronizar si el valor cambia desde afuera y no se está editando.
  useEffect(() => {
    if (!editing.current) setText(pad(value));
  }, [value]);

  const commit = () => {
    editing.current = false;
    let n = parseInt(text, 10);
    if (isNaN(n)) n = value;
    n = Math.min(max, Math.max(0, n));
    onCommit(n);
    setText(pad(n));
  };

  return (
    <TextInput
      value={text}
      onFocus={() => {
        editing.current = true;
      }}
      onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 2))}
      onBlur={commit}
      onEndEditing={commit}
      keyboardType="number-pad"
      maxLength={2}
      selectTextOnFocus
      returnKeyType="done"
      style={styles.timeField}
    />
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
  colon: { color: colors.text, fontSize: 32, fontWeight: '800', marginHorizontal: spacing.sm },
  timeField: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 88,
    paddingVertical: spacing.md,
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
