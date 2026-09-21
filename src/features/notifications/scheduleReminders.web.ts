import type { LessonReminderInput } from './reminderTime';

export async function scheduleLessonReminder(_lesson: LessonReminderInput): Promise<void> {
  return undefined;
}

export async function cancelLessonReminder(_lessonId: string): Promise<void> {
  return undefined;
}

export async function configureNotificationHandler(): Promise<void> {
  return undefined;
}
