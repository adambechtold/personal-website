# Working in this repository

Guidance for Claude (and any other agents) contributing to this codebase.

## Naming: write names out in full

**Spell identifiers out completely. Do not abbreviate — even when the short
form feels obvious.** Readability when scanning the code matters more than
brevity while typing it.

This applies to variables, function parameters, function names, and the keys of
in-code data structures and object shapes.

| Don't      | Do                           |
| ---------- | ---------------------------- |
| `ex`       | `exercise`                   |
| `sess`     | `session`                    |
| `sid`      | `sessionId`                  |
| `idx`, `i` | `index` (or `exerciseIndex`) |
| `cur`      | `current`                    |
| `prev`     | `previous`                   |
| `nv`       | `newValue` / `newReps`       |
| `arr`      | `sets` (name the contents)   |
| `btn`      | `button`                     |
| `e`        | `event`                      |
| `fn`, `cb` | name the behavior            |
| `pct`      | `percent`                    |
| `cfg`      | `config`                     |
| `tmp`      | name what it holds           |

Guidelines:

- A loop index is `index`. When more than one index is in scope, qualify it:
  `exerciseIndex`, `setIndex`, `dayIndex`.
- Single-letter `map`/`filter`/`forEach` parameters get real names: prefer
  `(exercise) =>` over `(e) =>`, `(set) =>` over `(s) =>`.
- React event handler parameters are `event`, not `e`.
- React setState updater parameters are `previous` / `current`, not `prev` / `t`.
- Name a collection after what it contains (`sets`, `exercises`, `runLogs`),
  not `arr` or `out`.
- "Obvious" is not a reason to shorten. `ex` is always `exercise`.

### The one exception: the persistence boundary

Database column names are part of the stored schema, so they stay as they are —
renaming them would require a migration. In this repo the Postgres columns
`session_type`, `exercise_idx`, `set_idx`, and `day_idx` keep their snake_case
names in:

- `CREATE TABLE` / `SELECT` / `INSERT` SQL,
- the row objects read back from queries (`row.exercise_idx`), and
- the DB-shaped cell descriptors passed into `saveCells` / `normalizeCell`.

Everywhere else — local variables, parameters, and the app's in-memory shapes —
use full words. For example, `normalizeCell` reads `rawCell.exercise_idx` (DB
shape in) but returns `exerciseIndex` (full word out).

## Before you finish

Run these and make sure they pass:

```bash
npm run test:unit       # vitest unit tests
npx eslint . --ext .js  # lint
npx prettier --check .  # formatting (use `npm run format` to fix)
```
