import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { QuestionList } from './QuestionList';

const questions = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
  resume_id: 1,
  question: `질문 ${index + 1}`,
  answer: `답변 ${index + 1}`,
  purpose: `의도 ${index + 1}`,
}));

describe('QuestionList', () => {
  it('expands details in the selected question card and toggles the full list', async () => {
    const user = userEvent.setup();
    render(<QuestionList questions={questions} />);

    expect(screen.queryByText('질문 4')).not.toBeInTheDocument();
    expect(screen.queryByText('답변 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /질문 1/ }));

    expect(screen.getByText('답변 1')).toBeInTheDocument();
    expect(screen.getByText('의도 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /질문 1/ })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: /전체 보기/ }));
    expect(screen.getByText('질문 4')).toBeInTheDocument();
  });
});
