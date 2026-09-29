---
id: bell-probabilities
title: Both players choose H
week: 5
kind: probability
source: Fall 2026 PS5, Bell Test 1; adapted from Fall 2024 practice midterm measurement.
qubits: 2
circuit: |
  in 00|01|10
  H 1; H 2
events:
  - {label: White–white, pattern: "00"}
  - {label: White–black, pattern: "01"}
  - {label: Black–white, pattern: "10"}
  - {label: Black–black, pattern: "11"}
---

Alice and Bob both apply H to their qubits, then measure. Give all four joint probabilities.

## Solution

### Expand the three input terms

H on both wires sends 00 to 00+01+10+11, 01 to 00−01+10−11, and 10 to 00+01−10−11.

### Combine and square

The combined amplitudes are 3, 1, 1 and −1. Squared weights are 9, 1, 1 and 1, for a total of 12.
