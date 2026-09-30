import raw from '../data/analytes.json';

export type SpecialKind = 'hba1c' | 'bun' | 'acr' | 'triglycerides';

export interface Analyte {
  id: string;
  category: string;
  special?: SpecialKind;
  names: { en: string; ko: string; synonyms: string[] };
  /** 분자식. 없으면 질량↔몰 변환 근거가 없다. */
  formula?: string;
  /** 이온 전하의 절댓값. 없으면 당량(eq) 변환 불가. */
  charge?: number;
  assumptions?: string[];
  units: string[];
  defaultFrom: string;
  defaultTo: string;
  specimens: string[];
  loincComponent?: string;
}

export const ANALYTES: Analyte[] = (raw as { analytes: Analyte[] }).analytes;

const byId = new Map(ANALYTES.map((a) => [a.id, a]));

export function getAnalyte(id: string): Analyte | undefined {
  return byId.get(id);
}
