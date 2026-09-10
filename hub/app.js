/**
 * The demo registry. This is the single source of truth: the sidebar list is
 * rendered from it at load, so adding a demo means adding one entry here and
 * one line to scripts/build.sh. Order is the order shown.
 */
const DEMOS = [
  {
    slug: 'interference',
    title: 'Interference',
    lecture: 4,
    description: 'Waves and photons through one or two slits',
  },
  {
    slug: 'quantum_jumps',
    title: 'Quantum jumps',
    lecture: 5,
    description: 'Single-ion readout and Rabi oscillations',
  },
  {
    slug: 'measurement_quiz',
    title: 'Measurement quiz',
    lecture: 7,
    description: 'Fill in the outcomes of a measurement, and their probabilities',
  },
];

const list = document.querySelector('#demo-list');
const frame = document.querySelector('#demo-frame');
const title = document.querySelector('#active-title');
const lecture = document.querySelector('#active-lecture');
const description = document.querySelector('#active-description');
const openLink = document.querySelector('#open-demo');

const pathOf = (demo) => `./${demo.slug}/`;

const buttons = DEMOS.map((demo) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'demo-item';
  button.dataset.demo = demo.slug;

  const name = document.createElement('span');
  name.className = 'demo-name';
  name.textContent = demo.title;

  const tag = document.createElement('span');
  tag.className = 'demo-lecture';
  tag.textContent = `L${demo.lecture}`;
  tag.title = `Lecture ${demo.lecture}`;

  button.append(name, tag);
  button.addEventListener('click', () => select(demo.slug));
  list.append(button);
  return button;
});

function select(slug, updateHash = true) {
  const demo = DEMOS.find((d) => d.slug === slug) ?? DEMOS[0];

  title.textContent = demo.title;
  lecture.textContent = `Lecture ${demo.lecture}`;
  description.textContent = demo.description;
  openLink.href = pathOf(demo);
  frame.title = `${demo.title} interactive demonstration`;
  if (frame.getAttribute('src') !== pathOf(demo)) frame.src = pathOf(demo);

  buttons.forEach((button) => {
    button.setAttribute(
      'aria-current',
      button.dataset.demo === demo.slug ? 'true' : 'false',
    );
  });

  if (updateHash && location.hash !== `#${demo.slug}`) {
    history.replaceState(null, '', `#${demo.slug}`);
  }
}

window.addEventListener('hashchange', () => select(location.hash.slice(1), false));
select(location.hash.slice(1), false);

// ── Theme ──
//
// The initial value is applied by an inline script in <head> to avoid a flash;
// this only handles the button and staying in step with the framed demo.
//
// That sync is free: the hub and the demo are served from the same origin, so
// writing the key here fires a `storage` event inside the iframe, and vice
// versa. No postMessage plumbing.

const THEME_KEY = 'phys137t-theme';
const themeButton = document.querySelector('#theme-toggle');

const SUN =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
  '<circle cx="12" cy="12" r="4"/>' +
  '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
  '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

function paintThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.innerHTML = dark ? SUN : MOON;
  themeButton.title = dark ? 'Light mode' : 'Dark mode';
  themeButton.setAttribute(
    'aria-label',
    dark ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

themeButton.addEventListener('click', () => {
  const next =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  paintThemeButton();
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Non-persistent is still usable for this session.
  }
});

// The framed demo has its own toggle; follow it when it is the one that changed.
window.addEventListener('storage', (e) => {
  if (e.key !== THEME_KEY) return;
  if (e.newValue !== 'light' && e.newValue !== 'dark') return;
  document.documentElement.dataset.theme = e.newValue;
  paintThemeButton();
});

paintThemeButton();
