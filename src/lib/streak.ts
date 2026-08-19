type StreakDay = {
  date: string;
  complete: boolean;
};

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekStartKey(key: string) {
  const date = dateFromKey(key);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return localDateKey(date);
}

export function longestStreakWithWeeklyRest(days: StreakDay[]) {
  const orderedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const restDaysByWeek = new Map<string, number>();
  let windowStart = 0;
  let completeDays = 0;
  let longestStreak = 0;

  for (let windowEnd = 0; windowEnd < orderedDays.length; windowEnd += 1) {
    const day = orderedDays[windowEnd];
    const week = weekStartKey(day.date);

    if (day.complete) {
      completeDays += 1;
    } else {
      restDaysByWeek.set(week, (restDaysByWeek.get(week) ?? 0) + 1);
    }

    while ((restDaysByWeek.get(week) ?? 0) > 1) {
      const leavingDay = orderedDays[windowStart];
      if (leavingDay.complete) {
        completeDays -= 1;
      } else {
        const leavingWeek = weekStartKey(leavingDay.date);
        restDaysByWeek.set(leavingWeek, (restDaysByWeek.get(leavingWeek) ?? 1) - 1);
      }
      windowStart += 1;
    }

    longestStreak = Math.max(longestStreak, completeDays);
  }

  return longestStreak;
}
