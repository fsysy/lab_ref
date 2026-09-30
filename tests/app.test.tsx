// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../src/App';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('앱 스모크', () => {
  it('기본 변환: 포도당 100 mg/dL → 5.551 mmol/L, 계산 근거 표시', async () => {
    render(<App />);
    const result = screen.getByLabelText('변환 결과');
    expect(within(result).getByText('5.551')).toBeInTheDocument();
    const basis = screen.getByRole('region', { name: '계산 근거' });
    expect(within(basis).getByText(/C6H12O6/)).toBeInTheDocument();
    expect(within(basis).getByRole('link', { name: /CIAAW/ })).toHaveAttribute('href', 'https://www.ciaaw.org/atomic-weights.htm');
  });

  it('근거 없는 변환(mg/dL → U/L)은 거부 이유를 알림으로 표시', async () => {
    const user = userEvent.setup();
    render(<App />);
    const to = screen.getByLabelText(/대상 단위/);
    await user.clear(to);
    await user.type(to, 'U/L');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('변환할 수 없습니다');
    expect(alert).toHaveTextContent('효소 활성');
    expect(screen.queryByRole('region', { name: '계산 근거' })).toBeNull();
  });

  it('스왑 버튼이 단위를 맞바꾼다', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /단위 맞바꾸기/ }));
    expect(screen.getByLabelText(/원본 단위/)).toHaveValue('mmol/L');
    expect(screen.getByLabelText(/대상 단위/)).toHaveValue('mg/dL');
  });

  it('한글 검색으로 분석물 선택', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = screen.getAllByRole('combobox')[0];
    await user.click(box);
    await user.clear(box);
    await user.type(box, '당화');
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText(/원본 단위/)).toHaveValue('%');
    expect(screen.getByLabelText(/대상 단위/)).toHaveValue('mmol/mol');
  });

  it('탭: 방향키 이동과 ARIA 상태', async () => {
    const user = userEvent.setup();
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    tabs[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('임상 사용 한계')).toBeVisible();
  });

  it('참고구간 탭: 번들 데이터가 비어 있으면 안내하고 구간을 지어내지 않는다', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: '참고구간' }));
    const panel = within(screen.getByRole('tabpanel'));
    expect(panel.getByText(/번들 참고구간 파일\(RCPA 등\)이 비어 있습니다/)).toBeVisible();
    expect(panel.getByText('공표된 참고구간이 없습니다')).toBeVisible();
    expect(panel.getByText('소아 참고구간: CALIPER')).toBeVisible();
  });

  it('내 검사실 구간을 추가하면 조회·판정되고 localStorage에만 저장된다', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: '참고구간' }));
    // TEST-ONLY 가짜 값
    const details = screen.getByText('내 검사실 참고구간').closest('details')!;
    await user.click(within(details).getByText('내 검사실 참고구간'));
    await user.selectOptions(within(details).getByLabelText('분석물'), 'glucose');
    await user.clear(within(details).getByLabelText('시작 나이 (세, 포함)'));
    await user.type(within(details).getByLabelText('시작 나이 (세, 포함)'), '18');
    await user.type(within(details).getByLabelText('하한 (low)'), '1');
    await user.type(within(details).getByLabelText('상한 (high)'), '2');
    const unit = within(details).getByLabelText('단위 (UCUM)');
    await user.clear(unit);
    await user.type(unit, 'mmol/L');
    await user.click(within(details).getByRole('button', { name: '구간 추가' }));

    expect(localStorage.getItem('labref.localRanges.v1')).toContain('"high":2');
    const card = await screen.findByRole('article', { name: /내 검사실 참고구간/ });
    expect(within(card).getByText('1 – 2 mmol/L')).toBeInTheDocument();
    expect(within(card).getByText('license: user-provided')).toBeInTheDocument();

    await user.type(screen.getByLabelText('결과 값'), '3');
    expect(await screen.findByText(/높음 \(high\)/)).toBeInTheDocument();
  });
});
