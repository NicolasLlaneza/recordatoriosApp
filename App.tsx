import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/storage/store';
import { AuthProvider } from './src/auth/AuthProvider';
import HomeScreen from './src/screens/HomeScreen';
import EditReminderScreen from './src/screens/EditReminderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AccountScreen from './src/screens/AccountScreen';
import { RootStackParamList } from './src/navigation';
import { colors } from './src/theme';
import { ensureNotificationPermissions, rescheduleDailyCheck } from './src/lib/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

/** Pide permisos una vez y reprograma el aviso diario cuando cambian los ajustes. */
function NotificationsBridge() {
  const { state } = useStore();
  const askedRef = useRef(false);

  useEffect(() => {
    if (!state.loaded) return;
    (async () => {
      if (!askedRef.current) {
        askedRef.current = true;
        await ensureNotificationPermissions();
      }
      await rescheduleDailyCheck(state.settings);
    })();
  }, [state.loaded, state.settings]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StoreProvider>
          <NotificationsBridge />
          <StatusBar style="light" />
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen
                name="EditReminder"
                component={EditReminderScreen}
                options={{ title: 'Recordatorio', presentation: 'modal' }}
              />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes' }} />
              <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Cuenta' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </StoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
