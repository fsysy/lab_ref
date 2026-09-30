import { ANALYTES, type Analyte } from './analytes';

/** 소문자화 + 공백·하이픈·괄호·점 제거 + NFC. 한글은 그대로 부분일치. */
export function norm(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[\s\-_().,/]/g, '');
}

function score(a: Analyte, q: string): number {
  const terms = [a.id, a.names.en, a.names.ko, ...a.names.synonyms].map(norm);
  let best = 0;
  for (const t of terms) {
    if (t === q) best = Math.max(best, 100);
    else if (t.startsWith(q)) best = Math.max(best, 60);
    else if (t.includes(q)) best = Math.max(best, 30);
  }
  return best;
}

export function searchAnalytes(query: string, limit = 10): Analyte[] {
  const q = norm(query);
  if (q === '') return ANALYTES.slice(0, limit);
  return ANALYTES.map((a) => ({ a, s: score(a, q) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.a.names.en.localeCompare(y.a.names.en))
    .slice(0, limit)
    .map((x) => x.a);
}
