---
id: make-minus
title: Prepare a minus cloud
week: 2
kind: circuit
source: Adapted from Fall 2026 PS2, Superposition.
input: "0"
target: "0|-1"
gates: [X, H]
maxGates: 6
example: |
  X 1
  H 1
---

Starting with a white circle, build a circuit that prepares the target cloud. Use **NOT and H**.

## Solution

### Choose the input to H

H acting on black produces white minus black. H acting on white produces two positive terms.

### Prepare that input

Use NOT to turn the initial white circle black, then apply H.
