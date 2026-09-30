import { describe, expect, it } from 'vitest';
import { searchAnalytes } from '../src/lib/search';
import { ANALYTES } from '../src/lib/analytes';

const ids = (q: string) => searchAnalytes(q).map((a) => a.id);

describe('분석물 검색 (영문·한글·동의어)', () => {
  it('영문', () => expect(ids('glucose')[0]).toBe('glucose'));
  it('한글', () => expect(ids('포도당')[0]).toBe('glucose'));
  it('한글 동의어', () => expect(ids('혈당')[0]).toBe('glucose'));
  it('약어·대소문자·기호 무시', () => {
    expect(ids('hba1c')[0]).toBe('hba1c');
    expect(ids('HbA1c')[0]).toBe('hba1c');
    expect(ids('gpt')[0]).toBe('alt');
    expect(ids('Na+')[0]).toBe('sodium');
    expect(ids('당화혈색소')[0]).toBe('hba1c');
  });
  it('BUN / 요소', () => {
    expect(ids('BUN')).toContain('bun');
    expect(ids('요소')).toContain('bun');
  });
  it('일치 없음은 빈 배열, 빈 질의는 목록 일부', () => {
    expect(ids('zzzzqq')).toEqual([]);
    expect(searchAnalytes('')).toHaveLength(10);
  });
  it('카탈로그 id는 유일하다', () => {
    expect(new Set(ANALYTES.map((a) => a.id)).size).toBe(ANALYTES.length);
  });
});
