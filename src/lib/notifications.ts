// Notificación diaria configurable ("¿Revisaste tus recordatorios?").
// La hora y el texto los define el usuario en Ajustes.
//
// Nota: las notificaciones locales pueden no funcionar en Expo Go en Android
// (SDK 53+). Para probarlas del todo conviene un development build. La lógica
// acá es correcta; se envuelve en try/catch para no romper en Expo Go.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Settings } from '../types';

const ANDROID_CHANNEL_ID = 'daily-check';

// Cómo mostrar la notificación con la app en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Pide permiso de notificaciones. Devuelve true si quedó concedido. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Aviso diario',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] permisos no disponibles:', e);
    return false;
  }
}

/**
 * Reprograma el aviso diario según los ajustes. Cancela lo anterior y, si está
 * habilitado, agenda un disparador que se repite todos los días a la hora dada.
 */
export async function rescheduleDailyCheck(settings: Settings): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.dailyCheckEnabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recordatorios',
        body: settings.dailyCheckMessage,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.dailyCheckHour,
        minute: settings.dailyCheckMinute,
      },
    });
  } catch (e) {
    console.warn('[notifications] no se pudo agendar el aviso:', e);
  }
}
