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
  education_level: {
    final_degree: 'bachelor',
    bachelor: '한국대학교',
    master: '',
    doctoral: '',
  },
  experience: [
    {
      company_name: '휴머',
      length: '6개월',
      position: '인턴',
      experience_description: '데이터 분석 업무',
    },
  ],
  self_intoduction: [{ question: '지원 동기', answer: '답변' }],
  certification: ['SQLD'],
  language: [{ language_name: '영어', test_name: 'OPIC', score: 'IH' }],
  award: [{ award_name: '해커톤 우수상', award_from: '서울시', time: '2024' }],
  training: [
    {
      education_name: 'AI 부트캠프',
      education_from: '패스트캠퍼스',
      education_description: '프론트엔드 프로젝트',
      start: '2024-01',
      end: '2024-03',
    },
  ],
  other_activity: [
    {
      activity_name: '오픈소스 기여',
      activity_description: '문서 개선',
      start: '2023-01',
      end: '2023-12',
    },
  ],
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

  it('경력 object 배열 항목도 요약과 접힌 편집 리스트로 수정한다', async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();

    render(<CoverLetterInputPanelHarness onRead={onRead} />);

    await user.click(screen.getByRole('button', { name: /추가 이력 정보/ }));

    expect(screen.getByText('휴머 · 6개월 · 인턴')).toBeInTheDocument();
    expect(screen.getByDisplayValue('휴머')).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: /경력 편집/ }));
    await user.clear(screen.getByLabelText('경력 1 회사명'));
    await user.type(screen.getByLabelText('경력 1 회사명'), '데이터랩');
    await user.clear(screen.getByLabelText('경력 1 경력 설명'));
    await user.type(screen.getByLabelText('경력 1 경력 설명'), '대시보드 구축');
    await user.click(screen.getByRole('button', { name: '값 확인' }));

    expect(onRead).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: [
          expect.objectContaining({
            company_name: '데이터랩',
            length: '6개월',
            position: '인턴',
            experience_description: '대시보드 구축',
          }),
        ],
      }),
    );
  });

  it('자기소개 문항을 여러 개 추가해 list[dict]로 관리한다', async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();

    render(<CoverLetterInputPanelHarness onRead={onRead} />);

    expect(screen.getByLabelText('자기소개 문항 1 문항')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /자기소개 문항 추가/ }));
    await user.type(screen.getByLabelText('자기소개 문항 2 문항'), '협업 경험');
    await user.type(screen.getByLabelText('자기소개 문항 2 답변'), '협업 답변');
    await user.click(screen.getByRole('button', { name: '값 확인' }));

    expect(onRead).toHaveBeenCalledWith(
      expect.objectContaining({
        self_intoduction: [
          { question: '지원 동기', answer: '답변' },
          { question: '협업 경험', answer: '협업 답변' },
        ],
      }),
    );
  });
});
