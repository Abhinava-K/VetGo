import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register device for Expo Push Notifications
 * @returns {Promise<string | null>} Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions not granted.');
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    token = tokenResponse.data;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }
  } catch (error) {
    console.warn('Could not register for push notifications (e.g. running in simulator):', error);
  }

  return token;
}

/**
 * Trigger a local emergency dispatch notification
 * @param title Notification Title
 * @param body Notification Message
 * @param data Optional payload data
 */
export async function sendLocalNotification(title: string, body: string, data: any = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.warn('Failed to schedule local notification:', error);
  }
}
