/**
 * Rabi oscillation physics for the Hg⁺ ion trap demo.
 *
 * Based on Bergquist, Hulet, Itano & Wineland, PRL 57, 1699 (1986).
 * The paper observed quantum jumps with CW excitation; coherent Rabi
 * oscillations on the ²S₁/₂ → ²D₅/₂ transition came from later NIST work.
 * The Rabi frequency here is realistic for Hg⁺ with moderate laser power.
 */

/** Rabi frequency in rad/μs.  2π × 100 kHz. */
export const OMEGA = 2 * Math.PI * 0.1;

/** Duration of one π-pulse in μs (≈ 5.0 μs). */
export const T_PI = Math.PI / OMEGA;

/** Maximum pulse duration on the slider, in μs. */
export const T_MAX = 20;

/** Pulse-time resolution used by the controls and plotted data, in μs. */
export const TIME_STEP = 0.01;

/** Mean detected photons in the dark and bright states during readout. */
export const DARK_COUNT_MEAN = 1.5;
export const BRIGHT_COUNT_MEAN = 22;

/** Counts at or below this threshold are classified as dark. */
export const PHOTON_THRESHOLD = 7;

/** Last displayed histogram bin; it also collects all larger counts. */
export const PHOTON_HIST_MAX = 40;

/** Probability of measuring the dark (²D₅/₂) state after pulse duration t μs. */
export function pDark(t: number): number {
  return Math.sin(OMEGA * t / 2) ** 2;
}

/** Snap a duration to the pulse-time resolution. */
export function snapDuration(t: number): number {
  return Math.round(t / TIME_STEP) * TIME_STEP;
}

/** Use the exact displayed pulse-time setting as the histogram key. */
export function binKey(t: number): number {
  return snapDuration(t);
}

/** Accumulated measurement results for one histogram bin. */
export interface BinData {
  bright: number;
  dark: number;
}

export interface ShotResult {
  outcome: 0 | 1;
  photonCount: number;
}

/** Draw a Poisson-distributed photon count with the requested mean. */
function poisson(mean: number): number {
  const limit = Math.exp(-mean);
  let product = 1;
  let count = 0;
  do {
    count++;
    product *= Math.random();
  } while (product > limit);
  return count - 1;
}

/**
 * Simulate one fluorescence readout. The pulse prepares a dark or bright state,
 * that state produces a photon count, and the count threshold sets the reported
 * measurement outcome (1 for dark, 0 for bright).
 */
export function makeShot(t: number): ShotResult {
  const preparedDark = Math.random() < pDark(t);
  const photonCount = poisson(
    preparedDark ? DARK_COUNT_MEAN : BRIGHT_COUNT_MEAN,
  );
  return {
    outcome: photonCount <= PHOTON_THRESHOLD ? 1 : 0,
    photonCount,
  };
}
