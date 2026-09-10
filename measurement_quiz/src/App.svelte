<script lang="ts">
  import { tick } from 'svelte';
  import Figure from './lib/Figure.svelte';
  import Palette from './lib/Palette.svelte';
  import Walkthrough from './lib/Walkthrough.svelte';
  import {
    CATEGORIES,
    QUESTIONS,
    byCategory,
    shapesOf,
    type Question,
  } from './lib/questions';
  import { outcomesOf, grade, type Row } from './lib/grade';
  import { createCarry, type Tile, type Pos, type Region } from './lib/carry.svelte';
  import { randomQuestion } from './lib/generate';
  import * as C from './lib/cell';
  import { theme } from './lib/theme.svelte';

  const embedded = window.self !== window.top;

  // ── Which question ──

  let catId = $state(CATEGORIES[0].id);
  let qId = $state(byCategory(CATEGORIES[0].id)[0].id);
  /** A generated question, which lives outside the fixed bank. */
  let drawn = $state<Question | null>(null);

  const category = $derived(CATEGORIES.find((c) => c.id === catId)!);
  const siblings = $derived(byCategory(catId));
  const question = $derived(
    drawn ?? QUESTIONS.find((q) => q.id === qId) ?? byCategory(catId)[0],
  );
  const solved = $derived.by(() => outcomesOf(question.source));
  const shapes = $derived(shapesOf(question.source));

  // ── The student's table ──

  interface Entry {
    cell: C.Cell;
    percent: string;
    amp: string;
  }

  const blank = (): Entry => ({ cell: C.emptyCell(solved.qubits), percent: '', amp: '' });

  let rows = $state<Entry[]>([blank()]);
  let focused = $state(0);
  /** Problems stay hidden until they ask, so the table is not red while typing. */
  let checked = $state(false);
  let showWork = $state(false);
  /** Transient explanation for a gesture that did nothing. */
  let hint = $state('');
  let workEl = $state<HTMLElement | null>(null);

  /**
   * Open the working and bring it to the top of the view.
   *
   * The panel appears *below* the fold, so without this a student clicks and
   * apparently nothing happens. Scrolled rather than jumped, so the movement
   * shows where the new content came from — and honoured only when the reader
   * has not asked for less motion.
   */
  async function toggleWork() {
    showWork = !showWork;
    if (!showWork) return;
    await tick();
    workEl?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  }

  /** Cells as misty source, which is what both the renderer and grade want. */
  const sources = $derived(rows.map((r) => C.toSource(r.cell)));

  const graded = $derived<Row[]>(
    rows.map((r, i) => ({ state: sources[i], percent: r.percent, amp: r.amp })),
  );

  const report = $derived(
    grade(graded, solved.outcomes, solved.qubits, question.amplitude),
  );

  /** Slots the focused cell's newest possibility still has free. */
  const openSlots = $derived(
    C.openSlots(rows[focused]?.cell ?? C.emptyCell(solved.qubits), solved.qubits),
  );

  /** Register shapes, defaulted for a one-qubit question with no directive. */
  const glyphs = $derived(
    shapes ?? ['circle', 'square', 'triangle'].slice(0, solved.qubits),
  );

  function reset() {
    rows = [blank()];
    focused = 0;
    checked = false;
    showWork = false;
  }

  function pickCategory(id: typeof catId) {
    catId = id;
    qId = byCategory(id)[0].id;
    drawn = null;
    reset();
  }

  function pickQuestion(id: string) {
    qId = id;
    drawn = null;
    reset();
  }

  function drawRandom() {
    drawn = randomQuestion(catId);
    reset();
  }

  // ── Editing ──
  //
  // Every edit produces new source text, re-parsed on render. One
  // representation, so the picture and the answer cannot drift.

  function write(i: number, cell: C.Cell) {
    rows[i] = { ...rows[i], cell };
    checked = false;
    hint = '';
  }

  function place(i: number, tile: Tile, region: Region) {
    if (tile.kind === 'cloud') {
      write(i, C.addCloud(rows[i].cell));
      return;
    }
    if (tile.kind === 'minus') return; // handled by dropMinus, which needs a point
    write(i, C.place(rows[i].cell, tile.slot, tile.value, region));
  }

  /**
   * A minus flips the sign of the term it lands on.
   *
   * It has to hit a qubit, because a qubit is the only thing that identifies
   * which term is meant. And it only does anything inside a cloud: a sign on a
   * lone term is a global phase, unobservable, so flipping one there would show
   * the student a change that is not really there.
   */
  function dropMinus(i: number, x: number, y: number) {
    const spot = figs[i]?.hitTest(x, y);
    if (!spot) {
      hint = 'Drop the minus onto a qubit inside a cloud.';
      return;
    }
    const pos = C.locate(rows[i].cell, spot.at);
    if (!pos || pos.where !== 'in') {
      hint =
        'A minus only counts inside a cloud — on its own it is a sign you could never measure.';
      return;
    }
    hint = '';
    write(i, C.flipSign(rows[i].cell, pos.alt));
  }

  function cycleAt(i: number, pos: Pos) {
    const cell = rows[i].cell;
    write(
      i,
      pos.where === 'out'
        ? C.cycleOut(cell, pos.slot)
        : C.cycleIn(cell, pos.alt, pos.index),
    );
  }

  function pull(i: number, pos: Pos) {
    const cell = rows[i].cell;
    write(
      i,
      pos.where === 'out'
        ? C.clearOut(cell, pos.slot)
        : C.clearIn(cell, pos.alt, pos.index),
    );
  }

  /** The colour and register slot a held qubit represents. */
  function valueAt(i: number, pos: Pos): { value: 0 | 1; slot: number } | null {
    const cell = rows[i].cell;
    if (pos.where === 'out') {
      const v = cell.out[pos.slot];
      return v === null || v === undefined ? null : { value: v, slot: pos.slot };
    }
    const v = cell.alts[pos.alt]?.[pos.index];
    const r = C.range(cell);
    // An 'open' cloud has no slot yet, so nothing inside it can be picked up.
    if (v === null || v === undefined || !r) return null;
    return { value: v, slot: r.from + pos.index };
  }

  function moveTo(row: number, pos: Pos, to: number, region: Region) {
    const held = valueAt(row, pos);
    if (!held) return;
    pull(row, pos);
    // Read the cell back after the pull, since removing can shrink the cloud.
    write(to, C.place(rows[to].cell, held.slot, held.value, region));
    focused = to;
  }

  function addRow() {
    rows = [...rows, blank()];
    focused = rows.length - 1;
    checked = false;
  }

  function dropRow(i: number) {
    if (rows.length === 1) {
      rows = [blank()];
      focused = 0;
      checked = false;
      return;
    }
    rows = rows.filter((_, k) => k !== i);
    focused = Math.min(focused, rows.length - 1);
    checked = false;
  }

  // ── Drag ──

  let cellEls: (HTMLElement | null)[] = $state([]);
  /** Figure instances, for resolving which term a minus landed on. */
  let figs: (ReturnType<typeof Figure> | null)[] = $state([]);

  const carry = createCarry({
    cellAt: (x, y) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const idx = cellEls.findIndex((c) => c && c.contains(el));
      return idx >= 0 ? idx : null;
    },
    regionAt: (cell, x, y) => {
      const el = cellEls[cell];
      if (!el) return 'out';
      // The cloud outline is the largest path in the cell's figure. Without a
      // cloud the largest is a single qubit, hence the size floor.
      let box: DOMRect | null = null;
      for (const path of el.querySelectorAll('svg path')) {
        const r = path.getBoundingClientRect();
        if (!box || r.width * r.height > box.width * box.height) box = r;
      }
      if (!box || box.width < 34) return 'out';
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
        ? 'in'
        : 'out';
    },
    drop: (cell, tile, region, x, y) => {
      focused = cell;
      if (tile.kind === 'minus') dropMinus(cell, x, y);
      else place(cell, tile, region);
    },
    move: (row, pos, toCell, region) => moveTo(row, pos, toCell, region),
    remove: (row, pos) => pull(row, pos),
    tap: (row, pos) => {
      focused = row;
      cycleAt(row, pos);
    },
  });

  // ── Fullscreen ──

  let mainEl: HTMLElement;
  let isFullscreen = $state(false);

  $effect(() => {
    const on = () => (isFullscreen = !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else mainEl.requestFullscreen();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    if (e.key === 'd' || e.key === 'D') theme.toggle();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main bind:this={mainEl} class="shell" class:fullscreen={isFullscreen}>
  <header class="bar">
    <div class="min-w-0">
      <h1>Measurement Quiz</h1>
      <p class="sub">PHYS 137T · Lectures 6–7 · Measurement and what it leaves</p>
    </div>
    <div class="controls">
      {#if !embedded}
        <button class="icon-btn" onclick={() => theme.toggle()}
          title={theme.isDark ? 'Light mode (D)' : 'Dark mode (D)'}
          aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {#if theme.isDark}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          {/if}
        </button>
      {/if}
      <button class="icon-btn" onclick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        {#if isFullscreen}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        {/if}
      </button>
    </div>
  </header>

  <nav class="cats" aria-label="Question categories">
    {#each CATEGORIES as c}
      <button class="cat" aria-current={c.id === catId} onclick={() => pickCategory(c.id)}>
        {c.title}
      </button>
    {/each}
  </nav>

  <!-- The question, then its table underneath. -->
  <section class="panel">
    <p class="blurb">{category.blurb}</p>

    <div class="qrow">
      <span class="qlabel">Question</span>
      {#each siblings as q, i}
        <button class="qnum" aria-current={!drawn && q.id === qId}
                onclick={() => pickQuestion(q.id)}>
          {i + 1}
        </button>
      {/each}
      <button class="qnum draw" aria-current={!!drawn} onclick={drawRandom}
              title="A fresh one of this kind">
        Random
      </button>
    </div>

    <p class="prompt">{question.prompt}</p>
    <div class="figwrap">
      <Figure source={question.source} idPrefix={`q-${question.id}`} scale={1.1}
              ariaLabel="The circuit for this question, with its measurement gates." />
    </div>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h2 class="label">Possible outcomes</h2>
      <!-- Success belongs beside the thing that succeeded, not in a line under
           the buttons where it reads as one more instruction. -->
      {#if report.solved}
        <span class="correct" role="status">Correct!</span>
      {/if}
    </div>

    <table>
      <thead>
        <tr>
          <th scope="col">State afterwards</th>
          {#if question.amplitude}<th scope="col" class="num">Amplitude</th>{/if}
          <th scope="col" class="num">Probability</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as _row, i}
          {@const v = report.rows[i]}
          <tr class:focus={i === focused}
              class:ok={v?.kind === 'right'}
              class:bad={checked && (v?.kind === 'wrong' || v?.kind === 'duplicate')}
              class:near={checked && v?.kind === 'close'}>
            <td>
              <div class="cell"
                   class:over={carry.overCell === i && carry.dragging}
                   bind:this={cellEls[i]}
                   role="button" tabindex="0"
                   onclick={() => (focused = i)}
                   onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') focused = i; }}
                   aria-label={`Outcome ${i + 1}`}>
                {#if sources[i]}
                  <Figure source={sources[i]} idPrefix={`c-${question.id}-${i}`} scale={0.8}
                          shapeOrder={glyphs}
                          bind:this={figs[i]}
                          onQubitGrab={(s, e) => {
                            const pos = C.locate(rows[i].cell, s.at);
                            if (!pos) return;
                            focused = i;
                            carry.grabHeld(i, pos, e);
                          }} />
                {:else}
                  <span class="empty">drag a qubit here</span>
                {/if}
              </div>
            </td>
            {#if question.amplitude}
              <td class="num">
                <input class="tiny" inputmode="decimal" placeholder="—"
                  aria-label={`Amplitude for outcome ${i + 1}`}
                  bind:value={rows[i].amp}
                  onfocus={() => (focused = i)}
                  oninput={() => (checked = false)} />
              </td>
            {/if}
            <td class="num">
              <input class="tiny" inputmode="decimal" placeholder="—"
                aria-label={`Probability for outcome ${i + 1}, percent`}
                bind:value={rows[i].percent}
                onfocus={() => (focused = i)}
                oninput={() => (checked = false)} />
              <span class="pcs">%</span>
            </td>
            <td>
              <button class="rowbtn del" onclick={() => dropRow(i)}
                      aria-label={`Delete outcome ${i + 1}`} title="Delete this outcome">×</button>
            </td>
          </tr>
          {#if checked && v && v.kind !== 'right' && v.kind !== 'pending'}
            <tr class="note"><td colspan={question.amplitude ? 4 : 3}>
              {v.kind === 'duplicate' ? 'This outcome is already in the table.' : v.why}
            </td></tr>
          {/if}
        {/each}
        <tr class="addrow">
          <td colspan={question.amplitude ? 4 : 3}>
            <button class="rowbtn add" onclick={addRow}
                    aria-label="Add an outcome" title="Add an outcome">+</button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="total-label">Total</td>
          {#if question.amplitude}<td></td>{/if}
          <td class="num" class:bad={checked && report.total !== null && !report.totalOk}>
            <strong>{report.total === null ? '—' : report.total.toFixed(0)}</strong>
            <span class="pcs">%</span>
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="tools">
      <Palette shapes={glyphs} open={openSlots}
               onTap={(t) => place(focused, t, 'out')}
               onGrab={(t, e) => carry.grabNew(t, e)} />
    </div>

    <div class="actions">
      <button class="btn btn-primary" onclick={() => (checked = true)}>Check</button>
      <button class="btn btn-secondary" onclick={toggleWork}>
        {showWork ? 'Hide the working' : 'Show me how'}
      </button>
      <button class="btn btn-secondary" onclick={reset}>Clear</button>
    </div>

    {#if hint}
      <p class="verdict">{hint}</p>
    {/if}

    {#if checked && !report.solved}
      <p class="verdict">
        {#if report.missing > 0}
          {report.missing} outcome{report.missing === 1 ? '' : 's'} still missing.
        {:else if !report.totalOk}
          Every outcome is there, but the probabilities add to
          {report.total?.toFixed(0)}%, not 100%.
        {:else}
          Not yet — see the notes above.
        {/if}
      </p>
    {/if}
  </section>

  {#if showWork}
    <section class="panel work" bind:this={workEl}>
      <Walkthrough source={question.source} shapes={glyphs} idPrefix={`w-${question.id}`} />
      <p class="moral">{question.moral}</p>
    </section>
    <!-- Room to scroll the working to the top. Without it the document simply
         ends and the panel stops part-way up, which reads as the scroll having
         failed. Empty background, so it costs nothing to look at. -->
    <div class="scroll-room" aria-hidden="true"></div>
  {/if}

  <p class="hint">
    Drag qubits into a cell to define a state. Tap a placed qubit to change its
    value, drag it out of the table to remove it.
  </p>
</main>

{#if carry.dragging && carry.carry}
  <!-- The block under the pointer. Purely cosmetic; the drop is resolved from
       the pointer position, not from this element. -->
  <div class="ghost" style:left={`${carry.carry.x}px`} style:top={`${carry.carry.y}px`}>
    {#if carry.carry.kind === 'new' && carry.carry.tile.kind === 'minus'}
      <span class="gtext">&minus;</span>
    {:else if carry.carry.kind === 'new' && carry.carry.tile.kind === 'qubit'}
      <Figure source={String(carry.carry.tile.value)} idPrefix="ghost" scale={0.72}
              shapeOrder={[...glyphs.slice(carry.carry.tile.slot), ...glyphs.slice(0, carry.carry.tile.slot)]} />
    {:else if carry.carry.kind === 'new'}
      <Figure source="(?)" idPrefix="ghost-c" scale={0.62} shapeOrder={glyphs} />
    {:else}
      <span class="gtext">↕</span>
    {/if}
  </div>
{/if}
