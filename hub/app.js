const demos = {
  interference: {
    title: 'Interference',
    lecture: 'Lecture 4',
    path: './interference/',
    frameTitle: 'Interference interactive demonstration',
  },
  quantum_jumps: {
    title: 'Quantum jumps',
    lecture: 'Lecture 5',
    path: './quantum_jumps/',
    frameTitle: 'Quantum jumps interactive demonstration',
  },
};

const frame = document.querySelector('#demo-frame');
const title = document.querySelector('#active-title');
const lecture = document.querySelector('#active-lecture');
const openLink = document.querySelector('#open-demo');
const cards = [...document.querySelectorAll('[data-demo]')];

function selectDemo(slug, updateHash = true) {
  const selected = demos[slug] ?? demos.interference;
  const selectedSlug = demos[slug] ? slug : 'interference';

  title.textContent = selected.title;
  lecture.textContent = selected.lecture;
  openLink.href = selected.path;
  frame.title = selected.frameTitle;
  if (frame.getAttribute('src') !== selected.path) frame.src = selected.path;

  cards.forEach((card) => {
    const active = card.dataset.demo === selectedSlug;
    card.setAttribute('aria-current', active ? 'true' : 'false');
  });

  if (updateHash && location.hash !== `#${selectedSlug}`) {
    history.replaceState(null, '', `#${selectedSlug}`);
  }
}

cards.forEach((card) => {
  card.addEventListener('click', () => selectDemo(card.dataset.demo));
});

window.addEventListener('hashchange', () => selectDemo(location.hash.slice(1), false));
selectDemo(location.hash.slice(1), false);
