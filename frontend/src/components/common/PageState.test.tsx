import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, PageLoading } from './PageState';

describe('PageState', () => {
  it('announces the loading context to assistive technology', () => {
    render(<PageLoading title="지원자 데이터를 불러오는 중입니다." />);

    expect(screen.getByRole('status', { name: '지원자 데이터를 불러오는 중입니다.' })).toBeInTheDocument();
  });

  it('exposes an empty result as a named region', () => {
    render(<EmptyState description="등록된 지원자가 없습니다." />);

    expect(screen.getByRole('region', { name: '등록된 지원자가 없습니다.' })).toBeInTheDocument();
  });
});
