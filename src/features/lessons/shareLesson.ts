import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { APP_NAME } from '@/constants/brand';
import { translate } from '@/i18n';
import type { Locale } from '@/i18n/strings';
import { spotsRemaining } from '@/utils/capacity';
import { formatDateTime } from '@/utils/date';
import { logError } from '@/utils/errors';

export interface ShareableLesson {
  id: string;
  title: string;
  start_time: string;
  location: string;
  registered_count: number;
  capacity: number;
}

/** Opens the lesson in the app: tennislongueuil://lesson/<id> (exp:// in Expo Go). */
export function lessonLink(lessonId: string): string {
  return Linking.createURL(`lesson/${lessonId}`);
}

/** The text sent through WhatsApp, SMS, email… Built for the sender's language. */
export function lessonShareMessage(
  lesson: ShareableLesson,
  locale: Locale,
  link = lessonLink(lesson.id),
): string {
  const left = spotsRemaining(lesson.registered_count, lesson.capacity);
  const spots =
    left === 0
      ? translate(locale, 'shareFull')
      : translate(locale, left === 1 ? 'spotsLeftOne' : 'spotsLeftOther', { count: left });
  return translate(locale, 'shareMessage', {
    title: lesson.title,
    when: formatDateTime(lesson.start_time),
    location: lesson.location,
    spots,
    app: APP_NAME,
    link,
  });
}

/** Opens the system share sheet. Dismissing it is not an error. */
export async function shareLesson(lesson: ShareableLesson, locale: Locale): Promise<void> {
  try {
    await Share.share({ message: lessonShareMessage(lesson, locale) });
  } catch (error) {
    logError('shareLesson', error);
  }
}
