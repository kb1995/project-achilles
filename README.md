# Achilles

A personal 12-month progress journal beginning August 10, 2026, with daily protein and weight tracking. Protein goals are calculated directly from body weight in kilograms: minimum at `1.55 g/kg`, target at `1.79 g/kg`, and stretch at `2.0 g/kg`, rounded to the nearest gram. Today’s recorded weight is used when available and yesterday’s otherwise; reaching the minimum marks the protein signal complete.

September 7–27, 2026 are sick days. They are shown as off days in the calendar and excluded from challenge day numbers, progress, consistency, and streaks. The next active day is September 28.

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
