---
id: partial
title: Measure only the square
week: 3
kind: probability
source: Fall 2026 PS3, Partial Measurement 2; adapted from earlier PS3.
qubits: 2
circuit: "in 00|00|01|11"
events:
  - {label: White square, pattern: "?0"}
  - {label: Black square, pattern: "?1"}
---

Measure **only the square**. The circle is not measured. Give the square’s color probabilities.

## Solution

### Combine identical complete patterns

The amplitudes are 2 for `misty: 00`, 1 for `misty: 01` and 1 for `misty: 11`. Their squared weights are 4, 1 and 1.

### Group by the measured square

White square collects weight 4. Black square collects 1 + 1 = 2 from two different circle states. Divide by 6; do not add those two distinct amplitudes before squaring.
