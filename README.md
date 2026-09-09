# PHYS 137T interactive demos

This directory is the source for the shared public demo collection:

- Hub: <https://mgrau.github.io/phys137t-demos/>
- Interference: <https://mgrau.github.io/phys137t-demos/interference/>
- Quantum jumps: <https://mgrau.github.io/phys137t-demos/quantum_jumps/>

Each demo remains an independent Svelte app. The root build compiles them into
separate static subfolders and adds the responsive selector at the site root.

```sh
npm run check
npm run build
npm run dev
./publish.sh
```

Add future demos as sibling folders. Two edits wire one up: an entry in the
`DEMOS` array in `hub/app.js`, which is the single source of truth the sidebar
list renders from, and its build output in `scripts/build.sh`.

## Planned

Five more, in the order the lectures need them. Dates are the class meeting the
demo is for.

| Demo | Lecture | Date |
| --- | --- | --- |
| Measurement quiz — a state, answer the outcome, then a walk-through of how to get there | 6 / 7 / 11, Measurement and post-measurement | Sep 10 / 15 / 29 |
| Money or tiger — query the oracle and spend your queries | 8, Interference and Deutsch–Jozsa | Sep 17 |
| Quantum Zeno — watch a rotation freeze as you measure it more often | 13, The Quantum Zeno Effect | Oct 8 |
| BB84 — run the protocol, toggle Eve, tell her apart from channel noise | 18, Quantum cryptography | Oct 29 |
| Grover — amplitudes reflected about their average, with N and iteration count as knobs | 20 / 21, Algorithms and Grover | Nov 17 / 19 |

### Measurement quiz — spec

Built on `misty_states` for the notation and simulation, borrowing the drag
interface from `quantum_sketch`.

Each question presents a state of **1 or 2 qubits** — 3 is undecided, and worth
deciding by counting how many rows the outcome table needs before it stops
fitting on a phone — with measurement gates on one or more of them, and an
empty outcome table.

The student fills the table in:

- **Drag qubits into a row** to build an outcome, then **click or tap** a qubit
  to cycle its state. Same gesture vocabulary as `quantum_sketch`, so anyone who
  has used the sketch pad already knows how to drive this.
- **Type the probability** for each row.

Marking:

- A probability counts as correct within **1%**.
- The column must **sum to 100%**, checked separately from the individual rows —
  a student can have every row within tolerance and still not have a
  distribution, and that is worth saying out loud rather than silently passing.
- Rows must be the *right set* of outcomes, not just plausible ones. Use
  `canonical()` from the misty kernel to compare, so an outcome written in a
  different but equivalent form still matches.

Then it **walks through how to get there** — the part the Lecture 7 notes ask
for and do not have. The recipe from the deck, one step at a time: write the
whole cloud out, split into branches, square the amplitudes, and read off what
is left. This is the reason the demo exists; the marking is secondary.

**Build these on misty_states as the design language.** The course teaches
qubits in Terry Rudolph's shape-and-shade notation, so a demo that invents its
own visual vocabulary makes students translate twice. `misty-states` exposes
what is needed: `kernel` for exact simulation (Gaussian integers, so state
comparison has no float slop), a pure `render()` cheap enough to call during a
drag, and `createBoard()` as a framework-agnostic drag layer. Do not rebuild the
parser, the simulator, gate rendering, or drag-to-place.

Note the two existing consumers disagree on how they depend on it —
`quantum_sketch` links the live sibling via `file:../misty_states`, while
`quantum_game` vendors a source snapshot. Pick one deliberately here rather than
inheriting whichever was copied last.

Two of these overlap authored-but-dormant content in `quantum_game`, whose
level loader currently globs only `00-demo.yaml`: `03-sealed-box.yaml` covers
Deutsch, Deutsch–Jozsa and Grover, and `02-workshop.yaml` covers phase kickback
and circuit equivalence. Check those before building the oracle and Grover
demos from scratch. Nothing in the 33 dormant levels touches partial
measurement, which is why the measurement quiz leads this list.

## Design language

The hub chrome and both demos are deliberately **achromatic**. Every demo
paints with physics-driven colour — the visible spectrum in Interference, the
194 nm and 282 nm violets in Quantum jumps — so an accent hue in the chrome
would read as though it meant something. Selection and active states are
carried by contrast instead: a near-white fill (`#E6E8EC`) on dark, plus a rule
on the active sidebar row. Focus rings are `#8FA0BF`.

The same rule applies inside a demo: where two things on one plot need telling
apart, separate them by *form*, not hue. The Rabi theory curve is dashed rather
than coloured, so the measured points stay the only thing on the plot that came
from the experiment.

## Light and dark

Both themes are supported everywhere, with a toggle in the header next to
fullscreen (`D`, or the button). Light is **designed rather than inverted** —
the neutrals keep a slight cool bias, and `--fill` holds its meaning (maximum
contrast against the page) by flipping from near-white to near-black.

**Not everything flips.** A canvas that *depicts the apparatus* stays dark in
both themes, because it shows light in a dark room and inverting it would be
physically wrong: the wave field, the screen, the ion trap. A canvas that is a
*diagram or a plot* follows the theme: the Rabi chart, the level diagram. The
dark ones sit in a `.scene-panel`, which supplies the fixed dark ground and the
border that keeps it from floating on a light page.

Transparency does not survive the flip unchanged. A 25%-opacity violet still
carries against near-black but disappears against white, so the light palette
remaps every alpha toward opaque via `palette.alpha()` rather than using the
number literally. Fully transparent stays transparent, or gradients would gain
a hard edge.

### The contract

The apps share this by contract, not shared code, so each stays independently
buildable:

- **`localStorage['phys137t-theme']`** — `"light"` or `"dark"`. Absent means
  follow the OS.
- **`<html data-theme="...">`** — what the CSS actually keys off.
- CSS defines light on `:root`, dark under `@media (prefers-color-scheme: dark)`,
  then re-declares both under `:root[data-theme="..."]` so the toggle wins in
  either direction.

Hub-to-demo sync falls out for free: they are the same origin, so writing the
key in one document fires a `storage` event in the other. No postMessage. The
hub applies the theme from an inline script in `<head>` to avoid a flash on
load, and a framed demo hides its own theme button — the hub's toggle governs,
and two of them 40px apart looked like a bug.
