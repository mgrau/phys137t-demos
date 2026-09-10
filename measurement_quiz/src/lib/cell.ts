/**
 * An answer cell.
 *
 * A cell is a product of factors across a fixed register: some qubits stand on
 * their own, and a contiguous run of them may sit inside a *cloud* holding
 * several alternatives. That is misty's `0(0|1)` — one qubit outside a cloud
 * multiplying a superposition inside it — and it is the factored form the notes
 * ask for ("factor out anything shared").
 *
 * Two things are deliberately *not* shown until they are known:
 *
 *   - A freshly dropped cloud is `'open'`. It covers no slot yet, so it draws
 *     as a cloud with one blank in it and nothing beside it. The first qubit
 *     dropped inside decides which slot it covers.
 *   - Trailing blanks are trimmed. A blank that still has something after it
 *     has to stay, because position is what names a qubit, but a run of them at
 *     the end says nothing and would make a one-qubit answer look half-finished.
 *
 * The cloud covers a contiguous range because misty's syntax has no way to
 * write a split one — `(0|1)` covers adjacent qubits or nothing.
 *
 * `layout()` is the single place that decides how a cell is written out.
 * `toSource` and `locate` both read it, so the string and the hit-testing
 * cannot drift apart.
 */

export type Slot = 0 | 1 | null;
export type Range = { from: number; to: number };

export interface Cell {
  /** One entry per qubit. Entries for slots inside the cloud are unused. */
  out: Slot[];
  /**
   * `null` for no cloud, `'open'` for one that has not been given a slot yet,
   * or the inclusive range it covers.
   */
  cloud: Range | 'open' | null;
  /** Alternatives inside the cloud. Each is one value per covered slot. */
  alts: Slot[][];
  /**
   * Sign of each alternative, parallel to `alts`.
   *
   * Signs live *only* here, because this is the only place one is observable.
   * A minus on a lone term, or on a whole factored product, is a global phase
   * and `canonical` divides it straight back out — `01` and `-01` are the same
   * state. Inside a superposition it is real: `011|101` and `011|-101` are not.
   */
  altSigns: (1 | -1)[];
}

const ch = (s: Slot) => (s === null ? '?' : String(s));

export function emptyCell(qubits: number): Cell {
  return {
    out: Array.from({ length: qubits }, () => null),
    cloud: null,
    alts: [],
    altSigns: [],
  };
}

export const range = (c: Cell): Range | null =>
  c.cloud && c.cloud !== 'open' ? c.cloud : null;

export const isEmpty = (c: Cell) => !c.cloud && c.out.every((s) => s === null);

const width = (c: Cell) => {
  const r = range(c);
  return r ? r.to - r.from + 1 : 1;
};

export const inCloud = (c: Cell, slot: number) => {
  const r = range(c);
  return !!r && slot >= r.from && slot <= r.to;
};

function cloudText(c: Cell): string {
  const alts = c.alts.length ? c.alts : [Array(width(c)).fill(null)];
  return `(${alts
    .map((a, i) => (c.altSigns[i] === -1 ? '-' : '') + a.map(ch).join(''))
    .join('|')})`;
}

type Piece =
  | { text: string; kind: 'out'; slot: number; blank: boolean }
  | { text: string; kind: 'cloud'; blank: false };

/** How the cell is written, piece by piece, already trimmed. */
function layout(c: Cell): Piece[] {
  const pieces: Piece[] = [];
  const push = (slot: number) =>
    pieces.push({
      text: ch(c.out[slot]),
      kind: 'out',
      slot,
      blank: c.out[slot] === null,
    });

  const r = range(c);
  if (c.cloud === 'open') {
    // An open cloud sits after whatever has actually been placed, so it reads
    // as "and then a superposition" rather than claiming a slot.
    const lastFilled = c.out.reduce((acc, s, i) => (s !== null ? i : acc), -1);
    for (let i = 0; i <= lastFilled; i++) push(i);
    pieces.push({ text: cloudText(c), kind: 'cloud', blank: false });
    for (let i = lastFilled + 1; i < c.out.length; i++) push(i);
  } else if (r) {
    for (let i = 0; i < r.from; i++) push(i);
    pieces.push({ text: cloudText(c), kind: 'cloud', blank: false });
    for (let i = r.to + 1; i < c.out.length; i++) push(i);
  } else {
    for (let i = 0; i < c.out.length; i++) push(i);
  }

  while (pieces.length && pieces[pieces.length - 1].blank) pieces.pop();
  return pieces;
}

/** misty source, or '' when nothing has been placed. */
export function toSource(c: Cell): string {
  if (isEmpty(c)) return '';
  return layout(c)
    .map((p) => p.text)
    .join('');
}

export type Pos =
  | { where: 'out'; slot: number }
  | { where: 'in'; alt: number; index: number };

/** Where a source offset sits, decoded from the same layout that wrote it. */
export function locate(c: Cell, at: number): Pos | null {
  let off = 0;
  for (const p of layout(c)) {
    if (at < off + p.text.length) {
      if (p.kind === 'out') return { where: 'out', slot: p.slot };
      // Inside the cloud: skip '(' then walk alternatives and separators.
      const rel = at - off - 1;
      if (rel < 0) return null; // the '(' itself
      const w = width(c);
      const stride = w + 1;
      const alt = Math.floor(rel / stride);
      const index = rel % stride;
      if (index >= w) return null; // a separator or the ')'
      if (alt >= (c.alts.length || 1)) return null;
      return { where: 'in', alt, index };
    }
    off += p.text.length;
  }
  return null;
}

const clone = (c: Cell): Cell => ({
  out: [...c.out],
  cloud: c.cloud && c.cloud !== 'open' ? { ...c.cloud } : c.cloud,
  alts: c.alts.map((a) => [...a]),
  altSigns: [...c.altSigns],
});

/** Flip an alternative between + and -. */
export function flipSign(c: Cell, alt: number): Cell {
  if (!c.alts[alt]) return c;
  const next = clone(c);
  next.altSigns[alt] = next.altSigns[alt] === -1 ? 1 : -1;
  return next;
}

export const signOf = (c: Cell, alt: number): 1 | -1 => c.altSigns[alt] ?? 1;

/** Grow the cloud to cover `slot`, keeping it contiguous. */
function cover(c: Cell, slot: number): Cell {
  const next = clone(c);
  const r = range(next);
  if (!r) {
    // No cloud, or an open one finally being given its slot.
    next.cloud = { from: slot, to: slot };
    next.alts = next.alts.length
      ? next.alts.map((a) => (a.length ? a.slice(0, 1) : [null]))
      : [[null]];
    next.altSigns = next.alts.map((_, i) => signOf(next, i));
    return next;
  }
  const from = Math.min(r.from, slot);
  const to = Math.max(r.to, slot);
  const added = to - from + 1 - (r.to - r.from + 1);
  if (added > 0) {
    const padLeft = r.from - from;
    next.alts = (next.alts.length ? next.alts : [[]]).map((a) => [
      ...Array(padLeft).fill(null),
      ...a,
      ...Array(added - padLeft).fill(null),
    ]);
    next.cloud = { from, to };
  }
  return next;
}

/**
 * Place a qubit.
 *
 * `target` says which side of the cloud the drop landed on. Inside, it fills
 * the newest alternative — or opens another one when that slot is already
 * taken, which is how a student adds a second possibility and therefore an
 * amplitude. Outside, it stands as a plain factor beside the cloud.
 */
export function place(
  c: Cell,
  slot: number,
  value: 0 | 1,
  target: 'in' | 'out',
): Cell {
  if (target === 'out') {
    const next = clone(c);
    if (inCloud(next, slot)) return place(release(next, slot), slot, value, 'out');
    next.out[slot] = value;
    return next;
  }
  const grown = cover(c, slot);
  const r = range(grown)!;
  const idx = slot - r.from;
  const last = grown.alts[grown.alts.length - 1];
  if (last && last[idx] === null) {
    last[idx] = value;
    return grown;
  }
  const fresh: Slot[] = Array(r.to - r.from + 1).fill(null);
  fresh[idx] = value;
  grown.alts = [...grown.alts, fresh];
  grown.altSigns = [...grown.altSigns, 1];
  return grown;
}

/** Take a slot out of the cloud, shrinking it. Only the ends can leave. */
export function release(c: Cell, slot: number): Cell {
  const r = range(c);
  if (!r || !inCloud(c, slot)) return c;
  const next = clone(c);
  if (r.from === r.to) {
    next.cloud = null;
    next.alts = [];
    next.altSigns = [];
    return next;
  }
  if (slot === r.from) {
    next.cloud = { from: r.from + 1, to: r.to };
    next.alts = next.alts.map((a) => a.slice(1));
  } else if (slot === r.to) {
    next.cloud = { from: r.from, to: r.to - 1 };
    next.alts = next.alts.map((a) => a.slice(0, -1));
  } else {
    // A slot leaving from the middle would split the cloud, which the notation
    // cannot write. Collapse it rather than pretend otherwise.
    next.cloud = null;
    next.alts = [];
    next.altSigns = [];
  }
  return next;
}

/**
 * Drop a cloud in.
 *
 * With no cloud yet this leaves it `'open'`: a cloud with one blank in it and
 * nothing beside it, committing to no slot until a qubit lands inside. With one
 * already there, it adds another alternative to build in.
 */
export function addCloud(c: Cell): Cell {
  if (!c.cloud) {
    const next = clone(c);
    next.cloud = 'open';
    next.alts = [[null]];
    next.altSigns = [1];
    return next;
  }
  if (c.cloud === 'open') return c;
  const next = clone(c);
  const last = next.alts[next.alts.length - 1];
  if (last && last.every((s) => s === null)) return next;
  next.alts = [...next.alts, Array(width(next)).fill(null)];
  next.altSigns = [...next.altSigns, 1];
  return next;
}

export function cycleOut(c: Cell, slot: number): Cell {
  const next = clone(c);
  const cur = next.out[slot];
  next.out[slot] = cur === 0 ? 1 : cur === 1 ? null : 0;
  return next;
}

export function cycleIn(c: Cell, alt: number, index: number): Cell {
  const next = clone(c);
  const cur = next.alts[alt]?.[index];
  if (cur === undefined) return c;
  next.alts[alt][index] = cur === 0 ? 1 : cur === 1 ? null : 0;
  return next;
}

export function clearOut(c: Cell, slot: number): Cell {
  const next = clone(c);
  next.out[slot] = null;
  return next;
}

/** Blank a slot inside the cloud, dropping the cloud once nothing is left. */
export function clearIn(c: Cell, alt: number, index: number): Cell {
  const next = clone(c);
  if (!next.alts[alt]) return c;
  next.alts[alt][index] = null;
  const keep = next.alts.map((a) => a.some((s) => s !== null));
  const kept = next.alts.filter((_, i) => keep[i]);
  if (!kept.length) {
    next.cloud = null;
    next.alts = [];
    next.altSigns = [];
  } else {
    next.altSigns = next.altSigns.filter((_, i) => keep[i]);
    next.alts = kept;
  }
  return next;
}

/** Which slots the newest alternative still has free, for palette hinting. */
export function openSlots(c: Cell, qubits: number): boolean[] {
  const r = range(c);
  const last = c.alts[c.alts.length - 1];
  return Array.from({ length: qubits }, (_, k) => {
    if (r && last && k >= r.from && k <= r.to) return last[k - r.from] === null;
    return c.out[k] === null;
  });
}
