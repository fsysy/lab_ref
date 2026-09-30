// 앱이 '출처·정보' 탭에 보여주는 자료 목록. THIRD_PARTY.md와 동기화된다(tests/sources.test.ts가 검사).

export type Role = 'engine' | 'formula' | 'reference' | 'loinc' | 'crosscheck' | 'link-only' | 'library';
export type LicenseStatus = 'unverified' | 'verified-open' | 'test-only' | 'link-only' | 'oss';

export interface SourceInfo {
  id: string;
  name: string;
  role: Role;
  /** 확인한 URL. 확인하지 못했으면 null (링크로 표시하지 않는다) */
  url: string | null;
  /** 사용한 판/버전. 확인하지 못했으면 null(→ TODO(verify)) */
  version: string | null;
  /** 조회일(YYYY-MM-DD). 조회하지 못했으면 null */
  retrievedAt: string | null;
  license: LicenseStatus;
  licenseNote: string;
  usedFor: string;
  bundled: boolean;
}

export const SOURCES: SourceInfo[] = [
  {
    id: 'ucum', name: 'UCUM (Unified Code for Units of Measure)', role: 'engine', url: 'https://ucum.org/ucum',
    version: null, retrievedAt: null, license: 'oss',
    licenseNote: '명세는 Regenstrief Institute 저작권, 무료 사용 허가(ucum.org 고지). 정확한 조항은 TODO(verify).',
    usedFor: '단위 차원 검사와 스케일 변환', bundled: false,
  },
  {
    id: 'ucum-lhc', name: '@lhncbc/ucum-lhc', role: 'library', url: 'https://github.com/lhncbc/ucum-lhc',
    version: '7.1.9', retrievedAt: '2026-09-30', license: 'oss',
    licenseNote: 'NLM/LHNCBC 라이선스(패키지 LICENSE.md). 번들에 포함되어 배포된다.',
    usedFor: 'UCUM 변환 엔진 구현체(분자량·전하 옵션 포함)', bundled: true,
  },
  {
    id: 'iupac', name: 'IUPAC/CIAAW Standard Atomic Weights', role: 'engine', url: 'https://www.ciaaw.org/atomic-weights.htm',
    version: '2024 (2021 보고서 기반)', retrievedAt: '2026-09-30', license: 'unverified',
    licenseNote: '사실 데이터(원자량)만 사용. 구간 원소의 관례값은 TODO(verify). CIAAW 사이트 이용 조건 미확인.',
    usedFor: '분자량 계산(분자식 × 원자량)', bundled: true,
  },
  {
    id: 'ngsp', name: 'NGSP — IFCC/NGSP HbA1c master equation', role: 'formula', url: 'https://ngsp.org/ifcc.asp',
    version: null, retrievedAt: '2026-09-30', license: 'unverified',
    licenseNote: '공식(NGSP = 0.09148 × IFCC + 2.152)만 인용. 사이트 이용 조건 미확인.',
    usedFor: 'HbA1c NGSP(%) ↔ IFCC(mmol/mol)', bundled: true,
  },
  {
    id: 'kdigo', name: 'KDIGO 2024 CKD Guideline (albuminuria/ACR)', role: 'formula', url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
    version: '2024', retrievedAt: null, license: 'unverified',
    licenseNote: '본문을 직접 확인하지 못했다. uACR·uPCR mg/g ↔ mg/mmol 변환은 크레아티닌 몰질량에서 계산하며 KDIGO 수치는 인용만 한다. TODO(verify)',
    usedFor: 'uACR·uPCR 단위 관계의 근거 인용', bundled: false,
  },
  {
    id: 'rcpa', name: 'RCPA Harmonised Reference Intervals — Table 6', role: 'reference', url: 'https://www.rcpa.edu.au/',
    version: null, retrievedAt: null, license: 'unverified',
    licenseNote: '약관 미확인. 데이터는 사용자가 준비한 JSON(src/data/reference/rcpa.json)에서만 읽으며, 저장소에는 값이 들어 있지 않다.',
    usedFor: '성인 참고구간(기본 출처)', bundled: false,
  },
  {
    id: 'caliper', name: 'CALIPER (Canadian Laboratory Initiative on Pediatric Reference Intervals)', role: 'link-only', url: 'https://caliperproject.ca/',
    version: null, retrievedAt: null, license: 'link-only',
    licenseNote: '데이터를 내장하지 않는다. 링크 카드로만 안내한다.',
    usedFor: '소아 참고구간 안내', bundled: false,
  },
  {
    id: 'loinc', name: 'LOINC — Top 2000+ Common Lab Results', role: 'loinc', url: 'https://loinc.org/',
    version: null, retrievedAt: null, license: 'unverified',
    licenseNote: '약관 미확인. 사용자가 내려받은 CSV를 import 스크립트로 읽을 때만 코드가 들어간다. 저장소에는 코드가 들어 있지 않다.',
    usedFor: 'LOINC 코드 매핑(선택)', bundled: false,
  },
  {
    id: 'labcorp', name: 'Labcorp SI Unit Conversion Table', role: 'crosscheck', url: null,
    version: null, retrievedAt: null, license: 'test-only',
    licenseNote: '교차 검증 전용. 앱에는 포함하지 않고 tests/fixtures에서만 대조한다. 정확한 URL 미확인. TODO(verify)',
    usedFor: '변환 계수 교차 검증(테스트)', bundled: false,
  },
  {
    id: 'cmeinfo', name: 'CMEinfo unit conversion table (PDF)', role: 'crosscheck', url: null,
    version: null, retrievedAt: null, license: 'test-only',
    licenseNote: '교차 검증 전용. 앱에는 포함하지 않는다. 정확한 URL 미확인. TODO(verify)',
    usedFor: '변환 계수 교차 검증(테스트)', bundled: false,
  },
  {
    id: 'nbme', name: 'NBME Laboratory Reference Values (PDF)', role: 'crosscheck', url: null,
    version: null, retrievedAt: null, license: 'test-only',
    licenseNote: '교차 검증 전용. 앱에는 포함하지 않는다. 정확한 URL 미확인. TODO(verify)',
    usedFor: '변환 계수·참고구간 교차 검증(테스트)', bundled: false,
  },
];

export const CALIPER_CARD = {
  title: '소아 참고구간: CALIPER',
  url: 'https://caliperproject.ca/',
  body: '소아·청소년(성인 구간이 적용되지 않는 연령)의 참고구간은 이 앱에 내장하지 않습니다. CALIPER 프로젝트의 공식 사이트에서 연령·성별·분석 플랫폼별 구간을 확인하세요.',
};

export const CLINICAL_DISCLAIMER = [
  '이 앱은 교육·참고용 계산 도구이며 진단·치료 결정을 대신하지 않습니다.',
  '변환 결과와 참고구간은 검사 시행 기관의 방법·장비·검체 조건에 따라 달라질 수 있습니다. 판정에는 반드시 해당 검사실이 보고한 참고구간을 우선하세요.',
  '참고구간은 공표된 값을 그대로 보여줄 뿐이며, 공표되지 않은 나이·성별 조합은 추정하지 않습니다.',
  '입력한 값은 브라우저 안에서만 계산되며 외부로 전송되지 않습니다. "내 검사실 참고구간"은 이 브라우저의 localStorage에만 저장됩니다.',
  '데이터의 라이선스가 확인되지 않은 항목에는 license: unverified 배지가 붙어 있습니다.',
];
