// Program data for the Summer Lifting Plan.
// Each exercise: name, optional sub-label, set count, rep range
// (repLow–repHigh), and a type — compound ("c") or isolation ("i") — which
// drives rest and the time estimate.

export const SESSIONS = {
  upperA: {
    title: "Upper A",
    lean: "push lean",
    exercises: [
      {
        name: "Bench Press",
        subLabel: "barbell or DB",
        sets: 4,
        repLow: 6,
        repHigh: 10,
        type: "c",
      },
      {
        name: "Incline DB Press",
        subLabel: "",
        sets: 3,
        repLow: 8,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Lat Pulldown",
        subLabel: "or pull-up",
        sets: 4,
        repLow: 8,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Seated Cable Row",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Lateral Raise",
        subLabel: "",
        sets: 4,
        repLow: 12,
        repHigh: 20,
        type: "i",
      },
      {
        name: "Triceps Pushdown",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Cable Curl",
        subLabel: "DB or cable",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
    ],
    appendix: [
      {
        name: "Cable Crunch",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Hanging Leg Raise",
        subLabel: "",
        sets: 3,
        repLow: 8,
        repHigh: 12,
        type: "i",
      },
      {
        name: "Ab Wheel",
        subLabel: "",
        sets: 3,
        repLow: 8,
        repHigh: 12,
        type: "i",
      },
    ],
  },
  lowerA: {
    title: "Lower A",
    lean: "quad lean",
    exercises: [
      {
        name: "Back Squat",
        subLabel: "",
        sets: 4,
        repLow: 6,
        repHigh: 10,
        type: "c",
      },
      {
        name: "Romanian Deadlift",
        subLabel: "",
        sets: 3,
        repLow: 8,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Leg Press",
        subLabel: "or hack squat",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "c",
      },
      {
        name: "Leg Curl",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Standing Calf Raise",
        subLabel: "",
        sets: 4,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Hanging Leg Raise",
        subLabel: "abs",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
    ],
  },
  upperB: {
    title: "Upper B",
    lean: "pull lean",
    exercises: [
      {
        name: "Weighted Pull-up",
        subLabel: "or pulldown",
        sets: 4,
        repLow: 8,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Chest-Supported Row",
        subLabel: "",
        sets: 4,
        repLow: 8,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Overhead Press",
        subLabel: "DB or barbell",
        sets: 4,
        repLow: 6,
        repHigh: 10,
        type: "c",
      },
      {
        name: "Incline Machine Press",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Lateral Raise",
        subLabel: "",
        sets: 4,
        repLow: 12,
        repHigh: 20,
        type: "i",
      },
      {
        name: "Face Pull",
        subLabel: "or rear-delt fly",
        sets: 3,
        repLow: 15,
        repHigh: 20,
        type: "i",
      },
      {
        name: "Hammer Curl",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Overhead Triceps Ext",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
    ],
    appendix: [
      {
        name: "Weighted Decline Sit-up",
        subLabel: "",
        sets: 3,
        repLow: 8,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Pallof Press",
        subLabel: "per side",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Weighted Plank",
        subLabel: "seconds",
        sets: 3,
        repLow: 30,
        repHigh: 60,
        type: "i",
      },
    ],
  },
  lowerB: {
    title: "Lower B",
    lean: "hamstring / glute lean",
    exercises: [
      {
        name: "Trap-bar Deadlift",
        subLabel: "or conventional",
        sets: 3,
        repLow: 5,
        repHigh: 8,
        type: "c",
      },
      {
        name: "Bulgarian Split Squat",
        subLabel: "per leg",
        sets: 3,
        repLow: 8,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Hip Thrust",
        subLabel: "",
        sets: 3,
        repLow: 8,
        repHigh: 12,
        type: "c",
      },
      {
        name: "Leg Extension",
        subLabel: "",
        sets: 3,
        repLow: 12,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Seated Leg Curl",
        subLabel: "",
        sets: 3,
        repLow: 10,
        repHigh: 15,
        type: "i",
      },
      {
        name: "Seated Calf Raise",
        subLabel: "",
        sets: 4,
        repLow: 12,
        repHigh: 20,
        type: "i",
      },
      {
        name: "Abs",
        subLabel: "any movement",
        sets: 3,
        repLow: 12,
        repHigh: 20,
        type: "i",
      },
    ],
  },
};

// Length of the program block, in weeks.
export const PROGRAM_WEEKS = 6;

// Weekly schedule, index 0–6 = Mon–Sun.
export const WEEK = [
  { day: "Mon", session: "upperA" },
  { day: "Tue", session: "lowerA" },
  { day: "Wed", session: "run" },
  { day: "Thu", session: "upperB" },
  { day: "Fri", session: "lowerB" },
  { day: "Sat", session: "run" },
  { day: "Sun", session: "off" },
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
    heading: "Progression",
    body: "Each session, add a rep or a little weight versus last time. Hit the top of a range on every set → add load and drop to the bottom.",
  },
  {
    heading: "Effort",
    body: "Stop 1–3 reps short of failure on the compounds; push closer to failure on isolation work.",
  },
  {
    heading: "Volume",
    body: "Lands around 12–18 sets per muscle per week — the hypertrophy sweet spot. Add load and reps, not endless extra sets.",
  },
  {
    heading: "Rest",
    body: "2–3 min on the big compounds, 60–90 sec on isolation. The timer auto-starts the moment you check a set.",
  },
  {
    heading: "Tempo",
    body: "Control the lowering phase, ~2 sec down. Coming from CrossFit this is the big shift — time under tension beats moving fast.",
  },
  {
    heading: "Coming off CrossFit",
    body: "Your weak points for size are direct arm and side-delt work. Lean into the curls, triceps and lateral raises — that’s the new stimulus.",
  },
  {
    heading: "Running",
    body: "Keep hard runs off the morning before a lower day. If legs feel cooked, cut a set or drop the deadlift to a top single and move on.",
  },
  {
    heading: "Deload",
    body: "Every 5–6 weeks, take one week at about ⅔ the sets to let everything catch up.",
  },
];

// Configurable options (defaults match the prototype).
export const CONFIG = {
  weightUnit: "lb", // "lb" | "kg"
  restCompound: 150, // seconds of rest after a compound set
  restIso: 75, // seconds of rest after an isolation set
  autoTimer: true, // checking a set auto-starts the rest timer
};
