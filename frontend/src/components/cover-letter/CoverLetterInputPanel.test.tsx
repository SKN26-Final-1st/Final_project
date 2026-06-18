import { Button, Form } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CoverLetterInputPanel, type CoverLetterInputFormValues } from './CoverLetterInputPanel';
import type { JdItem } from '../../api/adapters';

const defaultInitialValues: CoverLetterInputFormValues = {
  job_description_id: 1,
  name: '홍길동',
  skill: ['React'],
  education_level_text: '',
  experience: [],
  question: '지원 동기',
  answer: '답변',
  certification: [],
  language: [],
  award: [],
  training: [],
  other_activity: [],
};

const jdItem: JdItem = {
  id: '1',
  title: '프론트엔드 JD',
  team: '',
  status: '준비 중',
  statusCode: 'prepare',
  fit: 0,
  stack: [],
  preferredStack: [],
  summary: '',
  requiredExperience: '',
  employmentType: '',
  educationLevel: '',
  major: '',
  hiringReason: '',
};

function CoverLetterInputPanelHarness({
  initialValues = defaultInitialValues,
  onRead,
}: {
  initialValues?: CoverLetterInputFormValues;
  onRead: (values: CoverLetterInputFormValues) => void;
}) {
  const [form] = Form.useForm<CoverLetterInputFormValues>();

  return (
    <>
      <CoverLetterInputPanel
        jdList={[jdItem]}
        form={form}
        initialValues={initialValues}
        mode="edit"
        setSelectedJdId={vi.fn()}
      />
      <Button onClick={() => onRead(form.getFieldsValue())}>값 확인</Button>
    </>
  );
}

describe('CoverLetterInputPanel', () => {
  it('기술 스택 요약은 항상 보이고 편집 입력은 기본적으로 접는다', () => {
    render(
      <CoverLetterInputPanelHarness
        initialValues={{ ...defaultInitialValues, skill: ['React', 'TypeScript', 'Django', 'PostgreSQL'] }}
        onRead={vi.fn()}
      />,
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Django')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('React')).not.toBeVisible();
    expect(screen.getByRole('button', { name: /기술 스택 편집/ })).toBeInTheDocument();
  });

  it('편집 토글로 기존 기술 스택 항목을 입력 필드에서 직접 수정하고 다시 접는다', async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();

    render(<CoverLetterInputPanelHarness onRead={onRead} />);

    await user.click(screen.getByRole('button', { name: /기술 스택 편집/ }));

    const skillInput = screen.getByDisplayValue('React');

    await user.clear(skillInput);
    await user.type(skillInput, 'TypeScript');
    await user.click(screen.getByRole('button', { name: '값 확인' }));

    expect(onRead).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: ['TypeScript'],
      }),
    );

    await user.click(screen.getByRole('button', { name: /편집 닫기/ }));
    expect(screen.getByDisplayValue('TypeScript')).not.toBeVisible();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('편집을 열면 기술 스택 추가 버튼을 노출한다', async () => {
    const user = userEvent.setup();

    render(<CoverLetterInputPanelHarness onRead={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /기술 스택 편집/ }));

    expect(screen.getByRole('button', { name: /기술 추가/ })).toBeInTheDocument();
  });
});
