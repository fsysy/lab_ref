import { describe, expect, it } from 'vitest';
// @ts-expect-error JS 모듈(타입 선언 없음)
import { convertLoincCsv, mapHeaders, parseCsv } from '../scripts/loinc-lib.mjs';
import { getAnalyte } from '../src/lib/analytes';
import { matchLoinc } from '../src/lib/loinc';

// TEST-ONLY: 합성 CSV. 실제 LOINC 데이터가 아니다.
const csv = [
  'LOINC_NUM,COMPONENT,PROPERTY,SYSTEM,LONG_COMMON_NAME,EXAMPLE_UCUM_UNITS',
  '1-1,Glucose,MCnc,Ser/Plas,"Glucose [Mass/volume] in Serum, or Plasma",mg/dL',
  '2-2,Sodium,SCnc,Ser/Plas,Sodium in serum,mmol/L',
  'bad,Glucose,,,,',
  '1-1,Glucose,,,dup,',
].join('\r\n');

describe('LOINC import 스크립트 로직', () => {
  it('CSV 파서: 따옴표·쉼표·이스케이프·CRLF·BOM', () => {
    const rows = parseCsv('﻿a,b\r\n"x,y","he said ""hi"""\n');
    expect(rows).toEqual([['a', 'b'], ['x,y', 'he said "hi"']]);
  });

  it('헤더 별칭 인식(대소문자·구분자 무시)', () => {
    expect(mapHeaders(['LOINC #', 'Long Common Name', 'Component'])).toMatchObject({ code: 0, longName: 1, component: 2 });
  });

  it('유효한 코드만 가져오고 중복·잘못된 행은 건너뜀', () => {
    const r = convertLoincCsv(csv);
    expect(r.codes.map((c: { code: string }) => c.code)).toEqual(['1-1', '2-2']);
    expect(r.skipped).toBe(2);
    expect(r.codes[0].longName).toContain('Glucose');
  });

  it('코드 열이 없으면 발견한 헤더를 알려주며 실패', () => {
    expect(() => convertLoincCsv('A,B\n1,2')).toThrow(/발견한 헤더: A \| B/);
    expect(() => convertLoincCsv('')).toThrow();
  });

  it('분석물 연결은 COMPONENT 일치(대소문자 무시)일 때만', () => {
    const codes = convertLoincCsv(csv).codes;
    expect(matchLoinc(getAnalyte('glucose')!, codes).map((c) => c.code)).toEqual(['1-1']);
    expect(matchLoinc(getAnalyte('albumin')!, codes)).toEqual([]);
  });
});
