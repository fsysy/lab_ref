import ucumPkg from '@lhncbc/ucum-lhc';

const utils = ucumPkg.UcumLhcUtils.getInstance();

/** UCUM은 대소문자를 구분한다. 자주 쓰는 표기를 UCUM 코드로 정규화. */
export function normalizeUnit(input: string): string {
  return input
    .trim()
    .replace(/[µμ]/g, 'u')
    .replace(/\bmEq\b/g, 'meq')
    .replace(/\bEq\b/g, 'eq')
    .replace(/(?<=\/)(\d*)([dmun]?)l\b/g, '$1$2L')
    .replace(/\s+/g, '');
}

export type UnitKind = 'mass-conc' | 'molar-conc' | 'equiv-conc' | 'catalytic-conc' | 'ratio' | 'unknown';

export const KIND_LABEL: Record<UnitKind, string> = {
  'mass-conc': '질량 농도',
  'molar-conc': '몰 농도',
  'equiv-conc': '당량 농도',
  'catalytic-conc': '촉매 활성 농도',
  ratio: '무차원 비율',
  unknown: '알 수 없음',
};

const KIND_PROBES: Array<[UnitKind, string]> = [
  ['equiv-conc', 'eq/L'],
  ['molar-conc', 'mol/L'],
  ['mass-conc', 'g/L'],
  ['catalytic-conc', 'kat/L'],
  ['ratio', '1'],
];

export function validateUnit(unit: string): { valid: boolean; message?: string } {
  const r = utils.validateUnitString(unit, true);
  return r.status === 'valid' ? { valid: true } : { valid: false, message: r.msg.join(' ') };
}

/** UCUM 변환 가능 여부로 단위의 종류를 판별 (내부 구조 비의존). */
export function unitKind(unit: string): UnitKind {
  for (const [kind, probe] of KIND_PROBES) {
    const r = utils.convertUnitTo(unit, 1, probe);
    if (r.status === 'succeeded') return kind;
  }
  return 'unknown';
}

export interface UcumOptions {
  molecularWeight?: number;
  /** 이온 전하의 절댓값 */
  charge?: number;
}

export function ucumConvert(
  from: string,
  value: number,
  to: string,
  options: UcumOptions = {},
): { ok: true; value: number } | { ok: false; message: string } {
  const r = utils.convertUnitTo(from, value, to, options);
  if (r.status === 'succeeded' && r.toVal !== null && Number.isFinite(r.toVal)) {
    return { ok: true, value: r.toVal };
  }
  return { ok: false, message: r.msg.join(' ') || 'UCUM 변환 실패' };
}
