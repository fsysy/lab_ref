import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ANALYTES, getAnalyte, type Analyte } from '../lib/analytes';
import { convert } from '../lib/convert';
import { formatSig, parseNumber, unitLabel } from '../lib/format';
import {
  ageBandLabel, classify, intervalText, lookupIntervals, validateReferenceFile,
  type Flag, type ReferenceFile, type ReferenceInterval, type Sex,
} from '../lib/reference';
import { exportLocalJson, importLocalJson, loadBundledReferences, loadLocal, saveLocal } from '../lib/referenceStore';
import { CALIPER_CARD } from '../data/sources';
import { Combobox } from './Combobox';

const FLAG_TEXT: Record<Flag, string> = { low: '낮음 (low)', normal: '정상 범위 (normal)', high: '높음 (high)' };
const SEX_LABEL: Record<Sex, string> = { M: '남', F: '여', any: '성별 무관' };

const bundled = loadBundledReferences();
const bundledFiles: ReferenceFile[] = bundled.filter((b) => b.validation.ok && b.validation.file).map((b) => b.validation.file!);

function LicenseBadge({ license }: { license: string }) {
  const warn = license === 'unverified';
  return <span className={`badge ${warn ? 'badge--warn' : ''}`}>license: {license}</span>;
}

export function ReferenceTab() {
  const uid = useId();
  const [analyte, setAnalyte] = useState<Analyte>(() => getAnalyte('glucose')!);
  const [ageStr, setAgeStr] = useState('40');
  const [sex, setSex] = useState<'M' | 'F'>('F');
  const [specimen, setSpecimen] = useState(analyte.specimens[0]);
  const [resultStr, setResultStr] = useState('');
  const [resultUnit, setResultUnit] = useState('');
  const [local, setLocal] = useState<ReferenceFile>(() => loadLocal());

  const persisted = useRef(true);
  useEffect(() => {
    persisted.current = saveLocal(local);
  }, [local]);

  const select = (a: Analyte) => {
    setAnalyte(a);
    setSpecimen(a.specimens[0]);
    setResultUnit('');
  };

  const files = useMemo(() => [...bundledFiles, local], [local]);
  const age = parseNumber(ageStr);
  const specimens = useMemo(() => {
    const set = new Set(analyte.specimens);
    for (const f of files) for (const iv of f.intervals) if (iv.analyteId === analyte.id) set.add(iv.specimen);
    return [...set];
  }, [analyte, files]);

  const lookup = useMemo(
    () => (age === null || age < 0 ? null : lookupIntervals(files, { analyteId: analyte.id, ageYears: age, sex, specimen })),
    [files, analyte, age, sex, specimen],
  );

  const resultVal = parseNumber(resultStr);
  const totalBundled = bundledFiles.reduce((n, f) => n + f.intervals.length, 0);

  return (
    <div>
      {totalBundled === 0 && (
        <div className="notice notice--warn" role="note">
          번들 참고구간 파일(RCPA 등)이 비어 있습니다. 저작권·약관이 확인되지 않아 값을 저장소에 넣지 않았습니다.
          <code> src/data/reference/rcpa.json</code>에 준비한 데이터를 넣거나, 아래 “내 검사실 참고구간”을 입력하세요.
        </div>
      )}
      {bundled.filter((b) => !b.validation.ok).map((b) => (
        <div key={b.path} className="notice notice--bad" role="alert">
          {b.path} 검증 실패 — 이 파일은 사용하지 않았습니다: {b.validation.errors.slice(0, 3).join(' / ')}
        </div>
      ))}

      <section className="card" aria-label="조회 조건">
        <Combobox label="분석물" value={analyte} onSelect={select} />
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor={`${uid}-age`}>나이 (세)</label>
            <input id={`${uid}-age`} inputMode="decimal" value={ageStr} onChange={(e) => setAgeStr(e.target.value)} aria-invalid={age === null || age < 0} />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-sex`}>성별</label>
            <select id={`${uid}-sex`} value={sex} onChange={(e) => setSex(e.target.value as 'M' | 'F')}>
              <option value="F">여</option>
              <option value="M">남</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${uid}-sp`}>검체</label>
            <select id={`${uid}-sp`} value={specimen} onChange={(e) => setSpecimen(e.target.value)}>
              {specimens.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {age === null || age < 0 ? (
        <div className="notice notice--bad" role="alert">나이를 0 이상의 숫자로 입력하세요.</div>
      ) : (
        lookup && (
          <section aria-label="조회 결과">
            {lookup.matches.length === 0 && (
              <div className="card">
                <h2>공표된 참고구간이 없습니다</h2>
                <p>
                  선택한 조건(분석물 {analyte.names.ko}, {age}세, {SEX_LABEL[sex]}, {specimen})에 해당하는 구간이 로드된 자료에 없습니다.
                  다른 나이 구간의 값을 외삽하거나 추정하지 않습니다.
                </p>
                {lookup.availableBands.length > 0 && (
                  <>
                    <p className="hint">같은 분석물·검체에서 공표된 나이 구간:</p>
                    <ul className="plain">
                      {lookup.availableBands.map(({ file, interval }, i) => (
                        <li key={i}>
                          {file.meta.source}: {ageBandLabel(interval)}, {SEX_LABEL[interval.sex]} — {intervalText(interval)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {lookup.matches.map(({ file, interval }, i) => {
              let judged: { flag: Flag; shown: string } | { error: string } | null = null;
              if (resultVal !== null) {
                const r = convert(analyte, resultVal, resultUnit.trim() === '' ? interval.unit : resultUnit, interval.unit);
                judged = r.ok
                  ? { flag: classify(r.value, interval.low, interval.high), shown: `${formatSig(r.value)} ${unitLabel(interval.unit)}` }
                  : { error: r.reason };
              }
              return (
                <article key={i} className="card" aria-label={`${file.meta.source} 구간`}>
                  <h2>{intervalText(interval)}</h2>
                  <dl className="kv">
                    <dt>출처</dt>
                    <dd>
                      {file.meta.url && file.meta.url !== 'about:blank' ? (
                        <a href={file.meta.url} target="_blank" rel="noopener noreferrer">{file.meta.source}</a>
                      ) : (
                        file.meta.source
                      )}{' '}
                      <LicenseBadge license={file.meta.license} />
                    </dd>
                    <dt>조회일</dt>
                    <dd>{file.meta.retrievedAt ?? '미기재'}</dd>
                    <dt>검체</dt>
                    <dd>{interval.specimen}</dd>
                    <dt>나이 구간</dt>
                    <dd>{ageBandLabel(interval)}</dd>
                    <dt>성별</dt>
                    <dd>{SEX_LABEL[interval.sex]}</dd>
                    {interval.ref && (<><dt>원문 참조</dt><dd>{interval.ref}</dd></>)}
                    {interval.note && (<><dt>비고</dt><dd>{interval.note}</dd></>)}
                  </dl>
                  {judged && 'flag' in judged && (
                    <p role="status" style={{ marginBottom: 0 }}>
                      결과 {judged.shown}:{' '}
                      <span className={`flag flag--${judged.flag}`}>{FLAG_TEXT[judged.flag]}</span>
                    </p>
                  )}
                  {judged && 'error' in judged && (
                    <div className="notice notice--bad" role="alert">판정할 수 없습니다: {judged.error}</div>
                  )}
                </article>
              );
            })}

            {lookup.matches.length > 0 && (
              <section className="card" aria-label="결과 값 판정">
                <h2>결과 값 판정</h2>
                <div className="row">
                  <div className="field">
                    <label htmlFor={`${uid}-rv`}>결과 값</label>
                    <input id={`${uid}-rv`} inputMode="decimal" value={resultStr} onChange={(e) => setResultStr(e.target.value)} aria-invalid={resultStr !== '' && resultVal === null} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${uid}-ru`}>결과 단위 (비우면 구간과 같은 단위)</label>
                    <input id={`${uid}-ru`} value={resultUnit} onChange={(e) => setResultUnit(e.target.value)} placeholder={lookup.matches[0].interval.unit} autoCapitalize="off" spellCheck={false} />
                  </div>
                </div>
                <p className="hint">단위가 다르면 변환 탭과 같은 엔진으로 구간 단위로 바꿔 비교합니다. 경계값은 normal로 판정합니다.</p>
              </section>
            )}

            {(age < 18 || lookup.matches.length === 0) && (
              <aside className="card" aria-label="소아 참고구간 안내">
                <h2>{CALIPER_CARD.title}</h2>
                <p>{CALIPER_CARD.body}</p>
                <a href={CALIPER_CARD.url} target="_blank" rel="noopener noreferrer">{CALIPER_CARD.url}</a>{' '}
                <span className="badge">link-only</span>
              </aside>
            )}
          </section>
        )
      )}

      <LocalRanges local={local} setLocal={setLocal} persistedOk={() => persisted.current} />
    </div>
  );
}

// ---- 내 검사실 참고구간 -----------------------------------------------------------

interface DraftState {
  analyteId: string; specimen: string; sex: Sex; ageMin: string; ageMax: string; low: string; high: string; unit: string; note: string;
}

const newDraft = (a: Analyte): DraftState => ({
  analyteId: a.id, specimen: a.specimens[0], sex: 'any', ageMin: '18', ageMax: '', low: '', high: '', unit: a.defaultFrom, note: '',
});

function LocalRanges({ local, setLocal, persistedOk }: { local: ReferenceFile; setLocal: (f: ReferenceFile) => void; persistedOk: () => boolean }) {
  const uid = useId();
  const [draft, setDraft] = useState<DraftState>(() => newDraft(ANALYTES[0]));
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof DraftState>(k: K, v: DraftState[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const add = () => {
    const a = getAnalyte(draft.analyteId)!;
    const low = draft.low.trim() === '' ? null : parseNumber(draft.low);
    const high = draft.high.trim() === '' ? null : parseNumber(draft.high);
    const ageMin = parseNumber(draft.ageMin);
    const ageMax = draft.ageMax.trim() === '' ? null : parseNumber(draft.ageMax);
    const errs: string[] = [];
    if (draft.low.trim() !== '' && low === null) errs.push('하한(low)이 숫자가 아닙니다.');
    if (draft.high.trim() !== '' && high === null) errs.push('상한(high)이 숫자가 아닙니다.');
    if (ageMin === null) errs.push('시작 나이가 숫자가 아닙니다.');
    if (draft.ageMax.trim() !== '' && ageMax === null) errs.push('끝 나이가 숫자가 아닙니다.');
    if (errs.length === 0) {
      const iv: ReferenceInterval = {
        analyteId: a.id, specimen: draft.specimen, sex: draft.sex, ageMinYears: ageMin!, ageMaxYears: ageMax,
        low, high, unit: draft.unit.trim(), ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
      };
      const candidate: ReferenceFile = { ...local, intervals: [...local.intervals, iv] };
      const v = validateReferenceFile(candidate);
      if (!v.ok) errs.push(...v.errors);
      else {
        setLocal(candidate);
        setErrors([]);
        setMsg('추가했습니다.');
        return;
      }
    }
    setErrors(errs);
    setMsg('');
  };

  const download = () => {
    const blob = new Blob([exportLocalJson(local)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-lab-reference-intervals.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const v = importLocalJson(await file.text());
    if (!v.ok || !v.file) {
      setErrors(v.errors.slice(0, 8));
      setMsg('');
    } else if (local.intervals.length === 0 || window.confirm(`현재 저장된 ${local.intervals.length}개 구간을 가져온 ${v.file.intervals.length}개로 바꿀까요?`)) {
      setLocal(v.file);
      setErrors([]);
      setMsg(`${v.file.intervals.length}개 구간을 가져왔습니다.${v.warnings.length ? ' 경고: ' + v.warnings.slice(0, 3).join(' / ') : ''}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <details className="card" open={local.intervals.length > 0}>
      <summary><strong>내 검사실 참고구간</strong> <span className="badge">license: user-provided</span></summary>
      <p className="hint">입력한 값은 이 브라우저의 localStorage에만 저장되며 서버로 전송되지 않습니다. 조회 결과에 “내 검사실 참고구간” 출처로 함께 표시됩니다.</p>
      {!persistedOk() && <div className="notice notice--warn">localStorage에 저장하지 못했습니다(차단 또는 용량 초과). JSON 내보내기로 백업하세요.</div>}

      <div className="row">
        <div className="field">
          <label htmlFor={`${uid}-a`}>분석물</label>
          <select id={`${uid}-a`} value={draft.analyteId} onChange={(e) => setDraft(newDraft(getAnalyte(e.target.value)!))}>
            {ANALYTES.map((a) => <option key={a.id} value={a.id}>{a.names.ko} ({a.names.en})</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-sp`}>검체</label>
          <input id={`${uid}-sp`} value={draft.specimen} onChange={(e) => set('specimen', e.target.value)} list={`${uid}-spl`} />
          <datalist id={`${uid}-spl`}>{getAnalyte(draft.analyteId)!.specimens.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-sx`}>성별</label>
          <select id={`${uid}-sx`} value={draft.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
            <option value="any">성별 무관</option><option value="M">남</option><option value="F">여</option>
          </select>
        </div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div className="field"><label htmlFor={`${uid}-a1`}>시작 나이 (세, 포함)</label><input id={`${uid}-a1`} inputMode="decimal" value={draft.ageMin} onChange={(e) => set('ageMin', e.target.value)} /></div>
        <div className="field"><label htmlFor={`${uid}-a2`}>끝 나이 (세, 미포함·비우면 상한 없음)</label><input id={`${uid}-a2`} inputMode="decimal" value={draft.ageMax} onChange={(e) => set('ageMax', e.target.value)} /></div>
        <div className="field"><label htmlFor={`${uid}-lo`}>하한 (low)</label><input id={`${uid}-lo`} inputMode="decimal" value={draft.low} onChange={(e) => set('low', e.target.value)} /></div>
        <div className="field"><label htmlFor={`${uid}-hi`}>상한 (high)</label><input id={`${uid}-hi`} inputMode="decimal" value={draft.high} onChange={(e) => set('high', e.target.value)} /></div>
        <div className="field"><label htmlFor={`${uid}-un`}>단위 (UCUM)</label><input id={`${uid}-un`} value={draft.unit} onChange={(e) => set('unit', e.target.value)} autoCapitalize="off" spellCheck={false} /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div className="field"><label htmlFor={`${uid}-nt`}>비고</label><input id={`${uid}-nt`} value={draft.note} onChange={(e) => set('note', e.target.value)} /></div>
        <button type="button" className="btn btn--primary" onClick={add}>구간 추가</button>
      </div>

      {errors.length > 0 && (
        <div className="notice notice--bad" role="alert"><ul className="plain">{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>
      )}
      {msg && <div className="notice notice--ok" role="status">{msg}</div>}

      {local.intervals.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <caption className="sr-only">저장된 내 검사실 참고구간</caption>
            <thead><tr><th>분석물</th><th>검체</th><th>성별</th><th>나이</th><th>구간</th><th><span className="sr-only">삭제</span></th></tr></thead>
            <tbody>
              {local.intervals.map((iv, i) => (
                <tr key={i}>
                  <td>{getAnalyte(iv.analyteId)?.names.ko ?? iv.analyteId}</td>
                  <td>{iv.specimen}</td>
                  <td>{SEX_LABEL[iv.sex]}</td>
                  <td>{ageBandLabel(iv)}</td>
                  <td>{intervalText(iv)}</td>
                  <td>
                    <button type="button" className="btn btn--small" onClick={() => setLocal({ ...local, intervals: local.intervals.filter((_, j) => j !== i) })}
                      aria-label={`${getAnalyte(iv.analyteId)?.names.ko ?? iv.analyteId} ${ageBandLabel(iv)} 구간 삭제`}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn" onClick={download} disabled={local.intervals.length === 0}>JSON 내보내기</button>
        <label className="btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
          JSON 가져오기
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onImport(e.target.files?.[0])} />
        </label>
      </div>
    </details>
  );
}
