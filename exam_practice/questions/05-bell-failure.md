---
id: bell-failure
title: An impossible Bell-game event
week: 5
kind: probability
source: Fall 2026 PS5, Bell Test; Fall 2026 lecture 10.
qubits: 2
circuit: |
  in 00|01|10
  H 2
events:
  - {label: White circle and black square, pattern: "01"}
---

Alice measures her circle directly. Bob applies H to his square and measures. What is the probability of **white circle and black square**, the forbidden result for this setting?

## Solution

### Apply H only to the square

Keep the circle as it is and apply H to each square:

```misty
00 -> 00|01
01 -> 00|-01
10 -> 10|11
```

### Look for cancellation

The white-circle, black-square contributions cancel exactly. The remaining cloud has no such possibility, so its probability is zero:

```misty
00|00|10|11
```
