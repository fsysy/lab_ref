import type { Analyte } from './analytes';
import { ATOMIC_WEIGHTS_SOURCE } from './atomic';
import { molarMass } from './formula';
import { SPECIAL_HANDLERS } from './special';
import { KIND_LABEL, normalizeUnit, ucumConvert, unitKind, validateUnit, type UnitKind } from './ucum';
import { formatSig } from './format';
import type { ConversionResult, SourceRef } from './types';

const UCUM_SRC: SourceRef = { label: 'UCUM (Unified Code for Units of Measure)', url: 'https://ucum.org/ucum' };
const UCUM_LHC_SRC: SourceRef = { label: '@lhncbc/ucum-lhc', url: 'https://github.com/lhncbc/ucum-lhc' };
const IUPAC_SRC: SourceRef = { label: ATOMIC_WEIGHTS_SOURCE.label, url: ATOMIC_WEIGHTS_SOURCE.url };

/** 분석물이 의미 있게 가질 수 있는 단위 종류. 여기에 없으면 근거가 없으므로 거부한다. */
export function allowedKinds(a: Analyte): UnitKind[] {
  if (a.category === 'enzyme') return ['catalytic-conc'];
  if (!a.formula) return ['mass-conc'];
  return a.charge ? ['mass-conc', 'molar-conc', 'equiv-conc'] : ['mass-conc', 'molar-conc'];
}

function refuseKind(a: Analyte, unit: string, kind: UnitKind): ConversionResult {
  const name = a.names.ko || a.names.en;
  const allowed = allowedKinds(a).map((k) => KIND_LABEL[k]).join(', ');
  let why: string;
  if (kind === 'catalytic-conc') {
    why = `${unit}은(는) 효소 활성 단위입니다. ${name}은(는) 활성 분석물이 아니므로 근거가 없습니다.`;
  } else if (a.category === 'enzyme') {
    why = `${name}은(는) 효소라 촉매 활성(U/L, µkat/L) 단위로만 보고합니다. 활성은 반응 속도이므로 질량·몰 농도와 연결하려면 효소의 비활성(U/mg)과 분자량 정보가 추가로 필요하며 이 앱은 그런 변환 근거를 갖고 있지 않습니다.`;
  } else if (kind === 'molar-conc' && !a.formula) {
    why = `${name}은(는) 단일 분자량이 정의되지 않아(단백질·혼합물 등) 질량↔몰 변환의 근거가 없습니다.`;
  } else if (kind === 'equiv-conc') {
    why = a.formula
      ? `${name}은(는) 이온 전하(당량)가 정의되지 않아 mEq 변환의 근거가 없습니다.${a.assumptions?.length ? ' ' + a.assumptions.join(' ') : ''}`
      : `${name}은(는) 분자량과 이온 전하가 정의되지 않아 당량 변환의 근거가 없습니다.`;
  } else if (kind === 'unknown') {
    why = `${unit}은(는) 이 앱이 다루는 농도 단위(질량·몰·당량·촉매 활성)로 분류되지 않습니다.`;
  } else {
    why = `${unit}(${KIND_LABEL[kind]})은(는) ${name}에 적용할 근거가 없습니다.`;
  }
  return { ok: false, code: 'no-basis', reason: `${why} 허용되는 단위 종류: ${allowed}.` };
}

export function convert(a: Analyte, value: number, fromRaw: string, toRaw: string): ConversionResult {
  if (!Number.isFinite(value)) return { ok: false, code: 'invalid-value', reason: '숫자를 입력하세요.' };
  const from = normalizeUnit(fromRaw);
  const to = normalizeUnit(toRaw);
  for (const u of [from, to]) {
    if (u === '') return { ok: false, code: 'invalid-unit', reason: '단위를 입력하세요.' };
    const v = validateUnit(u);
    if (!v.valid) return { ok: false, code: 'invalid-unit', reason: `UCUM에서 인식할 수 없는 단위입니다: ${u}. ${v.message ?? ''}`.trim() };
  }

  if (a.special && a.special !== 'triglycerides') {
    return SPECIAL_HANDLERS[a.special](value, from, to);
  }

  const kf = unitKind(from);
  const kt = unitKind(to);
  const allowed = allowedKinds(a);
  if (!allowed.includes(kf)) return refuseKind(a, from, kf);
  if (!allowed.includes(kt)) return refuseKind(a, to, kt);

  const mm = a.formula ? molarMass(a.formula) : undefined;
  const opts = { molecularWeight: mm?.mw, charge: a.charge };
  const r = ucumConvert(from, value, to, opts);
  if (!r.ok) {
    return { ok: false, code: 'no-basis', reason: `UCUM이 변환을 거부했습니다: ${r.message}` };
  }
  const one = ucumConvert(from, 1, to, opts);
  const factor = one.ok ? one.value : undefined;

  const needsMw = (kf === 'mass-conc') !== (kt === 'mass-conc');
  const needsCharge = (kf === 'equiv-conc') !== (kt === 'equiv-conc');
  const method = from === to
    ? 'identity'
    : needsMw && needsCharge ? 'ucum-mw-charge' : needsMw ? 'ucum-mw' : needsCharge ? 'ucum-charge' : 'ucum-scale';

  const steps: string[] = [];
  const sources: SourceRef[] = [UCUM_SRC, UCUM_LHC_SRC];
  const assumptions: string[] = [...(a.assumptions ?? [])];
  const warnings: string[] = [];
  if (mm && needsMw) {
    steps.push(`분자량 M = ${mm.expression} g/mol  (${mm.formula}, IUPAC 원자량으로 계산)`);
    sources.push(IUPAC_SRC);
  }
  if (a.charge && needsCharge) steps.push(`이온 전하 |z| = ${a.charge}  →  1 mol = ${a.charge} eq`);
  steps.push(`UCUM 변환: ${formatSig(value, 6)} ${from} → ${formatSig(r.value, 6)} ${to}`);

  let formula: string;
  if (from === to) formula = '동일 단위: 값 그대로';
  else if (factor !== undefined) formula = `C(${to}) = C(${from}) × ${formatSig(factor, 6)}`;
  else formula = `UCUM 변환 (${from} → ${to})`;
  if (needsMw && mm) formula += `   [질량↔몰: n = m ÷ M, M = ${formatSig(mm.mw, 6)} g/mol]`;
  if (needsCharge) formula += `   [당량: eq = mol × ${a.charge}]`;

  if (!allowedUnitsListed(a, from) || !allowedUnitsListed(a, to)) {
    warnings.push('입력·대상 단위 중 일부는 이 분석물의 일반 보고 단위가 아닙니다. 결과는 계산상 유효하지만 단위 표기를 다시 확인하세요.');
  }
  if (a.special === 'triglycerides') {
    // TODO(verify): 중성지방 환산 계수(≈88.5 mg/dL per mmol/L)의 인용 가능한 출처 미확인
    warnings.push('출처 미확인: 중성지방 평균 분자량 가정(트리올레인)의 문헌 근거를 확인하지 못했습니다. TODO(verify)');
  }

  return { ok: true, value: r.value, factor, method, formula, steps, assumptions, warnings, sources };
}

function allowedUnitsListed(a: Analyte, unit: string): boolean {
  return a.units.includes(unit);
}
