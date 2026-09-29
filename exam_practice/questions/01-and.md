---
id: and
title: Why AND loses information
week: 1
kind: choice
source: Adapted from Fall 2026 PS1, Two Bit Gates.
options:
  - The output 0 could have come from 00, 01 or 10.
  - Its output is always black.
  - It changes both input bits into their opposites.
  - It is reversible because all its outputs are definite.
answer: [1]
---

A two-input AND gate keeps **only its single output bit**. Why is that operation not reversible?

## Solution

### Write the truth table

AND is 1 only on input 11. It is 0 on 00, 01 and 10.

### Ask what the output tells you

Output 0 leaves three possible inputs. Keeping input information on extra wires would be a different, larger operation.
