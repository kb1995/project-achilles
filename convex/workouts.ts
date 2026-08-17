import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const starterExercises = [
  { category: "Arms", name: "Biceps curls", tracking: "strength" as const },
  { category: "Arms", name: "Barbell Curl", tracking: "strength" as const },
  { category: "Arms", name: "Overhead tricep dumbbell", tracking: "strength" as const },
  { category: "Arms", name: "Cable tricep pushdown", tracking: "strength" as const },
  { category: "Back", name: "Dumbbell row", tracking: "strength" as const },
  { category: "Back", name: "Lat pulldown", tracking: "strength" as const },
  { category: "Chest", name: "Dumbbell press", tracking: "strength" as const },
  { category: "Chest", name: "Bench press", tracking: "strength" as const },
  { category: "Chest", name: "Decline Chest Press Machine", tracking: "strength" as const },
  { category: "Chest", name: "Incline press", tracking: "strength" as const },
  { category: "Legs", name: "Bulgarian split squat", tracking: "strength" as const },
  { category: "Legs", name: "Squats", tracking: "strength" as const },
  { category: "Legs", name: "Leg press", tracking: "strength" as const },
  { category: "Legs", name: "Dumbbell walking lunge", tracking: "strength" as const },
  { category: "Legs", name: "Romanian deadlift", tracking: "strength" as const },
];

const workoutExercise = v.object({
  exerciseId: v.id("exercises"),
  sets: v.array(v.object({ reps: v.number(), weightKg: v.number() })),
});

export const ensureStarterPlan = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("exercises").collect();
    const existingExercises = new Set(
      existing.map((exercise) => `${exercise.category.toLowerCase()}\u0000${exercise.name.toLowerCase()}`),
    );
    const createdAt = Date.now();
    for (const exercise of starterExercises) {
      const key = `${exercise.category.toLowerCase()}\u0000${exercise.name.toLowerCase()}`;
      if (!existingExercises.has(key)) {
        await ctx.db.insert("exercises", { ...exercise, createdAt });
        existingExercises.add(key);
      }
    }
  },
});

export const getOverview = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const [exercises, workouts, activities] = await Promise.all([
      ctx.db.query("exercises").collect(),
      ctx.db.query("workoutSessions").withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate)).order("desc").collect(),
      ctx.db.query("activitySessions").withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate)).order("desc").collect(),
    ]);
    return {
      exercises: exercises.sort((a, b) => a.category.localeCompare(b.category) || a.createdAt - b.createdAt),
      workouts,
      activities,
    };
  },
});

export const addExercise = mutation({
  args: { category: v.string(), name: v.string() },
  handler: async (ctx, exercise) => {
    const name = exercise.name.trim();
    const category = exercise.category.trim();
    if (!name || !category) throw new Error("Exercise and category are required.");
    return await ctx.db.insert("exercises", { name, category, tracking: "strength", createdAt: Date.now() });
  },
});

export const saveWorkout = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    category: v.string(),
    note: v.optional(v.string()),
    exercises: v.array(workoutExercise),
  },
  handler: async (ctx, workout) => {
    if (!workout.title.trim() || !workout.category.trim()) throw new Error("Workout name and type are required.");
    if (workout.exercises.length === 0) throw new Error("Add at least one exercise.");
    for (const item of workout.exercises) {
      if (!(await ctx.db.get(item.exerciseId))) throw new Error("One of the exercises no longer exists.");
      if (item.sets.length === 0) throw new Error("Every exercise needs at least one set.");
      for (const set of item.sets) {
        if (!Number.isInteger(set.reps) || set.reps < 1 || set.reps > 1_000) throw new Error("Reps must be between 1 and 1,000.");
        if (!Number.isFinite(set.weightKg) || set.weightKg < 0 || set.weightKg > 2_000) throw new Error("Weight must be between 0 and 2,000 kg.");
      }
    }
    return await ctx.db.insert("workoutSessions", {
      ...workout,
      title: workout.title.trim(),
      category: workout.category.trim(),
      note: workout.note?.trim() || undefined,
    });
  },
});

export const removeWorkout = mutation({
  args: { id: v.id("workoutSessions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const saveActivity = mutation({
  args: {
    date: v.string(),
    activity: v.string(),
    durationMinutes: v.number(),
    distanceKm: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, activity) => {
    const name = activity.activity.trim();
    if (!name) throw new Error("Choose an activity.");
    if (!Number.isFinite(activity.durationMinutes) || activity.durationMinutes < 1 || activity.durationMinutes > 1_440) {
      throw new Error("Duration must be between 1 and 1,440 minutes.");
    }
    if (activity.distanceKm !== undefined && (!Number.isFinite(activity.distanceKm) || activity.distanceKm <= 0 || activity.distanceKm > 1_000)) {
      throw new Error("Distance must be between 0 and 1,000 km.");
    }
    return await ctx.db.insert("activitySessions", {
      ...activity,
      activity: name,
      note: activity.note?.trim() || undefined,
    });
  },
});

export const removeActivity = mutation({
  args: { id: v.id("activitySessions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
