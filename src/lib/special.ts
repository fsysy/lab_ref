import { molarMass } from './formula';
import { ATOMIC_WEIGHTS, ATOMIC_WEIGHTS_SOURCE } from './atomic';
import { ucumConvert } from './ucum';
import type { ConversionResult, SourceRef } from './types';

const UCUM_SRC: SourceRef = { label: 'UCUM (Unified Code for Units of Measure)', url: 'https://ucum.org/ucum' };
const UCUM_LHC_SRC: SourceRef = { label: '@lhncbc/ucum-lhc', url: 'https://github.com/lhncbc/ucum-lhc' };
const IUPAC_SRC: SourceRef = { label: ATOMIC_WEIGHTS_SOURCE.label, url: ATOMIC_WEIGHTS_SOURCE.url };

// ---- HbA1c (NGSP ↔ IFCC) ---------------------------------------------------
// 출처: NGSP 마스터 방정식 "NGSP = [0.09148 × IFCC] + 2.152" (ngsp.org/ifcc.asp, 확인일 2026-09-30).
// 역방향은 위 식의 대수적 역함수를 쓴다(별도 계수 없음).
export const HBA1C_SLOPE = 0.09148;
export const HBA1C_INTERCEPT = 2.152;
const NGSP_SRC: SourceRef = {
  label: 'NGSP — HbA1c Assay Standardization (IFCC/NGSP master equation)',
  url: 'https://ngsp.org/ifcc.asp',
};

function hba1c(value: number, from: string, to: string): ConversionResult {
  const ok = (u: string) => u === '%' || u === 'mmol/mol';
  if (!ok(from) || !ok(to)) {
    return { ok: false, code: 'invalid-unit', reason: 'HbA1c는 % (NGSP/DCCT)와 mmol/mol (IFCC)만 변환할 수 있습니다.' };
  }
  const base = {
    sources: [NGSP_SRC],
    assumptions: ['NGSP(%)와 IFCC(mmol/mol)의 관계는 선형 마스터 방정식으로 근사한다.'],
    warnings: [] as string[],
  };
  if (from === to) {
    return { ok: true, value, factor: 1, method: 'identity', formula: '동일 단위: 값 그대로', steps: [], ...base };
  }
  if (from === 'mmol/mol') {
    const v = HBA1C_SLOPE * value + HBA1C_INTERCEPT;
    return {
      ok: true, value: v, method: 'special:hba1c-ifcc-to-ngsp',
      formula: `NGSP(%) = ${HBA1C_SLOPE} × IFCC(mmol/mol) + ${HBA1C_INTERCEPT}`,
      steps: [`${HBA1C_SLOPE} × ${value} + ${HBA1C_INTERCEPT} = ${v}`], ...base,
    };
  }
  const v = (value - HBA1C_INTERCEPT) / HBA1C_SLOPE;
  if (v < 0) {
    return { ok: false, code: 'out-of-domain', reason: `NGSP ${value}%는 마스터 방정식의 절편(${HBA1C_INTERCEPT}%) 이하라 IFCC 값이 음수가 됩니다. 변환할 수 없습니다.` };
  }
  return {
    ok: true, value: v, method: 'special:hba1c-ngsp-to-ifcc',
    formula: `IFCC(mmol/mol) = (NGSP(%) − ${HBA1C_INTERCEPT}) ÷ ${HBA1C_SLOPE}  ← NGSP = ${HBA1C_SLOPE} × IFCC + ${HBA1C_INTERCEPT}의 역함수`,
    steps: [`(${value} − ${HBA1C_INTERCEPT}) ÷ ${HBA1C_SLOPE} = ${v}`], ...base,
  };
}

// ---- 요소질소(BUN) ↔ 요소 ---------------------------------------------------
// 요소 CH4N2O 1 mol에 질소 2 mol이 있다는 화학량론에서 유도한다.
// 기준 몰질량: {BUN} → 2×N (요소 1 mol당 질소 질량), {urea} → 요소 몰질량.
type Basis = { mw?: number; text: string } | { error: string };

function bunBasis(unit: string): Basis {
  const isMass = ucumConvert(unit, 1, 'g/L').ok;
  if (!isMass) return { text: '몰 농도(요소 기준)' };
  if (/\{BUN\}/i.test(unit)) {
    const mw = 2 * ATOMIC_WEIGHTS.N.value;
    return { mw, text: `질소 기준 2×N = 2×${ATOMIC_WEIGHTS.N.value} = ${+mw.toFixed(4)} g/mol(요소 1 mol당)` };
  }
  if (/\{urea\}/i.test(unit)) {
    const m = molarMass('CH4N2O');
    return { mw: m.mw, text: `요소 CH4N2O: ${m.expression} g/mol` };
  }
  return { error: `질량 단위 ${unit}만으로는 요소질소(BUN)와 요소를 구분할 수 없습니다. mg/dL{BUN} 또는 mg/dL{urea}처럼 기준을 명시하세요.` };
}

const mwOpt = (b: { mw?: number }) => (b.mw === undefined ? {} : { molecularWeight: b.mw });

function bun(value: number, from: string, to: string): ConversionResult {
  const f = bunBasis(from);
  const t = bunBasis(to);
  if ('error' in f) return { ok: false, code: 'invalid-unit', reason: f.error };
  if ('error' in t) return { ok: false, code: 'invalid-unit', reason: t.error };
  const run = (v: number) => {
    const s1 = ucumConvert(from, v, 'mmol/L', mwOpt(f));
    if (!s1.ok) return { ok: false as const, message: `${from}을(를) mmol/L로 바꿀 수 없습니다: ${s1.message}` };
    const s2 = ucumConvert('mmol/L', s1.value, to, mwOpt(t));
    if (!s2.ok) return { ok: false as const, message: `${to}(으)로 바꿀 수 없습니다: ${s2.message}` };
    return { ok: true as const, mid: s1.value, value: s2.value };
  };
  const r = run(value);
  if (!r.ok) return { ok: false, code: 'invalid-unit', reason: r.message };
  const one = run(1);
  return {
    ok: true, value: r.value, factor: one.ok ? one.value : undefined,
    method: 'special:bun-urea',
    formula: '요소(mmol/L) = BUN(mg/dL) × 10 ÷ (2 × M(N)) ;  1 mol 요소 = 2 mol N',
    steps: [
      `입력 → mmol/L(요소): 기준 ${f.text}`,
      `mmol/L(요소) → 출력: 기준 ${t.text}`,
      `${value} ${from} → ${r.mid} mmol/L → ${r.value} ${to}`,
    ],
    assumptions: ['요소 분자 1개에 질소 원자 2개가 있다(CH4N2O). BUN은 요소 자체가 아니라 질소 질량으로 보고한다.'],
    warnings: [],
    sources: [IUPAC_SRC, UCUM_SRC, UCUM_LHC_SRC],
  };
}

// ---- uACR / uPCR (mg/g ↔ mg/mmol) ---------------------------------------
// 분모가 요 크레아티닌: mg(분자)/g(크레아티닌) ↔ mg(분자)/mmol(크레아티닌).
// 계수는 크레아티닌 몰질량(C4H7N3O)에서 UCUM이 계산한다.
const KDIGO_SRC: SourceRef = {
  label: 'KDIGO 2024 Clinical Practice Guideline for CKD (albuminuria categories, ACR)',
  // TODO(verify): 본문에서 mg/g ↔ mg/mmol 병기를 직접 확인하지 못했다.
  url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
};

function acrClass(u: string): 'per-mass' | 'per-mol' | null {
  if (ucumConvert(u, 1, 'mg/g').ok) return 'per-mass';
  if (ucumConvert(u, 1, 'mg/mmol').ok) return 'per-mol';
  return null;
}

function acr(value: number, from: string, to: string): ConversionResult {
  const cf = acrClass(from);
  const ct = acrClass(to);
  if (!cf || !ct) {
    return { ok: false, code: 'invalid-unit', reason: 'uACR·uPCR은 mg/g 계열(질량/질량) 또는 mg/mmol 계열(질량/물질량) 단위만 변환할 수 있습니다.' };
  }
  const cr = molarMass('C4H7N3O');
  const r = ucumConvert(from, value, to, { molecularWeight: cr.mw });
  if (!r.ok) return { ok: false, code: 'invalid-unit', reason: r.message };
  const one = ucumConvert(from, 1, to, { molecularWeight: cr.mw });
  const warnings: string[] = [];
  if (cf !== ct) {
    warnings.push('KDIGO 등은 30 mg/g ≈ 3 mg/mmol처럼 반올림한 값을 병기한다. 이 앱은 크레아티닌 몰질량으로 계산하므로 30 mg/g는 약 3.39 mg/mmol이다.');
  }
  return {
    ok: true, value: r.value, factor: one.ok ? one.value : undefined,
    method: cf === ct ? 'ucum-scale' : 'special:acr-creatinine-mw',
    formula: cf === ct
      ? '같은 종류의 단위: UCUM 스케일 변환'
      : 'ACR(mg/mmol) = ACR(mg/g) × M(크레아티닌)[g/mol] ÷ 1000 ;  ACR(mg/g) = ACR(mg/mmol) × 1000 ÷ M(크레아티닌)',
    steps: [`크레아티닌 C4H7N3O: ${cr.expression} g/mol`, `${value} ${from} → ${r.value} ${to}`],
    assumptions: ['분모는 요 크레아티닌이다. 분자(알부민 또는 총단백)의 종류는 계수에 영향을 주지 않는다.'],
    warnings,
    sources: [KDIGO_SRC, IUPAC_SRC, UCUM_SRC, UCUM_LHC_SRC],
  };
}

export const SPECIAL_HANDLERS = { hba1c, bun, acr } as const;
