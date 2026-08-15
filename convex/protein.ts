import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function previousDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export const getDay = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const [settings, entries, creatineEntry, todayWeight, yesterdayWeight] = await Promise.all([
      ctx.db.query("settings").first(),
      ctx.db.query("proteinEntries").withIndex("by_date", (q) => q.eq("date", date)).order("desc").collect(),
      ctx.db.query("creatineEntries").withIndex("by_date", (q) => q.eq("date", date)).first(),
      ctx.db.query("weightMeasurements").withIndex("by_date", (q) => q.eq("date", date)).first(),
      ctx.db
        .query("weightMeasurements")
        .withIndex("by_date", (q) => q.eq("date", previousDate(date)))
        .first(),
    ]);
    const resolvedWeightKg = todayWeight?.weightKg ?? yesterdayWeight?.weightKg ?? settings?.weightKg ?? 80;
    const weightSource: "today" | "yesterday" | "baseline" = todayWeight
      ? "today"
      : yesterdayWeight
        ? "yesterday"
        : "baseline";
    return { settings, entries, creatineTaken: creatineEntry !== null, resolvedWeightKg, weightSource };
  },
});

export const getProgress = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const entries = await ctx.db
      .query("proteinEntries")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .collect();

    const totals = new Map<string, number>();
    for (const entry of entries) {
      totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.protein);
    }

    return Array.from(totals, ([date, protein]) => ({ date, protein })).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  },
});

export const getCalendarProgress = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const [proteinEntries, workouts, activities, creatineEntries, measurements] = await Promise.all([
      ctx.db
        .query("proteinEntries")
        .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
        .collect(),
      ctx.db
        .query("workoutSessions")
        .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
        .collect(),
      ctx.db
        .query("activitySessions")
        .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
        .collect(),
      ctx.db
        .query("creatineEntries")
        .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
        .collect(),
      ctx.db
        .query("weightMeasurements")
        .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
        .collect(),
    ]);

    const days = new Map<string, {
      date: string;
      protein: number;
      workout: boolean;
      creatine: boolean;
      measurement: boolean;
    }>();
    const getDay = (date: string) => {
      const existing = days.get(date);
      if (existing) return existing;
      const day = { date, protein: 0, workout: false, creatine: false, measurement: false };
      days.set(date, day);
      return day;
    };

    for (const entry of proteinEntries) getDay(entry.date).protein += entry.protein;
    for (const workout of workouts) getDay(workout.date).workout = true;
    for (const activity of activities) getDay(activity.date).workout = true;
    for (const entry of creatineEntries) getDay(entry.date).creatine = true;
    for (const measurement of measurements) getDay(measurement.date).measurement = true;

    return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const addEntry = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    detail: v.string(),
    protein: v.number(),
    source: v.union(v.literal("quick"), v.literal("manual")),
  },
  handler: async (ctx, entry) => {
    if (entry.protein <= 0 || entry.protein > 500) throw new Error("Protein must be between 0 and 500 grams.");
    return await ctx.db.insert("proteinEntries", entry);
  },
});

export const removeEntry = mutation({
  args: { id: v.id("proteinEntries") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const setCreatineTaken = mutation({
  args: { date: v.string(), taken: v.boolean() },
  handler: async (ctx, { date, taken }) => {
    const existing = await ctx.db
      .query("creatineEntries")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();

    if (taken && !existing) return await ctx.db.insert("creatineEntries", { date });
    if (!taken && existing) await ctx.db.delete(existing._id);
    return existing?._id ?? null;
  },
});

export const saveSettings = mutation({
  args: { weightKg: v.number(), startDate: v.string() },
  handler: async (ctx, settings) => {
    if (settings.weightKg < 30 || settings.weightKg > 300) throw new Error("Weight must be between 30 and 300 kg.");
    const existing = await ctx.db.query("settings").first();
    if (existing) {
      await ctx.db.patch(existing._id, settings);
      return existing._id;
    }
    return await ctx.db.insert("settings", settings);
  },
});
