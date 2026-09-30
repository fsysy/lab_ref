import { ATOMIC_WEIGHTS } from './atomic';

export interface FormulaTerm {
  symbol: string;
  count: number;
  weight: number;
  subtotal: number;
}

export interface MolarMass {
  formula: string;
  mw: number;
  terms: FormulaTerm[];
  /** 사람이 읽는 계산식: "C 6×12.011 + H 12×1.008 + … = 180.156" */
  expression: string;
}

/** 괄호 없는 단순 분자식만 지원 (예: C6H12O6). 잘못된 식은 예외. */
export function molarMass(formula: string): MolarMass {
  const re = /([A-Z][a-z]?)(\d*)/y;
  const terms: FormulaTerm[] = [];
  let pos = 0;
  while (pos < formula.length) {
    re.lastIndex = pos;
    const m = re.exec(formula);
    if (!m || m[0] === '') throw new Error(`분자식을 해석할 수 없습니다: ${formula}`);
    const aw = ATOMIC_WEIGHTS[m[1]];
    if (!aw) throw new Error(`원자량 표에 없는 원소: ${m[1]} (${formula})`);
    const count = m[2] === '' ? 1 : Number(m[2]);
    terms.push({ symbol: m[1], count, weight: aw.value, subtotal: aw.value * count });
    pos = re.lastIndex;
  }
  if (terms.length === 0) throw new Error('빈 분자식');
  const mw = terms.reduce((s, t) => s + t.subtotal, 0);
  const expression =
    terms.map((t) => `${t.symbol} ${t.count}×${t.weight}`).join(' + ') + ` = ${+mw.toFixed(4)}`;
  return { formula, mw, terms, expression };
}
