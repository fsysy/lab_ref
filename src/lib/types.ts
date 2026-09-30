export interface SourceRef {
  label: string;
  url?: string;
}

export interface ConversionOk {
  ok: true;
  value: number;
  /** 결과값 / 입력값 (선형 변환일 때만) */
  factor?: number;
  method: string;
  formula: string;
  steps: string[];
  assumptions: string[];
  warnings: string[];
  sources: SourceRef[];
}

export interface ConversionFail {
  ok: false;
  code: 'unknown-analyte' | 'invalid-unit' | 'invalid-value' | 'no-basis' | 'out-of-domain';
  reason: string;
}

export type ConversionResult = ConversionOk | ConversionFail;
