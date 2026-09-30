import { validateReferenceFile, type ReferenceFile, type ReferenceInterval, type ValidationResult } from './reference';

export interface LoadedSource {
  path: string;
  validation: ValidationResult;
}

const modules = import.meta.glob('../data/reference/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

/** 출처별로 나뉜 번들 파일을 모두 검증해서 읽는다. 잘못된 파일은 사용하지 않고 오류를 노출한다. */
export function loadBundledReferences(): LoadedSource[] {
  return Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, data]) => ({ path: path.replace('../data/', 'src/data/'), validation: validateReferenceFile(data) }));
}

// ---- 내 검사실 참고구간 (localStorage 전용) -------------------------------------

export const LOCAL_KEY = 'labref.localRanges.v1';

export const emptyLocalFile = (): ReferenceFile => ({
  meta: {
    source: '내 검사실 참고구간',
    url: 'about:blank',
    retrievedAt: null,
    license: 'user-provided',
    description: '사용자가 직접 입력한 값. 이 브라우저의 localStorage에만 저장된다.',
  },
  intervals: [],
});

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // 접근 차단(사생활 보호 모드 등)
  }
}

export function loadLocal(storage: StorageLike | null = defaultStorage()): ReferenceFile {
  if (!storage) return emptyLocalFile();
  try {
    const raw = storage.getItem(LOCAL_KEY);
    if (!raw) return emptyLocalFile();
    const v = validateReferenceFile(JSON.parse(raw));
    return v.ok && v.file ? v.file : emptyLocalFile();
  } catch {
    return emptyLocalFile();
  }
}

export function saveLocal(file: ReferenceFile, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(LOCAL_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false; // 용량 초과 등
  }
}

export function exportLocalJson(file: ReferenceFile, now: Date = new Date()): string {
  const out: ReferenceFile = {
    meta: { ...file.meta, retrievedAt: now.toISOString().slice(0, 10) },
    intervals: file.intervals,
  };
  return JSON.stringify(out, null, 2) + '\n';
}

/** 가져오기: 텍스트를 파싱·검증하고 통과하면 로컬 파일 형태로 반환. */
export function importLocalJson(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`JSON 파싱 실패: ${(e as Error).message}`], warnings: [] };
  }
  const v = validateReferenceFile(parsed);
  if (!v.ok || !v.file) return v;
  return {
    ...v,
    file: {
      meta: { ...emptyLocalFile().meta, description: v.file.meta.description ?? emptyLocalFile().meta.description },
      intervals: v.file.intervals,
    },
  };
}

export type { ReferenceInterval };
