import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { ReportEditForm } from './ReportEditForm';
import type { ReportEditFormValues } from './reportPresentation';

const initialValues: ReportEditFormValues = {
  overall_grade: 'A',
  overall_summary: '전체 요약',
  candidate_summary: '지원자 요약',
  competency_analysis: '역량',
  fit_analysis: '적합도',
  motive: '동기',
  collaboration: '협업',
  strength: '강점',
  concern: '우려',
  check_point: '확인',
  final_comment: '최종',
};

function TestForm({ onFinish }: { onFinish: (values: ReportEditFormValues) => void }) {
  const [form] = Form.useForm<ReportEditFormValues>();
  return (
    <>
      <ReportEditForm form={form} initialValues={initialValues} onFinish={onFinish} />
      <button type="button" onClick={() => form.submit()}>submit</button>
    </>
  );
}

describe('ReportEditForm', () => {
  it('renders existing fields and submits edited values through its callback', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<TestForm onFinish={onFinish} />);

    const summary = screen.getByLabelText('전체 평가 요약 수정');
    await user.clear(summary);
    await user.type(summary, '수정 요약');
    await user.click(screen.getByRole('button', { name: 'submit' }));

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ overall_summary: '수정 요약' }));
  });
});
