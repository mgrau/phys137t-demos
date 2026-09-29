---
id: factor
title: Which qubit is independent?
week: 5
kind: choice
source: Fall 2026 PS5, Separable States and Entangled States 2; earlier midterm entanglement questions.
qubits: 3
diagram: "010|-011|100|-101"
options:
  - The triangle is independent; the circle and square are entangled.
  - The circle is independent; the square and triangle are entangled.
  - All three qubits are independent.
  - All three qubits are necessarily entangled together.
answer: [1]
---

Inspect the **whole signed state**. Which description is correct?

## Solution

### Factor the repeated triangle cloud

Group the first two and last two terms. Each group contains triangle white minus triangle black.

```misty
(01|10)(0|-1)
```

### Inspect the remaining pair

Circle and square remain in opposite-color possibilities. They cannot be independent: independent clouds with both colors would also produce `misty: 00` and `misty: 11`. The triangle factors away.
