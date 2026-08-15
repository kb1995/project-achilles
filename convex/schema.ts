import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  settings: defineTable({
    weightKg: v.number(),
    startDate: v.string(),
  }),
  proteinEntries: defineTable({
    date: v.string(),
    name: v.string(),
    detail: v.string(),
    protein: v.number(),
    source: v.union(v.literal("quick"), v.literal("manual")),
  }).index("by_date", ["date"]),
  creatineEntries: defineTable({
    date: v.string(),
  }).index("by_date", ["date"]),
  weightMeasurements: defineTable({
    date: v.string(),
    weightKg: v.number(),
  }).index("by_date", ["date"]),
  exercises: defineTable({
    category: v.string(),
    name: v.string(),
    tracking: v.union(v.literal("strength"), v.literal("timed")),
    createdAt: v.number(),
  }).index("by_category", ["category"]),
  workoutEntries: defineTable({
    exerciseId: v.id("exercises"),
    date: v.string(),
    sets: v.number(),
    reps: v.optional(v.number()),
    loadKg: v.optional(v.number()),
    minutes: v.optional(v.number()),
    note: v.optional(v.string()),
  })
    .index("by_exercise", ["exerciseId"])
    .index("by_date", ["date"]),
  workoutSessions: defineTable({
    date: v.string(),
    title: v.string(),
    category: v.string(),
    note: v.optional(v.string()),
    exercises: v.array(
      v.object({
        exerciseId: v.id("exercises"),
        sets: v.array(
          v.object({
            reps: v.number(),
            weightKg: v.number(),
          }),
        ),
      }),
    ),
  }).index("by_date", ["date"]),
  activitySessions: defineTable({
    date: v.string(),
    activity: v.string(),
    durationMinutes: v.number(),
    distanceKm: v.optional(v.number()),
    note: v.optional(v.string()),
  }).index("by_date", ["date"]),
});
