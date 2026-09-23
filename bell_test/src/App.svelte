<script lang="ts">
  import { onDestroy } from 'svelte';
  import Figure from './lib/Figure.svelte';
  import { theme } from './lib/theme.svelte';
  import {
    SETTINGS, OUTCOMES, EVENT, COINS, COLORS, ALL_PLANS, SHARED_CLOUD,
    classify, localOutcome, prediction, fraction, sampleRound, emptyStats,
    record, rowTotal, bellDifference, expectedDifference, diagram,
    settingLabel, outcomeLabel,
    type Mode, type Plan, type Setting, type Round,
  } from './lib/bell';

  let mode = $state<Mode>('local');
  let plan = $state<Plan>([0, 1, 0, 1]);
  let choice = $state<'random' | Setting>('random');
  let results = $state({ local: emptyStats(), quantum: emptyStats() });
  let round = $state<Round | null>(null);
  let phase = $state(0);
  let playing = $state(false);
  let showState = $state(false);
  let showTheory = $state(false);
  let showPlans = $state(false);
  let notice = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const embedded = window.self !== window.top;
  const stats = $derived(results[mode]);
  const locked = $derived(phase === 1 || phase === 2);
  const difference = $derived(bellDifference(stats));
  const setting = $derived(round?.setting ?? 'HH');
  const stageLabels = ['Prepare', 'Flip coins', 'Use local rule', 'Measure / report'];
  const status = $derived(phase === 0 ? 'Ready for a fresh round.' : phase === 1
    ? `Coins: ${settingLabel(setting)}. Each player knows only their own coin.`
    : phase === 2 ? mode === 'quantum'
      ? 'Apply H on tails; do nothing on heads. Predict the possible colors before measuring.'
      : 'Each player reads the answer on their own sheet. Neither sees the other coin.'
    : round ? `${outcomeLabel(round.outcome)}: ${round.kind === 'point' ? 'one point' : round.kind === 'failure' ? 'a failure' : 'allowed, no point'}.` : '');

  function stop() { clearTimeout(timer); timer = undefined; playing = false; }
  onDestroy(stop);
  function changeMode(next: Mode) {
    if (locked || next === mode) return;
    stop(); mode = next; round = null; phase = 0; choice = 'random'; notice = '';
  }
  function changePlan(next: Plan) {
    if (locked) return;
    plan = [...next]; round = null; phase = 0;
    results = { ...results, local: emptyStats() };
    notice = 'Answers changed. Local results cleared so different plans are not mixed.';
  }
  function toggleAnswer(index: number) {
    const next: Plan = [...plan]; next[index] = next[index] === 0 ? 1 : 0; changePlan(next);
  }
  function start() {
    round = sampleRound(mode, plan, choice === 'random' ? undefined : choice);
    phase = 1; notice = '';
  }
  function advance() {
    if (phase === 0 || phase === 3) { start(); return; }
    if (phase === 1) { phase = 2; return; }
    if (round) results = { ...results, [mode]: record(results[mode], round) };
    phase = 3;
  }
  function play() {
    if (playing) { stop(); return; }
    if (!locked) start();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      while (phase < 3) advance(); return;
    }
    playing = true;
    const tick = () => {
      advance();
      if (phase < 3) timer = setTimeout(tick, 850);
      else stop();
    };
    timer = setTimeout(tick, 850);
  }
  function batch() {
    if (locked || choice !== 'random') return;
    let next = results[mode];
    for (let i = 0; i < 1000; i++) {
      round = sampleRound(mode, plan); next = record(next, round);
    }
    results = { ...results, [mode]: next }; phase = 3;
    notice = 'Added 1,000 fresh rounds with independently sampled fair coins. The diagram shows the last round.';
  }
  function reset() {
    stop(); results = { ...results, [mode]: emptyStats() }; phase = 0; round = null; notice = '';
  }
  function changeSetting() { stop(); round = null; phase = 0; notice = ''; }
  function percent(n: number, d: number) { return d ? `${(100 * n / d).toFixed(1)}%` : '—'; }
  function signedPercent(value: number) { return `${value > 0 ? '+' : ''}${(100 * value).toFixed(1)}`; }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { notice = 'Fullscreen is unavailable here. Open the activity in its own tab for more room.'; }
  }
</script>

<svelte:head><title>Bell test — PHYS 137T</title></svelte:head>

<main class="shell">
  <header class="masthead">
    <div>
      <p class="eyebrow">PHYS 137T · Lecture 10</p>
      <h1>Can shared plans beat a Bell test?</h1>
      <p class="subtitle">Two players. Two independent coins. No messages during a round.</p>
    </div>
    <div class="header-actions">
      {#if !embedded}<button onclick={() => theme.toggle()} aria-label={`Switch to ${theme.current === 'light' ? 'dark' : 'light'} mode`}>{theme.current === 'light' ? 'Dark' : 'Light'} mode</button>{/if}
      <button onclick={fullscreen}>Fullscreen</button>
    </div>
  </header>

  <section class="mission" aria-labelledby="mission-title">
    <div><h2 id="mission-title">Earn points. Avoid every failure.</h2>
      <p>Alice has the <strong>circle</strong>; Bob has the <strong>square</strong>.
        Each flips a coin and reports a color. These four special cases define the game.
        Every other result is allowed but earns no point.</p></div>
    <div class="rules" aria-label="Rules for the four coin combinations">
      {#each SETTINGS as s}
        <div class="rule">
          <span class="coin-pair">{settingLabel(s)}</span>
          <div class="rule-pair"><Figure source={EVENT[s]} label={outcomeLabel(EVENT[s])} id={`rule-${s}`} scale={0.8} />
            <strong class:point={s === 'TT'}>{s === 'TT' ? 'Point' : 'Failure'}</strong></div>
        </div>
      {/each}
    </div>
  </section>

  <div class="workspace">
    <section class="panel experiment" aria-labelledby="experiment-title">
      <h2 id="experiment-title">Try a strategy</h2>
      <div class="segmented" role="group" aria-label="Model">
        <button aria-pressed={mode === 'local'} disabled={locked} onclick={() => changeMode('local')}>1 · Shared answer sheets</button>
        <button aria-pressed={mode === 'quantum'} disabled={locked} onclick={() => changeMode('quantum')}>2 · Entangled qubits</button>
      </div>

      {#if mode === 'local'}
        <p class="instruction">Agree on answers <strong>before</strong> the coins are flipped.
          Click a qubit to change its color. Can you keep a chance of a point but remove all failures?</p>
        <div class="players">
          {#each ['Alice', 'Bob'] as name, person}
            <section class="player" aria-label={`${name}'s answer sheet`}>
              <h3>{name} <span>· {person === 0 ? 'circle' : 'square'}</span></h3>
              {#each ['Heads', 'Tails'] as coin, c}
                {@const index = person * 2 + c}
                <div class="answer-row">
                  <span>On {coin.toLowerCase()}</span>
                  <button class="qubit-button" disabled={locked} onclick={() => toggleAnswer(index)}
                    aria-label={`${name}: ${COLORS[plan[index]]} on ${coin.toLowerCase()}. Change answer.`}>
                    <Figure source={`shape ${person === 0 ? 'o' : 's'}\n${plan[index]}`} label={`${COLORS[plan[index]]} ${person === 0 ? 'circle' : 'square'}`} id={`plan-${index}`} scale={1} />
                    <span>{COLORS[plan[index]]}</span>
                  </button>
                </div>
              {/each}
            </section>
          {/each}
        </div>
      {:else}
        <p class="instruction">Start each round with this <strong>fresh entangled pair</strong>.
          On heads, measure directly. On tails, apply H, then measure. The players choose a measurement, not its result.</p>
        <label class="check"><input type="checkbox" bind:checked={showState} /> Show the quantum state after the gates</label>
      {/if}

      <div class="run-controls">
        <label>Coins
          <select bind:value={choice} onchange={changeSetting} disabled={locked} aria-label="Coin selection">
            <option value="random">Independent fair coins</option>
            {#each SETTINGS as s}<option value={s}>Explore: {settingLabel(s)}</option>{/each}
          </select>
        </label>
        <div class="buttons">
          <button class="primary" onclick={play}>{playing ? 'Pause' : locked ? 'Continue round' : 'Run one round'}</button>
          <button onclick={advance} disabled={playing}>Step</button>
          <button onclick={batch} disabled={locked || choice !== 'random'}>+1,000 rounds</button>
          <button class="quiet" onclick={reset}>Clear this run</button>
        </div>
      </div>
      {#if choice !== 'random'}<p class="practice">Fixed coins are practice only. These rounds do not enter the Bell-test totals.</p>{/if}

      <ol class="steps" aria-label="Round progress">
        {#each stageLabels as label, i}<li class:active={phase === i} aria-current={phase === i ? 'step' : undefined}>{i + 1}. {label}</li>{/each}
      </ol>
      <div class="coin-results" aria-label="Current coin results">
        <span>Alice <strong>{round ? COINS[setting[0] as 'H' | 'T'] : '—'}</strong></span>
        <span>Bob <strong>{round ? COINS[setting[1] as 'H' | 'T'] : '—'}</strong></span>
      </div>

      <div class="scene" class:working={playing}>
        {#if mode === 'quantum'}
          <Figure source={phase === 0
            ? `shape os\nin ${SHARED_CLOUD}\nblank 1-2\nmeasure 1 Z; measure 2 Z`
            : diagram(setting, phase, showState, round?.outcome)}
            label={phase === 0 ? 'The shared three-part cloud, a blank row awaiting the coin choices, and one measurement meter per qubit.'
              : `Alice circle and Bob square. ${settingLabel(setting)}. ${phase === 3 && round ? `Measured ${outcomeLabel(round.outcome)}.` : 'Measurement has not yet been reported.'}`}
            id="experiment" scale={1.2} />
          {#if phase === 0}<p class="scene-caption">The empty row will become I or H when the coins are chosen.</p>{/if}
        {:else if phase === 3 && round}
          <Figure source={round.outcome} label={`Reported colors: ${outcomeLabel(round.outcome)}`} id="local-result" scale={1.8} />
        {:else}
          <p class="waiting">{phase === 0 ? 'Choose the answers above, then flip the coins.' : 'Each player follows their own answer sheet.'}</p>
        {/if}
      </div>
      <div class="round-result" class:point={phase === 3 && round?.kind === 'point'} class:failure={phase === 3 && round?.kind === 'failure'} aria-live="polite" aria-atomic="true">
        {status}
        {#if phase === 3 && round && !round.counted}<span>Practice round · not counted.</span>{/if}
      </div>
      {#if notice}<p class="notice" role="status">{notice}</p>{/if}
    </section>

    <section class="panel data" aria-labelledby="data-title">
      <div class="section-heading"><h2 id="data-title">The evidence across all four settings</h2>
        <span class="model-label">{mode === 'local' ? 'This answer sheet' : 'Entangled pair'}</span></div>
      <div class="totals" aria-live="polite" aria-atomic="true">
        <div><strong data-testid="trials">{stats.total.toLocaleString()}</strong><span>random-coin rounds</span></div>
        <div><strong data-testid="points">{stats.points.toLocaleString()}</strong><span>points</span></div>
        <div><strong data-testid="failures">{stats.failures.toLocaleString()}</strong><span>failures</span></div>
      </div>
      <p class="table-help">Each row is one coin combination. Percentages use <strong>that row’s</strong> total. Alice’s circle is first.</p>
      <div class="table-scroll">
        <table class="results-table">
          <caption class="sr-only">Counts and percentages of reported pairs for each coin combination</caption>
          <thead><tr><th scope="col">Coins / rounds</th>
            {#each OUTCOMES as out}<th scope="col"><Figure source={out} label={outcomeLabel(out)} id={`column-${out}`} scale={0.75} /></th>{/each}
          </tr></thead>
          <tbody>{#each SETTINGS as s}
            <tr><th scope="row"><span>{settingLabel(s)}</span><small>{rowTotal(stats, s).toLocaleString()} rounds</small></th>
              {#each OUTCOMES as out}
                {@const kind = classify(s, out)}
                <td class:event={kind !== 'allowed'} class:point-cell={kind === 'point'}>
                  <strong>{stats.rows[s][out]}</strong>
                  <small>{percent(stats.rows[s][out], rowTotal(stats, s))}</small>
                  {#if kind !== 'allowed'}<span class="event-label">{kind}</span>{/if}
                </td>
              {/each}
            </tr>
          {/each}</tbody>
        </table>
      </div>
      <p class="inference">The challenge is the <strong>combination</strong>: a point sometimes on tails–tails,
        with none of the three failures on the other settings. One matching pair of colors is not a Bell test.</p>
      <label class="check"><input type="checkbox" bind:checked={showTheory} /> Compare with the predicted probabilities</label>
      {#if showTheory}
        <table class="prediction-table">
          <caption>Probability of the marked event in each row</caption>
          <thead><tr><th scope="col">Coins</th><th scope="col">Event</th><th scope="col">Prediction</th></tr></thead>
          <tbody>{#each SETTINGS as s}
            {@const p = prediction(mode, plan, s)}
            <tr><th scope="row">{settingLabel(s)}</th><td>{s === 'TT' ? 'point' : 'failure'}</td><td>{fraction(p.weights[EVENT[s]], p.total)}</td></tr>
          {/each}</tbody>
        </table>
        {#if mode === 'quantum'}<p class="small">The point chance is <strong>1/12 on tails–tails</strong>, or <strong>1/48 per random-coin round</strong>.
          That is an average, not a point guaranteed every 48 rounds.</p>{/if}
      {/if}
      <details class="bell-bound">
        <summary>The Bell bound: compare rates, not just counts</summary>
        <p>Take the tails–tails point rate and subtract all three failure rates (one from each other row).
          Every local answer sheet, and every random mixture of such sheets chosen before the coins, has a predicted difference ≤ 0.</p>
        <p class="difference">Observed: <strong data-testid="difference">{difference === null ? 'waiting for all four settings' : `${signedPercent(difference)} percentage points`}</strong></p>
        {#if showTheory}<p>Prediction: <strong>{signedPercent(expectedDifference(mode, plan))} percentage points</strong>.</p>{/if}
        <p>A finite run can fluctuate above zero even for a local plan. Zero observed failures does not establish zero probability.
          This display is not a significance test.</p>
      </details>
    </section>
  </div>

  <section class="panel explanation" aria-labelledby="explanation-title">
    <h2 id="explanation-title">What should we try next?</h2>
    <ol class="prompts">
      <li><strong>Start with answer sheets.</strong> Make both tails answers black. Change the heads answers to avoid failures. Which failure moves somewhere else?</li>
      <li><strong>Try entangled qubits.</strong> Run many rounds. Then explore heads–tails and turn on the quantum state. Which two parts cancel?</li>
      <li><strong>Compare all four settings.</strong> Why do points with no failures matter together? Can Alice tell Bob’s coin from her own results alone?</li>
    </ol>
    <button class="quiet" aria-expanded={showPlans} onclick={() => showPlans = !showPlans}>{showPlans ? 'Hide' : 'Inspect'} all 16 local answer sheets</button>
    {#if showPlans}
      <p>There are four answers to choose, so only 16 sheets. “Point possible” means both tails answers are black.
        Every such sheet has at least one failure setting. Mixing sheets cannot cancel a positive chance of failure.</p>
      <div class="table-scroll"><table class="plans-table">
        <caption>The local possibilities — each answer depends only on that player’s own coin.</caption>
        <thead><tr><th scope="col">Alice heads</th><th scope="col">Alice tails</th><th scope="col">Bob heads</th><th scope="col">Bob tails</th><th scope="col">Point possible?</th><th scope="col">Failure settings</th><th scope="col">Try it</th></tr></thead>
        <tbody>{#each ALL_PLANS as p, i}
          <tr>{#each p as bit, j}<td><Figure source={`shape ${j < 2 ? 'o' : 's'}\n${bit}`} label={COLORS[bit]} id={`all-${i}-${j}`} scale={0.7} /></td>{/each}
            <td>{classify('TT', localOutcome(p, 'TT')) === 'point' ? 'Yes' : 'No'}</td>
            <td>{SETTINGS.filter(s => classify(s, localOutcome(p, s)) === 'failure').map(settingLabel).join('; ') || 'None'}</td>
            <td><button disabled={locked} aria-label={`Try answer sheet ${i + 1}`} onclick={() => { changeMode('local'); changePlan(p); }}>Use</button></td>
          </tr>
        {/each}</tbody>
      </table></div>
    {/if}
  </section>
  <footer>
    <p><strong>An ideal simulation, not a physical Bell experiment.</strong> This is the Hardy-style coin game from PS5.
      The computer samples the joint probabilities predicted by the circuit. A real experiment needs physical pairs,
      independent setting choices, and statistical checks for noise and experimental loopholes.</p>
    <p>Local and quantum runs keep separate totals. Changing an answer sheet clears its old data.
      No student data is collected or sent anywhere.</p>
  </footer>
</main>
