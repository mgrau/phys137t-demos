---
id: plus-product
title: "Four terms: entangled or separable?"
week: 5
kind: choice
source: Fall 2026 PS5, Separable States and Entangled States; Fall 2024 practice midterm.
qubits: 2
diagram: "00|01|10|11"
options:
  - "Separable: it is a product of a circle plus cloud and a square plus cloud."
  - "Entangled: every cloud with more than one term is entangled."
  - "Entangled: measuring either qubit must fix the other's color."
  - Not a valid state because it has four possibilities.
answer: [1]
---

Is this state entangled? Choose the statement with the correct reason.

## Solution

### Try a product

Multiply circle white-plus-black by square white-plus-black. Every circle term pairs with every square term.

### Compare the expansion

The expansion matches every possibility and sign in the given state. The entire state factors into independent qubits:

```misty
00|01|10|11 = (0|1)(0|1)
```
