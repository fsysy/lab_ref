import { describe, expect, it } from 'vitest';
import { ANALYTES, getAnalyte } from '../src/lib/analytes';
import { ATOMIC_WEIGHTS } from '../src/lib/atomic';
import { convert } from '../src/lib/convert';
import { molarMass } from '../src/lib/formula';
import { HBA1C_INTERCEPT, HBA1C_SLOPE } from '../src/lib/special';
import { normalizeUnit } from '../src/lib/ucum';
import { formatSig, parseNumber } from '../src/lib/format';

const A = (id: string) => getAnalyte(id)!;

describe('원자량·분자량 계산', () => {
  it('구간 원소의 관례값은 IUPAC 구간 근처에 있다', () => {
    for (const [sym, w] of Object.entries(ATOMIC_WEIGHTS)) {
      if (!w.interval) continue;
      const [lo, hi] = w.interval;
      expect(w.value, sym).toBeGreaterThanOrEqual(lo - 0.001);
      expect(w.value, sym).toBeLessThanOrEqual(hi + 0.001);
    }
  });

  it('포도당 C6H12O6 ≈ 180.16', () => {
    const m = molarMass('C6H12O6');
    expect(m.mw).toBeCloseTo(180.156, 2);
    expect(m.expression).toContain('C 6×12.011');
  });

  it('잘못된 분자식은 예외', () => {
    expect(() => molarMass('Xx2')).toThrow();
    expect(() => molarMass('c6')).toThrow();
    expect(() => molarMass('')).toThrow();
  });

  it('카탈로그의 모든 분자식이 해석된다', () => {
    for (const a of ANALYTES) if (a.formula) expect(molarMass(a.formula).mw, a.id).toBeGreaterThan(0);
  });
});

describe('UCUM 스케일 + 분자량 변환', () => {
  it('포도당 100 mg/dL → 약 5.55 mmol/L', () => {
    const r = convert(A('glucose'), 100, 'mg/dL', 'mmol/L');
    expect(r.ok && r.value).toBeCloseTo(5.55, 2);
    if (r.ok) {
      expect(r.method).toBe('ucum-mw');
      expect(r.steps.join(' ')).toContain('C6H12O6');
      expect(r.sources.some((s) => s.url?.includes('ciaaw'))).toBe(true);
    }
  });

  it('칼슘 mg/dL → mEq/L (전하 2)', () => {
    const r = convert(A('calcium'), 10, 'mg/dL', 'meq/L');
    expect(r.ok && r.value).toBeCloseTo(4.99, 2);
    if (r.ok) expect(r.method).toBe('ucum-mw-charge');
  });

  it('나트륨 mEq/L = mmol/L (전하 1)', () => {
    const r = convert(A('sodium'), 140, 'meq/L', 'mmol/L');
    expect(r.ok && r.value).toBeCloseTo(140, 9);
  });

  it('효소 U/L → µkat/L 은 스케일 변환', () => {
    const r = convert(A('alt'), 60, 'U/L', 'ukat/L');
    expect(r.ok && r.value).toBeCloseTo(1, 9);
  });

  it('입력 표기 정규화: µ, mEq, mg/dl', () => {
    expect(normalizeUnit('µmol/L')).toBe('umol/L');
    expect(normalizeUnit('mEq/L')).toBe('meq/L');
    expect(normalizeUnit('mg/dl')).toBe('mg/dL');
    const r = convert(A('creatinine'), 1, 'mg/dl', 'µmol/L');
    expect(r.ok && r.value).toBeCloseTo(88.4, 0);
  });

  it('같은 단위는 identity', () => {
    const r = convert(A('glucose'), 5, 'mg/dL', 'mg/dL');
    expect(r.ok && r.method).toBe('identity');
    expect(r.ok && r.value).toBe(5);
  });
});

describe('왕복 변환 (전 분석물, 전 단위 쌍)', () => {
  const values = [0.5, 12.345, 100, 4321.5];
  for (const a of ANALYTES) {
    it(`${a.id}`, () => {
      let checked = 0;
      for (const u1 of a.units) {
        for (const u2 of a.units) {
          for (const v of values) {
            const fwd = convert(a, v, u1, u2);
            if (!fwd.ok) continue; // 허용되지 않는 쌍(예: HbA1c 음수 영역)은 거부되어야 하며 아래서 별도 검증
            const back = convert(a, fwd.value, u2, u1);
            expect(back.ok, `${a.id} ${u2}→${u1}`).toBe(true);
            if (back.ok) expect(Math.abs(back.value - v) / v, `${a.id} ${v} ${u1}→${u2}→${u1}`).toBeLessThan(1e-9);
            checked++;
          }
        }
      }
      expect(checked, `${a.id}: 검증된 쌍이 있어야 한다`).toBeGreaterThan(0);
    });
  }
});

describe('근거 없는 변환은 이유와 함께 거부', () => {
  const refused = (id: string, from: string, to: string, code?: string) => {
    const r = convert(A(id), 1, from, to);
    expect(r.ok, `${id} ${from}→${to}`).toBe(false);
    if (!r.ok) {
      expect(r.reason.length).toBeGreaterThan(5);
      if (code) expect(r.code).toBe(code);
    }
    return r;
  };

  it('mg/dL → U/L (포도당): 활성 단위가 아님', () => {
    const r = refused('glucose', 'mg/dL', 'U/L', 'no-basis');
    if (!r.ok) expect(r.reason).toContain('효소 활성');
  });

  it('mg/dL → U/L (ALT): 효소는 질량 농도로 보고하지 않음', () => {
    const r = refused('alt', 'mg/dL', 'U/L', 'no-basis');
    if (!r.ok) expect(r.reason).toContain('효소');
  });

  it('알부민 g/dL → mmol/L: 분자량 미정의', () => {
    const r = refused('albumin', 'g/dL', 'mmol/L', 'no-basis');
    if (!r.ok) expect(r.reason).toContain('분자량');
  });

  it('인산염 mg/dL → mEq/L: 전하 미정의', () => {
    const r = refused('phosphate', 'mg/dL', 'meq/L', 'no-basis');
    if (!r.ok) expect(r.reason).toContain('전하');
  });

  it('요산 → mEq/L 거부, 알 수 없는 단위·빈 단위·NaN 거부', () => {
    refused('uric-acid', 'mg/dL', 'meq/L', 'no-basis');
    refused('glucose', 'mg/dL', 'foo/bar', 'invalid-unit');
    refused('glucose', 'mg/dL', '', 'invalid-unit');
    expect(convert(A('glucose'), NaN, 'mg/dL', 'mmol/L')).toMatchObject({ ok: false, code: 'invalid-value' });
  });

  it('UCUM 대소문자: MG/DL 은 거부', () => {
    expect(convert(A('glucose'), 1, 'MG/DL', 'mmol/L').ok).toBe(false);
  });
});

describe('특수 변환: HbA1c', () => {
  it('IFCC 53 mmol/mol → NGSP 7.0 %', () => {
    const r = convert(A('hba1c'), 53, 'mmol/mol', '%');
    expect(r.ok && r.value).toBeCloseTo(HBA1C_SLOPE * 53 + HBA1C_INTERCEPT, 12);
    expect(r.ok && r.value).toBeCloseTo(7.0, 1);
    if (r.ok) expect(r.sources[0].url).toBe('https://ngsp.org/ifcc.asp');
  });

  it('NGSP 6.5 % → IFCC 약 48 mmol/mol', () => {
    const r = convert(A('hba1c'), 6.5, '%', 'mmol/mol');
    expect(r.ok && Math.round(r.value)).toBe(48);
  });

  it('절편 이하 NGSP 는 거부 (음수 IFCC)', () => {
    expect(convert(A('hba1c'), 2, '%', 'mmol/mol')).toMatchObject({ ok: false, code: 'out-of-domain' });
  });

  it('지원하지 않는 단위 거부', () => {
    expect(convert(A('hba1c'), 6.5, '%', 'mg/dL').ok).toBe(false);
  });
});

describe('특수 변환: uACR / uPCR', () => {
  it('30 mg/g → 크레아티닌 몰질량으로 계산한 mg/mmol (KDIGO 병기 ≈3 과 근사)', () => {
    const r = convert(A('uacr'), 30, 'mg/g', 'mg/mmol');
    expect(r.ok && r.value).toBeCloseTo(30 * molarMass('C4H7N3O').mw / 1000, 6);
    expect(r.ok && r.value).toBeGreaterThan(3.0);
    expect(r.ok && r.value).toBeLessThan(3.5);
    if (r.ok) expect(r.warnings.join(' ')).toContain('반올림');
  });

  it('uPCR 도 같은 계수, 역변환', () => {
    const f = convert(A('upcr'), 150, 'mg/g', 'mg/mmol');
    expect(f.ok).toBe(true);
    if (f.ok) {
      const b = convert(A('upcr'), f.value, 'mg/mmol', 'mg/g');
      expect(b.ok && b.value).toBeCloseTo(150, 9);
    }
  });

  it('g/g 같은 스케일 변형도 UCUM으로 처리', () => {
    const r = convert(A('uacr'), 0.03, 'g/g', 'mg/g');
    expect(r.ok && r.value).toBeCloseTo(30, 9);
  });

  it('mg/dL 같은 종류는 거부', () => {
    expect(convert(A('uacr'), 1, 'mg/dL', 'mg/mmol').ok).toBe(false);
  });
});

describe('특수 변환: BUN ↔ 요소, 중성지방', () => {
  it('BUN 10 mg/dL → 요소 3.57 mmol/L (요소 1 mol = 질소 2 mol)', () => {
    const r = convert(A('bun'), 10, 'mg/dL{BUN}', 'mmol/L{urea}');
    expect(r.ok && r.value).toBeCloseTo((10 * 10) / (2 * ATOMIC_WEIGHTS.N.value), 6);
  });

  it('BUN mg/dL ↔ 요소 mg/dL 비는 2N / M(요소)', () => {
    const r = convert(A('bun'), 1, 'mg/dL{urea}', 'mg/dL{BUN}');
    expect(r.ok && r.value).toBeCloseTo((2 * ATOMIC_WEIGHTS.N.value) / molarMass('CH4N2O').mw, 6);
  });

  it('기준 주석 없는 mg/dL 은 BUN/요소를 구분할 수 없어 거부', () => {
    const r = convert(A('bun'), 10, 'mg/dL', 'mmol/L{urea}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('구분');
  });

  it('중성지방은 가정과 출처 미확인 경고를 함께 표시', () => {
    const r = convert(A('triglycerides'), 150, 'mg/dL', 'mmol/L');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.assumptions.join(' ')).toContain('트리올레인');
      expect(r.warnings.join(' ')).toContain('TODO(verify)');
    }
  });
});

describe('표시 유틸', () => {
  it('formatSig', () => {
    expect(formatSig(5.550744909966919)).toBe('5.551');
    expect(formatSig(0)).toBe('0');
    expect(formatSig(1234.5678)).toBe('1235');
    expect(formatSig(0.000123456)).toBe('0.0001235');
  });

  it('parseNumber', () => {
    expect(parseNumber('12.5')).toBe(12.5);
    expect(parseNumber(' 1,5 ')).toBe(1.5);
    expect(parseNumber('1,234.5')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1e3')).toBe(1000);
  });
});
