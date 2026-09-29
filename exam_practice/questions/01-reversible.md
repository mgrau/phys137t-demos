---
id: reversible
title: What makes a gate reversible?
week: 1
kind: choice
source: Adapted from Fall 2026 PS1, Two Bit Gates; Sample Midterm A 1(c).
options:
  - Every complete output identifies exactly one complete input.
  - Every output has the same number of black bits.
  - At least one output bit equals an input bit.
  - It can only be applied once.
answer: [1]
---

Which statement is the test for a **reversible** operation on definite bit patterns?

## Solution

### Try to run the operation backward

Suppose you know the complete output. To undo the operation, you must be able to determine which input produced it.

### Look for collisions

If two distinct inputs have the same complete output, the output cannot tell them apart. A reversible gate has no such collisions.
