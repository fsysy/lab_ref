// LOINC CSV 파싱·정규화 (순수 함수). scripts/import-loinc.mjs 와 tests에서 사용한다.
// TODO(verify): loinc.org Top 2000+ CSV의 실제 헤더 이름을 확인하지 못했다.
//   아래 별칭 표에 없는 헤더면 import 스크립트가 발견한 헤더를 출력하고 종료한다.

/** RFC 4180 최소 구현: 따옴표, 이스케이프된 따옴표(""), 필드 내 줄바꿈, CRLF, BOM. */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const normHeader = (h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const HEADER_ALIASES = {
  code: ['loinc_num', 'loinc', 'loinc_code', 'loinc_number'],
  component: ['component'],
  longName: ['long_common_name', 'long_name', 'longcommonname'],
  system: ['system'],
  property: ['property'],
  unit: ['example_ucum_units', 'example_units', 'ucum_units', 'units', 'example_ucum_unit'],
};

export function mapHeaders(headerRow) {
  const idx = {};
  const normed = headerRow.map(normHeader);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const i = normed.findIndex((h) => aliases.includes(h));
    if (i >= 0) idx[key] = i;
  }
  return idx;
}

const LOINC_CODE = /^\d{1,7}-\d$/;

/** CSV 텍스트 → { codes, skipped, headers }. code/component 열이 없으면 예외. */
export function convertLoincCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error('CSV가 비어 있습니다.');
  const headers = rows[0];
  const idx = mapHeaders(headers);
  if (idx.code === undefined) {
    throw new Error(`LOINC 코드 열을 찾지 못했습니다. 발견한 헤더: ${headers.join(' | ')}`);
  }
  if (idx.component === undefined && idx.longName === undefined) {
    throw new Error(`COMPONENT 또는 LONG_COMMON_NAME 열이 필요합니다. 발견한 헤더: ${headers.join(' | ')}`);
  }
  const codes = [];
  let skipped = 0;
  const seen = new Set();
  for (const r of rows.slice(1)) {
    const code = (r[idx.code] ?? '').trim();
    if (!LOINC_CODE.test(code) || seen.has(code)) { skipped++; continue; }
    seen.add(code);
    const pick = (k) => (idx[k] === undefined ? undefined : (r[idx[k]] ?? '').trim() || undefined);
    codes.push({
      code,
      component: pick('component'),
      longName: pick('longName'),
      system: pick('system'),
      property: pick('property'),
      unit: pick('unit'),
    });
  }
  return { codes, skipped, headers };
}
