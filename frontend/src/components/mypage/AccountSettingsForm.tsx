import { Form, Input, InputNumber, Switch, type FormInstance } from 'antd';

export type AccountSettingsFormValues = {
  username: string;
  name: string;
  credit: number;
  subscribe: boolean;
  verification_question: string;
};

type AccountSettingsFormProps = {
  form: FormInstance<AccountSettingsFormValues>;
  initialValues: AccountSettingsFormValues;
};

export function AccountSettingsForm({ form, initialValues }: AccountSettingsFormProps) {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Form.Item label="계정 ID" name="username">
        <Input readOnly />
      </Form.Item>
      <Form.Item label="담당자명" name="name">
        <Input />
      </Form.Item>
      <Form.Item label="분석 크레딧" name="credit" extra="포인트 충전/차감 관리는 현재 backend API가 없어 표시만 합니다.">
        <InputNumber min={0} className="full-width-control" disabled />
      </Form.Item>
      <Form.Item label="구독 여부" name="subscribe" valuePropName="checked" extra="플랜 변경 API가 연결되면 여기서 관리할 수 있습니다.">
        <Switch disabled />
      </Form.Item>
      <Form.Item label="본인 확인 질문" name="verification_question">
        <Input />
      </Form.Item>
    </Form>
  );
}
