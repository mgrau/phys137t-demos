# Bell test

The Hardy-style coin game from PHYS 137T PS5, using the course’s circle/square
and signed-cloud notation. This is an ideal quantum simulation, not physical
experimental evidence and not a polarization-angle CHSH simulator.

```
npm install
npm run dev       # http://127.0.0.1:5176
npm run check
npm test
npm run test:browser
npm run build
```

Start with shared answer sheets, then compare the entangled pair `00|01|10`.
Heads means measure directly; tails means H followed by measurement. The
failure events are HH/11, HT/01, TH/10; TT/11 earns a point. Other outcomes
are allowed without a point. Do not substitute the trivial “black iff tails”
game for these four rules.

Quantum weights and displayed intermediate clouds come from the same
`misty-states/kernel` circuit. Sampling never assigns probability to a zero
weight. Both qubits are explicitly measured, and the final diagram displays
the sampled joint outcome. White/black values never invert in dark mode.

Fair-coin runs count toward the table. Forced settings are guided practice and
do not count. Each model has independent totals; changing a local plan resets
its totals. The conditional Bell difference uses each setting’s own denominator,
waits for all four settings, and warns that positive finite-sample differences
are not a significance test. The quantum prediction is 1/12 per TT trial,
1/48 per random-coin trial, with zero ideal failures.

Public demo: <https://mgrau.github.io/phys137t-demos/bell_test/>.
The collection's build, checks, and Pages workflow include this app. Its Canvas
page is “Lecture 10 — Interactive Exercise: Bell Test” in Unit 2, after the
Lecture 10 recording. The Canvas HTML source is `canvas/demo_bell_test.html`
in the Fall 2026 course repository.

For class: try the default answer sheet, keep both tails answers black and
change the heads answers, then compare with 1,000 entangled rounds. Explore
fixed coins and reveal the intermediate cloud to explain the cancellations.
The notes and PS5 give all four rules; omitting the mixed-coin failures changes
the game into one with a trivial classical solution.

Tests check every local plan, all four quantum distributions, no-signalling,
sampling boundaries and uncertainty, separate practice totals, browser controls,
small screens, and invariant qubit colors in dark mode. The first browser test
run may require `npx playwright install chromium`.
