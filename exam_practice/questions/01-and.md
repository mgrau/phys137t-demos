---
id: and
title: Why AND loses information
week: 1
kind: choice
source: Adapted from Fall 2026 PS1, Two Bit Gates.
options:
  - A white output could come from any input except two black bits.
  - Its output is always black.
  - It changes both input bits into their opposites.
  - It is reversible because all its outputs are definite.
answer: [1]
---

A two-input AND gate keeps **only its single output bit**. Why is that operation not reversible?

## Solution

### Write the truth table

AND gives a black output only when both inputs are black. If either input is white, its output is white.

### Ask what the output tells you

A white output leaves three possible inputs. Keeping input information on extra wires would be a different, larger operation.
