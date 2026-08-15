import { AchillesDashboard } from "@/components/achilles-dashboard";

export default async function ProteinPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;
  return <AchillesDashboard activeView="protein" initialDate={typeof date === "string" ? date : undefined} />;
}
