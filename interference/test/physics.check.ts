import { intensity, fringeSpacing, PatternSampler, type Params } from '../src/lib/physics';

function check(p: Params, label: string, N = 2_000_000, nb = 60) {
  const dx = p.slits === 2 ? fringeSpacing(p) : (p.wavelength * p.screenDistance) / p.slitWidth;
  const half = 6 * dx;

  // Analytic expectation per bin is the integral across the bin, not the
  // intensity at its centre.
  const binMass = (lo: number, hi: number, sub = 400) => {
    let s = 0;
    for (let k = 0; k < sub; k++) s += intensity(lo + ((hi - lo) * (k + 0.5)) / sub, p);
    return (s / sub) * (hi - lo);
  };

  const smp = new PatternSampler(p, half, 4096);
  const hist = new Array(nb).fill(0);
  let outside = 0;
  for (let i = 0; i < N; i++) {
    const x = smp.sample();
    const b = Math.floor(((x + half) / (2 * half)) * nb);
    if (b >= 0 && b < nb) hist[b]++; else outside++;
  }

  const mass = new Array(nb).fill(0);
  let tot = 0;
  for (let b = 0; b < nb; b++) {
    const lo = -half + (2 * half * b) / nb;
    mass[b] = binMass(lo, lo + (2 * half) / nb); tot += mass[b];
  }

  // Compare in Poisson sigma. A correct sampler gives |z| ~ N(0,1), so the
  // worst of 60 bins should sit around 2-3, never 10.
  let worstZ = 0, worstB = -1, chi2 = 0, used = 0;
  for (let b = 0; b < nb; b++) {
    const exp = (mass[b] / tot) * N;
    if (exp < 50) continue;
    const z = (hist[b] - exp) / Math.sqrt(exp);
    chi2 += z * z; used++;
    if (Math.abs(z) > Math.abs(worstZ)) { worstZ = z; worstB = b; }
  }
  const ok = Math.abs(worstZ) < 5 && chi2 / used < 3 && outside === 0;
  console.log(`${label}`);
  console.log(`  bins used ${used}/${nb}   samples outside range: ${outside}`);
  console.log(`  worst |z| = ${Math.abs(worstZ).toFixed(2)} (bin ${worstB})   chi2/dof = ${(chi2/used).toFixed(2)}`);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}\n`);
  return ok;
}

const base: Params = { wavelength: 650e-9, slitWidth: 80e-6, separation: 250e-6, screenDistance: 3.0, slits: 2 };
let all = true;
all = check(base, 'double slit, 650nm / 80um / 250um') && all;
all = check({ ...base, slits: 1 }, 'single slit, 650nm / 80um') && all;
all = check({ ...base, separation: 120e-6 }, 'double slit, tight separation 120um') && all;
all = check({ ...base, wavelength: 405e-9 }, 'double slit, violet 405nm') && all;
console.log(all ? 'ALL PASS' : 'SOME FAILED');
