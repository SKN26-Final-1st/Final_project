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
      <Form.Item
        label="분석 크레딧"
        name="credit"
        extra="Credit 충전과 구독 관리는 관리자 페이지에서 진행할 수 있습니다."
      >
        <InputNumber min={0} className="full-width-control" disabled />
      </Form.Item>
      <Form.Item
        label="구독 여부"
        name="subscribe"
        valuePropName="checked"
        extra="구독 상태는 포인트 / 구독 카드에서 확인할 수 있습니다."
      >
        <Switch disabled />
      </Form.Item>
      <Form.Item label="본인 확인 질문" name="verification_question">
        <Input />
      </Form.Item>
    </Form>
  );
}
