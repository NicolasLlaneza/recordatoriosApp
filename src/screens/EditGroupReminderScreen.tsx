import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { ScreenProps } from '../navigation';
import { addReminder, deleteReminder, listReminders, updateReminder } from '../groups/api';

const ICONS = ['🔑', '🚪', '🔥', '🚗', '🪟', '💡', '🚿', '🔌', '🐕', '💊', '🧊', '✅'];

export default function EditGroupReminderScreen({ navigation, route }: ScreenProps<'EditGroupReminder'>) {
  const { groupId, id } = route.params;
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('🔑');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  // Si es edición, cargar el recordatorio existente.
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const rems = await listReminders(groupId);
        const r = rems.find((x) => x.id === id);
        if (r) {
          setTitle(r.title);
          setIcon(r.icon);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [id, groupId]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: id ? 'Editar recordatorio' : 'Nuevo recordatorio' });
  }, [navigation, id]);

  const canSave = title.trim().length > 0 && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      if (id) await updateReminder(id, icon, title);
      else await addReminder(groupId, icon, title);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
      setBusy(false);
    }
  };

  const remove = () => {
    if (!id) return;
    Alert.alert('Eliminar', `¿Eliminar "${title}" del grupo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReminder(id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  if (!loaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

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
        autoFocus={!id}
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <Text style={[styles.label, { marginTop: spacing.xl }]}>Ícono</Text>
      <View style={styles.iconGrid}>
        {ICONS.map((ic) => (
          <Pressable key={ic} onPress={() => setIcon(ic)} style={[styles.iconChip, icon === ic && styles.iconChipActive]}>
            <Text style={styles.iconChipText}>{ic}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} onPress={save} disabled={!canSave}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{id ? 'Guardar cambios' : 'Crear recordatorio'}</Text>}
      </Pressable>

      {id && (
        <Pressable style={styles.deleteBtn} onPress={remove}>
          <Text style={styles.deleteBtnText}>Eliminar</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
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
