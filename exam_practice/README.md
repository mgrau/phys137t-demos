# PHYS 137T exam practice

A static, single-page practice app for the first five weeks of PHYS 137T.
It starts with a shuffled question bank and lets students choose a week or a
particular question. Choice order is also shuffled. Nothing is graded until **Check answer** is pressed.
After three distinct incorrect answers, **Show solution** becomes available;
students move through the solution one step at a time. The threshold is adjustable
from 1–10. Correct answers also unlock the explanation. Incomplete entries and
rechecking an unchanged answer do not consume attempts.

The 35 initial questions cover all five weeks, seven per week:

| Week | Coverage |
| --- | --- |
| 1 | Bits, classical gates, reversibility, truth tables |
| 2 | Qubit operations, signed clouds, H, tensor products |
| 3 | Amplitudes, probabilities, full and partial measurement |
| 4 | Conditional states, interference, oracle promises and queries |
| 5 | Separability, entangling circuits, Bell statistics and reasoning |

Questions adapt prior midterm/homework problem types and the current course's
PS1–PS5 and public sample midterm. Each records its source. Current scheduled
exam drafts were not used. Older conceptual errors are corrected against the
2026 notes, notably the promise needed for Deutsch–Jozsa.

## Run and publish

```sh
cd exam_practice
npm ci
npm run dev             # http://127.0.0.1:5177/
npm run check
npm test                # bank validation, physics, grading and retry rules
npx playwright install chromium
npm run test:browser    # interaction, responsive layout and iframe tests
npm run build
```

The repository's root build, hub registry and Pages deployment include this
app. A push to `main` runs the checks and publishes `/exam_practice/`.
`misty-states` is pinned to `23f4e5316c01f338675d4e81162d53e3618cbd7d`,
the latest upstream `main` when this app was built on 2026-09-29. Pinning the
revision makes a release reproducible. Update the dependency intentionally and
rerun both test suites when adopting a newer library.

## Canvas

Paste the contents of [canvas-embed.html](canvas-embed.html) into the HTML editor
of a Canvas **Page**, save, and check Student View. It embeds the public HTTPS
app, with an ordinary link to open it separately. Canvas permits iframe embeds;
see the [Canvas HTML allowlist](https://community.instructure.com/en/kb/articles/387066-canvas-html-editor-allowlist)
and [external embed instructions](https://community.instructure.com/t5/Canvas-Basics-Guide/How-do-I-embed-media-from-an-external-source-in-the-Rich-Content/ta-p/618217).

The app fits its iframe without inner scrolling. On narrow screens it offers
Question / Your answer tabs. Longer solutions are paginated, and state and
truth-table editors paginate rows. A 700px iframe is a comfortable default;
the surrounding Canvas page still controls its own height and scrolling.

Optional URL parameters:

| Parameter | Example | Behavior |
| --- | --- | --- |
| `week` | `?week=3` | Restrict the deck to one week |
| `q` | `?q=bell-prepare` | Start with a particular question |
| `attempts` | `?attempts=5` | Offer solutions after five incorrect attempts |

Combine parameters with `&` in a URL, or `&amp;` in HTML.

This is ungraded practice: there is no login, analytics, remote storage or
Canvas gradebook integration. Solved questions and attempt counts are saved
locally when browser storage is available. If an embedded browser blocks
storage, the app still works and keeps progress for that session. Solutions
are bundled in the client; the retry threshold is a learning aid, not secure
access control. Work solved after viewing a solution is counted separately.

## Author a question

Add a `.md` file anywhere under `questions/`. The bank discovers files
automatically at build time; no JavaScript registry needs editing. Use the
existing files as templates. Every file has YAML metadata, a Markdown prompt,
and a `## Solution` section with at least two `###` steps. Use `misty` fenced
blocks for diagrams in a solution. The app appends a calculated final-answer
step, so state and probability keys need not be duplicated in prose.

```md
---
id: my-probability-question
title: Measure the circle
week: 3
kind: probability
source: Adapted from PS3, problem 2.
circuit: "in 0|0|-1"
events:
  - {label: White, pattern: "0"}
  - {label: Black, pattern: "1"}
---

Measure the circle directly. What is the probability of each color?

## Solution

### Combine matching terms

The amplitudes are 2 for white and −1 for black.

### Square and normalize

The weights are 4 and 1. Divide each by the total weight, 5.
```

Quote bit patterns (`"00"`, `"?1"`), and quote text containing a colon followed
by a space. YAML `|` introduces a multiline circuit. Use distinct lowercase
IDs with hyphens. Validation rejects unknown fields, duplicate IDs, malformed
questions, impossible conditions and incorrect example preparation circuits.
Run `npm test` before publishing; authored solution prose still needs an
instructor's review.

Common fields: `id`, `title`, `week` (1–5), `kind`, `source`. Optional fields
include `qubits` (1–3, default 1), `shapes` (default `o`, `os`, or `os^`), and
`diagram` (Misty source to display instead of the circuit). Shape symbols are
`o` circle, `s` square, `^` triangle, `d` diamond.

### Answer formats

| Kind | Additional metadata | Grading |
| --- | --- | --- |
| `choice` | `options: ["…", "…"]`, `answer: [1]` | Exact set of selected option numbers; multiple numbers enable select-all |
| `number` | `fields: [{label: "Bits", value: 3}]` | Numbers/fractions, tolerance 10⁻⁹ |
| `probability` | `circuit`, `events: [{label: "Black square", pattern: "?1"}]` | Library-computed probabilities, tolerance 0.5 percentage point |
| `state` | `circuit`, optional `given: "?1"` | Library state equivalence; complete register required |
| `truth-table` | `qubits`, `circuit` containing classical reversible gates | Simulates every definite input, compares each output |
| `circuit` | `input`, `target`, `gates`, `example`, optional `maxGates` | Simulates the student's circuit on the fixed input and checks target equivalence |

When the requested probability events are disjoint and cover all possible
results, their entered probabilities must also total 1 within 0.5 percentage
point. This permits rounding without accepting an inconsistent distribution.

In a probability event or measurement condition, `?` means either color at that
wire. A `given` condition measures just the specified wires after the circuit
and retains that branch. A state answer includes **all** qubits, including the
measured ones. Probability questions with `given` ask for probabilities
conditional on that result. Keep explicit measurement gates out of `circuit`;
the engine applies them using the library when evaluating events/conditions.

The supported preparation palette is H, X (displayed as NOT), CNOT, SWAP and
TOFFOLI. The input is fixed. Equivalent circuits, reordered or factored states,
common scale and global sign are accepted. Relative signs are significant.
State construction is available through shape buttons or typed Misty notation;
circuit construction uses Misty's drag layer plus keyboard-accessible controls.

Circuit example metadata:

```yaml
kind: circuit
qubits: 2
input: "00"
target: "00|11"
gates: [H, X, CNOT, SWAP]
maxGates: 8
example: |
  H 1
  CNOT 1 -> 2
```

### Adding a genuinely new answer format

Ordinary new questions need only Markdown. A new interaction needs a new
`Kind`, metadata validation in `src/lib/questions.ts`, expected/grade/final-step
handling in `src/lib/engine.ts`, and an editor branch in
`src/lib/AnswerEditor.svelte`. Add a physics or interaction regression that
demonstrates the new behavior. Keep state parsing, simulation, rendering and
circuit drag rules in `misty-states`.

The first release has authored fixed questions in random order; it does not
generate endless numerical variants or automatically grade free-form prose.
Future variants can reuse these formats while keeping their parameters and
solutions together.
