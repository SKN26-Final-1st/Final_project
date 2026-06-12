import { Form, Input, type FormInstance } from 'antd';

export type SecuritySettingsFormValues = {
  formal_password?: string;
  password?: string;
};

type SecuritySettingsFormProps = {
  form: FormInstance<SecuritySettingsFormValues>;
};

export function SecuritySettingsForm({ form }: SecuritySettingsFormProps) {
  return (
    <Form form={form} layout="vertical">
      <Form.Item label="현재 비밀번호" name="formal_password">
        <Input.Password />
      </Form.Item>
      <Form.Item label="새 비밀번호" name="password">
        <Input.Password />
      </Form.Item>
    </Form>
  );
}
