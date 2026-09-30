#!/usr/bin/env node
// 사용법: npm run validate:reference -- [파일...]   (기본: src/data/reference/*.json)
// TS 검증기를 import하지 않는 빠른 구조 검사(UCUM 단위 유효성은 제외).
// 전체 규칙은 src/lib/reference.ts 의 validateReferenceFile 이며 `npm test`가 번들 파일에 적용한다.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/reference');
const files = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));
const analytes = new Set(JSON.parse(readFileSync(resolve(dir, '../analytes.json'), 'utf8')).analytes.map((a) => a.id));
let bad = 0;

for (const f of files) {
  const errs = [];
  const warns = [];
  let j;
  try { j = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.error(`✗ ${f}: JSON 오류 ${e.message}`); bad++; continue; }
  for (const k of ['source', 'url', 'license']) if (!j.meta || typeof j.meta[k] !== 'string' || !j.meta[k]) errs.push(`meta.${k} 누락`);
  if (!j.meta || !('retrievedAt' in j.meta)) errs.push('meta.retrievedAt 누락(값이 없으면 null)');
  if (!Array.isArray(j.intervals)) errs.push('intervals 배열 누락');
  else j.intervals.forEach((iv, i) => {
    const at = `intervals[${i}]`;
    if (!analytes.has(iv.analyteId)) warns.push(`${at}: 카탈로그에 없는 analyteId ${iv.analyteId}`);
    if (!['M', 'F', 'any'].includes(iv.sex)) errs.push(`${at}.sex`);
    if (typeof iv.specimen !== 'string' || !iv.specimen) errs.push(`${at}.specimen`);
    if (typeof iv.unit !== 'string' || !iv.unit) errs.push(`${at}.unit`);
    if (typeof iv.ageMinYears !== 'number') errs.push(`${at}.ageMinYears`);
    if (iv.ageMaxYears !== null && typeof iv.ageMaxYears !== 'number') errs.push(`${at}.ageMaxYears`);
    if (iv.low === null && iv.high === null) errs.push(`${at}: low/high 모두 null`);
    if (typeof iv.low === 'number' && typeof iv.high === 'number' && iv.low > iv.high) errs.push(`${at}: low > high`);
  });
  const n = Array.isArray(j.intervals) ? j.intervals.length : 0;
  if (errs.length) { bad++; console.error(`✗ ${f}\n  ${errs.join('\n  ')}`); }
  else console.log(`✓ ${f}: 구간 ${n}개${n === 0 ? ' (비어 있음)' : ''}${j.meta.license === 'unverified' ? ' [license: unverified]' : ''}`);
  for (const w of warns) console.warn(`  ! ${w}`);
}
process.exit(bad ? 1 : 0);
