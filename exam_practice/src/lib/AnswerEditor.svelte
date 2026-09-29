<script lang="ts">
  import { untrack } from 'svelte';
  import type { Question } from './questions';
  import { expected, type Answer } from './engine';
  import Figure from './Figure.svelte';
  import StateEditor from './StateEditor.svelte';
  import CircuitEditor from './CircuitEditor.svelte';
  import { shuffled } from './session';
  let { question: q, answer, onchange }: { question: Question; answer: Answer; onchange: (a: Answer) => void } = $props();
  let tablePage = $state(0);
  const optionOrder = untrack(() => shuffled((q.options ?? []).map((_, i) => i)));
  function value(i: number, text: string) { const values = [...answer.values]; values[i] = text; onchange({ ...answer, values }); }
  function choice(i: number) {
    const multi = q.answer!.length > 1;
    onchange({ ...answer, selected: multi ? answer.selected.includes(i) ? answer.selected.filter(n => n !== i) : [...answer.selected, i] : [i] });
  }
  const names: Record<string, string> = { o: 'circle', s: 'square', '^': 'triangle', d: 'diamond' };
</script>
{#if q.kind === 'choice'}
  <p class="help">{q.answer!.length > 1 ? 'Select all that apply.' : 'Choose one answer.'}</p>
  <div class="choices" role="group" aria-label="Answer choices">
    {#each optionOrder as i, displayed}
      {@const option = q.options![i]}
      <button class="choice" class:diagram-choice={typeof option !== 'string'} class:selected={answer.selected.includes(i + 1)} aria-pressed={answer.selected.includes(i + 1)} onclick={() => choice(i + 1)}>
        <span class="choice-mark">{answer.selected.includes(i + 1) ? '✓' : String.fromCharCode(65 + displayed)}</span>
        {#if typeof option === 'string'}<span>{option}</span>
        {:else}<Figure source={`shape ${q.shapes}\n${option.state}`} label={option.label} variant="choice" />{/if}
      </button>
    {/each}
  </div>
{:else if q.kind === 'number' || q.kind === 'probability'}
  <p class="help">{q.kind === 'probability' ? 'Use a fraction, decimal, or percentage: 1/2 = 0.5 = 50%.' : 'Enter a number or fraction, such as 3 or 1/6.'}</p>
  <div class="number-fields">
    {#each q.kind === 'number' ? q.fields! : q.events! as field, i}
      <label class="number-field"><span>{field.label}</span><input aria-label={field.label} inputmode="text" autocomplete="off" value={answer.values[i] ?? ''} oninput={e => value(i, e.currentTarget.value)} placeholder="Your answer" /></label>
    {/each}
  </div>
{:else if q.kind === 'state'}
  <StateEditor qubits={q.qubits} shapes={q.shapes} value={answer.text} onchange={text => onchange({ ...answer, text })} />
{:else if q.kind === 'circuit'}
  <CircuitEditor question={q} value={answer.text} onchange={text => onchange({ ...answer, text })} />
{:else}
  {@const rows = expected(q).rows!}
  <p class="help">Tap an output shape: blank → white → black. Input order: {[...q.shapes].map(s => names[s]).join(', ')}.</p>
  <table class="truth-table"><thead><tr><th>Input</th><th>Output</th></tr></thead><tbody>
    {#each rows.slice(tablePage * 4, (tablePage + 1) * 4) as input, local}
      {@const i = tablePage * 4 + local}
      <tr><td><Figure source={`shape ${q.shapes}\n${input}`} label={`Input ${input}`} compact /></td><td><div class="truth-output">
        {#each [...q.shapes] as shape, wire}
          {@const bit = (answer.values[i] ?? '?'.repeat(q.qubits))[wire]}
          <button class="qubit-button" aria-label={`Input ${input}, output ${names[shape]}: ${bit === '?' ? 'blank' : bit === '0' ? 'white' : 'black'}`} onclick={() => {
            const bits = [...(answer.values[i] ?? '?'.repeat(q.qubits))]; bits[wire] = bit === '?' ? '0' : bit === '0' ? '1' : '?'; value(i, bits.join(''));
          }}><Figure source={`shape ${shape}\n${bit}`} compact /></button>
        {/each}
      </div></td></tr>
    {/each}
  </tbody></table>
  {#if rows.length > 4}<div class="editor-actions"><button disabled={tablePage === 0} onclick={() => tablePage--}>← Rows</button><span>{tablePage + 1}/{rows.length / 4}</span><button disabled={(tablePage + 1) * 4 >= rows.length} onclick={() => tablePage++}>Rows →</button></div>{/if}
{/if}
