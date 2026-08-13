import { AchillesDashboard } from "@/components/achilles-dashboard";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;
  return <AchillesDashboard activeView="dashboard" initialDate={typeof date === "string" ? date : undefined} />;
}
