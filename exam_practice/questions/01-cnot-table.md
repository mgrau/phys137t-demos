---
id: cnot-table
title: Read a controlled NOT
week: 1
kind: truth-table
source: Fall 2026 PS2, Classical CNOT Gate; earlier PS2.
qubits: 2
circuit: |
  CNOT 2 -> 1
---

Complete the truth table. The **square controls the circle**.

## Solution

### Find the control

The square is wire 2. Its value stays unchanged.

### Decide whether to flip

If the square is white, leave the circle alone. If the square is black, flip the circle. Apply that rule to all four inputs.
