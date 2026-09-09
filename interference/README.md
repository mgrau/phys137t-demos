# Interference demo — waves, then one particle at a time

For lecture 4, after the laser-and-slits demo. Shows the same interference
pattern twice: once as waves arriving continuously, once as individual
particles landing one at a time and piling up into a histogram of the same
shape.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static bundle in dist/
npm run check      # svelte-check, must stay at 0 errors
npx tsx test/physics.check.ts
./publish.sh       # sync to the public repo, which deploys to Pages
```

Live at <https://mgrau.github.io/phys137t-demos/interference/>.

This directory is the source of truth. The course repo is private and cannot
serve Pages, so `publish.sh` delegates to the collection publisher for the
public `mgrau/phys137t-demos` repo. Edit here, run the script, and the class
link updates.

## Running it in class

`npm run dev` and put the browser on the projector. The three moves:

1. **Waves.** Ripples come in from the left, spread from both slits, and the
   bright and dark bands appear on the screen. Point out where crest meets
   trough.
2. **Slit separation slider.** Fringes get closer as the slits move further
   apart, and the millimetre axis lets you read the spacing off the screen.
3. **One Photon at a Time.** This starts *paused* on purpose, so nothing
   happens until you press *Fire one*. Each photon lands in a single spot, and
   its path is traced across the left panel. Nothing about a single hit looks
   like a wave. Then raise the rate and press play: the traces pile up and fade,
   and the histogram grows into the curve.

The intensity curve stays on screen as a dashed line in the photon picture
deliberately — the histogram growing into it is the argument.

**Every trace goes through both slits.** Picking one slit at random and drawing
a single line would have been easier, and it is the one thing this demo must
not do: it asserts a definite path, which is the claim the double slit refutes.
A class watching single photons arrive and seeing each drawn down one side has
been told something false before anyone speaks. The bowtie is the honest
schematic — amplitude went both ways, the two paths met, and where they met
decided where the photon could turn up.

Trace geometry is proportional, not geometric. The field's ripple wavelength is
not to scale, so its own fringe angles do not match the real ones; the centre
lines up and the ordering is right, which is what the picture has to carry.

`index.html?mode=particles` deep-links straight to the photon picture, paused,
for linking from a slide.

## Making animations from it

There is no export. Screen-record the browser window; QuickTime's screen
recording is enough, and the canvas is 900×320 so it scales cleanly. For a
still, screenshot at a chosen count.

## The physics

Far-field (Fraunhofer) diffraction, which is what the classroom setup actually
satisfies — the screen is metres away and the slits are tens of micrometres.

```
single slit:  I(x) ∝ sinc²(π a sinθ / λ)
two slits:    I(x) ∝ sinc²(π a sinθ / λ) · cos²(π d sinθ / λ)
```

with `sinθ = x / √(x² + L²)`, exact rather than the small-angle form. Keeping
the single-slit envelope in the two-slit case is what makes the fringes fade
towards the edges the way they do on the wall.

Particles are drawn from that intensity by inverting its cumulative
distribution on a 4096-point grid. `test/physics.check.ts` checks the sampler
against the analytic curve in Poisson sigma across four configurations —
χ²/dof ≈ 1, worst |z| < 3, and nothing sampled outside the range.

Two things that were wrong on the way here, both caught by that test:

- Rejection sampling was the first instinct and is wrong. Its acceptance rate
  collapses as the fringes narrow, so the particle rate would quietly depend on
  the slit separation and the histogram would fill at a different speed every
  time a slider moved.
- The first inverse-CDF version put the grid on bin *centres* and interpolated
  backwards, which shifted every draw half a bin left and pushed part of the
  leftmost bin outside the range. Indexing on bin edges and drawing uniformly
  inside the chosen bin fixes both.

The wave field on the left is a real superposition of two circular waves, not
the far-field formula, because the cancellation has to be visible. Its
wavelength is **not to scale** — a 650 nm ripple next to a 250 µm slit gap
would be far finer than one pixel. It is tied to the wavelength slider only so
the ripples visibly coarsen when you move it.

## Note on the lecture 4 slide numbers

The slide says the double slit is "0.08 mm thick, separated by 50
micrometres". Those two numbers cannot both describe centre-to-centre
separation: slits 80 µm wide cannot sit 50 µm apart without overlapping. The
50 µm is probably the opaque gap between them, which would make the
centre-to-centre separation 130 µm.

The demo defaults to 250 µm, which gives a comfortable fringe spacing at 3 m.
Set separation to 130 µm to match the real slide holder if that is what is in
the drawer.
