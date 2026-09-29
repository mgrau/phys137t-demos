import type { Verdict } from './engine';
export interface Progress { wrong: string[]; solved: boolean; revealed: boolean; independent: boolean }
export const freshProgress = (): Progress => ({ wrong: [], solved: false, revealed: false, independent: false });
export function recordCheck(progress: Progress, fingerprint: string, verdict: Verdict): Progress {
  if (verdict.status === 'incomplete') return progress;
  if (verdict.status === 'correct') return { ...progress, solved: true, independent: progress.independent || !progress.revealed };
  if (progress.wrong.includes(fingerprint)) return progress;
  return { ...progress, wrong: [...progress.wrong, fingerprint] };
}
export function shuffled<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function loadProgress(storage: Pick<Storage, 'getItem'>): Record<string, Progress> {
  try {
    const raw: unknown = JSON.parse(storage.getItem('phys137t-exam-practice-v1') ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([, p]) => p && Array.isArray(p.wrong) && p.wrong.every((s: unknown) => typeof s === 'string') && typeof p.solved === 'boolean' && typeof p.revealed === 'boolean' && typeof p.independent === 'boolean'));
  } catch { return {}; }
}
