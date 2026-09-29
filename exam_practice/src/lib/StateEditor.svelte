<script lang="ts">
  import { untrack } from 'svelte';
  import Figure from './Figure.svelte';
  let { qubits, shapes, value, onchange }: { qubits: number; shapes: string; value: string; onchange: (value: string) => void } = $props();
  type Term = { sign: number; bits: string[] };
  let terms = $state<Term[]>(untrack(() => [{ sign: 1, bits: Array(qubits).fill('?') }]));
  let page = $state(0);
  let typing = $state(false);
  const pageSize = 4;
  const names = { o: 'circle', s: 'square', '^': 'triangle', d: 'diamond' };
  function publish() { onchange(terms.map(t => `${t.sign < 0 ? '-' : ''}${t.bits.join('')}`).join('|')); }
  function cycle(i: number, wire: number) { const v = terms[i].bits[wire]; terms[i].bits[wire] = v === '?' ? '0' : v === '0' ? '1' : '?'; publish(); }
  function add() { terms.push({ sign: 1, bits: Array(qubits).fill('?') }); page = Math.floor((terms.length - 1) / pageSize); publish(); }
  function remove(i: number) { terms.splice(i, 1); page = Math.min(page, Math.floor((terms.length - 1) / pageSize)); publish(); }
</script>
<div class="state-editor">
  <p class="help">Tap each shape: blank → white → black. Add a possibility for each cloud term; repeat terms to increase an amplitude.</p>
  <div class="editor-mode"><button class="text-button" onclick={() => { typing = !typing; if (!typing) publish(); }}>{typing ? 'Use shape buttons' : 'Type a state instead'}</button></div>
  {#if typing}
    <label class="stack">State notation<input aria-label="State notation" value={value} oninput={e => onchange(e.currentTarget.value)} placeholder={qubits === 1 ? '0|-1' : '00|11'} spellcheck="false" autocomplete="off" /></label>
    <p class="help">0 = white, 1 = black, | separates terms, − changes a sign. Parentheses factor a state, e.g. (0|1)0.</p>
  {:else}
    <div class="term-list">
      {#each terms.slice(page * pageSize, (page + 1) * pageSize) as term, local}
        {@const i = page * pageSize + local}
        <div class="term-row">
          <span class="term-number">{i + 1}</span>
          <button class="sign-button" aria-label={`Sign of possibility ${i + 1}`} onclick={() => { terms[i].sign *= -1; publish(); }}>{term.sign < 0 ? '−' : '+'}</button>
          {#each term.bits as bit, wire}
            <button class="qubit-button" aria-label={`Possibility ${i + 1}, ${names[shapes[wire] as keyof typeof names]}: ${bit === '?' ? 'blank' : bit === '0' ? 'white' : 'black'}`} onclick={() => cycle(i, wire)}>
              <Figure source={`shape ${shapes[wire]}\n${bit}`} compact />
            </button>
          {/each}
          <button class="text-button remove" aria-label={`Remove possibility ${i + 1}`} disabled={terms.length === 1} onclick={() => remove(i)}>×</button>
        </div>
      {/each}
    </div>
    <div class="editor-actions">
      <button onclick={add} disabled={terms.length >= 16}>+ Possibility</button>
      {#if terms.length > pageSize}
        <button aria-label="Previous possibilities" disabled={page === 0} onclick={() => page--}>←</button>
        <span class="help">{page + 1}/{Math.ceil(terms.length / pageSize)}</span>
        <button aria-label="Next possibilities" disabled={(page + 1) * pageSize >= terms.length} onclick={() => page++}>→</button>
      {/if}
    </div>
  {/if}
  <div class="answer-preview"><Figure source={`shape ${shapes}\n${value || '?'.repeat(qubits)}`} label="Your state drawing" /></div>
</div>
