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

The input 00 contributes 00+01. Input 01 contributes 00−01. Input 10 contributes 10+11.

### Look for cancellation

The 01 contributions cancel exactly. The state contains 2×00, 10 and 11, but no 01. Its probability is zero.
