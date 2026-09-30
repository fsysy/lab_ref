# 검사 단위 변환 · 참고구간

임상검사 단위 변환과 참고구간 조회를 하는 정적 웹앱입니다(React + TypeScript + Vite). 모든 계산은 브라우저에서 결정적 코드로만 수행하며 입력은 외부로 전송되지 않습니다.
교육·참고용이며 진단·치료 결정을 대신하지 않습니다.

## 실행

```bash
npm ci
npm run dev        # 개발 서버
npm test           # Vitest (왕복 변환, 교차 검증, 참고구간, UI 스모크)
npm run build      # dist/ 생성 (base './' → GitHub Pages 어디서나 동작)
```

GitHub Pages 배포: 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정하면 `main` 푸시 시 `.github/workflows/deploy.yml`이 테스트 후 배포합니다.

## 구조와 데이터 원칙

| 경로 | 내용 |
|---|---|
| `src/lib/ucum.ts` | `@lhncbc/ucum-lhc` 래퍼: 차원 검사, 스케일·분자량·전하 변환 |
| `src/lib/atomic.ts`, `formula.ts` | IUPAC 원자량 → 분자식으로 분자량 계산 |
| `src/lib/convert.ts`, `special.ts` | 일반 변환 엔진 / HbA1c, uACR·uPCR, BUN↔요소 |
| `src/data/analytes.json` | 분석물 카탈로그(이름·분자식·전하만, **변환 계수 없음**) |
| `src/data/reference/*.json` | 참고구간, 출처별 파일 (`source`, `url`, `retrievedAt`, `license`) |
| `scripts/import-loinc.mjs` | 사용자가 내려받은 LOINC CSV → `src/data/loinc/loinc.json` |
| `tests/fixtures/crosscheck/` | Labcorp/CMEinfo/NBME 대조 값 (테스트 전용, 앱은 import하지 않음) |

- 변환 계수는 표에서 복사하지 않고 계산합니다(분자량 = 분자식 × 원자량, 스케일 = UCUM).
- 근거가 없는 변환(예: mg/dL → U/L, 알부민 g/dL → mmol/L)은 이유와 함께 거부합니다.
- RCPA·LOINC는 약관 미확인(`license: unverified`)이라 **저장소에 값이 없습니다.** 준비한 JSON을 넣는 방법은 [`docs/reference-format.md`](docs/reference-format.md), 자료 목록은 [`THIRD_PARTY.md`](THIRD_PARTY.md)를 보세요.
- 소아 참고구간은 CALIPER 링크 카드로만 안내합니다.
- “내 검사실 참고구간”은 localStorage에만 저장되고 JSON으로 내보내기/가져오기를 지원합니다.

## 확인이 필요한 항목

코드와 문서의 `TODO(verify)`를 검색하세요: `grep -rn "TODO(verify)" src tests docs THIRD_PARTY.md`
