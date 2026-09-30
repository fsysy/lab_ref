import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOURCES } from '../src/data/sources';

const thirdParty = readFileSync(new URL('../THIRD_PARTY.md', import.meta.url), 'utf8');

describe('출처 목록 ↔ THIRD_PARTY.md 일치', () => {
  for (const s of SOURCES) {
    it(`${s.id}: 이름과 URL이 THIRD_PARTY.md에 있다`, () => {
      expect(thirdParty, s.name).toContain(s.name.split(' — ')[0].split(' (')[0]);
      if (s.url) expect(thirdParty, s.url).toContain(s.url);
      else expect(s.role, '확인된 URL이 없는 자료는 교차 검증 전용이어야 한다').toBe('crosscheck');
    });
  }

  it('RCPA·LOINC는 unverified, CALIPER는 link-only, 교차 검증 자료는 test-only 이며 내장되지 않는다', () => {
    const by = (id: string) => SOURCES.find((s) => s.id === id)!;
    expect(by('rcpa').license).toBe('unverified');
    expect(by('loinc').license).toBe('unverified');
    expect(by('caliper').license).toBe('link-only');
    for (const id of ['labcorp', 'cmeinfo', 'nbme']) {
      expect(by(id).license).toBe('test-only');
      expect(by(id).bundled).toBe(false);
    }
  });

  it('앱 소스(src/)는 교차 검증 픽스처를 import하지 않는다', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    const root = new URL('../src', import.meta.url).pathname;
    for (const file of walk(root).filter((f) => /\.(ts|tsx)$/.test(f))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/(?:from|import|require)\s*\(?\s*['"][^'"]*fixtures/);
    }
  });

  it('입력이 외부로 전송되지 않는다: src/ 에 네트워크 호출이 없다', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    const root = new URL('../src', import.meta.url).pathname;
    for (const file of walk(root).filter((f) => /\.(ts|tsx)$/.test(f))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
    }
  });
});
