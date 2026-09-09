/**
 * Fraunhofer diffraction for one or two slits.
 *
 * Everything is in SI units internally: metres for lengths, so a 650 nm laser
 * is 650e-9 and an 80 micrometre slit is 80e-6. The UI works in nanometres and
 * micrometres and converts at the edges, because those are the numbers written
 * on the actual slide holder.
 *
 * The far-field approximation is what the classroom demo actually satisfies:
 * the screen is metres away and the slits are tens of micrometres, so
 * L >> d²/λ by a wide margin and the pattern is the Fourier transform of the
 * aperture. That is the same intensity curve the wave picture and the particle
 * picture share, which is the whole point of the demo.
 */

export interface Params {
  /** Wavelength in metres. */
  wavelength: number;
  /** Slit width in metres. */
  slitWidth: number;
  /** Centre-to-centre slit separation in metres. Ignored when slits === 1. */
  separation: number;
  /** Distance from slits to screen, in metres. */
  screenDistance: number;
  /** One slit or two. */
  slits: 1 | 2;
}

/** sin(x)/x, with the removable singularity at 0 filled in. */
function sinc(x: number): number {
  if (Math.abs(x) < 1e-12) return 1;
  return Math.sin(x) / x;
}

/**
 * Relative intensity at position `x` metres from the centre of the screen.
 * Normalised so the central maximum is 1.
 *
 * Single slit is the envelope alone:      sinc²(π a x / (λ L))
 * Double slit multiplies in the fringes:  × cos²(π d x / (λ L))
 *
 * Keeping the envelope in the two-slit case is what makes the demo honest —
 * the fringes die away at the edges exactly as they do on the wall, and
 * students who have just seen the single-slit pattern recognise it.
 */
export function intensity(x: number, p: Params): number {
  const { wavelength: lam, slitWidth: a, separation: d, screenDistance: L } = p;
  const sinTheta = x / Math.hypot(x, L); // exact, not the small-angle form
  const envelope = sinc((Math.PI * a * sinTheta) / lam) ** 2;
  if (p.slits === 1) return envelope;
  const fringes = Math.cos((Math.PI * d * sinTheta) / lam) ** 2;
  return envelope * fringes;
}

/** Fringe spacing in metres, for display. Two slits only. */
export function fringeSpacing(p: Params): number {
  return (p.wavelength * p.screenDistance) / p.separation;
}

/**
 * Angle to the first single-slit minimum, in radians. This is what sets how
 * wide the whole pattern is, so the view auto-scales from it.
 */
export function envelopeHalfAngle(p: Params): number {
  const s = p.wavelength / p.slitWidth;
  return s >= 1 ? Math.PI / 2 : Math.asin(s);
}

/**
 * A sampler that draws screen positions from the intensity pattern.
 *
 * Built by inverting the cumulative distribution on a fixed grid. Rejection
 * sampling was the obvious alternative and is wrong for this demo: its
 * acceptance rate collapses when the fringes are narrow, so the particle rate
 * would silently depend on the slit separation and the histogram would fill at
 * a different speed every time a slider moved.
 *
 * Rebuild whenever the parameters or the half-width change.
 */
export class PatternSampler {
  /** cdf[i] is the probability of landing at or before the right edge of bin i. */
  private cdf: Float64Array;
  private left: number;
  private step: number;

  constructor(p: Params, halfWidth: number, bins = 4096) {
    this.left = -halfWidth;
    this.step = (2 * halfWidth) / bins;
    this.cdf = new Float64Array(bins);
    let total = 0;
    for (let i = 0; i < bins; i++) {
      // Intensity at the CENTRE of bin i, as the mass of the whole bin.
      // Indexing on edges and sampling uniformly inside the chosen bin is what
      // keeps this unbiased. An earlier version put the grid on bin centres and
      // interpolated backwards from xs[lo], which shifted every draw half a bin
      // to the left and pushed part of the leftmost bin outside the range
      // entirely — a visible deficit in the first histogram column.
      total += intensity(this.left + this.step * (i + 0.5), p);
      this.cdf[i] = total;
    }
    // `total` is strictly positive: the central maximum is 1 by construction
    // and always inside the sampled range.
    for (let i = 0; i < bins; i++) this.cdf[i] /= total;
  }

  /** One draw, in metres from the centre of the screen. */
  sample(rand = Math.random): number {
    const u = rand();
    // First bin whose right edge is at or beyond u.
    let lo = 0;
    let hi = this.cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    // Uniform inside the chosen bin, so the result is never quantised to the
    // grid and never leaves [-halfWidth, +halfWidth].
    return this.left + this.step * (lo + rand());
  }
}

/** Visible-spectrum colour for a wavelength in nanometres. Approximate. */
export function wavelengthToColour(nm: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / 60;
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = -(nm - 510) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = -(nm - 645) / 65;
  } else if (nm <= 780) {
    r = 1;
  } else {
    r = 1;
    g = 1;
    b = 1;
  }
  // Roll off at the ends of the visible range so 380 and 780 do not look as
  // bright on screen as 550 does.
  let f = 1;
  if (nm >= 380 && nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
  else if (nm > 700 && nm <= 780) f = 0.3 + (0.7 * (780 - nm)) / 80;
  const to255 = (c: number) => Math.round(255 * Math.min(1, Math.max(0, c * f)));
  return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
}
