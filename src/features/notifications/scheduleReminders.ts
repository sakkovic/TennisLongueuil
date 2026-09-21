import { Platform } from 'react-native';

import { translate } from '@/i18n';
import { formatTime, getDateLocale } from '@/utils/date';
import { logError } from '@/utils/errors';

import { reminderAt, reminderIdentifier, type LessonReminderInput } from './reminderTime';

const CHANNEL_ID = 'lessons';

async function notifications() {
  return import('expo-notifications');
}

async function ensurePermission(): Promise<boolean> {
  const Notifications = await notifications();
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted
    ? current.status
    : (await Notifications.requestPermissionsAsync()).status;
  return status === 'granted';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = await notifications();
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lessons',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function scheduleLessonReminder(lesson: LessonReminderInput): Promise<void> {
  const fireDate = reminderAt(lesson.startTime);
  if (!fireDate) return;

  try {
    const allowed = await ensurePermission();
    if (!allowed) return;
    await ensureAndroidChannel();

    const Notifications = await notifications();
    const locale = getDateLocale();
    await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(lesson.lessonId));
    await Notifications.scheduleNotificationAsync({
      identifier: reminderIdentifier(lesson.lessonId),
      content: {
        title: translate(locale, 'reminderTitle'),
        body: translate(locale, 'reminderBody', {
          title: lesson.title,
          time: formatTime(lesson.startTime),
        }),
        data: { lessonId: lesson.lessonId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: CHANNEL_ID,
      },
    });
  } catch (error) {
    logError('scheduleLessonReminder', error);
  }
}

export async function cancelLessonReminder(lessonId: string): Promise<void> {
  try {
    const Notifications = await notifications();
    await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(lessonId));
  } catch (error) {
    logError('cancelLessonReminder', error);
  }
}

export async function configureNotificationHandler(): Promise<void> {
  try {
    const Notifications = await notifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    logError('configureNotificationHandler', error);
  }
}
