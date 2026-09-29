---
id: joint
title: Measure both qubits
week: 3
kind: probability
source: Fall 2026 PS3, Misty State Probability 4; adapted from earlier PS3.
qubits: 2
circuit: "in 00|00|00|-11"
events:
  - {label: White circle and white square, pattern: "00"}
  - {label: Black circle and black square, pattern: "11"}
  - {label: Opposite colors (white circle), pattern: "01"}
---

Both qubits are measured. Find the probabilities of the listed complete patterns.

## Solution

### Treat each complete pattern as a unit

White-white appears three times. Black-black appears once with a minus sign. The two opposite-color patterns do not appear.

### Square the combined amplitudes

The weights are 9 for white-white and 1 for black-black, for a total of 10. Any absent pattern has probability zero.
