import { useId, useMemo, useState } from 'react';
import { getAnalyte, type Analyte } from '../lib/analytes';
import { convert } from '../lib/convert';
import { formatSig, parseNumber, unitLabel } from '../lib/format';
import { matchLoinc, type LoincCode } from '../lib/loinc';
import loincData from '../data/loinc/loinc.json';
import { Combobox } from './Combobox';

const LOINC_CODES = (loincData as { codes: LoincCode[] }).codes;

export function ConvertTab() {
  const uid = useId();
  const [analyte, setAnalyte] = useState<Analyte>(() => getAnalyte('glucose')!);
  const [valueStr, setValueStr] = useState('100');
  const [from, setFrom] = useState(analyte.defaultFrom);
  const [to, setTo] = useState(analyte.defaultTo);
  const [copied, setCopied] = useState(false);

  const select = (a: Analyte) => {
    setAnalyte(a);
    setFrom(a.defaultFrom);
    setTo(a.defaultTo);
  };

  const value = parseNumber(valueStr);
  const result = useMemo(
    () => (value === null ? null : convert(analyte, value, from, to)),
    [analyte, value, from, to],
  );
  const loinc = useMemo(() => matchLoinc(analyte, LOINC_CODES), [analyte]);

  const outText = result && result.ok ? formatSig(result.value) : '';

  const copy = async () => {
    if (!result || !result.ok) return;
    const text = `${outText} ${unitLabel(to)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <section className="card" aria-label="변환 입력">
        <Combobox label="분석물 검색" value={analyte} onSelect={select} hint="영문·한글·동의어로 검색 (예: Glucose, 혈당, GPT)" />
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field" style={{ flex: '1 1 130px' }}>
            <label htmlFor={`${uid}-v`}>값</label>
            <input
              id={`${uid}-v`}
              inputMode="decimal"
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              aria-invalid={value === null && valueStr !== ''}
              aria-describedby={`${uid}-vh`}
            />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-f`}>원본 단위 (UCUM)</label>
            <input id={`${uid}-f`} list={`${uid}-units`} value={from} onChange={(e) => setFrom(e.target.value)} autoCapitalize="off" spellCheck={false} />
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            aria-label={`단위 맞바꾸기: ${unitLabel(from)}와 ${unitLabel(to)}`}
            title="원본↔대상 단위 스왑"
          >
            ⇄
          </button>
          <div className="field">
            <label htmlFor={`${uid}-t`}>대상 단위 (UCUM)</label>
            <input id={`${uid}-t`} list={`${uid}-units`} value={to} onChange={(e) => setTo(e.target.value)} autoCapitalize="off" spellCheck={false} />
          </div>
        </div>
        <datalist id={`${uid}-units`}>
          {analyte.units.map((u) => (
            <option key={u} value={u} label={unitLabel(u)} />
          ))}
        </datalist>
        <p className="hint" id={`${uid}-vh`}>
          단위는 UCUM 코드로 입력합니다 (예: mg/dL, mmol/L, umol/L, meq/L, U/L). 대소문자를 구분합니다.
        </p>
      </section>

      <section className="card result" aria-live="polite" aria-label="변환 결과">
        {value === null && <p className="hint">숫자를 입력하면 결과가 표시됩니다.</p>}
        {result && result.ok && (
          <>
            <div className="result-value">{outText}</div>
            <div className="result-unit">{unitLabel(to)}</div>
            <div className="result-actions">
              <button type="button" className="btn btn--primary" onClick={copy}>
                {copied ? '복사됨 ✓' : '결과 복사'}
              </button>
            </div>
          </>
        )}
        {result && !result.ok && (
          <div className="notice notice--bad" role="alert" style={{ textAlign: 'left' }}>
            <strong>변환할 수 없습니다.</strong>
            <div>{result.reason}</div>
          </div>
        )}
      </section>

      {result && result.ok && (
        <section className="card" aria-labelledby={`${uid}-basis`}>
          <h2 id={`${uid}-basis`}>계산 근거</h2>
          <dl className="kv">
            <dt>방법</dt>
            <dd className="mono">{result.method}</dd>
            {result.factor !== undefined && (
              <>
                <dt>계수</dt>
                <dd className="mono">
                  1 {from} = {formatSig(result.factor, 6)} {to}
                </dd>
              </>
            )}
            <dt>수식</dt>
            <dd className="mono">{result.formula}</dd>
          </dl>
          {result.steps.length > 0 && (
            <>
              <h3 style={{ marginTop: 12 }}>계산 단계</h3>
              <ul className="plain">
                {result.steps.map((s) => (
                  <li key={s} className="mono">{s}</li>
                ))}
              </ul>
            </>
          )}
          <h3 style={{ marginTop: 12 }}>가정</h3>
          {result.assumptions.length === 0 ? (
            <p className="hint">추가 가정 없음</p>
          ) : (
            <ul className="plain">
              {result.assumptions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {result.warnings.map((w) => (
            <div key={w} className="notice notice--warn">{w}</div>
          ))}
          <h3 style={{ marginTop: 12 }}>출처</h3>
          <ul className="plain">
            {result.sources.map((s) => (
              <li key={s.label}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                ) : (
                  s.label
                )}
              </li>
            ))}
          </ul>
          {loinc.length > 0 && (
            <>
              <h3 style={{ marginTop: 12 }}>LOINC 코드 <span className="badge badge--warn">license: unverified</span></h3>
              <ul className="plain">
                {loinc.slice(0, 8).map((c) => (
                  <li key={c.code}>
                    <code>{c.code}</code> {c.longName ?? c.component}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
