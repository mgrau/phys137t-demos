/**
 * Theme state and the canvas palette.
 *
 * Every demo and the hub share the theme by *contract*, not by shared code: the
 * same localStorage key, and the same `data-theme` attribute on <html>. Each app
 * stays independently buildable, which is a property the collection's README
 * claims and a shared module would otherwise break.
 *
 * The sync between the hub and the demo it frames falls out for free. Both are
 * served from the same origin, so writing the key in one document fires a
 * `storage` event in the other — no postMessage plumbing needed.
 *
 * Until the user picks a side, we follow the OS. After that their choice is
 * pinned, because an instructor forcing light for a washed-out projector does
 * not want the OS arguing back.
 */

export type Theme = 'light' | 'dark';

const KEY = 'phys137t-theme';
const QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): Theme {
  return window.matchMedia(QUERY).matches ? 'dark' : 'light';
}

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    // Safari in private mode throws on localStorage. Fall back to the OS.
    return null;
  }
}

let current = $state<Theme>(readStored() ?? systemTheme());
let pinned = readStored() !== null;

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
}

apply(current);

window.matchMedia(QUERY).addEventListener('change', (e) => {
  if (pinned) return;
  current = e.matches ? 'dark' : 'light';
  apply(current);
});

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  if (e.newValue !== 'light' && e.newValue !== 'dark') return;
  pinned = true;
  current = e.newValue;
  apply(current);
});

/**
 * Colours for the canvases. All three of this demo's drawings follow the theme
 * — the Rabi chart, the level diagram and the trap.
 *
 * Kept in JS rather than read back out of CSS because most of these have no DOM
 * equivalent (grid lines, error bars, the theory curve). The neutrals here are
 * the same values as the tokens in app.css and must be changed together.
 */
/**
 * The trap drawing.
 *
 * It follows the theme, unlike Interference's wave field and screen. Those are
 * images of light in a dark room; this is a drawing of hardware, and a drawing
 * can sit on paper.
 *
 * The one thing that cannot simply flip is the fluorescing ion. White-hot reads
 * as "emitting" against near-black and as "washed out" against white, so on a
 * light ground the core becomes the saturated wavelength instead — the ion is
 * brightest by being the most colour on the panel rather than the most light.
 */
export interface TrapPalette {
  /** Electrode body gradient: shadowed rim -> lit centre. */
  metalEdge: string;
  metalMid: string;
  metalCore: string;
  metalStroke: string;
  /** The bore through the ring. A hole, so darker than the metal in both
      themes — on light that means darker, not lighter. */
  cavity: string;
  cavityInner: string;
  /** Innermost stop of the bright ion's core gradient. */
  ionCore: string;
  /** Label text on the drawing. */
  label: string;
}

export interface Palette {
  text: string;
  textDim: string;
  textFaint: string;
  line: string;
  grid: string;
  panel: string;
  /** Measured points. Neutral: the data is not a category. */
  data: string;
  /** The model. Dashed at the call site, so form carries the distinction. */
  theory: string;
  cursor: string;
  /** Physics-driven, so it keeps its identity across themes — only the
      lightness is trimmed so it stays legible on white. */
  c194: string;
  c282: string;
  darkState: string;
  trap: TrapPalette;
  /**
   * Palette colour + alpha -> rgba(), with the alpha remapped for the ground
   * it lands on.
   *
   * Transparency is not symmetric between the themes. A 25%-opacity violet
   * still carries against near-black, because the remaining contrast is large;
   * against white the same 25% all but disappears. So the light palette lifts
   * every alpha toward opaque instead of using the number literally.
   *
   * Fully transparent stays fully transparent — gradients fade out through
   * `alpha(c, 0)` and lifting that would paint a hard edge.
   */
  alpha(hex: string, a: number): string;
}

function alphaFn(floor: number) {
  return (hex: string, a: number): string => {
    const eff = a <= 0 ? 0 : floor + a * (1 - floor);
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${eff})`;
  };
}

const DARK: Palette = {
  text: '#dfe2e8',
  textDim: '#838b98',
  textFaint: '#6a7280',
  line: '#3a4150',
  grid: 'rgba(220,235,255,0.06)',
  panel: '#16191e',
  data: '#c6ccd6',
  theory: 'rgba(198,204,214,0.5)',
  cursor: 'rgba(160,170,190,0.18)',
  c194: '#818cf8',
  c282: '#c084fc',
  darkState: '#f06b8a',
  trap: {
    metalEdge: '#1e3044',
    metalMid: '#4a6478',
    metalCore: '#6a8498',
    metalStroke: 'rgba(140,170,200,0.25)',
    cavity: '#1a2028',
    cavityInner: '#111820',
    ionCore: 'rgba(255,255,255,0.92)',
    label: '#6a7280',
  },
  alpha: alphaFn(0),
};

const LIGHT: Palette = {
  text: '#14171d',
  textDim: '#5f6775',
  textFaint: '#7d8695',
  line: '#bfc7d6',
  grid: 'rgba(15,30,60,0.08)',
  panel: '#eff2f7',
  data: '#333a45',
  theory: 'rgba(51,58,69,0.45)',
  cursor: 'rgba(30,40,60,0.16)',
  c194: '#4f5bd5',
  c282: '#9333ea',
  darkState: '#d1416a',
  trap: {
    metalEdge: '#7d92a4',
    metalMid: '#a9bccb',
    metalCore: '#c4d2dd',
    metalStroke: 'rgba(45,75,105,0.35)',
    cavity: '#69798a',
    cavityInner: '#53616e',
    ionCore: 'rgba(34,42,140,0.92)',
    label: '#5f6775',
  },
  alpha: alphaFn(0.35),
};

export const theme = {
  get current(): Theme {
    return current;
  },
  get isDark(): boolean {
    return current === 'dark';
  },
  get palette(): Palette {
    return current === 'dark' ? DARK : LIGHT;
  },
  toggle() {
    current = current === 'dark' ? 'light' : 'dark';
    pinned = true;
    apply(current);
    try {
      localStorage.setItem(KEY, current);
    } catch {
      // Non-persistent is still usable for this session.
    }
  },
};
