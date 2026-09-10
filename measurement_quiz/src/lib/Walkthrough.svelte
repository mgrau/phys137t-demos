<script lang="ts">
  /**
   * The derivation, played out.
   *
   * Each step highlights one written term in the state and drops it into the
   * outcome it belongs to, so the sorting is visible rather than asserted. Then
   * repeats collapse, amplitudes square, and the total divides through.
   *
   * The tally reveals itself as the steps advance — a column that is not
   * derived yet is blank rather than greyed, because a greyed-out number still
   * reads as an answer and students copy it.
   */
  import Figure from './Figure.svelte';
  import { walkthrough, readsAs, type Walk } from './walkthrough';

  let {
    source,
    shapes,
    idPrefix,
  }: { source: string; shapes: string[]; idPrefix: string } = $props();

  const walk = $derived<Walk | null>(walkthrough(source));

  /**
   * How far the derivation has run. `-1` is step zero: nothing sorted, table
   * empty, no term lit. The point is that the walk-through opens showing the
   * problem rather than already part-way through the answer.
   */
  let at = $state(-1);
  let playing = $state(false);

  /** Called by the parent once the opened panel has scrolled into place. */
  export function play() {
    playing = true;
  }

  // A new question restarts the derivation rather than leaving it mid-way
  // through a state that is no longer on screen.
  $effect(() => {
    void source; // the dependency that makes this rerun
    at = -1;
    playing = false;
  });

  const step = $derived(at >= 0 ? (walk?.steps[at] ?? null) : null);
  const last = $derived((walk?.steps.length ?? 1) - 1);

  /** Terms sorted so far, per bucket, at this point in the derivation. */
  const collected = $derived.by(() => {
    const out: number[][] = (walk?.buckets ?? []).map(() => []);
    if (!walk) return out;
    for (let i = 0; i <= at && i < walk.steps.length; i++) {
      const s = walk.steps[i];
      if (s.kind === 'sort') out[s.bucket].push(s.term);
    }
    return out;
  });

  /** How far the derivation has got, so later columns stay blank. */
  const reached = $derived.by(() => {
    const seen = { merged: new Set<number>(), squared: new Set<number>(), total: false, divided: false };
    if (!walk) return seen;
    for (let i = 0; i <= at && i < walk.steps.length; i++) {
      const s = walk.steps[i];
      if (s.kind === 'merge') seen.merged.add(s.bucket);
      if (s.kind === 'square') seen.squared.add(s.bucket);
      if (s.kind === 'total') seen.total = true;
      if (s.kind === 'divide') seen.divided = true;
    }
    return seen;
  });

  // ── The highlight over the state figure ──

  let fig = $state<ReturnType<typeof Figure> | null>(null);
  let box = $state<{ left: number; top: number; width: number; height: number } | null>(null);

  const litTerm = $derived(step?.kind === 'sort' ? step.term : null);

  $effect(() => {
    const t = litTerm;
    void source; // re-measure when the figure is replaced, not only on step
    if (!fig || t === null || !walk) {
      box = null;
      return;
    }
    // After the figure has painted, so the CTM is current.
    const id = requestAnimationFrame(() => {
      box = fig?.boxFor(walk.terms[t].ats) ?? null;
    });
    return () => cancelAnimationFrame(id);
  });

  $effect(() => {
    if (!playing) return;
    if (at >= last) {
      playing = false;
      return;
    }
    const id = setTimeout(() => (at += 1), 1100);
    return () => clearTimeout(id);
  });

  const narration = $derived.by(() => {
    if (!walk) return '';
    if (!step) {
      return `${walk.terms.length} terms to sort into ${walk.buckets.length} outcome${walk.buckets.length === 1 ? '' : 's'}.${playing ? '' : ' Press play to work through it.'}`;
    }
    if (step.kind === 'sort') {
      const t = walk.terms[step.term];
      const neg = t.sign === -1 ? 'This negative term' : 'This term';
      return `${neg} is one where ${readsAs(t.key, walk.wires, shapes)}, so it belongs to that outcome.`;
    }
    if (step.kind === 'merge') {
      const b = walk.buckets[step.bucket];
      return `These terms are the same possibility, so add their amplitudes: ${b.merged.map((m) => sign(m.amp)).join(', ')}.`;
    }
    if (step.kind === 'square') {
      const b = walk.buckets[step.bucket];
      return `Square the amplitude of each possibility: ${squaredSum(b.merged, b.weight)}.`;
    }
    if (step.kind === 'total') {
      return `Add the weights together: ${walk.buckets.map((b) => b.weight).join(' + ')} = ${walk.total}.`;
    }
    return `Divide each weight by ${walk.total}. These are probabilities, not counts of terms.`;
  });

  const sign = (n: number) => (n < 0 ? '−' : '') + Math.abs(n);

  /**
   * An amplitude, squared, written out.
   *
   * Negatives get brackets: `-1²` reads as the negative of one squared, which
   * is the opposite of the point being made — the sign is inside the square and
   * that is exactly why it vanishes.
   */
  const squared = (n: number) => (n < 0 ? `(−${Math.abs(n)})²` : `${n}²`);

  /** `2² + (−1)² = 5`, so the working is visible rather than just the answer. */
  const squaredSum = (amps: { amp: number }[], weight: number) =>
    `${amps.map((m) => squared(m.amp)).join(' + ')} = ${weight}`;

  /**
   * shapeOrder for drawing an outcome's key.
   *
   * A key holds only the *measured* qubits' values, so the glyphs have to be
   * those wires' shapes in the order they were read — measuring wire 2 of a
   * circle/square register means the key draws as a square, not a circle. The
   * unmeasured shapes are appended so the array is always long enough; only the
   * first `key.length` of them are ever used.
   */
  const keyShapes = $derived.by(() => {
    if (!walk) return shapes;
    const read = walk.wires.map((w) => shapes[w - 1]).filter(Boolean);
    const rest = shapes.filter((s, i) => !walk.wires.includes(i + 1));
    return [...read, ...rest] as string[];
  });
</script>

{#if walk}
  <div class="head">
    <h2 class="label">How to get there</h2>
    <div class="nav">
      <span class="count">Step {at + 1} of {last + 1}</span>
      <button class="nb" onclick={() => { playing = false; at = Math.max(-1, at - 1); }}
              disabled={at < 0} aria-label="Previous step">‹</button>
      <button class="play" onclick={() => { if (at >= last) at = -1; playing = !playing; }}
              aria-label={playing ? 'Pause' : 'Play the derivation'}>
        {#if playing}
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"
            ><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg
          >
          Pause
        {:else}
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"
            ><path d="M8 5.5v13l11-6.5z" /></svg
          >
          {at >= last ? 'Again' : 'Play'}
        {/if}
      </button>
      <button class="nb" onclick={() => { playing = false; at = Math.min(last, at + 1); }}
              disabled={at === last} aria-label="Next step">›</button>
    </div>
  </div>

  <!-- The written state, with the term under discussion boxed. -->
  <div class="stage">
    <div class="figbox">
      <Figure bind:this={fig} source={walk.stateSource} idPrefix={`${idPrefix}-state`}
              scale={1} shapeOrder={shapes}
              ariaLabel="The state being measured, term by term" />
      {#if box}
        <div class="spotlight" style:left={`${box.left - 5}px`} style:top={`${box.top - 5}px`}
             style:width={`${box.width + 10}px`} style:height={`${box.height + 10}px`}></div>
      {/if}
    </div>
    <p class="say">{narration}</p>
  </div>

  <table class="tally">
    <colgroup>
      <col class="outcome-col" /><col class="terms-col" /><col class="state-col" />
      <col class="amp-col" /><col class="squared-col" /><col class="prob-col" />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">Outcome</th>
        <th scope="col"><span class="wide-label">Terms it collects</span><span class="compact-label">Terms</span></th>
        <th scope="col"><span class="wide-label">State afterwards</span><span class="compact-label">State after</span></th>
        <th scope="col" class="n"><span class="wide-label">Amplitude</span><abbr class="compact-label" title="Amplitude">Amp.</abbr></th>
        <th scope="col" class="n"><span class="wide-label">Squared</span><abbr class="compact-label" title="Squared amplitude">Amp.²</abbr></th>
        <th scope="col" class="n"><span class="wide-label">Probability</span><abbr class="compact-label" title="Probability">Prob.</abbr></th>
      </tr>
    </thead>
    <tbody>
      {#each walk.buckets as bucket, b}
        <tr class:lit={step && 'bucket' in step && step.bucket === b}>
          <td>
            <!-- The outcome appears when its first term lands in it, so the
                 sorting step is what names the row rather than the row having
                 been labelled all along. -->
            {#if collected[b].length}
              <span class="outcome">
                <span class="keyfig">
                  <Figure source={bucket.key} idPrefix={`${idPrefix}-k${b}`}
                          scale={0.62} shapeOrder={keyShapes}
                          ariaLabel={readsAs(bucket.key, walk.wires, shapes)} />
                </span>
                <span class="reads">{readsAs(bucket.key, walk.wires, shapes)}</span>
                <span class="compact-label" title={readsAs(bucket.key, walk.wires, shapes)}>{[...bucket.key].map((bit) => bit === '1' ? 'black' : 'white').join(', ')}</span>
              </span>
            {:else}
              <span class="waiting">—</span>
            {/if}
          </td>
          <td>
            <div class="terms">
              {#each collected[b] as ti (ti)}
                <span class="term">
                  {#if walk.terms[ti].sign === -1}<span class="neg">−</span>{/if}
                  <Figure source={walk.terms[ti].bits} idPrefix={`${idPrefix}-t${ti}`}
                          scale={0.62} shapeOrder={shapes} />
                </span>
              {/each}
              {#if !collected[b].length}<span class="waiting">—</span>{/if}
            </div>
          </td>
          <td>
            {#if reached.merged.has(b) || reached.squared.has(b)}
              <span class="term">
                <Figure source={bucket.stateSource} idPrefix={`${idPrefix}-s${b}`}
                        scale={0.62} shapeOrder={shapes}
                        ariaLabel={`The state left behind, outcome ${b + 1}`} />
              </span>
            {:else if collected[b].length}
              <span class="waiting">…</span>
            {/if}
          </td>
          <td class="n">
            {#if reached.merged.has(b) || reached.squared.has(b)}
              {bucket.merged.map((m) => sign(m.amp)).join(', ')}
            {:else if collected[b].length}
              <span class="waiting">…</span>
            {/if}
          </td>
          <td class="n">
            {#if reached.squared.has(b)}
              <span class="frac">{bucket.merged.map((m) => squared(m.amp)).join(' + ')} =</span>
              <strong>{bucket.weight}</strong>
            {/if}
          </td>
          <td class="n">
            {#if reached.divided}
              <span class="frac"
                >{bucket.weight}/({walk.buckets.map((x) => x.weight).join('+')})</span
              >
              <strong>= {bucket.percent.toFixed(0)}%</strong>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="tl">Total</td>
        <td class="n">{#if reached.total}<strong>{walk.total}</strong>{/if}</td>
        <td class="n">{#if reached.divided}<strong>100%</strong>{/if}</td>
      </tr>
    </tfoot>
  </table>
{/if}

<style>
  .head {
    display: flex;
    /* Centred, not baseline: the buttons are much taller than the label, so a
       shared baseline hangs them off the bottom of the row. */
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    /* The gap belongs here. It used to sit on the label, but the row's height
       is set by the buttons, so the buttons ended up flush against the panel
       border below. */
    margin-bottom: 10px;
  }
  .label {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .count {
    margin-right: 3px;
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-faint);
  }
  .nb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    /* Matches .play, so the three controls read as one group. */
    height: 34px;
    padding: 0 10px;
    font: inherit;
    font-size: 1rem;
    line-height: 1;
    color: var(--text-mid);
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 6px;
    cursor: pointer;
  }
  .nb:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--line-strong);
  }
  .nb:disabled {
    opacity: 0.35;
    cursor: default;
  }

  /* Deliberately the loudest thing in this panel. The step arrows are for
     going back over something; this is what a student should press first. */
  .play {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--on-fill);
    background: var(--fill);
    border: 1px solid var(--fill);
    border-radius: 6px;
    cursor: pointer;
    transition: filter 0.12s;
  }
  .play:hover {
    filter: brightness(1.08);
  }

  .stage {
    display: grid;
    gap: 9px;
    justify-items: center;
    padding: 11px;
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    border-radius: var(--radius);
  }
  .figbox {
    position: relative;
    display: inline-block;
    min-width: 0;
    max-width: 100%;
  }
  /* The box around the term being sorted. Accent, because this is the
     interface pointing at something, not part of the notation. */
  .spotlight {
    position: absolute;
    border: 3px solid var(--spot);
    border-radius: 8px;
    pointer-events: none;
    /* A wash inside and a halo outside, so it reads against both the white
       paper and the notation's own black strokes. */
    background: color-mix(in srgb, var(--spot) 9%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--spot) 18%, transparent);
    transition: left 0.28s ease, top 0.28s ease, width 0.28s ease, height 0.28s ease;
  }
  .say {
    margin: 0;
    /* Wide enough that a step's sentence stays on one line at most widths;
       balanced rather than ragged when it does have to wrap. */
    max-width: 100%;
    text-wrap: balance;
    text-align: center;
    font-size: 0.83rem;
    line-height: 1.5;
    color: var(--paper-dim);
  }

  .tally {
    width: 100%;
    margin-top: 11px;
    border-collapse: collapse;
  }
  .compact-label {
    display: none;
    text-decoration: none;
  }
  .tally th {
    padding: 0 7px 5px;
    font-size: 0.66rem;
    font-weight: 600;
    text-align: left;
    color: var(--text-faint);
  }
  .tally th.n,
  .tally td.n {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .tally tbody tr {
    border-top: 1px solid var(--line);
    transition: background 0.2s;
  }
  .tally tbody tr.lit {
    background: var(--panel-2);
  }
  .tally td {
    padding: 6px 7px;
    font-size: 0.82rem;
    color: var(--text-mid);
  }
  /* The division written out, so the denominator is visibly the total. */
  .frac {
    margin-right: 5px;
    font-size: 0.74rem;
    color: var(--text-faint);
  }
  .outcome {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  /* The measured qubits, drawn. The words say the same thing, but a student
     matching their table against this is matching shapes, not sentences. */
  .keyfig {
    display: inline-flex;
    align-items: center;
    padding: 2px 4px;
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    border-radius: 5px;
  }
  .reads {
    font-size: 0.78rem;
    color: var(--text-dim);
  }
  .terms {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
  }
  /* Each collected term sits on paper, like everything else in the notation. */
  .term {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    padding: 2px 4px;
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    border-radius: 5px;
  }
  .neg {
    font-size: 0.85rem;
    color: var(--paper-dim);
  }
  .waiting {
    color: var(--text-faint);
  }
  .tally tfoot td {
    border-top: 1px solid var(--line-strong);
    padding-top: 7px;
  }
  .tl {
    text-align: right;
    font-size: 0.78rem;
    color: var(--text-faint);
  }

  @media (max-width: 600px) {
    .head { flex-wrap: wrap; gap: 8px; }
    .nav { margin-left: auto; }
    .count { white-space: nowrap; }
    .tally { table-layout: fixed; }
    .outcome-col { width: 18%; }
    .terms-col, .state-col { width: 20%; }
    .amp-col { width: 13%; }
    .squared-col { width: 14%; }
    .prob-col { width: 15%; }
    .tally th { padding: 0 2px 5px; font-size: 0.6rem; }
    .tally td { padding: 6px 2px; font-size: 0.7rem; }
    .tally th.n, .tally td.n { white-space: normal; overflow-wrap: anywhere; }
    .tally th.n { white-space: nowrap; }
    .wide-label, .keyfig, .reads { display: none; }
    .compact-label { display: inline; }
    .outcome { display: block; font-size: 0.68rem; overflow-wrap: anywhere; }
    .terms { gap: 3px; }
    .term { min-width: 0; max-width: 100%; padding: 2px; }
    .term :global(.figure) { min-width: 0; }
    .frac { display: block; margin: 0 0 2px; font-size: 0.64rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .spotlight {
      transition: none;
    }
  }
</style>
