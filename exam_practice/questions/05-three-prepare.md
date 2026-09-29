---
id: three-prepare
title: Build a signed three-qubit state
week: 5
kind: circuit
source: Fall 2026 PS5, Entanglement Generator 1; adapted from earlier PS5.
qubits: 3
input: "000"
target: "010|-101"
gates: [H, X, CNOT, SWAP]
maxGates: 10
example: |
  X 1
  X 2
  H 1
  CNOT 1 -> 2
  CNOT 1 -> 3
---

Prepare the displayed target from three white qubits. Keep the **relative minus sign**.

## Solution

### Prepare the signs and opposite square

Apply NOT to circle and square, giving `misty: 110`. H on the black circle creates a minus cloud:

```misty
010|-110
```

### Use the circle as control twice

CNOT from circle to square flips the square only in the negative term. CNOT from circle to triangle then flips its triangle. The positive term stays unchanged:

```misty
010|-110 -> 010|-100 -> 010|-101
```
