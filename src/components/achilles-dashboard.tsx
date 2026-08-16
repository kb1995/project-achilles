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
  Minus,
  Pill,
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

type AppView = "overview" | "protein" | "training" | "measurements";
type CalendarView = "day" | "week" | "month" | "year";

const challengeStartDate = "2026-08-10";
const proteinSuccessRatio = 0.9;
const poundsPerKilogram = 2.2046226218;
const proteinGramsPerPound = 0.7;

const foods = [
  { name: "Granola bowl", detail: "3 tbsp 4.5% yogurt · 50 g nutty granola", protein: 10, symbol: "GB" },
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
    { id: "overview" as const, label: "Overview", href: "/overview", icon: CalendarDays },
    { id: "protein" as const, label: "Protein", href: "/protein", icon: Target },
    { id: "training" as const, label: "Training", href: "/training", icon: Dumbbell },
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
            <Link href="/protein" className="flex min-h-11 items-center gap-3 px-3 text-ink"><Target size={16} className="text-gold-dark" /> Protein log</Link>
            <Link href="/training" className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-ink"><Dumbbell size={16} className="text-gold-dark" /> Training</Link>
            <div className="flex min-h-11 items-center gap-3 px-3 text-faint"><Camera size={16} /> Progress photos</div>
          </div>
        </div>

        <div className="mt-auto border-t border-line pt-5">
          <p className="font-display text-lg">The 365-day ascent</p>
          <p className="mt-1 text-xs leading-5 text-muted">Build the proof, one recorded day at a time.</p>
        </div>
      </aside>

      <header className="flex h-16 items-center justify-between gap-3 border-b border-line bg-paper px-4 sm:h-[68px] sm:px-5 lg:hidden">
        <Link href="/overview" className="flex min-h-11 items-center gap-3">
          <AchillesMark className="h-8 w-8 text-gold-dark" />
          <span className="font-display text-2xl">Achilles</span>
        </Link>
        <span className="hidden text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase min-[370px]:block">365-day ascent</span>
      </header>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-paper px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 sm:px-2 sm:pt-2 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold sm:text-[11px] ${active === item.id ? "text-gold-dark" : "text-muted"}`}
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
  const [savingCreatine, setSavingCreatine] = useState(false);
  const [error, setError] = useState("");

  const day = useQuery(api.protein.getDay, { date: selectedDate });
  const recent = useQuery(api.protein.getProgress, { startDate: addDays(today, -29), endDate: today });
  const addEntry = useMutation(api.protein.addEntry);
  const removeEntry = useMutation(api.protein.removeEntry);
  const setCreatineTaken = useMutation(api.protein.setCreatineTaken);

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

  async function toggleCreatine() {
    if (!day) return;
    setSavingCreatine(true);
    setError("");
    try {
      await setCreatineTaken({ date: selectedDate, taken: !day.creatineTaken });
    } catch {
      setError("Creatine status could not be saved. Please try again.");
    } finally {
      setSavingCreatine(false);
    }
  }

  function openCalendarDay(date: string) {
    router.push(`/protein?date=${encodeURIComponent(date > today ? today : date)}`);
  }

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-20 bg-ink px-4 py-3 text-sm text-paper focus:translate-y-0">Skip to content</a>
      <AppNavigation active={activeView} />

      <main id="main-content" className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:ml-[236px] lg:pb-0">
        {activeView === "protein" ? (
          <ProteinLogView
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
            creatineTaken={day?.creatineTaken}
            savingCreatine={savingCreatine}
            toggleCreatine={toggleCreatine}
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
            onOpenCalendar={() => router.push("/overview")}
            onOpenMeasurements={() => router.push("/measurements")}
          />
        ) : activeView === "training" ? (
          <TrainingView today={today} initialDate={selectedDate} />
        ) : activeView === "overview" ? (
          <ProgressCalendar today={today} goal={goal} startDate={startDate} onOpenDay={openCalendarDay} />
        ) : (
          <MeasurementsView today={today} baselineWeight={weightKg} initialDate={selectedDate} />
        )}
      </main>
    </div>
  );
}

type ProteinLogProps = {
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
  creatineTaken: boolean | undefined;
  savingCreatine: boolean;
  toggleCreatine: () => Promise<void>;
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

function ProteinLogView(props: ProteinLogProps) {
  const entries = props.entries;
  const recentMap = new Map(props.recent?.map((item) => [item.date, item.protein]));
  const recentDays = Array.from({ length: 7 }, (_, index) => addDays(props.today, index - 6));

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-8 sm:py-10 xl:px-12">
      <header className="reveal flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:gap-5 sm:pb-7">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Protein log · Day {props.dayNumber}</p>
          <h1 className="mt-2 font-display text-[2.5rem] leading-[0.95] tracking-[-0.04em] sm:text-[3.5rem]">Fuel the day.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Log protein and creatine for the selected day, with your latest weight setting the target.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold">{formatDayHeading(props.selectedDate, props.today)}</p>
          {props.selectedDate !== props.today && <button type="button" onClick={() => props.setSelectedDate(props.today)} className="mt-2 min-h-11 text-xs font-bold text-gold-dark">Return to today</button>}
        </div>
      </header>

      <section aria-label="Key metrics" className="reveal reveal-late grid grid-cols-2 border-b border-line xl:grid-cols-4">
        <Metric label="Protein today" value={`${formatGrams(props.consumed)} / ${props.goal} g`} meta={`${Math.round(props.percent)}% complete`} className="pr-3 sm:pr-6" />
        <div className="min-w-0 border-l border-line py-4 pl-4 sm:py-5 sm:pl-6 xl:pr-6">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted uppercase">Weight used today</p>
          <button type="button" onClick={props.onOpenMeasurements} className="mt-1 min-h-11 font-display text-[1.65rem] tabular-nums underline decoration-line underline-offset-4 sm:text-3xl">{props.weightKg} kg</button>
          <p className="text-[11px] text-faint">From {props.weightSource === "today" ? "today’s weigh-in" : props.weightSource === "yesterday" ? "yesterday’s weigh-in" : "your saved baseline"}</p>
        </div>
        <Metric label="30-day consistency" value={`${props.consistency}%`} meta="Days reaching 90%+" className="border-t border-line pr-3 sm:pr-6 xl:border-l xl:pl-6" />
        <Metric label="Journey" value={`${props.dayNumber} / 365`} meta={`${365 - props.dayNumber} days remain`} className="border-l border-t border-line pl-4 sm:pl-6 xl:border-t-0" />
      </section>

      {props.error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-error"><Minus size={15} />{props.error}</p>}

      <section aria-labelledby="creatine-title" className="mt-6 flex flex-col gap-4 border border-line bg-paper p-4 paper-shadow sm:mt-7 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className={`grid size-11 shrink-0 place-items-center ${props.creatineTaken ? "bg-gold text-ink" : "bg-canvas text-gold-dark"}`} aria-hidden="true">
            {props.creatineTaken ? <Check size={19} strokeWidth={2.5} /> : <Pill size={19} />}
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Daily habit</p>
            <h2 id="creatine-title" className="mt-1 font-display text-2xl">Creatine</h2>
            <p className="mt-1 text-sm text-muted">
              {props.creatineTaken === undefined ? "Checking status…" : props.creatineTaken ? "Marked as taken for this day." : "Not taken for this day."}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-pressed={props.creatineTaken ?? false}
          disabled={props.creatineTaken === undefined || props.savingCreatine}
          onClick={props.toggleCreatine}
          className={`flex min-h-12 w-full items-center justify-center gap-2 px-5 text-sm font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-48 ${props.creatineTaken ? "border border-line bg-canvas text-ink" : "bg-ink text-paper"}`}
        >
          {props.savingCreatine ? "Saving…" : props.creatineTaken ? <><Check size={16} /> Taken</> : "Mark as taken"}
        </button>
      </section>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-7 sm:gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.72fr)]">
        <section className="min-w-0 border border-line bg-paper paper-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3"><Target size={17} className="text-gold-dark" /><h2 className="text-sm font-bold">Daily protein</h2></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => props.setSelectedDate(addDays(props.selectedDate, -1))} className="grid size-11 place-items-center text-muted" aria-label="Previous day"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => props.setSelectedDate(addDays(props.selectedDate, 1))} disabled={props.selectedDate >= props.today} className="grid size-11 place-items-center text-muted disabled:text-faint/40" aria-label="Next day"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="font-display text-[3.25rem] leading-none tabular-nums sm:text-[4.5rem]">{formatGrams(props.consumed)}<span className="ml-2 text-xl text-muted sm:text-2xl">g</span></p>
                <p className="mt-2 text-sm text-muted">{formatGrams(props.remaining)} g remaining of your {props.goal} g target</p>
              </div>
              {meetsProteinSuccess(props.consumed, props.goal) ? <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-success"><Check size={17} /> Day marked successful · 90%+</span> : <div className="text-left text-xs text-muted sm:text-right"><p>0.7 g protein × {formatGrams(kilogramsToPounds(props.weightKg))} lb</p><p className="mt-1 text-faint">Converted from {formatGrams(props.weightKg)} kg · using {props.weightSource === "today" ? "today’s" : props.weightSource === "yesterday" ? "yesterday’s" : "baseline"} weight</p></div>}
            </div>
            <div className="mt-7 h-3 bg-canvas" role="progressbar" aria-label="Daily protein progress" aria-valuenow={Math.round(props.percent)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${props.percent}%` }} />
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-bold tracking-[0.16em] text-muted uppercase">Quick add</h3>
                <span className="text-[11px] text-faint">One serving</span>
              </div>
              <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {foods.map((food) => (
                  <button type="button" key={food.name} onClick={() => props.quickAdd(food)} disabled={props.pendingFood !== null} className="lift flex min-h-[104px] w-[42vw] min-w-[124px] max-w-[145px] snap-start flex-col border border-line bg-canvas p-3 text-left transition-[transform,border-color] duration-150 active:scale-[0.98] disabled:cursor-wait sm:w-auto sm:min-w-0 sm:max-w-none sm:flex-1">
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

        <aside className="flex min-h-[360px] flex-col bg-ink p-5 text-paper paper-shadow sm:min-h-[440px] sm:p-7">
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

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-5 sm:gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="border border-line bg-paper p-5 sm:p-7">
          <div className="flex flex-col items-start justify-between gap-2 min-[380px]:flex-row min-[380px]:gap-4">
            <div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Consistency</p><h2 className="mt-1 font-display text-3xl">Last seven days</h2></div>
            <button type="button" onClick={props.onOpenCalendar} className="flex min-h-11 items-center gap-2 text-xs font-bold text-gold-dark">Full calendar <ArrowUpRight size={15} /></button>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-1.5 sm:mt-7 sm:gap-2">
            {recentDays.map((date) => {
              const value = recentMap.get(date) ?? 0;
              const dayPercent = Math.min(100, (value / props.goal) * 100);
              return <div key={date} className="text-center"><div className="mx-auto flex h-20 max-w-10 items-end bg-canvas sm:h-24"><div className="w-full bg-gold transition-[height] duration-500" style={{ height: `${dayPercent}%` }} /></div><p className="mt-2 text-[10px] font-bold text-muted">{dateFromKey(date).toLocaleDateString("en", { weekday: "narrow" })}</p></div>;
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
      <div className="flex flex-col items-start justify-between gap-2 min-[380px]:flex-row min-[380px]:items-end min-[380px]:gap-3">
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

function Metric({ label, value, meta, bordered = false, className = "" }: { label: string; value: string; meta: string; bordered?: boolean; className?: string }) {
  return <div className={`min-w-0 border-b border-line py-4 sm:py-5 sm:border-b-0 ${bordered ? "sm:border-l sm:pl-6" : "xl:pr-6"} ${className}`}><p className="text-[10px] font-bold tracking-[0.15em] text-muted uppercase">{label}</p><p className="mt-1 font-display text-[1.65rem] leading-tight tabular-nums sm:text-3xl">{value}</p><p className="mt-1 text-[11px] text-faint">{meta}</p></div>;
}

function ProgramRow({ icon: Icon, label, detail, active = false }: { icon: typeof Target; label: string; detail: string; active?: boolean }) {
  return <div className="flex min-h-14 items-center gap-3"><Icon size={16} className={active ? "text-gold-dark" : "text-faint"} /><span className={active ? "text-sm font-semibold" : "text-sm text-muted"}>{label}</span><span className="ml-auto text-[10px] font-bold tracking-[0.1em] text-faint uppercase">{detail}</span></div>;
}

function MeasurementsView({ today, baselineWeight, initialDate }: { today: string; baselineWeight: number; initialDate?: string }) {
  const [selectedDate, setSelectedDate] = useState(() => initialDate && initialDate <= today ? initialDate : today);
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
  if (view === "day") {
    const day = localDateKey(date);
    return { start: day, end: day };
  }
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
  if (view === "day") next.setDate(next.getDate() + amount);
  else if (view === "week") next.setDate(next.getDate() + amount * 7);
  else if (view === "month") next.setMonth(next.getMonth() + amount);
  else next.setFullYear(next.getFullYear() + amount);
  return next;
}

function datesInRange(start: string, end: string) {
  return Array.from({ length: daysBetween(start, end) + 1 }, (_, index) => addDays(start, index));
}

type CalendarDayProgress = {
  date: string;
  protein: number;
  workout: boolean;
  creatine: boolean;
  measurement: boolean;
};

function emptyCalendarDay(date: string): CalendarDayProgress {
  return { date, protein: 0, workout: false, creatine: false, measurement: false };
}

function completedSignals(day: CalendarDayProgress, goal: number) {
  return Number(meetsProteinSuccess(day.protein, goal))
    + Number(day.workout)
    + Number(day.creatine)
    + Number(day.measurement);
}

function calendarDayLabel(day: CalendarDayProgress, goal: number) {
  const proteinStatus = meetsProteinSuccess(day.protein, goal)
    ? `protein complete at ${formatGrams(day.protein)} grams`
    : day.protein > 0
      ? `${formatGrams(day.protein)} grams of protein logged`
      : "protein not logged";
  return `${dateFromKey(day.date).toLocaleDateString("en", { month: "long", day: "numeric" })}: ${completedSignals(day, goal)} of 4 complete; ${proteinStatus}; ${day.workout ? "workout complete" : "no workout"}; ${day.creatine ? "creatine taken" : "creatine not taken"}; ${day.measurement ? "measurement taken" : "no measurement"}`;
}

function signalColor(complete: boolean, partial = false, future = false) {
  if (future || (!complete && !partial)) return "border border-line bg-canvas text-faint";
  if (partial) return "bg-gold-soft text-gold-dark";
  return "bg-gold text-ink";
}

function DaySignalTiles({ day, goal, future = false }: { day: CalendarDayProgress; goal: number; future?: boolean }) {
  const proteinComplete = meetsProteinSuccess(day.protein, goal);
  return (
    <span className="grid grid-cols-4 gap-1" aria-hidden="true">
      <span className={`grid aspect-square place-items-center text-[8px] font-bold sm:text-[9px] ${signalColor(proteinComplete, day.protein > 0 && !proteinComplete, future)}`}>P</span>
      <span className={`grid aspect-square place-items-center text-[8px] font-bold sm:text-[9px] ${signalColor(day.workout, false, future)}`}>W</span>
      <span className={`grid aspect-square place-items-center text-[8px] font-bold sm:text-[9px] ${signalColor(day.creatine, false, future)}`}>C</span>
      <span className={`grid aspect-square place-items-center text-[8px] font-bold sm:text-[9px] ${signalColor(day.measurement, false, future)}`}>M</span>
    </span>
  );
}

function DayActionCard({ icon: Icon, title, status, detail, href, action, complete, partial = false }: {
  icon: typeof Target;
  title: string;
  status: string;
  detail: string;
  href: string;
  action: string;
  complete: boolean;
  partial?: boolean;
}) {
  return (
    <section className="flex min-h-56 flex-col border border-line bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 place-items-center ${complete ? "bg-gold text-ink" : partial ? "bg-gold-soft text-gold-dark" : "bg-canvas text-faint"}`} aria-hidden="true"><Icon size={18} /></span>
        <span className={`flex min-h-8 items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] uppercase ${complete ? "text-success" : partial ? "text-gold-dark" : "text-faint"}`}>{complete && <Check size={13} />}{status}</span>
      </div>
      <h3 className="mt-5 font-display text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
      <Link href={href} className="mt-auto flex min-h-11 items-center gap-2 pt-4 text-xs font-bold text-gold-dark">{action}<ArrowUpRight size={14} /></Link>
    </section>
  );
}

function DayOverview({ day, goal }: { day: CalendarDayProgress; goal: number }) {
  const setCreatineTaken = useMutation(api.protein.setCreatineTaken);
  const [savingCreatine, setSavingCreatine] = useState(false);
  const [error, setError] = useState("");
  const proteinComplete = meetsProteinSuccess(day.protein, goal);
  const score = completedSignals(day, goal);
  const encodedDate = encodeURIComponent(day.date);

  async function toggleCreatine() {
    setSavingCreatine(true);
    setError("");
    try {
      await setCreatineTaken({ date: day.date, taken: !day.creatine });
    } catch {
      setError("Creatine status could not be saved. Try again.");
    } finally {
      setSavingCreatine(false);
    }
  }

  return (
    <div className="p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Daily command</p>
          <h3 className="mt-1 font-display text-3xl">{score === 4 ? "Day complete." : `${score} of 4 complete.`}</h3>
          <p className="mt-2 text-sm text-muted">Manage every daily signal from one place.</p>
        </div>
        <p className="font-display text-4xl tabular-nums">{score * 25}<span className="text-lg text-muted">%</span></p>
      </div>
      <div className="mt-5 h-2 bg-canvas" role="progressbar" aria-label="Overall daily progress" aria-valuenow={score * 25} aria-valuemin={0} aria-valuemax={100}><span className="block h-full bg-gold transition-[width] duration-500" style={{ width: `${score * 25}%` }} /></div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DayActionCard icon={Target} title="Protein" status={proteinComplete ? "Complete" : day.protein > 0 ? "In progress" : "Not started"} detail={`${formatGrams(day.protein)} of ${goal} g logged`} href={`/protein?date=${encodedDate}`} action="Open protein log" complete={proteinComplete} partial={day.protein > 0} />
        <DayActionCard icon={Dumbbell} title="Workout" status={day.workout ? "Complete" : "Not logged"} detail={day.workout ? "Workout recorded for this day." : "Log strength training or an activity."} href={`/training?date=${encodedDate}`} action={day.workout ? "View training" : "Log workout"} complete={day.workout} />

        <section className="flex min-h-56 flex-col border border-line bg-paper p-5">
          <div className="flex items-start justify-between gap-3">
            <span className={`grid size-11 place-items-center ${day.creatine ? "bg-gold text-ink" : "bg-canvas text-faint"}`} aria-hidden="true"><Pill size={18} /></span>
            <span className={`flex min-h-8 items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] uppercase ${day.creatine ? "text-success" : "text-faint"}`}>{day.creatine && <Check size={13} />}{day.creatine ? "Taken" : "Not taken"}</span>
          </div>
          <h3 className="mt-5 font-display text-2xl">Creatine</h3>
          <p className="mt-2 text-sm leading-6 text-muted">One daily check—no dosage or extra fields.</p>
          <button type="button" aria-pressed={day.creatine} disabled={savingCreatine} onClick={toggleCreatine} className={`mt-auto min-h-11 px-4 text-xs font-bold active:scale-[0.98] disabled:cursor-wait disabled:bg-muted ${day.creatine ? "border border-line bg-canvas text-ink" : "bg-ink text-paper"}`}>{savingCreatine ? "Saving…" : day.creatine ? "Mark as not taken" : "Mark as taken"}</button>
          {error && <p role="alert" className="mt-2 text-xs text-error">{error}</p>}
        </section>

        <DayActionCard icon={Scale} title="Measurement" status={day.measurement ? "Complete" : "Not logged"} detail={day.measurement ? "Weight recorded for this day." : "Add your daily weigh-in."} href={`/measurements?date=${encodedDate}`} action={day.measurement ? "View measurement" : "Add measurement"} complete={day.measurement} />
      </div>
    </div>
  );
}

function ProgressCalendar({ today, goal, startDate, onOpenDay }: { today: string; goal: number; startDate: string; onOpenDay: (date: string) => void }) {
  const [view, setView] = useState<CalendarView>("day");
  const [cursor, setCursor] = useState(() => dateFromKey(today));
  const range = periodRange(view, cursor);
  const progress = useQuery(api.protein.getCalendarProgress, { startDate: range.start, endDate: range.end });
  const daysByDate = new Map(progress?.map((item) => [item.date, item]));
  const eligibleDates = datesInRange(range.start, range.end).filter((date) => date <= today && date >= startDate);
  const scores = eligibleDates.map((date) => completedSignals(daysByDate.get(date) ?? emptyCalendarDay(date), goal));
  const completed = scores.filter((score) => score === 4).length;
  const completion = Math.round((scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length * 4)) * 100);
  let longestStreak = 0;
  let runningStreak = 0;
  for (const score of scores) {
    runningStreak = score === 4 ? runningStreak + 1 : 0;
    longestStreak = Math.max(longestStreak, runningStreak);
  }

  const title = view === "day"
    ? formatDayHeading(range.start, today)
    : view === "week"
    ? `${dateFromKey(range.start).toLocaleDateString("en", { month: "short", day: "numeric" })} — ${dateFromKey(range.end).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
    : view === "month"
      ? cursor.toLocaleDateString("en", { month: "long", year: "numeric" })
      : String(cursor.getFullYear());

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-10 xl:px-12">
      <header className="reveal flex flex-col justify-between gap-6 border-b border-line pb-7 md:flex-row md:items-end">
        <div><p className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">{view === "day" ? "Today’s command" : "Proof of consistency"}</p><h1 className="mt-2 font-display text-[2.75rem] leading-none tracking-[-0.04em] sm:text-[3.5rem]">{view === "day" ? "Command the day." : "The calendar."}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">{view === "day" ? "Manage protein, training, creatine, and measurements without hunting through the app." : "See the whole day at a glance. A complete day checks all four."}</p></div>
        <div className="grid grid-cols-4 border border-line bg-paper p-1" role="tablist" aria-label="Calendar period">
          {(["day", "week", "month", "year"] as CalendarView[]).map((item) => <button type="button" key={item} role="tab" aria-selected={view === item} onClick={() => { if (item === "day" && localDateKey(cursor) > today) setCursor(dateFromKey(today)); setView(item); }} className={`min-h-11 px-3 text-xs font-bold capitalize sm:px-4 ${view === item ? "bg-ink text-paper" : "text-muted"}`}>{item}</button>)}
        </div>
      </header>

      {view !== "day" && <section aria-label="Period summary" className="grid border-b border-line sm:grid-cols-3">
        <Metric label="Complete days" value={`${completed} / ${eligibleDates.length}`} meta="All four signals complete" />
        <Metric label="Overall progress" value={`${completion}%`} meta="Across all daily signals" bordered />
        <Metric label="Best streak" value={`${longestStreak} ${longestStreak === 1 ? "day" : "days"}`} meta="Consecutive complete days" bordered />
      </section>}

      <section className="mt-7 border border-line bg-paper paper-shadow">
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setCursor(shiftPeriod(view, cursor, -1))} className="grid size-11 place-items-center text-muted" aria-label={`Previous ${view}`}><ChevronLeft size={19} /></button>
          <div className="text-center"><h2 className="font-display text-xl sm:text-2xl">{title}</h2>{view === "day" && range.start !== today && <button type="button" onClick={() => setCursor(dateFromKey(today))} className="mt-1 min-h-11 text-[10px] font-bold tracking-[0.1em] text-gold-dark uppercase">Return to today</button>}</div>
          <button type="button" onClick={() => setCursor(shiftPeriod(view, cursor, 1))} disabled={view === "day" && range.start >= today} className="grid size-11 place-items-center text-muted disabled:text-faint/40" aria-label={`Next ${view}`}><ChevronRight size={19} /></button>
        </div>
        {progress === undefined ? <div className="m-6 h-[430px] animate-pulse bg-canvas" /> : view === "day" ? <DayOverview day={daysByDate.get(range.start) ?? emptyCalendarDay(range.start)} goal={goal} /> : view === "week" ? <WeekGrid range={range} daysByDate={daysByDate} goal={goal} today={today} onOpenDay={onOpenDay} /> : view === "month" ? <MonthGrid cursor={cursor} daysByDate={daysByDate} goal={goal} today={today} onOpenDay={onOpenDay} /> : <YearGrid year={cursor.getFullYear()} daysByDate={daysByDate} goal={goal} today={today} />}
      </section>

      {view !== "day" && <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted" aria-label="Calendar legend">
        {[['P', 'Protein · 90%+'], ['W', 'Workout'], ['C', 'Creatine'], ['M', 'Measurement']].map(([symbol, label]) => <span key={symbol} className="flex items-center gap-2"><span className="grid size-5 place-items-center bg-gold text-[8px] font-bold text-ink">{symbol}</span>{label}</span>)}
        <span className="flex items-center gap-2"><span className="grid size-5 place-items-center bg-gold-soft text-[8px] font-bold text-gold-dark">P</span>Protein in progress</span>
      </div>}
    </div>
  );
}

function WeekSignal({ icon: Icon, label, value, complete, partial = false }: { icon: typeof Target; label: string; value: string; complete: boolean; partial?: boolean }) {
  return <span className={`flex min-h-9 items-center gap-2 text-[11px] ${complete ? "text-ink" : partial ? "text-gold-dark" : "text-faint"}`}><Icon size={13} className="shrink-0" /><span className="min-w-0 flex-1 truncate">{label}</span><span className="shrink-0 tabular-nums">{value}</span></span>;
}

function WeekGrid({ range, daysByDate, goal, today, onOpenDay }: { range: { start: string; end: string }; daysByDate: Map<string, CalendarDayProgress>; goal: number; today: string; onOpenDay: (date: string) => void }) {
  return <div className="grid gap-px bg-line sm:grid-cols-7">{datesInRange(range.start, range.end).map((date) => { const day = daysByDate.get(date) ?? emptyCalendarDay(date); const score = completedSignals(day, goal); const future = date > today; return <button type="button" key={date} onClick={() => onOpenDay(date)} disabled={future} aria-label={future ? `${dateFromKey(date).toLocaleDateString("en", { month: "long", day: "numeric" })}: ahead` : calendarDayLabel(day, goal)} className="flex min-h-[230px] flex-col bg-paper p-4 text-left active:scale-[0.99] disabled:cursor-default sm:min-h-[330px]"><span className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{dateFromKey(date).toLocaleDateString("en", { weekday: "short" })}</span><span className={`mt-2 font-display text-3xl ${date === today ? "text-gold-dark" : ""}`}>{dateFromKey(date).getDate()}</span>{future ? <span className="mt-auto text-xs text-faint">Ahead</span> : <><div className="mt-5 h-1.5 bg-canvas"><span className="block h-full bg-gold transition-[width] duration-500" style={{ width: `${score * 25}%` }} /></div><p className="mt-2 text-[10px] font-bold tracking-[0.12em] text-muted uppercase">{score} / 4 complete</p><span className="mt-auto grid divide-y divide-line"><WeekSignal icon={Target} label="Protein" value={`${formatGrams(day.protein)}g`} complete={meetsProteinSuccess(day.protein, goal)} partial={day.protein > 0} /><WeekSignal icon={Dumbbell} label="Workout" value={day.workout ? "Done" : "—"} complete={day.workout} /><WeekSignal icon={Pill} label="Creatine" value={day.creatine ? "Taken" : "—"} complete={day.creatine} /><WeekSignal icon={Scale} label="Measure" value={day.measurement ? "Done" : "—"} complete={day.measurement} /></span></>}</button>; })}</div>;
}

function MonthGrid({ cursor, daysByDate, goal, today, onOpenDay }: { cursor: Date; daysByDate: Map<string, CalendarDayProgress>; goal: number; today: string; onOpenDay: (date: string) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(date.getDate() + index); return localDateKey(date); });
  return <div><div className="grid grid-cols-7 border-b border-line">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="px-1 py-3 text-center text-[9px] font-bold tracking-[0.1em] text-muted uppercase sm:px-2 sm:text-[10px]">{day}</div>)}</div><div className="grid grid-cols-7 gap-px bg-line">{days.map((date) => { const day = daysByDate.get(date) ?? emptyCalendarDay(date); const currentMonth = dateFromKey(date).getMonth() === cursor.getMonth(); const future = date > today; const score = completedSignals(day, goal); return <button type="button" key={date} onClick={() => onOpenDay(date)} disabled={future} aria-label={future ? `${dateFromKey(date).toLocaleDateString("en", { month: "long", day: "numeric" })}: ahead` : calendarDayLabel(day, goal)} className={`flex min-h-20 flex-col bg-paper p-1.5 text-left active:scale-[0.98] disabled:cursor-default sm:min-h-28 sm:p-3 ${currentMonth ? "" : "opacity-40"}`}><span className="flex items-center justify-between gap-1"><span className={`text-xs font-semibold tabular-nums ${date === today ? "text-gold-dark underline underline-offset-4" : ""}`}>{dateFromKey(date).getDate()}</span>{currentMonth && !future && <span className="text-[8px] font-bold tabular-nums text-muted sm:text-[9px]">{score}/4</span>}</span>{currentMonth && <span className="mt-auto"><DaySignalTiles day={day} goal={goal} future={future} /></span>}</button>; })}</div></div>;
}

function YearGrid({ year, daysByDate, goal, today }: { year: number; daysByDate: Map<string, CalendarDayProgress>; goal: number; today: string }) {
  return <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 12 }, (_, month) => { const first = new Date(year, month, 1); const leading = (first.getDay() + 6) % 7; const days = new Date(year, month + 1, 0).getDate(); return <div key={month} className="bg-paper p-4 sm:p-5"><h3 className="font-display text-xl">{first.toLocaleDateString("en", { month: "long" })}</h3><div className="mt-4 grid grid-cols-7 gap-1">{Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => { const date = localDateKey(new Date(year, month, index + 1)); const day = daysByDate.get(date) ?? emptyCalendarDay(date); const future = date > today; const proteinComplete = meetsProteinSuccess(day.protein, goal); return <span key={date} role="img" aria-label={future ? `${date}: ahead` : calendarDayLabel(day, goal)} className="grid aspect-square grid-cols-2 gap-px bg-line p-px"><span className={signalColor(proteinComplete, day.protein > 0 && !proteinComplete, future)} /><span className={signalColor(day.workout, false, future)} /><span className={signalColor(day.creatine, false, future)} /><span className={signalColor(day.measurement, false, future)} /></span>; })}</div></div>; })}</div>;
}
