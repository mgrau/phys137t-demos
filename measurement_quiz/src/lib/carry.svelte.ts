/**
 * Dragging a block into, out of, and between answer cells.
 *
 * Two questions get asked of a drop: *which cell*, and *inside the cloud or
 * beside it*. The first is `document.elementFromPoint` against the cell
 * elements. The second is the cloud outline's bounding box, measured from the
 * rendered SVG — misty publishes qubit boxes but nothing for the cloud, and its
 * outline is by far the largest path in a cell that has one, which is enough to
 * tell "in" from "out" without reimplementing the layout.
 *
 * Coarser than quantum_sketch's drag layer on purpose. That one aims at an
 * exact source offset and needs a synthesised hit-box for every `|`; here a
 * drop only needs a side of the cloud, and appending within a side is what a
 * student wants anyway.
 *
 * A press that never travels further than `SLOP` is a tap, not a drag. That is
 * what lets one qubit both be dragged out and be tapped to change colour.
 */

export type Region = 'in' | 'out';

export type Tile =
  /** A qubit of a given colour, bound to the register slot it fills. */
  | { kind: 'qubit'; slot: number; value: 0 | 1 }
  /** A cloud: empty when the cell has none, another alternative when it does. */
  | { kind: 'cloud' }
  /** Flips the sign of whichever term it is dropped on. */
  | { kind: 'minus' };

/** Where a held qubit currently sits in its cell. */
export type Pos =
  | { where: 'out'; slot: number }
  | { where: 'in'; alt: number; index: number };

export type Carry =
  | { kind: 'new'; tile: Tile; x: number; y: number; moved: boolean }
  | { kind: 'held'; row: number; pos: Pos; x: number; y: number; moved: boolean };

/** Mouse gets a tight threshold; a finger needs more room. */
const SLOP = { mouse: 5, touch: 12 };

export interface CarryHost {
  /** Which cell index is under this point, or null for none. */
  cellAt: (x: number, y: number) => number | null;
  /** Inside that cell's cloud, or beside it. */
  regionAt: (cell: number, x: number, y: number) => Region;
  drop: (cell: number, tile: Tile, region: Region, x: number, y: number) => void;
  move: (row: number, pos: Pos, toCell: number, region: Region) => void;
  /** Pull a qubit out of the table entirely. */
  remove: (row: number, pos: Pos) => void;
  /** A press that never travelled: cycle the qubit's colour. */
  tap: (row: number, pos: Pos) => void;
}

export function createCarry(host: CarryHost) {
  let carry = $state<Carry | null>(null);
  let overCell = $state<number | null>(null);
  let overRegion = $state<Region>('out');

  const slopFor = (e: PointerEvent) =>
    e.pointerType === 'mouse' ? SLOP.mouse : SLOP.touch;

  function begin(next: Carry, e: PointerEvent) {
    carry = next;
    overCell = null;
    overRegion = 'out';
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', end);
    window.addEventListener('keydown', onKey);
  }

  function end() {
    carry = null;
    overCell = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', end);
    window.removeEventListener('keydown', onKey);
  }

  function onMove(e: PointerEvent) {
    if (!carry) return;
    if (!carry.moved && Math.hypot(e.clientX - carry.x, e.clientY - carry.y) > slopFor(e)) {
      carry.moved = true;
    }
    if (!carry.moved) return;
    carry.x = e.clientX;
    carry.y = e.clientY;
    const cell = host.cellAt(e.clientX, e.clientY);
    overCell = cell;
    overRegion = cell === null ? 'out' : host.regionAt(cell, e.clientX, e.clientY);
  }

  function onUp(e: PointerEvent) {
    if (!carry) return;
    const c = carry;
    const cell = host.cellAt(e.clientX, e.clientY);
    const region = cell === null ? 'out' : host.regionAt(cell, e.clientX, e.clientY);

    if (!c.moved) {
      // A tap. The palette's own click handler covers new blocks, so only a
      // held qubit has anything left to do.
      if (c.kind === 'held') host.tap(c.row, c.pos);
      end();
      return;
    }

    if (c.kind === 'new') {
      if (cell !== null) host.drop(cell, c.tile, region, e.clientX, e.clientY);
    } else if (cell === null) {
      host.remove(c.row, c.pos);
    } else {
      // Same cell counts: moving a qubit from inside the cloud to beside it is
      // the factoring gesture, and it never changes which cell it is in.
      host.move(c.row, c.pos, cell, region);
    }
    end();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') end();
  }

  return {
    get carry() {
      return carry;
    },
    get overCell() {
      return overCell;
    },
    get overRegion() {
      return overRegion;
    },
    get dragging() {
      return !!carry?.moved;
    },
    grabNew(tile: Tile, e: PointerEvent) {
      begin({ kind: 'new', tile, x: e.clientX, y: e.clientY, moved: false }, e);
    },
    grabHeld(row: number, pos: Pos, e: PointerEvent) {
      begin({ kind: 'held', row, pos, x: e.clientX, y: e.clientY, moved: false }, e);
    },
    cancel: end,
  };
}
