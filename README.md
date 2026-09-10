# PHYS 137T interactive demos

This directory is the source for the shared public demo collection:

- Hub: <https://mgrau.github.io/phys137t-demos/>
- Interference: <https://mgrau.github.io/phys137t-demos/interference/>
- Quantum jumps: <https://mgrau.github.io/phys137t-demos/quantum_jumps/>
- Measurement quiz: <https://mgrau.github.io/phys137t-demos/measurement_quiz/>

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

Four more, in the order the lectures need them. Dates are the class meeting the
demo is for. (The measurement quiz is built — see below.)

| Demo | Lecture | Date |
| --- | --- | --- |
| Money or tiger — query the oracle and spend your queries | 8, Interference and Deutsch–Jozsa | Sep 17 |
| Quantum Zeno — watch a rotation freeze as you measure it more often | 13, The Quantum Zeno Effect | Oct 8 |
| BB84 — run the protocol, toggle Eve, tell her apart from channel noise | 18, Quantum cryptography | Oct 29 |
| Grover — amplitudes reflected about their average, with N and iteration count as knobs | 20 / 21, Algorithms and Grover | Nov 17 / 19 |

### Measurement quiz — built

Nine questions in three categories: one qubit measured, several measured, and
partial measurement. The categories are not decoration — they are what makes
the **amplitude** column workable. Counting copies gives whole-number
amplitudes when everything is measured (3 and 1, or 1 and 2 and 1), but an
outcome that keeps two terms has amplitude √2, so the column is off for partial
measurements via `amplitude: false` on the question. Turn it on for one of those
only if you want that conversation.

**The answer key is never written down.** A question is only its circuit source;
the outcomes come from `simulateBranches`. So a question cannot disagree with
its own answer, and varying the inputs year to year is a one-line edit.

Amplitudes are computed from the state *just before* the measurement, not from
a branch's `odds` — misty has already reduced those, so measuring the square of
`00|01|01|10` reports 1/3 and 2/3, and reconstructing amplitudes from that
gives √1 and √2 against 3 rather than the true √2 and 2 against 6.

**Interaction.** A cell is held as **terms by slots** (`src/lib/cell.ts`), one
slot per qubit, rather than as free-form source. That is what lets every shape
be available at once: dropping a square sets *the square*, whatever else is
filled. The palette offers each register shape in white and black, so there is
no colour-cycling step needed to place one.

Dropping a shape whose slot is already taken **starts another possibility** —
which is how a student says "and another term, differing here", and repeats are
what carry amplitude in this notation.

The cloud is a **factor**, not the outer container of every term. Dropping it
into an empty cell gives a cloud with a blank in it and *nothing beside it* —
it is `'open'`, covering no slot, until the first qubit dropped inside decides
which one it holds. Trailing blanks are trimmed for the same reason: a blank
with something after it has to stay, because position is what names a qubit,
but a run of them at the end says nothing. Qubits drag into the cloud, and
dragging one back out leaves it standing *beside* it. That is misty's
`0(0|1)` and it is the factored form the notes ask for, so `(0|1)0` and `00|10`
are both accepted for the same outcome — `canonical()` sees through the
difference. The cloud has to be a contiguous run of slots, because the notation
has no way to write a split one; a slot leaving from the middle collapses the
cloud rather than pretending otherwise.

Each category has three fixed examples plus a **Random** button
(`src/lib/generate.ts`). Generated questions are simulated before being shown
and rejected if they are not worth answering — more than four outcomes is
bookkeeping, and anything under 5% is guessable.

Minus signs are decided **per distinct possibility**, not per term, and about a
third of draws carry two or more. Signing terms individually let a possibility's
own copies cancel: `-0|0|-0|1` writes three white terms that net to −1, so a
student counting copies gets 3 and is wrong. That is a question about
*simplifying* a state — a different one of the six rules — smuggled into a
question about measuring one, so every state is presented already simplified.
Repeats of the *same* sign stay, because counting copies is exactly the skill
being drilled. Never every possibility, since an overall sign is a global phase
that `canonical` divides straight back out. 600 draws were checked for
malformed output and for self-cancelling possibilities; none of either.

A **minus** tile makes a term's amplitude negative. It has to be dropped on a
qubit, because a qubit is the only thing that identifies which term is meant,
and it only counts *inside* a cloud — a minus on a lone term or on a whole
factored product is a global phase that `canonical` divides straight back out,
so `01` and `-01` are the same state. Without this, an outcome like `011|-101`
was unwritable, which made one of the fixed questions unsolvable.

Tapping a placed qubit cycles it white → black → blank. Blocks drag out of the
table to delete and between cells to move, and tapping works everywhere drag
does, for phones. Rows are added with a green `+` and deleted with a red `×`.

Drop targets are resolved with `document.elementFromPoint` against the cell
elements, deliberately coarser than `quantum_sketch`'s drag layer: that one aims
at a position *within* one figure, which needs a synthesised hit-box for the `|`
bars that misty does not publish. Here what matters is which cell a block lands
in, and appending within a cell is what a student wants anyway.

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

The chrome carries **one accent — a warm slate blue** — and nothing else. It is
confined to active fills, the selected-row rule, the slider thumb and focus
rings. The neutrals take a matching cool bias so they read as chosen rather than
as default grey.

Everything else on screen stays out of its way, because every demo paints with
physics-driven colour and a second UI hue would read as though it meant
something: the visible spectrum in Interference, the 194 nm and 282 nm violets
in Quantum jumps. Plots and diagrams keep their own neutrals — the measured
points are grey because the data is not a category.

Where two things on one plot need telling apart, separate them by *form*, not
hue. The Rabi theory curve is dashed rather than coloured, so the measured
points stay the only thing on the plot that came from the experiment.

## Spacing

Shell padding, the gap between bands, panel padding and the corner radius are
**layout tokens**, declared alongside the colour tokens in every demo's
`app.css` and read from there:

    --shell-pad     10px 12px      --band-gap   8px
    --shell-pad-fs  20px 24px      --panel-pad  9px 12px
    --radius        8px

They are tokens because they drifted once. Interference kept its spacing in
Tailwind utilities (`p-3 sm:p-4`, `gap-3`) while Quantum jumps kept it in CSS,
so the two ended up with different shell padding, band gap and panel padding
despite being the same kind of surface. Do not put a `p-3` on a shell or a
panel; point it at the token instead.

## Light and dark

Both themes are supported everywhere, with a toggle in the header next to
fullscreen (`D`, or the button). Light is **designed rather than inverted** —
the neutrals keep a slight cool bias, and `--fill` holds its meaning (maximum
contrast against the page) by flipping from near-white to near-black.

**The notation never flips.** In this course a qubit's white or black fill *is*
its value, and misty's dark palette swaps them — a white qubit comes back
near-black. That would show a student the wrong bit, so the quiz's figures keep
misty's light palette in both themes and sit on `--paper`, the way a printed
figure sits on a page. Paper itself does adapt: white in the light theme, grey
in the dark one, since a sheet of pure white glares against a dark page. It
stays light-valued because a white qubit still has to read as white on it. This is the same rule as the cases below, just
sharper: the ink carries meaning, so it is not available to the theme.

**Not everything flips.** Interference's wave field and screen stay dark in
both themes: they are images of light in a dark room, and inverting a fringe
pattern would be a lie about what one looks like. They sit in a `.scene-panel`,
which supplies the fixed dark ground and a border so it does not float on a
light page.

Everything else follows the theme, including the ion trap — that one is a
*drawing of hardware*, and a drawing can sit on paper. Its one hard part is the
fluorescing ion: white-hot reads as "emitting" against near-black and as
"washed out" against white, so on light the core becomes the saturated
wavelength instead. The ion is brightest by being the most *colour* on the
panel rather than the most *light*. See `TrapPalette` in
`quantum_jumps/src/lib/theme.svelte.ts`.

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
