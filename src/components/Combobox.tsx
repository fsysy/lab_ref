import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { Analyte } from '../lib/analytes';
import { searchAnalytes } from '../lib/search';

interface Props {
  label: string;
  value: Analyte | null;
  onSelect: (a: Analyte) => void;
  hint?: string;
}

const display = (a: Analyte) => `${a.names.ko} (${a.names.en})`;

/** WAI-ARIA combobox(list autocomplete): 영문·한글·동의어 검색, 방향키/Enter/Esc 지원. */
export function Combobox({ label, value, onSelect, hint }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [query, setQuery] = useState<string | null>(null); // null: 선택된 값을 그대로 표시
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const text = query ?? (value ? display(value) : '');
  const results = useMemo(() => searchAnalytes(query ?? ''), [query]);

  const choose = (a: Analyte) => {
    onSelect(a);
    setQuery(null);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(null);
    }
  };

  return (
    <div className="field combo">
      <label htmlFor={`${uid}-input`}>{label}</label>
      <input
        id={`${uid}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${uid}-opt-${results[active].id}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={text}
        placeholder="예: glucose, 포도당, 혈당, HbA1c"
        onFocus={(e) => {
          e.currentTarget.select();
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(null);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {hint && <p className="hint">{hint}</p>}
      {open && (
        <ul id={listId} role="listbox" className="combo-list" aria-label={`${label} 검색 결과`}>
          {results.length === 0 && (
            <li role="option" aria-selected="false" aria-disabled="true" className="combo-item">
              일치하는 분석물이 없습니다
            </li>
          )}
          {results.map((a, i) => (
            <li
              key={a.id}
              id={`${uid}-opt-${a.id}`}
              role="option"
              aria-selected={i === active}
              className="combo-item"
              onMouseDown={(e) => {
                e.preventDefault(); // input blur 방지
                choose(a);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {a.names.ko} <span>({a.names.en})</span>
              <small>{a.names.synonyms.slice(0, 4).join(', ')}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
