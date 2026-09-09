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
