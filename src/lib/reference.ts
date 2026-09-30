import { getAnalyte } from './analytes';
import { validateUnit, normalizeUnit } from './ucum';

export type Sex = 'M' | 'F' | 'any';

export interface ReferenceMeta {
  source: string;
  url: string;
  /** 자료를 가져온 날짜(YYYY-MM-DD). 아직 채우지 않았으면 null. */
  retrievedAt: string | null;
  /** 'unverified' | 'user-provided' | 확인된 라이선스 식별자 */
  license: string;
  version?: string | null;
  description?: string;
}

export interface ReferenceInterval {
  analyteId: string;
  specimen: string;
  sex: Sex;
  /** 하한 나이(년, 포함) */
  ageMinYears: number;
  /** 상한 나이(년, 미포함). null이면 상한 없음. */
  ageMaxYears: number | null;
  low: number | null;
  high: number | null;
  unit: string;
  note?: string;
  /** 원문 표/행 참조 */
  ref?: string;
}

export interface ReferenceFile {
  meta: ReferenceMeta;
  intervals: ReferenceInterval[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  file?: ReferenceFile;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** 외부(파일·가져오기)에서 온 JSON은 신뢰하지 않고 모두 검증한다. */
export function validateReferenceFile(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ['최상위가 객체가 아닙니다.'], warnings };
  const meta = input.meta;
  if (!isObj(meta)) {
    errors.push('meta 객체가 없습니다.');
  } else {
    for (const k of ['source', 'url', 'license'] as const) {
      if (typeof meta[k] !== 'string' || (meta[k] as string).trim() === '') errors.push(`meta.${k}가 비어 있습니다.`);
    }
    if (meta.retrievedAt !== null && (typeof meta.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(meta.retrievedAt))) {
      errors.push('meta.retrievedAt은 YYYY-MM-DD 문자열 또는 null이어야 합니다.');
    }
  }
  if (!Array.isArray(input.intervals)) {
    errors.push('intervals 배열이 없습니다.');
  } else {
    input.intervals.forEach((raw, i) => {
      const at = `intervals[${i}]`;
      if (!isObj(raw)) return void errors.push(`${at}: 객체가 아닙니다.`);
      if (typeof raw.analyteId !== 'string' || !raw.analyteId) errors.push(`${at}.analyteId 누락`);
      else if (!getAnalyte(raw.analyteId)) warnings.push(`${at}: 카탈로그에 없는 analyteId "${raw.analyteId}" (앱에서 선택할 수 없음)`);
      if (typeof raw.specimen !== 'string' || !raw.specimen) errors.push(`${at}.specimen 누락`);
      if (raw.sex !== 'M' && raw.sex !== 'F' && raw.sex !== 'any') errors.push(`${at}.sex는 M, F, any 중 하나여야 합니다.`);
      if (!isNum(raw.ageMinYears) || raw.ageMinYears < 0) errors.push(`${at}.ageMinYears는 0 이상의 숫자여야 합니다.`);
      if (raw.ageMaxYears !== null && !isNum(raw.ageMaxYears)) errors.push(`${at}.ageMaxYears는 숫자 또는 null이어야 합니다.`);
      else if (isNum(raw.ageMaxYears) && isNum(raw.ageMinYears) && raw.ageMaxYears <= raw.ageMinYears) {
        errors.push(`${at}: ageMaxYears는 ageMinYears보다 커야 합니다.`);
      }
      const lowOk = raw.low === null || isNum(raw.low);
      const highOk = raw.high === null || isNum(raw.high);
      if (!lowOk) errors.push(`${at}.low는 숫자 또는 null이어야 합니다.`);
      if (!highOk) errors.push(`${at}.high는 숫자 또는 null이어야 합니다.`);
      if (lowOk && highOk && raw.low === null && raw.high === null) errors.push(`${at}: low와 high가 모두 null입니다.`);
      if (isNum(raw.low) && isNum(raw.high) && raw.low > raw.high) errors.push(`${at}: low가 high보다 큽니다.`);
      if (typeof raw.unit !== 'string' || !raw.unit) errors.push(`${at}.unit 누락`);
      else if (!validateUnit(normalizeUnit(raw.unit)).valid) errors.push(`${at}.unit "${raw.unit}"은(는) 유효한 UCUM 단위가 아닙니다.`);
    });
  }
  if (errors.length > 0) return { ok: false, errors, warnings };
  return { ok: true, errors, warnings, file: input as unknown as ReferenceFile };
}

export interface Query {
  analyteId: string;
  ageYears: number;
  sex: 'M' | 'F';
  specimen: string;
}

export interface Match {
  file: ReferenceFile;
  interval: ReferenceInterval;
}

export interface Lookup {
  matches: Match[];
  /** 같은 분석물·검체·성별에서 공표된 나이 구간 (구간이 없을 때 안내용). 외삽하지 않는다. */
  availableBands: Match[];
}

export function ageBandLabel(iv: Pick<ReferenceInterval, 'ageMinYears' | 'ageMaxYears'>): string {
  return iv.ageMaxYears === null ? `${iv.ageMinYears}세 이상` : `${iv.ageMinYears}세 이상 ${iv.ageMaxYears}세 미만`;
}

/** 공표된 구간만 반환한다. 나이 구간은 [min, max) 이며 어떤 외삽도 하지 않는다. */
export function lookupIntervals(files: ReferenceFile[], q: Query): Lookup {
  const candidates: Match[] = [];
  for (const file of files) {
    for (const interval of file.intervals) {
      if (interval.analyteId !== q.analyteId) continue;
      if (interval.specimen !== q.specimen) continue;
      if (interval.sex !== 'any' && interval.sex !== q.sex) continue;
      candidates.push({ file, interval });
    }
  }
  const matches = candidates.filter(({ interval: iv }) =>
    q.ageYears >= iv.ageMinYears && (iv.ageMaxYears === null || q.ageYears < iv.ageMaxYears));
  return { matches, availableBands: candidates };
}

export type Flag = 'low' | 'normal' | 'high';

/** low ≤ 값 ≤ high 이면 normal (경계값은 normal). 한쪽만 있는 구간도 지원. */
export function classify(value: number, low: number | null, high: number | null): Flag {
  if (low !== null && value < low) return 'low';
  if (high !== null && value > high) return 'high';
  return 'normal';
}

export function intervalText(iv: Pick<ReferenceInterval, 'low' | 'high' | 'unit'>): string {
  if (iv.low !== null && iv.high !== null) return `${iv.low} – ${iv.high} ${iv.unit}`;
  if (iv.low !== null) return `≥ ${iv.low} ${iv.unit}`;
  return `≤ ${iv.high} ${iv.unit}`;
}
