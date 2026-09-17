/**
 * Money or tiger, following Lecture 8.
 *
 * Two doors, labelled with a white square and a black square. The promise is
 * that either both contain money or exactly one hides a tiger. The Oracle flips
 * the circle if there is a tiger behind the door selected by the square.
 *
 * Quantum circuits and measurements are simulated in quantum.ts. The sealed
 * oracle and its elementary implementation share the same truth table.
 */

/** What is behind the two doors. */
export type Where = 'none' | 'white' | 'black';

export const WHERE: { id: Where; label: string; short: string }[] = [
  { id: 'none', label: 'Money behind both doors', short: 'Both money' },
  { id: 'white', label: 'A tiger behind the white door', short: 'White door' },
  { id: 'black', label: 'A tiger behind the black door', short: 'Black door' },
];

/**
 * The Oracle, as circuit source.
 *
 * The black-door case is a CNOT: the square is the control,
 * so the circle flips exactly when the square is black. The white-door case is
 * the same thing about the other door, so the control is inverted with a NOT
 * either side — three layers, because those gates share wires.
 */
export function oracle(where: Where): string {
  if (where === 'none') return 'I 1; I 2';
  if (where === 'black') return 'CNOT 1 2';
  return 'X 1\nCNOT 1 2\nX 1';
}

/** Sealed artwork only; its behavior is oracleOutput, extended linearly. */
export const ORACLE_GATE = 'CNOT 1 2 "Tiger?"';

/**
 * The sealed oracle's behavior on a basis state.
 *
 * The square selects a door (white = 0, black = 1). The oracle implicitly
 * toggles the circle exactly when that selected door contains the tiger.
 * This is the behavior represented by the named gate; it is deliberately
 * independent of whichever elementary gates implement it in the Inside view.
 */
export function oracleOutput(
  where: Where,
  square: '0' | '1',
  circle: '0' | '1',
): '0' | '1' {
  const selectedDoor = square === '0' ? 'white' : 'black';
  return where === selectedDoor ? (circle === '0' ? '1' : '0') : circle;
}

/** What one classical query reveals: did the circle come back flipped? */
export function classicalAnswer(where: Where, door: 'white' | 'black'): boolean {
  const square = door === 'white' ? '0' : '1';
  return oracleOutput(where, square, '0') === '1';
}
