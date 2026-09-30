import { describe, expect, it } from 'vitest';
import fixture from './fixtures/crosscheck/factors.json';
import { getAnalyte } from '../src/lib/analytes';
import { convert } from '../src/lib/convert';

// 교차 검증: 앱이 '계산'한 계수를 외부 표의 계수와 대조한다. 외부 표의 값은 앱 코드에서 쓰이지 않는다.
describe('교차 검증 (Labcorp / CMEinfo / NBME 대조용 픽스처)', () => {
  for (const e of fixture.entries) {
    it(`${e.analyteId}: 1 ${e.from} ≈ ${e.factor} ${e.to}`, () => {
      const a = getAnalyte(e.analyteId)!;
      const r = convert(a, 1, e.from, e.to);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const rel = Math.abs(r.value - e.factor) / e.factor;
      expect(rel, `계산 ${r.value} vs 표 ${e.factor}`).toBeLessThanOrEqual(fixture.tolerance);
    });
  }

  it('원문 대조 여부를 숨기지 않는다: 미검증 항목 수를 보고', () => {
    const unverified = fixture.entries.filter((e) => !e.verified).length;
    console.info(`[crosscheck] 전체 ${fixture.entries.length}개 중 원문 미대조 ${unverified}개 (TODO(verify))`);
    // 대조 완료로 표시된 항목은 반드시 출처를 밝혀야 한다.
    for (const e of fixture.entries) {
      if (e.verified) expect(['labcorp', 'cmeinfo', 'nbme']).toContain(e.attribution);
    }
  });
});
