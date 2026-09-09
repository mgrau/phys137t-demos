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
 * Colours for the canvases that adapt — the Rabi chart and the level diagram.
 *
 * These are a diagram and a plot, so they follow the theme. The trap does not:
 * it depicts a glowing ion in a vacuum chamber, and a white background behind
 * it would be a lie about what a trap looks like. It stays dark in both themes
 * inside a `.scene-panel`.
 *
 * Kept in JS rather than read back out of CSS because most of these have no DOM
 * equivalent (grid lines, error bars, the theory curve). The neutrals here are
 * the same values as the tokens in app.css and must be changed together.
 */
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
  text: '#e0e2e6',
  textDim: '#858b96',
  textFaint: '#6b727d',
  line: '#3a3e48',
  grid: 'rgba(255,255,255,0.05)',
  panel: '#16181c',
  data: '#c8ccd4',
  theory: 'rgba(200,208,220,0.5)',
  cursor: 'rgba(160,165,175,0.18)',
  c194: '#818cf8',
  c282: '#c084fc',
  darkState: '#f06b8a',
  alpha: alphaFn(0),
};

const LIGHT: Palette = {
  text: '#1a1c21',
  textDim: '#646a75',
  textFaint: '#838a95',
  line: '#c2c7d0',
  grid: 'rgba(0,0,0,0.06)',
  panel: '#f2f4f7',
  data: '#3a4048',
  theory: 'rgba(60,66,76,0.45)',
  cursor: 'rgba(40,45,55,0.16)',
  c194: '#4f5bd5',
  c282: '#9333ea',
  darkState: '#d1416a',
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
