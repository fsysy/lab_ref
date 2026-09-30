import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ConvertTab } from './components/ConvertTab';
import { ReferenceTab } from './components/ReferenceTab';
import { SourcesTab } from './components/SourcesTab';

const TABS = [
  { id: 'convert', label: '변환', Panel: ConvertTab },
  { id: 'reference', label: '참고구간', Panel: ReferenceTab },
  { id: 'sources', label: '출처·정보', Panel: SourcesTab },
] as const;

type Theme = 'auto' | 'light' | 'dark';
const THEME_KEY = 'labref.theme';
const THEME_LABEL: Record<Theme, string> = { auto: '테마: 자동', light: '테마: 밝게', dark: '테마: 어둡게' };

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('convert');
  const [theme, setTheme] = useState<Theme>(readTheme);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* 저장 불가는 무시 */
    }
  }, [theme]);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const nextTheme: Theme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto';

  return (
    <div className="app">
      <a className="skip-link" href="#main">본문으로 건너뛰기</a>
      <header className="app-header">
        <div>
          <h1>검사 단위 변환 · 참고구간</h1>
          <p>계산은 이 브라우저에서만 수행되며 입력은 외부로 전송되지 않습니다.</p>
        </div>
        <button type="button" className="btn btn--small" onClick={() => setTheme(nextTheme)} aria-label={`${THEME_LABEL[theme]} (누르면 ${THEME_LABEL[nextTheme]})`}>
          {THEME_LABEL[theme]}
        </button>
      </header>

      <div role="tablist" aria-label="기능" className="tabs">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="tab"
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main id="main">
        {TABS.map(({ id, Panel }) => (
          <div key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={tab !== id}>
            {/* 탭 전환 시 입력 상태를 유지하기 위해 모두 마운트해 두고 hidden 처리 */}
            <Panel />
          </div>
        ))}
      </main>
    </div>
  );
}
