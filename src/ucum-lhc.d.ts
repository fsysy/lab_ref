declare module '@lhncbc/ucum-lhc' {
  export interface ConvertResult {
    status: 'succeeded' | 'failed' | 'error';
    toVal: number | null;
    msg: string[];
  }
  export interface ValidateResult {
    status: 'valid' | 'invalid' | 'error';
    ucumCode?: string | null;
    msg: string[];
  }
  export class UcumLhcUtils {
    static getInstance(): UcumLhcUtils;
    convertUnitTo(
      from: string,
      value: number,
      to: string,
      options?: { molecularWeight?: number; charge?: number },
    ): ConvertResult;
    validateUnitString(unit: string, suggest?: boolean): ValidateResult;
  }
}
