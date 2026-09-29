---
id: classical-output
title: Track the shapes
week: 2
kind: state
source: Fall 2026 PS2, Two Bit Gates 1; adapted from earlier PS2.
qubits: 3
circuit: |
  in 110
  SWAP 2 3
  CNOT 2 -> 1
  X 3
---

Draw the final state. Follow each **shape** through the circuit.

## Solution

### Swap the square and triangle

The input is black circle, black square, white triangle. After SWAP it is black circle, white square, black triangle.

```misty
101
```

### Use the new control value

The square is now white, so CNOT leaves the circle alone. NOT on the triangle turns it white.
