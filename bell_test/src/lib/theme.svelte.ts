const KEY = 'phys137t-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
type Theme = 'light' | 'dark';
function stored(): Theme | null {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; }
  catch { return null; }
}
let pinned = stored() !== null;
const initial = stored() ?? (media.matches ? 'dark' : 'light');
let current = $state<Theme>(initial);
function set(value: Theme) { current = value; document.documentElement.dataset.theme = value; }
set(initial);
media.addEventListener('change', (e) => { if (!pinned) set(e.matches ? 'dark' : 'light'); });
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  pinned = e.newValue === 'light' || e.newValue === 'dark';
  set(pinned ? e.newValue as Theme : media.matches ? 'dark' : 'light');
});
export const theme = {
  get current() { return current; },
  toggle() { pinned = true; set(current === 'dark' ? 'light' : 'dark');
    try { localStorage.setItem(KEY, current); } catch { /* Private/embedded browsing can still use the theme. */ }
  },
};
