---
id: labels
title: How many bits?
week: 1
kind: number
source: Adapted from Fall 2026 PS1, Bits and Information; Sample Midterm A 1(a).
fields:
  - {label: Minimum bits, value: 3}
  - {label: Unused patterns, value: 2}
---

Six rooms need distinct binary labels of the **same length**. What is the smallest number of bits per label, and how many patterns are left unused?

## Solution

### Count the available patterns

One bit gives 2 patterns. Two bits give 4. Three bits give 8. Each extra bit doubles the number.

### Choose the smallest sufficient register

Four patterns are too few for six rooms. Eight are enough, so use three bits. Subtract the six occupied labels from the eight available patterns.
