import { ATOMIC_WEIGHTS, ATOMIC_WEIGHTS_SOURCE } from '../lib/atomic';
import { loadBundledReferences } from '../lib/referenceStore';
import loincData from '../data/loinc/loinc.json';
import { CALIPER_CARD, CLINICAL_DISCLAIMER, SOURCES, type LicenseStatus } from '../data/sources';

const LICENSE_LABEL: Record<LicenseStatus, string> = {
  unverified: 'license: unverified',
  'verified-open': 'license: verified-open',
  'test-only': 'test-only',
  'link-only': 'link-only',
  oss: 'OSS',
};

const bundled = loadBundledReferences();
const loinc = loincData as { meta: { retrievedAt: string | null; license: string }; codes: unknown[] };

export function SourcesTab() {
  return (
    <div>
      <section className="card" aria-labelledby="disc">
        <h2 id="disc">임상 사용 한계</h2>
        <ul className="plain">
          {CLINICAL_DISCLAIMER.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>

      <section className="card" aria-labelledby="src">
        <h2 id="src">사용한 자료</h2>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">사용한 자료와 버전, 조회일, 라이선스 상태</caption>
            <thead>
              <tr><th>자료</th><th>용도</th><th>버전</th><th>조회일</th><th>라이선스</th></tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> : <>{s.name} <span className="badge">URL 미확인</span></>}
                    <div className="hint">{s.licenseNote}</div>
                  </td>
                  <td>{s.usedFor}{s.bundled ? '' : ' (앱에 내장 안 함)'}</td>
                  <td>{s.version ?? '미확인'}</td>
                  <td>{s.retrievedAt ?? '미조회'}</td>
                  <td><span className={`badge ${s.license === 'unverified' ? 'badge--warn' : ''}`}>{LICENSE_LABEL[s.license]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="loaded">
        <h2 id="loaded">현재 로드된 데이터</h2>
        <ul className="plain">
          {bundled.map((b) => (
            <li key={b.path}>
              <code>{b.path}</code>:{' '}
              {b.validation.ok && b.validation.file
                ? <>{b.validation.file.meta.source} — 구간 {b.validation.file.intervals.length}개, 조회일 {b.validation.file.meta.retrievedAt ?? '미기재'}{' '}
                    <span className="badge badge--warn">license: {b.validation.file.meta.license}</span></>
                : <span className="notice notice--bad">검증 실패: {b.validation.errors.slice(0, 2).join(' / ')}</span>}
            </li>
          ))}
          <li>
            <code>src/data/loinc/loinc.json</code>: LOINC 코드 {loinc.codes.length}개, 조회일 {loinc.meta.retrievedAt ?? '미기재'}{' '}
            <span className="badge badge--warn">license: {loinc.meta.license}</span>
          </li>
        </ul>
      </section>

      <section className="card" aria-labelledby="peds">
        <h2 id="peds">{CALIPER_CARD.title}</h2>
        <p>{CALIPER_CARD.body}</p>
        <a href={CALIPER_CARD.url} target="_blank" rel="noopener noreferrer">{CALIPER_CARD.url}</a> <span className="badge">link-only</span>
      </section>

      <section className="card" aria-labelledby="aw">
        <h2 id="aw">사용한 원자량</h2>
        <p className="hint">
          분자량은 분자식 × 아래 원자량으로 계산합니다. 출처:{' '}
          <a href={ATOMIC_WEIGHTS_SOURCE.url} target="_blank" rel="noopener noreferrer">{ATOMIC_WEIGHTS_SOURCE.label}</a>, 조회일 {ATOMIC_WEIGHTS_SOURCE.retrievedAt}.
          ‘conventional’은 IUPAC가 구간으로 표기하는 원소의 관례값이며 확인이 필요합니다(TODO(verify)).
        </p>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">원소별 원자량</caption>
            <thead><tr><th>원소</th><th>값</th><th>구간</th><th>구분</th></tr></thead>
            <tbody>
              {Object.entries(ATOMIC_WEIGHTS).map(([sym, w]) => (
                <tr key={sym}>
                  <td>{sym}</td>
                  <td className="mono">{w.value}</td>
                  <td className="mono">{w.interval ? `[${w.interval[0]}, ${w.interval[1]}]` : '—'}</td>
                  <td>{w.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
