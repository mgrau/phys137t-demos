---
id: oracle-output
title: What the oracle result means
week: 4
kind: choice
source: Adapted from Fall 2025 Midterm 1, Deutsch–Jozsa 5.4; Fall 2026 PS4 and lecture 8.
options:
  - Exactly one tiger exists; the result does not tell us which door.
  - The black-labelled door certainly contains the tiger.
  - Both doors are safe.
  - Both doors contain tigers.
answer: [1]
---

Under the **no-tiger-or-one-tiger promise**, the standard quantum protocol ends with a **black selector square**. What has it established?

## Solution

### Identify the question the circuit answers

The selector’s final interference tells whether the two door responses are the same or different. It is not a record of a door’s location.

### Apply the promise

Different responses mean exactly one door contains a tiger. Opening both is unsafe, but the location remains unknown.
