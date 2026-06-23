// Program data for the Summer Lifting Plan.
// Each exercise: name, optional sub-label, set count, rep range (lo–hi),
// and a type — compound ("c") or isolation ("i") — which drives rest and
// the time estimate.

export const SESSIONS = {
  upperA: {
    title: "Upper A",
    lean: "push lean",
    ex: [
      {
        n: "Bench Press",
        sub: "barbell or DB",
        sets: 4,
        lo: 6,
        hi: 10,
        t: "c",
      },
      { n: "Incline DB Press", sub: "", sets: 3, lo: 8, hi: 12, t: "c" },
      { n: "Lat Pulldown", sub: "or pull-up", sets: 4, lo: 8, hi: 12, t: "c" },
      { n: "Seated Cable Row", sub: "", sets: 3, lo: 10, hi: 12, t: "c" },
      { n: "Lateral Raise", sub: "", sets: 4, lo: 12, hi: 20, t: "i" },
      { n: "Triceps Pushdown", sub: "", sets: 3, lo: 10, hi: 15, t: "i" },
      { n: "Cable Curl", sub: "DB or cable", sets: 3, lo: 10, hi: 15, t: "i" },
    ],
    appendix: [
      { n: "Cable Crunch", sub: "", sets: 3, lo: 10, hi: 15, t: "i" },
      { n: "Hanging Leg Raise", sub: "", sets: 3, lo: 8, hi: 12, t: "i" },
      { n: "Ab Wheel", sub: "", sets: 3, lo: 8, hi: 12, t: "i" },
    ],
  },
  lowerA: {
    title: "Lower A",
    lean: "quad lean",
    ex: [
      { n: "Back Squat", sub: "", sets: 4, lo: 6, hi: 10, t: "c" },
      { n: "Romanian Deadlift", sub: "", sets: 3, lo: 8, hi: 12, t: "c" },
      { n: "Leg Press", sub: "or hack squat", sets: 3, lo: 10, hi: 15, t: "c" },
      { n: "Leg Curl", sub: "", sets: 3, lo: 10, hi: 15, t: "i" },
      { n: "Standing Calf Raise", sub: "", sets: 4, lo: 10, hi: 15, t: "i" },
      { n: "Hanging Leg Raise", sub: "abs", sets: 3, lo: 10, hi: 15, t: "i" },
    ],
  },
  upperB: {
    title: "Upper B",
    lean: "pull lean",
    ex: [
      {
        n: "Weighted Pull-up",
        sub: "or pulldown",
        sets: 4,
        lo: 8,
        hi: 12,
        t: "c",
      },
      { n: "Chest-Supported Row", sub: "", sets: 4, lo: 8, hi: 12, t: "c" },
      {
        n: "Overhead Press",
        sub: "DB or barbell",
        sets: 4,
        lo: 6,
        hi: 10,
        t: "c",
      },
      { n: "Incline Machine Press", sub: "", sets: 3, lo: 10, hi: 12, t: "c" },
      { n: "Lateral Raise", sub: "", sets: 4, lo: 12, hi: 20, t: "i" },
      {
        n: "Face Pull",
        sub: "or rear-delt fly",
        sets: 3,
        lo: 15,
        hi: 20,
        t: "i",
      },
      { n: "Hammer Curl", sub: "", sets: 3, lo: 10, hi: 15, t: "i" },
      { n: "Overhead Triceps Ext", sub: "", sets: 3, lo: 10, hi: 15, t: "i" },
    ],
    appendix: [
      { n: "Weighted Decline Sit-up", sub: "", sets: 3, lo: 8, hi: 15, t: "i" },
      { n: "Pallof Press", sub: "per side", sets: 3, lo: 10, hi: 15, t: "i" },
      { n: "Weighted Plank", sub: "seconds", sets: 3, lo: 30, hi: 60, t: "i" },
    ],
  },
  lowerB: {
    title: "Lower B",
    lean: "hamstring / glute lean",
    ex: [
      {
        n: "Trap-bar Deadlift",
        sub: "or conventional",
        sets: 3,
        lo: 5,
        hi: 8,
        t: "c",
      },
      {
        n: "Bulgarian Split Squat",
        sub: "per leg",
        sets: 3,
        lo: 8,
        hi: 12,
        t: "c",
      },
      { n: "Hip Thrust", sub: "", sets: 3, lo: 8, hi: 12, t: "c" },
      { n: "Leg Extension", sub: "", sets: 3, lo: 12, hi: 15, t: "i" },
      { n: "Seated Leg Curl", sub: "", sets: 3, lo: 10, hi: 15, t: "i" },
      { n: "Seated Calf Raise", sub: "", sets: 4, lo: 12, hi: 20, t: "i" },
      { n: "Abs", sub: "any movement", sets: 3, lo: 12, hi: 20, t: "i" },
    ],
  },
};

// Length of the program block, in weeks.
export const PROGRAM_WEEKS = 6;

// Weekly schedule, index 0–6 = Mon–Sun.
export const WEEK = [
  { d: "Mon", s: "upperA" },
  { d: "Tue", s: "lowerA" },
  { d: "Wed", s: "run" },
  { d: "Thu", s: "upperB" },
  { d: "Fri", s: "lowerB" },
  { d: "Sat", s: "run" },
  { d: "Sun", s: "off" },
];

export const ABBR = {
  upperA: "Up A",
  lowerA: "Lo A",
  upperB: "Up B",
  lowerB: "Lo B",
  run: "Run",
  off: "Off",
};

// "How to run it" notes, shown in the notes sheet — copy lifted verbatim.
export const NOTES = [
  {
    h: "Progression",
    t: "Each session, add a rep or a little weight versus last time. Hit the top of a range on every set → add load and drop to the bottom.",
  },
  {
    h: "Effort",
    t: "Stop 1–3 reps short of failure on the compounds; push closer to failure on isolation work.",
  },
  {
    h: "Volume",
    t: "Lands around 12–18 sets per muscle per week — the hypertrophy sweet spot. Add load and reps, not endless extra sets.",
  },
  {
    h: "Rest",
    t: "2–3 min on the big compounds, 60–90 sec on isolation. The timer auto-starts the moment you check a set.",
  },
  {
    h: "Tempo",
    t: "Control the lowering phase, ~2 sec down. Coming from CrossFit this is the big shift — time under tension beats moving fast.",
  },
  {
    h: "Coming off CrossFit",
    t: "Your weak points for size are direct arm and side-delt work. Lean into the curls, triceps and lateral raises — that’s the new stimulus.",
  },
  {
    h: "Running",
    t: "Keep hard runs off the morning before a lower day. If legs feel cooked, cut a set or drop the deadlift to a top single and move on.",
  },
  {
    h: "Deload",
    t: "Every 5–6 weeks, take one week at about ⅔ the sets to let everything catch up.",
  },
];

// Configurable options (defaults match the prototype).
export const CONFIG = {
  weightUnit: "lb", // "lb" | "kg"
  restCompound: 150, // seconds of rest after a compound set
  restIso: 75, // seconds of rest after an isolation set
  autoTimer: true, // checking a set auto-starts the rest timer
};
