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
