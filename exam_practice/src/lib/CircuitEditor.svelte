<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { render, type RenderResult } from 'misty-states/render';
  import { createBoard, type Board } from 'misty-states/ui';
  import { parseCircuit, insertGate, type Droppable } from 'misty-states/kernel';
  import type { Question } from './questions';
  let { question: q, value, onchange }: { question: Question; value: string; onchange: (value: string) => void } = $props();
  const id = $props.id();
  const names: Record<string, string> = { o: 'circle', s: 'square', '^': 'triangle', d: 'diamond' };
  let host: HTMLDivElement;
  let board: Board | undefined;
  let drawing: RenderResult | undefined;
  let preview = $state<string | null>(null);
  let gate = $state(untrack(() => q.gates![0]));
  let wire = $state(1);
  let other = $state(2);
  let note = $state('');
  let history = $state<string[]>([]);
  const base = $derived(`shape ${q.shapes}\nqubits ${q.qubits}\nin ${q.input}`);
  const source = $derived(`${base}\n${value}`);
  const count = $derived(value.split(/[\n;]/).filter(s => s.trim()).length);
  const span = (g: string) => g === 'TOFFOLI' ? 3 : ['CNOT', 'SWAP'].includes(g) ? 2 : 1;
  const droppable = (g: string): Droppable => ({ head: g, wires: span(g) });

  function commit(full: string) {
    // The input is supplied by the question. Dragging cannot change its colors,
    // shape order, width, or introduce an extra wire.
    const doc = parseCircuit(full);
    const inputLine = full.split('\n').find(l => l.trim().startsWith('in '));
    if (doc.qubits !== q.qubits || inputLine?.trim() !== `in ${q.input}`) { note = 'The given input and number of wires are fixed.'; return; }
    const next = full.split('\n').filter(l => !/^(shape|qubits|in)\b/.test(l.trim())).join('\n').trim();
    if (next.split(/[\n;]/).filter(s => s.trim()).length > q.maxGates) { note = `Use at most ${q.maxGates} gates.`; return; }
    if (next === value) return;
    history.push(value); onchange(next); note = '';
  }
  function addGate() {
    if (count >= q.maxGates) return;
    if (span(gate) === 1) {
      const doc = parseCircuit(source);
      commit(insertGate(source, doc, { wire, layer: Math.max(0, doc.layers.length - 1), where: doc.layers.length ? 'after' : 'in' }, droppable(gate)).source);
    } else {
      if (wire === other) { note = 'Control and target must be different wires.'; return; }
      const line = gate === 'TOFFOLI' ? `TOFFOLI ${wire} ${other} -> ${[1,2,3].find(n => n !== wire && n !== other)}` : `${gate} ${wire} ${other}`;
      commit(`${source}\n${line}`);
    }
  }
  $effect(() => {
    const shown = preview ?? source;
    if (!host) return;
    try {
      board?.beforeRender();
      drawing = render(shown, { idPrefix: `circuit-${id}`, check: false, background: false });
      host.innerHTML = drawing.svg;
      board?.afterRender();
    } catch { note = 'That gate could not be placed here.'; }
  });
  onMount(() => {
    board = createBoard({
      preview: () => host,
      view: () => ({ source, geometry: drawing?.geometry, qubits: q.qubits, spots: drawing?.qubitSpots }),
      onpreview: edit => { preview = edit?.source ?? null; },
      oncommit: edit => { preview = null; commit(edit.source); },
      flipMs: 0,
    });
    return () => board?.destroy();
  });
</script>
<div class="circuit-editor">
  <p class="help">Drag a gate onto the circuit, or choose its wires and add it. Move a placed gate by dragging; drag it out to the left to remove it.</p>
  <div class="gate-palette">
    {#each q.gates! as item}<button aria-pressed={gate === item} onpointerdown={e => { gate = item; if (count < q.maxGates) board?.carryNew(droppable(item), e); }} onclick={() => gate = item}>{item === 'X' ? 'NOT' : item}</button>{/each}
  </div>
  <div class="wire-controls">
    <label>{span(gate) > 1 ? (gate === 'SWAP' ? 'First wire' : 'Control') : 'Wire'}
      <select bind:value={wire} aria-label="Gate wire or control">{#each [...q.shapes] as shape, i}<option value={i + 1}>{names[shape]}</option>{/each}</select>
    </label>
    {#if span(gate) > 1}<label>{gate === 'TOFFOLI' ? 'Other control' : gate === 'SWAP' ? 'Second wire' : 'Target'}
      <select bind:value={other} aria-label="Gate target or second control">{#each [...q.shapes] as shape, i}<option value={i + 1}>{names[shape]}</option>{/each}</select>
    </label>{/if}
    <button onclick={addGate} disabled={count >= q.maxGates}>Add gate</button>
    <button disabled={!history.length} onclick={() => { onchange(history.pop()!); note = ''; }}>Undo</button>
  </div>
  <div class="circuit-board" bind:this={host} onpointerdown={e => board?.press(e)} role="img" aria-label="Your circuit. Use the gate and wire controls to edit with a keyboard."></div>
  <div class="editor-actions"><span class="help">{count} / {q.maxGates} gates</span><button class="text-button" disabled={!value} onclick={() => { history.push(value); onchange(''); }}>Clear circuit</button></div>
  {#if note}<p class="help" role="status">{note}</p>{/if}
</div>
