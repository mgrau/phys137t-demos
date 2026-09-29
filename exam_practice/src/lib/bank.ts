import { loadBank } from './questions';
import { validatePhysics } from './engine';
export const BANK = loadBank(import.meta.glob('../../questions/**/*.md', { query: '?raw', import: 'default', eager: true }));
for (const question of BANK) validatePhysics(question);
