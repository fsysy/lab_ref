# THIRD_PARTY

이 앱이 사용하거나 참조하는 외부 자료의 목록입니다. 앱의 “출처·정보” 탭(`src/data/sources.ts`)과 같은 내용을 유지하며,
`tests/sources.test.ts`가 두 목록의 일치를 검사합니다. 확인하지 못한 사실은 `TODO(verify)`로 표시했습니다.

라이선스 상태 표기: `unverified` = 약관을 확인하지 못함 / `oss` = 오픈소스 라이선스 파일 확인 / `test-only` = 앱에 포함하지 않고 테스트 대조에만 사용 / `link-only` = 데이터 미내장, 링크만 제공.

## 데이터·명세 (역할별)

| 자료 | 역할 | 버전 | 조회일 | 라이선스 | 앱에 내장 |
|---|---|---|---|---|---|
| UCUM (Unified Code for Units of Measure) — https://ucum.org/ucum | 단위 차원 검사·스케일 변환 | 미확인 | 미조회 | oss (조항 `TODO(verify)`) | 아니오 |
| @lhncbc/ucum-lhc — https://github.com/lhncbc/ucum-lhc | UCUM 구현체 (npm 의존성) | 7.1.9 | 2026-09-30 | oss (패키지 `LICENSE.md`, 번들 포함) | 예 |
| IUPAC/CIAAW Standard Atomic Weights — https://www.ciaaw.org/atomic-weights.htm | 원자량 → 분자량 계산 | 2024 (2021 보고서 기반) | 2026-09-30 | unverified | 예 (사실 값만) |
| NGSP — IFCC/NGSP HbA1c master equation — https://ngsp.org/ifcc.asp | HbA1c NGSP↔IFCC 공식 | 미확인 | 2026-09-30 | unverified | 예 (공식만) |
| KDIGO 2024 CKD Guideline (albuminuria/ACR) — https://kdigo.org/guidelines/ckd-evaluation-and-management/ | uACR·uPCR 단위 관계 인용 | 2024 | 미조회 | unverified | 아니오 |
| RCPA Harmonised Reference Intervals — Table 6 — https://www.rcpa.edu.au/ | 성인 참고구간(기본) | 미확인 | 미조회 | **unverified** | 아니오 (사용자 JSON) |
| CALIPER — https://caliperproject.ca/ | 소아 참고구간 안내 | — | — | link-only | 아니오 |
| LOINC — Top 2000+ Common Lab Results — https://loinc.org/ | LOINC 코드 매핑 | 미확인 | 미조회 | **unverified** | 아니오 (사용자 CSV) |
| Labcorp SI Unit Conversion Table | 교차 검증 | 미확인 | 미조회 | test-only | 아니오 |
| CMEinfo unit conversion table (PDF) | 교차 검증 | 미확인 | 미조회 | test-only | 아니오 |
| NBME Laboratory Reference Values (PDF) | 교차 검증 | 미확인 | 미조회 | test-only | 아니오 |

### 참고구간 파일 (출처별 분리)

`src/data/reference/<source>.json` — 파일마다 `meta.source`, `meta.url`, `meta.retrievedAt`, `meta.license`를 가집니다.

| 파일 | source | url | retrievedAt | license | 구간 수 |
|---|---|---|---|---|---|
| `src/data/reference/rcpa.json` | RCPA Harmonised Reference Intervals — Table 6 | https://www.rcpa.edu.au/ (정확한 표 URL `TODO(verify)`) | null (미채움) | unverified | 0 (사용자가 준비한 데이터로 채움) |

- 저장소에는 RCPA 값이 들어 있지 않습니다. 사용자가 준비한 JSON으로 채우고 `npm run validate:reference`로 검증하세요(`docs/reference-format.md`).
- “내 검사실 참고구간”은 사용자가 입력한 데이터이며 브라우저 localStorage에만 저장됩니다(`license: user-provided`).

### 교차 검증 자료 (테스트 전용)

Labcorp / CMEinfo / NBME 자료는 **앱 코드가 import하지 않으며** `tests/fixtures/crosscheck/`에서만 대조합니다.
현재 픽스처의 환산계수는 원문 PDF에서 옮긴 것이 아니라 널리 알려진 관례 계수를 기억에서 옮긴 것이라 모든 항목이
`verified: false`입니다. `TODO(verify)`: 원문에서 값을 옮기고 `attribution`을 채운 뒤 `verified: true`로 바꿀 것.

### LOINC 고지

LOINC 데이터는 저장소에 포함되어 있지 않습니다. 사용자가 loinc.org에서 직접 내려받은 CSV를 `npm run import:loinc`로 가져올 때만
`src/data/loinc/loinc.json`에 코드가 생기며, 그 경우 LOINC 이용 약관(저작권 고지 포함)을 사용자가 확인해야 합니다. `TODO(verify)`.

## npm 의존성

런타임: `react`, `react-dom`, `@lhncbc/ucum-lhc`. 개발: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `jsdom`, `@testing-library/*`, `@types/*`.
각 패키지의 라이선스는 `npm ls` / `node_modules/<pkg>/LICENSE*`로 확인하세요. `TODO(verify)`: 릴리스 전 전체 라이선스 감사.
