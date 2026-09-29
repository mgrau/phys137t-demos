---
id: traffic
title: A traffic light
week: 1
kind: number
source: Fall 2026 PS1, Bits and Information 1; adapted from earlier PS1.
fields:
  - {label: Bits per label, value: 2}
---

A traffic light can show red, yellow or green. How many bits are needed to encode its color with a **fixed-length** label?

## Solution

### Distinguish all three colors

A single bit has just two patterns. It cannot assign a different label to each of three colors.

### Add a second bit

Two bits give 00, 01, 10 and 11. Assign three of these to the colors and leave one unused.
