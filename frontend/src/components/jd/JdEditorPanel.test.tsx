import { Button, Form } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { JdEditorPanel, type JdEditorFormValues } from './JdEditorPanel';

const initialValues: JdEditorFormValues = {
  job_name: '프론트엔드 개발자',
  education_level: '학사',
  major: '컴퓨터공학',
  career_level: '3년 이상',
  required_skill: ['React'],
  preferred_skill: ['TypeScript'],
  main_task: '서비스 개발',
  hiring_reason: '확장',
  work_type: '정규직',
  status: 'prepare',
};

function JdEditorPanelHarness({ onRead }: { onRead: (values: JdEditorFormValues) => void }) {
  const [form] = Form.useForm<JdEditorFormValues>();

  return (
    <>
      <JdEditorPanel form={form} selectedJd={null} initialValues={initialValues} mode="create" />
      <Button onClick={() => onRead(form.getFieldsValue())}>값 확인</Button>
    </>
  );
}

describe('JdEditorPanel', () => {
  it('필수 기술과 우대 기술 요약을 보이고 편집 입력은 기본적으로 접는다', () => {
    render(<JdEditorPanelHarness onRead={vi.fn()} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByDisplayValue('React')).not.toBeVisible();
    expect(screen.getByRole('button', { name: /필수 기술 편집/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /우대 기술 편집/ })).toBeInTheDocument();
  });

  it('편집 토글로 필수 기술과 우대 기술을 직접 수정한다', async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();

    render(<JdEditorPanelHarness onRead={onRead} />);

    await user.click(screen.getByRole('button', { name: /필수 기술 편집/ }));
    await user.click(screen.getByRole('button', { name: /우대 기술 편집/ }));
    await user.clear(screen.getByDisplayValue('React'));
    await user.type(screen.getByLabelText('필수 기술 1'), 'Vue');
    await user.clear(screen.getByDisplayValue('TypeScript'));
    await user.type(screen.getByLabelText('우대 기술 1'), 'GraphQL');
    await user.click(screen.getByRole('button', { name: '값 확인' }));

    expect(onRead).toHaveBeenCalledWith(
      expect.objectContaining({
        required_skill: ['Vue'],
        preferred_skill: ['GraphQL'],
      }),
    );
  });
});
