/**
 * Photon traces drawn across the wave field.
 *
 * WHICH SLIT DID IT GO THROUGH.
 *
 * Every trace is drawn through BOTH slits, converging on the one place the
 * photon actually landed. Picking a slit at random and drawing a single line
 * would have been easier and is the thing this demo must not do: it asserts a
 * definite path, which is exactly the claim the double slit refutes. A class
 * that watches single photons arrive one at a time and sees each one drawn
 * down one side has been told the wrong thing before anyone opens their mouth.
 *
 * The bowtie is the honest schematic. Amplitude went both ways; the two paths
 * met; where they met decided where the photon could turn up.
 */

export interface Trace {
  /** Landing position on the screen, normalised to [-1, 1] of the view. */
  xNorm: number;
  /** performance.now() when it was fired. */
  born: number;
}

/** How long a trace stays on screen, in milliseconds. */
export const TRACE_LIFETIME = 2600;

/**
 * Cap on simultaneous traces. At 600 photons/s a 2.6 s lifetime would mean
 * 1500 bowties per frame, which is both unreadable and slow. Older traces are
 * dropped first, so the fast case shows a dense recent bundle rather than mud.
 */
export const MAX_TRACES = 90;

export function addTrace(list: Trace[], xNorm: number, now: number): Trace[] {
  const next = [...list, { xNorm, born: now }];
  return next.length > MAX_TRACES ? next.slice(next.length - MAX_TRACES) : next;
}

/** Drop traces that have fully faded. */
export function pruneTraces(list: Trace[], now: number): Trace[] {
  return list.filter((t) => now - t.born < TRACE_LIFETIME);
}

/** 1 at birth, 0 at the end of life, eased so the tail lingers. */
export function traceAlpha(t: Trace, now: number): number {
  const age = (now - t.born) / TRACE_LIFETIME;
  if (age <= 0) return 1;
  if (age >= 1) return 0;
  return (1 - age) ** 1.7;
}
