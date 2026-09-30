import { describe, expect, it } from 'vitest';
import {
  classify, lookupIntervals, validateReferenceFile, ageBandLabel, intervalText,
  type ReferenceFile,
} from '../src/lib/reference';
import {
  LOCAL_KEY, emptyLocalFile, exportLocalJson, importLocalJson, loadBundledReferences, loadLocal, saveLocal,
} from '../src/lib/referenceStore';

// TEST-ONLY: 아래 숫자는 로직 검증용 가짜 값이며 어떤 실제 참고구간도 아니다. 앱 데이터로 쓰지 않는다.
const fake = (): ReferenceFile => ({
  meta: { source: 'TEST-ONLY fake', url: 'https://example.invalid/', retrievedAt: '2000-01-01', license: 'unverified' },
  intervals: [
    { analyteId: 'glucose', specimen: 'serum', sex: 'any', ageMinYears: 18, ageMaxYears: 60, low: 1, high: 2, unit: 'mmol/L' },
    { analyteId: 'glucose', specimen: 'serum', sex: 'any', ageMinYears: 60, ageMaxYears: null, low: 3, high: 4, unit: 'mmol/L' },
    { analyteId: 'creatinine', specimen: 'serum', sex: 'M', ageMinYears: 18, ageMaxYears: null, low: 10, high: 20, unit: 'umol/L' },
    { analyteId: 'creatinine', specimen: 'serum', sex: 'F', ageMinYears: 18, ageMaxYears: null, low: 5, high: 8, unit: 'umol/L' },
    { analyteId: 'ferritin', specimen: 'serum', sex: 'F', ageMinYears: 18, ageMaxYears: 50, low: null, high: 9, unit: 'ug/L' },
  ],
});

const q = (analyteId: string, ageYears: number, sex: 'M' | 'F' = 'F', specimen = 'serum') => ({ analyteId, ageYears, sex, specimen });

describe('구간 조회: 공표된 구간만, 외삽 없음', () => {
  const files = [fake()];

  it('나이 경계: 하한 포함, 상한 미포함', () => {
    expect(lookupIntervals(files, q('glucose', 18)).matches).toHaveLength(1);
    expect(lookupIntervals(files, q('glucose', 59.99)).matches[0].interval.high).toBe(2);
    expect(lookupIntervals(files, q('glucose', 60)).matches[0].interval.high).toBe(4);
    expect(lookupIntervals(files, q('glucose', 120)).matches[0].interval.high).toBe(4); // 상한 없음 구간
  });

  it('구간 밖 나이는 빈 결과이며 인접 구간으로 외삽하지 않는다', () => {
    const r = lookupIntervals(files, q('glucose', 10));
    expect(r.matches).toHaveLength(0);
    expect(r.availableBands).toHaveLength(2); // 안내용으로만 노출
  });

  it('성별 특이 구간은 해당 성별에만 적용', () => {
    expect(lookupIntervals(files, q('creatinine', 30, 'M')).matches.map((m) => m.interval.high)).toEqual([20]);
    expect(lookupIntervals(files, q('creatinine', 30, 'F')).matches.map((m) => m.interval.high)).toEqual([8]);
    expect(lookupIntervals(files, q('ferritin', 30, 'M')).matches).toHaveLength(0);
  });

  it('검체와 분석물이 다르면 결과 없음', () => {
    expect(lookupIntervals(files, q('glucose', 30, 'F', 'urine')).matches).toHaveLength(0);
    expect(lookupIntervals(files, q('sodium', 30)).matches).toHaveLength(0);
  });

  it('빈 파일은 항상 결과 없음', () => {
    expect(lookupIntervals([emptyLocalFile()], q('glucose', 30)).matches).toHaveLength(0);
  });

  it('여러 출처는 출처별로 따로 반환', () => {
    const other = fake();
    other.meta.source = 'TEST-ONLY second';
    const r = lookupIntervals([fake(), other], q('glucose', 30));
    expect(r.matches.map((m) => m.file.meta.source)).toEqual(['TEST-ONLY fake', 'TEST-ONLY second']);
  });
});

describe('low / normal / high 판정', () => {
  it('경계값은 normal', () => {
    expect(classify(1, 1, 2)).toBe('normal');
    expect(classify(2, 1, 2)).toBe('normal');
    expect(classify(0.99, 1, 2)).toBe('low');
    expect(classify(2.01, 1, 2)).toBe('high');
  });
  it('한쪽 경계만 있는 구간', () => {
    expect(classify(100, null, 9)).toBe('high');
    expect(classify(-5, null, 9)).toBe('normal');
    expect(classify(1, 3, null)).toBe('low');
    expect(classify(1000, 3, null)).toBe('normal');
  });
  it('표시 문자열', () => {
    expect(intervalText({ low: 1, high: 2, unit: 'mmol/L' })).toBe('1 – 2 mmol/L');
    expect(intervalText({ low: null, high: 9, unit: 'ug/L' })).toBe('≤ 9 ug/L');
    expect(ageBandLabel({ ageMinYears: 60, ageMaxYears: null })).toBe('60세 이상');
  });
});

describe('파일 검증', () => {
  it('정상 파일 통과', () => {
    expect(validateReferenceFile(fake()).ok).toBe(true);
  });

  it('번들된 모든 참고구간 파일이 유효하고 메타를 갖는다', () => {
    const loaded = loadBundledReferences();
    expect(loaded.length).toBeGreaterThan(0);
    for (const l of loaded) {
      expect(l.validation.errors, l.path).toEqual([]);
      const m = l.validation.file!.meta;
      expect(m.source && m.url && m.license).toBeTruthy();
      expect('retrievedAt' in m).toBe(true);
    }
  });

  it('RCPA 파일: license unverified, 값은 임의로 넣지 않았다(빈 배열)', () => {
    const rcpa = loadBundledReferences().find((l) => l.path.endsWith('rcpa.json'))!;
    expect(rcpa.validation.file!.meta.license).toBe('unverified');
    expect(rcpa.validation.file!.intervals).toEqual([]);
  });

  const bad = (mutate: (f: any) => void) => {
    const f = fake() as any;
    mutate(f);
    return validateReferenceFile(f);
  };

  it('잘못된 입력 거부', () => {
    expect(validateReferenceFile(null).ok).toBe(false);
    expect(validateReferenceFile([]).ok).toBe(false);
    expect(validateReferenceFile({ meta: {}, intervals: [] }).ok).toBe(false);
    expect(bad((f) => { f.intervals[0].low = 5; f.intervals[0].high = 1; }).ok).toBe(false);
    expect(bad((f) => { f.intervals[0].low = null; f.intervals[0].high = null; }).ok).toBe(false);
    expect(bad((f) => { f.intervals[0].sex = 'X'; }).ok).toBe(false);
    expect(bad((f) => { f.intervals[0].ageMaxYears = 5; }).ok).toBe(false);
    expect(bad((f) => { f.intervals[0].unit = 'not-a-unit'; }).ok).toBe(false);
    expect(bad((f) => { f.intervals[0].low = '1'; }).ok).toBe(false);
    expect(bad((f) => { f.meta.retrievedAt = '어제'; }).ok).toBe(false);
  });

  it('카탈로그에 없는 analyteId는 경고(오류 아님)', () => {
    const r = bad((f) => { f.intervals[0].analyteId = 'unknown-analyte'; });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toContain('unknown-analyte');
  });
});

describe('내 검사실 참고구간: localStorage 저장 / JSON 내보내기·가져오기', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it('저장 후 다시 읽으면 같다', () => {
    const s = memory();
    const f = { ...emptyLocalFile(), intervals: fake().intervals.slice(0, 2) };
    expect(saveLocal(f, s)).toBe(true);
    expect(s.m.has(LOCAL_KEY)).toBe(true);
    expect(loadLocal(s).intervals).toEqual(f.intervals);
  });

  it('깨진/악의적 저장값은 빈 파일로 대체', () => {
    const s = memory();
    s.setItem(LOCAL_KEY, '{not json');
    expect(loadLocal(s).intervals).toEqual([]);
    s.setItem(LOCAL_KEY, JSON.stringify({ meta: {}, intervals: [{}] }));
    expect(loadLocal(s).intervals).toEqual([]);
  });

  it('저장소 접근 불가·용량 초과 시 예외 없이 false', () => {
    expect(saveLocal(emptyLocalFile(), null)).toBe(false);
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(saveLocal(emptyLocalFile(), full)).toBe(false);
    expect(loadLocal(null).intervals).toEqual([]);
  });

  it('내보내기 → 가져오기 왕복', () => {
    const f = { ...emptyLocalFile(), intervals: fake().intervals };
    const text = exportLocalJson(f, new Date('2026-09-30T00:00:00Z'));
    expect(JSON.parse(text).meta.retrievedAt).toBe('2026-09-30');
    const back = importLocalJson(text);
    expect(back.ok).toBe(true);
    expect(back.file!.intervals).toEqual(f.intervals);
    expect(back.file!.meta.license).toBe('user-provided'); // 가져온 파일이 스스로 라이선스를 주장하지 못함
  });

  it('가져오기: 잘못된 JSON·스키마 거부', () => {
    expect(importLocalJson('nope').ok).toBe(false);
    expect(importLocalJson('{"meta":{},"intervals":[]}').ok).toBe(false);
  });
});
