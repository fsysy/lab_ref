# 참고구간 JSON 형식

출처마다 파일 하나: `src/data/reference/<source>.json`. 앱은 이 폴더의 모든 `.json`을 빌드 시 읽고 검증합니다.
값은 반드시 원문에서 직접 옮기세요. 이 저장소는 임의의 값을 제공하지 않습니다.

```jsonc
{
  "meta": {
    "source": "<출처 이름>",          // 필수
    "url": "<원문 URL>",              // 필수
    "retrievedAt": "YYYY-MM-DD",      // 필수(아직 모르면 null)
    "license": "unverified",          // 필수. 약관을 확인하기 전에는 unverified
    "version": "<판/버전>",           // 선택
    "description": "<메모>"           // 선택
  },
  "intervals": [
    {
      "analyteId": "<src/data/analytes.json 의 id>",
      "specimen": "serum",            // 카탈로그 검체와 같은 문자열 (serum, plasma, whole blood, urine ...)
      "sex": "M | F | any",
      "ageMinYears": <숫자>,          // 포함
      "ageMaxYears": <숫자 | null>,   // 미포함, null = 상한 없음
      "low": <숫자 | null>,           // 둘 다 null 불가
      "high": <숫자 | null>,
      "unit": "<UCUM 단위>",          // 예: mmol/L, umol/L, meq/L, U/L
      "ref": "<원문 표/행 참조>",     // 선택
      "note": "<비고>"                // 선택
    }
  ]
}
```

- 나이 구간은 `[ageMinYears, ageMaxYears)`입니다. 원문에 없는 나이 구간을 채우거나 이어 붙이지 마세요(앱은 외삽하지 않습니다).
- 단위는 UCUM 코드(대소문자 구분)입니다. `µ`는 `u`로 적습니다.
- 검증: `npm run validate:reference` (구조 검사) 그리고 `npm test`(전체 규칙, UCUM 단위 유효성 포함).
- 라이선스를 확인하면 `meta.license`를 바꾸고 `THIRD_PARTY.md`와 `src/data/sources.ts`를 함께 갱신하세요.

## LOINC

```
npm run import:loinc -- path/to/LoincTop2000.csv
```

`LOINC_NUM`(또는 `LOINC #`), `COMPONENT`/`LONG_COMMON_NAME` 열이 필요합니다. 열 이름을 인식하지 못하면 발견한 헤더를 출력하고 종료합니다.
분석물 연결은 `analytes.json`의 `loincComponent`와 CSV의 `COMPONENT`가 (대소문자 무시) 일치할 때만 이뤄집니다.
