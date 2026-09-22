import { ScrollSelector } from '@/components/ScrollSelector';
import { useT } from '@/i18n';
import { endOfWeek, formatMonthDayShort, formatWeekRange } from '@/utils/date';

import { weekRelativeLabel, type LessonWeek } from './lessonWeeks';

interface WeekSelectorProps {
  weeks: readonly Pick<LessonWeek<unknown>, 'key' | 'start'>[];
  value: string;
  onChange: (weekKey: string) => void;
}

/**
 * Horizontal week strip used on the lessons lists. The date is the chip
 * title so "This week" can sit on the smaller second line and still fit.
 */
export function WeekSelector({ weeks, value, onChange }: WeekSelectorProps) {
  const t = useT();
  if (weeks.length <= 1) return null;

  return (
    <ScrollSelector
      label={t('week')}
      hideLabel
      itemWidth={104}
      value={value}
      onChange={onChange}
      options={weeks.map((week) => {
        const relative = weekRelativeLabel(week.start);
        const range = formatWeekRange(week.start);
        return {
          value: week.key,
          label: formatMonthDayShort(week.start),
          sublabel: relative ? t(relative) : formatMonthDayShort(endOfWeek(week.start)),
          accessibilityLabel: `${relative ? t(relative) : range}, ${range}`,
        };
      })}
    />
  );
}
