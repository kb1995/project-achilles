"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  LayoutDashboard,
  Minus,
  Plus,
  Ruler,
  Scale,
  Target,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { AchillesMark } from "./achilles-mark";
import { TrainingView } from "./training-view";

type AppView = "dashboard" | "training" | "calendar" | "measurements";
type CalendarView = "week" | "month" | "year";

const challengeStartDate = "2026-08-10";
const proteinSuccessRatio = 0.9;
const poundsPerKilogram = 2.2046226218;
const proteinGramsPerPound = 0.7;

const foods = [
  { name: "Granola bowl", detail: "3 tbsp 4.5% yogurt · 50 g nutty granola", protein: 5, symbol: "GB" },
  { name: "Banica", detail: "1 serving", protein: 15, symbol: "BN" },
  { name: "Chicken with Rice", detail: "180 g cooked chicken fillet · ¼ cup cooked white rice", protein: 57, symbol: "CR" },
  { name: "Snickers bar", detail: "37.5 g bar", protein: 3.2, symbol: "SN" },
  { name: "Egg", detail: "1 large", protein: 6, symbol: "EG" },
  { name: "Banana", detail: "1 medium", protein: 1.3, symbol: "BA" },
];

const nuts = [
  { name: "Almonds", proteinPer100g: 21.2, symbol: "AL" },
  { name: "Hazelnuts", proteinPer100g: 15, symbol: "HZ" },
  { name: "Pistachios", proteinPer100g: 20.2, symbol: "PI" },
] as const;

const dayMs = 86_400_000;

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function daysBetween(start: string, end: string) {
  return Math.round((dateFromKey(end).getTime() - dateFromKey(start).getTime()) / dayMs);
}

function formatGrams(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function kilogramsToPounds(weightKg: number) {
  return weightKg * poundsPerKilogram;
}

function proteinGoalFromKg(weightKg: number) {
  return Math.round(kilogramsToPounds(weightKg) * proteinGramsPerPound);
}

function meetsProteinSuccess(value: number, goal: number) {
  return value >= goal * proteinSuccessRatio;
}

function formatDayHeading(key: string, today: string) {
  const date = dateFromKey(key);
  const prefix = key === today ? "Today" : date.toLocaleDateString("en", { weekday: "long" });
  return `${prefix}, ${date.toLocaleDateString("en", { day: "numeric", month: "long" })}`;
}

function journeyDay(startKey: string, today: string) {
  return Math.max(1, Math.min(365, daysBetween(startKey, today) + 1));
}

function AppNavigation({ active }: { active: AppView }) {
  const navItems = [
    { id: "dashboard" as const, label: "Overview", href: "/overview", icon: LayoutDashboard },
    { id: "training" as const, label: "Training", href: "/training", icon: Dumbbell },
    { id: "calendar" as const, label: "Calendar", href: "/calendar", icon: CalendarDays },
    { id: "measurements" as const, label: "Measurements", href: "/measurements", icon: Ruler },
  ];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-line bg-paper px-5 py-7 lg:flex">
        <Link href="/overview" className="flex min-h-11 items-center gap-3 text-left">
          <AchillesMark className="h-9 w-9 text-gold-dark" />
          <span className="font-display text-[25px] tracking-[-0.02em]">Achilles</span>
        </Link>

        <nav aria-label="Primary" className="mt-12 grid gap-1">
          <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-faint uppercase">Command</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active === item.id ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 px-3 text-sm font-semibold transition-[background-color,color] duration-150 active:scale-[0.98] ${
                  active === item.id ? "bg-ink text-paper" : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10">
          <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-faint uppercase">Your program</p>
          <div className="grid gap-1 text-sm">
            <div className="flex min-h-11 items-center gap-3 px-3 text-ink"><Target size={16} className="text-gold-dark" /> Nutrition</div>
            <Link href="/training" className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-ink"><Dumbbell size={16} className="text-gold-dark" /> Training</Link>
            <div className="flex min-h-11 items-center gap-3 px-3 text-faint"><Camera size={16} /> Progress photos</div>
          </div>
        </div>

        <div className="mt-auto border-t border-line pt-5">
          <p className="font-display text-lg">The 365-day ascent</p>
          <p className="mt-1 text-xs leading-5 text-muted">Build the proof, one recorded day at a time.</p>
        </div>
      </aside>

      <header className="flex h-[68px] items-center justify-between border-b border-line bg-paper px-5 lg:hidden">
        <Link href="/overview" className="flex min-h-11 items-center gap-3">
          <AchillesMark className="h-8 w-8 text-gold-dark" />
          <span className="font-display text-2xl">Achilles</span>
        </Link>
        <span className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">365-day ascent</span>
      </header>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-paper px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active === item.id ? "text-gold-dark" : "text-muted"}`}
            >
              <Icon size={18} /> {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AchillesDashboard({ activeView, initialDate }: { activeView: AppView; initialDate?: string }) {
  const router = useRouter();
  const today = useMemo(() => localDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(() => initialDate && initialDate <= today ? initialDate : today);
  const [manualOpen, setManualOpen] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [protein, setProtein] = useState("");
  const [pendingFood, setPendingFood] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const day = useQuery(api.protein.getDay, { date: selectedDate });
  const recent = useQuery(api.protein.getProgress, { startDate: addDays(today, -29), endDate: today });
  const addEntry = useMutation(api.protein.addEntry);
  const removeEntry = useMutation(api.protein.removeEntry);

  const weightKg = day?.resolvedWeightKg ?? 80;
  const weightSource = day?.weightSource ?? "baseline";
  const startDate = challengeStartDate;
  const goal = proteinGoalFromKg(weightKg);
  const consumed = day?.entries.reduce((sum, entry) => sum + entry.protein, 0) ?? 0;
  const remaining = Math.max(0, goal - consumed);
  const percent = Math.min(100, (consumed / goal) * 100);
  const dayNumber = journeyDay(startDate, today);
  const recentOnGoal = recent?.filter((item) => meetsProteinSuccess(item.protein, goal)).length ?? 0;
  const recentElapsed = Math.min(30, dayNumber);
  const consistency = Math.round((recentOnGoal / Math.max(1, recentElapsed)) * 100);

  async function quickAdd(item: (typeof foods)[number]) {
    setPendingFood(item.name);
    try {
      await addEntry({ date: selectedDate, name: item.name, detail: item.detail, protein: item.protein, source: "quick" });
    } finally {
      setPendingFood(null);
    }
  }

  async function addNut(item: (typeof nuts)[number], grams: number) {
    const proteinAmount = Math.round((item.proteinPer100g * grams) / 10) / 10;
    setPendingFood(item.name);
    try {
      await addEntry({
        date: selectedDate,
        name: item.name,
        detail: `${formatGrams(grams)} g portion`,
        protein: proteinAmount,
        source: "quick",
      });
    } finally {
      setPendingFood(null);
    }
  }

  async function handleManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(protein);
    if (!foodName.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Add a name and a protein amount greater than 0 g.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await addEntry({ date: selectedDate, name: foodName.trim(), detail: "Manual entry", protein: value, source: "manual" });
      setFoodName("");
      setProtein("");
      setManualOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function openCalendarDay(date: string) {
    router.push(`/overview?date=${encodeURIComponent(date > today ? today : date)}`);
  }

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-20 bg-ink px-4 py-3 text-sm text-paper focus:translate-y-0">Skip to content</a>
      <AppNavigation active={activeView} />

      <main id="main-content" className="pb-24 lg:ml-[236px] lg:pb-0">
        {activeView === "dashboard" ? (
          <DashboardView
            today={today}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            goal={goal}
            consumed={consumed}
            remaining={remaining}
            percent={percent}
            weightKg={weightKg}
            weightSource={weightSource}
            dayNumber={dayNumber}
            consistency={consistency}
            entries={day?.entries}
            manualOpen={manualOpen}
            setManualOpen={setManualOpen}
            foodName={foodName}
            setFoodName={setFoodName}
            protein={protein}
            setProtein={setProtein}
            error={error}
            submitting={submitting}
            pendingFood={pendingFood}
            quickAdd={quickAdd}
            addNut={addNut}
            handleManual={handleManual}
            removeEntry={removeEntry}
            setError={setError}
            recent={recent}
            onOpenCalendar={() => router.push("/calendar")}
            onOpenMeasurements={() => router.push("/measurements")}
          />
        ) : activeView === "training" ? (
          <TrainingView today={today} />
        ) : activeView === "calendar" ? (
          <ProgressCalendar today={today} goal={goal} startDate={startDate} onOpenDay={openCalendarDay} />
        ) : (
          <MeasurementsView today={today} baselineWeight={weightKg} />
        )}
      </main>
    </div>
  );
}

type DashboardProps = {
  today: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  goal: number;
  consumed: number;
  remaining: number;
  percent: number;
  weightKg: number;
  weightSource: "today" | "yesterday" | "baseline";
  dayNumber: number;
  consistency: number;
  entries: Doc<"proteinEntries">[] | undefined;
  manualOpen: boolean;
  setManualOpen: (open: boolean) => void;
  foodName: string;
  setFoodName: (value: string) => void;
  protein: string;
  setProtein: (value: string) => void;
  error: string;
  submitting: boolean;
  pendingFood: string | null;
  quickAdd: (item: (typeof foods)[number]) => Promise<void>;
  addNut: (item: (typeof nuts)[number], grams: number) => Promise<void>;
  handleManual: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  removeEntry: (args: { id: Id<"proteinEntries"> }) => Promise<null>;
  setError: (value: string) => void;
  recent: { date: string; protein: number }[] | undefined;
  onOpenCalendar: () => void;
  onOpenMeasurements: () => void;
};

function DashboardView(props: DashboardProps) {
  const entries = props.entries;
  const recentMap = new Map(props.recent?.map((item) => [item.date, item.protein]));
  const recentDays = Array.from({ length: 7 }, (_, index) => addDays(props.today, index - 6));

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-10 xl:px-12">
      <header className="reveal flex flex-col justify-between gap-5 border-b border-line pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Day {props.dayNumber} · The ascent</p>
          <h1 className="mt-2 font-display text-[2.75rem] leading-[0.95] tracking-[-0.04em] sm:text-[3.5rem]">Command the day.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">One clear view of today’s work. Nutrition and daily weight are active; training and photos are next to join the system.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold">{formatDayHeading(props.selectedDate, props.today)}</p>
          {props.selectedDate !== props.today && <button type="button" onClick={() => props.setSelectedDate(props.today)} className="mt-2 min-h-11 text-xs font-bold text-gold-dark">Return to today</button>}
        </div>
      </header>

      <section aria-label="Key metrics" className="reveal reveal-late grid border-b border-line sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Protein today" value={`${formatGrams(props.consumed)} / ${props.goal} g`} meta={`${Math.round(props.percent)}% complete`} />
        <div className="border-b border-line py-5 sm:border-b-0 sm:border-l sm:pl-6 xl:pr-6">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted uppercase">Weight used today</p>
          <button type="button" onClick={props.onOpenMeasurements} className="mt-1 min-h-11 font-display text-3xl tabular-nums underline decoration-line underline-offset-4">{props.weightKg} kg</button>
          <p className="text-[11px] text-faint">From {props.weightSource === "today" ? "today’s weigh-in" : props.weightSource === "yesterday" ? "yesterday’s weigh-in" : "your saved baseline"}</p>
        </div>
        <Metric label="30-day consistency" value={`${props.consistency}%`} meta="Days reaching 90%+" bordered />
        <Metric label="Journey" value={`${props.dayNumber} / 365`} meta={`${365 - props.dayNumber} days remain`} bordered />
      </section>

      {props.error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-error"><Minus size={15} />{props.error}</p>}

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.72fr)]">
        <section className="border border-line bg-paper paper-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3"><Target size={17} className="text-gold-dark" /><h2 className="text-sm font-bold">Daily protein</h2></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => props.setSelectedDate(addDays(props.selectedDate, -1))} className="grid size-11 place-items-center text-muted" aria-label="Previous day"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => props.setSelectedDate(addDays(props.selectedDate, 1))} disabled={props.selectedDate >= props.today} className="grid size-11 place-items-center text-muted disabled:text-faint/40" aria-label="Next day"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="px-5 py-7 sm:px-7 sm:py-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="font-display text-[3.75rem] leading-none tabular-nums sm:text-[4.5rem]">{formatGrams(props.consumed)}<span className="ml-2 text-2xl text-muted">g</span></p>
                <p className="mt-2 text-sm text-muted">{formatGrams(props.remaining)} g remaining of your {props.goal} g target</p>
              </div>
              {meetsProteinSuccess(props.consumed, props.goal) ? <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-success"><Check size={17} /> Day marked successful · 90%+</span> : <div className="text-right text-xs text-muted"><p>0.7 g protein × {formatGrams(kilogramsToPounds(props.weightKg))} lb</p><p className="mt-1 text-faint">Converted from {formatGrams(props.weightKg)} kg · using {props.weightSource === "today" ? "today’s" : props.weightSource === "yesterday" ? "yesterday’s" : "baseline"} weight</p></div>}
            </div>
            <div className="mt-7 h-3 bg-canvas" role="progressbar" aria-label="Daily protein progress" aria-valuenow={Math.round(props.percent)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${props.percent}%` }} />
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-bold tracking-[0.16em] text-muted uppercase">Quick add</h3>
                <span className="text-[11px] text-faint">One serving</span>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                {foods.map((food) => (
                  <button type="button" key={food.name} onClick={() => props.quickAdd(food)} disabled={props.pendingFood !== null} className="lift flex min-h-[104px] min-w-[130px] flex-col border border-line bg-canvas p-3 text-left transition-[transform,border-color] duration-150 active:scale-[0.98] disabled:cursor-wait sm:min-w-0 sm:flex-1">
                    <span className="text-[10px] font-bold tracking-[0.1em] text-gold-dark">{props.pendingFood === food.name ? "···" : food.symbol}</span>
                    <span className="mt-auto text-xs font-semibold">{food.name}</span>
                    <span className="mt-1 text-[11px] tabular-nums text-muted">+{food.protein} g</span>
                  </button>
                ))}
              </div>

              <NutPortionPicker pendingFood={props.pendingFood} onAdd={props.addNut} />
            </div>
          </div>
        </section>

        <aside className="flex min-h-[440px] flex-col bg-ink p-5 text-paper paper-shadow sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-bold tracking-[0.17em] text-gold uppercase">Day’s log</h2>
            <span className="text-xs text-paper/50">{entries?.length ?? 0} entries</span>
          </div>
          <div className="mt-5 flex-1">
            {entries === undefined ? (
              <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse bg-paper/5" />)}</div>
            ) : entries.length === 0 ? (
              <div className="grid min-h-52 place-content-center text-center">
                <p className="font-display text-2xl">Nothing logged yet.</p>
                <p className="mx-auto mt-2 max-w-[220px] text-sm leading-6 text-paper/50">Quick-add a provision or record a custom source.</p>
              </div>
            ) : (
              <ul className="divide-y divide-paper/10">
                {entries.map((entry) => (
                  <li key={String(entry._id)} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{entry.name}</p><p className="mt-0.5 truncate text-xs text-paper/45">{entry.detail}</p></div>
                    <span className="text-sm tabular-nums text-gold">+{entry.protein} g</span>
                    <button type="button" onClick={() => props.removeEntry({ id: entry._id })} className="grid size-11 place-items-center text-paper/45 hover:text-paper" aria-label={`Remove ${entry.name}`}><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {props.manualOpen ? (
            <form onSubmit={props.handleManual} className="mt-5 grid gap-3 border-t border-paper/10 pt-5">
              <div><label htmlFor="food-name" className="mb-1.5 block text-xs font-semibold">Food or source</label><input id="food-name" value={props.foodName} onChange={(event) => props.setFoodName(event.target.value)} autoComplete="off" spellCheck="false" className="h-12 w-full border border-paper/15 bg-paper/5 px-3 text-paper placeholder:text-paper/35" placeholder="Salmon dinner" /></div>
              <div><label htmlFor="protein" className="mb-1.5 block text-xs font-semibold">Protein in grams</label><input id="protein" type="number" min="0.1" max="500" step="0.1" value={props.protein} onChange={(event) => props.setProtein(event.target.value)} className="h-12 w-full border border-paper/15 bg-paper/5 px-3 text-paper placeholder:text-paper/35" placeholder="25" /></div>
              <div className="grid grid-cols-[1fr_auto] gap-2"><button disabled={props.submitting} className="min-h-12 bg-gold px-4 text-sm font-bold text-ink disabled:bg-muted">{props.submitting ? "Adding…" : "Add to day"}</button><button type="button" onClick={() => props.setManualOpen(false)} className="min-h-12 px-4 text-xs text-paper/60">Cancel</button></div>
            </form>
          ) : (
            <button type="button" onClick={() => { props.setManualOpen(true); props.setError(""); }} className="mt-5 flex min-h-12 items-center justify-center gap-2 bg-gold px-4 text-sm font-bold text-ink active:scale-[0.98]"><Plus size={16} /> Log custom protein</button>
          )}
        </aside>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="border border-line bg-paper p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Consistency</p><h2 className="mt-1 font-display text-3xl">Last seven days</h2></div>
            <button type="button" onClick={props.onOpenCalendar} className="flex min-h-11 items-center gap-2 text-xs font-bold text-gold-dark">Full calendar <ArrowUpRight size={15} /></button>
          </div>
          <div className="mt-7 grid grid-cols-7 gap-2">
            {recentDays.map((date) => {
              const value = recentMap.get(date) ?? 0;
              const dayPercent = Math.min(100, (value / props.goal) * 100);
              return <div key={date} className="text-center"><div className="mx-auto flex h-24 max-w-10 items-end bg-canvas"><div className="w-full bg-gold transition-[height] duration-500" style={{ height: `${dayPercent}%` }} /></div><p className="mt-2 text-[10px] font-bold text-muted">{dateFromKey(date).toLocaleDateString("en", { weekday: "narrow" })}</p></div>;
            })}
          </div>
        </section>

        <section className="border border-line bg-paper p-5 sm:p-7">
          <p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Program architecture</p>
          <h2 className="mt-1 font-display text-3xl">More than nutrition.</h2>
          <div className="mt-5 divide-y divide-line">
            <ProgramRow icon={Target} label="Nutrition" detail="Active now" active />
            <ProgramRow icon={Ruler} label="Measurements" detail="Active now" active />
            <ProgramRow icon={Dumbbell} label="Training" detail="Active now" active />
            <ProgramRow icon={Camera} label="Progress photos" detail="Planned" />
          </div>
        </section>
      </div>
    </div>
  );
}

function NutPortionPicker({
  pendingFood,
  onAdd,
}: {
  pendingFood: string | null;
  onAdd: (item: (typeof nuts)[number], grams: number) => Promise<void>;
}) {
  const [selectedNut, setSelectedNut] = useState<(typeof nuts)[number]>(nuts[0]);
  const [grams, setGrams] = useState("30");
  const [error, setError] = useState("");
  const amount = Number(grams);
  const proteinAmount = Number.isFinite(amount)
    ? Math.round((selectedNut.proteinPer100g * amount) / 10) / 10
    : 0;

  function adjustGrams(change: number) {
    const current = Number.isFinite(amount) ? amount : 0;
    setGrams(String(Math.min(500, Math.max(1, current + change))));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount < 1 || amount > 500) {
      setError("Enter an amount between 1 and 500 g.");
      return;
    }
    setError("");
    await onAdd(selectedNut, amount);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 border-t border-line pt-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-muted uppercase">Nuts by weight</p>
          <p className="mt-1 text-xs text-faint">Choose a nut, then log the portion you ate.</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-gold-dark">+{formatGrams(proteinAmount)} g protein</span>
      </div>

      <fieldset className="mt-3 grid grid-cols-3 gap-2">
        <legend className="sr-only">Choose a nut</legend>
        {nuts.map((nut) => {
          const selected = nut.name === selectedNut.name;
          return (
            <button
              type="button"
              key={nut.name}
              aria-pressed={selected}
              onClick={() => { setSelectedNut(nut); setError(""); }}
              className={`min-h-14 border px-2 py-2 text-left transition-[background-color,border-color,color] active:scale-[0.98] ${
                selected ? "border-ink bg-ink text-paper" : "border-line bg-canvas text-ink"
              }`}
            >
              <span className={`block text-[9px] font-bold tracking-[0.12em] ${selected ? "text-gold" : "text-gold-dark"}`}>{nut.symbol}</span>
              <span className="mt-1 block truncate text-xs font-semibold">{nut.name}</span>
            </button>
          );
        })}
      </fieldset>

      <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2 sm:grid-cols-[44px_minmax(0,1fr)_44px_minmax(112px,auto)]">
        <button type="button" onClick={() => adjustGrams(-5)} className="grid min-h-12 place-items-center border border-line bg-canvas text-muted active:scale-[0.96]" aria-label="Decrease portion by 5 grams"><Minus size={16} /></button>
        <div className="relative min-w-0">
          <label htmlFor="nut-grams" className="sr-only">Portion in grams</label>
          <input
            id="nut-grams"
            type="number"
            inputMode="decimal"
            min="1"
            max="500"
            step="1"
            value={grams}
            onChange={(event) => { setGrams(event.target.value); if (error) setError(""); }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "nut-grams-error" : undefined}
            className={`h-12 w-full border bg-paper px-3 pr-8 text-center font-semibold tabular-nums ${error ? "border-error" : "border-line"}`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">g</span>
        </div>
        <button type="button" onClick={() => adjustGrams(5)} className="grid min-h-12 place-items-center border border-line bg-canvas text-muted active:scale-[0.96]" aria-label="Increase portion by 5 grams"><Plus size={16} /></button>
        <button disabled={pendingFood !== null} className="col-span-3 min-h-12 bg-gold px-4 text-xs font-bold text-ink active:scale-[0.98] disabled:cursor-wait disabled:bg-muted sm:col-span-1">
          {pendingFood === selectedNut.name ? "Adding…" : "Add portion"}
        </button>
      </div>
      {error && <p id="nut-grams-error" role="alert" className="mt-2 flex items-center gap-2 text-xs text-error"><Minus size={14} />{error}</p>}
    </form>
  );
}

function Metric({ label, value, meta, bordered = false }: { label: string; value: string; meta: string; bordered?: boolean }) {
  return <div className={`border-b border-line py-5 sm:border-b-0 ${bordered ? "sm:border-l sm:pl-6" : "xl:pr-6"}`}><p className="text-[10px] font-bold tracking-[0.15em] text-muted uppercase">{label}</p><p className="mt-1 font-display text-3xl tabular-nums">{value}</p><p className="mt-1 text-[11px] text-faint">{meta}</p></div>;
}

function ProgramRow({ icon: Icon, label, detail, active = false }: { icon: typeof Target; label: string; detail: string; active?: boolean }) {
  return <div className="flex min-h-14 items-center gap-3"><Icon size={16} className={active ? "text-gold-dark" : "text-faint"} /><span className={active ? "text-sm font-semibold" : "text-sm text-muted"}>{label}</span><span className="ml-auto text-[10px] font-bold tracking-[0.1em] text-faint uppercase">{detail}</span></div>;
}

function MeasurementsView({ today, baselineWeight }: { today: string; baselineWeight: number }) {
  const [selectedDate, setSelectedDate] = useState(today);
  const weights = useQuery(api.measurements.getWeights, { startDate: addDays(today, -89), endDate: today });
  const saveWeight = useMutation(api.measurements.saveWeight);
  const removeWeight = useMutation(api.measurements.removeWeight);
  const selectedMeasurement = weights?.find((item) => item.date === selectedDate);

  const latest = weights?.[0];
  const sevenDaysAgo = weights?.find((item) => item.date <= addDays(today, -7));
  const sevenDayChange = latest && sevenDaysAgo ? latest.weightKg - sevenDaysAgo.weightKg : null;
  const chartData = weights?.slice(0, 30).reverse() ?? [];

  async function handleRemove(id: Id<"weightMeasurements">, date: string) {
    if (!window.confirm(`Remove the weight recorded for ${dateFromKey(date).toLocaleDateString("en", { month: "long", day: "numeric" })}?`)) return;
    await removeWeight({ id });
  }

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-10 xl:px-12">
      <header className="reveal flex flex-col justify-between gap-6 border-b border-line pb-7 md:flex-row md:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Body measurements</p>
          <h1 className="mt-2 font-display text-[2.75rem] leading-none tracking-[-0.04em] sm:text-[3.5rem]">Know the instrument.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Record one daily weight. Today’s entry sets today’s protein target; otherwise Achilles carries forward yesterday’s weight.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted"><Scale size={17} className="text-gold-dark" /> Daily weigh-in</div>
      </header>

      <section aria-label="Weight summary" className="reveal reveal-late grid border-b border-line sm:grid-cols-3">
        <Metric label="Latest weight" value={latest ? `${formatGrams(latest.weightKg)} kg` : `${formatGrams(baselineWeight)} kg`} meta={latest ? dateFromKey(latest.date).toLocaleDateString("en", { month: "long", day: "numeric" }) : "Saved baseline"} />
        <Metric label="Seven-day change" value={sevenDayChange === null ? "—" : `${sevenDayChange > 0 ? "+" : ""}${formatGrams(sevenDayChange)} kg`} meta={sevenDayChange === null ? "Needs two weigh-ins" : "Compared with last week"} bordered />
        <Metric label="Recorded days" value={String(weights?.length ?? 0)} meta="Within the last 90 days" bordered />
      </section>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.45fr)]">
        <section className="border border-line bg-paper p-5 paper-shadow sm:p-7">
          <p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Daily entry</p>
          <h2 className="mt-1 font-display text-3xl">Record your weight</h2>

          <div className="mt-6 flex items-center justify-between gap-2 border-y border-line py-2">
            <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="grid size-11 place-items-center text-muted" aria-label="Previous day"><ChevronLeft size={18} /></button>
            <label className="sr-only" htmlFor="measurement-date">Measurement date</label>
            <input id="measurement-date" type="date" max={today} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-11 bg-transparent text-center text-sm font-semibold" />
            <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={selectedDate >= today} className="grid size-11 place-items-center text-muted disabled:text-faint/40" aria-label="Next day"><ChevronRight size={18} /></button>
          </div>

          <WeightEntryForm
            key={`${selectedDate}-${selectedMeasurement?.weightKg ?? "new"}`}
            date={selectedDate}
            existingWeight={selectedMeasurement?.weightKg}
            baselineWeight={baselineWeight}
            saveWeight={saveWeight}
          />
        </section>

        <section className="border border-line bg-paper p-5 paper-shadow sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Trend</p><h2 className="mt-1 font-display text-3xl">Last 30 weigh-ins</h2></div>
            <p className="max-w-[240px] text-xs leading-5 text-muted">Daily fluctuations are normal. The direction over weeks tells the useful story.</p>
          </div>
          <WeightChart data={chartData} />
        </section>
      </div>

      <section className="mt-5 border border-line bg-paper">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-7"><div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Ledger</p><h2 className="mt-1 font-display text-2xl">Weight history</h2></div><span className="text-xs text-muted">Newest first</span></div>
        {weights === undefined ? (
          <div className="grid gap-2 p-5"><div className="h-14 animate-pulse bg-canvas" /><div className="h-14 animate-pulse bg-canvas" /></div>
        ) : weights.length === 0 ? (
          <div className="p-8 text-center"><p className="font-display text-2xl">Your first mark starts the line.</p><p className="mt-2 text-sm text-muted">Save today’s weight above to begin the history.</p></div>
        ) : (
          <ul className="divide-y divide-line">
            {weights.map((item, index) => {
              const previous = weights[index + 1];
              const change = previous ? item.weightKg - previous.weightKg : null;
              return (
                <li key={item._id} className="flex items-center gap-3 px-4 py-2 sm:px-7">
                  <button type="button" onClick={() => setSelectedDate(item.date)} className="flex min-h-12 min-w-0 flex-1 items-center text-left">
                    <span className="w-36 text-sm font-semibold sm:w-48">{dateFromKey(item.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span className="font-display text-xl tabular-nums sm:text-2xl">{formatGrams(item.weightKg)} kg</span>
                    <span className="ml-auto text-xs tabular-nums text-muted">{change === null ? "First entry" : `${change > 0 ? "+" : ""}${formatGrams(change)} kg`}</span>
                  </button>
                  <button type="button" onClick={() => handleRemove(item._id, item.date)} className="grid size-11 place-items-center text-faint hover:text-error" aria-label={`Remove weight from ${item.date}`}><Trash2 size={15} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function WeightEntryForm({
  date,
  existingWeight,
  baselineWeight,
  saveWeight,
}: {
  date: string;
  existingWeight: number | undefined;
  baselineWeight: number;
  saveWeight: (args: { date: string; weightKg: number }) => Promise<Id<"weightMeasurements">>;
}) {
  const [weight, setWeight] = useState(String(existingWeight ?? baselineWeight));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(weight);
    if (!Number.isFinite(value) || value < 30 || value > 300) {
      setError("Enter a weight between 30 and 300 kg.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSaved(false);
    try {
      await saveWeight({ date, weightKg: value });
      setSaved(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-6 grid gap-5">
      <div>
        <label htmlFor="daily-weight" className="mb-2 block text-sm font-semibold">Weight</label>
        <div className="relative">
          <input
            id="daily-weight"
            type="number"
            min="30"
            max="300"
            step="0.1"
            value={weight}
            onChange={(event) => { setWeight(event.target.value); if (error) setError(""); setSaved(false); }}
            aria-invalid={Boolean(error)}
            className={`h-16 w-full border bg-canvas px-4 pr-14 font-display text-3xl tabular-nums ${error ? "border-error" : "border-line"}`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">kg</span>
        </div>
        {error && <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-error"><Minus size={15} />{error}</p>}
      </div>

      <div className="bg-canvas p-4">
        <p className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">Protein target from this weight</p>
        <p className="mt-1 font-display text-3xl tabular-nums">{Number(weight) > 0 ? formatGrams(proteinGoalFromKg(Number(weight))) : "—"}<span className="ml-1 text-base text-muted">g / day</span></p>
        {Number(weight) > 0 && <p className="mt-1 text-xs text-faint">{formatGrams(Number(weight))} kg = {formatGrams(kilogramsToPounds(Number(weight)))} lb · × 0.7</p>}
      </div>

      <button disabled={submitting} className="flex min-h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-bold text-paper active:scale-[0.98] disabled:bg-muted">
        {submitting ? "Saving weigh-in…" : existingWeight === undefined ? "Save weigh-in" : "Update weigh-in"}
      </button>
      {saved && <p role="status" className="flex items-center justify-center gap-2 text-sm font-semibold text-success"><Check size={16} /> Weight saved</p>}
    </form>
  );
}

function WeightChart({ data }: { data: Doc<"weightMeasurements">[] }) {
  if (data.length === 0) return <div className="mt-8 grid min-h-64 place-content-center bg-canvas text-center"><Scale className="mx-auto text-faint" size={26} /><p className="mt-3 font-display text-2xl">No trend yet.</p><p className="mt-1 text-sm text-muted">Recorded weights will form the line.</p></div>;

  const values = data.map((item) => item.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(0.5, (max - min) * 0.2);
  const low = min - padding;
  const high = max + padding;
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 350 : 30 + (index / (data.length - 1)) * 640;
    const y = 190 - ((item.weightKg - low) / (high - low)) * 150;
    return { x, y, item };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <figure className="mt-7">
      <svg viewBox="0 0 700 230" role="img" aria-label={`Weight trend from ${formatGrams(data[0].weightKg)} to ${formatGrams(data[data.length - 1].weightKg)} kilograms`} className="h-auto w-full overflow-visible">
        {[40, 90, 140, 190].map((y) => <line key={y} x1="30" x2="670" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />)}
        <path d={path} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="square" strokeLinejoin="round" />
        {points.map((point) => <circle key={point.item._id} cx={point.x} cy={point.y} r="4" fill="var(--paper)" stroke="var(--gold-dark)" strokeWidth="2" />)}
        <text x="30" y="220" fill="var(--muted)" fontSize="11">{dateFromKey(data[0].date).toLocaleDateString("en", { month: "short", day: "numeric" })}</text>
        <text x="670" y="220" textAnchor="end" fill="var(--muted)" fontSize="11">{dateFromKey(data[data.length - 1].date).toLocaleDateString("en", { month: "short", day: "numeric" })}</text>
      </svg>
      <figcaption className="sr-only">A line chart showing the most recent thirty recorded weights.</figcaption>
    </figure>
  );
}

function periodRange(view: CalendarView, cursor: Date) {
  const date = new Date(cursor);
  if (view === "week") {
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return { start: localDateKey(date), end: localDateKey(end) };
  }
  if (view === "month") return { start: localDateKey(new Date(date.getFullYear(), date.getMonth(), 1)), end: localDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)) };
  return { start: `${date.getFullYear()}-01-01`, end: `${date.getFullYear()}-12-31` };
}

function shiftPeriod(view: CalendarView, cursor: Date, amount: number) {
  const next = new Date(cursor);
  if (view === "week") next.setDate(next.getDate() + amount * 7);
  else if (view === "month") next.setMonth(next.getMonth() + amount);
  else next.setFullYear(next.getFullYear() + amount);
  return next;
}

function datesInRange(start: string, end: string) {
  return Array.from({ length: daysBetween(start, end) + 1 }, (_, index) => addDays(start, index));
}

function ProgressCalendar({ today, goal, startDate, onOpenDay }: { today: string; goal: number; startDate: string; onOpenDay: (date: string) => void }) {
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => dateFromKey(today));
  const range = periodRange(view, cursor);
  const progress = useQuery(api.protein.getProgress, { startDate: range.start, endDate: range.end });
  const totals = new Map(progress?.map((item) => [item.date, item.protein]));
  const eligibleDates = datesInRange(range.start, range.end).filter((date) => date <= today && date >= startDate);
  const completed = eligibleDates.filter((date) => meetsProteinSuccess(totals.get(date) ?? 0, goal)).length;
  const tracked = eligibleDates.filter((date) => (totals.get(date) ?? 0) > 0);
  const average = tracked.length ? tracked.reduce((sum, date) => sum + (totals.get(date) ?? 0), 0) / tracked.length : 0;
  const completion = Math.round((completed / Math.max(1, eligibleDates.length)) * 100);

  let streak = 0;
  for (let date = today; date >= startDate; date = addDays(date, -1)) {
    if (meetsProteinSuccess(totals.get(date) ?? 0, goal)) streak += 1;
    else if (date !== today) break;
  }

  const title = view === "week"
    ? `${dateFromKey(range.start).toLocaleDateString("en", { month: "short", day: "numeric" })} — ${dateFromKey(range.end).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
    : view === "month"
      ? cursor.toLocaleDateString("en", { month: "long", year: "numeric" })
      : String(cursor.getFullYear());

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-10 xl:px-12">
      <header className="reveal flex flex-col justify-between gap-6 border-b border-line pb-7 md:flex-row md:items-end">
        <div><p className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Proof of consistency</p><h1 className="mt-2 font-display text-[2.75rem] leading-none tracking-[-0.04em] sm:text-[3.5rem]">The calendar.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">See the days you kept the promise. Gold marks days reaching at least 90% of your protein target; lighter days show work in progress.</p></div>
        <div className="grid grid-cols-3 border border-line bg-paper p-1" role="tablist" aria-label="Calendar period">
          {(["week", "month", "year"] as CalendarView[]).map((item) => <button type="button" key={item} role="tab" aria-selected={view === item} onClick={() => setView(item)} className={`min-h-11 px-4 text-xs font-bold capitalize ${view === item ? "bg-ink text-paper" : "text-muted"}`}>{item}</button>)}
        </div>
      </header>

      <section aria-label="Period summary" className="grid border-b border-line sm:grid-cols-3">
        <Metric label="Successful days" value={`${completed} / ${eligibleDates.length}`} meta={`${completion}% reached 90%+`} />
        <Metric label="Average logged" value={`${formatGrams(average)} g`} meta={tracked.length ? `Across ${tracked.length} tracked days` : "No logged days yet"} bordered />
        <Metric label="Current streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} meta="Consecutive successful days" bordered />
      </section>

      <section className="mt-7 border border-line bg-paper paper-shadow">
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setCursor(shiftPeriod(view, cursor, -1))} className="grid size-11 place-items-center text-muted" aria-label={`Previous ${view}`}><ChevronLeft size={19} /></button>
          <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
          <button type="button" onClick={() => setCursor(shiftPeriod(view, cursor, 1))} className="grid size-11 place-items-center text-muted" aria-label={`Next ${view}`}><ChevronRight size={19} /></button>
        </div>
        {progress === undefined ? <div className="m-6 h-[430px] animate-pulse bg-canvas" /> : view === "week" ? <WeekGrid range={range} totals={totals} goal={goal} today={today} onOpenDay={onOpenDay} /> : view === "month" ? <MonthGrid cursor={cursor} totals={totals} goal={goal} today={today} onOpenDay={onOpenDay} /> : <YearGrid year={cursor.getFullYear()} totals={totals} goal={goal} today={today} />}
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted">
        <span className="flex items-center gap-2"><span className="size-3 bg-gold" /> Success · 90%+</span>
        <span className="flex items-center gap-2"><span className="size-3 bg-gold-soft" /> Protein logged</span>
        <span className="flex items-center gap-2"><span className="size-3 border border-line bg-canvas" /> No entry</span>
      </div>
    </div>
  );
}

function progressColors(value: number, goal: number, isFuture: boolean) {
  if (isFuture || value === 0) return "bg-canvas";
  if (meetsProteinSuccess(value, goal)) return "bg-gold";
  return "bg-gold-soft";
}

function WeekGrid({ range, totals, goal, today, onOpenDay }: { range: { start: string; end: string }; totals: Map<string, number>; goal: number; today: string; onOpenDay: (date: string) => void }) {
  return <div className="grid gap-px bg-line sm:grid-cols-7">{datesInRange(range.start, range.end).map((date) => { const value = totals.get(date) ?? 0; const percent = Math.min(100, (value / goal) * 100); return <button type="button" key={date} onClick={() => onOpenDay(date)} disabled={date > today} className="flex min-h-[170px] flex-col bg-paper p-4 text-left disabled:cursor-default sm:min-h-[340px]"><span className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{dateFromKey(date).toLocaleDateString("en", { weekday: "short" })}</span><span className={`mt-2 font-display text-3xl ${date === today ? "text-gold-dark" : ""}`}>{dateFromKey(date).getDate()}</span><div className="mt-auto"><p className="mb-3 text-xs tabular-nums text-muted">{value ? `${formatGrams(value)} / ${goal} g` : date > today ? "Ahead" : "No entry"}</p><div className="h-20 bg-canvas sm:h-36"><div className="h-full origin-bottom bg-gold transition-transform duration-500" style={{ transform: `scaleY(${percent / 100})` }} /></div></div></button>; })}</div>;
}

function MonthGrid({ cursor, totals, goal, today, onOpenDay }: { cursor: Date; totals: Map<string, number>; goal: number; today: string; onOpenDay: (date: string) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(date.getDate() + index); return localDateKey(date); });
  return <div><div className="grid grid-cols-7 border-b border-line">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="px-2 py-3 text-center text-[9px] font-bold tracking-[0.12em] text-muted uppercase sm:text-[10px]">{day}</div>)}</div><div className="grid grid-cols-7 gap-px bg-line">{days.map((date) => { const value = totals.get(date) ?? 0; const currentMonth = dateFromKey(date).getMonth() === cursor.getMonth(); return <button type="button" key={date} onClick={() => onOpenDay(date)} disabled={date > today} aria-label={`${dateFromKey(date).toLocaleDateString("en", { month: "long", day: "numeric" })}: ${value ? `${formatGrams(value)} grams` : "no entry"}`} className={`relative min-h-16 bg-paper p-2 text-left active:scale-[0.98] sm:min-h-24 sm:p-3 ${currentMonth ? "" : "text-faint"}`}><span className={`text-xs font-semibold tabular-nums ${date === today ? "text-gold-dark underline underline-offset-4" : ""}`}>{dateFromKey(date).getDate()}</span>{currentMonth && <span className={`absolute bottom-2 left-2 right-2 h-2 sm:bottom-3 sm:left-3 sm:right-3 ${progressColors(value, goal, date > today)}`}><span className="sr-only">{meetsProteinSuccess(value, goal) ? "Successful day" : value > 0 ? "Protein logged" : "No entry"}</span></span>}{value > 0 && currentMonth && <span className="absolute right-2 top-2 hidden text-[9px] tabular-nums text-muted sm:block">{formatGrams(value)}g</span>}</button>; })}</div></div>;
}

function YearGrid({ year, totals, goal, today }: { year: number; totals: Map<string, number>; goal: number; today: string }) {
  return <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 12 }, (_, month) => { const first = new Date(year, month, 1); const leading = (first.getDay() + 6) % 7; const days = new Date(year, month + 1, 0).getDate(); return <div key={month} className="bg-paper p-4 sm:p-5"><h3 className="font-display text-xl">{first.toLocaleDateString("en", { month: "long" })}</h3><div className="mt-4 grid grid-cols-7 gap-1">{Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => { const date = localDateKey(new Date(year, month, index + 1)); const value = totals.get(date) ?? 0; return <span key={date} title={`${date}: ${value} g`} className={`aspect-square min-h-2 ${progressColors(value, goal, date > today)}`}><span className="sr-only">{date}: {value} grams</span></span>; })}</div></div>; })}</div>;
}
