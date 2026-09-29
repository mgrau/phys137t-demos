---
id: h-weighted
title: Interfere, then measure
week: 4
kind: probability
source: Adapted from Fall 2026 Sample Midterm A 2(b); earlier midterm interference questions.
circuit: |
  in 0|0|-1
  H 1
events:
  - {label: White circle, pattern: "0"}
  - {label: Black circle, pattern: "1"}
---

Apply H to the initial cloud, then measure. Find both probabilities **after H**.

## Solution

### Expand each contribution

Each positive white contributes white plus black. Negative black contributes negative white plus positive black.

### Combine, then square

White amplitude: 2 − 1 = 1. Black amplitude: 2 + 1 = 3. The squared weights are 1 and 9, with total 10.
