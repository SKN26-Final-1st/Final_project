import { Form, Input, Select, Tag, type FormInstance } from 'antd';
import type { JdItem } from '../../api/adapters';

const { TextArea } = Input;

export type CoverLetterInputFormValues = {
  job_description_id?: number;
  name: string;
  skill: string[];
  question: string;
  answer: string;
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
        rules={[{ required: true, message: '저장할 JD를 선택해 주세요.' }]}
      >
        <Select
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
