import { parseDocument } from 'yaml';

export const WEEKS = [
  'Information & classical gates', 'Qubits & operations',
  'Probability & measurement', 'Conditional states & interference',
  'Entanglement & nonlocality',
];
export type Kind = 'choice' | 'number' | 'probability' | 'state' | 'truth-table' | 'circuit';
export interface Question {
  id: string; title: string; week: number; kind: Kind; source: string;
  prompt: string; steps: string[];
  diagram?: string; shapes: string; qubits: number;
  circuit?: string; given?: string;
  options?: string[]; answer?: number[];
  fields?: { label: string; value: number }[];
  events?: { label: string; pattern: string }[];
  input?: string; target?: string; example?: string;
  gates?: string[]; maxGates: number;
}

/** One ordinary Markdown file per question; no executable code in the bank. */
export function parseQuestion(raw: string, filename: string): Question {
  const fail = (message: string): never => { throw new Error(`${filename}: ${message}`); };
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return fail('Expected YAML front matter between --- lines.');
  const doc = parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length) return fail(doc.errors[0].message);
  const data = doc.toJS() as Record<string, unknown>;
  if (!data || Array.isArray(data) || typeof data !== 'object') return fail('Expected question fields.');
  const known = new Set(['id','title','week','kind','source','diagram','shapes','qubits','circuit','given','options','answer','fields','events','input','target','example','gates','maxGates']);
  for (const key of Object.keys(data)) if (!known.has(key)) fail(`Unknown field: ${key}`);
  for (const key of ['id','title','source','kind']) if (typeof data[key] !== 'string' || !data[key]) fail(`Missing ${key}.`);
  if (!/^[a-z0-9-]+$/.test(String(data.id))) fail('id must use lowercase letters, digits and hyphens.');
  if (!Number.isInteger(data.week) || Number(data.week) < 1 || Number(data.week) > 5) fail('week must be 1–5.');
  if (!['choice','number','probability','state','truth-table','circuit'].includes(String(data.kind))) fail('Unknown question kind.');
  for (const key of ['diagram','shapes','circuit','given','input','target','example']) {
    if (data[key] !== undefined && typeof data[key] !== 'string') fail(`${key} must be text; quote bit patterns such as "00".`);
  }
  const parts = match[2].split(/^## Solution\s*$/m);
  if (parts.length !== 2 || !parts[0].trim()) fail('Include a prompt and a ## Solution section.');
  const steps = parts[1].trim().split(/(?=^### )/m).map(s => s.trim()).filter(Boolean);
  if (steps.length < 2) fail('Include at least two solution steps, each starting with ###.');
  const qubits = data.qubits ?? 1;
  if (!Number.isInteger(qubits) || Number(qubits) < 1 || Number(qubits) > 3) fail('qubits must be 1–3.');
  const shapes = data.shapes ?? 'os^'.slice(0, Number(qubits));
  if (typeof shapes !== 'string' || shapes.length !== qubits || !/^[os^d]+$/.test(shapes)) fail('shapes must specify one shape per qubit (o, s, ^, d).');
  const q = { maxGates: 10, ...data, qubits, shapes, prompt: parts[0].trim(), steps } as Question;
  const pattern = (v: unknown) => typeof v === 'string' && v.length === q.qubits && /^[01?]+$/.test(v);
  if (q.given && !pattern(q.given)) fail('given must contain one 0, 1 or ? per qubit.');
  if (q.kind === 'choice') {
    if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(s => typeof s === 'string')) fail('Supply at least two text options.');
    if (!Array.isArray(q.answer) || !q.answer.length || q.answer.some(n => !Number.isInteger(n) || n < 1 || n > q.options!.length) || new Set(q.answer).size !== q.answer.length) fail('answer must list unique option numbers, starting at 1.');
  }
  if (q.kind === 'number' && (!Array.isArray(q.fields) || !q.fields.length || q.fields.some(f => typeof f.label !== 'string' || !Number.isFinite(f.value)))) fail('fields need a label and numeric value.');
  if (q.kind === 'probability' && (!Array.isArray(q.events) || !q.events.length || q.events.some(e => typeof e.label !== 'string' || !pattern(e.pattern)))) fail('events need a label and a quoted bit pattern.');
  if (['state','probability','truth-table'].includes(q.kind) && !q.circuit) fail('This kind needs a circuit.');
  if (q.kind === 'truth-table' && q.given) fail('Truth tables cannot have a measurement condition.');
  if (q.kind === 'circuit') {
    if (!q.input || !q.target || !q.example) fail('Circuit construction needs input, target and example.');
    if (!Array.isArray(q.gates) || !q.gates.length || q.gates.some(g => !['H','X','CNOT','SWAP','TOFFOLI'].includes(g))) fail('Supply allowed gates: H, X, CNOT, SWAP, TOFFOLI.');
    if (!Number.isInteger(q.maxGates) || q.maxGates < 1 || q.maxGates > 16) fail('maxGates must be 1–16.');
  }
  return q;
}

export function loadBank(files: Record<string, string>): Question[] {
  const bank = Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([name, raw]) => parseQuestion(raw, name));
  const ids = new Set<string>();
  for (const q of bank) { if (ids.has(q.id)) throw new Error(`Duplicate question id: ${q.id}`); ids.add(q.id); }
  if (!bank.length) throw new Error('The question bank is empty.');
  return bank;
}
