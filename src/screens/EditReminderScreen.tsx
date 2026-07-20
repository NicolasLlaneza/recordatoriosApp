import React, { useLayoutEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../storage/store';
import { colors, radius, spacing } from '../theme';
import { ScreenProps } from '../navigation';

const ICONS = ['🔑', '🚪', '🔥', '🚗', '🪟', '💡', '🚿', '🔌', '🐕', '💊', '🧊', '✅'];

export default function EditReminderScreen({ navigation, route }: ScreenProps<'EditReminder'>) {
  const { state, addReminder, updateReminder, deleteReminder } = useStore();
  const insets = useSafeAreaInsets();

  const editingId = route.params?.id;
  const existing = state.reminders.find((r) => r.id === editingId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '🔑');

  useLayoutEffect(() => {
    navigation.setOptions({ title: existing ? 'Editar recordatorio' : 'Nuevo recordatorio' });
  }, [navigation, existing]);

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (existing) updateReminder(existing.id, icon, title);
    else addReminder(icon, title);
    navigation.goBack();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Eliminar recordatorio', `¿Eliminar "${existing.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteReminder(existing.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Nombre</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ej: Llave del gas cerrada"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus={!existing}
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <Text style={[styles.label, { marginTop: spacing.xl }]}>Ícono</Text>
      <View style={styles.iconGrid}>
        {ICONS.map((ic) => (
          <Pressable
            key={ic}
            onPress={() => setIcon(ic)}
            style={[styles.iconChip, icon === ic && styles.iconChipActive]}
          >
            <Text style={styles.iconChipText}>{ic}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={save}
        disabled={!canSave}
      >
        <Text style={styles.saveBtnText}>{existing ? 'Guardar cambios' : 'Crear recordatorio'}</Text>
      </Pressable>

      {existing && (
        <Pressable style={styles.deleteBtn} onPress={remove}>
          <Text style={styles.deleteBtnText}>Eliminar</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: { borderColor: colors.accent, backgroundColor: colors.cardAlt },
  iconChipText: { fontSize: 26 },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  deleteBtn: { paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  deleteBtnText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
