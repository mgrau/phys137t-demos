---
id: circuit-table
title: Follow three gates
week: 1
kind: truth-table
source: Adapted from Fall 2025 Midterm 1, Quantum Circuits; Fall 2026 Sample Midterm A 1(b).
qubits: 2
circuit: |
  CNOT 1 -> 2
  X 1
  SWAP 1 2
---

Fill the output for each input, working **down the circuit**. The order is circle, square.

## Solution

### Apply CNOT first

Flip the square only when the input circle is black. Keep the circle unchanged at this step.

### Apply NOT, then SWAP

Flip the circle. Finally exchange the two colors. Keep these steps in the drawn order. For a white circle and white square:

```misty
00 -> 00 -> 10 -> 01
```
