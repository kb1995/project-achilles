import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const challengeStartDate = "2026-08-10";

export const getWeights = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    return await ctx.db
      .query("weightMeasurements")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .order("desc")
      .collect();
  },
});

export const saveWeight = mutation({
  args: { date: v.string(), weightKg: v.number() },
  handler: async (ctx, measurement) => {
    if (measurement.weightKg < 30 || measurement.weightKg > 300) {
      throw new Error("Weight must be between 30 and 300 kg.");
    }

    const existing = await ctx.db
      .query("weightMeasurements")
      .withIndex("by_date", (q) => q.eq("date", measurement.date))
      .first();

    const id = existing
      ? (await ctx.db.patch(existing._id, { weightKg: measurement.weightKg }), existing._id)
      : await ctx.db.insert("weightMeasurements", measurement);

    const settings = await ctx.db.query("settings").first();
    if (settings) await ctx.db.patch(settings._id, { weightKg: measurement.weightKg });
    else await ctx.db.insert("settings", { weightKg: measurement.weightKg, startDate: challengeStartDate });

    return id;
  },
});

export const removeWeight = mutation({
  args: { id: v.id("weightMeasurements") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
