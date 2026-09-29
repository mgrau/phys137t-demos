---
id: oracle-queries
title: Count oracle queries
week: 4
kind: number
source: Adapted from Fall 2025 Midterm 1, Deutsch–Jozsa 5.1 and 5.3; Fall 2026 PS4.
fields:
  - {label: Classical worst-case queries, value: 2}
  - {label: Quantum queries, value: 1}
---

Two doors hide **no tiger or exactly one tiger**. You must decide with certainty whether it is safe to open **both**. How many oracle queries are needed classically in the worst case, and with the ideal quantum algorithm?

## Solution

### Check the classical worst case

If your first chosen door is safe, the other might still hide the tiger. You must query it too. Finding a tiger on the first query is only a favorable case.

### Use the quantum promise

The quantum circuit compares both door responses through interference. Under the stated promise, one oracle call is enough to decide whether either door hides a tiger.
