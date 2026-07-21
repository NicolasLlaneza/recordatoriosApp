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
  const { isConfigured, loading, session, email: sessionEmail, sendCode, verifyCode, signOut } =
    useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pad = { padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl };

  // Backend todavía no configurado (falta el .env).
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

  // Sesión iniciada.
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

  const onSendCode = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError('Ingresá un email válido.');
      return;
    }
    setBusy(true);
    const { error } = await sendCode(email);
    setBusy(false);
    if (error) setError(error);
    else setStep('code');
  };

  const onVerify = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError('El código tiene 6 dígitos.');
      return;
    }
    setBusy(true);
    const { error } = await verifyCode(email, code);
    setBusy(false);
    if (error) setError(error);
    // Si sale bien, onAuthStateChange actualiza la sesión y cambia la vista.
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.body}>
          Te enviamos un código de 6 dígitos por email. No hace falta contraseña.
        </Text>

        {step === 'email' ? (
          <>
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
              autoFocus
            />
            <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={onSendCode} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar código</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>Código enviado a {email}</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="______"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.codeInput]}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={onVerify} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verificar</Text>}
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => { setStep('email'); setCode(''); setError(null); }}>
              <Text style={styles.linkText}>Cambiar email</Text>
            </Pressable>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
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
  codeInput: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 8 },
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
});
