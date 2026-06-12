import { Form, Input, Select } from 'antd';
import type { CoverLetterDraft, JdItem } from '../../api/adapters';

const { TextArea } = Input;

type CoverLetterInputPanelProps = {
  selectedJdId: string | null;
  jdList: JdItem[];
  draft: CoverLetterDraft;
  setSelectedJdId: (id: string) => void;
};

export function CoverLetterInputPanel({ selectedJdId, jdList, draft, setSelectedJdId }: CoverLetterInputPanelProps) {
  return (
    <Form layout="vertical">
      <Form.Item label="연결 JD">
        <Select
          value={selectedJdId ?? undefined}
          onChange={setSelectedJdId}
          options={jdList.map((item) => ({ value: item.id, label: item.title }))}
          placeholder="JD를 선택하세요"
        />
      </Form.Item>
      <Form.Item label="지원자명">
        <Input defaultValue={draft.applicantName} />
      </Form.Item>
      <Form.Item label="자기소개 문항/답변">
        <TextArea rows={9} defaultValue={draft.body} />
      </Form.Item>
    </Form>
  );
}
