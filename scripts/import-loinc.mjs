#!/usr/bin/env node
// 사용법: npm run import:loinc -- path/to/LoincTop2000.csv
// loinc.org에서 사용자가 직접 내려받은 CSV를 읽어 src/data/loinc/loinc.json 을 생성한다.
// 이 스크립트는 LOINC 데이터를 내려받지 않는다. 라이선스: unverified.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertLoincCsv } from './loinc-lib.mjs';

const input = process.argv[2];
if (!input) {
  console.error('사용법: npm run import:loinc -- <LOINC CSV 경로>');
  process.exit(2);
}

try {
  const { codes, skipped, headers } = convertLoincCsv(readFileSync(input, 'utf8'));
  const out = {
    meta: {
      source: 'LOINC (Regenstrief Institute) — Top 2000+ Common Lab Results',
      url: 'https://loinc.org/',
      retrievedAt: new Date().toISOString().slice(0, 10),
      license: 'unverified',
      version: null,
      description: `가져온 파일: ${basename(input)} (사용자 제공)`,
    },
    codes,
  };
  const dest = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/loinc/loinc.json');
  writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`코드 ${codes.length}개 저장, ${skipped}행 건너뜀 → ${dest}`);
  console.log(`인식한 헤더: ${headers.join(' | ')}`);
} catch (e) {
  console.error(`오류: ${e.message}`);
  process.exit(1);
}
