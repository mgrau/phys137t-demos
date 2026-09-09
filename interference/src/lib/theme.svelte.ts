/**
 * Theme state.
 *
 * Every demo and the hub share this by *contract*, not by shared code: the same
 * localStorage key, and the same `data-theme` attribute on <html>. Each app
 * stays independently buildable, which is a property the collection's README
 * claims and this would otherwise break.
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

export const theme = {
  get current(): Theme {
    return current;
  },
  get isDark(): boolean {
    return current === 'dark';
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
