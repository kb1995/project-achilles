import { AchillesDashboard } from "@/components/achilles-dashboard";

export default async function MeasurementsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;
  return <AchillesDashboard activeView="measurements" initialDate={typeof date === "string" ? date : undefined} />;
}
