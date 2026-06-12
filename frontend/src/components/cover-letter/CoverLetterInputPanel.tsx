import { Form, Input, Select, type FormInstance } from 'antd';
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
  setSelectedJdId: (id: string) => void;
};

export function CoverLetterInputPanel({
  jdList,
  form,
  initialValues,
  setSelectedJdId,
}: CoverLetterInputPanelProps) {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Form.Item label="연결 JD" name="job_description_id" rules={[{ required: true }]}>
        <Select
          onChange={(value) => setSelectedJdId(String(value))}
          options={jdList.map((item) => ({ value: Number(item.id), label: item.title }))}
          placeholder="JD를 선택하세요"
        />
      </Form.Item>
      <Form.Item label="지원자명" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="기술 스택" name="skill">
        <Select mode="tags" tokenSeparators={[',']} placeholder="기술 스택을 입력하세요" />
      </Form.Item>
      <Form.Item label="자기소개 문항" name="question" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="자기소개 답변" name="answer" rules={[{ required: true }]}>
        <TextArea rows={8} />
      </Form.Item>
    </Form>
  );
}
