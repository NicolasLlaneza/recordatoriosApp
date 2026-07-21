import React, { useCallback, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { colors, radius, spacing } from '../theme';
import { ScreenProps } from '../navigation';
import { createGroup, ensureProfile, joinGroup, listMyGroups, Group } from '../groups/api';

export default function GroupsScreen({ navigation }: ScreenProps<'Groups'>) {
  const { session, isConfigured } = useAuth();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      await ensureProfile();
      const gs = await listMyGroups();
      setGroups(gs);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onCreate = async () => {
    setError(null);
    if (name.trim().length === 0) {
      setError('Poné un nombre para el grupo.');
      return;
    }
    setBusy(true);
    try {
      const g = await createGroup(name);
      setName('');
      await refresh();
      navigation.navigate('GroupDetail', { groupId: g.id, name: g.name });
    } catch (e: any) {
      setError(e.message ?? 'No se pudo crear el grupo');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    setError(null);
    if (code.trim().length < 4) {
      setError('Ingresá el código del grupo.');
      return;
    }
    setBusy(true);
    try {
      const g = await joinGroup(code);
      setCode('');
      await refresh();
      navigation.navigate('GroupDetail', { groupId: g.id, name: g.name });
    } catch (e: any) {
      setError(e.message?.includes('inválido') ? 'Código inválido.' : e.message ?? 'No se pudo unir');
    } finally {
      setBusy(false);
    }
  };

  if (!isConfigured || !session) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Necesitás iniciar sesión</Text>
          <Text style={styles.cardBody}>Para crear o unirte a un grupo, primero iniciá sesión en Ajustes → Cuenta.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.section}>Mis grupos</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
      ) : groups.length === 0 ? (
        <Text style={styles.empty}>Todavía no estás en ningún grupo.</Text>
      ) : (
        groups.map((g) => (
          <Pressable
            key={g.id}
            style={styles.groupCard}
            onPress={() => navigation.navigate('GroupDetail', { groupId: g.id, name: g.name })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>{g.name}</Text>
              <Text style={styles.groupCode}>Código: {g.join_code}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.section}>Crear un grupo</Text>
      <View style={styles.card}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre (ej: Casa)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={onCreate} disabled={busy}>
          <Text style={styles.btnText}>Crear grupo</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Unirme con un código</Text>
      <View style={styles.card}>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC123"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.codeInput]}
          autoCapitalize="characters"
        />
        <Pressable style={[styles.btnSecondary, busy && styles.btnDisabled]} onPress={onJoin} disabled={busy}>
          <Text style={styles.btnSecondaryText}>Unirme</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
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
  empty: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm },
  cardBody: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  groupCode: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 28 },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  codeInput: { fontSize: 22, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnSecondary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnSecondaryText: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.lg, textAlign: 'center' },
});
