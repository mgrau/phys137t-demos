---
id: bell-prepare
title: Build an entangled pair
week: 5
kind: circuit
source: Adapted from Fall 2025 Midterm 1, Entanglement 4.1; Fall 2026 PS4, Quantum Gates 1.
qubits: 2
input: "00"
target: "00|11"
gates: [H, X, CNOT, SWAP]
maxGates: 8
example: |
  H 1
  CNOT 1 -> 2
---

Starting with both qubits white, prepare the target entangled state. **Any circuit with the correct output counts.**

## Solution

### Create two circle possibilities

Apply H to the circle. The square remains white:

```misty
00|10
```

### Correlate the square with the circle

Use the circle as CNOT control and square as target. The white-circle possibility stays unchanged; the black-circle possibility flips the square:

```misty
00 -> 00
10 -> 11
```
