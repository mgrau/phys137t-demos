---
id: product
title: Multiply two clouds
week: 2
kind: choice
source: Adapted from Fall 2026 PS2, mist rules; Fall 2024 Midterm 1 practice, Entanglement.
qubits: 2
diagram: "(0|1)(0|-1)"
options:
  - state: "00|-01|10|-11"
    label: "White-white, minus white-black, plus black-white, minus black-black."
  - state: "00|01|10|11"
    label: "White-white, white-black, black-white and black-black, all positive."
  - state: "00|-11"
    label: "White-white minus black-black."
  - state: "00|11"
    label: "White-white plus black-black."
answer: [1]
---

Which expansion represents the product shown? Read each pair in circle–square order.

## Solution

### Pair every term with every term

Pair the first cloud’s white with both terms of the second cloud. Then pair its black with both terms. There are four contributions.

### Multiply the signs

The second cloud’s black square is negative. Thus both terms with a black square are negative:

```misty
00|-01|10|-11
```
