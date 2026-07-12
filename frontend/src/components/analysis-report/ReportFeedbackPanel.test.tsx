import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReportFeedbackPanel } from './ReportFeedbackPanel';

describe('ReportFeedbackPanel', () => {
  it('renders controlled review values and delegates edits and save', async () => {
    const user = userEvent.setup();
    const onReviewTextChange = vi.fn();
    const onSave = vi.fn();

    render(
      <ReportFeedbackPanel
        rating={4}
        reviewText="기존 의견"
        enabled
        saving={false}
        hasChanges
        onRatingChange={vi.fn()}
        onReviewTextChange={onReviewTextChange}
        onSave={onSave}
      />,
    );

    expect(screen.getByLabelText('사용자 리뷰 별점 4점')).toBeInTheDocument();
    await user.type(screen.getByLabelText('사용자 리뷰 의견'), ' 추가');
    expect(onReviewTextChange).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '리뷰 저장' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
