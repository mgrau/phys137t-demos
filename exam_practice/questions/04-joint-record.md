---
id: joint-record
title: Conditional versus joint probability
week: 4
kind: number
source: Adapted from Fall 2026 Sample Midterm A 3(c); Fall 2026 notes, Measurement.
fields:
  - {label: Probability of both records, value: 0.16666666666666666}
---

The first measurement yields black with probability **1/3**. **Given** that result, a later measurement yields white with probability **1/2**. What is the probability of recording **black, then white** in one run?

## Solution

### Separate the two stages

Only one third of all runs enter the first-black branch. Half of that branch then records white.

### Multiply along this history

Multiply 1/3 by 1/2 to get 1/6 of all runs. The second probability is conditional, not the probability of the whole history.
