import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { colors, radius, spacing } from '../theme';
import { ScreenProps } from '../navigation';

export default function AccountScreen(_props: ScreenProps<'Account'>) {
  const { isConfigured, loading, session, email: sessionEmail, signIn, signUp, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pad = { padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl };

  if (!isConfigured) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={pad}>
        <View style={styles.card}>
          <Text style={styles.title}>Cuenta no disponible aún</Text>
          <Text style={styles.body}>
            Para usar los grupos falta conectar el backend (Supabase). Cargá las
            credenciales en el archivo <Text style={styles.mono}>.env</Text> y reiniciá la app.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (session) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={pad}>
        <View style={styles.card}>
          <Text style={styles.title}>Sesión iniciada</Text>
          <Text style={styles.body}>Estás conectado como:</Text>
          <Text style={styles.email}>{sessionEmail}</Text>
        </View>
        <Pressable style={styles.secondaryBtn} onPress={() => signOut()}>
          <Text style={styles.secondaryBtnText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError('Ingresá un email válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setBusy(true);
    const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (error) setError(error);
    // Si sale bien, onAuthStateChange abre la sesión y cambia la vista.
  };

  const isSignin = mode === 'signin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>{isSignin ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
        <Text style={styles.body}>
          {isSignin
            ? 'Entrá con tu email y contraseña.'
            : 'Registrate con tu email y una contraseña (mínimo 6 caracteres).'}
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
          textContentType={isSignin ? 'password' : 'newPassword'}
        />

        <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{isSignin ? 'Ingresar' : 'Registrarme'}</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkBtn}
          onPress={() => {
            setMode(isSignin ? 'signup' : 'signin');
            setError(null);
          }}
        >
          <Text style={styles.linkText}>
            {isSignin ? '¿No tenés cuenta? Crear una' : '¿Ya tenés cuenta? Iniciar sesión'}
          </Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Text style={styles.soon}>
        Próximamente vas a poder entrar también con Google y Apple.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  email: { color: colors.accent, fontSize: 17, fontWeight: '700', marginTop: spacing.sm },
  mono: { fontFamily: 'monospace', color: colors.text },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
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
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  secondaryBtnText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  linkText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.md, textAlign: 'center' },
  soon: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.xl },
});
