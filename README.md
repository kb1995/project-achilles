# Achilles

A personal 12-month progress journal beginning August 10, 2026, with daily protein and weight tracking. The protein target converts body weight from kilograms to pounds, then calculates `body weight (lb) × 0.7`, using today’s recorded weight when available and yesterday’s otherwise.

## Stack

- Next.js 16 and React 19
- Tailwind CSS 4
- Convex
- TypeScript

## Run locally

The supplied Convex development deployment is already configured in `.env.local`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Convex development

After changing files in `convex/`, sync the development deployment and regenerate bindings:

```bash
npx convex dev
```

The app intentionally has no authentication. It uses date-indexed protein and weight entries, ready to extend with workouts, additional body measurements, progress photos, and other 12-month goals.
