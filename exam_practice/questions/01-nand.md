---
id: nand
title: What does universal mean?
week: 1
kind: choice
source: Adapted from Fall 2026 PS1, Universal Gates.
options:
  - Networks of NAND gates can implement arbitrary Boolean functions.
  - NAND is reversible on its own.
  - NAND creates quantum superposition.
  - One NAND gate computes every function.
answer: [1]
---

NAND is called a **universal classical gate**. What does that mean?

## Solution

### Start with NOT

Connect both NAND inputs to the same bit. NAND(A,A) gives NOT A.

### Build other logic

NAND followed by NOT gives AND. Combining these constructions gives other Boolean functions. Universality describes what networks can do.
