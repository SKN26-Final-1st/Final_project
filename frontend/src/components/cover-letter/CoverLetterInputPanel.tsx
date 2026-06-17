import { Collapse, Form, Input, Select, Tag, type FormInstance } from 'antd';
import type { JdItem } from '../../api/adapters';

const { TextArea } = Input;

export type CoverLetterInputFormValues = {
  job_description_id?: number;
  name: string;
  skill: string[];
  education_level_text: string;
  experience: string[];
  question: string;
  answer: string;
  certification: string[];
  language: string[];
  award: string[];
  training: string[];
  other_activity: string[];
};

type CoverLetterInputPanelProps = {
  jdList: JdItem[];
  form: FormInstance<CoverLetterInputFormValues>;
  initialValues: CoverLetterInputFormValues;
  mode: 'create' | 'edit';
  setSelectedJdId: (id: string) => void;
};

export function CoverLetterInputPanel({
  jdList,
  form,
  initialValues,
  mode,
  setSelectedJdId,
}: CoverLetterInputPanelProps) {
  const isCreateMode = mode === 'create';

  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <div className="jd-editor-mode-row">
        <Tag color={isCreateMode ? 'processing' : 'blue'}>{isCreateMode ? '신규 작성' : '수정 모드'}</Tag>
        <span>
          {isCreateMode
            ? '필수 항목을 입력해 자소서를 저장합니다.'
            : '선택한 JD에 저장된 자소서를 수정합니다.'}
        </span>
      </div>
      <Form.Item
        label="연결 JD"
        name="job_description_id"
        extra={isCreateMode ? undefined : '기존 자소서의 연결 JD는 수정하지 않습니다.'}
        rules={[{ required: true, message: '저장할 JD를 선택해 주세요.' }]}
      >
        <Select
          disabled={!isCreateMode}
          onChange={(value) => setSelectedJdId(String(value))}
          options={jdList.map((item) => ({ value: Number(item.id), label: item.title }))}
          placeholder="JD를 선택하세요"
        />
      </Form.Item>
      <Form.Item label="지원자명" name="name" rules={[{ required: true, message: '지원자명을 입력해 주세요.' }]}>
        <Input placeholder="지원자명을 입력하세요" />
      </Form.Item>
      <Form.Item label="기술 스택" name="skill">
        <Select mode="tags" tokenSeparators={[',']} placeholder="기술 스택을 입력하세요" />
      </Form.Item>
      <Collapse
        className="resume-extra-collapse"
        ghost
        items={[
          {
            key: 'resume-extra',
            label: '추가 이력 정보',
            children: (
              <>
                <Form.Item label="학력 요약" name="education_level_text">
                  <Input placeholder="예: 컴퓨터공학 학사, 2024년 졸업" />
                </Form.Item>
                <Form.Item label="경력" name="experience">
                  <Select mode="tags" tokenSeparators={[',']} placeholder="예: 데이터 분석 인턴 6개월" />
                </Form.Item>
                <Form.Item label="자격/인증" name="certification">
                  <Select mode="tags" tokenSeparators={[',']} placeholder="예: 정보처리기사, SQLD" />
                </Form.Item>
                <Form.Item label="언어" name="language">
                  <Select mode="tags" tokenSeparators={[',']} placeholder="예: 영어 OPIC IH" />
                </Form.Item>
                <Form.Item label="수상" name="award">
                  <Select mode="tags" tokenSeparators={[',']} placeholder="예: 해커톤 우수상" />
                </Form.Item>
                <Form.Item label="교육/훈련" name="training">
                  <Select mode="tags" tokenSeparators={[',']} placeholder="예: AI 부트캠프 수료" />
                </Form.Item>
                <Form.Item label="기타 활동" name="other_activity">
                  <Select mode="tags" tokenSeparators={[',']} placeholder="예: 오픈소스 기여, 동아리 운영" />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
      <Form.Item
        label="자기소개 문항"
        name="question"
        rules={[{ required: true, message: '자기소개 문항을 입력해 주세요.' }]}
      >
        <Input placeholder="예: 지원 동기를 작성해 주세요." />
      </Form.Item>
      <Form.Item
        label="자기소개 답변"
        name="answer"
        rules={[{ required: true, message: '자기소개 답변을 입력해 주세요.' }]}
      >
        <TextArea rows={8} placeholder="지원자의 자기소개 답변을 입력하세요" />
      </Form.Item>
    </Form>
  );
}
