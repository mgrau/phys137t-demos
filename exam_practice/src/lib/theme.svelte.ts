const key = 'phys137t-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
type Theme = 'light' | 'dark';
let stored: string | null = null;
try { stored = localStorage.getItem(key); } catch { /* Embedded browsers can block storage. */ }
let pinned = stored === 'dark' || stored === 'light';
const initial: Theme = pinned ? stored as Theme : media.matches ? 'dark' : 'light';
let current = $state<Theme>(initial);
function set(next: Theme) { current = next; document.documentElement.dataset.theme = next; }
set(initial);
media.addEventListener('change', e => { if (!pinned) set(e.matches ? 'dark' : 'light'); });
window.addEventListener('storage', e => { if (e.key === key) { pinned = e.newValue === 'dark' || e.newValue === 'light'; set(pinned ? e.newValue as Theme : media.matches ? 'dark' : 'light'); } });
export const theme = {
  get current() { return current; },
  toggle() { pinned = true; set(current === 'light' ? 'dark' : 'light'); try { localStorage.setItem(key, current); } catch { /* Session-only theme still works. */ } },
};
