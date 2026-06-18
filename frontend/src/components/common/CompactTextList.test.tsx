import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CompactTextList } from './CompactTextList';

describe('CompactTextList', () => {
  it('상위 항목만 먼저 보여주고 토글로 전체 목록을 펼친다', async () => {
    const user = userEvent.setup();

    render(
      <CompactTextList
        items={['첫 번째 항목', '두 번째 항목', '세 번째 항목', '네 번째 항목']}
        emptyText="항목이 없습니다."
      />,
    );

    expect(screen.getByText('첫 번째 항목')).toBeInTheDocument();
    expect(screen.getByText('두 번째 항목')).toBeInTheDocument();
    expect(screen.queryByText('세 번째 항목')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /전체 보기/ }));

    expect(screen.getByText('세 번째 항목')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /접기/ })).toBeInTheDocument();
  });
});
