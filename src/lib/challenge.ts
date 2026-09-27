export const challengeStartDate = "2026-08-10";

// Sick leave is inclusive; these dates do not count toward the 365 active days.
export const sickLeaveStart = "2026-09-07";
export const sickLeaveEnd = "2026-09-27";

export function isOffDay(date: string) {
  return date >= sickLeaveStart && date <= sickLeaveEnd;
}

export function activeDaysThrough(date: string) {
  const start = new Date(`${challengeStartDate}T00:00:00Z`).getTime();
  const end = new Date(`${date}T00:00:00Z`).getTime();
  const leaveStart = new Date(`${sickLeaveStart}T00:00:00Z`).getTime();
  const leaveEnd = new Date(`${sickLeaveEnd}T00:00:00Z`).getTime();
  const dayMs = 86_400_000;
  const elapsed = Math.floor((end - start) / dayMs) + 1;
  const offDays = Math.max(0, Math.floor((Math.min(end, leaveEnd) - leaveStart) / dayMs) + 1);
  return Math.max(1, Math.min(365, elapsed - offDays));
}
