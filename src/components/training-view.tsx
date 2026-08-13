"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Dumbbell,
  Layers3,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type DraftSet = { key: number; reps: string; weightKg: string };
type DraftExercise = { key: number; exerciseId: Id<"exercises">; sets: DraftSet[] };
type TrainingMode = "log" | "progress";
type ExercisePerformance = {
  date: string;
  estimatedOneRepMax: number;
  maxWeightKg: number;
  sets: { reps: number; weightKg: number }[];
  totalVolume: number;
};

let draftKey = 0;
const nextKey = () => ++draftKey;

function addDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function workoutVolume(workout: Doc<"workoutSessions">) {
  return workout.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0), 0);
}

function estimatedOneRepMax(reps: number, weightKg: number) {
  return weightKg * (1 + reps / 30);
}

function exerciseHistory(exerciseId: Id<"exercises">, workouts: Doc<"workoutSessions">[]) {
  return workouts.flatMap<ExercisePerformance>((workout) => {
    const exercise = workout.exercises.find((item) => item.exerciseId === exerciseId);
    if (!exercise) return [];
    return [{
      date: workout.date,
      estimatedOneRepMax: Math.max(...exercise.sets.map((set) => estimatedOneRepMax(set.reps, set.weightKg))),
      maxWeightKg: Math.max(...exercise.sets.map((set) => set.weightKg)),
      sets: exercise.sets,
      totalVolume: exercise.sets.reduce((total, set) => total + set.reps * set.weightKg, 0),
    }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function overloadRecommendation(history: ExercisePerformance[]) {
  if (!history.length) return { tone: "neutral" as const, label: "No baseline", title: "Log your first working sets", detail: "Your first session becomes the benchmark for future recommendations.", isPersonalBest: false };
  const latest = history.at(-1)!;
  const previousBest = history.length > 1 ? Math.max(...history.slice(0, -1).map((item) => item.estimatedOneRepMax)) : 0;
  const isPersonalBest = previousBest > 0 && latest.estimatedOneRepMax > previousBest * 1.005;
  const readyToIncrease = latest.sets.length >= 2 && latest.sets.every((set) => set.reps >= 10 && set.weightKg > 0);

  if (readyToIncrease) {
    const nextWeight = latest.maxWeightKg + 2.5;
    return {
      tone: "increase" as const,
      label: "Ready to increase",
      title: `Try ${formatWeight(nextWeight)} kg next session`,
      detail: `You reached at least 10 reps on every set at up to ${formatWeight(latest.maxWeightKg)} kg. Add 2.5 kg and return to 8 reps with clean form.`,
      isPersonalBest,
    };
  }

  const repsRemaining = latest.sets.reduce((total, set) => total + Math.max(0, 10 - set.reps), 0);
  return {
    tone: "build" as const,
    label: history.length === 1 ? "Baseline set" : "Build reps",
    title: repsRemaining ? `Earn ${repsRemaining} more total ${repsRemaining === 1 ? "rep" : "reps"}` : "Repeat the load with cleaner sets",
    detail: `Keep the load at or below ${formatWeight(latest.maxWeightKg)} kg. Increase only after every working set reaches 10 reps with stable technique.`,
    isPersonalBest,
  };
}

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function TrainingView({ today }: { today: string }) {
  const overview = useQuery(api.workouts.getOverview, { startDate: addDays(today, -364), endDate: today });
  const ensureStarterPlan = useMutation(api.workouts.ensureStarterPlan);
  const saveWorkout = useMutation(api.workouts.saveWorkout);
  const removeWorkout = useMutation(api.workouts.removeWorkout);
  const addExercise = useMutation(api.workouts.addExercise);
  const exercises = useMemo(() => overview?.exercises ?? [], [overview?.exercises]);
  const workouts = overview?.workouts ?? [];
  const categories = useMemo(() => Array.from(new Set(exercises.map((exercise) => exercise.category))), [exercises]);

  const [category, setCategory] = useState("Back");
  const [title, setTitle] = useState("Back workout");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<TrainingMode>("log");
  const starterPlanEnsured = useRef(false);
  const activeCategory = categories.includes(category) ? category : categories[0] ?? category;

  useEffect(() => {
    if (!overview || starterPlanEnsured.current) return;
    starterPlanEnsured.current = true;
    void ensureStarterPlan();
  }, [ensureStarterPlan, overview]);

  const exerciseById = new Map(exercises.map((exercise) => [String(exercise._id), exercise]));
  const recentWorkouts = workouts.filter((workout) => workout.date >= addDays(today, -89));
  const lastWorkout = workouts[0];
  const totalSets = recentWorkouts.reduce((sum, workout) => sum + workout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0), 0);

  function changeCategory(next: string) {
    setCategory(next);
    setTitle(`${next} workout`);
    setPickerOpen(false);
  }

  function handleModeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextMode: TrainingMode = mode === "log" ? "progress" : "log";
    setMode(nextMode);
    requestAnimationFrame(() => document.getElementById(`training-${nextMode}-tab`)?.focus());
  }

  function addToWorkout(exercise: Doc<"exercises">) {
    if (draft.some((item) => item.exerciseId === exercise._id)) return;
    const previous = findPreviousSets(workouts, exercise._id);
    setDraft((current) => [...current, {
      key: nextKey(),
      exerciseId: exercise._id,
      sets: previous.length
        ? previous.map((set) => ({ key: nextKey(), reps: String(set.reps), weightKg: String(set.weightKg) }))
        : [{ key: nextKey(), reps: "8", weightKg: "10" }],
    }]);
    setPickerOpen(false);
    setSaved(false);
  }

  function addSet(exerciseKey: number) {
    setDraft((current) => current.map((item) => {
      if (item.key !== exerciseKey) return item;
      const previous = item.sets.at(-1) ?? { reps: "8", weightKg: "10" };
      return { ...item, sets: [...item.sets, { key: nextKey(), reps: previous.reps, weightKg: previous.weightKg }] };
    }));
  }

  function updateSet(exerciseKey: number, setKey: number, field: "reps" | "weightKg", value: string) {
    setDraft((current) => current.map((item) => item.key === exerciseKey
      ? { ...item, sets: item.sets.map((set) => set.key === setKey ? { ...set, [field]: value } : set) }
      : item));
    setSaved(false);
  }

  function removeSet(exerciseKey: number, setKey: number) {
    setDraft((current) => current.map((item) => item.key === exerciseKey ? { ...item, sets: item.sets.filter((set) => set.key !== setKey) } : item));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.length) { setError("Add at least one exercise to this workout."); return; }
    const payload = draft.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets.map((set) => ({ reps: Number(set.reps), weightKg: Number(set.weightKg) })),
    }));
    if (payload.some((item) => !item.sets.length || item.sets.some((set) => !Number.isInteger(set.reps) || set.reps < 1 || !Number.isFinite(set.weightKg) || set.weightKg < 0))) {
      setError("Every exercise needs at least one complete set with valid reps and weight.");
      return;
    }
    setSubmitting(true); setError(""); setSaved(false);
    try {
      await saveWorkout({ date, title, category: activeCategory, exercises: payload, ...(note.trim() ? { note: note.trim() } : {}) });
      setDraft([]); setNote(""); setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this workout.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-10 xl:px-12">
      <header className="reveal flex flex-col justify-between gap-6 border-b border-line pb-7 md:flex-row md:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Progressive overload</p>
          <h1 className="mt-2 font-display text-[2.75rem] leading-none tracking-[-0.04em] sm:text-[3.5rem]">{mode === "log" ? "Build the session." : "Read the evidence."}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{mode === "log" ? "One workout, many exercises. Record the honest reps and weight of every set—then return next time with a number to beat." : "Follow every movement across the year. See what improved, what stalled, and the exact load to chase next."}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted"><Layers3 size={17} className="text-gold-dark" /> Exercise-by-exercise · Set-by-set</div>
      </header>

      <div className="reveal reveal-late flex border-b border-line" role="tablist" aria-label="Training views">
        <button type="button" role="tab" aria-selected={mode === "log"} aria-controls="training-log-panel" id="training-log-tab" tabIndex={mode === "log" ? 0 : -1} onKeyDown={handleModeKeyDown} onClick={() => setMode("log")} className={`training-tab relative min-h-14 px-4 text-xs font-bold transition-colors duration-150 sm:px-6 ${mode === "log" ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-gold-dark" : "text-muted"}`}>Log workout</button>
        <button type="button" role="tab" aria-selected={mode === "progress"} aria-controls="training-progress-panel" id="training-progress-tab" tabIndex={mode === "progress" ? 0 : -1} onKeyDown={handleModeKeyDown} onClick={() => setMode("progress")} className={`training-tab relative min-h-14 px-4 text-xs font-bold transition-colors duration-150 sm:px-6 ${mode === "progress" ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-gold-dark" : "text-muted"}`}>Exercise progress</button>
      </div>

      {mode === "log" ? <div role="tabpanel" id="training-log-panel" aria-labelledby="training-log-tab">
      <section aria-label="Training summary" className="reveal reveal-late grid border-b border-line sm:grid-cols-3">
        <TrainingMetric label="Workouts · 90 days" value={String(recentWorkouts.length)} meta="Complete sessions recorded" />
        <TrainingMetric label="Working sets" value={String(totalSets)} meta="Every set counts" bordered />
        <TrainingMetric label="Last workload" value={lastWorkout ? `${Math.round(workoutVolume(lastWorkout)).toLocaleString()} kg` : "—"} meta={lastWorkout ? lastWorkout.title : "Record the first session"} bordered />
      </section>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <form onSubmit={handleSave} className="border border-line bg-paper paper-shadow">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Open workout</p><h2 className="mt-1 font-display text-3xl">Today’s ledger</h2></div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted"><CalendarDays size={15} /><span className="sr-only">Workout date</span><input type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} className="h-11 border border-line bg-canvas px-3 text-ink" /></label>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <label className="text-xs font-semibold">Workout type<select value={activeCategory} onChange={(event) => changeCategory(event.target.value)} className="mt-1.5 h-12 w-full border border-line bg-canvas px-3">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-xs font-semibold">Workout name<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-12 w-full border border-line bg-canvas px-3" /></label>
            </div>
          </div>

          <div className="p-4 sm:p-7">
            {draft.length === 0 ? (
              <div className="grid min-h-56 place-content-center border border-dashed border-line bg-canvas px-6 text-center">
                <Dumbbell size={27} className="mx-auto text-gold-dark" />
                <p className="mt-3 font-display text-2xl">Add the first exercise.</p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">A workout can contain as many exercises as you need, and every exercise can have its own set structure.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {draft.map((item, exerciseIndex) => {
                  const exercise = exerciseById.get(String(item.exerciseId));
                  if (!exercise) return null;
                  const previous = findPreviousSets(workouts, exercise._id);
                  return (
                    <section key={item.key} className="border border-line bg-canvas">
                      <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3 sm:px-5">
                        <span className="grid size-8 place-items-center bg-ink text-xs font-bold text-paper">{String(exerciseIndex + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{exercise.name}</h3><p className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">{exercise.category} · {item.sets.length} {item.sets.length === 1 ? "set" : "sets"}</p></div>
                        <button type="button" onClick={() => setDraft((current) => current.filter((row) => row.key !== item.key))} aria-label={`Remove ${exercise.name} from workout`} className="grid size-11 place-items-center text-faint hover:text-error"><X size={16} /></button>
                      </div>
                      <div className="px-3 py-3 sm:px-5">
                        <div className="grid grid-cols-[40px_minmax(78px,1fr)_minmax(92px,1fr)_44px] gap-2 px-1 pb-2 text-[9px] font-bold tracking-[0.13em] text-muted uppercase sm:grid-cols-[52px_1fr_1fr_1fr_44px]">
                          <span>Set</span><span>Reps</span><span>Weight</span><span className="hidden sm:block">Previous</span><span />
                        </div>
                        <div className="grid gap-2">
                          {item.sets.map((set, setIndex) => {
                            const prior = previous[setIndex];
                            return <div key={set.key} className="grid grid-cols-[40px_minmax(78px,1fr)_minmax(92px,1fr)_44px] items-center gap-2 sm:grid-cols-[52px_1fr_1fr_1fr_44px]"><span className="text-center font-display text-xl tabular-nums text-muted">{setIndex + 1}</span><label><span className="sr-only">Set {setIndex + 1} reps</span><input required inputMode="numeric" type="number" min="1" step="1" value={set.reps} onChange={(event) => updateSet(item.key, set.key, "reps", event.target.value)} className="h-12 w-full border border-line bg-paper px-3 text-center font-semibold tabular-nums" /></label><label className="relative"><span className="sr-only">Set {setIndex + 1} weight in kilograms</span><input required inputMode="decimal" type="number" min="0" step="0.5" value={set.weightKg} onChange={(event) => updateSet(item.key, set.key, "weightKg", event.target.value)} className="h-12 w-full border border-line bg-paper px-3 pr-8 text-center font-semibold tabular-nums" /><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-faint">kg</span></label><span className="hidden text-center text-xs tabular-nums text-muted sm:block">{prior ? `${prior.reps} × ${prior.weightKg}` : "—"}</span><button type="button" disabled={item.sets.length === 1} onClick={() => removeSet(item.key, set.key)} aria-label={`Remove set ${setIndex + 1}`} className="grid size-11 place-items-center text-faint hover:text-error disabled:opacity-25"><Trash2 size={14} /></button></div>;
                          })}
                        </div>
                        <button type="button" onClick={() => addSet(item.key)} className="mt-3 flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-gold-dark"><Plus size={15} /> Add another set</button>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            <div className="relative mt-4">
              <button type="button" onClick={() => setPickerOpen((open) => !open)} className="flex min-h-12 w-full items-center justify-center gap-2 border border-ink bg-paper px-4 text-sm font-bold text-ink"><Plus size={16} /> Add exercise <ChevronDown size={15} /></button>
              {pickerOpen && <ExercisePicker exercises={exercises} selected={draft.map((item) => item.exerciseId)} category={activeCategory} onChoose={addToWorkout} onCreate={() => { setPickerOpen(false); setExerciseDialogOpen(true); }} />}
            </div>

            <label className="mt-5 block text-xs font-semibold">Workout note <span className="font-normal text-faint">optional</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Energy, form, recovery…" className="mt-1.5 h-12 w-full border border-line bg-canvas px-3 placeholder:text-faint" /></label>
            {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
            <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"><button disabled={submitting} className="flex min-h-12 flex-1 items-center justify-center gap-2 bg-gold px-5 text-sm font-bold text-ink active:scale-[0.98] disabled:bg-faint"><Check size={16} />{submitting ? "Saving workout…" : "Finish and save workout"}</button>{saved && <p role="status" className="flex items-center justify-center gap-2 text-sm font-semibold text-success"><Check size={15} /> Workout saved</p>}</div>
          </div>
        </form>

        <aside className="border border-line bg-ink text-paper paper-shadow">
          <div className="border-b border-paper/10 p-5 sm:p-6"><p className="text-[10px] font-bold tracking-[0.16em] text-gold uppercase">Recent sessions</p><h2 className="mt-1 font-display text-3xl">The work done.</h2></div>
          {overview === undefined ? <div className="m-5 h-40 animate-pulse bg-paper/5" /> : workouts.length === 0 ? <div className="grid min-h-72 place-content-center p-6 text-center"><Target size={24} className="mx-auto text-gold" /><p className="mt-3 font-display text-2xl">No workouts yet.</p><p className="mt-2 text-sm leading-6 text-paper/50">Your completed sessions will build the progression trail.</p></div> : <ul className="divide-y divide-paper/10">{workouts.slice(0, 8).map((workout) => { const setCount = workout.exercises.reduce((sum, item) => sum + item.sets.length, 0); return <li key={workout._id} className="p-5 sm:p-6"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold tracking-[0.13em] text-gold uppercase">{workout.category} · {formatDate(workout.date)}</p><h3 className="mt-1 truncate font-display text-xl">{workout.title}</h3><p className="mt-2 text-xs text-paper/50">{workout.exercises.length} exercises · {setCount} sets · {Math.round(workoutVolume(workout)).toLocaleString()} kg volume</p></div><button type="button" onClick={() => removeWorkout({ id: workout._id })} aria-label={`Remove ${workout.title}`} className="grid size-11 place-items-center text-paper/35 hover:text-paper"><Trash2 size={14} /></button></div><div className="mt-4 grid gap-2">{workout.exercises.map((item) => { const exercise = exerciseById.get(String(item.exerciseId)); return <div key={item.exerciseId} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 truncate text-paper/70">{exercise?.name ?? "Exercise"}</span><span className="shrink-0 tabular-nums text-paper/45">{item.sets.map((set) => `${set.reps}×${set.weightKg}`).join(" · ")}</span></div>; })}</div></li>; })}</ul>}
        </aside>
      </div>

      <section className="mt-5 border border-line bg-paper p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">The overload rule</p><h2 className="mt-1 font-display text-3xl">Beat one honest number.</h2></div><TrendingUp className="text-gold-dark" size={22} /></div>
        <div className="mt-6 grid gap-px bg-line md:grid-cols-3"><OverloadRule number="01" title="Match the weight" body="Use the previous session shown beside each set." /><OverloadRule number="02" title="Add a rep" body="When form stays clean, beat one set by one rep." /><OverloadRule number="03" title="Then add weight" body="Once every set reaches the rep target, raise the load." /></div>
      </section>
      </div> : <ExerciseProgressView exercises={exercises} workouts={workouts} loading={overview === undefined} />}

      {exerciseDialogOpen && <AddExerciseDialog categories={categories} initialCategory={activeCategory} onClose={() => setExerciseDialogOpen(false)} onAdd={async (values) => { const id = await addExercise(values); setCategory(values.category); setDraft((current) => [...current, { key: nextKey(), exerciseId: id, sets: [{ key: nextKey(), reps: "8", weightKg: "10" }] }]); setExerciseDialogOpen(false); }} />}
    </div>
  );
}

function findPreviousSets(workouts: Doc<"workoutSessions">[], exerciseId: Id<"exercises">) {
  for (const workout of workouts) {
    const match = workout.exercises.find((item) => item.exerciseId === exerciseId);
    if (match) return match.sets;
  }
  return [];
}

function ExerciseProgressView({ exercises, workouts, loading }: { exercises: Doc<"exercises">[]; workouts: Doc<"workoutSessions">[]; loading: boolean }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<Id<"exercises">>();
  const progress = useMemo(() => exercises.map((exercise) => {
    const history = exerciseHistory(exercise._id, workouts);
    return { exercise, history, recommendation: overloadRecommendation(history) };
  }), [exercises, workouts]);
  const trained = progress.filter((item) => item.history.length > 0);
  const selected = progress.find((item) => item.exercise._id === selectedExerciseId) ?? trained[0] ?? progress[0];
  const readyCount = progress.filter((item) => item.recommendation.tone === "increase").length;
  const personalBestCount = progress.filter((item) => item.recommendation.isPersonalBest).length;

  if (loading) return <div role="tabpanel" id="training-progress-panel" aria-labelledby="training-progress-tab" className="grid gap-5 py-7"><div className="h-32 animate-pulse bg-paper" /><div className="h-96 animate-pulse bg-paper" /></div>;

  return (
    <div role="tabpanel" id="training-progress-panel" aria-labelledby="training-progress-tab" className="py-7">
      <section aria-label="Progress summary" className="grid border-y border-line sm:grid-cols-3">
        <TrainingMetric label="Exercises tracked" value={String(trained.length)} meta={`Of ${exercises.length} in your library`} />
        <TrainingMetric label="Ready to increase" value={String(readyCount)} meta="All working sets reached 10 reps" bordered />
        <TrainingMetric label="New strength bests" value={String(personalBestCount)} meta="Latest session beat your prior estimate" bordered />
      </section>

      {exercises.length === 0 ? (
        <div className="mt-7 grid min-h-80 place-content-center border border-dashed border-line bg-paper px-6 text-center">
          <BarChart3 size={28} className="mx-auto text-gold-dark" />
          <h2 className="mt-4 font-display text-3xl">Your progression starts with one exercise.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Return to Log workout, create an exercise, and save its first working sets to establish a baseline.</p>
        </div>
      ) : (
        <div className="mt-7 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="self-start border border-line bg-paper paper-shadow lg:sticky lg:top-5">
            <div className="border-b border-line p-5">
              <p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Exercise library</p>
              <h2 className="mt-1 font-display text-2xl">Choose a movement.</h2>
            </div>
            <label className="block p-4 text-xs font-semibold lg:hidden">Exercise
              <select value={selected?.exercise._id ?? ""} onChange={(event) => setSelectedExerciseId(event.target.value as Id<"exercises">)} className="mt-1.5 h-12 w-full border border-line bg-canvas px-3">
                {progress.map((item) => <option key={item.exercise._id} value={item.exercise._id}>{item.exercise.name}</option>)}
              </select>
            </label>
            <div className="hidden divide-y divide-line lg:block">
              {progress.map((item) => {
                const active = item.exercise._id === selected?.exercise._id;
                const latest = item.history.at(-1);
                return <button type="button" key={item.exercise._id} aria-pressed={active} onClick={() => setSelectedExerciseId(item.exercise._id)} className={`exercise-progress-row flex min-h-[72px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 active:scale-[0.99] ${active ? "bg-ink text-paper" : ""}`}><span className={`grid size-9 shrink-0 place-items-center text-[10px] font-bold ${active ? "bg-gold text-ink" : "bg-canvas text-gold-dark"}`}>{item.exercise.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.exercise.name}</span><span className={`mt-1 block text-[10px] font-semibold tracking-[0.1em] uppercase ${active ? "text-paper/50" : "text-faint"}`}>{latest ? `${formatWeight(latest.maxWeightKg)} kg · ${item.history.length} ${item.history.length === 1 ? "session" : "sessions"}` : "No sessions yet"}</span></span>{item.recommendation.tone === "increase" && <ArrowUpRight size={15} className="shrink-0 text-gold" aria-label="Ready to increase" />}</button>;
              })}
            </div>
          </aside>

          {selected && <ExerciseProgressDetail exercise={selected.exercise} history={selected.history} recommendation={selected.recommendation} />}
        </div>
      )}
    </div>
  );
}

function ExerciseProgressDetail({ exercise, history, recommendation }: { exercise: Doc<"exercises">; history: ExercisePerformance[]; recommendation: ReturnType<typeof overloadRecommendation> }) {
  const latest = history.at(-1);
  const bestSet = latest?.sets.reduce((best, set) => estimatedOneRepMax(set.reps, set.weightKg) > estimatedOneRepMax(best.reps, best.weightKg) ? set : best);
  const chartTitle = history.length === 1 ? "Your first session." : `Your last ${Math.min(8, history.length)} sessions.`;

  return (
    <main className="min-w-0">
      <header className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">{exercise.category} · Progress file</p><h2 className="mt-1 font-display text-4xl tracking-[-0.03em] sm:text-5xl">{exercise.name}</h2></div>
        <p className="text-xs font-semibold text-muted">{latest ? `Last trained ${formatDate(latest.date)}` : "Waiting for a first session"}</p>
      </header>

      <section aria-label="Overload recommendation" className="mt-5 bg-ink p-5 text-paper paper-shadow sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center bg-gold text-ink"><TrendingUp size={19} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold tracking-[0.16em] text-gold uppercase">Coach’s call · {recommendation.label}</p>{recommendation.isPersonalBest && <span className="bg-paper/10 px-2 py-1 text-[9px] font-bold tracking-[0.12em] text-paper uppercase">New strength best</span>}</div>
            <h3 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{recommendation.title}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/60">{recommendation.detail}</p>
          </div>
        </div>
      </section>

      {latest ? <>
        <section aria-label="Latest performance" className="mt-5 grid gap-px bg-line sm:grid-cols-4">
          <ProgressMetric label="Top load" value={`${formatWeight(latest.maxWeightKg)} kg`} detail="Latest session" />
          <ProgressMetric label="Best set" value={bestSet ? `${bestSet.reps} × ${formatWeight(bestSet.weightKg)}` : "—"} detail="Reps × kilograms" />
          <ProgressMetric label="Est. strength" value={`${formatWeight(latest.estimatedOneRepMax)} kg`} detail="Epley one-rep estimate" />
          <ProgressMetric label="Session volume" value={`${Math.round(latest.totalVolume).toLocaleString()} kg`} detail="Sets × reps × load" />
        </section>

        <section className="mt-5 border border-line bg-paper p-5 paper-shadow sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Load trajectory</p><h3 className="mt-1 font-display text-3xl">{chartTitle}</h3></div><p className="max-w-sm text-xs leading-5 text-muted">The line follows your heaviest working weight. Strength estimates account for both load and reps.</p></div>
          <ExerciseTrendChart history={history} exerciseName={exercise.name} />
        </section>

        <section className="mt-5 border border-line bg-paper paper-shadow">
          <div className="border-b border-line p-5 sm:px-7"><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Session history</p><h3 className="mt-1 font-display text-3xl">The evidence.</h3></div>
          <div className="divide-y divide-line">
            {history.slice(-6).reverse().map((session, index) => <div key={`${session.date}-${index}`} className="grid gap-3 p-5 sm:grid-cols-[130px_minmax(0,1fr)_110px] sm:items-center sm:px-7"><div><p className="text-xs font-bold">{formatDate(session.date)}</p><p className="mt-1 text-[10px] tabular-nums text-faint">{Math.round(session.totalVolume).toLocaleString()} kg volume</p></div><div className="flex flex-wrap gap-2">{session.sets.map((set, setIndex) => <span key={setIndex} className="bg-canvas px-2.5 py-1.5 text-xs font-semibold tabular-nums">{set.reps} × {formatWeight(set.weightKg)} kg</span>)}</div><p className="text-left text-xs tabular-nums text-muted sm:text-right">Est. {formatWeight(session.estimatedOneRepMax)} kg</p></div>)}
          </div>
        </section>
      </> : <div className="mt-5 grid min-h-72 place-content-center border border-dashed border-line bg-paper px-6 text-center"><Target size={25} className="mx-auto text-gold-dark" /><h3 className="mt-3 font-display text-3xl">No sets recorded yet.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Add {exercise.name} to a workout and save at least two working sets. Achilles will use them to set your first progression target.</p></div>}
    </main>
  );
}

function ExerciseTrendChart({ history, exerciseName }: { history: ExercisePerformance[]; exerciseName: string }) {
  const sessions = history.slice(-8);
  const width = 720;
  const height = 220;
  const inset = 18;
  const weights = sessions.map((session) => session.maxWeightKg);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const padding = Math.max(2.5, (rawMax - rawMin) * 0.2);
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const points = sessions.map((session, index) => {
    const x = sessions.length === 1 ? width / 2 : inset + index * ((width - inset * 2) / (sessions.length - 1));
    const y = inset + ((max - session.maxWeightKg) / (max - min || 1)) * (height - inset * 2);
    return { x, y, session };
  });

  return <div className="mt-6"><div className="h-52 w-full overflow-hidden bg-canvas p-3 sm:h-64 sm:p-5"><svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={`${exerciseName} maximum working weight over the last ${sessions.length} sessions`} preserveAspectRatio="none">{[0.25, 0.5, 0.75].map((position) => <line key={position} x1={inset} x2={width - inset} y1={height * position} y2={height * position} stroke="currentColor" className="text-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}{points.length > 1 && <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" className="text-gold-dark" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}{points.map((point, index) => <circle key={`${point.session.date}-${index}`} cx={point.x} cy={point.y} r="6" fill="currentColor" className={index === points.length - 1 ? "text-gold" : "text-ink"} stroke="var(--canvas)" strokeWidth="3" vectorEffect="non-scaling-stroke" />)}</svg></div><div className="mt-3 flex items-start justify-between gap-4 text-[10px] font-semibold tracking-[0.08em] text-muted uppercase"><span>{formatDate(sessions[0].date)} · {formatWeight(sessions[0].maxWeightKg)} kg</span><span className="text-right">{formatDate(sessions.at(-1)!.date)} · {formatWeight(sessions.at(-1)!.maxWeightKg)} kg</span></div></div>;
}

function ProgressMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="bg-paper p-5 sm:p-6"><p className="text-[9px] font-bold tracking-[0.14em] text-muted uppercase">{label}</p><p className="mt-2 font-display text-2xl tabular-nums">{value}</p><p className="mt-1 text-[10px] text-faint">{detail}</p></div>;
}

function TrainingMetric({ label, value, meta, bordered = false }: { label: string; value: string; meta: string; bordered?: boolean }) {
  return <div className={`border-b border-line py-5 sm:border-b-0 ${bordered ? "sm:border-l sm:pl-6" : "sm:pr-6"}`}><p className="text-[10px] font-bold tracking-[0.15em] text-muted uppercase">{label}</p><p className="mt-1 font-display text-3xl tabular-nums">{value}</p><p className="mt-1 text-[11px] text-faint">{meta}</p></div>;
}

function ExercisePicker({ exercises, selected, category, onChoose, onCreate }: { exercises: Doc<"exercises">[]; selected: Id<"exercises">[]; category: string; onChoose: (exercise: Doc<"exercises">) => void; onCreate: () => void }) {
  const ordered = [...exercises].sort((a, b) => Number(b.category === category) - Number(a.category === category));
  return <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-y-auto border border-line bg-paper p-2 paper-shadow"><p className="px-3 py-2 text-[9px] font-bold tracking-[0.14em] text-faint uppercase">Choose from your library</p>{ordered.map((exercise) => { const added = selected.includes(exercise._id); return <button type="button" key={exercise._id} disabled={added} onClick={() => onChoose(exercise)} className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-canvas disabled:opacity-35"><Dumbbell size={14} className="text-gold-dark" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{exercise.name}</span><span className="text-[10px] font-bold tracking-[0.1em] text-faint uppercase">{added ? "Added" : exercise.category}</span></button>; })}<button type="button" onClick={onCreate} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 border-t border-line text-xs font-bold text-gold-dark"><Plus size={14} /> Create new exercise</button></div>;
}

function OverloadRule({ number, title, body }: { number: string; title: string; body: string }) {
  return <div className="bg-canvas p-5"><span className="font-display text-2xl text-gold-dark">{number}</span><h3 className="mt-3 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{body}</p></div>;
}

function AddExerciseDialog({ categories, initialCategory, onClose, onAdd }: { categories: string[]; initialCategory: string; onClose: () => void; onAdd: (values: { name: string; category: string }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!name.trim() || !category.trim()) { setError("Add an exercise name and workout type."); return; } setSubmitting(true); try { await onAdd({ name: name.trim(), category: category.trim() }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not add exercise."); setSubmitting(false); } }
  return <div className="fixed inset-0 z-50 grid place-items-end bg-ink/55 backdrop-blur-[2px] sm:place-items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="add-exercise-title" className="w-full max-w-lg bg-paper p-5 paper-shadow sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.16em] text-gold-dark uppercase">Exercise library</p><h2 id="add-exercise-title" className="mt-1 font-display text-3xl">Create an exercise</h2></div><button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center text-muted"><X size={18} /></button></div><form onSubmit={submit} className="mt-6 grid gap-4"><label className="text-xs font-semibold">Exercise name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Dumbbell row" className="mt-1.5 h-12 w-full border border-line bg-canvas px-3 placeholder:text-faint" /></label><label className="text-xs font-semibold">Workout type<input list="training-groups" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-12 w-full border border-line bg-canvas px-3" /><datalist id="training-groups">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>{error && <p role="alert" className="text-sm text-error">{error}</p>}<button disabled={submitting} className="mt-2 min-h-12 bg-ink px-5 text-sm font-bold text-paper disabled:bg-muted">{submitting ? "Adding…" : "Create and add"}</button></form></div></div>;
}
