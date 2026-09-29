---
id: double-h
title: Two Hadamards
week: 2
kind: state
source: Adapted from Fall 2026 PS2, Superposition; Fall 2026 Sample Midterm A 2.
circuit: |
  in 1
  H 1
  H 1
---

Draw the final state. There is **no measurement** between the H gates.

## Solution

### Apply the first H

Black becomes white minus black.

```misty
0|-1
```

### Expand both contributions

The positive white contributes white plus black. The negative black contributes negative white plus black. The whites cancel; the two black terms combine. Remove the common factor.
