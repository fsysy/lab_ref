import type { SourceRef } from './types';

export interface AtomicWeight {
  value: number;
  /** IUPAC가 구간으로 표기하는 원소의 표준 원자량 구간 */
  interval?: [number, number];
  /** standard: IUPAC가 단일 값으로 표기 / conventional: 구간 원소에 쓰는 관례값 */
  basis: 'standard' | 'conventional';
}

// 값은 CIAAW 표준 원자량표(2024판, 2021 보고서 기반)에서 확인한 것만 'standard'.
// 구간 원소(H, C, N, O, Mg, S, Cl, Li)의 관례값은 페이지에서 직접 확인하지 못했다.
// TODO(verify): 관례값(H 1.008, C 12.011, N 14.007, O 15.999, Mg 24.305, S 32.06, Cl 35.45, Li 6.94)이
//   IUPAC conventional atomic weights 표와 일치하는지 확인.
export const ATOMIC_WEIGHTS: Record<string, AtomicWeight> = {
  H: { value: 1.008, interval: [1.00784, 1.00811], basis: 'conventional' },
  Li: { value: 6.94, interval: [6.938, 6.997], basis: 'conventional' },
  C: { value: 12.011, interval: [12.0096, 12.0116], basis: 'conventional' },
  N: { value: 14.007, interval: [14.00643, 14.00728], basis: 'conventional' },
  O: { value: 15.999, interval: [15.99903, 15.99977], basis: 'conventional' },
  Na: { value: 22.98976928, basis: 'standard' },
  Mg: { value: 24.305, interval: [24.304, 24.307], basis: 'conventional' },
  P: { value: 30.973761998, basis: 'standard' },
  S: { value: 32.06, interval: [32.059, 32.076], basis: 'conventional' },
  Cl: { value: 35.45, interval: [35.446, 35.457], basis: 'conventional' },
  K: { value: 39.0983, basis: 'standard' },
  Ca: { value: 40.078, basis: 'standard' },
  Fe: { value: 55.845, basis: 'standard' },
  Co: { value: 58.933194, basis: 'standard' },
  Cu: { value: 63.546, basis: 'standard' },
  Zn: { value: 65.38, basis: 'standard' },
  I: { value: 126.90447, basis: 'standard' },
};

export const ATOMIC_WEIGHTS_SOURCE: SourceRef & { retrievedAt: string } = {
  label: 'IUPAC/CIAAW Standard Atomic Weights (2024, based on the 2021 report)',
  url: 'https://www.ciaaw.org/atomic-weights.htm',
  retrievedAt: '2026-09-30',
};
