<script lang="ts">
  import { BANK } from './lib/bank';
  import { WEEKS } from './lib/questions';
  import { diagramOf, emptyAnswer, finalStep, grade, type Answer, type Verdict } from './lib/engine';
  import { freshProgress, loadProgress, recordCheck, shuffled, type Progress } from './lib/session';
  import { theme } from './lib/theme.svelte';
  import Figure from './lib/Figure.svelte';
  import RichText from './lib/RichText.svelte';
  import AnswerEditor from './lib/AnswerEditor.svelte';
  import Fit from './lib/Fit.svelte';

  const params = new URLSearchParams(location.search);
  const startWeek = Number(params.get('week'));
  let week = $state(Number.isInteger(startWeek) && startWeek >= 1 && startWeek <= 5 ? startWeek : 0);
  const requested = BANK.find(q => q.id === params.get('q') && (!week || q.week === week));
  let deck = shuffled(BANK.filter(q => !week || q.week === week).map(q => q.id));
  let qId = $state(requested?.id ?? deck.pop()!);
  deck = deck.filter(id => id !== qId);
  let trail = $state<string[]>([]);
  let revision = $state(0);
  let answer = $state<Answer>(emptyAnswer());
  let report = $state<Verdict | null>(null);
  let records = $state<Record<string, Progress>>({});
  let saved = $state(true);
  try { records = loadProgress(localStorage); } catch { saved = false; }
  let attempts = $state(Math.max(1, Math.min(10, Math.round(Number(params.get('attempts')) || 3))));
  let showingSolution = $state(false);
  let step = $state(0);
  let tab = $state<'question' | 'answer'>('question');
  const q = $derived(BANK.find(q => q.id === qId)!);
  const filtered = $derived(BANK.filter(q => !week || q.week === week));
  const progress = $derived(records[qId] ?? freshProgress());
  const canReveal = $derived(progress.wrong.length >= attempts || progress.solved || progress.revealed);
  const steps = $derived([...q.steps, finalStep(q)]);
  const diagram = $derived(diagramOf(q));
  const independent = $derived(BANK.filter(q => records[q.id]?.independent).length);
  const withHelp = $derived(BANK.filter(q => records[q.id]?.solved && !records[q.id]?.independent).length);
  const kindLabel = { choice: 'Concept check', number: 'Calculate', probability: 'Measurement', state: 'Draw a state', 'truth-table': 'Truth table', circuit: 'Build a circuit' };

  function save() {
    try { localStorage.setItem('phys137t-exam-practice-v1', JSON.stringify(records)); saved = true; }
    catch { saved = false; }
  }
  function pick(id: string, remember = true) {
    if (remember && id !== qId) trail.push(qId);
    qId = id; revision++; answer = emptyAnswer(); report = null; showingSolution = false; step = 0; tab = 'question';
    const url = new URL(location.href); url.searchParams.set('q', id);
    if (week) url.searchParams.set('week', String(week)); else url.searchParams.delete('week');
    history.replaceState(null, '', url);
  }
  function next() {
    if (!deck.length) deck = shuffled(filtered.map(q => q.id).filter(id => id !== qId));
    const id = deck.pop(); if (id) pick(id);
  }
  function changeWeek(value: number) {
    week = value; deck = shuffled(BANK.filter(q => !week || q.week === week).map(q => q.id));
    pick(deck.pop()!);
  }
  function edit(a: Answer) { answer = a; report = null; }
  function check() {
    const verdict = grade(q, answer);
    const fingerprint = JSON.stringify({ ...answer, selected: [...answer.selected].sort() });
    const duplicate = verdict.status === 'incorrect' && progress.wrong.includes(fingerprint);
    records[qId] = recordCheck(progress, fingerprint, verdict);
    report = duplicate ? { ...verdict, message: 'This answer was already checked. Make a change before trying again.' } : verdict;
    tab = 'answer'; save();
  }
  function reveal() {
    records[qId] = { ...progress, revealed: true }; save();
    showingSolution = true; step = 0; tab = 'answer';
  }
</script>

<div class="app-shell">
  <header class="masthead">
    <div class="brand"><span class="course">PHYS 137T</span><h1>Exam practice</h1></div>
    <div class="header-right"><span class="progress-count"><strong>{independent}</strong> / {BANK.length} solved<span class="help">{withHelp ? ` · ${withHelp} with help` : ' · Weeks 1–5'}</span></span><button class="theme-button" aria-label={`Switch to ${theme.current === 'light' ? 'dark' : 'light'} theme`} onclick={() => theme.toggle()}>{theme.current === 'light' ? '☾' : '☀'}</button></div>
  </header>

  <nav class="filters" aria-label="Choose practice questions">
    <label class="week-filter"><span>Practice</span><select aria-label="Practice category" value={week} onchange={e => changeWeek(Number(e.currentTarget.value))}><option value={0}>All five weeks · mixed</option>{#each WEEKS as title, i}<option value={i + 1}>Week {i + 1} · {title}</option>{/each}</select></label>
    <label class="question-filter"><span>Question</span><select aria-label="Choose question" value={qId} onchange={e => { const id = e.currentTarget.value; deck = deck.filter(v => v !== id); pick(id); }}>{#each filtered as question}<option value={question.id}>{records[question.id]?.solved ? '✓ ' : ''}{question.title}</option>{/each}</select></label>
    <div class="nav-buttons"><button aria-label="Previous question" disabled={!trail.length} onclick={() => { const id = trail.pop()!; if (week && BANK.find(q => q.id === id)!.week !== week) { week = 0; deck = shuffled(BANK.map(q => q.id).filter(qid => qid !== id)); } pick(id, false); }}>←</button><button class="next-button" onclick={next}>Next question <span aria-hidden="true">→</span></button></div>
  </nav>

  <div class="mobile-tabs" role="group" aria-label="Practice panels"><button aria-pressed={tab === 'question'} onclick={() => tab = 'question'}>Question</button><button aria-pressed={tab === 'answer'} onclick={() => tab = 'answer'}>{showingSolution ? 'Solution' : 'Your answer'}</button></div>

  <main class="workspace">
    <section class="panel question-panel" class:mobile-hidden={tab !== 'question'} aria-label="Question">
      <div class="panel-eyebrow"><span>WEEK {q.week}</span><span>{kindLabel[q.kind]}</span></div>
      <Fit>
        <h2>{q.title}</h2>
        <RichText text={q.prompt} shapes={q.shapes} />
        {#if diagram}<div class="question-figure"><Figure source={diagram} label={`Question diagram: ${q.title}. ${q.kind === 'circuit' ? `Input ${q.input}; target ${q.target}` : q.circuit ?? q.diagram}`} /></div>{/if}
        {#if q.qubits > 1}<p class="shape-order">Shape order: {[...q.shapes].map(s => ({o:'circle',s:'square','^':'triangle',d:'diamond'})[s]).join(' · ')}<br />{q.circuit?.includes('\n') || q.kind === 'circuit' ? 'Read circuits from top to bottom.' : ''}</p>{/if}
      </Fit>
      <p class="provenance">{q.source}</p>
      <button class="mobile-answer primary" onclick={() => tab = 'answer'}>Work on your answer →</button>
    </section>

    <section class="panel answer-panel" class:mobile-hidden={tab !== 'answer'} aria-label={showingSolution ? 'Worked solution' : 'Your answer'}>
      <div class="panel-eyebrow"><span>{showingSolution ? 'WORKED SOLUTION' : 'YOUR TURN'}</span><span>{showingSolution ? `${step + 1} / ${steps.length}` : `${progress.wrong.length} incorrect ${progress.wrong.length === 1 ? 'attempt' : 'attempts'}`}</span></div>
      <div class="answer-body" class:hidden={showingSolution}>
        <Fit>{#key `${qId}:${revision}`}<AnswerEditor question={q} {answer} onchange={edit} />{/key}</Fit>
      </div>
      {#if showingSolution}
        <Fit><RichText text={steps[step]} shapes={q.shapes} /></Fit>
        <div class="solution-controls"><button disabled={step === 0} onclick={() => step--}>← Back</button><button class="text-button" onclick={() => showingSolution = false}>Your answer</button><button class="primary" disabled={step === steps.length - 1} onclick={() => step++}>Next step →</button></div>
      {:else}
        <div class="feedback" class:correct={report?.status === 'correct'} class:incorrect={report?.status === 'incorrect'} role="status" aria-live="polite">
          {#if report}<span class="feedback-label">{report.status === 'correct' ? '✓ Correct' : report.status === 'incorrect' ? 'Try again' : 'Finish your answer'}</span><span>{report.status === 'correct' ? (!progress.independent ? 'Solved with help. Try another question to practice on your own.' : 'Explore the solution, or try another question.') : report.message}</span>
          {:else}<span>{canReveal ? 'A worked solution is available whenever you want it.' : 'Take your time. Your answer is checked only when you ask.'}</span>{/if}
        </div>
        <div class="check-controls"><button class="primary check-button" onclick={check}>Check answer</button>{#if canReveal}<button onclick={reveal}>Show solution</button>{:else}<span class="help">Solution offered after {attempts} incorrect attempts.</span>{/if}</div>
      {/if}
    </section>
  </main>

  <footer class="footer"><span>{saved ? 'Practice only · progress saved in this browser' : 'Practice only · progress lasts for this session'}</span><label>Offer help after <select aria-label="Incorrect attempts before solution" bind:value={attempts}>{#each [1,2,3,4,5,6,7,8,9,10] as n}<option value={n}>{n}</option>{/each}</select> tries</label></footer>
</div>
