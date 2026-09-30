import type { Analyte } from './analytes';

export interface LoincCode {
  code: string;
  component?: string;
  longName?: string;
  system?: string;
  property?: string;
  unit?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

/** analyte.loincComponent 와 LOINC COMPONENT 가 (대소문자 무시) 같은 코드만 연결한다. 추정하지 않는다. */
export function matchLoinc(analyte: Analyte, codes: LoincCode[]): LoincCode[] {
  if (!analyte.loincComponent) return [];
  const target = norm(analyte.loincComponent);
  return codes.filter((c) => c.component !== undefined && norm(c.component) === target);
}
