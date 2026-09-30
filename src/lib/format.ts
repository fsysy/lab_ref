/** 유효숫자 n자리로 표시 (지수 표기 회피, 0 처리). */
export function formatSig(x: number, digits = 4): string {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e9 || abs < 1e-6) return x.toExponential(digits - 1);
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(abs)));
  return String(Number(x.toFixed(Math.min(decimals, 12))));
}

/** 사용자 입력 숫자 파싱. 빈 값·비숫자는 null. 소수점 대신 쉼표(1,5)는 '.'이 없을 때만 소수점으로 본다. */
export function parseNumber(s: string): number | null {
  let t = s.trim();
  if (t === '') return null;
  if (!t.includes('.') && /^[+-]?\d+,\d+$/.test(t)) t = t.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 표시용 단위 라벨: umol/L → µmol/L, 주석 {BUN} → (BUN). */
export function unitLabel(unit: string): string {
  return unit
    .replace(/^u(?=[a-zA-Z])/, 'µ')
    .replace(/\/u(?=[a-zA-Z])/g, '/µ')
    .replace(/\{([^}]*)\}/g, ' ($1)');
}
